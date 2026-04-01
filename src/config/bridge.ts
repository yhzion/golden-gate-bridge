export const BRIDGE = {
  mainSpan: 1280,
  sideSpan: 343,
  totalLength: 1966,
  deckH: 67,
  deckW: 27.4,
  towerH: 227,
  cableR: 0.46,
  cableSag: 84,
  suspSpacing: 15.2,
  color: 0xc04530, // International Orange
} as const;

export const LANE_W = 3.0;
export const LANES = [-6.75, -3.75, -0.75, 0.75, 3.75, 6.75] as const;

export const CAR_COLORS = [
  0xffffff, 0xffffff, 0xcccccc, 0xbbbbbb, 0x222222, 0x111111,
  0x333333, 0xcc2222, 0x2244aa, 0x226622, 0xddaa22, 0x882244, 0x445566,
] as const;

export const TOWER = {
  colSpacing: 15.7,
  baseW: 8,
  baseD: 5.5,
  flangeW: 2.8,
  flangeD: 2.0,
  sections: [
    { y0: -15, h: 82, scale: 1.25 },
    { y0: 67, h: 45, scale: 1.0 },
    { y0: 112, h: 45, scale: 0.88 },
    { y0: 157, h: 40, scale: 0.78 },
    { y0: 197, h: 30, scale: 0.7 },
  ],
  portalYs: [67, 112, 157, 197, 225] as readonly number[],
  portalH: 3.5,
  cellsPerSection: 4,
  cellH: 16,
  cellSpacing: 22,
} as const;

export const CABLE = {
  mainR: 0.46,
  bandW: 0.6,
  bandR: 0.55,
  suspR: 0.04,
  suspPairGap: 0.3,
  saddleW: 3.5,
  saddleH: 3,
  saddleD: 5,
} as const;

export const DECK = {
  trussH: 7.6,
  trussThick: 0.3,
  panelLen: 7.6,
  floorBeamH: 1.2,
  floorBeamWebT: 0.12,
  floorBeamFlangeT: 0.18,
  stringerW: 0.5,
  stringerH: 0.8,
  railH: 1.2,
  railPicketSpacing: 0.15,
  lightSpacing: 50,
} as const;
