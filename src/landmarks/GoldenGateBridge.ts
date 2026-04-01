import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { BaseLandmark } from './BaseLandmark';
import { BRIDGE } from '@/config/bridge';
import type { BridgeMaterials } from '@/world/Materials';

export class GoldenGateBridge extends BaseLandmark {
  private mats: BridgeMaterials;

  constructor(mats: BridgeMaterials) {
    super('golden-gate');
    this.mats = mats;
  }

  build() {
    this.group.add(this.createTower(0));
    this.group.add(this.createTower(BRIDGE.mainSpan));
    this.group.add(this.createDeck());
    this.group.add(this.createMainCables());
    this.group.add(this.createSuspenders());
    this.buildAnchorages();
    this.buildFortPointArch();
    this.buildApproachRoads();
    this.buildFoamRings();
  }

  private createTower(z: number): THREE.Group {
    const g = new THREE.Group();
    const B = BRIDGE;
    const colSpacing = B.deckW / 2 + 2;
    const sects = [
      { y0: -15, h: 82, wf: 1.25, df: 1.25 },
      { y0: 67, h: 45, wf: 1.0, df: 1.0 },
      { y0: 112, h: 45, wf: 0.88, df: 0.88 },
      { y0: 157, h: 40, wf: 0.78, df: 0.78 },
      { y0: 197, h: 30, wf: 0.7, df: 0.7 },
    ];
    const baseW = 8, baseD = 5.5;

    for (const side of [-1, 1]) {
      for (const s of sects) {
        const w = baseW * s.wf, d = baseD * s.df;
        const geo = new THREE.BoxGeometry(w, s.h, d);
        const m = new THREE.Mesh(geo, this.mats.bridge);
        m.position.set(side * colSpacing, s.y0 + s.h / 2, z);
        m.castShadow = true;
        m.receiveShadow = true;
        g.add(m);
      }
    }

    const braceYs = [67, 112, 157, 197, 225];
    for (const by of braceYs) {
      const bw = colSpacing * 2 - baseW * 0.6;
      const bGeo = new THREE.BoxGeometry(bw, 3.5, baseD * 0.6);
      const bm = new THREE.Mesh(bGeo, this.mats.bridge);
      bm.position.set(0, by, z);
      bm.castShadow = true;
      g.add(bm);
    }

    for (const side of [-1, 1]) {
      for (let cy = 72; cy < 220; cy += 22) {
        const cellH = 16;
        for (const dz of [-1, 1]) {
          const ribGeo = new THREE.BoxGeometry(0.6, cellH, 0.4);
          const rib = new THREE.Mesh(ribGeo, this.mats.bridge);
          rib.position.set(side * colSpacing, cy + cellH / 2, z + dz * (baseD * 0.5 * 0.85 - 0.2));
          g.add(rib);
        }
      }
    }

    // Pier base
    const pierGeo = new THREE.BoxGeometry(colSpacing * 2 + baseW * 1.3, 25, baseD * 2.5);
    const pier = new THREE.Mesh(pierGeo, this.mats.concrete);
    pier.position.set(0, -12, z);
    pier.receiveShadow = true;
    g.add(pier);

    // Caps
    const capGeo = new THREE.BoxGeometry(baseW * 0.75, 4, baseD * 0.75);
    for (const side of [-1, 1]) {
      const cap = new THREE.Mesh(capGeo, this.mats.bridge);
      cap.position.set(side * colSpacing, B.towerH + 2, z);
      g.add(cap);
    }

    // Cable saddles
    const saddleGeo = new THREE.BoxGeometry(3.5, 3, 5);
    for (const side of [-1, 1]) {
      const saddle = new THREE.Mesh(saddleGeo, this.mats.bridge);
      saddle.position.set(side * colSpacing, B.towerH + 5.5, z);
      g.add(saddle);
    }

    // Aviation lights
    const avGeo = new THREE.SphereGeometry(0.4, 8, 6);
    const avMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 4 });
    for (const side of [-1, 1]) {
      const avl = new THREE.Mesh(avGeo, avMat);
      avl.position.set(side * colSpacing, B.towerH + 7.5, z);
      g.add(avl);
    }

    return g;
  }

  private createDeck(): THREE.Group {
    const g = new THREE.Group();
    const B = BRIDGE;
    const len = B.mainSpan + B.sideSpan * 2;
    const startZ = -B.sideSpan;

    // Road surface
    const deckGeo = new THREE.BoxGeometry(B.deckW, 2.5, len);
    const deck = new THREE.Mesh(deckGeo, this.mats.road);
    deck.position.set(0, B.deckH - 1.25, startZ + len / 2);
    deck.receiveShadow = true;
    g.add(deck);

    // Lane markings
    const markCanvas = document.createElement('canvas');
    markCanvas.width = 512;
    markCanvas.height = 8192;
    const ctx = markCanvas.getContext('2d')!;
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(0, 0, 512, 8192);
    ctx.fillStyle = '#ccaa22';
    ctx.fillRect(253, 0, 3, 8192);
    ctx.fillRect(258, 0, 3, 8192);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    for (const lx of [170, 213, 298, 341]) {
      for (let y = 0; y < 8192; y += 80) ctx.fillRect(lx, y, 2, 40);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillRect(125, 0, 2, 8192);
    ctx.fillRect(385, 0, 2, 8192);

    const roadTex = new THREE.CanvasTexture(markCanvas);
    roadTex.wrapS = roadTex.wrapT = THREE.RepeatWrapping;
    roadTex.repeat.set(1, len / 50);
    const markGeo = new THREE.PlaneGeometry(B.deckW - 4, len);
    const markMat = new THREE.MeshStandardMaterial({ map: roadTex, transparent: true, roughness: 0.85, metalness: 0, depthWrite: false });
    const marks = new THREE.Mesh(markGeo, markMat);
    marks.rotation.x = -Math.PI / 2;
    marks.position.set(0, B.deckH + 0.02, startZ + len / 2);
    g.add(marks);

    // Side trusses
    const trussH = 7.6, trussThick = 0.3;
    for (const side of [-1, 1]) {
      const tcGeo = new THREE.BoxGeometry(trussThick, trussThick * 2, len);
      const tc = new THREE.Mesh(tcGeo, this.mats.bridge);
      tc.position.set(side * (B.deckW / 2), B.deckH + trussH, startZ + len / 2);
      g.add(tc);
      const bc = new THREE.Mesh(tcGeo, this.mats.bridge);
      bc.position.set(side * (B.deckW / 2), B.deckH - 1, startZ + len / 2);
      g.add(bc);
      for (let pz = startZ; pz <= startZ + len; pz += 7.6) {
        const vpGeo = new THREE.BoxGeometry(trussThick, trussH + 1, trussThick);
        const vp = new THREE.Mesh(vpGeo, this.mats.bridge);
        vp.position.set(side * (B.deckW / 2), B.deckH + trussH / 2, pz);
        g.add(vp);
      }
      let diagIdx = 0;
      for (let pz = startZ; pz < startZ + len - 7.6; pz += 7.6) {
        const diagLen = Math.sqrt(7.6 * 7.6 + trussH * trussH);
        const diagGeo = new THREE.BoxGeometry(trussThick * 0.7, diagLen, trussThick * 0.7);
        const diag = new THREE.Mesh(diagGeo, this.mats.bridge);
        diag.position.set(side * (B.deckW / 2), B.deckH + trussH / 2, pz + 3.8);
        diag.rotation.z = (diagIdx % 2 === 0 ? 1 : -1) * Math.atan2(7.6, trussH);
        g.add(diag);
        diagIdx++;
      }
      const railGeo = new THREE.BoxGeometry(0.08, 1.2, len);
      const rail = new THREE.Mesh(railGeo, this.mats.bridge);
      rail.position.set(side * (B.deckW / 2 + 1.5), B.deckH + 1.2, startZ + len / 2);
      g.add(rail);
    }

    // Sidewalks
    for (const side of [-1, 1]) {
      const swGeo = new THREE.BoxGeometry(3, 0.15, len);
      const swMat = new THREE.MeshStandardMaterial({ color: 0x888880, roughness: 0.8 });
      const sw = new THREE.Mesh(swGeo, swMat);
      sw.position.set(side * (B.deckW / 2 + 1.5), B.deckH + 0.08, startZ + len / 2);
      g.add(sw);
    }

    // Floor beams
    const floorBeamGeo = new THREE.BoxGeometry(B.deckW + 2, 1.2, 0.4);
    const numBeams = Math.floor(len / 7.6);
    const floorBeamMesh = new THREE.InstancedMesh(floorBeamGeo, this.mats.bridge, numBeams);
    const _bm4 = new THREE.Matrix4();
    for (let i = 0; i < numBeams; i++) {
      _bm4.makeTranslation(0, B.deckH - 2.8, startZ + i * 7.6);
      floorBeamMesh.setMatrixAt(i, _bm4);
    }
    floorBeamMesh.castShadow = true;
    g.add(floorBeamMesh);

    // Stringers
    for (const sx of [-B.deckW / 3, B.deckW / 3]) {
      const strGeo = new THREE.BoxGeometry(0.5, 0.8, len);
      const str = new THREE.Mesh(strGeo, this.mats.bridge);
      str.position.set(sx, B.deckH - 3.5, startZ + len / 2);
      g.add(str);
    }

    // Street lights
    const poleGeo = new THREE.CylinderGeometry(0.06, 0.09, 4.5, 6);
    poleGeo.translate(0, 2.25, 0);
    const armGeo = new THREE.BoxGeometry(0.8, 0.06, 0.06);
    armGeo.translate(0.4, 4.6, 0);
    const poleFullGeo = mergeGeometries([poleGeo, armGeo])!;
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.7, roughness: 0.35 });
    const lanternGeo = new THREE.BoxGeometry(0.25, 0.4, 0.25);
    const lanternMat = new THREE.MeshStandardMaterial({ color: 0xffeecc, emissive: 0xffaa44, emissiveIntensity: 1.5, roughness: 0.3 });
    const lightSpacing = 50;
    const numLights = Math.floor(len / lightSpacing);
    for (const side of [-1, 1]) {
      const poleMesh = new THREE.InstancedMesh(poleFullGeo, poleMat, numLights);
      const lantMesh = new THREE.InstancedMesh(lanternGeo, lanternMat, numLights);
      const _lm4 = new THREE.Matrix4();
      const _ls = new THREE.Vector3(side, 1, 1);
      for (let i = 0; i < numLights; i++) {
        const lz = startZ + i * lightSpacing + lightSpacing / 2;
        _lm4.makeTranslation(side * (B.deckW / 2 + 0.8), B.deckH, lz);
        _lm4.scale(_ls);
        poleMesh.setMatrixAt(i, _lm4);
        _lm4.makeTranslation(side * (B.deckW / 2 + 0.8 + 0.8), B.deckH + 4.55, lz);
        lantMesh.setMatrixAt(i, _lm4);
      }
      g.add(poleMesh, lantMesh);
    }

    return g;
  }

  private createMainCables(): THREE.Group {
    const g = new THREE.Group();
    const B = BRIDGE;
    const cableOffset = B.deckW / 2 + 2;

    for (const side of [-1, 1]) {
      const x = side * cableOffset;
      const pts: THREE.Vector3[] = [];

      const ancTopY = 32.5;
      for (let i = 0; i <= 10; i++) {
        const t = i / 10;
        const z = THREE.MathUtils.lerp(-B.sideSpan - 30, -B.sideSpan, t);
        const y = THREE.MathUtils.lerp(ancTopY, 50, t);
        pts.push(new THREE.Vector3(x, y, z));
      }
      for (let i = 1; i <= 40; i++) {
        const t = i / 40;
        const z = -B.sideSpan + t * B.sideSpan;
        const sag = -30 * Math.sin(Math.PI * t);
        const y = THREE.MathUtils.lerp(50, B.towerH, t) + sag;
        pts.push(new THREE.Vector3(x, y, z));
      }
      for (let i = 0; i <= 100; i++) {
        const t = i / 100;
        const z = t * B.mainSpan;
        const y = B.cableSag + (B.towerH - B.cableSag) * Math.pow(2 * t - 1, 2);
        pts.push(new THREE.Vector3(x, y, z));
      }
      for (let i = 0; i < 40; i++) {
        const t = i / 40;
        const z = B.mainSpan + t * B.sideSpan;
        const sag = -30 * Math.sin(Math.PI * t);
        const y = THREE.MathUtils.lerp(B.towerH, 50, t) + sag;
        pts.push(new THREE.Vector3(x, y, z));
      }
      for (let i = 0; i <= 10; i++) {
        const t = i / 10;
        const z = THREE.MathUtils.lerp(B.mainSpan + B.sideSpan, B.mainSpan + B.sideSpan + 30, t);
        const y = THREE.MathUtils.lerp(50, ancTopY, t);
        pts.push(new THREE.Vector3(x, y, z));
      }

      const curve = new THREE.CatmullRomCurve3(pts);
      const tubeGeo = new THREE.TubeGeometry(curve, 200, B.cableR, 8, false);
      const tube = new THREE.Mesh(tubeGeo, this.mats.cable);
      tube.castShadow = true;
      g.add(tube);
    }
    return g;
  }

  private createSuspenders(): THREE.Group {
    const g = new THREE.Group();
    const B = BRIDGE;
    const cableOffset = B.deckW / 2 + 2;
    const suspGeo = new THREE.CylinderGeometry(0.04, 0.04, 1, 4);

    for (const side of [-1, 1]) {
      const x = side * cableOffset;
      const n = Math.floor(B.mainSpan / B.suspSpacing);
      for (let i = 1; i < n; i++) {
        const t = i / n;
        const z = t * B.mainSpan;
        const cableY = B.cableSag + (B.towerH - B.cableSag) * Math.pow(2 * t - 1, 2);
        const h = cableY - B.deckH - 2;
        if (h < 2) continue;
        const sg = suspGeo.clone();
        sg.scale(1, h, 1);
        const m = new THREE.Mesh(sg, this.mats.cable);
        m.position.set(x, B.deckH + 2 + h / 2, z);
        g.add(m);
      }
      for (const spanStart of [-B.sideSpan, B.mainSpan]) {
        const ns = Math.floor(B.sideSpan / B.suspSpacing);
        for (let i = 1; i < ns; i++) {
          const t = i / ns;
          const z = spanStart + t * B.sideSpan;
          let cableY: number;
          if (spanStart < 0) {
            cableY = THREE.MathUtils.lerp(50, B.towerH, t) + (-30 * Math.sin(Math.PI * t));
          } else {
            cableY = THREE.MathUtils.lerp(B.towerH, 50, t) + (-30 * Math.sin(Math.PI * t));
          }
          const h = cableY - B.deckH - 2;
          if (h < 2) continue;
          const sg = suspGeo.clone();
          sg.scale(1, h, 1);
          const m = new THREE.Mesh(sg, this.mats.cable);
          m.position.set(x, B.deckH + 2 + h / 2, z);
          g.add(m);
        }
      }
    }
    return g;
  }

  private buildAnchorages() {
    const B = BRIDGE;
    for (const z of [-B.sideSpan - 30, B.mainSpan + B.sideSpan + 30]) {
      const ancGeo = new THREE.BoxGeometry(40, 35, 50);
      const anc = new THREE.Mesh(ancGeo, this.mats.concrete);
      anc.position.set(0, 15, z);
      anc.receiveShadow = true;
      this.group.add(anc);
    }
  }

  private buildFortPointArch() {
    const archGeo = new THREE.TorusGeometry(20, 3, 8, 16, Math.PI);
    const arch = new THREE.Mesh(archGeo, this.mats.concrete);
    arch.position.set(0, BRIDGE.deckH - 20, -BRIDGE.sideSpan + 50);
    arch.rotation.y = Math.PI / 2;
    this.group.add(arch);
  }

  private buildApproachRoads() {
    const B = BRIDGE;
    for (const [az, dir] of [[-B.sideSpan - 55, -1], [B.mainSpan + B.sideSpan + 55, 1]] as const) {
      const apGeo = new THREE.BoxGeometry(B.deckW, 2, 200);
      const ap = new THREE.Mesh(apGeo, this.mats.road);
      ap.position.set(0, B.deckH - 2 + dir * -8, az + dir * 100);
      ap.rotation.x = dir * 0.04;
      ap.receiveShadow = true;
      this.group.add(ap);

      for (const sx of [-1, 1]) {
        const grGeo = new THREE.BoxGeometry(0.15, 1.0, 200);
        const gr = new THREE.Mesh(grGeo, this.mats.bridge);
        gr.position.set(sx * (B.deckW / 2 + 0.5), B.deckH - 1 + dir * -8, az + dir * 100);
        gr.rotation.x = dir * 0.04;
        this.group.add(gr);
      }

      // Embankment
      const embH = B.deckH - 2 + dir * -8;
      const embGeo = new THREE.BufferGeometry();
      const hw = B.deckW / 2 + 2;
      const ez0 = az, ez1 = az + dir * 200;
      const verts = new Float32Array([
        -hw, 0, ez0, hw, 0, ez0, hw, embH, ez0,
        -hw, 0, ez0, hw, embH, ez0, -hw, embH, ez0,
        -hw, 0, ez1, hw, embH - dir * 16, ez1, hw, 0, ez1,
        -hw, 0, ez1, -hw, embH - dir * 16, ez1, hw, embH - dir * 16, ez1,
        -hw, embH, ez0, hw, embH, ez0, hw, embH - dir * 16, ez1,
        -hw, embH, ez0, hw, embH - dir * 16, ez1, -hw, embH - dir * 16, ez1,
        -hw, 0, ez0, -hw, embH, ez0, -hw, embH - dir * 16, ez1,
        -hw, 0, ez0, -hw, embH - dir * 16, ez1, -hw, 0, ez1,
        hw, 0, ez0, hw, embH - dir * 16, ez1, hw, embH, ez0,
        hw, 0, ez0, hw, 0, ez1, hw, embH - dir * 16, ez1,
      ]);
      embGeo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
      embGeo.computeVertexNormals();
      const emb = new THREE.Mesh(embGeo, this.mats.concrete);
      emb.receiveShadow = true;
      this.group.add(emb);
    }
  }

  private buildFoamRings() {
    const foamGeo = new THREE.RingGeometry(16, 26, 16);
    foamGeo.rotateX(-Math.PI / 2);
    const foamMat = new THREE.MeshStandardMaterial({
      color: 0xffffff, transparent: true, opacity: 0.18,
      depthWrite: false, side: THREE.DoubleSide,
    });
    for (const tz of [0, BRIDGE.mainSpan]) {
      const foam = new THREE.Mesh(foamGeo, foamMat);
      foam.position.set(0, 0.4, tz);
      foam.scale.set(1.2, 1, 0.5);
      this.group.add(foam);
    }
  }
}
