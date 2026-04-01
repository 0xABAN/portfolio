export type BlobPos = { x: number; y: number; radius: number };

// radii approximate visual size after gooey filter (blob CSS widths: 60, 125, 75)
const RADII = [40, 70, 50] as const;

export const blobPositions: BlobPos[] = RADII.map((radius) => ({ x: -9999, y: -9999, radius }));
