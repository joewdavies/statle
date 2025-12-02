// src/components/globe-journey.tsx
import { useEffect, useRef } from "react";
import { zoom as d3Zoom, zoomIdentity } from "d3-zoom";
import { geoOrthographic, geoPath, geoInterpolate } from "d3-geo";
import { easeCubicInOut } from "d3-ease";
import { interpolate } from "d3-interpolate";
import { timer, now } from "d3-timer";
import { mean } from "d3-array";
import { feature } from "topojson-client";
import worldTopoJSON from "../../data/world-topo.json";
//@ts-ignore
import versor from "versor";
import { useMantineColorScheme } from "@mantine/core";
import { Country } from "../../data/countries/countries";
import { select, pointers } from "d3-selection";

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

    const landFill = colorScheme === "dark" ? "#3a3a3a" : "#f2f2f2";
    const oceanFill = colorScheme === "dark" ? "#5b7996ff" : "#b4e1e9";
    const lineColor = colorScheme === "dark" ? "#ffffff" : "#404040";
    const visitedColor = "#ff6b6b";
    const correctColor = "#248b24";
    const glow = false

    useEffect(() => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");
        if (!context) return;

        // 🧩 Prevent mobile bounce scroll while interacting
        const prevOverscroll = document.body.style.overscrollBehavior;
        document.body.style.overscrollBehavior = "contain";

        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        context.scale(dpr, dpr);
        context.imageSmoothingEnabled = false;
        // context.imageSmoothingQuality = "high";

        const projection = geoOrthographic()
            .scale(Math.min(width, height) / 2)
            .translate([width / 2, height / 2])
            .clipAngle(90)
            .precision(0.3);

        const path = geoPath(projection, context);
        const worldGeoJSON: any = feature(
            worldTopoJSON as any,
            (worldTopoJSON as any).objects.CNTR_RG_60M_2024_4326
        );

        const sphere = { type: "Sphere" };
        const visitedCountries = new Set<string>();

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

            // Land per-country fill
            context.lineWidth = 0.5;
            context.strokeStyle = "#888";

            const activeGuess = guesses[currentIndex.current];
            const activeCode = activeGuess?.code;

            for (const f of worldGeoJSON.features) {
                const props = f.properties || {};
                const cntrId = props.CNTR_ID; // ✅ use your actual Eurostat ID

                let fill = landFill;

                // 🟩 Correct country
                if (correctCountry && cntrId === correctCountry.code) {
                    fill = correctColor;
                }
                // 🟥 Guessed or visited
                else if (cntrId && (visitedCountries.has(cntrId) || cntrId === activeCode)) {
                    fill = visitedColor;
                }

                context.beginPath();
                path(f);
                context.fillStyle = fill;
                context.fill();
                // context.stroke();
            }

            // Flights
            renderFlights(context);

            // Markers
            renderMarkers(context);
        }

        function renderGlow(ctx: CanvasRenderingContext2D) {
            const [cx, cy] = projection.translate();
            const radius = projection.scale();

            // 🎨 Theme-aware glow color (reduced opacity)
            const glowInner =
                colorScheme === "dark"
                    ? "rgba(120, 200, 255, 0.05)"  // ↓ lower opacity
                    : "rgba(150, 210, 255, 0.05)";
            const glowOuter =
                colorScheme === "dark"
                    ? "rgba(0, 0, 20, 0)"          // subtle fade to black
                    : "rgba(255, 255, 255, 0)";

            // 🌌 Gentle ambient radial glow
            const radial = ctx.createRadialGradient(cx, cy, radius * 0.9, cx, cy, radius * 1.4);
            radial.addColorStop(0, glowInner);
            radial.addColorStop(1, glowOuter);

            ctx.save();
            ctx.beginPath();
            ctx.arc(cx, cy, radius * 1.4, 0, 2 * Math.PI);
            ctx.fillStyle = radial;
            ctx.fill();
            ctx.restore();

            // 🌠 Subtle atmospheric rim (thinner + softer)
            const atmosphere = ctx.createRadialGradient(cx, cy, radius * 0.95, cx, cy, radius * 1.1);
            atmosphere.addColorStop(0, "rgba(255, 255, 255, 0)");
            atmosphere.addColorStop(1, "rgba(150, 220, 255, 0.12)"); // ↓ softer opacity

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
                ctx.arc(x, y, i === currentIndex.current ? markerRadius * 2 : markerRadius, 0, 2 * Math.PI);

                if (correctCountry && g.code === correctCountry.code) {
                    ctx.fillStyle = correctColor;
                } else if (visitedCountries.has(g.code!)) {
                    ctx.fillStyle = visitedColor;
                } else {
                    ctx.fillStyle = "#d8d8d8";
                }

                ctx.strokeStyle = lineColor;
                ctx.lineWidth = 0.5;
                ctx.fill();
                ctx.stroke();
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

        function rotateTo(lat: number, lon: number, dur: number): Promise<void> {
            return new Promise((resolve) => {
                const start = projection.rotate() as [number, number, number];
                const end: [number, number, number] = [-lon, -lat, 0];
                const interp = interpolate(start, end);
                const t0 = now();
                const ease = easeCubicInOut;

                if (rotationAnimRef.current) {
                    try {
                        rotationAnimRef.current.stop();
                    } catch { }
                }

                rotationAnimRef.current = timer(() => {
                    const t = Math.min(1, (now() - t0) / dur);
                    projection.rotate(interp(ease(t)));
                    render();
                    if (t === 1) {
                        try {
                            rotationAnimRef.current.stop();
                        } catch { }
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

            function getRelativeXY(e: MouseEvent | Touch | PointerEvent): [number, number] {
                const rect = canvas.getBoundingClientRect();
                return [e.clientX - rect.left, e.clientY - rect.top];
            }

            // 🧱 Scroll lock helpers
            const lockScroll = () => {
                document.body.style.overflow = "hidden";
                document.body.style.touchAction = "none"; // prevent iOS elastic scroll
            };
            const unlockScroll = () => {
                document.body.style.overflow = "";
                document.body.style.touchAction = "";
            };

            // --- prevent page scroll when interacting with the globe ---
            canvas.addEventListener(
                "wheel",
                (e) => {
                    const [x, y] = getRelativeXY(e);
                    if (isInsideSphereXY(x, y)) e.preventDefault();
                },
                { passive: false }
            );

            // 🧠 Add these — main fix for mobile scroll issue:
            canvas.addEventListener(
                "touchstart",
                (e) => {
                    const [x, y] = getRelativeXY(e.touches[0]);
                    if (isInsideSphereXY(x, y)) {
                        e.preventDefault();
                        lockScroll(); // 🚫 disable page scroll
                    }
                },
                { passive: false }
            );

            canvas.addEventListener(
                "touchmove",
                (e) => {
                    const [x, y] = getRelativeXY(e.touches[0]);
                    if (isInsideSphereXY(x, y)) e.preventDefault();
                },
                { passive: false }
            );

            canvas.addEventListener(
                "touchend",
                () => {
                    unlockScroll(); // ✅ restore page scroll
                },
                { passive: true }
            );

            // --- filter only start events ---
            zoomInstance.filter((event: any) => {
                if (event.type === "wheel") {
                    const [x, y] = [event.offsetX, event.offsetY];
                    return isInsideSphereXY(x, y);
                }

                if (event.type === "mousedown" || event.type === "touchstart") {
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
            selection.call(
                zoomWrapper.on("zoom.render", () => render()) as any
            );

            // 🧹 cleanup
            return () => {
                unlockScroll(); // ✅ always restore scrolling on cleanup
                canvas.removeEventListener("wheel", () => { });
                canvas.removeEventListener("touchstart", () => { });
                canvas.removeEventListener("touchmove", () => { });
                canvas.removeEventListener("touchend", () => { });
            };
        }



        // 🌍 Versor-based drag + zoom
        const USE_INERTIA = false;
        let inertiaTimer: any = null;
        let lastRotation: [number, number, number] | null = null;
        let lastEventTime = 0;
        let velocity: [number, number, number] = [0, 0, 0];
        function versorZoom(projection: any, {
            // Capture the projection’s original scale, before any zooming.
            scale = projection._scale === undefined
                ? (projection._scale = projection.scale())
                : projection._scale,
            scaleExtent = [0.8, 8]
        } = {}) {
            let v0: any, q0: any, r0: any, a0: any, tl: any;

            const zoomInstance = d3Zoom()
                .scaleExtent(scaleExtent.map(x => x * scale) as [number, number])
                .on("start", zoomstarted)
                .on("zoom", zoomed)
                .on("end", zoomend)

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
                        Math.atan2(t[1][1] - t[0][1], t[1][0] - t[0][0])
                    ]
                    : t[0];
            }

            function zoomstarted(this: any, event: any) {
                v0 = versor.cartesian(projection.invert(point(event, this)));
                q0 = versor((r0 = projection.rotate()));
            }

            function zoomed(this: any, event: any) {
                projection.scale(event.transform.k);
                const pt = point(event, this);
                const v1 = versor.cartesian(projection.rotate(r0).invert(pt));
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

                if (delta[0] < 0.7) zoomstarted.call(this, event);
                //prevents redundant intermediate renders when dragging quickly.
                requestAnimationFrame(() => render());
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
                        velocity = velocity.map((v) => v * decay) as [number, number, number];

                        if (Math.hypot(...velocity) < 1) {
                            inertiaTimer.stop();
                        }
                    });
                }

            }

            return Object.assign(
                (selection: any) =>
                    selection
                        .property("__zoom", zoomIdentity.scale(projection.scale()))
                        .call(zoomInstance),
                {
                    zoom: zoomInstance, // <-- expose the actual d3 zoom instance
                    on(type: any, listener?: any) {
                        if (listener !== undefined) {
                            zoomInstance.on(type, listener);
                            return this;
                        }
                        return zoomInstance.on(type);
                    }

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
                } catch { }
            }

            // ✅ Properly remove zoom listeners
            if (cleanupZoom) cleanupZoom();

            // 🧹 restore previous overscrollBehavior (safer)
            document.body.style.overscrollBehavior = prevOverscroll;
        };
    }, [guesses, width, height, stepDuration, rotateDuration, markerRadius, colorScheme]);

    return (
        <div style={{
            width: "100%", height: "100%", display: "flex", justifyContent: "center", alignItems: "center", overflow: "hidden", touchAction: "auto",
        }}>
            <canvas
                ref={canvasRef}
                width={width}
                height={height}
                style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    display: "block",
                }}
            />
        </div>
    );
}
