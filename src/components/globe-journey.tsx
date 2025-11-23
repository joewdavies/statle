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
import { drag } from "d3-drag";
//import 'd3-transition';
import { zoom } from "d3-zoom"; // Import D3's zoom behavior

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
    const dragBehaviorRef = useRef<any | null>(null);
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

        // Markers group
        const markers = root.append("g").attr("class", "markers");

        //flights group
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

            // Update fill on countries — cheap string checks only
            countries.attr("fill", (d: any) => {
                const activeGuess = idx !== null ? guesses[idx] : null;
                const isActive = activeGuess && (activeGuess.code === d.id || activeGuess.code === d.properties?.ISO_A3 || activeGuess.code === d.properties?.ISO3_CODE);
                if (isActive && correctCountry && activeGuess && activeGuess.code === correctCountry.code) return "#248b24ff";
                if (visitedCountries.has(d.id) || (activeGuess && activeGuess.code === d.id)) return "#ff6b6b";
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

                // wait a bit at the target: stepDuration minus rotateDuration could be used,
                // but simpler: wait the provided stepDuration before moving on
                await wait(stepDuration);
            }

            // after the last one, enable user drag
            enableUserDrag();
        }

        runOnceJourney();

        function wait(ms: any) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }

        function enableUserDrag() {
            if (draggingEnabled.current) return;

            const initialScale = projection.scale();

            // Drag behavior
            const dragBehavior = drag()
                .on("start", () => {
                    // Cancel any running rotation if user interrupts
                    if (rotationAnimRef.current) {
                        try { rotationAnimRef.current.stop(); } catch { }
                        rotationAnimRef.current = null;
                    }
                })
                .on("drag", (event: any) => {
                    const rotate = projection.rotate ? (projection.rotate() as [number, number, number]) : [0, 0, 0];
                    const sensitivity = 0.25;
                    const newRotate: [number, number, number] = [
                        rotate[0] + event.dx * sensitivity,
                        Math.max(-90, Math.min(90, rotate[1] - event.dy * sensitivity)),
                        0,
                    ];
                    projection.rotate(newRotate);

                    // Redraw globe
                    //sphere.attr("d", path as any);
                    countries.attr("d", (d: any) => path(d) as string);
                    renderMarkers(currentIndex.current);
                    renderFlights();
                })
                .on("end", () => {
                    // Drag behavior ends
                });

            dragBehaviorRef.current = dragBehavior;

            // Zoom behavior
            const zoomBehavior = zoom()
                //.wheelDelta(() => 0)     // ensures mobile pinch uses default behavior
                .filter(event => {
                    // Allow:
                    // - touch pinch
                    // - mouse wheel
                    // - ignore double-tap zoom
                    return (!event.touches || event.touches.length === 2) || event.type === "wheel";
                })
                .scaleExtent([0.3, 7])
                .on("zoom", (event: any) => {
                    const k = event.transform.k;
                    projection.scale(initialScale * k);

                    sphere.attr("d", path as any);
                    countries.attr("d", (d: any) => path(d));
                    renderMarkers(currentIndex.current);
                    renderFlights();
                });

            // Apply both drag and zoom behaviors to the SVG
            root.call(dragBehavior as any).call(zoomBehavior as any);

            draggingEnabled.current = true;
        }

        function disableUserDrag() {
            if (!draggingEnabled.current) return;

            // Remove the drag and zoom behaviors
            root.on('.drag', null); // Remove drag behavior
            root.on('.zoom', null); // Remove zoom behavior
            dragBehaviorRef.current = null;
            draggingEnabled.current = false;
        }

        // cleanup
        return () => {
            // stop rotation anim if running
            if (rotationAnimRef.current) {
                try { rotationAnimRef.current.stop(); } catch { }
                rotationAnimRef.current = null;
            }
            // remove drag handlers
            try { root.on('.drag', null); } catch { }
            svg.selectAll("*").remove();
        };
        // re-run if guesses or size changes
    }, [guesses, width, height, stepDuration, rotateDuration, markerRadius, colorScheme]);

    return <svg ref={svgRef} width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} />;
}
