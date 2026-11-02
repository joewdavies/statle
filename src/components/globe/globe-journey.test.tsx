import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from '@testing-library/react'
import GlobeJourney from './globe-journey'
import { renderWithProviders } from '../../test/render'
import { countries } from '../../data/countries/countries'

// A canvas 2D context whose every method and property is a harmless stub.
const contexts = new WeakMap<HTMLCanvasElement, any>()
function fakeContext(canvas: HTMLCanvasElement) {
  const calls: Record<string, any[][]> = {}
  const deep = (): any =>
    new Proxy(function () {}, {
      get: (_t, p) => (p === Symbol.toPrimitive ? () => 0 : deep()),
      apply: () => deep(),
      set: () => true,
    })
  const ctx = new Proxy(
    {},
    {
      get: (_t, p: string) => {
        if (p === 'canvas') return canvas
        if (p === '__calls') return calls
        return (...args: any[]) => {
          ;(calls[p] ??= []).push(args)
          return deep()
        }
      },
      set: () => true,
    }
  )
  return ctx
}

type RO = { cb: ResizeObserverCallback; disconnected: boolean }
let observers: RO[] = []
let rect = { width: 0, height: 0 }

class CapturingResizeObserver {
  entry: RO
  constructor(cb: ResizeObserverCallback) {
    this.entry = { cb, disconnected: false }
    observers.push(this.entry)
  }
  observe() {}
  unobserve() {}
  disconnect() {
    this.entry.disconnected = true
  }
}

const setVisibility = (state: 'visible' | 'hidden') =>
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state })

const fireResize = () =>
  act(() => {
    observers.filter((o) => !o.disconnected).forEach((o) => o.cb([], {} as ResizeObserver))
  })

const guessesFor = (...codes: string[]) =>
  codes.map((c) => {
    const k = countries.find((x) => x.code === c)!
    return { code: k.code, name: k.name, latitude: k.latitude, longitude: k.longitude }
  })

const renderGlobe = (props: Partial<React.ComponentProps<typeof GlobeJourney>> = {}) => {
  const view = renderWithProviders(
    <GlobeJourney
      guesses={guessesFor('DE', 'ES')}
      correctCountry={countries.find((c) => c.code === 'FR')}
      {...props}
    />
  )
  const canvas = view.container.querySelector('canvas') as HTMLCanvasElement
  const wrapper = canvas.parentElement as HTMLElement
  return { ...view, canvas, wrapper }
}

beforeEach(() => {
  observers = []
  rect = { width: 0, height: 0 }
  setVisibility('visible')
  Object.defineProperty(window, 'devicePixelRatio', { configurable: true, value: 2 })
  vi.stubGlobal('ResizeObserver', CapturingResizeObserver)
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
    () => ({ ...rect, top: 0, left: 0, right: rect.width, bottom: rect.height, x: 0, y: 0, toJSON() {} }) as DOMRect
  )
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
    if (!contexts.has(this)) contexts.set(this, fakeContext(this))
    return contexts.get(this)
  } as any)
})

afterEach(() => {
  setVisibility('visible')
  Object.defineProperty(window, 'devicePixelRatio', { configurable: true, value: 1 })
})

describe('<GlobeJourney /> interaction and drawing', () => {
  const calls = (canvas: HTMLCanvasElement) => contexts.get(canvas).__calls as Record<string, any[][]>
  const touch = (x: number, y: number) => ({ clientX: x, clientY: y, identifier: 0, target: document.body })

  function dispatch(canvas: HTMLCanvasElement, type: string, init: any = {}) {
    const evt = new Event(type, { bubbles: true, cancelable: true })
    Object.assign(evt, init)
    act(() => {
      canvas.dispatchEvent(evt)
    })
    return evt
  }

  it('draws the ocean, the land and a marker for each guess on first paint', () => {
    const { canvas } = renderGlobe({ width: 400, height: 400 })
    const c = calls(canvas)
    expect(c.clearRect[0]).toEqual([0, 0, 400, 400])
    expect(c.fill.length).toBeGreaterThanOrEqual(3)
    expect(c.arc.length).toBeGreaterThanOrEqual(2)
  })

  it('draws a flight line between guesses once the journey has advanced', async () => {
    const { canvas } = renderGlobe({ width: 400, height: 400, rotateDuration: 10, stepDuration: 10 })
    await vi.waitFor(() => expect(calls(canvas).lineTo?.length ?? 0).toBeGreaterThan(0), { timeout: 3000 })
    expect(calls(canvas).moveTo.length).toBeGreaterThan(0)
  })

  it('prevents page scroll for wheel gestures on the globe but not outside it', () => {
    const { canvas } = renderGlobe({ width: 400, height: 400 })
    expect(dispatch(canvas, 'wheel', { clientX: 200, clientY: 200 }).defaultPrevented).toBe(true)
    expect(dispatch(canvas, 'wheel', { clientX: 2, clientY: 2 }).defaultPrevented).toBe(false)
  })

  it('locks body scroll while touching the globe and unlocks on touch end', () => {
    const { canvas } = renderGlobe({ width: 400, height: 400 })
    const start = dispatch(canvas, 'touchstart', { touches: [touch(200, 200)], changedTouches: [touch(200, 200)] })
    expect(start.defaultPrevented).toBe(true)
    expect(document.body.style.overflow).toBe('hidden')
    expect(dispatch(canvas, 'touchmove', { touches: [touch(200, 200)], changedTouches: [touch(200, 200)] }).defaultPrevented).toBe(true)
    dispatch(canvas, 'touchend', { changedTouches: [touch(200, 200)] })
    expect(document.body.style.overflow).toBe('')
  })

  it('does not lock scroll when the touch starts outside the globe', () => {
    const { canvas } = renderGlobe({ width: 400, height: 400 })
    const start = dispatch(canvas, 'touchstart', { touches: [touch(2, 2)], changedTouches: [touch(2, 2)] })
    expect(start.defaultPrevented).toBe(false)
    expect(document.body.style.overflow).toBe('')
    expect(dispatch(canvas, 'touchmove', { touches: [touch(2, 2)], changedTouches: [touch(2, 2)] }).defaultPrevented).toBe(false)
  })

  it('never leaves the page scroll-locked after unmount', () => {
    const { canvas, unmount } = renderGlobe({ width: 400, height: 400 })
    dispatch(canvas, 'touchstart', { touches: [touch(200, 200)], changedTouches: [touch(200, 200)] })
    expect(document.body.style.overflow).toBe('hidden')
    unmount()
    expect(document.body.style.overflow).toBe('')
    expect(document.body.style.overscrollBehavior).not.toBe('contain')
  })

  it('swallows a double-tap on the globe so the browser does not also zoom the page', () => {
    const { canvas } = renderGlobe({ width: 400, height: 400 })
    const tap = () => dispatch(canvas, 'touchend', { changedTouches: [touch(200, 200)] })
    expect(tap().defaultPrevented).toBe(false)
    expect(tap().defaultPrevented).toBe(true)
  })

  it('does not treat two distant taps as a double-tap', () => {
    const { canvas } = renderGlobe({ width: 400, height: 400 })
    dispatch(canvas, 'touchend', { changedTouches: [touch(150, 200)] })
    expect(dispatch(canvas, 'touchend', { changedTouches: [touch(250, 200)] }).defaultPrevented).toBe(false)
  })

  it('does not treat a slow second tap as a double-tap', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    const { canvas } = renderGlobe({ width: 400, height: 400 })
    dispatch(canvas, 'touchend', { changedTouches: [touch(200, 200)] })
    vi.setSystemTime(Date.now() + 500)
    expect(dispatch(canvas, 'touchend', { changedTouches: [touch(200, 200)] }).defaultPrevented).toBe(false)
  })

  it('ignores a double-tap outside the globe', () => {
    const { canvas } = renderGlobe({ width: 400, height: 400 })
    dispatch(canvas, 'touchend', { changedTouches: [touch(2, 2)] })
    expect(dispatch(canvas, 'touchend', { changedTouches: [touch(2, 2)] }).defaultPrevented).toBe(false)
  })

  it('repaints at the right size when the browser restores a lost canvas context', async () => {
    const { canvas } = renderGlobe({ width: 400, height: 400 })
    const c = calls(canvas)
    const before = c.setTransform.length
    const clears = c.clearRect.length
    dispatch(canvas, 'contextrestored')
    expect(c.setTransform.length).toBe(before + 1)
    expect(c.setTransform[c.setTransform.length - 1]).toEqual([2, 0, 0, 2, 0, 0])
    await vi.waitFor(() => expect(c.clearRect.length).toBeGreaterThan(clears))
  })

  it('does not repaint while the tab is hidden', () => {
    const { canvas } = renderGlobe({ width: 400, height: 400 })
    const c = calls(canvas)
    const before = c.setTransform.length
    setVisibility('hidden')
    dispatch(canvas, 'contextrestored')
    expect(c.setTransform.length).toBe(before)
  })
})

describe('<GlobeJourney /> sizing (mobile tab-restore regression)', () => {
  it('renders a canvas sized from the props when the container has no layout yet', () => {
    const { canvas } = renderGlobe({ width: 400, height: 400 })
    expect(canvas.width).toBe(800)
    expect(canvas.height).toBe(800)
  })

  it('fills its container instead of being pinned to a fixed corner size', () => {
    const { canvas, wrapper } = renderGlobe({ width: 400, height: 300 })
    expect(wrapper.style.width).toBe('100%')
    expect(wrapper.style.maxWidth).toBe('400px')
    expect(wrapper.style.aspectRatio).toMatch(/400\s*\/\s*300/)
    expect(canvas.style.width).toBe('100%')
    expect(canvas.style.height).toBe('100%')
  })

  it('re-measures the container when it is resized', () => {
    const { canvas } = renderGlobe({ width: 400, height: 400 })
    rect = { width: 300, height: 300 }
    fireResize()
    expect(canvas.width).toBe(600)
    expect(canvas.height).toBe(600)
  })

  it('shrinks and grows with the container', () => {
    const { canvas } = renderGlobe()
    for (const size of [200, 350, 120, 400]) {
      rect = { width: size, height: size }
      fireResize()
      expect(canvas.width).toBe(size * 2)
      expect(canvas.height).toBe(size * 2)
    }
  })

  it('re-measures on window resize', () => {
    const { canvas } = renderGlobe()
    rect = { width: 250, height: 250 }
    act(() => {
      window.dispatchEvent(new Event('resize'))
    })
    expect(canvas.width).toBe(500)
  })

  it('recovers the right size when the page is restored from the back/forward cache', () => {
    const { canvas } = renderGlobe()
    rect = { width: 320, height: 320 }
    act(() => {
      window.dispatchEvent(new Event('pageshow'))
    })
    expect(canvas.width).toBe(640)
    expect(canvas.height).toBe(640)
  })

  it('recovers the right size when an old tab becomes visible again', () => {
    const { canvas } = renderGlobe()
    setVisibility('hidden')
    rect = { width: 280, height: 280 }
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(canvas.width).toBe(800)

    setVisibility('visible')
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(canvas.width).toBe(560)
  })

  it('ignores the zero-sized layout reported while a tab is hidden', () => {
    const { canvas } = renderGlobe({ width: 400, height: 400 })
    rect = { width: 300, height: 300 }
    fireResize()
    setVisibility('hidden')
    rect = { width: 0, height: 0 }
    fireResize()
    expect(canvas.width).toBe(600)
  })

  it('adapts the backing store when the device pixel ratio changes', () => {
    const { canvas } = renderGlobe()
    rect = { width: 300, height: 300 }
    fireResize()
    expect(canvas.width).toBe(600)
    Object.defineProperty(window, 'devicePixelRatio', { configurable: true, value: 3 })
    act(() => {
      window.dispatchEvent(new Event('resize'))
    })
    expect(canvas.width).toBe(900)
    expect(canvas.height).toBe(900)
  })

  it('resets the canvas transform to the new scale instead of stacking scales', () => {
    const { canvas } = renderGlobe()
    rect = { width: 300, height: 300 }
    fireResize()
    const calls = contexts.get(canvas).__calls as Record<string, any[][]>
    expect(calls.setTransform[calls.setTransform.length - 1]).toEqual([2, 0, 0, 2, 0, 0])
    expect(calls.scale).toBeUndefined()
  })

  it('keeps the drawing inside the canvas after a resize', () => {
    const { canvas } = renderGlobe()
    rect = { width: 300, height: 300 }
    fireResize()
    const calls = contexts.get(canvas).__calls as Record<string, any[][]>
    expect(calls.clearRect[calls.clearRect.length - 1]).toEqual([0, 0, 300, 300])
  })

  it('renders without a context available (unsupported canvas)', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
    expect(() => renderGlobe()).not.toThrow()
  })

  it('renders with no guesses', () => {
    expect(() => renderGlobe({ guesses: [] })).not.toThrow()
  })

  it('stops observing and listening after unmount', () => {
    const { canvas, unmount } = renderGlobe()
    unmount()
    expect(observers.every((o) => o.disconnected)).toBe(true)
    rect = { width: 100, height: 100 }
    expect(() => {
      window.dispatchEvent(new Event('resize'))
      window.dispatchEvent(new Event('pageshow'))
      document.dispatchEvent(new Event('visibilitychange'))
    }).not.toThrow()
    expect(canvas.width).toBe(800)
  })
})
