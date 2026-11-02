import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { LandBorders } from './land-borders'
import { LanguageProvider } from '../../hooks/useLanguage'

const renderBorders = (borders: string[]) =>
  render(
    <MantineProvider>
      <LanguageProvider>
        <LandBorders borders={borders} />
      </LanguageProvider>
    </MantineProvider>
  )

describe('LandBorders', () => {
  it('renders one flag per neighbour with flagcdn sources', () => {
    renderBorders(['FR', 'EL'])
    const imgs = screen.getAllByRole('img')
    expect(imgs).toHaveLength(2)
    expect(imgs[0]).toHaveAttribute('src', 'https://flagcdn.com/w160/fr.png')
    expect(imgs[1]).toHaveAttribute('src', 'https://flagcdn.com/w160/gr.png')
  })

  it('renders nothing visible for an empty list', () => {
    renderBorders([])
    expect(screen.queryAllByRole('img')).toHaveLength(0)
  })

  it('falls back to the code for unknown countries', () => {
    renderBorders(['ZZ'])
    expect(screen.getByLabelText('ZZ')).toBeInTheDocument()
  })
})
