/**
 * Vehicle specifications with real-world dimensions for normalization.
 * Dimensions sourced from manufacturer specs and automotive databases.
 *
 * All measurements in meters.
 */

export interface VehicleSpec {
  /** GLB filename in /assets/vehicles/ */
  file: string;
  /** Display name */
  name: string;
  /** Real-world length in meters */
  length: number;
  /** Real-world width in meters */
  width: number;
  /** Real-world height in meters */
  height: number;
  /** Wheel radius in meters */
  wheelRadius: number;
  /** Regex pattern to match wheel node names */
  wheelPattern: RegExp;
  /** Spawn probability weight (higher = more common) */
  weight: number;
  /** Category for speed assignment */
  category: 'compact' | 'sedan' | 'sports' | 'suv' | 'truck';
}

export const VEHICLE_SPECS: VehicleSpec[] = [
  // ─── Sedans ───────────────────────────────────────────────
  {
    file: 'sedan_1.glb',
    name: 'Sedan',
    length: 4.70, width: 1.82, height: 1.47,
    wheelRadius: 0.33,
    wheelPattern: /NormalCar1.*(Wheel|BackWheels)/i,
    weight: 15,
    category: 'sedan',
  },
  {
    file: 'sedan_2.glb',
    name: 'Sedan Variant',
    length: 4.60, width: 1.80, height: 1.45,
    wheelRadius: 0.32,
    wheelPattern: /NormalCar2.*(Wheel|BackWheels)/i,
    weight: 12,
    category: 'sedan',
  },
  {
    file: 'sedan_3.glb',
    name: 'Compact Sedan',
    length: 4.50, width: 1.78, height: 1.43,
    wheelRadius: 0.31,
    wheelPattern: /BackWheels|FrontWheels/i,
    weight: 10,
    category: 'sedan',
  },

  // ─── Sports Cars ──────────────────────────────────────────
  {
    file: 'sports_car_1.glb',
    name: 'Sports Car',
    length: 4.50, width: 1.85, height: 1.30,
    wheelRadius: 0.33,
    wheelPattern: /SportsCar2.*(Wheel|BackWheels)/i,
    weight: 6,
    category: 'sports',
  },
  {
    file: 'sports_car_2.glb',
    name: 'Sports Coupe',
    length: 4.40, width: 1.82, height: 1.28,
    wheelRadius: 0.32,
    wheelPattern: /SportsCar.*(Wheel|BackWheels)/i,
    weight: 5,
    category: 'sports',
  },
  {
    file: 'sports_car_3.glb',
    name: 'Sports Fastback',
    length: 4.55, width: 1.85, height: 1.32,
    wheelRadius: 0.33,
    wheelPattern: /BackWheels|FrontWheel/i,
    weight: 4,
    category: 'sports',
  },
  {
    file: 'chevrolet_camaro.glb',
    name: 'Chevrolet Camaro ZL1',
    // Ref: 2023 Camaro ZL1 — 4784 × 1897 × 1349 mm
    length: 4.78, width: 1.90, height: 1.35,
    wheelRadius: 0.33,
    wheelPattern: /wheel/i,
    weight: 4,
    category: 'sports',
  },

  // ─── Compact / Hatchback ──────────────────────────────────
  {
    file: 'compact.glb',
    name: 'City Car',
    length: 3.85, width: 1.70, height: 1.45,
    wheelRadius: 0.30,
    wheelPattern: /Wheel.*Cylinder/i,
    weight: 8,
    category: 'compact',
  },
  {
    file: 'hatchback.glb',
    name: 'Hatchback',
    // Generic hatchback ~4.2m
    length: 4.20, width: 1.80, height: 1.50,
    wheelRadius: 0.31,
    wheelPattern: /car_hatchback_wheel/i,
    weight: 10,
    category: 'compact',
  },

  // ─── SUVs ─────────────────────────────────────────────────
  {
    file: 'suv.glb',
    name: 'SUV',
    length: 4.70, width: 1.90, height: 1.75,
    wheelRadius: 0.37,
    wheelPattern: /SUV.*(Wheel|BackWheels)/i,
    weight: 12,
    category: 'suv',
  },
  {
    file: 'range_rover.glb',
    name: 'Range Rover',
    // Ref: Range Rover Sport — 4946 × 2073 × 1820 mm
    length: 4.95, width: 2.05, height: 1.82,
    wheelRadius: 0.38,
    wheelPattern: /Tire[1-4]/i,
    weight: 5,
    category: 'suv',
  },

  // ─── Trucks / Pickups ─────────────────────────────────────
  {
    file: 'pickup_truck.glb',
    name: 'Pickup Truck',
    // Generic mid-size pickup ~5.4m
    length: 5.40, width: 1.90, height: 1.85,
    wheelRadius: 0.38,
    wheelPattern: /BackWheels|FrontWheel/i,
    weight: 8,
    category: 'truck',
  },
  {
    file: 'truck.glb',
    name: 'Delivery Truck',
    length: 5.80, width: 2.10, height: 2.10,
    wheelRadius: 0.40,
    wheelPattern: /BackWheels|FrontWheel/i,
    weight: 3,
    category: 'truck',
  },

  // ─── Special ──────────────────────────────────────────────
  {
    file: 'police_car.glb',
    name: 'Police Car',
    length: 4.80, width: 1.85, height: 1.55,
    wheelRadius: 0.33,
    wheelPattern: /Cop.*(Wheel|BackWheels)/i,
    weight: 3,
    category: 'sedan',
  },
  {
    file: 'taxi.glb',
    name: 'Taxi',
    length: 4.80, width: 1.85, height: 1.50,
    wheelRadius: 0.33,
    wheelPattern: /Taxi.*(Wheel|BackWheels)/i,
    weight: 5,
    category: 'sedan',
  },
];

/** Total spawn weight for weighted random selection */
export const TOTAL_WEIGHT = VEHICLE_SPECS.reduce((s, v) => s + v.weight, 0);

/** Pick a random vehicle spec using weighted selection */
export function pickRandomSpec(): VehicleSpec {
  let r = Math.random() * TOTAL_WEIGHT;
  for (const spec of VEHICLE_SPECS) {
    r -= spec.weight;
    if (r <= 0) return spec;
  }
  return VEHICLE_SPECS[0];
}
