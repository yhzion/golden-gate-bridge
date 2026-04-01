export enum ZoneType {
  Water = 'water',
  Financial = 'financial',
  SoMa = 'soma',
  Marina = 'marina',
  Wharf = 'wharf',
  Sunset = 'sunset',
  Presidio = 'presidio',
  MarinHeadlands = 'marin',
  Industrial = 'industrial',
}

export interface ZoneConfig {
  type: ZoneType;
  /** Building types and their weight (probability) */
  buildings: { type: string; weight: number }[];
  /** Average buildings per 500m chunk */
  density: number;
  /** Height range [min, max] in meters */
  heightRange: [number, number];
  /** Tree density (0-1) */
  treeDensity: number;
}

const ZONE_CONFIGS: Record<ZoneType, ZoneConfig> = {
  [ZoneType.Water]: {
    type: ZoneType.Water,
    buildings: [],
    density: 0,
    heightRange: [0, 0],
    treeDensity: 0,
  },
  [ZoneType.Financial]: {
    type: ZoneType.Financial,
    buildings: [
      { type: 'highrise', weight: 0.6 },
      { type: 'midrise', weight: 0.3 },
      { type: 'industrial', weight: 0.1 },
    ],
    density: 35,
    heightRange: [30, 250],
    treeDensity: 0.05,
  },
  [ZoneType.SoMa]: {
    type: ZoneType.SoMa,
    buildings: [
      { type: 'midrise', weight: 0.4 },
      { type: 'industrial', weight: 0.35 },
      { type: 'highrise', weight: 0.25 },
    ],
    density: 28,
    heightRange: [10, 80],
    treeDensity: 0.08,
  },
  [ZoneType.Marina]: {
    type: ZoneType.Marina,
    buildings: [
      { type: 'victorian', weight: 0.7 },
      { type: 'midrise', weight: 0.3 },
    ],
    density: 40,
    heightRange: [8, 18],
    treeDensity: 0.2,
  },
  [ZoneType.Wharf]: {
    type: ZoneType.Wharf,
    buildings: [
      { type: 'wharf', weight: 0.6 },
      { type: 'midrise', weight: 0.3 },
      { type: 'industrial', weight: 0.1 },
    ],
    density: 20,
    heightRange: [5, 15],
    treeDensity: 0.05,
  },
  [ZoneType.Sunset]: {
    type: ZoneType.Sunset,
    buildings: [
      { type: 'victorian', weight: 0.85 },
      { type: 'midrise', weight: 0.15 },
    ],
    density: 45,
    heightRange: [7, 14],
    treeDensity: 0.15,
  },
  [ZoneType.Presidio]: {
    type: ZoneType.Presidio,
    buildings: [],
    density: 0,
    heightRange: [0, 0],
    treeDensity: 0.6,
  },
  [ZoneType.MarinHeadlands]: {
    type: ZoneType.MarinHeadlands,
    buildings: [],
    density: 0,
    heightRange: [0, 0],
    treeDensity: 0.4,
  },
  [ZoneType.Industrial]: {
    type: ZoneType.Industrial,
    buildings: [
      { type: 'industrial', weight: 0.7 },
      { type: 'midrise', weight: 0.2 },
      { type: 'wharf', weight: 0.1 },
    ],
    density: 18,
    heightRange: [5, 20],
    treeDensity: 0.02,
  },
};

/**
 * Determines the zone type at world coordinates (x, z).
 * Based on real SF geography — bridge at z=0..1280, south is negative z.
 */
export function zoneAt(wx: number, wz: number): ZoneConfig {
  // Marin Headlands (north of bridge)
  if (wz > 1600) return ZONE_CONFIGS[ZoneType.MarinHeadlands];

  // Bridge corridor — keep clear
  if (wz > -400 && wz < 1600 && Math.abs(wx) < 100) return ZONE_CONFIGS[ZoneType.Water];

  // Presidio (southwest of bridge)
  if (wz > -600 && wz < 200 && wx < -100 && wx > -1200) return ZONE_CONFIGS[ZoneType.Presidio];

  // Fisherman's Wharf (northeast, near waterfront)
  if (wz > -200 && wz < 400 && wx > 200 && wx < 1200) return ZONE_CONFIGS[ZoneType.Wharf];

  // Marina / Pacific Heights (north-central)
  if (wz > -800 && wz < -200 && wx > -600 && wx < 600) return ZONE_CONFIGS[ZoneType.Marina];

  // Financial District (southeast cluster)
  if (wz < -800 && wz > -2000 && wx > 400 && wx < 2000) return ZONE_CONFIGS[ZoneType.Financial];

  // SoMa / Mission (south-central)
  if (wz < -800 && wz > -2500 && wx > -400 && wx <= 400) return ZONE_CONFIGS[ZoneType.SoMa];

  // Industrial (Dogpatch / south waterfront)
  if (wz < -2000 && wx > 400) return ZONE_CONFIGS[ZoneType.Industrial];

  // Sunset / Richmond (western residential)
  if (wx < -600 && wz < -200) return ZONE_CONFIGS[ZoneType.Sunset];

  // Water (bay, ocean)
  if (wx > 800 && wz > 0) return ZONE_CONFIGS[ZoneType.Water];

  // Default: Sunset-style residential
  return ZONE_CONFIGS[ZoneType.Sunset];
}

export function getZoneConfig(type: ZoneType): ZoneConfig {
  return ZONE_CONFIGS[type];
}
