import { describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { ReactNode } from 'react'
import { LanguageProvider, useLanguage } from './useLanguage'

const wrapper = ({ children }: { children: ReactNode }) => <LanguageProvider>{children}</LanguageProvider>

describe('useLanguage', () => {
  it('throws outside the provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => renderHook(() => useLanguage())).toThrow(/LanguageProvider/)
  })

  it('restores a stored language and sets <html lang>', () => {
    localStorage.setItem('statle-lang', 'fr')
    const { result } = renderHook(() => useLanguage(), { wrapper })
    expect(result.current.language).toBe('fr')
    expect(document.documentElement.lang).toBe('fr')
  })

  it('ignores an invalid stored language', () => {
    localStorage.setItem('statle-lang', '<script>')
    const { result } = renderHook(() => useLanguage(), { wrapper })
    expect(['en', 'es', 'fr', 'de']).toContain(result.current.language)
  })

  it('switches language, persists it and translates', () => {
    const { result } = renderHook(() => useLanguage(), { wrapper })
    act(() => result.current.setLanguage('de'))
    expect(result.current.language).toBe('de')
    expect(localStorage.getItem('statle-lang')).toBe('de')
    expect(result.current.t('definitely-missing-key')).toBe('definitely-missing-key')
  })
})
