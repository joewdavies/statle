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
    stepDuration = 2400,
    rotateDuration = 900,
    markerRadius = 3,
    correctCountry,
}: Props) {
    const svgRef = useRef<SVGSVGElement | null>(null);
    const currentIndex = useRef(0);
    const timerRef = useRef<number | null>(null);
    const rotationAnimRef = useRef<any | null>(null);
    const { colorScheme } = useMantineColorScheme(); // 'light' or 'dark'
    const sphereFill = colorScheme === 'dark' ? '#96ccd6ff' : '#b4e1e9ff';
    const landFill = colorScheme === 'dark' ? '#3a3a3aff' : '#f2f2f2';
    const sphereDropShadow = colorScheme === 'dark' ? 'drop-shadow(0px 0px 6px rgba(150, 150, 150, 0.4))' : 'drop-shadow(0px 0px 6px rgba(200, 249, 255, 0.4))';

    useEffect(() => {
        if (!svgRef.current) return;
        const svg = select(svgRef.current);
        svg.selectAll("*").remove();

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

        // Filter Antarctica if present
        worldGeoJSON.features = worldGeoJSON.features.filter(
            (f: any) => f.id !== "AQ" && f.properties?.ISO3_CODE !== "ATA"
        );

        // Background sphere
        svg
            .append("path")
            .datum({ type: "Sphere" } as any)
            .attr("d", path as any).attr("class", "sphere")
            .attr("fill", sphereFill)
            .attr("stroke", "#a7a7a781")
            .attr("stroke-width", 0.8)
            .style("filter", sphereDropShadow);

        // Countries
        const countries = svg
            .append("g")
            .attr("class", "countries")
            .selectAll("path")
            .data(worldGeoJSON.features)
            .join("path")
            .attr("d", (d: any) => path(d) as string)
            .attr("fill", landFill)
            .attr("stroke", "#c7d7e6")
            .attr("stroke-width", 0.25);

        // Markers group
        const markers = svg.append("g").attr("class", "markers");

        //flights group
        const flights = svg.append("g").attr("class", "flights");

        // store which guesses have already been visited
        const visitedCountries = new Set<string>();

        function renderMarkers(idx: number | null = null) {
            // reset visited if we are back at the start
            if (idx === 0) visitedCountries.clear();
            if (idx !== null && guesses[idx].code) visitedCountries.add(guesses[idx].code);

            // add marker
            markers
                .selectAll("circle.marker")
                .data(guesses)
                .join("circle")
                .attr("class", "marker")
                .attr("r", (_d: any, i: any) => (i === idx ? markerRadius * 2 : markerRadius))
                .attr("cx", (d: any) => {
                    const p = projection([d.longitude, d.latitude]);
                    return p ? p[0] : -9999;
                })
                .attr("cy", (d: any) => {
                    const p = projection([d.longitude, d.latitude]);
                    return p ? p[1] : -9999;
                })
                .attr("fill", d => {
                    if (correctCountry && d.code === correctCountry.code) return "#248b24ff"; // green
                    return "#ff6b6b"; // red
                })
                .attr("stroke", "#fff")
                .attr("stroke-width", 0.8)
                .attr("opacity", (d: any) => (isPointVisible(projection, d) ? 1 : 0.25));

            // Update country polygons
            countries.attr("fill", (d: any) => {
                const isVisited = visitedCountries.has(d.id);
                const isActive = idx !== null && guesses[idx].code === d.id;
                if (isActive && correctCountry && guesses[idx].code === correctCountry.code) return "#248b24ff";
                if (isVisited) return "#ff6b6b";
                return landFill;
            });
        }

        // Curved great-circle flight path
        function renderFlights() {
            flights.selectAll("path.flight")
                .data(guesses.slice(0, currentIndex.current + 1).map((d, i) => {
                    if (i === 0) return null;
                    return [guesses[i - 1], d];
                }).filter(Boolean))
                .join("path")
                .attr("class", "flight")
                .attr("fill", "none")
                .attr("stroke", "rgba(68, 68, 68, 0.5)")
                .attr("stroke-width", 1.5)
                .attr("opacity", 0.7)
                .attr("d", ([a, b]: any) => {
                    // Use geoInterpolate to sample points along great circle
                    const interp = geoInterpolate([a.longitude, a.latitude], [b.longitude, b.latitude]);
                    const num = 30; // points along the arc
                    const coords = [];
                    for (let t = 0; t <= 1; t += 1 / num) {
                        coords.push(projection(interp(t)) ?? [-9999, -9999]);
                    }
                    return coords.length > 0
                        ? `M${coords.map(c => c.join(",")).join(" L")}`
                        : null;
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
        svg.attr("viewBox", `0 0 ${width} ${height}`).attr("preserveAspectRatio", "xMidYMid meet");
        renderMarkers(0);

        // rotation helper — interpolates projection.rotate
        function rotateTo(targetLat: number, targetLon: number, dur = rotateDuration) {
            const start = projection.rotate() as [number, number, number];
            const end: [number, number, number] = [-targetLon, -targetLat, 0];
            const interp = interpolate(start, end);
            const ease = easeCubicInOut;
            const t0 = now();

            if (rotationAnimRef.current) rotationAnimRef.current.stop();
            rotationAnimRef.current = timer(() => {
                const t = Math.min(1, (now() - t0) / Math.max(1, dur));
                projection.rotate(interp(ease(t)));
                // update world and markers
                countries.attr("d", (d: any) => path(d) as string);
                renderMarkers(currentIndex.current);
                renderFlights();
                if (t === 1) {
                    if (rotationAnimRef.current) rotationAnimRef.current.stop();
                    rotationAnimRef.current = null;
                }
            });
        }

        // start looping through guesses
        function startLoop() {
            if (!guesses.length) return;
            // clear any previous timers
            if (timerRef.current) {
                window.clearInterval(timerRef.current);
                timerRef.current = null;
            }
            // ensure index starts at 0
            currentIndex.current = 0;
            // rotate to first immediately
            rotateTo(guesses[0].latitude, guesses[0].longitude, rotateDuration);
            renderMarkers(0);

            timerRef.current = window.setInterval(() => {
                currentIndex.current = (currentIndex.current + 1) % guesses.length;
                const g = guesses[currentIndex.current];
                rotateTo(g.latitude, g.longitude, rotateDuration);
            }, Math.max(400, stepDuration));
        }

        // kick off
        startLoop();

        // cleanup
        return () => {
            if (timerRef.current) {
                window.clearInterval(timerRef.current);
                timerRef.current = null;
            }
            if (rotationAnimRef.current) {
                rotationAnimRef.current.stop();
                rotationAnimRef.current = null;
            }
            svg.selectAll("*").remove();
        };
        // re-run if guesses or size changes
    }, [guesses, width, height, stepDuration, rotateDuration, markerRadius, colorScheme]);

    return <svg ref={svgRef} width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} />;
}
