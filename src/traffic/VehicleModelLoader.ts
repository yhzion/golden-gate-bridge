import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VehicleSpec, VEHICLE_SPECS } from './VehicleSpecs';

export interface VehicleTemplate {
  spec: VehicleSpec;
  root: THREE.Group;
  wheels: THREE.Object3D[];
  scale: number;
  groundOffset: number;
}

/** Data extracted from a template for InstancedMesh batching */
export interface SubMeshData {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  localMatrix: THREE.Matrix4;
  isWheel: boolean;
}

const loader = new GLTFLoader();

function loadGLB(url: string): Promise<THREE.Group> {
  return new Promise((resolve, reject) => {
    loader.load(url, (gltf) => resolve(gltf.scene), undefined, reject);
  });
}

async function loadVehicleTemplate(spec: VehicleSpec): Promise<VehicleTemplate> {
  const scene = await loadGLB(`/assets/vehicles/${spec.file}`);

  scene.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      child.castShadow = true;
      child.receiveShadow = false;
    }
  });

  const bbox = new THREE.Box3().setFromObject(scene);
  const size = bbox.getSize(new THREE.Vector3());
  const modelLength = Math.max(size.x, size.z);
  const lengthIsX = size.x > size.z;
  const scale = spec.length / Math.max(modelLength, 0.001);

  const root = new THREE.Group();

  if (lengthIsX) {
    scene.rotation.y = Math.PI / 2;
  }

  scene.scale.setScalar(scale);
  scene.updateMatrixWorld(true);

  const scaledBbox = new THREE.Box3().setFromObject(scene);
  const groundOffset = -scaledBbox.min.y;
  scene.position.y += groundOffset;

  const scaledCenter = scaledBbox.getCenter(new THREE.Vector3());
  scene.position.x -= scaledCenter.x;
  scene.position.z -= scaledCenter.z;

  root.add(scene);

  const wheels: THREE.Object3D[] = [];
  scene.traverse((child) => {
    if (child.name && spec.wheelPattern.test(child.name)) {
      wheels.push(child);
    }
  });

  return { spec, root, wheels, scale, groundOffset };
}

/**
 * Extract sub-mesh data from a template for InstancedMesh batching.
 * Returns geometry, material, local transform, and wheel flag for each mesh.
 */
export function extractSubMeshes(template: VehicleTemplate): SubMeshData[] {
  const result: SubMeshData[] = [];
  const wheelSet = new Set(template.wheels);

  // Ensure world matrices are up to date
  template.root.updateMatrixWorld(true);
  const rootInverse = template.root.matrixWorld.clone().invert();

  template.root.traverse((child) => {
    if (!(child as THREE.Mesh).isMesh) return;
    const mesh = child as THREE.Mesh;

    // Local matrix relative to vehicle root
    const localMatrix = new THREE.Matrix4().multiplyMatrices(rootInverse, mesh.matrixWorld);

    // Check if this mesh or any ancestor is a wheel
    let isWheel = false;
    let node: THREE.Object3D | null = child;
    while (node && node !== template.root) {
      if (wheelSet.has(node)) { isWheel = true; break; }
      node = node.parent;
    }

    result.push({
      geometry: mesh.geometry,
      material: mesh.material as THREE.Material,
      localMatrix,
      isWheel,
    });
  });

  return result;
}

export async function loadAllVehicleModels(): Promise<Map<string, VehicleTemplate>> {
  const templates = new Map<string, VehicleTemplate>();

  const results = await Promise.allSettled(
    VEHICLE_SPECS.map(async (spec) => {
      const template = await loadVehicleTemplate(spec);
      return { file: spec.file, template };
    }),
  );

  for (const result of results) {
    if (result.status === 'fulfilled') {
      templates.set(result.value.file, result.value.template);
    } else {
      console.warn('Failed to load vehicle model:', result.reason);
    }
  }

  console.log(`Loaded ${templates.size}/${VEHICLE_SPECS.length} vehicle models`);
  return templates;
}
