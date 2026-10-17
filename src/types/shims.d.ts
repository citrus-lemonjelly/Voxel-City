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
  export const PCFSoftShadowMap: any;
  export const NeutralToneMapping: any;
}
declare module '*/RoomEnvironment.js' { export const RoomEnvironment: any; }
