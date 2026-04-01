import { BaseLandmark } from '@/landmarks/BaseLandmark';
import type { BridgePart } from './BridgePart';
import type { BridgeMaterials } from '@/world/Materials';

export class BridgeAssembler extends BaseLandmark {
  private parts: BridgePart[] = [];
  private updatableParts: BridgePart[] = [];

  constructor(private mats: BridgeMaterials) {
    super('golden-gate');
  }

  registerPart(part: BridgePart): void {
    this.parts.push(part);
    if (part.update) {
      this.updatableParts.push(part);
    }
  }

  build(): void {
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
