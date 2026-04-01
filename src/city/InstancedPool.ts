import * as THREE from 'three';

const MAX_INSTANCES_PER_POOL = 2000;

interface PoolEntry {
  mesh: THREE.InstancedMesh;
  count: number;
  /** Tracks which chunk owns which instance indices */
  chunkSlots: Map<string, number[]>;
}

/**
 * Manages InstancedMesh pools for building types.
 * Each building type gets one pool (one draw call).
 * Chunks can add/remove instances dynamically.
 */
export class InstancedPool {
  private pools = new Map<string, PoolEntry>();
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  /**
   * Ensure a pool exists for the given building type.
   * Call once per type at startup or on first encounter.
   */
  ensurePool(typeId: string, geometry: THREE.BufferGeometry, material: THREE.Material) {
    if (this.pools.has(typeId)) return;

    const mesh = new THREE.InstancedMesh(geometry, material, MAX_INSTANCES_PER_POOL);
    mesh.count = 0;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false; // We manage visibility via chunks
    this.scene.add(mesh);

    this.pools.set(typeId, { mesh, count: 0, chunkSlots: new Map() });
  }

  /**
   * Add instances for a chunk. Returns the assigned slot indices.
   */
  addInstances(
    typeId: string,
    chunkKey: string,
    matrices: THREE.Matrix4[],
    colors: THREE.Color[],
  ): number[] {
    const pool = this.pools.get(typeId);
    if (!pool) return [];

    const slots: number[] = [];
    for (let i = 0; i < matrices.length; i++) {
      if (pool.count >= MAX_INSTANCES_PER_POOL) break;
      const idx = pool.count;
      pool.mesh.setMatrixAt(idx, matrices[i]);
      pool.mesh.setColorAt(idx, colors[i]);
      pool.count++;
      slots.push(idx);
    }

    pool.mesh.count = pool.count;
    pool.mesh.instanceMatrix.needsUpdate = true;
    if (pool.mesh.instanceColor) pool.mesh.instanceColor.needsUpdate = true;

    pool.chunkSlots.set(chunkKey, slots);
    return slots;
  }

  /**
   * Remove all instances belonging to a chunk.
   * Uses swap-and-pop to avoid gaps.
   */
  removeChunk(typeId: string, chunkKey: string) {
    const pool = this.pools.get(typeId);
    if (!pool) return;

    const slots = pool.chunkSlots.get(chunkKey);
    if (!slots || slots.length === 0) return;

    const tmpMat = new THREE.Matrix4();
    const tmpColor = new THREE.Color();

    // Sort slots descending so we remove from the end first
    const sorted = [...slots].sort((a, b) => b - a);

    for (const slotIdx of sorted) {
      const lastIdx = pool.count - 1;
      if (slotIdx < lastIdx) {
        // Swap with last
        pool.mesh.getMatrixAt(lastIdx, tmpMat);
        pool.mesh.setMatrixAt(slotIdx, tmpMat);
        if (pool.mesh.instanceColor) {
          pool.mesh.getColorAt(lastIdx, tmpColor);
          pool.mesh.setColorAt(slotIdx, tmpColor);
        }
        // Update the chunk that owned lastIdx
        for (const [ck, ckSlots] of pool.chunkSlots) {
          const foundAt = ckSlots.indexOf(lastIdx);
          if (foundAt !== -1) {
            ckSlots[foundAt] = slotIdx;
            break;
          }
        }
      }
      pool.count--;
    }

    pool.mesh.count = pool.count;
    pool.mesh.instanceMatrix.needsUpdate = true;
    if (pool.mesh.instanceColor) pool.mesh.instanceColor.needsUpdate = true;
    pool.chunkSlots.delete(chunkKey);
  }

  getPool(typeId: string): PoolEntry | undefined {
    return this.pools.get(typeId);
  }

  dispose() {
    for (const pool of this.pools.values()) {
      this.scene.remove(pool.mesh);
      pool.mesh.geometry.dispose();
      pool.mesh.dispose();
    }
    this.pools.clear();
  }
}
