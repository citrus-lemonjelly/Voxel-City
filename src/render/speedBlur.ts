// Speed blur: a camera-motion blur for the WORLD only. The two race cars are kept sharp.
// How it works (one extra pass, no extra scene geometry):
//   1. The race scene is drawn into an off-screen target that also keeps its depth.
//   2. The cars alone are drawn as a white silhouette into a small "mask" target (layer 1).
//   3. A full-screen pass rebuilds each pixel's world position from depth, projects it with LAST frame's camera,
//      and smears along that screen motion — so near objects streak more than far ones (true parallax),
//      the sky barely moves, and masked car pixels are left untouched and never smeared into the background.
//   4. The same pass applies tone mapping + sRGB output (normally done when drawing straight to the screen).
// Blur length is normalised to a fixed "shutter" so it looks the same at 30, 60 or 144 fps.
import * as THREE from 'three';

export const BLUR_LEVELS = { off: 0, low: 0.35, full: 0.7 } as const;
export type BlurLevel = keyof typeof BLUR_LEVELS;
export const CAR_LAYER = 1;

const VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
const FRAG = `
  uniform sampler2D tColor; uniform sampler2D tDepth; uniform sampler2D tMask;
  uniform mat4 uInvVP; uniform mat4 uPrevVP; uniform float uScale; uniform float uMaxLen;
  varying vec2 vUv;
  void main() {
    vec4 base = texture2D(tColor, vUv);
    float m = texture2D(tMask, vUv).r;
    vec4 outc = base;
    if (m < 0.5 && uScale > 0.0) {
      float depth = texture2D(tDepth, vUv).x;
      vec4 wp = uInvVP * vec4(vUv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0); wp /= wp.w;
      vec4 pp = uPrevVP * wp; pp /= pp.w;
      vec2 vel = (vUv - (pp.xy * 0.5 + 0.5)) * uScale;
      float len = length(vel);
      if (len > uMaxLen) vel *= uMaxLen / len;
      if (len > 0.0008) {
        vec4 acc = vec4(0.0); float wsum = 0.0;
        for (int i = 0; i < 12; i++) {
          vec2 uv = vUv + vel * (float(i) / 11.0 - 0.5);
          float w = 1.0 - step(0.5, texture2D(tMask, uv).r);     // never pull car colour into the streaks
          acc += texture2D(tColor, uv) * w; wsum += w;
        }
        if (wsum > 0.0) outc = acc / wsum;
      }
    }
    gl_FragColor = vec4(outc.rgb, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;

export class SpeedBlur {
  strength = 0;
  private rt: THREE.WebGLRenderTarget;
  private mask: THREE.WebGLRenderTarget;
  private quadScene = new THREE.Scene();
  private quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private mat: THREE.ShaderMaterial;
  private maskMat = new THREE.MeshBasicMaterial({ color: '#ffffff', fog: false });
  private prevVP = new THREE.Matrix4();
  private hasPrev = false;
  private clear = new THREE.Color();

  constructor(private renderer: THREE.WebGLRenderer) {
    this.rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: 4, depthTexture: new THREE.DepthTexture(4, 4) });
    this.mask = new THREE.WebGLRenderTarget(4, 4, { type: THREE.UnsignedByteType });
    this.mat = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG, depthTest: false, depthWrite: false, toneMapped: true,
      uniforms: { tColor: { value: this.rt.texture }, tDepth: { value: this.rt.depthTexture }, tMask: { value: this.mask.texture }, uInvVP: { value: new THREE.Matrix4() }, uPrevVP: { value: new THREE.Matrix4() }, uScale: { value: 0 }, uMaxLen: { value: 0.07 } },
    });
    this.quadScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.mat));
  }

  setSize(w: number, h: number) {
    const pr = this.renderer.getPixelRatio();
    this.rt.setSize(Math.round(w * pr), Math.round(h * pr));
    this.mask.setSize(Math.max(1, Math.round(w * pr / 2)), Math.max(1, Math.round(h * pr / 2)));
  }

  /** Call when a race starts so the first frame doesn't blur from a stale camera. */
  reset() { this.hasPrev = false; }

  render(scene: THREE.Scene, cam: THREE.PerspectiveCamera, dt: number) {
    const r = this.renderer;
    cam.updateMatrixWorld();
    const vp = new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
    if (!this.hasPrev) { this.prevVP.copy(vp); this.hasPrev = true; }
    // 1) scene → off-screen colour + depth
    r.setRenderTarget(this.rt); r.render(scene, cam);
    // 2) car silhouettes → mask
    const bg = scene.background, fog = scene.fog, layers = cam.layers.mask;
    r.getClearColor(this.clear); const ca = r.getClearAlpha();
    scene.background = null; scene.fog = null; scene.overrideMaterial = this.maskMat;
    cam.layers.set(CAR_LAYER); r.setClearColor(0x000000, 1);
    r.setRenderTarget(this.mask); r.clear(); r.render(scene, cam);
    scene.background = bg; scene.fog = fog; scene.overrideMaterial = null; cam.layers.mask = layers; r.setClearColor(this.clear, ca);
    // 3) blur + tone map → screen
    const u = this.mat.uniforms;
    u.uInvVP.value.copy(vp).invert(); u.uPrevVP.value.copy(this.prevVP);
    u.uScale.value = this.strength * (1 / 60) / Math.max(1 / 240, Math.min(dt, 1 / 15));
    r.setRenderTarget(null); r.render(this.quadScene, this.quadCam);
    this.prevVP.copy(vp);
  }
}
