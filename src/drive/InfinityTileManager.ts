import * as THREE from 'three';
import { TILE } from '../config/bridge';
import { BridgeTile } from '../landmarks/bridge/BridgeTile';
import { LODTower } from '../landmarks/bridge/LODTower';
import type { BridgeMaterials } from '../world/Materials';

export class InfinityTileManager {
  readonly group = new THREE.Group();

  private tiles: BridgeTile[] = [];
  private tileIndices: number[] = [];
  private lodTowers: LODTower[] = [];
  private lodGroup = new THREE.Group();

  private currentTileIndex = 0;

  constructor(private mats: BridgeMaterials) {}

  build(scene: THREE.Scene): void {
    // Create 3 active tiles centered on index 0
    for (let i = -1; i <= 1; i++) {
      const tile = new BridgeTile(this.mats);
      tile.build();
      tile.setOffset(i * TILE.length);
      this.tiles.push(tile);
      this.tileIndices.push(i);
      this.group.add(tile.group);
    }

    // Create LOD towers for distance (both directions)
    for (let i = 0; i < TILE.lodTowerCount * 2; i++) {
      const lod = new LODTower(this.mats);
      this.lodTowers.push(lod);
      this.lodGroup.add(lod.group);
    }
    this.updateLODPositions();

    scene.add(this.group);
    scene.add(this.lodGroup);
  }

  /**
   * Call each frame with the player's current Z position.
   * Returns a recentering offset if recentering occurred (0 otherwise).
   * Caller must apply returned offset to camera, player car, and all other objects.
   */
  update(playerZ: number): number {
    const newIndex = Math.floor(playerZ / TILE.length);

    if (newIndex !== this.currentTileIndex) {
      this.currentTileIndex = newIndex;
      this.recycleTiles();
      this.updateLODPositions();
    }

    // World recentering
    if (Math.abs(playerZ) > TILE.recenterThreshold) {
      const shift = -this.currentTileIndex * TILE.length;
      this.applyRecenter(shift);
      this.currentTileIndex = 0;
      return shift;
    }

    return 0;
  }

  private recycleTiles(): void {
    const needed = [this.currentTileIndex - 1, this.currentTileIndex, this.currentTileIndex + 1];
    for (let slot = 0; slot < 3; slot++) {
      if (this.tileIndices[slot] !== needed[slot]) {
        this.tileIndices[slot] = needed[slot];
        this.tiles[slot].recycle(needed[slot] * TILE.length);
      }
    }
  }

  private updateLODPositions(): void {
    const behindStart = (this.currentTileIndex - 2) * TILE.length;
    const aheadStart = (this.currentTileIndex + 2) * TILE.length;
    let idx = 0;

    for (let i = 0; i < TILE.lodTowerCount; i++) {
      const z = behindStart - i * TILE.length;
      this.lodTowers[idx].setPosition(0, 0, z + TILE.towerZs[1]);
      idx++;
    }

    for (let i = 0; i < TILE.lodTowerCount; i++) {
      const z = aheadStart + i * TILE.length;
      this.lodTowers[idx].setPosition(0, 0, z + TILE.towerZs[1]);
      idx++;
    }
  }

  private applyRecenter(shift: number): void {
    // Reset tile indices and positions
    for (let i = 0; i < 3; i++) {
      this.tileIndices[i] = i - 1;
      this.tiles[i].setOffset(this.tileIndices[i] * TILE.length);
    }
    this.group.position.z = 0;
    this.updateLODPositions();
  }

  dispose(): void {
    for (const t of this.tiles) t.dispose();
    for (const l of this.lodTowers) l.dispose();
    this.group.removeFromParent();
    this.lodGroup.removeFromParent();
  }
}
