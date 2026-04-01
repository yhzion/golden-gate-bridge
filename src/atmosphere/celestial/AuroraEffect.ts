// src/atmosphere/celestial/AuroraEffect.ts

export class AuroraEffect {
  private active = false;
  private intensity = 0;
  private lifetime = 0;
  private duration = 0;
  private fadeInTime = 0;
  private fadeOutStart = 0;
  private cooldown = 0;

  static readonly GLSL = /* glsl */ `
    vec3 auroraEffect(vec3 dir, float auroraIntensity, float time) {
      if (auroraIntensity < 0.01) return vec3(0.0);

      float altitude = dir.y;
      if (altitude < 0.1 || altitude > 0.8) return vec3(0.0);

      float northFacing = smoothstep(-0.5, 0.5, -dir.z);
      if (northFacing < 0.1) return vec3(0.0);

      float altEnvelope = smoothstep(0.15, 0.5, altitude) * smoothstep(0.85, 0.55, altitude);

      float wave1 = sin(dir.x * 4.0 + time * 0.15) * 0.5 + 0.5;
      float wave2 = sin(dir.x * 7.0 - time * 0.08 + 1.5) * 0.5 + 0.5;
      float curtain = wave1 * wave2;

      float detail = sin(dir.x * 12.0 + time * 0.2) * sin(altitude * 8.0 - time * 0.1);
      detail = detail * 0.5 + 0.5;

      float intensity = altEnvelope * northFacing * curtain * detail * auroraIntensity * 0.3;

      vec3 auroraColor = mix(
        vec3(0.1, 0.8, 0.3),
        vec3(0.4, 0.1, 0.6),
        sin(dir.x * 3.0 + time * 0.1) * 0.5 + 0.5
      );

      return auroraColor * intensity;
    }
  `;

  update(nightFactor: number, elapsed: number, dt: number): number {
    if (this.active) {
      this.lifetime += dt;

      if (this.lifetime < this.fadeInTime) {
        this.intensity = this.lifetime / this.fadeInTime;
      } else if (this.lifetime < this.fadeOutStart) {
        this.intensity = 1.0;
      } else if (this.lifetime < this.duration) {
        this.intensity = 1.0 - (this.lifetime - this.fadeOutStart) / (this.duration - this.fadeOutStart);
      } else {
        this.active = false;
        this.intensity = 0;
        this.cooldown = 30;
      }
      return this.intensity;
    }

    if (nightFactor < 0.80) {
      this.intensity = 0;
      return 0;
    }

    this.cooldown -= dt;
    if (this.cooldown > 0) return 0;

    if (Math.random() < 0.0005 * dt) {
      this.active = true;
      this.lifetime = 0;
      this.fadeInTime = 5 + Math.random() * 5;
      const activeTime = 30 + Math.random() * 90;
      const fadeOutTime = 10 + Math.random() * 5;
      this.fadeOutStart = this.fadeInTime + activeTime;
      this.duration = this.fadeOutStart + fadeOutTime;
    }

    return 0;
  }
}
