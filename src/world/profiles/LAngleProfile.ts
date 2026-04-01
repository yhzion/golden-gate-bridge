import { Shape } from 'three';

export function createLAngleShape(
  legW: number,
  legH: number,
  t: number,
): Shape {
  const s = new Shape();
  s.moveTo(0, 0);
  s.lineTo(legW, 0);
  s.lineTo(legW, t);
  s.lineTo(t, t);
  s.lineTo(t, legH);
  s.lineTo(0, legH);
  s.closePath();
  return s;
}
