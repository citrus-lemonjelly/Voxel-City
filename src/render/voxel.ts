// Voxel → Three.js meshes. One InstancedMesh per material group, per-instance colours.
import * as THREE from 'three';

export type Role = 'paint' | 'trim' | 'glass' | 'light' | 'tire' | 'rim';
export interface Vox { x: number; y: number; z: number; c: string | null; role: Role; s: number; shade?: string }

const BOX = new THREE.BoxGeometry(1, 1, 1);

export function makeMaterials() {
  return {
    paint: new THREE.MeshPhysicalMaterial({ color: '#ffffff', flatShading: true, roughness: 0.5, clearcoat: 0.35, clearcoatRoughness: 0.3, envMapIntensity: 0.25 }),
    glass: new THREE.MeshPhysicalMaterial({ color: '#ffffff', flatShading: true, roughness: 0.15, clearcoat: 1, envMapIntensity: 0.6 }),
    trim: new THREE.MeshStandardMaterial({ color: '#ffffff', flatShading: true, roughness: 0.85, envMapIntensity: 0.25 }),
    light: new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }),
  };
}
export type Materials = ReturnType<typeof makeMaterials>;

/** Build instanced meshes for a list of voxels. Fully enclosed same-size voxels are culled. */
export function buildVoxMeshes(items: Vox[], mats: Materials, paintColour: (v: Vox) => THREE.Color, offset = { x: 0, y: 0, z: 0 }): THREE.Group {
  const g = new THREE.Group();
  const occ = new Set(items.filter(v => v.role !== 'glass').map(v => `${v.s}|${v.x}|${v.y}|${v.z}`));
  const visible = items.filter(v => {
    const k = (dx: number, dy: number, dz: number) => occ.has(`${v.s}|${v.x + dx}|${v.y + dy}|${v.z + dz}`);
    return !(k(1, 0, 0) && k(-1, 0, 0) && k(0, 1, 0) && k(0, -1, 0) && k(0, 0, 1) && k(0, 0, -1));
  });
  const groups: Record<string, Vox[]> = {};
  for (const v of visible) {
    const key = v.role === 'paint' ? 'paint' : v.role === 'glass' ? 'glass' : v.role === 'light' ? 'light' : 'trim';
    (groups[key] ||= []).push(v);
  }
  const o = new THREE.Object3D();
  for (const [key, list] of Object.entries(groups)) {
    const im = new THREE.InstancedMesh(BOX, (mats as any)[key], list.length);
    list.forEach((v, i) => {
      o.position.set((v.x + 0.5) * v.s + offset.x, (v.y + 0.5) * v.s + offset.y, (v.z + 0.5) * v.s + offset.z);
      o.scale.setScalar(v.s); o.updateMatrix(); im.setMatrixAt(i, o.matrix);
      im.setColorAt(i, key === 'paint' ? paintColour(v) : new THREE.Color(v.c || '#ff00ff'));
    });
    im.castShadow = key !== 'light'; im.receiveShadow = true;
    g.add(im);
  }
  return g;
}
