# Photorealistic Bridge Plan 3: Micro-Details & Environment

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add micro-detail fastener systems (S3a–S3d) and environmental effects (E1, E2) — completing all 30 parts.

**Architecture:** Micro-detail parts use InstancedMesh for thousands of small elements (rivets, bolts, plates). Environment parts use custom shaders and particle systems with `update()` for animation.

**Tech Stack:** Three.js r183, TypeScript, InstancedMesh, ShaderMaterial, BufferGeometry particles.

---

## File Structure

### New files to create

```
src/landmarks/bridge/micro/
  RivetSystem.ts         # S3a — Rivet head geometry + instancing
  SplicePlates.ts        # S3b — Bolted splice connections
  WeldBeads.ts           # S3c — Weld texture for repair areas
  GussetPlates.ts        # S3d — Node connection plates

src/world/environment/
  PierWake.ts            # E1a — V-wake turbulence behind piers
  TidalFoam.ts           # E1b — Foam at pier base
  WetSurface.ts          # E1c — Wet reflections shader
  FogTendrils.ts         # E2a — Volumetric fog particles through cables
```

### Files to modify

```
src/landmarks/bridge/BridgeAssembler.ts    # Register S3a-d + E1-E2
```

---

## Task 1: S3a — RivetSystem

Hot-driven dome-head rivets instanced across all steel surfaces. 25mm diameter, placed on a regular grid pattern on tower and truss surfaces.

**Files:** Create `src/landmarks/bridge/micro/RivetSystem.ts`

Key details:
- SphereGeometry(0.0125, 6, 4) for dome rivet head — flattened hemisphere
- InstancedMesh with thousands of instances placed on tower faces, truss chords, portal struts
- Grid pattern at 64px intervals (matching the normal map from SteelPBR)
- Tower rivets: on each column face, rows every 0.5m, cols every 0.3m
- Truss rivets: along chord flanges at connection points
- Material: mats.deckSteel

## Task 2: S3b + S3c + S3d — SplicePlates, WeldBeads, GussetPlates

Three smaller micro-detail parts.

**Files:**
- Create `src/landmarks/bridge/micro/SplicePlates.ts`
- Create `src/landmarks/bridge/micro/WeldBeads.ts`
- Create `src/landmarks/bridge/micro/GussetPlates.ts`

SplicePlates: Rectangular plates at truss chord splice locations (every ~30m). BoxGeometry plates with bolt circle holes (small cylinders). InstancedMesh. mats.deckSteel.

WeldBeads: At modern repair areas on deck. Thin extruded lines using TubeGeometry with jagged CatmullRomCurve3. Scattered at ~10 locations. mats.galvanizedSteel.

GussetPlates: Triangular plates at truss node connections (where diagonals meet chords). ExtrudeGeometry with triangular Shape. InstancedMesh at every panel point, both sides. mats.deckSteel.

## Task 3: E1 — Water Interaction (PierWake + TidalFoam + WetSurface)

**Files:**
- Create `src/world/environment/PierWake.ts`
- Create `src/world/environment/TidalFoam.ts`
- Create `src/world/environment/WetSurface.ts`

PierWake: V-shaped turbulence downstream of each tower pier. PlaneGeometry with animated vertex displacement. ShaderMaterial with scrolling noise. update(dt, elapsed) animates.

TidalFoam: White foam ring at pier base. TorusGeometry with animated opacity and scale. Particle system (Points) with BufferGeometry for foam bubbles.

WetSurface: Wet reflections on pier concrete below splash zone. MeshPhysicalMaterial overlay with high clearcoat, animated based on wave phase.

## Task 4: E2 — Atmospheric Effects (FogTendrils)

**Files:**
- Create `src/world/environment/FogTendrils.ts`

Advection fog flowing through cable harps. BufferGeometry Points with ShaderMaterial. Particles drift horizontally, following wind direction. Opacity fades based on distance from cables. update(dt, elapsed) moves particles.

## Task 5: Register all S3 + E1 + E2 in BridgeAssembler

Add imports and registerPart calls for all 8 new parts.

---

## Summary

| Task | Parts | Files |
|------|-------|-------|
| 1 | S3a | RivetSystem.ts |
| 2 | S3b+S3c+S3d | SplicePlates.ts, WeldBeads.ts, GussetPlates.ts |
| 3 | E1a+E1b+E1c | PierWake.ts, TidalFoam.ts, WetSurface.ts |
| 4 | E2a | FogTendrils.ts |
| 5 | Assembly | BridgeAssembler.ts updated |

**After Plan 3:** All 30 parts complete.
