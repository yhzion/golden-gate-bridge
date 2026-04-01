import { Shape } from 'three';

export function createCruciformShape(
  width: number,
  depth: number,
  webW: number,
  webD: number,
): Shape {
  const hw = width / 2;
  const hd = depth / 2;
  const hww = webW / 2;
  const hwd = webD / 2;

  const s = new Shape();
  s.moveTo(-hww, hd);
  s.lineTo(hww, hd);
  s.lineTo(hww, hwd);
  s.lineTo(hw, hwd);
  s.lineTo(hw, -hwd);
  s.lineTo(hww, -hwd);
  s.lineTo(hww, -hd);
  s.lineTo(-hww, -hd);
  s.lineTo(-hww, -hwd);
  s.lineTo(-hw, -hwd);
  s.lineTo(-hw, hwd);
  s.lineTo(-hww, hwd);
  s.closePath();
  return s;
}
