import * as THREE from 'three';
import { DRIVE, BRIDGE } from '../config/bridge';

export type ViewMode = 'first' | 'third';

export class DriverCamera {
  viewMode: ViewMode = 'third';

  private yaw = 0;
  private pitch = 0;
  private readonly sensitivity = 0.002;

  private orbitalYaw = 0;
  private orbitalPitch = 0.15;

  constructor(
    private camera: THREE.PerspectiveCamera,
    private carGroup: THREE.Group,
  ) {}

  onMouseMove(dx: number, dy: number): void {
    if (this.viewMode === 'first') {
      this.yaw -= dx * this.sensitivity;
      this.pitch -= dy * this.sensitivity;
      this.pitch = THREE.MathUtils.clamp(this.pitch, -Math.PI / 6, Math.PI / 3);
    } else {
      this.orbitalYaw -= dx * this.sensitivity;
      this.orbitalPitch -= dy * this.sensitivity;
      this.orbitalPitch = THREE.MathUtils.clamp(this.orbitalPitch, -0.1, Math.PI / 3);
    }
  }

  toggleView(): void {
    this.viewMode = this.viewMode === 'first' ? 'third' : 'first';
    this.yaw = 0;
    this.pitch = 0;
    this.orbitalYaw = 0;
    this.orbitalPitch = 0.15;
  }

  update(): void {
    const carPos = this.carGroup.position;

    if (this.viewMode === 'first') {
      this.camera.position.set(carPos.x - 0.3, carPos.y + DRIVE.eyeH, carPos.z);

      const dir = new THREE.Vector3(
        Math.sin(this.yaw) * Math.cos(this.pitch),
        Math.sin(this.pitch),
        Math.cos(this.yaw) * Math.cos(this.pitch),
      );
      this.camera.lookAt(
        this.camera.position.x + dir.x,
        this.camera.position.y + dir.y,
        this.camera.position.z + dir.z,
      );
    } else {
      const dist = DRIVE.thirdPersonBack;
      const height = DRIVE.thirdPersonUp;

      this.camera.position.set(
        carPos.x + Math.sin(this.orbitalYaw) * dist,
        carPos.y + height + Math.sin(this.orbitalPitch) * dist,
        carPos.z - Math.cos(this.orbitalYaw) * dist,
      );
      this.camera.lookAt(carPos.x, carPos.y + 1.0, carPos.z);
    }
  }

  reset(): void {
    this.yaw = 0;
    this.pitch = 0;
    this.orbitalYaw = 0;
    this.orbitalPitch = 0.15;
    this.viewMode = 'third';
  }
}
