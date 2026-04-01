import * as THREE from 'three';
import { BRIDGE } from '@/config/bridge';
import { generateSteelTextures } from '@/world/textures/SteelPBR';
import { generateConcreteTextures } from '@/world/textures/ConcretePBR';
import { generateCableTextures } from '@/world/textures/CablePBR';
import { generateWeatheringOverlay } from '@/world/textures/WeatheringLayer';
import { generateAsphaltTextures } from '@/world/textures/AsphaltPBR';

export interface BridgeMaterials {
  // Steel variants
  towerSteel: THREE.MeshPhysicalMaterial;
  deckSteel: THREE.MeshPhysicalMaterial;
  cableSteel: THREE.MeshPhysicalMaterial;
  freshPaint: THREE.MeshPhysicalMaterial;

  // Concrete variants
  pierConcrete: THREE.MeshStandardMaterial;
  anchorageConcrete: THREE.MeshStandardMaterial;

  // Road
  asphalt: THREE.MeshStandardMaterial;
  laneMarkings: THREE.MeshStandardMaterial;

  // Functional
  galvanizedSteel: THREE.MeshStandardMaterial;
  castIron: THREE.MeshStandardMaterial;
  glass: THREE.MeshPhysicalMaterial;

  // Shared
  weatheringOverlay: THREE.CanvasTexture;

  // Legacy compatibility (used by systems not yet migrated)
  bridge: THREE.MeshPhysicalMaterial;
  cable: THREE.MeshStandardMaterial;
  concrete: THREE.MeshStandardMaterial;
  road: THREE.MeshStandardMaterial;
}

export function createMaterials(): BridgeMaterials {
  const steelTex = generateSteelTextures(1024);
  steelTex.colorMap.repeat.set(8, 8);
  steelTex.normalMap.repeat.set(8, 8);
  steelTex.roughnessMap.repeat.set(8, 8);
  steelTex.metalnessMap.repeat.set(8, 8);
  steelTex.aoMap.repeat.set(8, 8);

  const concreteTex = generateConcreteTextures(1024);
  concreteTex.colorMap.repeat.set(4, 4);
  concreteTex.normalMap.repeat.set(4, 4);
  concreteTex.roughnessMap.repeat.set(4, 4);
  concreteTex.aoMap.repeat.set(4, 4);

  const cableTex = generateCableTextures(1024);
  cableTex.normalMap.repeat.set(1, 20);
  cableTex.roughnessMap.repeat.set(1, 20);

  const weathering = generateWeatheringOverlay(512, {
    age: 0.4, saltExposure: 0.6, moistureZone: 0.5,
  });

  const towerSteel = new THREE.MeshPhysicalMaterial({
    color: BRIDGE.color,
    map: steelTex.colorMap,
    normalMap: steelTex.normalMap,
    normalScale: new THREE.Vector2(0.6, 0.6),
    roughnessMap: steelTex.roughnessMap,
    roughness: 0.55,
    metalnessMap: steelTex.metalnessMap,
    metalness: 0.3,
    aoMap: steelTex.aoMap,
    aoMapIntensity: 0.8,
    clearcoat: 0.08,
    clearcoatRoughness: 0.6,
    envMapIntensity: 0.5,
  });

  const deckSteel = new THREE.MeshPhysicalMaterial({
    color: BRIDGE.color,
    normalMap: steelTex.normalMap,
    normalScale: new THREE.Vector2(0.4, 0.4),
    roughness: 0.6,
    metalness: 0.3,
    clearcoat: 0.05,
    clearcoatRoughness: 0.7,
    envMapIntensity: 0.4,
  });

  const cableSteel = new THREE.MeshPhysicalMaterial({
    color: 0xb03d2a,
    normalMap: cableTex.normalMap,
    normalScale: new THREE.Vector2(0.5, 0.5),
    roughnessMap: cableTex.roughnessMap,
    roughness: 0.45,
    metalness: 0.4,
    clearcoat: 0.1,
    clearcoatRoughness: 0.5,
    envMapIntensity: 0.5,
  });

  const freshPaint = new THREE.MeshPhysicalMaterial({
    color: 0xcc4a35,
    roughness: 0.35,
    metalness: 0.2,
    clearcoat: 0.15,
    clearcoatRoughness: 0.4,
    envMapIntensity: 0.6,
  });

  const pierConcrete = new THREE.MeshStandardMaterial({
    map: concreteTex.colorMap,
    normalMap: concreteTex.normalMap,
    normalScale: new THREE.Vector2(0.7, 0.7),
    roughnessMap: concreteTex.roughnessMap,
    roughness: 0.85,
    metalness: 0,
    aoMap: concreteTex.aoMap,
    aoMapIntensity: 0.7,
  });

  const anchorageConcrete = new THREE.MeshStandardMaterial({
    color: 0x9a918a,
    normalMap: concreteTex.normalMap,
    normalScale: new THREE.Vector2(0.5, 0.5),
    roughness: 0.8,
    metalness: 0,
  });

  const asphaltTex = generateAsphaltTextures(1024);
  asphaltTex.colorMap.repeat.set(12, 60);
  asphaltTex.normalMap.repeat.set(12, 60);
  asphaltTex.roughnessMap.repeat.set(12, 60);

  const asphalt = new THREE.MeshStandardMaterial({
    map: asphaltTex.colorMap,
    normalMap: asphaltTex.normalMap,
    normalScale: new THREE.Vector2(0.6, 0.6),
    roughnessMap: asphaltTex.roughnessMap,
    roughness: 0.9,
    metalness: 0,
  });

  const laneMarkings = new THREE.MeshStandardMaterial({
    color: 0xdddddd,
    roughness: 0.55,
    metalness: 0.02,
  });

  const galvanizedSteel = new THREE.MeshStandardMaterial({
    color: 0x888890,
    roughness: 0.4,
    metalness: 0.6,
  });

  const castIron = new THREE.MeshStandardMaterial({
    color: 0x8b4030,
    roughness: 0.65,
    metalness: 0.5,
  });

  const glass = new THREE.MeshPhysicalMaterial({
    color: 0xffeecc,
    roughness: 0.1,
    metalness: 0,
    transmission: 0.6,
    thickness: 0.5,
    emissive: 0xffaa44,
    emissiveIntensity: 1.5,
  });

  return {
    towerSteel,
    deckSteel,
    cableSteel,
    freshPaint,
    pierConcrete,
    anchorageConcrete,
    asphalt,
    laneMarkings,
    galvanizedSteel,
    castIron,
    glass,
    weatheringOverlay: weathering,
    // Legacy compatibility
    bridge: towerSteel,
    cable: cableSteel as unknown as THREE.MeshStandardMaterial,
    concrete: pierConcrete,
    road: asphalt,
  };
}
