// The printed calibration mat. ONE source of truth for the mat maker (tools/make-mat.ts),
// the synthetic test images and the measuring pipeline. All units are millimetres.
// A6 landscape, origin top-left, y down (like the screen).

export const MAT = {
  width: 148,
  height: 105,
  /** js-aruco2 dictionary. The detector and the printed markers MUST use the same one. */
  dictionary: 'ARUCO_MIP_36h12',
  markerSize: 20,
  markers: [
    { id: 0, x: 5, y: 5 }, // top-left
    { id: 1, x: 123, y: 5 }, // top-right
    { id: 2, x: 5, y: 80 }, // bottom-left
    { id: 3, x: 123, y: 80 }, // bottom-right
  ],
  /** Dark disc where the pill goes. Dark so white pills show up (most pills are light). */
  disc: { cx: 60, cy: 52, r: 22, color: '#2B2D31' },
  /** 50% grey for white balance + exposure. */
  grey: { x: 95, y: 30, w: 16, h: 16, color: '#808080' },
  black: { x: 113, y: 30, w: 16, h: 16, color: '#000000' },
  swatches: [
    { x: 95, y: 50, w: 8, h: 8, color: '#D9483B' },
    { x: 104, y: 50, w: 8, h: 8, color: '#5DAE6B' },
    { x: 113, y: 50, w: 8, h: 8, color: '#5B8DD6' },
    { x: 122, y: 50, w: 8, h: 8, color: '#F5D547' },
  ],
  /** Reference ring: 10 mm outside diameter (fallback scale when markers are not found). */
  ring: { cx: 136, cy: 54, r: 5, stroke: 0.8 },
} as const;

/** Marker corners in mat mm, clockwise from the marker's own top-left (js-aruco2 order). */
export function markerCornersMm(id: number): { x: number; y: number }[] {
  const m = MAT.markers.find((k) => k.id === id);
  if (!m) return [];
  const s = MAT.markerSize;
  return [
    { x: m.x, y: m.y },
    { x: m.x + s, y: m.y },
    { x: m.x + s, y: m.y + s },
    { x: m.x, y: m.y + s },
  ];
}
