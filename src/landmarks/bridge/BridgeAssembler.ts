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

// Deck (D1–D7)
import { DeckSurface } from './deck/DeckSurface';
import { StiffeningTruss } from './deck/StiffeningTruss';
import { FloorSystem } from './deck/FloorSystem';
import { RoadSurface } from './deck/RoadSurface';
import { SidewalkRailing } from './deck/SidewalkRailing';
import { LightStandards } from './deck/LightStandards';
import { DrainageUtilities } from './deck/DrainageUtilities';
import { ExpansionJoints } from './deck/ExpansionJoints';

// Approaches (A1–A5)
import { FortPointArch } from './approaches/FortPointArch';
import { SFAnchorage } from './approaches/SFAnchorage';
import { MarinAnchorage } from './approaches/MarinAnchorage';
import { TollPlaza } from './approaches/TollPlaza';
import { ApproachViaducts } from './approaches/ApproachViaducts';

// Micro-details (S3a–S3d)
import { RivetSystem } from './micro/RivetSystem';
import { SplicePlates } from './micro/SplicePlates';
import { WeldBeads } from './micro/WeldBeads';
import { GussetPlates } from './micro/GussetPlates';

// Environment (E1–E2)
import { PierWake } from '@/world/environment/PierWake';

import { WetSurface } from '@/world/environment/WetSurface';


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
    // Towers (T1–T8) + Cables (C1–C5)
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
    this.registerPart(new DeckSurface());

    // Deck system (D1–D7)
    this.registerPart(new StiffeningTruss());
    this.registerPart(new FloorSystem());
    this.registerPart(new RoadSurface());
    this.registerPart(new SidewalkRailing());
    this.registerPart(new LightStandards());
    this.registerPart(new DrainageUtilities());
    this.registerPart(new ExpansionJoints());

    // Approaches (A1–A5)
    this.registerPart(new FortPointArch());
    this.registerPart(new SFAnchorage());
    this.registerPart(new MarinAnchorage());
    this.registerPart(new TollPlaza());
    this.registerPart(new ApproachViaducts());

    // Micro-details (S3a–S3d)
    this.registerPart(new RivetSystem());
    this.registerPart(new SplicePlates());
    this.registerPart(new WeldBeads());
    this.registerPart(new GussetPlates());

    // Environment (E1–E2)
    this.registerPart(new PierWake());
    this.registerPart(new WetSurface());

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
