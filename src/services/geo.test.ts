import { describe, expect, it } from 'vitest'
import { directionMap, getCompassDirection, getRhumbBearing, sharesLandBorder } from './geo'

const at = (latitude: number, longitude: number) => ({ latitude, longitude })

describe('getRhumbBearing', () => {
  it('points north, east, south and west on cardinal lines', () => {
    expect(getRhumbBearing(at(0, 0), at(10, 0))).toBeCloseTo(0, 5)
    expect(getRhumbBearing(at(0, 0), at(0, 10))).toBeCloseTo(90, 5)
    expect(getRhumbBearing(at(10, 0), at(0, 0))).toBeCloseTo(180, 5)
    expect(getRhumbBearing(at(0, 10), at(0, 0))).toBeCloseTo(270, 5)
  })

  it('takes the short way across the anti-meridian', () => {
    expect(getRhumbBearing(at(0, 179), at(0, -179))).toBeCloseTo(90, 5)
    expect(getRhumbBearing(at(0, -179), at(0, 179))).toBeCloseTo(270, 5)
  })

  it('always returns a bearing in [0, 360)', () => {
    for (const [a, b] of [
      [at(51, 0), at(-33, 151)],
      [at(-33, 151), at(51, 0)],
      [at(64, -21), at(-54, -68)],
    ] as const) {
      const bearing = getRhumbBearing(a, b)
      expect(bearing).toBeGreaterThanOrEqual(0)
      expect(bearing).toBeLessThan(360)
    }
  })
})

describe('getCompassDirection', () => {
  it('buckets bearings into 8 points', () => {
    expect(getCompassDirection(at(0, 0), at(10, 0))).toBe('N')
    expect(getCompassDirection(at(0, 0), at(0, 10))).toBe('E')
    expect(getCompassDirection(at(10, 0), at(0, 0))).toBe('S')
    expect(getCompassDirection(at(0, 10), at(0, 0))).toBe('W')
    expect(getCompassDirection(at(0, 0), at(10, 10))).toBe('NE')
  })

  it('wraps bearings near 360 back to north', () => {
    expect(getCompassDirection(at(0, 0), at(10, -0.5))).toBe('N')
  })

  it('supports 16 points', () => {
    expect(getCompassDirection(at(0, 0), at(10, 0), 16)).toBe('N')
    expect(getCompassDirection(at(0, 0), at(0, 10), 16)).toBe('E')
  })

  it('has an arrow for every direction it can return', () => {
    for (const dir of ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const) {
      expect(directionMap[dir]).toBeTruthy()
    }
  })
})

describe('sharesLandBorder', () => {
  const data = { FR: { borders: ['ES', 'DE'] }, ES: { borders: ['FR'] }, JP: { borders: [] } }

  it('detects borders from either side', () => {
    expect(sharesLandBorder('FR', 'ES', data)).toBe(true)
    expect(sharesLandBorder('DE', 'FR', data)).toBe(true)
  })

  it('returns false when no border exists or data is missing', () => {
    expect(sharesLandBorder('JP', 'FR', data)).toBe(false)
    expect(sharesLandBorder('XX', 'YY', data)).toBe(false)
  })
})
