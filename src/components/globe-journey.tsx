// src/components/globe-journey.tsx
import { useEffect, useRef } from "react";
import { select } from "d3-selection";
import { interpolate } from "d3-interpolate";
import { easeCubicInOut } from "d3-ease";
import { timer, now } from "d3-timer";
import { geoOrthographic, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import worldTopoJSON from "../data/world-topo.json";

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
};

export default function GlobeJourney({
    guesses = [],
    width = 700,
    height = 500,
    stepDuration = 2400,
    rotateDuration = 900,
    markerRadius = 3,
}: Props) {
    const svgRef = useRef<SVGSVGElement | null>(null);
    const currentIndex = useRef(0);
    const timerRef = useRef<number | null>(null);
    const rotationAnimRef = useRef<any | null>(null);

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
            .attr("d", path as any)
            .attr("fill", "#b4e1e9ff")
            .attr("stroke", "#2b4a66")
            .attr("stroke-width", 0.8);

        // Countries
        const countries = svg
            .append("g")
            .attr("class", "countries")
            .selectAll("path")
            .data(worldGeoJSON.features)
            .join("path")
            .attr("d", (d: any) => path(d) as string)
            .attr("fill", "#f2f2f2")
            .attr("stroke", "#c7d7e6")
            .attr("stroke-width", 0.25);

        // Markers group
        const markers = svg.append("g").attr("class", "markers");

        function renderMarkers(idx: number | null = null) {
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
                .attr("fill", (_d: any, i: any) => { return i == guesses.length - 1 ? "#248b24ff" : "#ff6b6b"; })
                .attr("stroke", "#fff")
                .attr("stroke-width", 0.8)
                .attr("opacity", (d: any) => (isPointVisible(projection, d) ? 1 : 0.25));
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
    }, [guesses, width, height, stepDuration, rotateDuration, markerRadius]);

    return <svg ref={svgRef} width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} />;
}
