// src/components/globe-journey.tsx
import { useEffect, useRef } from "react";
import { select } from "d3-selection";
import { interpolate } from "d3-interpolate";
import { easeCubicInOut } from "d3-ease";
import { timer, now } from "d3-timer";
import { geoInterpolate, geoOrthographic, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import worldTopoJSON from "../data/world-topo.json";
import { useMantineColorScheme } from '@mantine/core';
import { Country } from "../data/countries/countries";
//@ts-ignore
import d3GeoZoom from 'd3-geo-zoom';

type Guess = {
    code?: string;
    name?: string;
    latitude: number;
    longitude: number;
};

type Props = {
    guesses: Guess[]; // array of { latitude, longitude, name?, code? }
    width?: number;
    height?: number;
    stepDuration?: number; // ms per step (time between targets)
    rotateDuration?: number; // ms for rotation animation
    markerRadius?: number;
    correctCountry?: Country;
};


export default function GlobeJourney({
    guesses = [],
    width = 700,
    height = 500,
    stepDuration = 900,
    rotateDuration = 1400,
    markerRadius = 2,
    correctCountry,
}: Props) {
    const svgRef = useRef<SVGSVGElement | null>(null);
    const currentIndex = useRef(0);
    const rotationAnimRef = useRef<any | null>(null);
    const { colorScheme } = useMantineColorScheme(); // 'light' or 'dark'
    const sphereFill = colorScheme === 'dark' ? '#96ccd6ff' : '#b4e1e9ff';
    const landFill = colorScheme === 'dark' ? '#3a3a3aff' : '#f2f2f2';
    const sphereDropShadow = colorScheme === 'dark' ? 'drop-shadow(0px 0px 6px rgba(150, 150, 150, 0.4))' : 'drop-shadow(0px 0px 6px rgba(200, 249, 255, 0.4))';
    const lineColor = colorScheme === 'dark' ? '#ffffffff' : '#505050ff';
    const countryStroke = colorScheme === 'dark' ? '#666666' : '#c7d7e6';
    const markerStroke = colorScheme === 'dark' ? '#ffffffff' : '#6b6b6bff';
    const overlayRef = useRef<any | null>(null);
    const draggingEnabled = useRef(false);

    useEffect(() => {
        if (!svgRef.current) return;
        const svg = select(svgRef.current);
        svg.selectAll("*").remove();
        const root = svg.append("g").attr("class", "root");

        const projection = geoOrthographic()
            .scale(Math.min(width, height) / 2.1)
            .translate([width / 2, height / 2])
            .clipAngle(90)
            .precision(0.5);

        const path = geoPath(projection);

        // Convert TopoJSON -> GeoJSON (reuse same object key your WorldMap uses)
        const worldGeoJSON: any = feature(
            worldTopoJSON as any,
            (worldTopoJSON as any).objects.CNTR_RG_60M_2024_4326
        );

        // Background sphere
        const sphere = root
            .append("path")
            .datum({ type: "Sphere" })
            .attr("class", "sphere")
            .attr("d", path as any)
            .attr("fill", sphereFill)
            .attr("stroke", "#a7a7a781")
            .attr("stroke-width", 0.8)
            .style("filter", sphereDropShadow);

        // Countries
        const countries = root
            .append("g")
            .attr("class", "countries")
            .selectAll("path")
            .data(worldGeoJSON.features)
            .join("path")
            .attr("d", (d: any) => path(d) as string)
            .attr("fill", landFill)
            .attr("stroke", countryStroke)
            .attr("stroke-width", 0.4);

        // interaction overlay (we'll append BEFORE markers so markers render on top)
        // Use the sphere path for pixel-perfect hit area (the overlay should match the visible circle)
        const overlay = root.append("path").datum({ type: "Sphere" })
            .attr("class", "interaction-overlay")
            .attr("d", path as any)
            .style("fill", "transparent")
            .style("pointer-events", "all")
            .style("touch-action", "none")
            .style("cursor", "grab");

        const overlayNode = overlay.node();

        // named handlers so we can remove them cleanly on unmount
        function onTouchStart(e: TouchEvent) { e.preventDefault(); }
        function onTouchMove(e: TouchEvent) { e.preventDefault(); }
        function onTouchEnd(e: TouchEvent) {
            e.preventDefault();
            // forward to marker under touch if present
            const touch = e.changedTouches && e.changedTouches[0];
            if (!touch) return;
            const el = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement | null;
            const markerEl = el && el.closest ? (el.closest('circle.marker') as HTMLElement | null) : null;
            if (markerEl) {
                markerEl.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, clientX: touch.clientX, clientY: touch.clientY }));
            }
        }

        function onPointerDown(e: PointerEvent) { e.preventDefault(); }
        function onPointerUp(e: PointerEvent) {
            e.preventDefault();
            // forward to marker under pointer if present
            const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
            const markerEl = el && el.closest ? (el.closest('circle.marker') as HTMLElement | null) : null;
            if (markerEl) {
                markerEl.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, clientX: e.clientX, clientY: e.clientY }));
            }
        }

        if (overlayNode) {
            overlayNode.addEventListener('touchstart', onTouchStart, { passive: false });
            overlayNode.addEventListener('touchmove', onTouchMove, { passive: false });
            overlayNode.addEventListener('touchend', onTouchEnd, { passive: false });

            overlayNode.addEventListener('pointerdown', onPointerDown);
            overlayNode.addEventListener('pointerup', onPointerUp);
        }

        // remember overlay selection for later removal
        overlayRef.current = overlay;

        // Markers group (append after overlay so they sit above it and remain clickable)
        const markers = root.append("g").attr("class", "markers");

        //flights group (also after overlay)
        const flights = root.append("g").attr("class", "flights");

        // store which guesses have already been visited
        const visitedCountries = new Set<string>();

        function renderMarkers(idx: number | null = null) {
            // reset visited on loop start
            if (idx === 0) visitedCountries.clear();
            if (idx !== null && guesses[idx]?.code) visitedCountries.add(guesses[idx].code);

            // Update existing circles or create if missing — key by code to keep stability
            markers.selectAll("circle.marker")
                .data(guesses, (d: any) => d.code || `${d.latitude}-${d.longitude}`)
                .join(
                    enter => enter.append("circle").attr("class", "marker"),
                    update => update,
                    exit => exit.remove()
                )
                .attr("r", (_d: any, i: number) => (i === idx ? markerRadius * 2 : markerRadius))
                .attr("cx", (d: any) => (projection([d.longitude, d.latitude])?.[0] ?? -9999))
                .attr("cy", (d: any) => (projection([d.longitude, d.latitude])?.[1] ?? -9999))
                .attr("stroke", markerStroke)
                .attr("stroke-width", 0.8)
                .attr("fill", (d: any) => {
                    // correct country stays green; visited ones red
                    if (correctCountry && d.code === correctCountry.code) return "#248b24ff";
                    return visitedCountries.has(d.code) ? "#ff6b6b" : "#d8d8d8";
                })
                .attr("opacity", (d: any) => (isPointVisible(projection, d) ? 1 : 0.25));

            // Update fills on countries so guessed/active/correct states are visible.
            // We check multiple possible iso fields (id, ISO_A3, ISO3_CODE) to be robust with different topojsons.
            countries.attr("fill", (d: any) => {
                const activeGuess = idx !== null ? guesses[idx] : null;
                const activeCode = activeGuess?.code;
                const countryCodes = [
                    d.id,
                    d.properties?.ISO_A3,
                    d.properties?.ISO3_CODE,
                    d.properties?.iso_a3,
                    d.properties?.ISO3166_1_A3
                ].filter(Boolean);

                const isActive = activeCode && countryCodes.includes(activeCode);

                // If active guess is the correct country, show green.
                if (isActive && correctCountry && activeCode === correctCountry.code) return "#248b24ff";

                // If previously visited or is the active guess, show red.
                if ((d.id && visitedCountries.has(d.id)) || (isActive)) return "#ff6b6b";

                // Default land fill
                return landFill;
            });
        }

        // Curved great-circle flight path
        // cache interpolators and projected arc samples
        const arcCache = new Map<string, { interp: (t: number) => [number, number], pts: [number, number][] }>();
        function cacheKey(a: Guess, b: Guess) {
            return `${a.latitude},${a.longitude}:${b.latitude},${b.longitude}`;
        }
        function renderFlights() {
            const pairs: Array<[Guess, Guess]> = [];
            for (let i = 1; i <= currentIndex.current; i++) {
                const a = guesses[i - 1];
                const b = guesses[i];
                if (a && b) pairs.push([a, b]);
            }

            const sel = flights
                .selectAll<SVGPathElement, [Guess, Guess]>("path.flight")
                .data(pairs, ([a, b]) => cacheKey(a, b));

            sel.join(
                enter => enter.append("path").attr("class", "flight").attr("fill", "none"),
                update => update,
                exit => exit.remove()
            )
                .attr("stroke", lineColor)
                .attr("stroke-width", 1.8)
                .attr("opacity", 0.5)
                .attr("d", ([a, b]) => {
                    const key = cacheKey(a, b);
                    let cached = arcCache.get(key);

                    // create cache entry if missing
                    if (!cached) {
                        const interp = geoInterpolate([a.longitude, a.latitude], [b.longitude, b.latitude]);
                        cached = { interp, pts: [] };
                        arcCache.set(key, cached);

                        // sample points once
                        const N = 30;
                        const sampled = [];
                        for (let t = 0; t <= 1; t += 1 / N) {
                            sampled.push(cached.interp(t));
                        }
                        cached.pts = sampled;
                    }

                    // project cached arc coords
                    const projected = cached.pts.map(p => projection(p) || [-9999, -9999]);
                    return `M${projected.map(c => c.join(",")).join(" L")}`;
                });
        }

        function isPointVisible(proj: any, pt: Guess) {
            // Use angular distance test: visible if cos(angle) >= 0
            const rot = proj.rotate ? (proj.rotate() as [number, number, number]) : [0, 0, 0];
            // center of projection in geographic coords:
            const centerLon = -rot[0];
            const centerLat = -rot[1];

            const rad = Math.PI / 180;
            const lat1 = pt.latitude * rad;
            const lon1 = pt.longitude * rad;
            const lat2 = centerLat * rad;
            const lon2 = centerLon * rad;

            const cosAng =
                Math.sin(lat1) * Math.sin(lat2) +
                Math.cos(lat1) * Math.cos(lat2) * Math.cos(lon1 - lon2);

            return cosAng >= 0;
        }

        // initial rotation: center on first guess if exists
        if (guesses.length > 0) {
            const g = guesses[0];
            projection.rotate([-g.longitude, -g.latitude, 0]);
        }

        // draw initially
        root.attr("viewBox", `0 0 ${width} ${height}`).attr("preserveAspectRatio", "xMidYMid meet");
        renderMarkers(0);

        // rotation helper — interpolates projection.rotate
        function rotateTo(targetLat: number, targetLon: number, dur = rotateDuration): Promise<void> {
            return new Promise((resolve) => {
                const start = projection.rotate() as [number, number, number];
                const end: [number, number, number] = [-targetLon, -targetLat, 0];
                const interp = interpolate(start, end);
                const ease = easeCubicInOut;
                const t0 = now();

                // stop any existing anim
                if (rotationAnimRef.current) {
                    try { rotationAnimRef.current.stop(); } catch { }
                    rotationAnimRef.current = null;
                }

                rotationAnimRef.current = timer(() => {
                    const t = Math.min(1, (now() - t0) / Math.max(1, dur));
                    projection.rotate(interp(ease(t)));
                    // update world and markers
                    sphere.attr("d", path as any);
                    countries.attr("d", (d: any) => path(d));
                    renderMarkers(currentIndex.current);
                    renderFlights();

                    // overlay must be updated whenever the projection changes
                    overlay.attr("d", path as any);

                    if (t === 1) {
                        if (rotationAnimRef.current) {
                            try { rotationAnimRef.current.stop(); } catch { }
                            rotationAnimRef.current = null;
                        }
                        resolve();
                    }
                });
            });
        }
        async function runOnceJourney() {
            // disable user drag while animating
            disableUserDrag();

            if (!guesses || guesses.length === 0) {
                // nothing to animate — enable drag immediately
                enableUserDrag();
                return;
            }

            // optionally reset visited set
            visitedCountries.clear();

            for (let i = 0; i < guesses.length; i++) {
                const g = guesses[i];
                currentIndex.current = i;

                // wait for rotation to finish
                await rotateTo(g.latitude, g.longitude, rotateDuration);

                // ensure markers/flights updated after rotation
                renderMarkers(currentIndex.current);
                renderFlights();

                // wait a bit at the target
                await wait(stepDuration);
            }

            // after the last one, enable user drag
            enableUserDrag();
        }

        function wait(ms: any) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }


        let geoZoomInstance: any = null;
        function enableUserDrag() {
            if (draggingEnabled.current) return;

            // create the geoZoom instance
            geoZoomInstance = d3GeoZoom()
                .projection(projection)
                .scaleExtent([0.3, 7])
                .onMove(({ scale, rotation }: { scale: number, rotation: [number, number, number] }) => {
                    // apply changes and redraw
                    projection.scale(scale);
                    projection.rotate(rotation);

                    sphere.attr("d", path as any);
                    countries.attr("d", (d: any) => path(d));
                    renderMarkers(currentIndex.current);
                    renderFlights();

                    // update overlay path so hit area matches new projection
                    overlay.attr("d", path as any);
                });

            // attach to overlay DOM node (globe-only gestures)
            // geoZoom is a function that expects a DOM node/selection
            geoZoomInstance(overlay.node());

            // mark enabled
            draggingEnabled.current = true;
        }

        function disableUserDrag() {
            if (!draggingEnabled.current) return;

            // remove listeners attached to the overlay by clearing common namespaces / events
            // d3-geo-zoom attaches pointers + wheel handlers; remove the common ones to be safe:
            try { overlay.on(".zoom", null); } catch (e) { }
            try { overlay.on(".drag", null); } catch (e) { }
            try { overlay.on("pointerdown", null); } catch (e) { }
            try { overlay.on("pointerup", null); } catch (e) { }
            try { overlay.on("wheel", null); } catch (e) { }

            geoZoomInstance = null;
            draggingEnabled.current = false;
        }

        //start animation
        runOnceJourney();

        // cleanup (return from useEffect) — replace your existing cleanup with:
        return () => {
            // stop rotation anim if running
            if (rotationAnimRef.current) {
                try { rotationAnimRef.current.stop(); } catch { }
                rotationAnimRef.current = null;
            }

            // --- remove DOM event listeners on overlay ---
            try {
                const node = overlay.node();
                if (node) {
                    node.removeEventListener('touchstart', onTouchStart as EventListener);
                    node.removeEventListener('touchmove', onTouchMove as EventListener);
                    node.removeEventListener('touchend', onTouchEnd as EventListener);
                    node.removeEventListener('pointerdown', onPointerDown as EventListener);
                    node.removeEventListener('pointerup', onPointerUp as EventListener);
                }
            } catch (e) {
                // ignore
            }

            // --- remove d3-geo-zoom / d3 event namespaces on overlay ---
            try { overlay.on(".zoom", null); } catch (e) { }
            try { overlay.on(".drag", null); } catch (e) { }
            try { overlay.on("pointerdown", null); } catch (e) { }
            try { overlay.on("pointerup", null); } catch (e) { }
            try { overlay.on("wheel", null); } catch (e) { }

            // --- remove everything from the SVG ---
            svg.selectAll("*").remove();
        };

        // re-run if guesses or size changes
    }, [guesses, width, height, stepDuration, rotateDuration, markerRadius, colorScheme]);

    return <svg ref={svgRef} width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} />;
}
