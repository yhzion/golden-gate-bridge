import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { BRIDGE, DRIVE, LANES } from '@/config/bridge';

interface NPCCar {
  group: THREE.Group;
  z: number;
  speed: number;
  dir: 1 | -1;
  headlights: THREE.PointLight[];
  taillights: THREE.PointLight[];
  active: boolean;
}

const NPC_MODEL_PATHS = [
  '/models/cars/npc/sedan-01.glb',
  '/models/cars/npc/sedan-02.glb',
  '/models/cars/npc/sedan-03.glb',
  '/models/cars/npc/suv-01.glb',
  '/models/cars/npc/suv-02.glb',
  '/models/cars/npc/sports-01.glb',
  '/models/cars/npc/pickup-01.glb',
  '/models/cars/npc/hatchback-01.glb',
];

const MAX_NPC = 20;
const SPAWN_RANGE = 800;
const DESPAWN_RANGE = 200;

export class NPCVehicleSystem {
  readonly group = new THREE.Group();
  private templates: THREE.Group[] = [];
  private cars: NPCCar[] = [];
  private spawnTimer = 0;
  private loaded = false;

  async load(): Promise<void> {
    const loader = new GLTFLoader();
    for (const path of NPC_MODEL_PATHS) {
      try {
        const gltf = await loader.loadAsync(path);
        const scene = gltf.scene;

        // Normalize to ~4.5m length
        const box = new THREE.Box3().setFromObject(scene);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        if (maxDim > 0) {
          const scale = 4.5 / maxDim;
          scene.scale.setScalar(scale);
        }

        // Ground the model
        const box2 = new THREE.Box3().setFromObject(scene);
        const center = box2.getCenter(new THREE.Vector3());
        scene.position.sub(center);
        scene.position.y -= box2.min.y;

        scene.traverse((c: THREE.Object3D) => {
          if (c instanceof THREE.Mesh) {
            c.castShadow = true;
            c.receiveShadow = true;
          }
        });

        this.templates.push(scene);
      } catch {
        // Model not available, skip
      }
    }

    // If no GLTF models loaded, create simple box car placeholders
    if (this.templates.length === 0) {
      for (let i = 0; i < 4; i++) {
        const g = new THREE.Group();
        const colors = [0x333333, 0x555555, 0x888888, 0xaaaaaa];
        const body = new THREE.Mesh(
          new THREE.BoxGeometry(1.8, 1.0, 4.5),
          new THREE.MeshStandardMaterial({ color: colors[i], metalness: 0.5, roughness: 0.5 })
        );
        body.position.y = 0.7;
        body.castShadow = true;
        const cabin = new THREE.Mesh(
          new THREE.BoxGeometry(1.6, 0.7, 2.0),
          new THREE.MeshStandardMaterial({ color: 0x222233, transparent: true, opacity: 0.5 })
        );
        cabin.position.set(0, 1.35, -0.2);
        g.add(body, cabin);
        this.templates.push(g);
      }
    }

    this.loaded = true;
  }

  update(dt: number, playerZ: number, nightFactor: number): void {
    if (!this.loaded) return;

    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0 && this.activeCount() < MAX_NPC) {
      this.spawnCar(playerZ, nightFactor);
      this.spawnTimer = 5 + Math.random() * 15;
    }

    for (const car of this.cars) {
      if (!car.active) continue;
      car.z += car.speed * dt;
      car.group.position.z = car.z;

      const relZ = car.z - playerZ;
      if ((car.dir === 1 && relZ < -DESPAWN_RANGE) ||
          (car.dir === -1 && relZ > SPAWN_RANGE + 200)) {
        this.deactivateCar(car);
      }
    }
  }

  private spawnCar(playerZ: number, nightFactor: number): void {
    if (this.templates.length === 0) return;

    const modelIdx = Math.floor(Math.random() * this.templates.length);
    const dir: 1 | -1 = Math.random() < 0.6 ? 1 : -1;

    let laneIdx: number;
    if (dir === 1) {
      const sameLanes = [3, 4, 5].filter(i => i !== DRIVE.laneIdx);
      laneIdx = sameLanes[Math.floor(Math.random() * sameLanes.length)];
    } else {
      laneIdx = Math.floor(Math.random() * 3);
    }

    const x = LANES[laneIdx];
    const z = dir === 1
      ? playerZ + SPAWN_RANGE + Math.random() * 200
      : playerZ + SPAWN_RANGE + Math.random() * 400;

    const baseSpeed = dir === 1 ? DRIVE.speed : -DRIVE.speed;
    const variation = (Math.random() - 0.5) * 6;
    const speed = baseSpeed + variation;

    const clone = this.templates[modelIdx].clone(true);
    if (dir === -1) clone.rotation.y = Math.PI;

    const group = new THREE.Group();
    group.add(clone);
    group.position.set(x, BRIDGE.deckH + 0.01, z);

    const headlights: THREE.PointLight[] = [];
    const taillights: THREE.PointLight[] = [];
    const headIntensity = nightFactor > 0.3 ? 30 : 0;
    const tailIntensity = nightFactor > 0.3 ? 3 : 0;

    for (const side of [-0.5, 0.5]) {
      const hl = new THREE.PointLight(0xfff5e0, headIntensity, 40);
      hl.position.set(side, 0.6, 2.0 * dir);
      group.add(hl);
      headlights.push(hl);

      const tl = new THREE.PointLight(0xff2200, tailIntensity, 15);
      tl.position.set(side, 0.5, -2.0 * dir);
      group.add(tl);
      taillights.push(tl);
    }

    this.cars.push({ group, z, speed, dir, headlights, taillights, active: true });
    this.group.add(group);
  }

  private deactivateCar(car: NPCCar): void {
    car.active = false;
    car.group.removeFromParent();
    for (const l of [...car.headlights, ...car.taillights]) l.dispose();
  }

  private activeCount(): number {
    let count = 0;
    for (const c of this.cars) if (c.active) count++;
    return count;
  }

  applyRecenter(shift: number): void {
    for (const car of this.cars) {
      if (!car.active) continue;
      car.z += shift;
      car.group.position.z = car.z;
    }
  }

  dispose(): void {
    for (const car of this.cars) {
      if (car.active) this.deactivateCar(car);
    }
    this.group.removeFromParent();
  }
}
