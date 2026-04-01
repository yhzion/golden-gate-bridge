// src/atmosphere/celestial/ConstellationMap.ts

const DEG = Math.PI / 180;
const HOUR_TO_RAD = Math.PI / 12;

interface ConstellationStar {
  ra: number;
  dec: number;
  mag: number;
  name: string;
}

const STARS: ConstellationStar[] = [
  // Winter — Orion
  { ra: 5.919 * HOUR_TO_RAD, dec: 7.407 * DEG, mag: 0.42, name: 'Betelgeuse' },
  { ra: 5.242 * HOUR_TO_RAD, dec: -8.202 * DEG, mag: 0.12, name: 'Rigel' },
  { ra: 5.679 * HOUR_TO_RAD, dec: -1.943 * DEG, mag: 1.70, name: 'Bellatrix' },
  // Winter — Canis Major
  { ra: 6.752 * HOUR_TO_RAD, dec: -16.716 * DEG, mag: -1.46, name: 'Sirius' },
  // Winter — Gemini
  { ra: 7.755 * HOUR_TO_RAD, dec: 28.026 * DEG, mag: 1.14, name: 'Pollux' },
  { ra: 7.577 * HOUR_TO_RAD, dec: 31.888 * DEG, mag: 1.58, name: 'Castor' },
  // Winter — Taurus
  { ra: 4.599 * HOUR_TO_RAD, dec: 16.509 * DEG, mag: 0.85, name: 'Aldebaran' },
  // Winter — Auriga
  { ra: 5.278 * HOUR_TO_RAD, dec: 45.998 * DEG, mag: 0.08, name: 'Capella' },
  // Spring — Leo
  { ra: 10.139 * HOUR_TO_RAD, dec: 11.967 * DEG, mag: 1.35, name: 'Regulus' },
  // Spring — Virgo
  { ra: 13.420 * HOUR_TO_RAD, dec: -11.161 * DEG, mag: 0.97, name: 'Spica' },
  // Spring — Bootes
  { ra: 14.261 * HOUR_TO_RAD, dec: 19.182 * DEG, mag: -0.05, name: 'Arcturus' },
  // Summer — Cygnus
  { ra: 20.690 * HOUR_TO_RAD, dec: 45.280 * DEG, mag: 1.25, name: 'Deneb' },
  // Summer — Lyra
  { ra: 18.616 * HOUR_TO_RAD, dec: 38.784 * DEG, mag: 0.03, name: 'Vega' },
  // Summer — Aquila
  { ra: 19.846 * HOUR_TO_RAD, dec: 8.868 * DEG, mag: 0.77, name: 'Altair' },
  // Summer — Scorpius
  { ra: 16.490 * HOUR_TO_RAD, dec: -26.432 * DEG, mag: 0.96, name: 'Antares' },
  // Autumn — Pegasus
  { ra: 23.079 * HOUR_TO_RAD, dec: 15.205 * DEG, mag: 2.49, name: 'Markab' },
  // Autumn — Andromeda
  { ra: 0.140 * HOUR_TO_RAD, dec: 29.091 * DEG, mag: 2.06, name: 'Alpheratz' },
  // Autumn — Cassiopeia
  { ra: 0.675 * HOUR_TO_RAD, dec: 56.537 * DEG, mag: 2.24, name: 'Schedar' },
  // Year-round — Ursa Major
  { ra: 11.062 * HOUR_TO_RAD, dec: 61.751 * DEG, mag: 1.79, name: 'Dubhe' },
  { ra: 13.399 * HOUR_TO_RAD, dec: 54.926 * DEG, mag: 1.86, name: 'Alkaid' },
  // Polaris
  { ra: 2.530 * HOUR_TO_RAD, dec: 89.264 * DEG, mag: 1.98, name: 'Polaris' },
];

export class ConstellationMap {
  static readonly STAR_COUNT = STARS.length;

  computePositions(lst: number): Float32Array {
    const SIN_LAT = Math.sin(37.8 * DEG);
    const COS_LAT = Math.cos(37.8 * DEG);
    const data = new Float32Array(STARS.length * 3);

    for (let i = 0; i < STARS.length; i++) {
      const star = STARS[i];
      const ha = lst - star.ra;
      const sinDec = Math.sin(star.dec);
      const cosDec = Math.cos(star.dec);
      const cosHa = Math.cos(ha);

      const sinAlt = sinDec * SIN_LAT + cosDec * COS_LAT * cosHa;
      const altitude = Math.asin(sinAlt);
      const azimuth = Math.atan2(
        -cosDec * Math.sin(ha),
        sinDec * COS_LAT - cosDec * SIN_LAT * cosHa,
      );

      data[i * 3] = ((azimuth % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      data[i * 3 + 1] = altitude;
      data[i * 3 + 2] = star.mag;
    }
    return data;
  }

  static readonly GLSL = /* glsl */ `
    float constellationBoost(vec3 dir, float constellationStars[${STARS.length * 3}]) {
      float boost = 1.0;
      float az = atan(dir.x, dir.z);
      float alt = asin(dir.y);

      for (int i = 0; i < ${STARS.length}; i++) {
        float starAz = constellationStars[i * 3];
        float starAlt = constellationStars[i * 3 + 1];
        float starMag = constellationStars[i * 3 + 2];

        float dAz = starAz - az;
        float dAlt = starAlt - alt;
        float dist = sqrt(dAz * dAz + dAlt * dAlt);

        float radius = 0.03 + (2.5 - starMag) * 0.008;
        float brightness = smoothstep(radius, 0.0, dist);
        float boostAmount = 1.0 + brightness * (0.3 + (2.5 - starMag) * 0.05);
        boost = max(boost, boostAmount);
      }
      return boost;
    }
  `;
}
