// src/components/globe-journey.tsx
import { useEffect, useRef } from 'react';
import { zoom as d3Zoom, zoomIdentity } from 'd3-zoom';
import { geoOrthographic, geoPath, geoInterpolate } from 'd3-geo';
import { easeCubicInOut } from 'd3-ease';
import { interpolate } from 'd3-interpolate';
import { timer, now } from 'd3-timer';
import { mean } from 'd3-array';
import { feature } from 'topojson-client';
import worldTopoJSON from '../../data/world-topo.json';
//@ts-ignore
import versor from 'versor';
import { useMantineColorScheme } from '@mantine/core';
import { Country } from '../../data/countries/countries';
import { select, pointers } from 'd3-selection';

type Guess = {
  code?: string;
  name?: string;
  latitude: number;
  longitude: number;
};

type Props = {
  guesses: Guess[];
  width?: number;
  height?: number;
  stepDuration?: number;
  rotateDuration?: number;
  markerRadius?: number;
  correctCountry?: Country;
};

export default function GlobeJourney({
  guesses = [],
  width = 400,
  height = 400,
  stepDuration = 900,
  rotateDuration = 1400,
  markerRadius = 2,
  correctCountry,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rotationAnimRef = useRef<any | null>(null);
  const currentIndex = useRef(0);
  const { colorScheme } = useMantineColorScheme();

  const landFill = colorScheme === 'dark' ? '#3a3a3a' : '#f2f2f2';
  const oceanFill = colorScheme === 'dark' ? '#5b7996ff' : '#b4e1e9';
  const lineColor = colorScheme === 'dark' ? '#ffffff' : '#404040';
  const visitedColor = '#ff6b6b';
  const correctColor = '#248b24';
  const glow = false;

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) return;

    // 🧩 Prevent mobile bounce scroll while interacting
    const prevOverscroll = document.body.style.overscrollBehavior;
    document.body.style.overscrollBehavior = 'contain';

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.scale(dpr, dpr);
    context.imageSmoothingEnabled = false;
    // context.imageSmoothingQuality = "high";

    const projection = geoOrthographic()
      .scale(Math.min(width, height) / 2.5)
      .translate([width / 2, height / 2])
      .clipAngle(90)
      .precision(0.5);

    const path = geoPath(projection, context);
    const worldGeoJSON: any = feature(
      worldTopoJSON as any,
      (worldTopoJSON as any).objects.CNTR_RG_60M_2024_4326
    );

    const sphere = { type: 'Sphere' };
    const visitedCountries = new Set<string>();

    // rAF deduplication — prevents multiple render calls per frame
    let rafId: number | null = null;
    function scheduleRender() {
      if (rafId != null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        render();
      });
    }

    function render() {
      if (!context) return;
      context.clearRect(0, 0, width, height);

      //glow
      if (glow) renderGlow(context);

      // Ocean
      context.beginPath();
      path(sphere as any);
      context.fillStyle = oceanFill;
      context.fill();

      // Land — batch plain countries into one path, draw highlighted ones individually
      const activeGuess = guesses[currentIndex.current];
      const activeCode = activeGuess?.code;

      const highlightedVisited: any[] = [];
      let correctFeature: any = null;

      // Single pass: draw all plain land in one batch
      context.beginPath();
      for (const f of worldGeoJSON.features) {
        const cntrId = f.properties?.CNTR_ID;

        if (correctCountry && cntrId === correctCountry.code) {
          correctFeature = f;
          continue;
        }
        if (cntrId && (visitedCountries.has(cntrId) || cntrId === activeCode)) {
          highlightedVisited.push(f);
          continue;
        }

        path(f); // accumulate into single path
      }
      context.fillStyle = landFill;
      context.fill();

      // Draw visited countries
      if (highlightedVisited.length > 0) {
        context.beginPath();
        for (const f of highlightedVisited) path(f);
        context.fillStyle = visitedColor;
        context.fill();
      }

      // Draw correct country
      if (correctFeature) {
        context.beginPath();
        path(correctFeature);
        context.fillStyle = correctColor;
        context.fill();
      }

      // Flights
      renderFlights(context);

      // Markers
      renderMarkers(context);

      // Labels
      renderLabels(context);
    }

    function renderGlow(ctx: CanvasRenderingContext2D) {
      const [cx, cy] = projection.translate();
      const radius = projection.scale();

      // 🎨 Theme-aware glow color (reduced opacity)
      const glowInner =
        colorScheme === 'dark'
          ? 'rgba(120, 200, 255, 0.05)' // ↓ lower opacity
          : 'rgba(150, 210, 255, 0.05)';
      const glowOuter =
        colorScheme === 'dark'
          ? 'rgba(0, 0, 20, 0)' // subtle fade to black
          : 'rgba(255, 255, 255, 0)';

      // 🌌 Gentle ambient radial glow
      const radial = ctx.createRadialGradient(
        cx,
        cy,
        radius * 0.9,
        cx,
        cy,
        radius * 1.4
      );
      radial.addColorStop(0, glowInner);
      radial.addColorStop(1, glowOuter);

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 1.4, 0, 2 * Math.PI);
      ctx.fillStyle = radial;
      ctx.fill();
      ctx.restore();

      // 🌠 Subtle atmospheric rim (thinner + softer)
      const atmosphere = ctx.createRadialGradient(
        cx,
        cy,
        radius * 0.95,
        cx,
        cy,
        radius * 1.1
      );
      atmosphere.addColorStop(0, 'rgba(255, 255, 255, 0)');
      atmosphere.addColorStop(1, 'rgba(150, 220, 255, 0.12)'); // ↓ softer opacity

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 1.03, 0, 2 * Math.PI);
      ctx.strokeStyle = atmosphere;
      ctx.lineWidth = radius * 0.04; // ↓ thinner rim
      ctx.stroke();
      ctx.restore();
    }

    function renderMarkers(ctx: CanvasRenderingContext2D) {
      if (!guesses || guesses.length === 0) return;

      for (let i = 0; i < guesses.length; i++) {
        const g = guesses[i];
        const [x, y] = projection([g.longitude, g.latitude]) || [-999, -999];
        if (x === -999) continue;

        ctx.beginPath();
        ctx.arc(
          x,
          y,
          i === currentIndex.current ? markerRadius * 2 : markerRadius,
          0,
          2 * Math.PI
        );

        if (correctCountry && g.code === correctCountry.code) {
          ctx.fillStyle = correctColor;
        } else if (visitedCountries.has(g.code!)) {
          ctx.fillStyle = visitedColor;
        } else {
          ctx.fillStyle = '#d8d8d8';
        }

        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 0.5;
        ctx.fill();
        ctx.stroke();
      }
    }

    function drawRoundedRect(
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      width: number,
      height: number,
      radius: number
    ) {
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + width - radius, y);
      ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
      ctx.lineTo(x + width, y + height - radius);
      ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
      ctx.lineTo(x + radius, y + height);
      ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
    }

    function renderLabels(ctx: CanvasRenderingContext2D) {
      const labeledCodes = new Set<string>();
      const labelsToRender: Array<{ name: string; lat: number; lon: number; isCorrect: boolean }> = [];

      for (const g of guesses) {
        if (g.code && !labeledCodes.has(g.code) && g.name) {
          labeledCodes.add(g.code);
          const isCorrect = correctCountry && g.code === correctCountry.code;
          labelsToRender.push({
            name: g.name,
            lat: g.latitude,
            lon: g.longitude,
            isCorrect: !!isCorrect,
          });
        }
      }

      if (correctCountry && !labeledCodes.has(correctCountry.code)) {
        labeledCodes.add(correctCountry.code);
        labelsToRender.push({
          name: correctCountry.name,
          lat: correctCountry.latitude,
          lon: correctCountry.longitude,
          isCorrect: true,
        });
      }

      const r = projection.rotate();
      const centerLon = -r[0];
      const centerLat = -r[1];
      const rad = Math.PI / 180;
      const phi2 = centerLat * rad;

      for (const item of labelsToRender) {
        const phi1 = item.lat * rad;
        const deltaLambda = (item.lon - centerLon) * rad;
        const cosD = Math.sin(phi1) * Math.sin(phi2) + Math.cos(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);

        if (cosD > 0) {
          const [x, y] = projection([item.lon, item.lat]) || [-999, -999];
          if (x === -999) continue;

          ctx.font = '500 10px Inter, system-ui, sans-serif';
          const textWidth = ctx.measureText(item.name).width;
          const padX = 6;
          const padY = 3;
          const w = textWidth + padX * 2;
          const h = 14 + padY * 2;
          const rx = x - w / 2;
          const ry = y - h - 8;

          ctx.save();
          ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
          ctx.shadowBlur = 4;
          ctx.shadowOffsetY = 2;

          if (item.isCorrect) {
            ctx.fillStyle = 'rgba(36, 139, 36, 0.9)';
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
          } else {
            ctx.fillStyle = 'rgba(30, 30, 30, 0.85)';
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
          }

          drawRoundedRect(ctx, rx, ry, w, h, 4);
          ctx.fill();
          ctx.stroke();
          ctx.restore();

          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(item.name, x, ry + h / 2);

          ctx.beginPath();
          ctx.strokeStyle = item.isCorrect ? 'rgba(36, 139, 36, 0.7)' : 'rgba(30, 30, 30, 0.6)';
          ctx.lineWidth = 1;
          ctx.moveTo(x, ry + h);
          ctx.lineTo(x, y - 4);
          ctx.stroke();
        }
      }
    }

    const arcCache = new Map<string, [number, number][]>();
    function renderFlights(ctx: CanvasRenderingContext2D) {
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 1.2;
      ctx.globalAlpha = 0.4;

      for (let i = 1; i <= currentIndex.current; i++) {
        const a = guesses[i - 1];
        const b = guesses[i];
        if (!a || !b) continue;

        const key = `${a.latitude},${a.longitude}:${b.latitude},${b.longitude}`;
        let arc = arcCache.get(key);
        if (!arc) {
          const interp = geoInterpolate(
            [a.longitude, a.latitude],
            [b.longitude, b.latitude]
          );
          const pts: [number, number][] = [];
          const N = 30;
          for (let t = 0; t <= 1; t += 1 / N) {
            pts.push(interp(t));
          }
          arc = pts;
          arcCache.set(key, pts);
        }

        ctx.beginPath();
        arc.forEach((p, j) => {
          const proj = projection(p);
          if (!proj) return;
          if (j === 0) ctx.moveTo(proj[0], proj[1]);
          else ctx.lineTo(proj[0], proj[1]);
        });
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    async function runJourney() {
      if (!guesses || guesses.length === 0) return;

      visitedCountries.clear();
      for (let i = 0; i < guesses.length; i++) {
        const g = guesses[i];
        currentIndex.current = i;
        if (g.code) visitedCountries.add(g.code);

        await rotateTo(g.latitude, g.longitude, rotateDuration);
        render();
        await wait(stepDuration);
      }
    }

    function wait(ms: number) {
      return new Promise((r) => setTimeout(r, ms));
    }

    function normalizeLongitudeDelta(from: number, to: number): number {
      let d = to - from;
      if (d > 180) d -= 360;
      if (d < -180) d += 360;
      return from + d;
    }

    function rotateTo(lat: number, lon: number, dur: number): Promise<void> {
      return new Promise((resolve) => {
        const start = projection.rotate() as [number, number, number];

        //  Fix longitude wrapping
        const targetLambda = -normalizeLongitudeDelta(-start[0], lon);

        const end: [number, number, number] = [targetLambda, -lat, 0];

        const interp = interpolate(start, end);
        const t0 = now();
        const ease = easeCubicInOut;

        if (rotationAnimRef.current) {
          try {
            rotationAnimRef.current.stop();
          } catch {}
        }

        rotationAnimRef.current = timer(() => {
          const t = Math.min(1, (now() - t0) / dur);
          projection.rotate(interp(ease(t)));
          render();

          if (t === 1) {
            try {
              rotationAnimRef.current.stop();
            } catch {}
            rotationAnimRef.current = null;
            resolve();
          }
        });
      });
    }

    function addZoom() {
      const zoomWrapper = versorZoom(projection);
      const zoomInstance = (zoomWrapper as any).zoom;
      const selection = select(context!.canvas);

      // --- helpers ---
      function isInsideSphereXY(x: number, y: number): boolean {
        const [cx, cy] = projection.translate();
        const radius = projection.scale();
        const dx = x - cx;
        const dy = y - cy;
        return dx * dx + dy * dy <= radius * radius;
      }

      function getRelativeXYFromClient(
        clientX: number,
        clientY: number
      ): [number, number] {
        const rect = canvas.getBoundingClientRect();
        return [clientX - rect.left, clientY - rect.top];
      }

      // 🧱 Scroll lock helpers
      const lockScroll = () => {
        document.body.style.overflow = 'hidden';
        document.body.style.touchAction = 'none'; // prevent iOS elastic scroll
      };
      const unlockScroll = () => {
        document.body.style.overflow = '';
        document.body.style.touchAction = '';
      };

      // --- prevent page scroll when interacting with the globe ---
      const onWheel = (e: WheelEvent) => {
        const [x, y] = getRelativeXYFromClient(
          (e as any).clientX ?? e.pageX,
          (e as any).clientY ?? e.pageY
        );
        if (isInsideSphereXY(x, y)) e.preventDefault();
      };
      canvas.addEventListener('wheel', onWheel, { passive: false });

      const onTouchStart = (e: TouchEvent) => {
        const [x, y] = getRelativeXYFromClient(
          e.touches[0].clientX,
          e.touches[0].clientY
        );
        if (isInsideSphereXY(x, y)) {
          e.preventDefault();
          lockScroll();
        }
      };
      canvas.addEventListener('touchstart', onTouchStart, { passive: false });

      const onTouchMove = (e: TouchEvent) => {
        const [x, y] = getRelativeXYFromClient(
          e.touches[0].clientX,
          e.touches[0].clientY
        );
        if (isInsideSphereXY(x, y)) e.preventDefault();
      };
      canvas.addEventListener('touchmove', onTouchMove, { passive: false });

      const onTouchEnd = () => {
        unlockScroll();
      };
      canvas.addEventListener('touchend', onTouchEnd, { passive: true });

      // --- dblclick / double-tap handling ---
      // Desktop: use native dblclick
      const onDblClick = (ev: MouseEvent) => {
        const rect = canvas.getBoundingClientRect();
        const x = ev.clientX - rect.left;
        const y = ev.clientY - rect.top;
        if (!isInsideSphereXY(x, y)) return;
        // zoom in by factor — adjust if you want stronger/weaker zoom
        //@ts-ignore
        selection
        //@ts-ignore
          .transition()
          .duration(300)
          .call(zoomInstance.scaleBy as any, 1.8, [x, y]);
      };
      canvas.addEventListener('dblclick', onDblClick);

      // Mobile double-tap detection
      let lastTapTime = 0;
      let lastTapX = 0;
      let lastTapY = 0;
      const DOUBLE_TAP_MAX_DELAY = 300; // ms
      const DOUBLE_TAP_MAX_DISTANCE = 24; // px

      const onTouchEndDoubleTap = (e: TouchEvent) => {
        if (!e.changedTouches || e.changedTouches.length === 0) return;
        const t = e.changedTouches[0];
        const nowTime = Date.now();
        const [x, y] = getRelativeXYFromClient(t.clientX, t.clientY);

        const dt = nowTime - lastTapTime;
        const distSq =
          (x - lastTapX) * (x - lastTapX) + (y - lastTapY) * (y - lastTapY);

        if (
          dt <= DOUBLE_TAP_MAX_DELAY &&
          distSq <= DOUBLE_TAP_MAX_DISTANCE * DOUBLE_TAP_MAX_DISTANCE
        ) {
          // Double-tap detected
          if (!isInsideSphereXY(x, y)) {
            // ignore if outside globe
            lastTapTime = 0;
            return;
          }
          // perform zoom in
          //@ts-ignore
          selection
          //@ts-ignore
            .transition()
            .duration(300)
            .call(zoomInstance.scaleBy as any, 1.8, [x, y]);
          // reset
          lastTapTime = 0;
          lastTapX = 0;
          lastTapY = 0;
          // prevent synthetic double click / other interactions
          e.preventDefault();
        } else {
          // store as potential first tap
          lastTapTime = nowTime;
          lastTapX = x;
          lastTapY = y;
        }
      };
      canvas.addEventListener('touchend', onTouchEndDoubleTap, {
        passive: false,
      });

      // --- filter only start events for the d3 zoom filter (existing behaviour) ---
      zoomInstance.filter((event: any) => {
        if (event.type === 'wheel') {
          const [x, y] = [event.offsetX, event.offsetY];
          return isInsideSphereXY(x, y);
        }

        if (event.type === 'mousedown' || event.type === 'touchstart') {
          const [x, y] = event.touches
            ? [
                event.touches[0].clientX - canvas.getBoundingClientRect().left,
                event.touches[0].clientY - canvas.getBoundingClientRect().top,
              ]
            : [event.offsetX, event.offsetY];
          return isInsideSphereXY(x, y);
        }

        // once zooming/dragging has started, always allow
        return true;
      });

      // --- bind zoom ---
      selection.call(zoomWrapper.on('zoom.render', () => scheduleRender()) as any);

      // 🧹 cleanup
      return () => {
        unlockScroll(); // always restore scrolling on cleanup

        canvas.removeEventListener('wheel', onWheel as any);
        canvas.removeEventListener('touchstart', onTouchStart as any);
        canvas.removeEventListener('touchmove', onTouchMove as any);
        canvas.removeEventListener('touchend', onTouchEnd as any);

        // remove dblclick & double-tap listener
        canvas.removeEventListener('dblclick', onDblClick as any);
        canvas.removeEventListener('touchend', onTouchEndDoubleTap as any);

        // also remove the one passive touchend listener if any
        // (we attached onTouchEnd earlier with passive:true)
      };
    }

    // 🌍 Versor-based drag + zoom
    const USE_INERTIA = false;
    let inertiaTimer: any = null;
    let lastRotation: [number, number, number] | null = null;
    let lastEventTime = 0;
    let velocity: [number, number, number] = [0, 0, 0];
    function versorZoom(
      projection: any,
      {
        // Capture the projection’s original scale, before any zooming.
        scale = projection._scale === undefined
          ? (projection._scale = projection.scale())
          : projection._scale,
        scaleExtent = [0.8, 8],
      } = {}
    ) {
      let v0: any, q0: any, r0: any, a0: any, tl: any;

      const zoomInstance = d3Zoom()
        .scaleExtent(scaleExtent.map((x) => x * scale) as [number, number])
        .on('start', zoomstarted)
        .on('zoom', zoomed)
        .on('end', zoomend);

      function point(event: any, that: any) {
        const t = pointers(event, that);

        if (t.length !== tl) {
          tl = t.length;
          if (tl > 1) a0 = Math.atan2(t[1][1] - t[0][1], t[1][0] - t[0][0]);
          zoomstarted.call(that, event);
        }

        return tl > 1
          ? [
              mean(t, (p: any) => p[0]),
              mean(t, (p: any) => p[1]),
              Math.atan2(t[1][1] - t[0][1], t[1][0] - t[0][0]),
            ]
          : t[0];
      }

      function zoomstarted(this: any, event: any) {
        const pt = point(event, this);
        if (pt) {
          const inv = projection.invert(pt);
          if (inv) {
            v0 = versor.cartesian(inv);
            q0 = versor((r0 = projection.rotate()));
          }
        }
      }

      function zoomed(this: any, event: any) {
        projection.scale(event.transform.k);
        const pt = point(event, this);
        
        if (pt && v0) {
          const inv = projection.rotate(r0).invert(pt);
          if (inv) {
            const v1 = versor.cartesian(inv);
            const delta = versor.delta(v0, v1);
            let q1 = versor.multiply(q0, delta);
            if (pt[2]) {
              const d = (pt[2] - a0) / 2;
              const s = -Math.sin(d);
              const c = Math.sign(Math.cos(d));
              q1 = versor.multiply([Math.sqrt(1 - s * s), 0, 0, c * s], q1);
            }
            projection.rotate(versor.rotation(q1));

            // 🌍 Keep the globe upright (limit vertical tilt)
            let [lambda, phi, gamma] = projection.rotate();

            // Clamp φ (the vertical tilt) to prevent flipping the globe
            const maxTilt = 60; // degrees — adjust if you want more/less freedom
            phi = Math.max(-maxTilt, Math.min(maxTilt, phi));

            // Keep the roll (γ) locked at 0 for stability
            gamma = 0;

            projection.rotate([lambda, phi, gamma]);

            if (delta[0] < 0.7) zoomstarted.call(this, event);
          }
        }

        // --- inertia tracking ---
        if (USE_INERTIA) {
          const nowTime = Date.now();
          const newRotation = projection.rotate() as [number, number, number];
          if (lastRotation) {
            const dt = (nowTime - lastEventTime) / 1000; // seconds
            if (dt > 0) {
              velocity = [
                (newRotation[0] - lastRotation[0]) / dt,
                (newRotation[1] - lastRotation[1]) / dt,
                (newRotation[2] - lastRotation[2]) / dt,
              ];
            }
          }
          lastRotation = newRotation;
          lastEventTime = nowTime;
        }

        //prevents redundant intermediate renders when dragging quickly.
        scheduleRender();
      }

      function zoomend(this: any) {
        if (inertiaTimer) inertiaTimer.stop();
        if (!velocity) return;

        // threshold: ignore tiny movements
        const speed = Math.hypot(...velocity);
        if (speed < 10) {
          velocity = [0, 0, 0];
          return;
        }

        const decay = 0.95; // friction per frame
        const interval = 16; // ~60fps
        let rotation = projection.rotate() as [number, number, number];

        if (USE_INERTIA) {
          inertiaTimer = timer(() => {
            rotation = [
              rotation[0] + velocity[0] * (interval / 1000),
              rotation[1] + velocity[1] * (interval / 1000),
              rotation[2] + velocity[2] * (interval / 1000),
            ];
            projection.rotate(rotation);
            render();

            // decay velocity gradually
            velocity = velocity.map((v) => v * decay) as [
              number,
              number,
              number
            ];

            if (Math.hypot(...velocity) < 1) {
              inertiaTimer.stop();
            }
          });
        }
      }

      return Object.assign(
        (selection: any) =>
          selection
            .property('__zoom', zoomIdentity.scale(projection.scale()))
            .call(zoomInstance),
        {
          zoom: zoomInstance, // <-- expose the actual d3 zoom instance
          on(type: any, listener?: any) {
            if (listener !== undefined) {
              zoomInstance.on(type, listener);
              return this;
            }
            return zoomInstance.on(type);
          },
        }
      );
    }

    // Initialize
    const cleanupZoom = addZoom();
    render();
    runJourney();

    //cleanup
    return () => {
      // 🧹 stop any running rotation animation
      if (rotationAnimRef.current) {
        try {
          rotationAnimRef.current.stop();
        } catch {}
      }

      // ✅ Properly remove zoom listeners
      if (cleanupZoom) cleanupZoom();

      // 🧹 restore previous overscrollBehavior (safer)
      document.body.style.overscrollBehavior = prevOverscroll;
    };
  }, [
    guesses,
    width,
    height,
    stepDuration,
    rotateDuration,
    markerRadius,
    colorScheme,
  ]);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        touchAction: 'auto',
      }}
    >
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          display: 'block',
        }}
      />
    </div>
  );
}
