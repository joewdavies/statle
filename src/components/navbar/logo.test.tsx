import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { Logo } from './logo'

describe('<Logo />', () => {
  it('keeps both theme icons in the DOM so neither has to load on switch', () => {
    const { container } = render(
      <MantineProvider>
        <Logo />
      </MantineProvider>
    )
    const srcs = [...container.querySelectorAll('img[alt="Statle logo"]')].map((i) => i.getAttribute('src'))
    expect(srcs).toEqual(['./img/statle-icon.png', './img/statle-icon-darkmode.png'])
  })

  it('marks each icon as hidden in the opposite theme', () => {
    const { container } = render(
      <MantineProvider>
        <Logo />
      </MantineProvider>
    )
    const [light, dark] = [...container.querySelectorAll('img[alt="Statle logo"]')]
    expect(light.classList.contains('mantine-dark-hidden')).toBe(true)
    expect(light.classList.contains('mantine-light-hidden')).toBe(false)
    expect(dark.classList.contains('mantine-light-hidden')).toBe(true)
    expect(dark.classList.contains('mantine-dark-hidden')).toBe(false)
  })
})
