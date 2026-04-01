import { BaseLandmark } from '@/landmarks/BaseLandmark';
import type { BridgePart } from './BridgePart';
import type { BridgeMaterials } from '@/world/Materials';

// Towers (T1–T8)
import { TowerShaft } from './towers/TowerShaft';
import { TowerPortals } from './towers/TowerPortals';
import { TowerCells } from './towers/TowerCells';
import { ArtDecoPanels } from './towers/ArtDecoPanels';
import { TowerCap } from './towers/TowerCap';
import { PierAndFender } from './towers/PierAndFender';
import { AviationLights } from './towers/AviationLights';
import { MaintenanceAccess } from './towers/MaintenanceAccess';

// Cables (C1–C5)
import { MainCable } from './cables/MainCable';
import { CableBand } from './cables/CableBand';
import { Suspenders } from './cables/Suspenders';
import { CableSaddle } from './cables/CableSaddle';
import { CableAnchorage } from './cables/CableAnchorage';

export class BridgeAssembler extends BaseLandmark {
  private parts: BridgePart[] = [];
  private updatableParts: BridgePart[] = [];

  constructor(private mats: BridgeMaterials) {
    super('golden-gate');
  }

  private registerPart(part: BridgePart): void {
    this.parts.push(part);
    if (part.update) {
      this.updatableParts.push(part);
    }
  }

  build(): void {
    // Register all 13 parts (8 towers + 5 cables)
    this.registerPart(new TowerShaft());
    this.registerPart(new TowerPortals());
    this.registerPart(new TowerCells());
    this.registerPart(new ArtDecoPanels());
    this.registerPart(new TowerCap());
    this.registerPart(new PierAndFender());
    this.registerPart(new AviationLights());
    this.registerPart(new MaintenanceAccess());
    this.registerPart(new MainCable());
    this.registerPart(new CableBand());
    this.registerPart(new Suspenders());
    this.registerPart(new CableSaddle());
    this.registerPart(new CableAnchorage());

    // Phase 1: Geometry
    for (const p of this.parts) {
      p.buildGeometry();
    }

    // Phase 2: Materials
    for (const p of this.parts) {
      p.applyMaterials(this.mats);
    }

    // Phase 3: Micro-details
    for (const p of this.parts) {
      p.addMicroDetails();
    }

    // Add all part groups to our group
    for (const p of this.parts) {
      this.group.add(p.group);
    }
  }

  update(dt: number, elapsed: number): void {
    for (const p of this.updatableParts) {
      p.update!(dt, elapsed);
    }
  }

  dispose(): void {
    for (const p of this.parts) {
      p.dispose();
    }
    super.dispose();
  }
}
