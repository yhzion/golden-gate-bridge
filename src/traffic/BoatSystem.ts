import * as THREE from 'three';

interface Boat {
  group: THREE.Group;
  x: number;
  z: number;
  speed: number;
  dir: 1 | -1;
  phase: number;
  portLight: THREE.PointLight;
  starboardLight: THREE.PointLight;
  sternLight: THREE.PointLight;
  cabinMat: THREE.MeshStandardMaterial;
  active: boolean;
}

const MAX_BOATS = 5;
const BOAT_SPAWN_RANGE = 600;

export class BoatSystem {
  readonly group = new THREE.Group();
  private boats: Boat[] = [];
  private spawnTimer = 3;
  private hullGeo: THREE.BufferGeometry;
  private deckGeo: THREE.BufferGeometry;
  private cabinGeo: THREE.BufferGeometry;

  constructor() {
    const hullProfile = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(3, 0.3),
      new THREE.Vector2(3.5, 1.5),
      new THREE.Vector2(2.5, 3),
      new THREE.Vector2(0, 3.5),
    ];
    this.hullGeo = new THREE.LatheGeometry(hullProfile, 12);
    this.deckGeo = new THREE.BoxGeometry(5, 0.2, 8);
    this.cabinGeo = new THREE.BoxGeometry(3, 2.5, 4);
  }

  update(dt: number, elapsed: number, playerZ: number, nightFactor: number): void {
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0 && this.activeCount() < MAX_BOATS) {
      this.spawnBoat(playerZ);
      this.spawnTimer = 8 + Math.random() * 15;
    }

    for (const b of this.boats) {
      if (!b.active) continue;

      b.x += b.speed * dt;
      b.group.position.x = b.x;
      b.group.position.y = -0.5 + Math.sin(elapsed * 0.5 + b.phase) * 0.3;
      b.group.rotation.z = Math.sin(elapsed * 0.3 + b.phase) * 0.03;

      const intensity = nightFactor > 0.3 ? nightFactor : 0;
      b.portLight.intensity = intensity * 2;
      b.starboardLight.intensity = intensity * 2;
      b.sternLight.intensity = intensity * 1.5;
      b.cabinMat.emissiveIntensity = intensity * 0.8;

      if (Math.abs(b.z - playerZ) > BOAT_SPAWN_RANGE + 200) {
        b.active = false;
        b.group.removeFromParent();
      }
    }
  }

  private spawnBoat(playerZ: number): void {
    const dir: 1 | -1 = Math.random() < 0.5 ? 1 : -1;
    const x = dir === 1 ? -300 - Math.random() * 100 : 300 + Math.random() * 100;
    const z = playerZ + (Math.random() - 0.3) * BOAT_SPAWN_RANGE;
    const speed = dir * (1 + Math.random() * 2);

    const group = new THREE.Group();

    const hull = new THREE.Mesh(this.hullGeo, new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.6 }));
    hull.scale.set(1, 0.6, 1);
    group.add(hull);

    const deck = new THREE.Mesh(this.deckGeo, new THREE.MeshStandardMaterial({ color: 0x8B6914, roughness: 0.8 }));
    deck.position.y = 1.8;
    group.add(deck);

    const cabinMat = new THREE.MeshStandardMaterial({
      color: 0x556677, roughness: 0.5,
      emissive: new THREE.Color(0xffcc66), emissiveIntensity: 0,
    });
    const cabin = new THREE.Mesh(this.cabinGeo, cabinMat);
    cabin.position.y = 3.2;
    group.add(cabin);

    const portLight = new THREE.PointLight(0xff0000, 0, 20);
    portLight.position.set(-3, 2, 0);
    group.add(portLight);

    const starboardLight = new THREE.PointLight(0x00ff00, 0, 20);
    starboardLight.position.set(3, 2, 0);
    group.add(starboardLight);

    const sternLight = new THREE.PointLight(0xffffff, 0, 15);
    sternLight.position.set(0, 2.5, -4);
    group.add(sternLight);

    group.position.set(x, -0.5, z);
    if (dir === -1) group.rotation.y = Math.PI;

    this.group.add(group);
    this.boats.push({
      group, x, z, speed, dir,
      phase: Math.random() * Math.PI * 2,
      portLight, starboardLight, sternLight,
      cabinMat, active: true,
    });
  }

  private activeCount(): number {
    let count = 0;
    for (const b of this.boats) if (b.active) count++;
    return count;
  }

  applyRecenter(shift: number): void {
    for (const b of this.boats) {
      if (!b.active) continue;
      b.z += shift;
      b.group.position.z = b.z;
    }
  }

  dispose(): void {
    this.group.removeFromParent();
    this.hullGeo.dispose();
    this.deckGeo.dispose();
    this.cabinGeo.dispose();
  }
}
