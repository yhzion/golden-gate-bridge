import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { fbm } from '@/utils/noise';

export function terrainH(wx: number, wz: number): number {
  let h = -30;
  // Marin Headlands (north)
  if (wz > 1500) {
    const d = (wz - 1500) / 600;
    const ridge = fbm(wx * 0.0012 + 3.7, wz * 0.0012 + 1.2, 6);
    const coastal = Math.max(0, 1 - Math.abs(wx) / 1500);
    h = Math.max(h, 300 * Math.min(d, 1.5) * (0.25 + 0.75 * ridge) * Math.exp(-d * 0.25) * coastal);
  }
  // Presidio / south-west
  if (wz < -200 && wx < 600) {
    const d = Math.min((-200 - wz) / 500, 1);
    const e = Math.min((600 - wx) / 700, 1);
    const n = fbm(wx * 0.003 + 9.1, wz * 0.003 + 4.3, 5);
    h = Math.max(h, 80 * d * e * (0.3 + 0.7 * n));
  }
  // SF hills (far south)
  if (wz < -800) {
    const d = Math.min((-800 - wz) / 700, 1);
    h = Math.max(h, 140 * d * (0.35 + 0.65 * fbm(wx * 0.002 + 5.5, wz * 0.002 + 8.8, 5)));
  }
  // West coast cliffs
  if (wx < -200) {
    const d = Math.min((-200 - wx) / 400, 1);
    const coastal = fbm(wx * 0.002 + 2.2, wz * 0.002 + 6.6, 5);
    h = Math.max(h, 100 * d * (0.25 + 0.75 * coastal));
  }
  // East coast (Sausalito area)
  if (wx > 500 && wz > 1400) {
    const d = Math.min((wx - 500) / 500, 1) * Math.min((wz - 1400) / 400, 1);
    h = Math.max(h, 90 * d * (0.35 + 0.65 * fbm(wx * 0.003, wz * 0.003, 4)));
  }
  // Keep bridge corridor clear
  if (wz > -600 && wz < 1900 && Math.abs(wx) < 120) {
    const bridgeFade = Math.max(0, 1 - Math.abs(wx) / 120);
    let endFade = 1;
    if (wz < -200) endFade = 1 - (wz + 200) / (-400);
    else if (wz > 1500) endFade = 1 - (wz - 1500) / 400;
    h = Math.min(h, THREE.MathUtils.lerp(h, -5, bridgeFade * Math.min(endFade, 1)));
  }
  return h;
}

export function createTerrain(scene: THREE.Scene): THREE.Group {
  const g = new THREE.Group();
  const patches = [
    { cx: 0, cz: 2800, w: 4000, d: 2500, seg: 140 },
    { cx: -300, cz: -800, w: 2500, d: 1200, seg: 90 },
    { cx: 200, cz: -1800, w: 3000, d: 1500, seg: 90 },
    { cx: -800, cz: 600, w: 1200, d: 3000, seg: 70 },
    { cx: 1000, cz: 2200, w: 1200, d: 1500, seg: 60 },
  ];

  for (const p of patches) {
    const geo = new THREE.PlaneGeometry(p.w, p.d, p.seg, p.seg);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);

    for (let i = 0; i < pos.count; i++) {
      const lx = pos.getX(i), lz = pos.getZ(i);
      const wx = lx + p.cx, wz = lz + p.cz;
      pos.setY(i, terrainH(wx, wz));
    }
    geo.computeVertexNormals();

    const norms = geo.attributes.normal;
    for (let i = 0; i < pos.count; i++) {
      const lx = pos.getX(i), lz = pos.getZ(i);
      const wx = lx + p.cx, wz = lz + p.cz;
      const h = pos.getY(i);
      const ny = norms.getY(i);
      const slope = 1 - ny;

      const n1 = fbm(wx * 0.004 + 1.1, wz * 0.004 + 2.2, 3);
      const n2 = fbm(wx * 0.015, wz * 0.015, 2);
      const elev = Math.max(0, h) / 250;

      let r: number, g2: number, b: number;
      if (h < 1) {
        r = 0.52 + n2 * 0.1; g2 = 0.46 + n2 * 0.07; b = 0.35 + n2 * 0.06;
      } else if (slope > 0.5) {
        r = 0.45 + n1 * 0.1; g2 = 0.38 + n1 * 0.08; b = 0.30 + n1 * 0.06;
      } else if (elev > 0.55) {
        r = 0.52 + n1 * 0.1; g2 = 0.44 + n1 * 0.06; b = 0.20 + n1 * 0.04;
      } else if (elev > 0.25) {
        const blend = n1 * 0.6 + 0.4;
        r = THREE.MathUtils.lerp(0.30, 0.50, blend);
        g2 = THREE.MathUtils.lerp(0.40, 0.42, blend);
        b = THREE.MathUtils.lerp(0.15, 0.18, blend);
      } else {
        const greenPatch = fbm(wx * 0.008 + 3.3, wz * 0.008 + 7.7, 2);
        r = 0.28 + n1 * 0.12 + greenPatch * 0.08;
        g2 = 0.38 + n1 * 0.06 + greenPatch * 0.06;
        b = 0.15 + n1 * 0.04;
      }
      const ao = 0.85 + 0.15 * ny;
      colors[i * 3] = r * ao;
      colors[i * 3 + 1] = g2 * ao;
      colors[i * 3 + 2] = b * ao;
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(p.cx, 0, p.cz);
    mesh.receiveShadow = true;
    g.add(mesh);
  }

  // Trees
  const treeTrunkGeo = new THREE.CylinderGeometry(0.25, 0.45, 5, 5);
  treeTrunkGeo.translate(0, 2.5, 0);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3520, roughness: 0.9 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x2d5a1e, roughness: 0.85 });

  const foliageParts: THREE.SphereGeometry[] = [];
  for (const [fy, fr] of [[5, 3.0], [6.8, 2.4], [8.2, 1.6]] as const) {
    const s = new THREE.SphereGeometry(fr, 6, 5);
    s.translate(0, fy, 0);
    foliageParts.push(s);
  }
  for (let a = 0; a < 3; a++) {
    const angle = a * Math.PI * 2 / 3;
    const s = new THREE.SphereGeometry(1.8, 5, 4);
    s.translate(Math.cos(angle) * 1.5, 5.5, Math.sin(angle) * 1.5);
    foliageParts.push(s);
  }

  const foliageGeo = mergeGeometries(foliageParts);

  const NUM_TREES = 300;
  const treeTrunkMesh = new THREE.InstancedMesh(treeTrunkGeo, trunkMat, NUM_TREES);
  const treeTopMesh = new THREE.InstancedMesh(foliageGeo, leafMat, NUM_TREES);
  const tmpM = new THREE.Matrix4();
  const tmpS = new THREE.Vector3();
  const rng = (s: number) => { const x = Math.sin(s) * 43758.5453; return x - Math.floor(x); };
  let treeIdx = 0;

  for (let i = 0; i < NUM_TREES * 3 && treeIdx < NUM_TREES; i++) {
    const wx = -1500 + rng(i * 7.3) * 4000;
    const wz = -2000 + rng(i * 11.1) * 5000;
    const h = terrainH(wx, wz);
    if (h < 5 || h > 180) continue;
    if (wz > -400 && wz < 1700 && Math.abs(wx) < 150) continue;
    const scale = 0.6 + rng(i * 3.7) * 0.8;
    const sy = 0.8 + rng(i * 13.3) * 0.5;
    const sx = 0.9 + rng(i * 9.7) * 0.25;
    tmpS.set(scale * sx, scale * sy, scale * sx);
    tmpM.makeTranslation(wx, h, wz);
    tmpM.scale(tmpS);
    treeTrunkMesh.setMatrixAt(treeIdx, tmpM);
    treeTopMesh.setMatrixAt(treeIdx, tmpM);
    treeTopMesh.setColorAt(treeIdx, new THREE.Color().setHSL(0.28 + rng(i * 5.1) * 0.08, 0.5, 0.18 + rng(i * 2.3) * 0.12));
    treeIdx++;
  }
  treeTrunkMesh.count = treeIdx;
  treeTopMesh.count = treeIdx;
  treeTrunkMesh.castShadow = true;
  treeTopMesh.castShadow = true;
  if (treeIdx > 0 && treeTopMesh.instanceColor) treeTopMesh.instanceColor.needsUpdate = true;
  g.add(treeTrunkMesh, treeTopMesh);

  scene.add(g);
  return g;
}
