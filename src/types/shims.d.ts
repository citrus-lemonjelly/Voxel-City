// three.js is vendored (vendor/three.module.js) because the workspace can't reach npm.
// This loose shim keeps `tsc` happy offline. Once `npm install` brings in @types/three, delete it.
declare module 'three' {
  export const Group: any; export type Group = any;
  export const Object3D: any; export type Object3D = any;
  export const WebGLRenderer: any; export type WebGLRenderer = any;
  export const Mesh: any; export type Mesh = any;
  export const Material: any; export type Material = any;
  export const Color: any; export type Color = any;
  export const Scene: any; export type Scene = any;
  export const PerspectiveCamera: any; export type PerspectiveCamera = any;
  export const DirectionalLight: any; export type DirectionalLight = any;
  export const BoxGeometry: any; export type BoxGeometry = any;
  export const InstancedMesh: any; export type InstancedMesh = any;
  export const MeshStandardMaterial: any; export type MeshStandardMaterial = any;
  export const MeshPhysicalMaterial: any; export type MeshPhysicalMaterial = any;
  export const MeshBasicMaterial: any; export type MeshBasicMaterial = any;
  export const HemisphereLight: any; export type HemisphereLight = any;
  export const CylinderGeometry: any; export type CylinderGeometry = any;
  export const PMREMGenerator: any; export type PMREMGenerator = any;
  export const Fog: any; export type Fog = any;
  export const Texture: any; export type Texture = any;
  export const Vector3: any; export type Vector3 = any;
  export const PlaneGeometry: any; export type PlaneGeometry = any;
  export const SphereGeometry: any; export type SphereGeometry = any;
  export const ShaderMaterial: any; export type ShaderMaterial = any;
  export const Camera: any; export type Camera = any;
  export const CanvasTexture: any; export type CanvasTexture = any;
  export const AdditiveBlending: any; export const BackSide: any; export const NearestFilter: any;
  export const BufferGeometry: any; export type BufferGeometry = any;
  export const Float32BufferAttribute: any; export type Float32BufferAttribute = any;
  export const Uint16BufferAttribute: any; export type Uint16BufferAttribute = any;
  export const Uint32BufferAttribute: any; export type Uint32BufferAttribute = any;
  export const WebGLRenderTarget: any; export type WebGLRenderTarget = any;
  export const DepthTexture: any; export type DepthTexture = any;
  export const OrthographicCamera: any; export type OrthographicCamera = any;
  export const Matrix4: any; export type Matrix4 = any;
  export const Vector2: any; export type Vector2 = any;
  export const Quaternion: any; export type Quaternion = any;
  export const HalfFloatType: any; export const UnsignedByteType: any; export const LinearFilter: any; export const RGBAFormat: any; export const DepthFormat: any; export const UnsignedIntType: any; export const FloatType: any; export const NoBlending: any; export const DoubleSide: any;
  export const PCFSoftShadowMap: any;
  export const NeutralToneMapping: any;
}
declare module '*/RoomEnvironment.js' { export const RoomEnvironment: any; }
