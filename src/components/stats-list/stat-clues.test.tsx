import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import { buildClues, StatClues } from './stat-clues'
import { renderWithProviders } from '../../test/render'

const id = (k: string) => k
const country = { code: 'XX', name: 'Testland', latitude: 0, longitude: 0 }

const FULL = {
  population: 1234567,
  area: 5000,
  gdpPerCapita: 42000,
  lifeExpectancy: 81.26,
  goats: 99,
  carSide: 'left',
  forestArea: 1200,
  precipitation: 700,
  co2: 4.5,
  airPassengers: 2_500_000,
  electricity: 100,
  unemployment: 5.55,
  gdp: 3_000_000_000,
  tax: 12.345,
  corruption: 77,
  bribes: 3,
  cereal: 9_000_000,
  landlocked: true,
  borders: ['FR', 'ES'],
}

describe('buildClues', () => {
  it('returns no clues without stats', () => {
    expect(buildClues(null, id, 'en')).toEqual([])
    expect(buildClues(undefined, id, 'en')).toEqual([])
    expect(buildClues({}, id, 'en')).toEqual([])
  })

  it('reveals the five core clues first, in a fixed order', () => {
    const keys = buildClues(FULL as any, id, 'en').map((c) => c.key)
    expect(keys.slice(0, 5)).toEqual(['population', 'area', 'gdpPerCapita', 'lifeExpectancy', 'goats'])
    expect(keys).toEqual([
      'population', 'area', 'gdpPerCapita', 'lifeExpectancy', 'goats', 'carSide',
      'forestArea', 'precipitation', 'co2', 'airPassengers', 'electricity',
      'unemployment', 'gdp', 'tax', 'corruption', 'bribes', 'cereal', 'landlocked', 'borders',
    ])
  })

  it('formats values with units', () => {
    const byKey = Object.fromEntries(buildClues(FULL as any, id, 'en').map((c) => [c.key, c.value]))
    expect(byKey.population).toBe('1,234,567')
    expect(byKey.area).toBe('5,000 km²')
    expect(byKey.gdpPerCapita).toBe('$42,000')
    expect(byKey.lifeExpectancy).toBe('81.3 years of age')
    expect(byKey.tax).toBe('12.3')
    expect(byKey.unemployment).toBe('5.6%')
    expect(byKey.landlocked).toBe('')
    expect(byKey.carSide).toBe('left')
  })

  it('formats numbers using the active language', () => {
    const de = buildClues({ population: 1234567 }, id, 'de')[0].value
    expect(de).toBe('1.234.567')
    const fr = buildClues({ population: 1234567 }, id, 'fr')[0].value
    expect(fr).toMatch(/^1\s234\s567$/)
  })

  it('translates labels and the driving side', () => {
    const t = (k: string) => `T(${k})`
    const clues = buildClues({ population: 1, carSide: 'right' }, t, 'en')
    expect(clues[0].label).toBe('T(Population)')
    expect(clues[1].value).toBe('T(right)')
  })

  it('skips missing, non-numeric and non-finite values', () => {
    const clues = buildClues(
      { population: null, area: NaN, gdpPerCapita: Infinity, lifeExpectancy: '80' as any, goats: 0 },
      id,
      'en'
    )
    expect(clues.map((c) => c.key)).toEqual(['goats'])
  })

  it('keeps zero as a valid value', () => {
    expect(buildClues({ goats: 0 }, id, 'en')[0].value).toBe('0')
  })

  it('only shows landlocked when true and borders when non-empty', () => {
    expect(buildClues({ landlocked: false, borders: [] }, id, 'en')).toEqual([])
    expect(buildClues({ landlocked: true }, id, 'en').map((c) => c.key)).toEqual(['landlocked'])
  })
})

describe('<StatClues />', () => {
  const statsByCode = { XX: { population: 1000, area: 2000, gdpPerCapita: 3000, lifeExpectancy: 70, goats: 5 } }
  const render = (props: Partial<Parameters<typeof StatClues>[0]> = {}) =>
    renderWithProviders(
      <StatClues country={country} guessCount={0} gameEnded={false} revealAll={false} statsByCode={statsByCode as any} {...props} />
    )

  it('reveals one clue at the start and one more per guess', () => {
    const { unmount } = render({ guessCount: 0 })
    expect(screen.getByText(/Population/)).toBeInTheDocument()
    expect(screen.queryByText(/Area/)).not.toBeInTheDocument()
    expect(screen.getByText('1 / 6')).toBeInTheDocument()
    unmount()

    render({ guessCount: 2 })
    expect(screen.getByText(/GDP per capita/)).toBeInTheDocument()
    expect(screen.queryByText(/Life expectancy/)).not.toBeInTheDocument()
  })

  it('never reveals more clues than exist', () => {
    render({ guessCount: 50 })
    expect(screen.getByText(/Goat population/)).toBeInTheDocument()
    expect(screen.getByText('5 / 6')).toBeInTheDocument()
  })

  it('shows the full factsheet once revealAll is set', () => {
    render({ guessCount: 0, gameEnded: true, revealAll: true })
    expect(screen.getByText('Factsheet')).toBeInTheDocument()
    expect(screen.getByText(/Goat population/)).toBeInTheDocument()
    expect(screen.queryByText('1 / 6')).not.toBeInTheDocument()
  })

  it('shows a loading state when stats are not available', () => {
    render({ statsByCode: undefined })
    expect(screen.getByText('Fetching latest stats…')).toBeInTheDocument()
  })

  it('shows an empty state when a country has no clues', () => {
    render({ statsByCode: { XX: {} } as any })
    expect(screen.getByText('No stats available (yet).')).toBeInTheDocument()
  })

  it('lists short border sets as names and long ones as flags', () => {
    const { unmount } = render({
      guessCount: 0,
      revealAll: true,
      statsByCode: { XX: { borders: ['FR', 'ES'] } } as any,
    })
    expect(screen.getByText('France, Spain')).toBeInTheDocument()
    unmount()

    render({
      guessCount: 0,
      revealAll: true,
      statsByCode: { XX: { borders: ['FR', 'ES', 'DE', 'IT', 'BE', 'CH', 'AT'] } } as any,
    })
    expect(screen.getAllByRole('img')).toHaveLength(7)
  })
})
