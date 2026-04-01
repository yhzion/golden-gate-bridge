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
