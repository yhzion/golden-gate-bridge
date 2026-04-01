import * as THREE from 'three';
import { InfinityTileManager } from './InfinityTileManager';
import { PlayerCar } from './PlayerCar';
import { DriverCamera, ViewMode } from './DriverCamera';
import { NPCVehicleSystem } from '../traffic/NPCVehicleSystem';
import { BoatSystem } from '../traffic/BoatSystem';
import { DriveHUD } from '../ui/DriveHUD';
import { DRIVE } from '../config/bridge';
import type { BridgeMaterials } from '../world/Materials';
import type { TimeState } from '../atmosphere/TimeOfDay';

export class DriveMode {
  private tileManager: InfinityTileManager;
  private playerCar: PlayerCar;
  private driverCamera: DriverCamera;
  private npcVehicles: NPCVehicleSystem;
  private boats: BoatSystem;
  private hud: DriveHUD;

  private active = false;
  private originalBridgeGroup: THREE.Group | null = null;
  private originalCityscapeGroup: THREE.Group | null = null;
  private originalFogDensity = 0;

  constructor(
    private scene: THREE.Scene,
    private camera: THREE.PerspectiveCamera,
    private mats: BridgeMaterials,
  ) {
    this.tileManager = new InfinityTileManager(mats);
    this.playerCar = new PlayerCar();
    this.driverCamera = new DriverCamera(camera, this.playerCar.group);
    this.npcVehicles = new NPCVehicleSystem();
    this.boats = new BoatSystem();
    this.hud = new DriveHUD();
  }

  async load(): Promise<void> {
    await Promise.all([
      this.playerCar.load(),
      this.npcVehicles.load(),
    ]);
  }

  isActive(): boolean {
    return this.active;
  }

  enter(bridgeGroup: THREE.Group, cityscapeGroup?: THREE.Group): void {
    if (this.active) return;
    this.active = true;

    // Hide original bridge and cityscape
    this.originalBridgeGroup = bridgeGroup;
    bridgeGroup.visible = false;
    if (cityscapeGroup) {
      this.originalCityscapeGroup = cityscapeGroup;
      cityscapeGroup.visible = false;
    }

    // Adjust fog for infinity mode
    const fog = this.scene.fog as THREE.FogExp2;
    if (fog) {
      this.originalFogDensity = fog.density;
      fog.density = 0.00006;
    }

    // Build infinity tiles
    this.tileManager.build(this.scene);

    // Place player car
    this.playerCar.z = 0;
    this.playerCar.positionOnDeck();
    this.scene.add(this.playerCar.group);

    // Add NPC systems
    this.scene.add(this.npcVehicles.group);
    this.scene.add(this.boats.group);

    // Show HUD
    this.hud.show();

    // Request pointer lock
    document.body.requestPointerLock();
  }

  exit(): void {
    if (!this.active) return;
    this.active = false;

    // Restore original bridge
    if (this.originalBridgeGroup) {
      this.originalBridgeGroup.visible = true;
    }
    if (this.originalCityscapeGroup) {
      this.originalCityscapeGroup.visible = true;
    }

    // Restore fog
    const fog = this.scene.fog as THREE.FogExp2;
    if (fog && this.originalFogDensity) {
      fog.density = this.originalFogDensity;
    }

    // Remove drive systems from scene
    this.tileManager.dispose();
    this.playerCar.group.removeFromParent();
    this.npcVehicles.dispose();
    this.boats.dispose();

    // Hide HUD
    this.hud.hide();

    // Exit pointer lock
    document.exitPointerLock();

    // Reset camera
    this.driverCamera.reset();
  }

  onMouseMove(dx: number, dy: number): void {
    if (!this.active) return;
    this.driverCamera.onMouseMove(dx, dy);
  }

  onKeyDown(key: string): void {
    if (!this.active) return;
    if (key === 'v' || key === 'V') {
      this.driverCamera.toggleView();
    }
  }

  update(dt: number, elapsed: number, timeState: TimeState): void {
    if (!this.active) return;

    const nightFactor = timeState.streetLightEmissive;

    // Update player car
    this.playerCar.update(dt, nightFactor);

    // Update tile manager (may trigger recentering)
    const recenterShift = this.tileManager.update(this.playerCar.z);
    if (recenterShift !== 0) {
      this.playerCar.applyRecenter(recenterShift);
      this.npcVehicles.applyRecenter(recenterShift);
      this.boats.applyRecenter(recenterShift);
    }

    // Update camera
    this.driverCamera.update();

    // Update NPC systems
    this.npcVehicles.update(dt, this.playerCar.z, nightFactor);
    this.boats.update(dt, elapsed, this.playerCar.z, nightFactor);

    // Update HUD
    this.hud.update(DRIVE.speed, this.driverCamera.viewMode);
  }

  dispose(): void {
    this.exit();
  }
}
