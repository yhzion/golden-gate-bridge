export enum WeatherType {
  Clear = 'clear',
  Fog = 'fog',
  Rain = 'rain',
}

export interface WeatherState {
  type: WeatherType;
  /** 0-1 blend factor during transition */
  blend: number;
  /** Fog density multiplier (1 = normal, 5 = heavy Karl) */
  fogMultiplier: number;
  /** Sky overcast factor (0 = clear sky, 1 = fully overcast) */
  overcast: number;
  /** Rain intensity 0-1 */
  rainIntensity: number;
  /** Road wetness 0-1 (affects roughness) */
  roadWetness: number;
  /** Color desaturation 0-1 */
  desaturation: number;
}

const WEATHER_PARAMS: Record<WeatherType, Omit<WeatherState, 'type' | 'blend'>> = {
  [WeatherType.Clear]: {
    fogMultiplier: 1.0,
    overcast: 0.0,
    rainIntensity: 0.0,
    roadWetness: 0.0,
    desaturation: 0.0,
  },
  [WeatherType.Fog]: {
    fogMultiplier: 5.0,
    overcast: 0.7,
    rainIntensity: 0.0,
    roadWetness: 0.2,
    desaturation: 0.4,
  },
  [WeatherType.Rain]: {
    fogMultiplier: 2.5,
    overcast: 0.9,
    rainIntensity: 0.8,
    roadWetness: 0.8,
    desaturation: 0.3,
  },
};

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export class WeatherSystem {
  private current: WeatherType = WeatherType.Clear;
  private target: WeatherType = WeatherType.Clear;
  private blend = 1.0; // 1.0 = fully at current
  private transitionSpeed = 0.15; // per second

  private state: WeatherState;

  constructor() {
    this.state = {
      type: WeatherType.Clear,
      blend: 1.0,
      ...WEATHER_PARAMS[WeatherType.Clear],
    };
  }

  setWeather(type: WeatherType) {
    if (type === this.current && this.blend >= 1) return;
    this.target = type;
    this.blend = 0;
  }

  getWeather(): WeatherType {
    return this.blend >= 1 ? this.current : this.target;
  }

  update(dt: number): WeatherState {
    if (this.blend < 1) {
      this.blend = Math.min(1, this.blend + dt * this.transitionSpeed);
      if (this.blend >= 1) {
        this.current = this.target;
      }
    }

    const a = WEATHER_PARAMS[this.current];
    const b = WEATHER_PARAMS[this.target];
    const t = this.blend;

    this.state = {
      type: this.target,
      blend: t,
      fogMultiplier: lerp(a.fogMultiplier, b.fogMultiplier, t),
      overcast: lerp(a.overcast, b.overcast, t),
      rainIntensity: lerp(a.rainIntensity, b.rainIntensity, t),
      roadWetness: lerp(a.roadWetness, b.roadWetness, t),
      desaturation: lerp(a.desaturation, b.desaturation, t),
    };

    return this.state;
  }

  getState(): WeatherState {
    return this.state;
  }
}
