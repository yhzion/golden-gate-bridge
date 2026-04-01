export type Tier = 'low' | 'medium' | 'high';
export type TierMode = 'auto' | 'manual';

export class QualityTier {
  private targetFPS: number;
  private mode: TierMode = 'auto';
  private currentTier: Tier = 'high';
  private manualTier: Tier = 'high';
  private samples: number[] = [];
  private maxSamples = 60;
  private cooldown = 0;
  private cooldownDuration = 2;
  private listeners: ((tier: Tier) => void)[] = [];

  constructor(targetFPS = 50) {
    this.targetFPS = targetFPS;
  }

  sample(dt: number): void {
    if (dt <= 0) return;
    const fps = 1 / dt;
    this.samples.push(fps);
    if (this.samples.length > this.maxSamples) this.samples.shift();
    if (this.mode === 'manual') return;
    this.cooldown -= dt;
    if (this.cooldown > 0) return;
    if (this.samples.length < 30) return;
    const avg = this.samples.reduce((a, b) => a + b, 0) / this.samples.length;
    let next: Tier;
    if (avg >= this.targetFPS) next = 'high';
    else if (avg >= 30) next = 'medium';
    else next = 'low';
    if (next !== this.currentTier) {
      this.currentTier = next;
      this.cooldown = this.cooldownDuration;
      for (const cb of this.listeners) cb(next);
    }
  }

  getCurrentTier(): Tier {
    return this.mode === 'manual' ? this.manualTier : this.currentTier;
  }

  getAverageFPS(): number {
    if (this.samples.length === 0) return 60;
    return this.samples.reduce((a, b) => a + b, 0) / this.samples.length;
  }

  getMode(): TierMode {
    return this.mode;
  }

  onTierChange(callback: (tier: Tier) => void): void {
    this.listeners.push(callback);
  }

  setMode(mode: TierMode): void {
    this.mode = mode;
  }

  setManualTier(tier: Tier): void {
    this.manualTier = tier;
    if (this.mode === 'manual') {
      for (const cb of this.listeners) cb(tier);
    }
  }

  cycleManual(): string {
    if (this.mode === 'auto') {
      this.mode = 'manual';
      this.manualTier = 'low';
    } else if (this.manualTier === 'low') {
      this.manualTier = 'medium';
    } else if (this.manualTier === 'medium') {
      this.manualTier = 'high';
    } else {
      this.mode = 'auto';
      return 'AUTO';
    }
    for (const cb of this.listeners) cb(this.manualTier);
    return this.manualTier.toUpperCase();
  }
}
