import { directionMap } from "../helpers/directionMap";

// Infer the exact string-literal union of the keys ("N" | "NE" | "E" | ...):
export type DirectionKey = keyof typeof directionMap;

// Coordinate type
type Coord = { latitude: number; longitude: number };

// Compute bearing
export function getBearing(a: Coord, b: Coord): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => ((r * 180) / Math.PI + 360) % 360;

  const φ1 = toRad(a.latitude);
  const φ2 = toRad(b.latitude);
  const Δλ = toRad(b.longitude - a.longitude);

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

  return toDeg(Math.atan2(y, x));
}

// Compute direction key (8- or 16-point compass)
export function getCompassDirection(
  a: Coord,
  b: Coord,
  points: 8 | 16 = 8
): DirectionKey {
  const bearing = getBearing(a, b);

  const dirs8 = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const;
  const dirs16 = [
    'N', 'NNE', 'NE', 'ENE',
    'E', 'ESE', 'SE', 'SSE',
    'S', 'SSW', 'SW', 'WSW',
    'W', 'WNW', 'NW', 'NNW',
  ] as const;

  return (points === 16
    ? dirs16[Math.round(bearing / 22.5) % 16]
    : dirs8[Math.round(bearing / 45) % 8]
  ) as DirectionKey;
}