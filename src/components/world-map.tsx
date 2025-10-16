// src/components/WorldMap.tsx
import { select } from 'd3-selection';
import { geoNaturalEarth1, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import { useEffect, useRef } from 'react';
import { UserStatsService } from '../services/userStats';
import worldTopoJSON from '../data/world-topo.json'; // your TopoJSON file

export function WorldMap() {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const svgRef = useRef<SVGSVGElement | null>(null);

    useEffect(() => {
        if (!containerRef.current) return;
        const svg = select(svgRef.current);
        const container = containerRef.current;

        // --- Helper render function ---
        function render() {
            const { width, height } = container.getBoundingClientRect();
            if (width === 0 || height === 0) return;
            svg.selectAll('*').remove();

            // Convert TopoJSON → GeoJSON
            const worldGeoJSON: any = feature(
                worldTopoJSON as any,
                (worldTopoJSON as any).objects.CNTR_RG_20M_2020_4326
            );

            // 🧊 Remove Antarctica (ISO = "AQ")
            worldGeoJSON.features = worldGeoJSON.features.filter(
                (f: any) => f.id !== 'AQ' && f.properties.ISO3_CODE !== 'ATA'
            );

            const projection =
                geoNaturalEarth1()
                    .fitSize([width, height], {
                        type: 'Sphere',
                    });

            const path = geoPath(projection);

            // Correctly guessed countries
            const allGames = UserStatsService.getAll();
            const correctCodes = new Set(
                allGames
                    .filter((g) => g.result === 'won')
                    .map((g) => g.countryCode.toUpperCase())
            );

            const fillColor = (iso: string) =>
                correctCodes.has(iso?.toUpperCase()) ? '#4caf50' : '#e0e0e0';

            svg
                .attr('viewBox', `0 0 ${width} ${height}`)
                .attr('preserveAspectRatio', 'xMidYMid meet');


            const countries = svg
                .selectAll<SVGPathElement, any>('path.country')
                .data(worldGeoJSON.features)
                .join('path')
                .attr('class', 'country')
                .attr('d', (d: any) => path(d) as string)
                .attr('fill', (d: any) => fillColor(d.id || d.properties.ISO_A3 || d.properties.iso_a3));

            countries.append('title')
                .text((d: any) => d.properties.na || d.properties.CNTR_NAME);

        }

        // --- Initial render ---
        render();

        // --- Observe container resize ---
        const observer = new ResizeObserver(() => render());
        observer.observe(container);

        return () => observer.disconnect();
    }, []);

    return (
        <div
            ref={containerRef}
            style={{
                width: '100%',
                aspectRatio: '2 / 1', // maintain good proportions
                position: 'relative',
            }}
        >
            <svg ref={svgRef} style={{ width: '100%', height: '100%' }} />
        </div>
    );
}
