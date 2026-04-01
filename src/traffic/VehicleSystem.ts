import * as THREE from 'three';
import { BRIDGE, LANES, CAR_COLORS } from '@/config/bridge';
import { pickRandomSpec, VehicleSpec } from './VehicleSpecs';
import { loadAllVehicleModels, extractSubMeshes, SubMeshData } from './VehicleModelLoader';

/* ── IDM (Intelligent Driver Model) ───────────────────────── */
const IDM = {
  v0Min: 18, v0Max: 26, s0: 4, T: 1.2, a: 1.5, b: 2.5, delta: 4, carLength: 5,
} as const;

const NUM_CARS = 80;

/* ── Per-car simulation data ──────────────────────────────── */
interface CarData {
  z: number;
  speed: number;
  targetSpeed: number;
  acceleration: number;
  dir: number;
  laneIdx: number;
  lateralOffset: number;
  wheelRadius: number;
  wheelRotation: number;
  batchKey: string;      // vehicle spec file
  batchInstanceIdx: number; // index within its batch
}

/* ── InstancedMesh batch per (vehicleType, subMesh) ───────── */
interface MeshBatch {
  mesh: THREE.InstancedMesh;
  localMatrix: THREE.Matrix4;
  isWheel: boolean;
}

interface VehicleBatch {
  meshBatches: MeshBatch[];
  carIndices: number[];   // indices into this.cars
}

/* ── Reusable temporaries (zero allocation in hot path) ───── */
const _mat = new THREE.Matrix4();
const _worldMat = new THREE.Matrix4();
const _pos = new THREE.Vector3();
const _scale = new THREE.Vector3(1, 1, 1);
const _qFwd = new THREE.Quaternion();
const _qBack = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
const _wheelRot = new THREE.Matrix4();

export class VehicleSystem {
  private cars: CarData[] = [];
  private batches = new Map<string, VehicleBatch>();
  private ready = false;
  // Pre-allocated lane buckets: [laneIdx][dir] → CarData[]
  // 6 lanes × 2 directions = 12 buckets
  private laneBuckets: CarData[][] = [];
  private laneBucketKeys: { laneIdx: number; dir: number }[] = [];

  build(scene: THREE.Scene) {
    const bridgeStart = -BRIDGE.sideSpan + 20;
    const bridgeEnd = BRIDGE.mainSpan + BRIDGE.sideSpan - 20;
    const bridgeLen = bridgeEnd - bridgeStart;

    // Count instances per spec type
    const specAssignment: VehicleSpec[] = [];
    const countPerSpec = new Map<string, number>();

    for (let i = 0; i < NUM_CARS; i++) {
      const spec = pickRandomSpec();
      specAssignment.push(spec);
      countPerSpec.set(spec.file, (countPerSpec.get(spec.file) || 0) + 1);
    }

    // Track per-spec instance counter
    const instanceCounters = new Map<string, number>();
    for (const key of countPerSpec.keys()) instanceCounters.set(key, 0);

    // Create car data
    for (let i = 0; i < NUM_CARS; i++) {
      const dir = i < NUM_CARS / 2 ? 1 : -1;
      const laneIdx = dir > 0
        ? Math.floor(Math.random() * 3) + 3
        : Math.floor(Math.random() * 3);

      const spec = specAssignment[i];
      const v0 = IDM.v0Min + Math.random() * (IDM.v0Max - IDM.v0Min);
      const batchIdx = instanceCounters.get(spec.file)!;
      instanceCounters.set(spec.file, batchIdx + 1);

      this.cars.push({
        z: bridgeStart + Math.random() * bridgeLen,
        speed: v0,
        targetSpeed: v0,
        acceleration: 0,
        dir,
        laneIdx,
        lateralOffset: (Math.random() - 0.5) * 0.4,
        wheelRadius: spec.wheelRadius,
        wheelRotation: 0,
        batchKey: spec.file,
        batchInstanceIdx: batchIdx,
      });
    }

    // Pre-allocate lane buckets (6 lanes × 2 directions)
    for (let laneIdx = 0; laneIdx < 6; laneIdx++) {
      for (const dir of [1, -1]) {
        this.laneBuckets.push([]);
        this.laneBucketKeys.push({ laneIdx, dir });
      }
    }

    // Async load and create InstancedMeshes
    this.loadAndBuild(scene, countPerSpec);
  }

  private async loadAndBuild(scene: THREE.Scene, countPerSpec: Map<string, number>) {
    let templates;
    try {
      templates = await loadAllVehicleModels();
    } catch (e) {
      console.warn('VehicleSystem: model load failed', e);
      this.ready = true;
      return;
    }

    const colorArr = CAR_COLORS.slice();

    for (const [specFile, count] of countPerSpec) {
      const template = templates.get(specFile);
      if (!template || count === 0) continue;

      const subMeshes: SubMeshData[] = extractSubMeshes(template);
      const meshBatches: MeshBatch[] = [];

      for (const sm of subMeshes) {
        const im = new THREE.InstancedMesh(sm.geometry, sm.material, count);
        im.castShadow = true;
        im.frustumCulled = false; // vehicles are always near bridge
        scene.add(im);

        meshBatches.push({
          mesh: im,
          localMatrix: sm.localMatrix,
          isWheel: sm.isWheel,
        });
      }

      // Collect car indices for this batch
      const carIndices: number[] = [];
      for (let i = 0; i < this.cars.length; i++) {
        if (this.cars[i].batchKey === specFile) carIndices.push(i);
      }

      // Assign instance colors (body color per vehicle)
      for (let ci = 0; ci < carIndices.length; ci++) {
        const color = new THREE.Color(colorArr[Math.floor(Math.random() * colorArr.length)]);
        for (const mb of meshBatches) {
          // Apply color to all sub-meshes (InstancedMesh instanceColor)
          mb.mesh.setColorAt(ci, color);
        }
      }
      for (const mb of meshBatches) {
        if (mb.mesh.instanceColor) mb.mesh.instanceColor.needsUpdate = true;
      }

      this.batches.set(specFile, { meshBatches, carIndices });
    }

    // Initial matrix update
    this.updateAllMatrices();
    this.ready = true;
    console.log(`VehicleSystem: ${this.batches.size} batches, ${NUM_CARS} vehicles`);
  }

  update(dt: number) {
    if (!this.ready) return;

    const dtClamped = Math.min(dt, 0.05);
    const bridgeStart = -BRIDGE.sideSpan + 20;
    const bridgeEnd = BRIDGE.mainSpan + BRIDGE.sideSpan - 20;

    // IDM: fill pre-allocated lane buckets (zero allocation)
    for (let b = 0; b < this.laneBuckets.length; b++) {
      this.laneBuckets[b].length = 0;
    }
    for (const c of this.cars) {
      // bucket index: laneIdx * 2 + (dir === -1 ? 1 : 0)
      const bi = c.laneIdx * 2 + (c.dir === -1 ? 1 : 0);
      this.laneBuckets[bi].push(c);
    }

    for (let b = 0; b < this.laneBuckets.length; b++) {
      const lane = this.laneBuckets[b];
      if (lane.length === 0) continue;
      const dir = this.laneBucketKeys[b].dir;
      lane.sort((a, bb) => dir > 0 ? a.z - bb.z : bb.z - a.z);
    }

    // IDM acceleration
    for (let b = 0; b < this.laneBuckets.length; b++) {
      const lane = this.laneBuckets[b];
      if (lane.length === 0) continue;
      for (let i = 0; i < lane.length; i++) {
        const car = lane[i];
        const leader = i > 0 ? lane[i - 1] : null;

        let acc: number;
        if (!leader) {
          acc = IDM.a * (1 - Math.pow(car.speed / car.targetSpeed, IDM.delta));
        } else {
          const gap = Math.abs(leader.z - car.z) - IDM.carLength;
          const dv = car.speed - leader.speed;
          const sStar = IDM.s0 + car.speed * IDM.T
            + (car.speed * dv) / (2 * Math.sqrt(IDM.a * IDM.b));
          acc = IDM.a * (1 - Math.pow(car.speed / car.targetSpeed, IDM.delta)
            - Math.pow(sStar / Math.max(gap, 0.1), 2));
        }
        car.acceleration = Math.max(-IDM.b * 2, Math.min(acc, IDM.a));
      }
    }

    // Update positions and wheel rotation
    for (const car of this.cars) {
      car.speed += car.acceleration * dtClamped;
      car.speed = Math.max(0.5, Math.min(car.speed, IDM.v0Max * 1.2));
      car.z += car.speed * car.dir * dtClamped;

      if (car.dir > 0 && car.z > bridgeEnd) car.z = bridgeStart;
      if (car.dir < 0 && car.z < bridgeStart) car.z = bridgeEnd;

      car.wheelRotation += (car.speed * dtClamped) / car.wheelRadius;
    }

    this.updateAllMatrices();
  }

  private updateAllMatrices() {
    for (const [, batch] of this.batches) {
      for (let ci = 0; ci < batch.carIndices.length; ci++) {
        const car = this.cars[batch.carIndices[ci]];
        const laneX = LANES[car.laneIdx] + car.lateralOffset;
        const q = car.dir > 0 ? _qFwd : _qBack;

        _pos.set(laneX, BRIDGE.deckH, car.z);
        _worldMat.compose(_pos, q, _scale);

        for (const mb of batch.meshBatches) {
          if (mb.isWheel) {
            // Wheel: world × local × wheelRotation
            _wheelRot.makeRotationX(car.wheelRotation);
            _mat.multiplyMatrices(_worldMat, mb.localMatrix);
            _mat.multiply(_wheelRot);
          } else {
            // Body: world × local
            _mat.multiplyMatrices(_worldMat, mb.localMatrix);
          }
          mb.mesh.setMatrixAt(ci, _mat);
        }
      }

      for (const mb of batch.meshBatches) {
        mb.mesh.instanceMatrix.needsUpdate = true;
      }
    }
  }
}
