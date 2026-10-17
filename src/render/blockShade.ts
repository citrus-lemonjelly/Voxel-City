// Shared "block surface" for everything in the world — cars, buildings, road, props — so the scene reads as one
// material at one resolution (owner direction 2026-10-17). Large boxes are drawn as single meshes for speed, but this
// shader paints them with the same 1-block grid as the cars:
//   • per-block colour variation (subtle, deterministic by world block cell)
//   • lighter top faces (the cars' top-edge highlight) and slightly darker lower faces near the ground
import * as THREE from 'three';

export interface BlockShadeOptions { noise?: number; top?: number; ground?: number }

export function blockify<M extends THREE.Material>(mat: M, o: BlockShadeOptions = {}): M {
  const noise = o.noise ?? 0.055, top = o.top ?? 1.07, ground = o.ground ?? 0.84;
  (mat as any).onBeforeCompile = (sh: any) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vBWP;\nvarying vec3 vBWN;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vec4 bwp = vec4(transformed, 1.0);
        vec3 bwn = objectNormal;
        #ifdef USE_INSTANCING
          bwp = instanceMatrix * bwp;
          bwn = mat3(instanceMatrix) * bwn;
        #endif
        bwp = modelMatrix * bwp;
        vBWP = bwp.xyz;
        vBWN = normalize(mat3(modelMatrix) * bwn);`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vBWP;
        varying vec3 vBWN;
        float bHash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        {
          vec3 cell = floor(vBWP - vBWN * 0.02);
          float n = (bHash(cell) - 0.5) * ${noise.toFixed(3)} * 2.0;
          float shadeK = 1.0 + n;
          if (vBWN.y > 0.5) shadeK *= ${top.toFixed(3)};
          else if (vBWN.y > -0.5) shadeK *= mix(${ground.toFixed(3)}, 1.0, smoothstep(0.0, 5.0, vBWP.y));
          diffuseColor.rgb *= shadeK;
        }`);
  };
  (mat as any).customProgramCacheKey = () => `blockify-${noise}-${top}-${ground}`;
  return mat;
}
