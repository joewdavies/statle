import { directionMap } from "../helpers/directionMap";

// Infer the exact string-literal union of the keys ("N" | "NE" | "E" | ...):
export type DirectionKey = keyof typeof directionMap;

// Coordinate type
type Coord = { latitude: number; longitude: number };

const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => ((r * 180) / Math.PI + 360) % 360;

/** Constant-heading (loxodrome) bearing A→B */
export function getRhumbBearing(a: Coord, b: Coord): number {
  const φ1 = toRad(a.latitude);
  const φ2 = toRad(b.latitude);
  let Δλ = toRad(b.longitude - a.longitude);
  const Δψ = Math.log(
    Math.tan(Math.PI / 4 + φ2 / 2) / Math.tan(Math.PI / 4 + φ1 / 2)
  );

  // handle crossing the anti-meridian
  if (Math.abs(Δλ) > Math.PI) {
    Δλ = Δλ - Math.sign(Δλ) * 2 * Math.PI;
  }

  const θ = Math.atan2(Δλ, Δψ); // note order: x=Δψ, y=Δλ
  return toDeg(θ);
}

// Use rhumb bearing for your compass bucket
export function getCompassDirection(
  a: Coord,
  b: Coord,
  points: 8 | 16 = 8
) {
  const bearing = getRhumbBearing(a, b); // 👈 swap to rhumb if you want “intuitive” direction

  const dirs8 = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const;
  const dirs16 = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'] as const;

  return (points === 16
    ? dirs16[Math.round(bearing / 22.5) % 16]
    : dirs8[Math.round(bearing / 45) % 8]
  );
}
