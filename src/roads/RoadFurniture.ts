// src/roads/RoadFurniture.ts

import * as THREE from 'three';
import { ROAD, ROAD_COLORS, FURNITURE } from './config';

export class RoadFurniture {
  private group!: THREE.Group;

  // Reusable matrix — no per-frame allocations
  private _mat = new THREE.Matrix4();

  build(scene: THREE.Scene): void {
    this.group = new THREE.Group();
    this.group.name = 'RoadFurniture';

    this.buildStreetTrees();
    this.buildStreetLights();
    this.buildTramRails();
    this.buildBenches();
    this.buildBollards();

    scene.add(this.group);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  update(_dt: number): void {
    // Static furniture — no per-frame updates needed
  }

  // ─── 1. Street Trees ────────────────────────────────────────────────────────

  private buildStreetTrees(): void {
    const R = ROAD.circularRadius;           // 1500
    const lw = ROAD.laneWidth;               // 3.5
    const blw = ROAD.bikeLaneWidth;          // 2
    const sww = ROAD.sidewalkWidth;          // 2

    // Circular road tree radii (both sides of sidewalks)
    const outerTreeR = R + lw * 2 + blw + sww - 0.5;   // 1510.5
    const innerTreeR = R - lw * 2 - blw - sww + 0.5;   // 1489.5

    const treeSpacing = FURNITURE.treeSpacingCircular;  // 15
    const circTreeCount = Math.floor(2 * Math.PI * R / treeSpacing);

    // Radial road trees
    const radialTreesPerSide = Math.floor(1000 / FURNITURE.treeSpacingRadial); // 50
    const radialTreeOffset = ROAD.radialWidth / 2 - 0.5;                       // 6.5

    // Instance counts per group
    const circularTotal = circTreeCount * 2;
    const radialTotal = radialTreesPerSide * 2 * ROAD.radialCount;

    // Shared trunk geometry & material
    const trunkGeo = new THREE.CylinderGeometry(
      FURNITURE.treeTrunkR,             // 0.2
      FURNITURE.treeTrunkR * 1.3,       // 0.26
      FURNITURE.treeTrunkH,             // 4
      6,
    );
    const trunkMat = new THREE.MeshStandardMaterial({ color: ROAD_COLORS.treeTrunk });
    const canopyMat = new THREE.MeshStandardMaterial({ color: ROAD_COLORS.treeCanopy });

    // Circular trees: canopy r=4
    const circTrunkMesh = new THREE.InstancedMesh(trunkGeo, trunkMat, circularTotal);
    circTrunkMesh.castShadow = true;
    const circCanopyGeo = new THREE.IcosahedronGeometry(FURNITURE.treeCanopyR, 1); // r=4
    const circCanopyMesh = new THREE.InstancedMesh(circCanopyGeo, canopyMat, circularTotal);
    circCanopyMesh.castShadow = true;

    // Radial trees: canopy r=3
    const radialTrunkMesh = new THREE.InstancedMesh(trunkGeo, trunkMat, radialTotal);
    radialTrunkMesh.castShadow = true;
    const radialCanopyGeo = new THREE.IcosahedronGeometry(FURNITURE.smallTreeCanopyR, 1); // r=3
    const radialCanopyMesh = new THREE.InstancedMesh(radialCanopyGeo, canopyMat, radialTotal);
    radialCanopyMesh.castShadow = true;

    const trunkHalfH = FURNITURE.treeTrunkH / 2;                               // 2
    const canopyY = FURNITURE.treeTrunkH + FURNITURE.treeCanopyR;               // 8
    const smallCanopyY = FURNITURE.treeTrunkH + FURNITURE.smallTreeCanopyR;     // 7

    // Reuse single quaternion & scale objects
    const _q = new THREE.Quaternion();
    const _s = new THREE.Vector3(1, 1, 1);
    const _p = new THREE.Vector3();

    let circIdx = 0;
    let radialIdx = 0;

    // ── Circular road trees ──────────────────────────────────────────────────
    for (let i = 0; i < circTreeCount; i++) {
      const angle = (i / circTreeCount) * 2 * Math.PI;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);

      for (const treeR of [outerTreeR, innerTreeR]) {
        const x = cos * treeR;
        const z = sin * treeR;

        _p.set(x, trunkHalfH, z);
        this._mat.compose(_p, _q, _s);
        circTrunkMesh.setMatrixAt(circIdx, this._mat);

        _p.set(x, canopyY, z);
        this._mat.compose(_p, _q, _s);
        circCanopyMesh.setMatrixAt(circIdx, this._mat);

        circIdx++;
      }
    }

    // ── Radial road trees ────────────────────────────────────────────────────
    for (let road = 0; road < ROAD.radialCount; road++) {
      const roadAngle = (road * 2 * Math.PI) / ROAD.radialCount;
      const fwdX = Math.cos(roadAngle);
      const fwdZ = Math.sin(roadAngle);
      // Perpendicular (rotated 90°)
      const perpX = -Math.sin(roadAngle);
      const perpZ = Math.cos(roadAngle);

      for (let j = 0; j < radialTreesPerSide; j++) {
        // Distribute trees from radialInnerR=500 to radialOuterR=1500
        const t = j / (radialTreesPerSide - 1);
        const r = ROAD.radialInnerR + t * (ROAD.radialOuterR - ROAD.radialInnerR);

        for (const side of [-1, 1]) {
          const x = fwdX * r + perpX * side * radialTreeOffset;
          const z = fwdZ * r + perpZ * side * radialTreeOffset;

          _p.set(x, trunkHalfH, z);
          this._mat.compose(_p, _q, _s);
          radialTrunkMesh.setMatrixAt(radialIdx, this._mat);

          _p.set(x, smallCanopyY, z);
          this._mat.compose(_p, _q, _s);
          radialCanopyMesh.setMatrixAt(radialIdx, this._mat);

          radialIdx++;
        }
      }
    }

    circTrunkMesh.instanceMatrix.needsUpdate = true;
    circCanopyMesh.instanceMatrix.needsUpdate = true;
    radialTrunkMesh.instanceMatrix.needsUpdate = true;
    radialCanopyMesh.instanceMatrix.needsUpdate = true;

    this.group.add(circTrunkMesh);
    this.group.add(circCanopyMesh);
    this.group.add(radialTrunkMesh);
    this.group.add(radialCanopyMesh);
  }

  // ─── 2. Street Lights ───────────────────────────────────────────────────────

  private buildStreetLights(): void {
    const R = ROAD.circularRadius;       // 1500
    const lw = ROAD.laneWidth;           // 3.5
    const blw = ROAD.bikeLaneWidth;      // 2

    // Light placement radii (both sides of circular road)
    const outerLightR = R + lw * 2 + blw + 1;   // 1510
    const innerLightR = R - lw * 2 - blw - 1;   // 1490

    const lightSpacing = FURNITURE.lightSpacingCircular;  // 25
    const lightCount = Math.floor(2 * Math.PI * R / lightSpacing);
    const totalLights = lightCount * 2; // outer + inner

    // Pole geometry & material
    const poleGeo = new THREE.CylinderGeometry(
      FURNITURE.lightPoleR,             // 0.08
      FURNITURE.lightPoleR * 1.5,       // 0.12
      FURNITURE.lightHeight,            // 6
      6,
    );
    const poleMat = new THREE.MeshStandardMaterial({
      color: 0x444444,
      roughness: 0.4,
      metalness: 0.7,
    });
    const poleMesh = new THREE.InstancedMesh(poleGeo, poleMat, totalLights);

    // Globe geometry & material (emissive)
    const globeGeo = new THREE.SphereGeometry(FURNITURE.lightGlobeR, 8, 8); // r=0.3
    const globeMat = new THREE.MeshStandardMaterial({
      color: 0xffffcc,
      emissive: 0xffffaa,
      emissiveIntensity: 2.0,
      roughness: 0.2,
    });
    const globeMesh = new THREE.InstancedMesh(globeGeo, globeMat, totalLights);

    const poleHalfH = FURNITURE.lightHeight / 2;          // 3
    const globeY = FURNITURE.lightHeight + FURNITURE.lightGlobeR;  // 6.3

    const _q = new THREE.Quaternion();
    const _s = new THREE.Vector3(1, 1, 1);
    const _p = new THREE.Vector3();

    let idx = 0;

    for (let i = 0; i < lightCount; i++) {
      const angle = (i / lightCount) * 2 * Math.PI;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);

      for (const lightR of [outerLightR, innerLightR]) {
        const x = cos * lightR;
        const z = sin * lightR;

        // Pole — centered at half-height
        _p.set(x, poleHalfH, z);
        this._mat.compose(_p, _q, _s);
        poleMesh.setMatrixAt(idx, this._mat);

        // Globe — at top of pole
        _p.set(x, globeY, z);
        this._mat.compose(_p, _q, _s);
        globeMesh.setMatrixAt(idx, this._mat);

        idx++;
      }
    }

    poleMesh.instanceMatrix.needsUpdate = true;
    globeMesh.instanceMatrix.needsUpdate = true;

    this.group.add(poleMesh);
    this.group.add(globeMesh);
  }

  // ─── 3. Tram Rails ──────────────────────────────────────────────────────────

  private buildTramRails(): void {
    const R = ROAD.circularRadius;       // 1500
    const lw = ROAD.laneWidth;           // 3.5

    // Outer lane center radius
    const outerLaneCenter = R + lw * 1.5;  // 1505.25

    const halfGauge = FURNITURE.tramGauge / 2;   // 0.7175
    const halfRailW = FURNITURE.tramRailWidth / 2; // 0.025
    const railY = FURNITURE.tramRailElevation;     // 0.02

    const railMat = new THREE.MeshStandardMaterial({
      color: ROAD_COLORS.tramRail,  // 0xaaaaaa
      roughness: 0.3,
      metalness: 0.85,
    });

    for (const offset of [-halfGauge, halfGauge]) {
      const r = outerLaneCenter + offset;
      const railGeo = new THREE.RingGeometry(r - halfRailW, r + halfRailW, 128);
      railGeo.rotateX(-Math.PI / 2);
      const railMesh = new THREE.Mesh(railGeo, railMat);
      railMesh.position.y = railY;
      railMesh.receiveShadow = true;
      this.group.add(railMesh);
    }
  }

  // ─── 4. Benches ─────────────────────────────────────────────────────────────

  private buildBenches(): void {
    const coastalR = ROAD.coastalRadius;           // 1600
    const coastalHalfW = ROAD.coastalWidth / 2;   // 3

    // Coastal path bench radius: inner edge of boardwalk
    const benchR = coastalR - coastalHalfW + 1;   // 1598

    const benchSpacing = FURNITURE.benchSpacing;  // 50
    const coastalBenchCount = Math.floor(2 * Math.PI * coastalR / benchSpacing);

    // Viewpoint deck benches
    const benchesPerViewpoint = FURNITURE.benchesPerViewpoint; // 4
    const viewpointBenchCount = ROAD.viewpointCount * benchesPerViewpoint;

    const totalBenches = coastalBenchCount + viewpointBenchCount;

    const benchGeo = new THREE.BoxGeometry(
      FURNITURE.benchW,   // 1.5
      FURNITURE.benchH,   // 0.45
      FURNITURE.benchD,   // 0.5
    );
    const benchMat = new THREE.MeshStandardMaterial({
      color: ROAD_COLORS.bench,  // 0x8b6914
      roughness: 0.8,
    });
    const benchMesh = new THREE.InstancedMesh(benchGeo, benchMat, totalBenches);

    const _q = new THREE.Quaternion();
    const _s = new THREE.Vector3(1, 1, 1);
    const _p = new THREE.Vector3();
    const _axisY = new THREE.Vector3(0, 1, 0);

    const benchHalfH = FURNITURE.benchH / 2;  // 0.225

    let idx = 0;

    // ── Coastal path benches ─────────────────────────────────────────────────
    for (let i = 0; i < coastalBenchCount; i++) {
      const angle = (i / coastalBenchCount) * 2 * Math.PI;

      _p.set(
        Math.cos(angle) * benchR,
        benchHalfH,
        Math.sin(angle) * benchR,
      );
      // Face outward: rotate by -angle around Y
      _q.setFromAxisAngle(_axisY, -angle);
      this._mat.compose(_p, _q, _s);
      benchMesh.setMatrixAt(idx, this._mat);
      idx++;
    }

    // ── Viewpoint deck benches ───────────────────────────────────────────────
    // Deck center radius = coastalRadius + halfW + viewpointD/2
    const deckR = coastalR + coastalHalfW + ROAD.viewpointD / 2;  // 1607

    for (let v = 0; v < ROAD.viewpointCount; v++) {
      const deckAngle = (v * 2 * Math.PI) / ROAD.viewpointCount;

      // Unit vectors for the deck coordinate frame
      const fwdX = Math.cos(deckAngle);
      const fwdZ = Math.sin(deckAngle);
      const perpX = -Math.sin(deckAngle);
      const perpZ = Math.cos(deckAngle);

      // Deck center world position
      const deckCX = fwdX * deckR;
      const deckCZ = fwdZ * deckR;

      // 2x2 grid: left/right ±2m perpendicular, front/back ±1.5m along radial
      const positions: [number, number][] = [
        [-2, -1.5],
        [-2,  1.5],
        [ 2, -1.5],
        [ 2,  1.5],
      ];

      for (const [perpOff, fwdOff] of positions) {
        const x = deckCX + perpX * perpOff + fwdX * fwdOff;
        const z = deckCZ + perpZ * perpOff + fwdZ * fwdOff;

        _p.set(x, benchHalfH, z);
        // Benches on deck face outward (same orientation as deck)
        _q.setFromAxisAngle(_axisY, -deckAngle);
        this._mat.compose(_p, _q, _s);
        benchMesh.setMatrixAt(idx, this._mat);
        idx++;
      }
    }

    benchMesh.instanceMatrix.needsUpdate = true;
    this.group.add(benchMesh);
  }

  // ─── 5. Bollards ────────────────────────────────────────────────────────────

  private buildBollards(): void {
    const innerR = ROAD.radialInnerR;     // 500
    const bollardsPerEntry = 5;
    const bollardSpacing = 1.5;           // 1.5m apart across road width
    const totalBollards = ROAD.radialCount * bollardsPerEntry;

    const bollardGeo = new THREE.CylinderGeometry(
      FURNITURE.bollardR,    // 0.075
      FURNITURE.bollardR,    // 0.075
      FURNITURE.bollardHeight, // 1
      8,
    );
    const bollardMat = new THREE.MeshStandardMaterial({
      color: ROAD_COLORS.bollard,  // 0xcccccc
      roughness: 0.3,
      metalness: 0.8,
    });
    const bollardMesh = new THREE.InstancedMesh(bollardGeo, bollardMat, totalBollards);

    const _q = new THREE.Quaternion();
    const _s = new THREE.Vector3(1, 1, 1);
    const _p = new THREE.Vector3();
    const bollardHalfH = FURNITURE.bollardHeight / 2;  // 0.5

    let idx = 0;

    for (let road = 0; road < ROAD.radialCount; road++) {
      const roadAngle = (road * 2 * Math.PI) / ROAD.radialCount;

      // Entry point center at R=500 along radial direction
      const entryCX = Math.cos(roadAngle) * innerR;
      const entryCZ = Math.sin(roadAngle) * innerR;

      // Perpendicular direction (rotated 90°)
      const perpX = -Math.sin(roadAngle);
      const perpZ = Math.cos(roadAngle);

      // 5 bollards centred across road, spaced 1.5m apart
      // Offsets: -3, -1.5, 0, 1.5, 3
      const halfSpan = (bollardsPerEntry - 1) / 2 * bollardSpacing; // 3

      for (let b = 0; b < bollardsPerEntry; b++) {
        const offset = -halfSpan + b * bollardSpacing;
        const x = entryCX + perpX * offset;
        const z = entryCZ + perpZ * offset;

        _p.set(x, bollardHalfH, z);
        this._mat.compose(_p, _q, _s);
        bollardMesh.setMatrixAt(idx, this._mat);
        idx++;
      }
    }

    bollardMesh.instanceMatrix.needsUpdate = true;
    this.group.add(bollardMesh);
  }
}
