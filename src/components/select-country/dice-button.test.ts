import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { animateDiceRoll, cleanupDiceRollTimer, DICE_ANIMATION_DURATION } from './dice-button'

function makeButton() {
  const button = document.createElement('button')
  const wrapper = document.createElement('span')
  wrapper.className = 'dice-wrapper'
  button.appendChild(wrapper)
  document.body.appendChild(button)
  return { button, wrapper }
}

function mockReducedMotion(reduced: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockReturnValue({ matches: reduced, addEventListener: vi.fn(), removeEventListener: vi.fn() })
  )
}

describe('animateDiceRoll', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockReducedMotion(false)
  })
  afterEach(() => {
    cleanupDiceRollTimer()
    vi.useRealTimers()
    vi.unstubAllGlobals()
    document.body.innerHTML = ''
  })

  it('does nothing without a button or without the dice wrapper', () => {
    expect(() => animateDiceRoll(null)).not.toThrow()
    const bare = document.createElement('button')
    animateDiceRoll(bare)
    expect(bare.disabled).toBe(false)
    expect(bare.dataset.rolling).toBeUndefined()
  })

  it('locks the button and starts the animation', () => {
    const { button, wrapper } = makeButton()
    animateDiceRoll(button)
    expect(button.disabled).toBe(true)
    expect(button.dataset.rolling).toBe('true')
    expect(button.getAttribute('aria-busy')).toBe('true')
    expect(wrapper.classList.contains('rolling')).toBe(true)
    expect(wrapper.style.getPropertyValue('--roll-duration')).toBe(`${DICE_ANIMATION_DURATION}ms`)
    for (const v of ['--final-rotateX', '--final-rotateY', '--final-rotateZ']) {
      expect(wrapper.style.getPropertyValue(v)).toMatch(/deg$/)
    }
  })

  it('unlocks and clears the animation once the duration passes', () => {
    const { button, wrapper } = makeButton()
    animateDiceRoll(button)
    vi.advanceTimersByTime(DICE_ANIMATION_DURATION + 80)
    expect(button.disabled).toBe(false)
    expect(button.dataset.rolling).toBeUndefined()
    expect(button.hasAttribute('aria-busy')).toBe(false)
    expect(wrapper.classList.contains('rolling')).toBe(false)
    expect(wrapper.style.getPropertyValue('--final-rotateX')).toBe('')
  })

  it('stays locked until the duration has elapsed', () => {
    const { button } = makeButton()
    animateDiceRoll(button)
    vi.advanceTimersByTime(DICE_ANIMATION_DURATION - 1)
    expect(button.disabled).toBe(true)
  })

  it('cleans up shortly after animationend fires', () => {
    const { button, wrapper } = makeButton()
    animateDiceRoll(button)
    wrapper.dispatchEvent(new Event('animationend'))
    vi.advanceTimersByTime(25)
    expect(button.disabled).toBe(false)
    expect(wrapper.classList.contains('rolling')).toBe(false)
  })

  it('ignores a second trigger while rolling', () => {
    const { button, wrapper } = makeButton()
    animateDiceRoll(button)
    const before = wrapper.style.getPropertyValue('--final-rotateZ')
    vi.spyOn(Math, 'random').mockReturnValue(0.123)
    animateDiceRoll(button)
    expect(wrapper.style.getPropertyValue('--final-rotateZ')).toBe(before)
  })

  it('can be rolled again after finishing', () => {
    const { button, wrapper } = makeButton()
    animateDiceRoll(button)
    vi.advanceTimersByTime(DICE_ANIMATION_DURATION + 80)
    animateDiceRoll(button)
    expect(button.disabled).toBe(true)
    expect(wrapper.classList.contains('rolling')).toBe(true)
  })

  it('uses a short, gentle animation when reduced motion is preferred', () => {
    mockReducedMotion(true)
    const { button, wrapper } = makeButton()
    animateDiceRoll(button)
    expect(button.disabled).toBe(true)
    expect(wrapper.classList.contains('rolling')).toBe(false)
    expect(wrapper.style.transform).toBe('rotateZ(12deg)')
    vi.advanceTimersByTime(200)
    expect(button.disabled).toBe(false)
    expect(wrapper.style.transform).toBe('')
  })

  it('cleanupDiceRollTimer cancels a pending unlock', () => {
    const { button } = makeButton()
    animateDiceRoll(button)
    cleanupDiceRollTimer()
    vi.advanceTimersByTime(DICE_ANIMATION_DURATION + 200)
    expect(button.disabled).toBe(true)
  })
})
