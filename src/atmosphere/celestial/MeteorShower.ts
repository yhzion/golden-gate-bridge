// src/atmosphere/celestial/MeteorShower.ts
import * as THREE from 'three';

interface Meteor {
  line: THREE.Line;
  origin: THREE.Vector3;
  direction: THREE.Vector3;
  speed: number;
  age: number;
  lifespan: number;
  trailLength: number;
}

const MAX_METEORS = 10;
const SKY_RADIUS = 37000;

export class MeteorShower {
  private group: THREE.Group;
  private meteors: Meteor[] = [];
  private sporadicTimer = 0;
  private sporadicInterval = 0;
  private showerActive = false;
  private showerTimer = 0;
  private showerDuration = 0;
  private showerRadiant = new THREE.Vector3();
  private showerSpawnTimer = 0;
  private eventCheckTimer = 0;

  constructor() {
    this.group = new THREE.Group();
    this.sporadicInterval = 30 + Math.random() * 90;
  }

  getGroup(): THREE.Group {
    return this.group;
  }

  update(nightFactor: number, elapsed: number, dt: number): void {
    if (nightFactor < 0.80) {
      this.hideAll();
      return;
    }

    for (let i = this.meteors.length - 1; i >= 0; i--) {
      const m = this.meteors[i];
      m.age += dt;

      if (m.age >= m.lifespan) {
        this.group.remove(m.line);
        m.line.geometry.dispose();
        (m.line.material as THREE.Material).dispose();
        this.meteors.splice(i, 1);
        continue;
      }

      const progress = m.age / m.lifespan;
      const headPos = m.origin.clone().add(m.direction.clone().multiplyScalar(m.speed * m.age));
      const tailPos = headPos.clone().sub(m.direction.clone().multiplyScalar(m.trailLength));

      const positions = m.line.geometry.attributes.position as THREE.BufferAttribute;
      positions.setXYZ(0, tailPos.x, tailPos.y, tailPos.z);
      positions.setXYZ(1, headPos.x, headPos.y, headPos.z);
      positions.needsUpdate = true;

      const mat = m.line.material as THREE.LineBasicMaterial;
      const fade = 1 - progress;
      mat.color.setRGB(1.0, 0.8 + 0.2 * (1 - progress), 0.5 * (1 - progress));
      mat.opacity = fade * fade;
    }

    this.sporadicTimer += dt;
    if (this.sporadicTimer >= this.sporadicInterval && this.meteors.length < MAX_METEORS) {
      this.spawnMeteor(this.randomSkyDirection());
      this.sporadicTimer = 0;
      this.sporadicInterval = 30 + Math.random() * 90;
    }

    if (!this.showerActive) {
      this.eventCheckTimer += dt;
      if (this.eventCheckTimer >= 60) {
        this.eventCheckTimer = 0;
        if (Math.random() < 0.075) {
          this.startShower();
        }
      }
    }

    if (this.showerActive) {
      this.showerTimer += dt;
      this.showerSpawnTimer += dt;

      if (this.showerSpawnTimer >= 2 + Math.random() * 3) {
        this.showerSpawnTimer = 0;
        if (this.meteors.length < MAX_METEORS) {
          const dir = this.showerRadiant.clone();
          dir.x += (Math.random() - 0.5) * 0.3;
          dir.y += (Math.random() - 0.5) * 0.15;
          dir.z += (Math.random() - 0.5) * 0.3;
          dir.normalize();
          this.spawnMeteor(dir);
        }
      }

      if (this.showerTimer >= this.showerDuration) {
        this.showerActive = false;
      }
    }
  }

  private startShower(): void {
    this.showerActive = true;
    this.showerTimer = 0;
    this.showerSpawnTimer = 0;
    this.showerDuration = 10 + Math.random() * 20;
    this.showerRadiant = this.randomSkyDirection();
    this.showerRadiant.y = Math.abs(this.showerRadiant.y) * 0.5 + 0.3;
    this.showerRadiant.normalize();
  }

  private spawnMeteor(startDir: THREE.Vector3): void {
    if (startDir.y < 0.1) startDir.y = 0.1 + Math.random() * 0.5;
    startDir.normalize();

    const origin = startDir.clone().multiplyScalar(SKY_RADIUS);

    const direction = new THREE.Vector3(
      (Math.random() - 0.5) * 0.5,
      -0.3 - Math.random() * 0.7,
      (Math.random() - 0.5) * 0.5,
    ).normalize();

    const lifespan = 0.5 + Math.random() * 1.0;
    const speed = 8000 + Math.random() * 12000;
    const trailLength = 500 + Math.random() * 1500;

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(6);
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 1,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const line = new THREE.Line(geometry, material);
    this.group.add(line);

    this.meteors.push({ line, origin, direction, speed, age: 0, lifespan, trailLength });
  }

  private randomSkyDirection(): THREE.Vector3 {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI * 0.4 + 0.1;
    return new THREE.Vector3(
      Math.sin(phi) * Math.cos(theta),
      Math.cos(phi),
      Math.sin(phi) * Math.sin(theta),
    ).normalize();
  }

  private hideAll(): void {
    for (const m of this.meteors) {
      (m.line.material as THREE.LineBasicMaterial).opacity = 0;
    }
  }

  dispose(): void {
    for (const m of this.meteors) {
      this.group.remove(m.line);
      m.line.geometry.dispose();
      (m.line.material as THREE.Material).dispose();
    }
    this.meteors = [];
  }
}
