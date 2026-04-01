import * as THREE from 'three';
import { seededRandom } from '@/utils/noise';
import { terrainH } from '@/world/TerrainGenerator';
import { zoneAt, ZoneType } from './ZoneMap';
import { BUILDING_FACTORIES } from './BuildingTypes';

const CHUNK_SIZE = 500;
const GRID_SIZE = 16;
const GRID_OFFSET_X = -4000;
const GRID_OFFSET_Z = -3000;

const LOD0_RANGE = 800;
const LOD1_RANGE = 1800;
const UNLOAD_HYSTERESIS = 1.2;

interface ChunkData {
  cx: number;
  cz: number;
  key: string;
  lod: number;
  group: THREE.Group;
}

export class ChunkManager {
  private scene: THREE.Scene;
  private activeChunks = new Map<string, ChunkData>();
  private glassMat: THREE.MeshPhysicalMaterial;
  private concreteMat: THREE.MeshStandardMaterial;
  private roadMat: THREE.MeshStandardMaterial;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    this.glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x556688, metalness: 0.5, roughness: 0.3,
      envMapIntensity: 0.4, clearcoat: 0.05,
    });
    this.concreteMat = new THREE.MeshStandardMaterial({
      color: 0x888888, roughness: 0.8, metalness: 0.05,
      envMapIntensity: 0.3,
    });
    this.roadMat = new THREE.MeshStandardMaterial({
      color: 0x333333, roughness: 0.92, metalness: 0,
    });
  }

  update(cameraPos: THREE.Vector3) {
    const camCX = Math.floor((cameraPos.x - GRID_OFFSET_X) / CHUNK_SIZE);
    const camCZ = Math.floor((cameraPos.z - GRID_OFFSET_Z) / CHUNK_SIZE);

    const range = Math.ceil(LOD1_RANGE / CHUNK_SIZE) + 1;

    for (let dx = -range; dx <= range; dx++) {
      for (let dz = -range; dz <= range; dz++) {
        const cx = camCX + dx;
        const cz = camCZ + dz;
        if (cx < 0 || cx >= GRID_SIZE || cz < 0 || cz >= GRID_SIZE) continue;

        const worldX = GRID_OFFSET_X + cx * CHUNK_SIZE + CHUNK_SIZE / 2;
        const worldZ = GRID_OFFSET_Z + cz * CHUNK_SIZE + CHUNK_SIZE / 2;
        const dist = Math.sqrt((cameraPos.x - worldX) ** 2 + (cameraPos.z - worldZ) ** 2);

        if (dist < LOD1_RANGE) {
          const key = `${cx},${cz}`;
          if (!this.activeChunks.has(key)) {
            const lod = dist < LOD0_RANGE ? 0 : 1;
            this.loadChunk(cx, cz, lod);
          }
        }
      }
    }

    // Unload far chunks
    for (const [key, chunk] of this.activeChunks) {
      const worldX = GRID_OFFSET_X + chunk.cx * CHUNK_SIZE + CHUNK_SIZE / 2;
      const worldZ = GRID_OFFSET_Z + chunk.cz * CHUNK_SIZE + CHUNK_SIZE / 2;
      const dist = Math.sqrt((cameraPos.x - worldX) ** 2 + (cameraPos.z - worldZ) ** 2);

      if (dist > LOD1_RANGE * UNLOAD_HYSTERESIS) {
        this.unloadChunk(key);
      }
    }
  }

  private loadChunk(cx: number, cz: number, lod: number) {
    const key = `${cx},${cz}`;
    const worldX = GRID_OFFSET_X + cx * CHUNK_SIZE;
    const worldZ = GRID_OFFSET_Z + cz * CHUNK_SIZE;
    const centerX = worldX + CHUNK_SIZE / 2;
    const centerZ = worldZ + CHUNK_SIZE / 2;

    const zone = zoneAt(centerX, centerZ);
    const group = new THREE.Group();

    // Skip empty zones
    if (zone.density === 0) {
      this.activeChunks.set(key, { cx, cz, key, lod, group });
      return;
    }

    // Road grid
    this.addRoads(group, worldX, worldZ, zone.type);

    // Buildings
    const chunkSeed = cx * 1000 + cz;
    const numBuildings = Math.floor(zone.density * (lod === 0 ? 1.0 : 0.4));

    for (const bt of zone.buildings) {
      const count = Math.round(numBuildings * bt.weight);
      const factory = BUILDING_FACTORIES[bt.type];
      if (!factory || count === 0) continue;

      for (let i = 0; i < count; i++) {
        const seed = chunkSeed * 100 + i * 7 + bt.type.charCodeAt(0);
        const r = (o: number) => seededRandom(seed + o);

        const bx = worldX + 25 + r(1) * (CHUNK_SIZE - 50);
        const bz = worldZ + 25 + r(2) * (CHUNK_SIZE - 50);

        const th = terrainH(bx, bz);
        if (th < 1) continue;

        // Skip bridge corridor
        if (bz > -500 && bz < 1700 && Math.abs(bx) < 80) continue;

        const [minH, maxH] = zone.heightRange;
        const h = minH + r(3) * (maxH - minH);

        const result = factory(seed, h);

        // Pick material based on building type
        let mat: THREE.Material;
        if (bt.type === 'highrise') {
          mat = this.glassMat;
        } else {
          mat = this.concreteMat;
        }

        // For LOD1, simplify to a plain box
        let geo: THREE.BufferGeometry;
        if (lod === 1) {
          const bw = 10 + r(6) * 15;
          const bd = 10 + r(7) * 15;
          geo = new THREE.BoxGeometry(bw, h, bd);
          geo.translate(0, h / 2, 0);
        } else {
          geo = result.geometry;
        }

        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(bx, th, bz);

        // Random 90-degree rotation for variety
        if (r(4) > 0.5) {
          mesh.rotation.y = Math.floor(r(5) * 4) * Math.PI / 2;
        }

        mesh.castShadow = lod === 0;
        mesh.receiveShadow = true;

        // Per-instance color via material clone for LOD0 only
        if (lod === 0 && bt.type !== 'highrise') {
          const coloredMat = this.concreteMat.clone();
          coloredMat.color.copy(result.color);
          mesh.material = coloredMat;
        }

        group.add(mesh);
      }
    }

    this.scene.add(group);
    this.activeChunks.set(key, { cx, cz, key, lod, group });
  }

  private addRoads(group: THREE.Group, worldX: number, worldZ: number, zoneType: ZoneType) {
    // No roads in water, parks, or nature
    if (
      zoneType === ZoneType.Water ||
      zoneType === ZoneType.Presidio ||
      zoneType === ZoneType.MarinHeadlands
    ) return;

    // Check terrain — skip if mostly underwater
    const cx = worldX + CHUNK_SIZE / 2;
    const cz = worldZ + CHUNK_SIZE / 2;
    if (terrainH(cx, cz) < 1) return;

    const roadW = 8;

    // Horizontal road through chunk center
    const hGeo = new THREE.PlaneGeometry(CHUNK_SIZE, roadW);
    hGeo.rotateX(-Math.PI / 2);
    const hRoad = new THREE.Mesh(hGeo, this.roadMat);
    hRoad.position.set(worldX + CHUNK_SIZE / 2, terrainH(cx, cz) + 0.15, cz);
    hRoad.receiveShadow = true;
    group.add(hRoad);

    // Vertical road
    const vGeo = new THREE.PlaneGeometry(roadW, CHUNK_SIZE);
    vGeo.rotateX(-Math.PI / 2);
    const vRoad = new THREE.Mesh(vGeo, this.roadMat);
    vRoad.position.set(cx, terrainH(cx, cz) + 0.15, worldZ + CHUNK_SIZE / 2);
    vRoad.receiveShadow = true;
    group.add(vRoad);
  }

  private unloadChunk(key: string) {
    const chunk = this.activeChunks.get(key);
    if (!chunk) return;

    // Dispose all meshes in the group
    chunk.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        // Only dispose cloned materials (not shared ones)
        if (obj.material !== this.glassMat && obj.material !== this.concreteMat && obj.material !== this.roadMat) {
          (obj.material as THREE.Material).dispose();
        }
      }
    });
    this.scene.remove(chunk.group);
    this.activeChunks.delete(key);
  }

  dispose() {
    for (const key of [...this.activeChunks.keys()]) {
      this.unloadChunk(key);
    }
  }
}
