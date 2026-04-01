# Realistic Lighting Rebalancing Design

## Problem

Daytime scenes suffer from severe overexposure — the sun illumination looks like a nuclear blast rather than natural daylight. The root cause is that fill light (ambient + hemisphere) is nearly equal to direct sunlight, creating a ~1:1 ratio instead of the physically correct ~5:1 ratio found in real-world clear-sky conditions.

### Current Noon Values (Before)

| Parameter | Value |
|-----------|-------|
| Sun Intensity | 1.1 |
| Ambient Intensity | 0.4 |
| Hemisphere Intensity | 0.6 (fixed) |
| Fill Total | 1.0 |
| Sun:Fill Ratio | **1.1:1** |
| Exposure | 0.48 |
| Env Map Intensity | 0.4 (fixed) |

## Goal

Photorealistic daylight rendering where the scene looks like what the human eye would see in real life. All 24 hours should transition naturally, but daytime overexposure elimination is the top priority.

## Approach

Keep ACES Filmic tone mapping. Rebalance the entire TimeOfDay keyframe table with physically motivated sun-to-fill ratios. Add `hemisphereIntensity` and `envMapIntensity` as new dynamic TimeOfDay parameters.

## Design

### 1. Core Principle — Sun:Fill Ratio

Real-world reference ratios:

| Condition | Direct (Sun) | Fill (Sky+Bounce) | Ratio |
|-----------|-------------|-------------------|-------|
| Clear noon | 100% | 15–20% | 5:1–7:1 |
| Overcast | 50% | 40% | 1.2:1 |
| Golden hour | 40% | 25% | 1.5:1 |

Target for this project at noon: **4:1** (sun 0.8, fill 0.20).

### 2. TimeOfDay Keyframe Table

Two new interpolated fields added to existing keyframes: `hemisphereIntensity` and `envMapIntensity`.

| Hour | Sun Intensity | Ambient Intensity | Hemisphere Intensity | Exposure | Env Map Intensity | Sun:Fill Ratio |
|------|--------------|-------------------|---------------------|----------|-------------------|---------------|
| 0:00 (Night) | 0 | 0.04 | 0.06 | 0.30 | 0.05 | N/A |
| 4:30 (Pre-dawn) | 0.08 | 0.06 | 0.10 | 0.32 | 0.08 | 0.5:1 |
| 6:00 (Dawn) | 0.4 | 0.08 | 0.12 | 0.35 | 0.15 | 2:1 |
| 8:00 (Morning) | 0.7 | 0.10 | 0.12 | 0.35 | 0.20 | 3.2:1 |
| 12:00 (Noon) | 0.8 | 0.10 | 0.10 | 0.33 | 0.20 | 4:1 |
| 16:00 (Afternoon) | 0.7 | 0.10 | 0.12 | 0.35 | 0.20 | 3.2:1 |
| 18:30 (Golden Hour) | 0.45 | 0.10 | 0.15 | 0.36 | 0.25 | 1.8:1 |
| 20:00 (Dusk) | 0.10 | 0.06 | 0.10 | 0.32 | 0.10 | 0.6:1 |
| 22:00 (Night) | 0 | 0.04 | 0.06 | 0.30 | 0.05 | N/A |
| 24:00 (Night wrap) | 0 | 0.04 | 0.06 | 0.30 | 0.05 | N/A |

### 3. MaterialUpdater Changes

**Hemisphere Light dynamic update:**
- Currently fixed at 0.6 in `Lighting.ts`
- MaterialUpdater will set `hemisphereLight.intensity = timeState.hemisphereIntensity` each frame

**Environment Map Intensity dynamic update:**
- Currently fixed per-material (bridge 0.4, cable 0.3) with nightFactor correction
- Change to: `timeState.envMapIntensity * materialRatio`
  - Bridge steel: ratio 1.0
  - Cable: ratio 0.75
  - Other materials (concrete, road): no env map, unchanged
- Remove nightFactor-based envMap correction — TimeOfDay keyframes already encode time-of-day variation

**Ambient Light:**
- Already dynamically updated from `timeState.ambientIntensity` — verify and keep

### 4. Files to Modify

| File | Changes |
|------|---------|
| `src/atmosphere/TimeOfDay.ts` | Add `hemisphereIntensity`, `envMapIntensity` to keyframes and `TimeState` interface. Update all keyframe values per table above. Include new fields in lerp interpolation. |
| `src/atmosphere/MaterialUpdater.ts` | Accept hemisphere light reference. Update hemisphere intensity per frame. Update envMap intensity from timeState with per-material ratios. Remove nightFactor envMap correction. |
| `src/world/Lighting.ts` | Set hemisphere initial intensity to match keyframe start value. Expose hemisphere light for external access. |

### 5. Files NOT Modified

- `SceneManager.ts` — ACES Filmic tone mapping retained
- `Materials.ts` — metalness/roughness unchanged
- `PostFXPipeline.ts` — bloom/color grade unchanged
- `SkyController.ts` — turbidity/rayleigh keyframes unchanged
- `main.ts` — initialization order unchanged

### 6. Key Metrics (Noon, Before → After)

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Sun Intensity | 1.1 | 0.8 | -27% |
| Ambient Intensity | 0.4 | 0.10 | -75% |
| Hemisphere Intensity | 0.6 | 0.10 | -83% |
| Fill Total | 1.0 | 0.20 | -80% |
| Sun:Fill Ratio | 1.1:1 | 4:1 | Physically correct |
| Exposure | 0.48 | 0.33 | -31% |
| Env Map Intensity | 0.4 | 0.20 | -50% |
