import * as THREE from 'three';
import type { BridgeMaterials } from '@/world/Materials';
import { BRIDGE, TOWER, CABLE, DECK, LANES, LANE_W, TILE } from '@/config/bridge';
import { createCruciformShape } from '@/world/profiles/CruciformProfile';
import { createIBeamShape } from '@/world/profiles/IBeamProfile';
import { createLAngleShape } from '@/world/profiles/LAngleProfile';

/**
 * BridgeTile — One repeatable bridge segment (~1,623m) containing:
 *   3 towers, cables, suspenders, deck, truss, railing, and lights.
 *
 * All geometry is positioned relative to the tile's Group (local space),
 * so tiles can be placed at any Z offset via setOffset / recycle.
 *
 * Tile layout (local Z):
 *   z=0          — Tower 0 (side span start)
 *   z=343        — Tower 1 (main span start)
 *   z=343..1623  — Main span
 *   z=1623       — Tile boundary (no tower — shared with next tile's z=0)
 */
export class BridgeTile {
  readonly group = new THREE.Group();

  private readonly geometries: THREE.BufferGeometry[] = [];
  private readonly localMaterials: THREE.Material[] = [];
  private readonly materials: BridgeMaterials;

  constructor(materials: BridgeMaterials) {
    this.materials = materials;
  }

  build(): void {
    this.buildTowers();
    this.buildCables();
    this.buildSuspenders();
    this.buildDeck();
    this.buildTruss();
    this.buildRailing();
    this.buildLights();
  }

  setOffset(z: number): void {
    this.group.position.z = z;
  }

  recycle(newOffsetZ: number): void {
    this.group.position.z = newOffsetZ;
  }

  dispose(): void {
    for (const geo of this.geometries) {
      geo.dispose();
    }
    this.geometries.length = 0;

    for (const mat of this.localMaterials) {
      mat.dispose();
    }
    this.localMaterials.length = 0;

    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
      }
    });

    this.group.clear();
  }

  // ─── 1. Towers ────────────────────────────────────────────────

  private buildTowers(): void {
    const mats = this.materials;

    // Build only towers at index 0 and 1 (z=0 and z=343).
    // Tower at z=1623 (TILE.towerZs[2]) is omitted because the
    // adjacent tile's Tower0 (z=0) occupies the same world position.
    const towerPositions = [TILE.towerZs[0], TILE.towerZs[1]];
    for (const towerZ of towerPositions) {
      const sides = [-1, 1] as const;

      for (const side of sides) {
        const colX = side * TOWER.colSpacing / 2;

        // ── Shaft sections (cruciform extrude) ──
        for (const sec of TOWER.sections) {
          const w = TOWER.baseW * sec.scale;
          const d = TOWER.baseD * sec.scale;
          const fw = TOWER.flangeW * sec.scale;
          const fd = TOWER.flangeD * sec.scale;

          const shape = createCruciformShape(w, d, fw, fd);
          const geo = new THREE.ExtrudeGeometry(shape, {
            depth: sec.h,
            bevelEnabled: false,
          });
          geo.rotateX(-Math.PI / 2);
          this.geometries.push(geo);

          const mesh = new THREE.Mesh(geo, mats.towerSteel);
          mesh.position.set(colX, sec.y0, towerZ);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          this.group.add(mesh);
        }

        // ── Cap (3-step pyramid) ──
        const topY = TOWER.sections[TOWER.sections.length - 1].y0
          + TOWER.sections[TOWER.sections.length - 1].h;
        let currentY = topY;
        const capStepH = 0.8;

        for (let s = 0; s < 3; s++) {
          const factor = 1 - s * 0.15;
          const geo = new THREE.BoxGeometry(
            TOWER.baseW * 1.1 * factor,
            capStepH,
            TOWER.baseD * 1.1 * factor,
          );
          this.geometries.push(geo);
          const mesh = new THREE.Mesh(geo, mats.towerSteel);
          mesh.position.set(colX, currentY + capStepH * 0.5, towerZ);
          mesh.castShadow = true;
          this.group.add(mesh);
          currentY += capStepH;
        }

        // ── Cable saddle ──
        const saddleY = currentY;
        const saddleBaseW = TOWER.baseW * 0.9;
        const saddleBaseD = TOWER.baseD * 0.85;
        const saddleBaseH = 1.2;
        const grooveR = 0.55;

        const plateGeo = new THREE.BoxGeometry(saddleBaseW, saddleBaseH, saddleBaseD);
        this.geometries.push(plateGeo);
        const plateMesh = new THREE.Mesh(plateGeo, mats.castIron);
        plateMesh.position.set(colX, saddleY + saddleBaseH * 0.5, towerZ);
        plateMesh.castShadow = true;
        this.group.add(plateMesh);

        const grooveGeo = new THREE.CylinderGeometry(
          grooveR, grooveR, saddleBaseD, 16, 1, false, 0, Math.PI,
        );
        this.geometries.push(grooveGeo);
        const grooveMesh = new THREE.Mesh(grooveGeo, mats.castIron);
        grooveMesh.rotation.z = Math.PI;
        grooveMesh.rotation.x = Math.PI / 2;
        grooveMesh.position.set(colX, saddleY + saddleBaseH + grooveR * 0.5, towerZ);
        grooveMesh.castShadow = true;
        this.group.add(grooveMesh);

        const wallW = 0.3;
        const wallH = grooveR * 2;
        for (const ws of [-1, 1]) {
          const wallGeo = new THREE.BoxGeometry(wallW, wallH, saddleBaseD);
          this.geometries.push(wallGeo);
          const wallMesh = new THREE.Mesh(wallGeo, mats.castIron);
          wallMesh.position.set(
            colX + ws * (saddleBaseW * 0.5 - wallW * 0.5),
            saddleY + saddleBaseH + wallH * 0.5,
            towerZ,
          );
          wallMesh.castShadow = true;
          this.group.add(wallMesh);
        }
      }

      // ── Portals (struts between columns) ──
      const span = TOWER.colSpacing;
      const beamH = TOWER.portalH;
      const beamD = TOWER.baseD * 0.8;
      const archR = span * 0.25;

      for (const portalY of TOWER.portalYs) {
        // Top beam
        const topGeo = new THREE.BoxGeometry(span, beamH, beamD);
        this.geometries.push(topGeo);
        const topMesh = new THREE.Mesh(topGeo, mats.towerSteel);
        topMesh.position.set(0, portalY + beamH * 0.5, towerZ);
        topMesh.castShadow = true;
        this.group.add(topMesh);

        // Bottom beam
        const botGeo = new THREE.BoxGeometry(span, beamH, beamD);
        this.geometries.push(botGeo);
        const botMesh = new THREE.Mesh(botGeo, mats.towerSteel);
        botMesh.position.set(0, portalY - beamH * 0.5, towerZ);
        botMesh.castShadow = true;
        this.group.add(botMesh);

        // Arch crown
        const archGeo = new THREE.CylinderGeometry(
          archR, archR, beamD, 16, 1, false, 0, Math.PI,
        );
        archGeo.rotateZ(Math.PI);
        this.geometries.push(archGeo);
        const archMesh = new THREE.Mesh(archGeo, mats.towerSteel);
        archMesh.position.set(0, portalY + beamH + archR, towerZ);
        archMesh.castShadow = true;
        this.group.add(archMesh);

        // Side walls
        const wallW = (span - archR * 2) * 0.5;
        if (wallW > 0) {
          for (const sign of [-1, 1]) {
            const wGeo = new THREE.BoxGeometry(wallW, archR, beamD);
            this.geometries.push(wGeo);
            const wMesh = new THREE.Mesh(wGeo, mats.towerSteel);
            wMesh.position.set(
              sign * (archR + wallW * 0.5),
              portalY + beamH + archR * 0.5,
              towerZ,
            );
            wMesh.castShadow = true;
            this.group.add(wMesh);
          }
        }
      }

      // ── Cell grid (ribs + X-bracing) ──
      this.buildTowerCells(towerZ);
    }
  }

  private buildTowerCells(towerZ: number): void {
    const mats = this.materials;
    const sides = [-1, 1] as const;
    const faceSigns = [-1, 1] as const;
    const yStart = 72;
    const yEnd = 220;
    const ribW = 0.25;
    const ribD = 0.15;

    const ribYs: number[] = [];
    for (let y = yStart; y <= yEnd; y += TOWER.cellSpacing) {
      ribYs.push(y);
    }

    const ribH = TOWER.cellSpacing * 0.9;
    const ribGeo = new THREE.BoxGeometry(ribW, ribH, ribD);
    this.geometries.push(ribGeo);

    const ribCount = ribYs.length * sides.length * faceSigns.length;
    const ribMesh = new THREE.InstancedMesh(ribGeo, mats.towerSteel, ribCount);
    ribMesh.castShadow = true;
    let ribIdx = 0;
    const dummy = new THREE.Object3D();

    for (const side of sides) {
      for (const faceSign of faceSigns) {
        for (const ry of ribYs) {
          const faceOffset = (TOWER.baseD * 0.5 + 0.01) * faceSign;
          dummy.position.set(
            side * TOWER.colSpacing / 2,
            ry + ribH * 0.5,
            towerZ + faceOffset,
          );
          dummy.rotation.set(0, 0, 0);
          dummy.scale.set(1, 1, 1);
          dummy.updateMatrix();
          ribMesh.setMatrixAt(ribIdx++, dummy.matrix);
        }
      }
    }
    ribMesh.instanceMatrix.needsUpdate = true;
    this.group.add(ribMesh);

    // X-bracing diagonals
    const cellW = TOWER.baseW * 0.8;
    const cellHVal = TOWER.cellH;
    const diagLen = Math.sqrt(cellW * cellW + cellHVal * cellHVal);
    const diagGeo = new THREE.BoxGeometry(diagLen, ribD, ribD);
    this.geometries.push(diagGeo);

    const diagCount = (ribYs.length - 1) * sides.length * faceSigns.length * 2;
    const diagMesh = new THREE.InstancedMesh(diagGeo, mats.towerSteel, diagCount);
    diagMesh.castShadow = true;
    let diagIdx = 0;

    for (const side of sides) {
      for (const faceSign of faceSigns) {
        for (let i = 0; i < ribYs.length - 1; i++) {
          const y0 = ribYs[i];
          const y1 = ribYs[i + 1];
          const midY = (y0 + y1) * 0.5;
          const faceOffset = (TOWER.baseD * 0.5 + 0.02) * faceSign;
          const colX = side * TOWER.colSpacing / 2;
          const angle = Math.atan2(y1 - y0, cellW);

          dummy.position.set(colX, midY, towerZ + faceOffset);
          dummy.rotation.set(0, 0, angle);
          dummy.scale.set(1, 1, 1);
          dummy.updateMatrix();
          diagMesh.setMatrixAt(diagIdx++, dummy.matrix);

          dummy.rotation.set(0, 0, -angle);
          dummy.updateMatrix();
          diagMesh.setMatrixAt(diagIdx++, dummy.matrix);
        }
      }
    }
    diagMesh.instanceMatrix.needsUpdate = true;
    this.group.add(diagMesh);
  }

  // ─── 2. Cables ────────────────────────────────────────────────

  private buildCables(): void {
    const mats = this.materials;
    const sides = [-1, 1] as const;
    const cableX = BRIDGE.deckW / 2 + 2;

    // Tile has two spans:
    //   Span A (side span): z=0 → z=343  (tower0 → tower1)
    //   Span B (main span): z=343 → z=1623  (tower1 → tower2)

    for (const side of sides) {
      const pts: THREE.Vector3[] = [];

      // ── Side span (z=0 to z=343) ──
      // At z=0 cable is at tower top, sags down, back up to z=343
      const sideSpanPts = 40;
      for (let i = 0; i <= sideSpanPts; i++) {
        const t = i / sideSpanPts;
        const z = t * BRIDGE.sideSpan;
        // Use the same math as MainCable's south side span but mapped to local coords
        // At t=0 and t=1 the cable is at towerH; sag in the middle
        const y = THREE.MathUtils.lerp(BRIDGE.towerH, BRIDGE.towerH, t)
          + -30 * Math.sin(Math.PI * t);
        pts.push(new THREE.Vector3(side * cableX, y, z));
      }

      // ── Main span (z=343 to z=1623) ──
      const mainSpanPts = 121;
      for (let i = 1; i <= mainSpanPts; i++) {
        const t = i / mainSpanPts;
        const z = BRIDGE.sideSpan + t * BRIDGE.mainSpan;
        const u = 2 * t - 1;
        const y = BRIDGE.cableSag + (BRIDGE.towerH - BRIDGE.cableSag) * u * u;
        pts.push(new THREE.Vector3(side * cableX, y, z));
      }

      const curve = new THREE.CatmullRomCurve3(pts);
      const geo = new THREE.TubeGeometry(curve, 200, CABLE.mainR, 12, false);
      this.geometries.push(geo);

      const mesh = new THREE.Mesh(geo, mats.cableSteel);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.group.add(mesh);
    }
  }

  // ─── 3. Suspenders ────────────────────────────────────────────

  private buildSuspenders(): void {
    const mats = this.materials;
    const cableX = BRIDGE.deckW / 2 + 2;
    const sides = [-1, 1] as const;

    interface SuspPos { z: number; cableY: number; h: number; }

    const collect = (zList: number[], yFn: (z: number) => number): SuspPos[] => {
      const result: SuspPos[] = [];
      for (const z of zList) {
        const cableY = yFn(z);
        const h = cableY - BRIDGE.deckH - 2;
        if (h >= 2) result.push({ z, cableY, h });
      }
      return result;
    };

    // Side span suspenders: z=0..343 (local)
    const sideZs: number[] = [];
    const sideCount = Math.floor(BRIDGE.sideSpan / BRIDGE.suspSpacing);
    for (let i = 1; i < sideCount; i++) {
      sideZs.push(i * BRIDGE.suspSpacing);
    }

    const sideYFn = (z: number): number => {
      const t = z / BRIDGE.sideSpan;
      return THREE.MathUtils.lerp(BRIDGE.towerH, BRIDGE.towerH, t)
        + -30 * Math.sin(Math.PI * t);
    };

    // Main span suspenders: z=343..1623 (local)
    const mainZs: number[] = [];
    const mainCount = Math.floor(BRIDGE.mainSpan / BRIDGE.suspSpacing);
    for (let i = 1; i < mainCount; i++) {
      mainZs.push(BRIDGE.sideSpan + i * BRIDGE.suspSpacing);
    }

    const mainYFn = (z: number): number => {
      const localZ = z - BRIDGE.sideSpan;
      const t = localZ / BRIDGE.mainSpan;
      const u = 2 * t - 1;
      return BRIDGE.cableSag + (BRIDGE.towerH - BRIDGE.cableSag) * u * u;
    };

    const allPositions: SuspPos[] = [
      ...collect(sideZs, sideYFn),
      ...collect(mainZs, mainYFn),
    ];

    const totalRopes = allPositions.length * sides.length * 2;
    const totalSockets = totalRopes * 2;

    const ropeGeo = new THREE.CylinderGeometry(CABLE.suspR, CABLE.suspR, 1, 6);
    this.geometries.push(ropeGeo);
    const socketR = CABLE.suspR * 2.5;
    const socketGeo = new THREE.SphereGeometry(socketR, 6, 6);
    this.geometries.push(socketGeo);

    const ropeMesh = new THREE.InstancedMesh(ropeGeo, mats.cableSteel, totalRopes);
    ropeMesh.castShadow = true;
    ropeMesh.receiveShadow = true;

    const socketMesh = new THREE.InstancedMesh(socketGeo, mats.cableSteel, totalSockets);
    socketMesh.castShadow = false;

    const dummy = new THREE.Object3D();
    let ropeIdx = 0;
    let socketIdx = 0;
    const offsets = [-CABLE.suspPairGap / 2, CABLE.suspPairGap / 2] as const;

    for (const side of sides) {
      const baseX = side * cableX;

      for (const pos of allPositions) {
        const midY = BRIDGE.deckH + 2 + pos.h / 2;

        for (const xOff of offsets) {
          const rx = baseX + xOff;

          // Rope
          dummy.position.set(rx, midY, pos.z);
          dummy.rotation.set(0, 0, 0);
          dummy.scale.set(1, pos.h, 1);
          dummy.updateMatrix();
          ropeMesh.setMatrixAt(ropeIdx++, dummy.matrix);

          // Top socket
          dummy.scale.set(1, 1, 1);
          dummy.position.set(rx, pos.cableY - 2, pos.z);
          dummy.updateMatrix();
          socketMesh.setMatrixAt(socketIdx++, dummy.matrix);

          // Bottom socket
          dummy.position.set(rx, BRIDGE.deckH + 2, pos.z);
          dummy.updateMatrix();
          socketMesh.setMatrixAt(socketIdx++, dummy.matrix);
        }
      }
    }

    ropeMesh.instanceMatrix.needsUpdate = true;
    socketMesh.instanceMatrix.needsUpdate = true;

    this.group.add(ropeMesh);
    this.group.add(socketMesh);
  }

  // ─── 4. Deck ──────────────────────────────────────────────────

  private buildDeck(): void {
    const mats = this.materials;
    const tileLen = TILE.length;
    const roadW = BRIDGE.deckW - 2;

    // Road surface
    const roadGeo = new THREE.PlaneGeometry(roadW, tileLen, 1, 1);
    roadGeo.rotateX(-Math.PI / 2);
    this.geometries.push(roadGeo);

    const roadMesh = new THREE.Mesh(roadGeo, mats.asphalt);
    roadMesh.position.set(0, BRIDGE.deckH + 0.02, tileLen / 2);
    roadMesh.receiveShadow = true;
    this.group.add(roadMesh);

    // Sidewalks
    const sidewalkW = 1.8;
    for (const side of [-1, 1]) {
      const swGeo = new THREE.PlaneGeometry(sidewalkW, tileLen, 1, 1);
      swGeo.rotateX(-Math.PI / 2);
      this.geometries.push(swGeo);

      const swMat = new THREE.MeshStandardMaterial({
        color: 0x3a3a3a,
        roughness: 0.8,
        metalness: 0,
      });
      this.localMaterials.push(swMat);
      const sw = new THREE.Mesh(swGeo, swMat);
      sw.position.set(
        side * (roadW / 2 + sidewalkW / 2),
        BRIDGE.deckH + 0.08,
        tileLen / 2,
      );
      sw.receiveShadow = true;
      this.group.add(sw);
    }

    // Lane markings
    this.buildLaneMarkings(tileLen);
  }

  private buildLaneMarkings(tileLen: number): void {
    const mats = this.materials;
    const markH = BRIDGE.deckH + 0.04;
    const markMat = new THREE.MeshStandardMaterial({
      color: 0xe8e8e8,
      roughness: 0.55,
      metalness: 0.02,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    });
    this.localMaterials.push(markMat);

    const yellowMat = new THREE.MeshStandardMaterial({
      color: 0xdda800,
      roughness: 0.55,
      metalness: 0.02,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    });
    this.localMaterials.push(yellowMat);

    // Center double yellow (solid)
    for (const off of [-0.12, 0.12]) {
      const geo = new THREE.PlaneGeometry(0.08, tileLen, 1, 1);
      geo.rotateX(-Math.PI / 2);
      this.geometries.push(geo);
      const mesh = new THREE.Mesh(geo, yellowMat);
      mesh.position.set(off, markH, tileLen / 2);
      mesh.receiveShadow = true;
      this.group.add(mesh);
    }

    // Edge lines (solid white)
    const edgeOffset = (LANES.length / 2) * LANE_W + 0.3;
    for (const ex of [-edgeOffset, edgeOffset]) {
      const geo = new THREE.PlaneGeometry(0.12, tileLen, 1, 1);
      geo.rotateX(-Math.PI / 2);
      this.geometries.push(geo);
      const mesh = new THREE.Mesh(geo, markMat);
      mesh.position.set(ex, markH, tileLen / 2);
      mesh.receiveShadow = true;
      this.group.add(mesh);
    }

    // Dashed lane dividers
    const dashLen = 3.0;
    const gapLen = 9.0;
    const segLen = dashLen + gapLen;
    const dashCount = Math.ceil(tileLen / segLen);

    const dashGeo = new THREE.PlaneGeometry(0.1, dashLen, 1, 1);
    dashGeo.rotateX(-Math.PI / 2);
    this.geometries.push(dashGeo);

    const dividerPositions = [
      (LANES[0] + LANES[1]) / 2,
      (LANES[1] + LANES[2]) / 2,
      (LANES[3] + LANES[4]) / 2,
      (LANES[4] + LANES[5]) / 2,
    ];

    for (const lx of dividerPositions) {
      const instanced = new THREE.InstancedMesh(dashGeo, markMat, dashCount);
      instanced.receiveShadow = true;

      const dummy = new THREE.Object3D();
      for (let n = 0; n < dashCount; n++) {
        const z = n * segLen + dashLen / 2;
        if (z > tileLen) break;
        dummy.position.set(lx, markH, z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        instanced.setMatrixAt(n, dummy.matrix);
      }
      instanced.instanceMatrix.needsUpdate = true;
      this.group.add(instanced);
    }
  }

  // ─── 5. Truss ─────────────────────────────────────────────────

  private buildTruss(): void {
    const mats = this.materials;
    const { deckH, deckW } = BRIDGE;
    const { trussH, panelLen, trussThick } = DECK;
    const tileLen = TILE.length;

    const sideXs = [-deckW / 2, deckW / 2];

    // Chord IBeam shape
    const chordShape = createIBeamShape(0.4, 0.5, 0.08, 0.1);
    const chordExtrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: tileLen,
      bevelEnabled: false,
    };

    // Diagonal LAngle
    const diagShape = createLAngleShape(0.2, 0.2, 0.025);
    const panelCount = Math.floor(tileLen / panelLen);
    const diagLen = Math.sqrt(panelLen * panelLen + trussH * trussH);
    const diagExtrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: diagLen,
      bevelEnabled: false,
    };
    const diagGeo = new THREE.ExtrudeGeometry(diagShape, diagExtrudeSettings);
    this.geometries.push(diagGeo);

    // Vertical box
    const vertGeo = new THREE.BoxGeometry(trussThick, trussH, trussThick);
    this.geometries.push(vertGeo);

    const angleAsc = Math.atan2(trussH, panelLen);
    const angleDesc = -angleAsc;
    const dummy = new THREE.Object3D();

    for (const sideX of sideXs) {
      // Top chord
      const topChordGeo = new THREE.ExtrudeGeometry(chordShape, chordExtrudeSettings);
      this.geometries.push(topChordGeo);
      const topChordMesh = new THREE.Mesh(topChordGeo, mats.deckSteel);
      topChordMesh.position.set(sideX, deckH, 0);
      topChordMesh.castShadow = true;
      topChordMesh.receiveShadow = true;
      this.group.add(topChordMesh);

      // Bottom chord
      const botChordGeo = new THREE.ExtrudeGeometry(chordShape, chordExtrudeSettings);
      this.geometries.push(botChordGeo);
      const botChordMesh = new THREE.Mesh(botChordGeo, mats.deckSteel);
      botChordMesh.position.set(sideX, deckH - trussH, 0);
      botChordMesh.castShadow = true;
      botChordMesh.receiveShadow = true;
      this.group.add(botChordMesh);

      // Diagonals (instanced) — Warren pattern: one diagonal per panel, alternating direction
      const diagCount = panelCount;
      const diagMesh = new THREE.InstancedMesh(diagGeo, mats.deckSteel, diagCount);
      diagMesh.castShadow = true;
      diagMesh.receiveShadow = true;

      let instanceIdx = 0;
      for (let i = 0; i < panelCount; i++) {
        const zPanel = i * panelLen;
        const isAscending = i % 2 === 0;
        dummy.position.set(sideX, isAscending ? deckH - trussH : deckH, zPanel);
        dummy.rotation.set(isAscending ? angleAsc : angleDesc, 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        diagMesh.setMatrixAt(instanceIdx++, dummy.matrix);
      }
      diagMesh.instanceMatrix.needsUpdate = true;
      this.group.add(diagMesh);

      // Verticals (instanced)
      const vertMesh = new THREE.InstancedMesh(vertGeo, mats.deckSteel, panelCount + 1);
      vertMesh.castShadow = true;
      vertMesh.receiveShadow = true;

      for (let i = 0; i <= panelCount; i++) {
        const zPanel = i * panelLen;
        dummy.position.set(sideX, deckH - trussH / 2, zPanel);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        vertMesh.setMatrixAt(i, dummy.matrix);
      }
      vertMesh.instanceMatrix.needsUpdate = true;
      this.group.add(vertMesh);
    }
  }

  // ─── 6. Railing ───────────────────────────────────────────────

  private buildRailing(): void {
    const mats = this.materials;
    const { deckH, deckW } = BRIDGE;
    const { railH, railPicketSpacing } = DECK;
    const tileLen = TILE.length;

    const sidewalkW = 2.0;
    const sidewalkThick = 0.15;
    const sidewalkXs = [-(deckW / 2 - sidewalkW / 2), (deckW / 2 - sidewalkW / 2)];

    // Sidewalk slabs
    const slabGeo = new THREE.BoxGeometry(sidewalkW, sidewalkThick, tileLen);
    this.geometries.push(slabGeo);

    const picketGeo = new THREE.BoxGeometry(0.025, railH, 0.025);
    this.geometries.push(picketGeo);

    const topRailGeo = new THREE.BoxGeometry(0.08, 0.06, tileLen);
    this.geometries.push(topRailGeo);

    const picketCount = Math.floor(tileLen / railPicketSpacing);
    const dummy = new THREE.Object3D();

    for (const sx of sidewalkXs) {
      // Slab
      const slabMesh = new THREE.Mesh(slabGeo, mats.pierConcrete);
      slabMesh.position.set(sx, deckH + sidewalkThick / 2, tileLen / 2);
      slabMesh.receiveShadow = true;
      slabMesh.castShadow = false;
      this.group.add(slabMesh);

      // Inner and outer rail lines
      const sign = sx > 0 ? 1 : -1;
      const innerRailX = sx - sign * (sidewalkW / 2 - 0.1);
      const outerRailX = sx + sign * (sidewalkW / 2 - 0.1);
      const railXs = [innerRailX, outerRailX];

      for (const rx of railXs) {
        // Pickets (instanced)
        const picketMesh = new THREE.InstancedMesh(picketGeo, mats.deckSteel, picketCount);
        picketMesh.castShadow = true;
        picketMesh.receiveShadow = false;

        for (let i = 0; i < picketCount; i++) {
          const z = i * railPicketSpacing + railPicketSpacing / 2;
          dummy.position.set(rx, deckH + sidewalkThick + railH / 2, z);
          dummy.rotation.set(0, 0, 0);
          dummy.scale.set(1, 1, 1);
          dummy.updateMatrix();
          picketMesh.setMatrixAt(i, dummy.matrix);
        }
        picketMesh.instanceMatrix.needsUpdate = true;
        this.group.add(picketMesh);

        // Top rail (continuous)
        const topRailMesh = new THREE.Mesh(topRailGeo, mats.deckSteel);
        topRailMesh.position.set(rx, deckH + sidewalkThick + railH + 0.03, tileLen / 2);
        topRailMesh.castShadow = false;
        topRailMesh.receiveShadow = false;
        this.group.add(topRailMesh);
      }
    }
  }

  // ─── 7. Lights ────────────────────────────────────────────────

  private buildLights(): void {
    const mats = this.materials;
    const { deckH, deckW } = BRIDGE;
    const { lightSpacing } = DECK;
    const tileLen = TILE.length;

    const poleCount = Math.floor(tileLen / lightSpacing);
    const sidewalkXs = [-(deckW / 2 - 0.5), (deckW / 2 - 0.5)];

    const shaftGeo = new THREE.CylinderGeometry(0.06, 0.10, 3.5, 8);
    this.geometries.push(shaftGeo);
    const armGeo = new THREE.BoxGeometry(1.2, 0.06, 0.06);
    this.geometries.push(armGeo);
    const lanternGeo = new THREE.BoxGeometry(0.3, 0.4, 0.3);
    this.geometries.push(lanternGeo);

    const shaftBaseY = deckH + 3.5 / 2;
    const armY = deckH + 3.5 - 0.15;
    const lanternY = deckH + 3.5 - 0.05 + 0.2;

    const dummy = new THREE.Object3D();

    for (const sx of sidewalkXs) {
      const sign = sx > 0 ? 1 : -1;

      const shaftMesh = new THREE.InstancedMesh(shaftGeo, mats.deckSteel, poleCount);
      shaftMesh.castShadow = true;
      shaftMesh.receiveShadow = false;

      const armMesh = new THREE.InstancedMesh(armGeo, mats.deckSteel, poleCount);
      armMesh.castShadow = true;
      armMesh.receiveShadow = false;

      const lanternMesh = new THREE.InstancedMesh(lanternGeo, mats.glass, poleCount);
      lanternMesh.castShadow = false;
      lanternMesh.receiveShadow = false;

      for (let i = 0; i < poleCount; i++) {
        const z = i * lightSpacing + lightSpacing / 2;

        dummy.position.set(sx, shaftBaseY, z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        shaftMesh.setMatrixAt(i, dummy.matrix);

        dummy.position.set(sx - sign * 0.6, armY, z);
        dummy.updateMatrix();
        armMesh.setMatrixAt(i, dummy.matrix);

        dummy.position.set(sx - sign * 1.2, lanternY, z);
        dummy.updateMatrix();
        lanternMesh.setMatrixAt(i, dummy.matrix);
      }

      shaftMesh.instanceMatrix.needsUpdate = true;
      armMesh.instanceMatrix.needsUpdate = true;
      lanternMesh.instanceMatrix.needsUpdate = true;

      this.group.add(shaftMesh);
      this.group.add(armMesh);
      this.group.add(lanternMesh);
    }
  }
}
