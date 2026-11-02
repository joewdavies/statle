import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import { buildClues, StatClues } from './stat-clues'
import { renderWithProviders } from '../../test/render'
import { translations } from '../../i18n/translations'

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
  electricity: 99.6,
  unemployment: 5.55,
  gdp: 3_000_000_000,
  tax: 12.345,
  corruption: 77.4,
  bribes: 3.2,
  cereal: 9_000_000,
  landlocked: true,
  borders: ['FR', 'ES'],
}

describe('buildClues labels and values (exact)', () => {
  const clues = buildClues(FULL as any, id, 'en')
  const by = Object.fromEntries(clues.map((c) => [c.key, c]))

  it('uses the expected label for every clue', () => {
    expect(Object.fromEntries(clues.map((c) => [c.key, c.label]))).toEqual({
      population: 'Population',
      area: 'Area',
      gdpPerCapita: 'GDP per capita',
      lifeExpectancy: 'Life expectancy',
      goats: 'Goat population',
      carSide: 'Drives on the',
      forestArea: 'Forest area',
      precipitation: 'Annual precipitation',
      co2: 'CO2 per capita',
      airPassengers: 'Air Passengers',
      electricity: 'Access to electricity',
      unemployment: 'Unemployment rate',
      gdp: 'GDP',
      tax: 'Tax revenue (% of GDP)',
      corruption: 'Control of Corruption (0-100 score)',
      bribes: '% of firms that bribe public officials',
      cereal: 'Cereal production',
      landlocked: 'Landlocked',
      borders: 'Land borders',
    })
  })

  it('formats every value with the right unit', () => {
    expect(by.population.value).toBe('1,234,567')
    expect(by.area.value).toBe('5,000 km²')
    expect(by.gdpPerCapita.value).toBe('$42,000')
    expect(by.lifeExpectancy.value).toBe('81.3 years of age')
    expect(by.goats.value).toBe('99')
    expect(by.carSide.value).toBe('left')
    expect(by.forestArea.value).toBe('1,200 km²')
    expect(by.precipitation.value).toBe('700 mm')
    expect(by.co2.value).toBe('5 tonnes')
    expect(by.airPassengers.value).toBe('2.5 million')
    expect(by.electricity.value).toBe('100% of population')
    expect(by.unemployment.value).toBe('5.6%')
    expect(by.gdp.value).toBe('$3 billion')
    expect(by.tax.value).toBe('12.3')
    expect(by.corruption.value).toBe('77')
    expect(by.bribes.value).toBe('3')
    expect(by.cereal.value).toBe('9 million tonnes')
    expect(by.landlocked.value).toBe('')
    expect(by.borders.value).toEqual(['FR', 'ES'])
  })

  it('has a translation for every label and unit in every language', () => {
    const used = new Set<string>()
    const spy = (k: string) => (used.add(k), k)
    buildClues({ ...FULL, carSide: 'right' } as any, spy, 'en')
    buildClues({ carSide: 'left' } as any, spy, 'en')
    for (const lang of ['es', 'fr', 'de'] as const) {
      for (const key of used) {
        expect((translations as any)[lang][key], `${lang}: "${key}"`).toBeTruthy()
      }
    }
  })
})

describe('<StatClues /> presentation', () => {
  const statsByCode = {
    XX: { population: 1000, area: 2000, gdpPerCapita: 3000, landlocked: true, borders: ['AAAAAAAAAAAAA', 'BBBBBBBBBBBBB'] },
  }
  const render = (props: Partial<Parameters<typeof StatClues>[0]> = {}) =>
    renderWithProviders(
      <StatClues country={country} guessCount={0} gameEnded={false} revealAll={false} statsByCode={statsByCode as any} {...props} />
    )

  it('highlights only the newest clue while the game is running', () => {
    const { container } = render({ guessCount: 2 })
    const boxes = container.querySelectorAll('.stat-clue-box')
    expect(boxes).toHaveLength(3)
    expect(container.querySelectorAll('.new-clue')).toHaveLength(1)
    expect(boxes[2].classList.contains('new-clue')).toBe(true)
    expect(boxes[0].classList.contains('new-clue')).toBe(false)
  })

  it('does not highlight anything once the game has ended', () => {
    const { container } = render({ guessCount: 2, gameEnded: true })
    expect(container.querySelectorAll('.stat-clue-box')).toHaveLength(3)
    expect(container.querySelectorAll('.new-clue')).toHaveLength(0)
  })

  it('shows a colon after labels, except for landlocked', () => {
    const { container } = render({ guessCount: 3 })
    const labels = [...container.querySelectorAll('.stat-label')].map((n) => n.textContent)
    expect(labels).toEqual(['Population: ', 'Area: ', 'GDP per capita: ', 'Landlocked '])
  })

  it('shows border codes it does not know as they are, up to the length cutoff', () => {
    // "AAAAAAAAAAAAA, BBBBBBBBBBBBB" is exactly 28 characters
    render({ guessCount: 4, revealAll: true })
    expect(screen.getByText('AAAAAAAAAAAAA, BBBBBBBBBBBBB')).toBeInTheDocument()
  })

  it('switches to flags just past the cutoff', () => {
    render({
      revealAll: true,
      statsByCode: { XX: { borders: ['AAAAAAAAAAAAA', 'BBBBBBBBBBBBBB'] } } as any,
    })
    expect(screen.queryByText('AAAAAAAAAAAAA, BBBBBBBBBBBBBB')).not.toBeInTheDocument()
  })

  it('shows localized border names', () => {
    localStorage.setItem('statle-lang', 'de')
    render({ revealAll: true, statsByCode: { XX: { borders: ['FR', 'DE'] } } as any })
    expect(screen.getByText('Frankreich, Deutschland')).toBeInTheDocument()
  })

  it('renders nothing for an empty border list', () => {
    const { container } = render({ revealAll: true, statsByCode: { XX: { borders: [], population: 1 } } as any })
    expect(container.querySelectorAll('.stat-clue-box')).toHaveLength(1)
  })

  it('does not show the loading or empty message when clues exist', () => {
    render()
    expect(screen.queryByText('Fetching latest stats…')).not.toBeInTheDocument()
    expect(screen.queryByText('No stats available (yet).')).not.toBeInTheDocument()
  })

  it('shows the loading message but no empty message while loading', () => {
    render({ statsByCode: undefined })
    expect(screen.getByText('Fetching latest stats…')).toBeInTheDocument()
    expect(screen.queryByText('No stats available (yet).')).not.toBeInTheDocument()
  })

  it('titles the card Clues during play and Factsheet at the end', () => {
    const { unmount } = render()
    expect(screen.getByText('Clues')).toBeInTheDocument()
    unmount()
    render({ revealAll: true })
    expect(screen.getByText('Factsheet')).toBeInTheDocument()
    expect(screen.queryByText('Clues')).not.toBeInTheDocument()
  })
})
