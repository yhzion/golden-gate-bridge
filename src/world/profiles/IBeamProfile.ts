import { Shape } from 'three';

export function createIBeamShape(
  width: number,
  height: number,
  webT: number,
  flangeT: number,
): Shape {
  const hw = width / 2;
  const hh = height / 2;
  const hwt = webT / 2;

  const s = new Shape();
  s.moveTo(-hw, -hh);
  s.lineTo(hw, -hh);
  s.lineTo(hw, -hh + flangeT);
  s.lineTo(hwt, -hh + flangeT);
  s.lineTo(hwt, hh - flangeT);
  s.lineTo(hw, hh - flangeT);
  s.lineTo(hw, hh);
  s.lineTo(-hw, hh);
  s.lineTo(-hw, hh - flangeT);
  s.lineTo(-hwt, hh - flangeT);
  s.lineTo(-hwt, -hh + flangeT);
  s.lineTo(-hw, -hh + flangeT);
  s.closePath();
  return s;
}
