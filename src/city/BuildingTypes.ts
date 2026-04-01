import * as THREE from 'three';
import { seededRandom } from '@/utils/noise';

export interface BuildingGeomResult {
  geometry: THREE.BufferGeometry;
  color: THREE.Color;
  emissiveWindows: boolean;
}

/**
 * Highrise: Glass curtain wall towers (30-250m)
 * Financial District style — sleek, reflective
 */
export function createHighrise(seed: number, height: number): BuildingGeomResult {
  const r = (offset: number) => seededRandom(seed + offset);
  const w = 12 + r(1) * 25;
  const d = 12 + r(2) * 25;

  // Base + setback tower style
  const parts: THREE.BufferGeometry[] = [];

  // Main tower
  const tower = new THREE.BoxGeometry(w, height, d);
  tower.translate(0, height / 2, 0);
  parts.push(tower);

  // Setback top section (30% of buildings)
  if (r(3) > 0.7 && height > 60) {
    const topH = height * 0.2;
    const topW = w * 0.7;
    const topD = d * 0.7;
    const top = new THREE.BoxGeometry(topW, topH, topD);
    top.translate(0, height + topH / 2, 0);
    parts.push(top);
  }

  const merged = parts.length > 1
    ? mergeGeos(parts)
    : parts[0];

  // Glass blue-gray with variation
  const hue = 0.57 + r(4) * 0.06;
  const sat = 0.1 + r(5) * 0.15;
  const lum = 0.35 + r(6) * 0.15;
  const color = new THREE.Color().setHSL(hue, sat, lum);

  return { geometry: merged, color, emissiveWindows: true };
}

/**
 * MidRise: Concrete/brick commercial (10-30m)
 * SoMa / mixed-use style
 */
export function createMidrise(seed: number, height: number): BuildingGeomResult {
  const r = (offset: number) => seededRandom(seed + offset);
  const w = 15 + r(1) * 20;
  const d = 15 + r(2) * 20;

  const geo = new THREE.BoxGeometry(w, height, d);
  geo.translate(0, height / 2, 0);

  const hue = 0.06 + r(3) * 0.05;
  const sat = 0.08 + r(4) * 0.12;
  const lum = 0.4 + r(5) * 0.15;
  const color = new THREE.Color().setHSL(hue, sat, lum);

  return { geometry: geo, color, emissiveWindows: true };
}

/**
 * Victorian: Painted ladies style (8-15m)
 * Marina / Pacific Heights — colorful, narrow, tall
 */
export function createVictorian(seed: number, height: number): BuildingGeomResult {
  const r = (offset: number) => seededRandom(seed + offset);
  const w = 6 + r(1) * 4;
  const d = 10 + r(2) * 8;

  const parts: THREE.BufferGeometry[] = [];

  // Main body
  const body = new THREE.BoxGeometry(w, height, d);
  body.translate(0, height / 2, 0);
  parts.push(body);

  // Bay window bump (front face)
  if (r(3) > 0.3) {
    const bayW = w * 0.4;
    const bayH = height * 0.6;
    const bayD = 1.5;
    const bay = new THREE.BoxGeometry(bayW, bayH, bayD);
    bay.translate(0, height * 0.4, d / 2 + bayD / 2);
    parts.push(bay);
  }

  // Peaked roof
  if (r(4) > 0.4) {
    const roofH = 2 + r(5) * 2;
    const roof = new THREE.BoxGeometry(w + 0.4, roofH, d + 0.4);
    roof.translate(0, height + roofH / 2, 0);
    parts.push(roof);
  }

  const merged = parts.length > 1 ? mergeGeos(parts) : parts[0];

  // Colorful Victorian palette
  const palettes = [
    [0.0, 0.4, 0.6],   // Warm pink
    [0.58, 0.3, 0.55],  // Blue
    [0.12, 0.45, 0.65], // Yellow/cream
    [0.33, 0.25, 0.5],  // Green
    [0.75, 0.3, 0.55],  // Purple
    [0.08, 0.2, 0.7],   // White/cream
  ];
  const pal = palettes[Math.floor(r(6) * palettes.length)];
  const color = new THREE.Color().setHSL(pal[0], pal[1], pal[2]);

  return { geometry: merged, color, emissiveWindows: true };
}

/**
 * Industrial: Warehouse/flat-roof (5-15m)
 * Dogpatch / SoMa style
 */
export function createIndustrial(seed: number, height: number): BuildingGeomResult {
  const r = (offset: number) => seededRandom(seed + offset);
  const w = 20 + r(1) * 30;
  const d = 20 + r(2) * 30;

  const geo = new THREE.BoxGeometry(w, height, d);
  geo.translate(0, height / 2, 0);

  const lum = 0.3 + r(3) * 0.15;
  const color = new THREE.Color().setHSL(0.08, 0.05, lum);

  return { geometry: geo, color, emissiveWindows: false };
}

/**
 * Wharf: Timber frame pier buildings (5-10m)
 * Fisherman's Wharf style
 */
export function createWharf(seed: number, height: number): BuildingGeomResult {
  const r = (offset: number) => seededRandom(seed + offset);
  const w = 12 + r(1) * 20;
  const d = 8 + r(2) * 15;

  const parts: THREE.BufferGeometry[] = [];

  const body = new THREE.BoxGeometry(w, height, d);
  body.translate(0, height / 2, 0);
  parts.push(body);

  // Overhang roof
  const roofH = 1;
  const roof = new THREE.BoxGeometry(w + 2, roofH, d + 2);
  roof.translate(0, height + roofH / 2, 0);
  parts.push(roof);

  const merged = mergeGeos(parts);

  const hue = 0.07 + r(3) * 0.04;
  const color = new THREE.Color().setHSL(hue, 0.25, 0.45 + r(4) * 0.1);

  return { geometry: merged, color, emissiveWindows: true };
}

// Helper to merge geometries without importing mergeGeometries (which needs async)
function mergeGeos(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  // Simple merge by combining all position attributes
  let totalVerts = 0;
  for (const g of geos) totalVerts += g.attributes.position.count;

  const positions = new Float32Array(totalVerts * 3);
  const normals = new Float32Array(totalVerts * 3);
  let offset = 0;

  for (const g of geos) {
    const pos = g.attributes.position;
    const norm = g.attributes.normal;
    if (!norm) g.computeVertexNormals();
    const n = g.attributes.normal;
    for (let i = 0; i < pos.count; i++) {
      positions[(offset + i) * 3] = pos.getX(i);
      positions[(offset + i) * 3 + 1] = pos.getY(i);
      positions[(offset + i) * 3 + 2] = pos.getZ(i);
      normals[(offset + i) * 3] = n.getX(i);
      normals[(offset + i) * 3 + 1] = n.getY(i);
      normals[(offset + i) * 3 + 2] = n.getZ(i);
    }
    offset += pos.count;
  }

  // Merge indices
  let totalIndices = 0;
  for (const g of geos) {
    totalIndices += g.index ? g.index.count : g.attributes.position.count;
  }
  const indices = new Uint32Array(totalIndices);
  let idxOffset = 0;
  let vertOffset = 0;
  for (const g of geos) {
    const count = g.attributes.position.count;
    if (g.index) {
      for (let i = 0; i < g.index.count; i++) {
        indices[idxOffset + i] = g.index.getX(i) + vertOffset;
      }
      idxOffset += g.index.count;
    } else {
      for (let i = 0; i < count; i++) {
        indices[idxOffset + i] = i + vertOffset;
      }
      idxOffset += count;
    }
    vertOffset += count;
  }

  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  merged.setIndex(new THREE.BufferAttribute(indices, 1));
  return merged;
}

export const BUILDING_FACTORIES: Record<string, (seed: number, height: number) => BuildingGeomResult> = {
  highrise: createHighrise,
  midrise: createMidrise,
  victorian: createVictorian,
  industrial: createIndustrial,
  wharf: createWharf,
};
