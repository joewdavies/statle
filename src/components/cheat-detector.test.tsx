import { describe, expect, it, vi } from 'vitest'
import { act, screen } from '@testing-library/react'
import { CheatDetector } from './cheat-detector'
import { renderWithProviders } from '../test/render'

const setVisibility = (state: 'hidden' | 'visible') => {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state })
  document.dispatchEvent(new Event('visibilitychange'))
}

describe('<CheatDetector />', () => {
  it('stays closed until the user leaves and returns', () => {
    renderWithProviders(<CheatDetector />)
    expect(screen.queryByText('No cheating!')).not.toBeInTheDocument()
  })

  it('warns after the tab was hidden longer than the threshold', () => {
    vi.useFakeTimers()
    renderWithProviders(<CheatDetector threshold={1000} />)
    act(() => setVisibility('hidden'))
    vi.advanceTimersByTime(2000)
    act(() => setVisibility('visible'))
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(screen.getByText('No cheating!')).toBeInTheDocument()
  })

  it('does not warn for a quick tab switch', () => {
    vi.useFakeTimers()
    renderWithProviders(<CheatDetector threshold={1000} />)
    act(() => setVisibility('hidden'))
    vi.advanceTimersByTime(200)
    act(() => setVisibility('visible'))
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(screen.queryByText('No cheating!')).not.toBeInTheDocument()
  })

  it('also reacts to window blur and focus', () => {
    vi.useFakeTimers()
    renderWithProviders(<CheatDetector threshold={500} />)
    act(() => {
      window.dispatchEvent(new Event('blur'))
    })
    vi.advanceTimersByTime(1000)
    act(() => {
      window.dispatchEvent(new Event('focus'))
    })
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(screen.getByText('No cheating!')).toBeInTheDocument()
  })
})
