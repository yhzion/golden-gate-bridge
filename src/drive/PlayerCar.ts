import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { BRIDGE, DRIVE, LANES } from '../config/bridge';

export class PlayerCar {
  readonly group = new THREE.Group();
  private model: THREE.Group | null = null;
  private wheels: THREE.Object3D[] = [];
  private headlights: THREE.SpotLight[] = [];
  private taillights: THREE.PointLight[] = [];
  private dashLight: THREE.PointLight | null = null;
  private loaded = false;

  z = 0;

  async load(): Promise<void> {
    const loader = new GLTFLoader();
    try {
      const gltf = await loader.loadAsync('/models/cars/player/boxster.glb');
      this.model = gltf.scene;

      // Normalize model to ~4.4m length (Boxster length)
      const box = new THREE.Box3().setFromObject(this.model);
      const size = box.getSize(new THREE.Vector3());
      const targetLength = 4.4;
      const scale = targetLength / Math.max(size.x, size.y, size.z);
      this.model.scale.setScalar(scale);

      // Center and ground the model
      box.setFromObject(this.model);
      const center = box.getCenter(new THREE.Vector3());
      this.model.position.sub(center);
      this.model.position.y -= box.min.y;

      // Find wheel meshes
      this.model.traverse((child) => {
        if (child.name.toLowerCase().includes('wheel') && child instanceof THREE.Mesh) {
          this.wheels.push(child);
        }
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      this.setupLights();
      this.group.add(this.model);
      this.loaded = true;
    } catch (e) {
      console.warn('PlayerCar: Failed to load Boxster model, using placeholder', e);
      this.createPlaceholder();
      this.setupLights();
      this.loaded = true;
    }
  }

  private createPlaceholder(): void {
    // Simple box car placeholder if GLTF not available
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 1.0, 4.4),
      new THREE.MeshStandardMaterial({ color: 0xcc0000, metalness: 0.6, roughness: 0.4 })
    );
    body.position.y = 0.7;
    body.castShadow = true;

    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.6, 1.8),
      new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.3, roughness: 0.5, transparent: true, opacity: 0.6 })
    );
    cabin.position.set(0, 1.3, -0.3);

    this.model = new THREE.Group();
    this.model.add(body, cabin);
    this.group.add(this.model);
  }

  private setupLights(): void {
    if (!this.model) return;

    // Headlights
    for (const side of [-0.6, 0.6]) {
      const spot = new THREE.SpotLight(0xfff5e0, 0, 80, Math.PI / 6, 0.5, 1.5);
      spot.position.set(side, 0.6, 2.2);
      spot.target.position.set(side, 0, 20);
      this.model.add(spot);
      this.model.add(spot.target);
      this.headlights.push(spot);
    }

    // Taillights
    for (const side of [-0.6, 0.6]) {
      const pl = new THREE.PointLight(0xff2200, 0, 15);
      pl.position.set(side, 0.5, -2.1);
      this.model.add(pl);
      this.taillights.push(pl);
    }

    // Dashboard light
    this.dashLight = new THREE.PointLight(0x334455, 0, 2);
    this.dashLight.position.set(0, 0.8, 0.5);
    this.model.add(this.dashLight);
  }

  positionOnDeck(): void {
    const laneX = LANES[DRIVE.laneIdx];
    this.group.position.set(laneX, BRIDGE.deckH + 0.01, this.z);
  }

  update(dt: number, nightFactor: number): void {
    if (!this.loaded) return;

    this.z += DRIVE.speed * dt;
    this.positionOnDeck();

    // Wheel rotation
    const wheelRadius = 0.33;
    const angularSpeed = DRIVE.speed / wheelRadius;
    for (const w of this.wheels) {
      w.rotation.x += angularSpeed * dt;
    }

    // Night lighting
    const headI = nightFactor > 0.3 ? THREE.MathUtils.lerp(0, 50, nightFactor) : 0;
    const tailI = nightFactor > 0.3 ? THREE.MathUtils.lerp(0, 5, nightFactor) : 0;
    const dashI = nightFactor > 0.3 ? THREE.MathUtils.lerp(0, 0.5, nightFactor) : 0;

    for (const h of this.headlights) h.intensity = headI;
    for (const t of this.taillights) t.intensity = tailI;
    if (this.dashLight) this.dashLight.intensity = dashI;
  }

  applyRecenter(shift: number): void {
    this.z += shift;
    this.positionOnDeck();
  }

  dispose(): void {
    this.group.removeFromParent();
    for (const h of this.headlights) h.dispose();
    for (const t of this.taillights) t.dispose();
    this.dashLight?.dispose();
  }
}
