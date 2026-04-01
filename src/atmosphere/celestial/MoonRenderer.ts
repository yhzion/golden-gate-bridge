// src/atmosphere/celestial/MoonRenderer.ts
import * as THREE from 'three';
import type { MoonState } from './EphemerisCalculator';

const SKY_RADIUS = 38000;
const MOON_RADIUS = 400;

export class MoonRenderer {
  private moonMesh: THREE.Mesh;
  private moonLight: THREE.DirectionalLight;
  private glowMesh: THREE.Mesh;
  private group: THREE.Group;
  moonlightFactor = 0;

  constructor() {
    this.group = new THREE.Group();

    const geo = new THREE.SphereGeometry(MOON_RADIUS, 32, 32);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xddddcc,
      roughness: 0.95,
      metalness: 0.0,
      emissive: 0x222211,
      emissiveIntensity: 0.1,
    });
    this.moonMesh = new THREE.Mesh(geo, mat);
    this.moonMesh.visible = false;
    this.group.add(this.moonMesh);

    this.moonLight = new THREE.DirectionalLight(0xffffff, 2.0);
    this.moonLight.target = this.moonMesh;
    this.group.add(this.moonLight);

    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xffffee,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.FrontSide,
    });
    const glowGeo = new THREE.SphereGeometry(MOON_RADIUS * 1.4, 16, 16);
    this.glowMesh = new THREE.Mesh(glowGeo, glowMat);
    this.glowMesh.visible = false;
    this.group.add(this.glowMesh);
  }

  getGroup(): THREE.Group {
    return this.group;
  }

  update(
    moonState: MoonState,
    nightFactor: number,
    sunDirection: THREE.Vector3,
    overcastFactor: number,
  ): number {
    const visibility = this.smoothstep(0.05, 0.25, nightFactor) * (1 - overcastFactor * 0.7);

    if (moonState.altitude < -0.02 || visibility < 0.01) {
      this.moonMesh.visible = false;
      this.glowMesh.visible = false;
      this.moonlightFactor = 0;
      return 0;
    }

    this.moonMesh.visible = true;
    this.glowMesh.visible = true;

    const cosAlt = Math.cos(moonState.altitude);
    const pos = new THREE.Vector3(
      -Math.sin(moonState.azimuth) * cosAlt * SKY_RADIUS,
      Math.sin(moonState.altitude) * SKY_RADIUS,
      -Math.cos(moonState.azimuth) * cosAlt * SKY_RADIUS,
    );
    this.moonMesh.position.copy(pos);
    this.glowMesh.position.copy(pos);

    const lightOffset = sunDirection.clone().multiplyScalar(MOON_RADIUS * 10);
    this.moonLight.position.copy(pos).add(lightOffset);
    this.moonLight.intensity = 2.0 * visibility;

    const moonMat = this.moonMesh.material as THREE.MeshStandardMaterial;
    moonMat.emissiveIntensity = 0.1 + moonState.illumination * 0.3 * visibility;

    const glowMat = this.glowMesh.material as THREE.MeshBasicMaterial;
    glowMat.opacity = moonState.illumination * visibility * 0.15;

    const altFactor = moonState.altitude > 0
      ? this.smoothstep(0, 0.3, moonState.altitude)
      : 0;
    this.moonlightFactor = moonState.illumination * altFactor * (1 - overcastFactor);

    return this.moonlightFactor;
  }

  getMoonDirection(): THREE.Vector3 {
    return this.moonMesh.position.clone().normalize();
  }

  private smoothstep(edge0: number, edge1: number, x: number): number {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  }

  dispose(): void {
    (this.moonMesh.material as THREE.Material).dispose();
    this.moonMesh.geometry.dispose();
    (this.glowMesh.material as THREE.Material).dispose();
    this.glowMesh.geometry.dispose();
  }
}
