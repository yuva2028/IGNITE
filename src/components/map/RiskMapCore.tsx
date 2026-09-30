import { useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import type {
  LayerId,
  SelectedFeature,
  RiskZoneFeature,
  SpatialGridCellFeature,
  InfrastructureVulnerability,
} from '../../types';
import { calculateLocalInfrastructureAssessment } from '../../services/infrastructureApi';
import { getBaselineGrid } from '../../services/populationService';

// Fix default marker icon paths in Leaflet
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// ── JSON data imports ──────────────────────────────────────────────────────────
import cycloneData from '../../data/cyclone.json';
import riskZonesData from '../../data/risk-zones.json';
import infraData from '../../data/infrastructure.json';

// ── Color helpers ──────────────────────────────────────────────────────────────
const SEVERITY_HEX: Record<string, string> = {
  critical: '#ef4444',
  high:     '#f97316',
  medium:   '#f59e0b',
  low:      '#22c55e',
};

const CAT_COLOR: Record<number, string> = {
  1: '#22c55e',
  2: '#f59e0b',
  3: '#f97316',
  4: '#ef4444',
  5: '#b91c1c',
};

type LayerGroups = Partial<Record<LayerId, L.LayerGroup>>;

interface RiskMapCoreProps {
  visibleLayers: Record<LayerId, boolean>;
  onSelectFeature: (f: SelectedFeature | null) => void;
  mapRef: React.RefObject<L.Map | null>;
  predictedZones?: RiskZoneFeature[];
  spatialGridData?: {
    features: Array<{
      id: string;
      geometry: { type: string; coordinates: number[][][] };
      properties: SpatialGridCellFeature;
    }>;
  } | null;
  assessedAssetsByType?: Record<string, InfrastructureVulnerability[]>;
}

export default function RiskMapCore({
  visibleLayers,
  onSelectFeature,
  mapRef,
  predictedZones,
  spatialGridData,
  assessedAssetsByType,
}: RiskMapCoreProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<LayerGroups>({});

  // ── Build all 7 layer groups synchronously ──────────────────────────────────
  const buildLayers = useCallback((): LayerGroups => {
    const groups: LayerGroups = {};

    // ── 1. Cyclone Track ──────────────────────────────────────────────────────
    {
      const g = L.layerGroup();

      // Historic track (dashed grey)
      const histCoords = cycloneData.historicTrack.map(
        (p): [number, number] => [p.lat, p.lng]
      );
      L.polyline(histCoords, {
        color: '#8fa3b8',
        weight: 2,
        opacity: 0.55,
        dashArray: '5 7',
      }).addTo(g);

      // Forecast track (dashed cyan)
      const curCoord: [number, number] = [
        cycloneData.currentPosition.lat,
        cycloneData.currentPosition.lng,
      ];
      const foreCoords = cycloneData.forecastTrack.map(
        (p): [number, number] => [p.lat, p.lng]
      );
      L.polyline([curCoord, ...foreCoords], {
        color: '#00d4ff',
        weight: 2.5,
        opacity: 0.85,
        dashArray: '8 4',
      }).addTo(g);

      // Uncertainty cone (polygon)
      if (cycloneData.forecastCone?.points?.length) {
        const leftEdge: [number, number][] = [];
        const rightEdge: [number, number][] = [];
        cycloneData.forecastCone.points.forEach((pt) => {
          const offsetDeg = pt.radiusKm / 111;
          leftEdge.push([pt.lat, pt.lng - offsetDeg]);
          rightEdge.unshift([pt.lat, pt.lng + offsetDeg]);
        });
        const conePolygon = [...leftEdge, ...rightEdge];
        L.polygon(conePolygon, {
          color: '#ef4444',
          fillColor: '#ef4444',
          fillOpacity: 0.05,
          weight: 1.2,
          opacity: 0.35,
          dashArray: '4 4',
        }).addTo(g);
      }

      // Wind radii circles
      const radii = cycloneData.windRadii;
      [
        { r: radii.kt34, color: '#f59e0b', label: '34kt (gale force)' },
        { r: radii.kt50, color: '#f97316', label: '50kt (storm force)' },
        { r: radii.kt64, color: '#ef4444', label: '64kt (hurricane force)' },
      ].forEach(({ r, color }) => {
        L.circle(curCoord, {
          radius: r * 1000,
          color,
          fillColor: color,
          fillOpacity: 0.03,
          weight: 1,
          opacity: 0.25,
          dashArray: '4 5',
        }).addTo(g);
      });

      // Historic track node markers
      cycloneData.historicTrack.forEach((pt) => {
        const c = CAT_COLOR[pt.category] ?? '#8fa3b8';
        const icon = L.divIcon({
          html: `<div style="width:8px;height:8px;background:${c};border:1.5px solid ${c}80;border-radius:50%;opacity:0.75;"></div>`,
          iconSize: [8, 8],
          iconAnchor: [4, 4],
          className: '',
        });
        L.marker([pt.lat, pt.lng], { icon })
          .on('click', () => {
            onSelectFeature({
              kind: 'cyclone',
              data: { ...pt, lat: pt.lat, lng: pt.lng, type: 'historic' },
            });
          })
          .addTo(g);
      });

      // Forecast track node markers
      cycloneData.forecastTrack.forEach((pt, i) => {
        const c = CAT_COLOR[pt.category] ?? '#00d4ff';
        const sz = Math.max(5, 9 - i);
        const icon = L.divIcon({
          html: `<div style="width:${sz}px;height:${sz}px;background:#00d4ff;border:1.5px solid ${c};border-radius:50%;opacity:${1 - i * 0.12};"></div>`,
          iconSize: [sz, sz],
          iconAnchor: [sz / 2, sz / 2],
          className: '',
        });
        L.marker([pt.lat, pt.lng], { icon })
          .on('click', () => {
            onSelectFeature({
              kind: 'cyclone',
              data: { ...pt, lat: pt.lat, lng: pt.lng, type: 'forecast' },
            });
          })
          .addTo(g);
      });

      // Eye marker (current position)
      const eyeIcon = L.divIcon({
        html: `<div style="
          width:36px;height:36px;
          background:rgba(239,68,68,0.15);
          border:2.5px solid #ef4444;border-radius:50%;
          display:flex;align-items:center;justify-content:center;
          box-shadow:0 0 24px rgba(239,68,68,0.6),0 0 48px rgba(239,68,68,0.2);
        "><div style="width:11px;height:11px;background:#ef4444;border-radius:50%;"></div></div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        className: '',
      });
      L.marker(curCoord, { icon: eyeIcon, zIndexOffset: 1000 })
        .on('click', () => {
          const cur = cycloneData.currentPosition;
          onSelectFeature({
            kind: 'cyclone',
            data: {
              label: 'NOW — Current Eye Position',
              lat: cur.lat,
              lng: cur.lng,
              category: cur.category,
              windSpeedKmh: cur.windSpeedKmh,
              pressureHpa: cur.pressureHpa,
              note: 'Current simulated eye position. Cyclone moving NNW at 18 km/h.',
              type: 'current',
            },
          });
        })
        .addTo(g);

      groups.cycloneTrack = g;
    }

    // ── 2. Risk Zones ──────────────────────────────────────────────────────────
    {
      const g = L.layerGroup();
      const zonesToRender = predictedZones && predictedZones.length > 0 ? predictedZones : (riskZonesData.zones as unknown as RiskZoneFeature[]);

      zonesToRender.forEach((zone) => {
        const color = SEVERITY_HEX[zone.severity] ?? '#8fa3b8';
        const rawCoords = (zone as unknown as { coordinates?: [number, number][] }).coordinates;
        if (!rawCoords) return;

        const latlngs = rawCoords.map(
          ([lng, lat]): [number, number] => [lat, lng]
        );
        const poly = L.polygon(latlngs, {
          color,
          fillColor: color,
          fillOpacity: 0.16,
          weight: 1.8,
          opacity: 0.75,
          dashArray: '4 4',
        });
        poly.on('click', () => {
          onSelectFeature({
            kind: 'riskZone',
            data: zone,
          });
        });
        const scoreBadge = zone.riskScore != null ? ` · Risk: <b>${zone.riskScore}</b>` : '';
        const topFactor = zone.riskFactors && zone.riskFactors.length > 0 ? `<br/><span style="color:#38bdf8;">${zone.riskFactors[0]}</span>` : '';
        poly.bindTooltip(
          `<div style="font-size:10px;font-family:Inter,sans-serif;color:#e2eaf4">
            <b>${zone.name}</b><br/>${zone.severity.toUpperCase()}${scoreBadge} — ${(zone.population / 1000).toFixed(0)}K pop.
            ${topFactor}
          </div>`,
          { sticky: true }
        );
        poly.addTo(g);
      });

      groups.riskZones = g;
    }

    // ── 2b. Spatial ML Grid (Phase 3) ──────────────────────────────────────────
    {
      const g = L.layerGroup();
      if (spatialGridData?.features?.length) {
        spatialGridData.features.forEach((feat) => {
          const p = feat.properties;
          const color = SEVERITY_HEX[p.severity] ?? '#06b6d4';
          const ring = feat.geometry.coordinates[0];
          const latlngs = ring.map(([lng, lat]): [number, number] => [lat, lng]);

          const opacity = Math.min(0.55, Math.max(0.12, (p.risk_score / 100) * 0.55));
          const poly = L.polygon(latlngs, {
            color,
            fillColor: color,
            fillOpacity: opacity,
            weight: 1,
            opacity: 0.6,
            dashArray: '2 3',
          });

          poly.on('click', () => {
            onSelectFeature({
              kind: 'spatialGrid',
              data: p,
            });
          });

          const topFactor = p.risk_factors && p.risk_factors.length > 0 ? `<br/><span style="color:#00e5a0;font-size:9px;">${p.risk_factors[0]}</span>` : '';
          poly.bindTooltip(
            `<div style="font-size:10px;font-family:Inter,sans-serif;color:#e2eaf4">
              <b>${p.name}</b><br/>
              Score: <b>${p.risk_score}</b> / 100 (${p.risk_category})
              ${topFactor}
            </div>`,
            { sticky: true }
          );
          poly.addTo(g);
        });
      }
      groups.spatialGrid = g;
    }

    const localAssessed = calculateLocalInfrastructureAssessment().assetsByType;
    const assets: Record<string, InfrastructureVulnerability[]> = assessedAssetsByType || localAssessed;

    // ── 3. Roads ───────────────────────────────────────────────────────────────
    {
      const g = L.layerGroup();
      infraData.roads.forEach((road) => {
        const assessed = assets.roads?.find((a) => a.id === road.id) || {
          id: road.id,
          name: road.name,
          type: 'roads' as const,
          riskLevel: road.riskLevel,
          riskScore: road.riskLevel === 'critical' ? 82 : road.riskLevel === 'high' ? 68 : 42,
          floodExposure: 74,
          windExposure: 66,
          stormSurgeExposure: 62,
          locationVulnerability: 54,
          overallVulnerability: 68,
          riskFactors: ['road low-elevation inundation corridor', 'debris blockage risk'],
          preparednessNote: 'Pre-position emergency debris removal cranes and detour signage.',
          populationDependent: 45000,
          status: road.status,
          notes: road.notes,
        };

        const color = SEVERITY_HEX[assessed.riskLevel] ?? '#8fa3b8';
        const latlngs = road.coordinates.map(
          ([lng, lat]): [number, number] => [lat, lng]
        );
        const line = L.polyline(latlngs, {
          color,
          weight: 3.5,
          opacity: 0.85,
          dashArray: assessed.riskLevel === 'critical' ? '1 0' : '6 3',
        });
        line.on('click', () => {
          onSelectFeature({ kind: 'infrastructure', data: assessed as InfrastructureVulnerability });
        });
        line.bindTooltip(
          `<div style="font-size:10px;font-family:Inter,sans-serif;color:#e2eaf4">
            <b>${assessed.name}</b><br/>
            <span style="color:#94a3b8">ROAD CORRIDOR</span> · Risk: <b style="color:${color}">${assessed.riskLevel.toUpperCase()}</b> (${assessed.riskScore}/100)<br/>
            <span style="color:#00d4ff;font-size:9px;">Flood: ${assessed.floodExposure}% | Wind: ${assessed.windExposure}% | Surge: ${assessed.stormSurgeExposure}%</span>
          </div>`,
          { sticky: true }
        );
        line.addTo(g);
      });
      groups.roads = g;
    }

    // ── 4. Bridges ─────────────────────────────────────────────────────────────
    {
      const g = L.layerGroup();
      (assets.bridges || []).forEach((bridge) => {
        const color = SEVERITY_HEX[bridge.riskLevel] ?? '#8fa3b8';
        const riskBorder = color;
        const icon = L.divIcon({
          html: `<div style="
            width:16px;height:16px;
            background:${color}25;border:2px solid ${riskBorder};
            border-radius:3px;display:flex;align-items:center;justify-content:center;
            box-shadow:0 0 10px ${color}60;
          ">
            <div style="width:6px;height:6px;background:${color};border-radius:1px;"></div>
          </div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8],
          className: '',
        });
        if (bridge.lat != null && bridge.lng != null) {
          L.marker([bridge.lat, bridge.lng], { icon })
            .on('click', () => {
              onSelectFeature({ kind: 'infrastructure', data: bridge });
            })
            .bindTooltip(
              `<div style="font-size:10px;font-family:Inter,sans-serif;color:#e2eaf4">
                <b>${bridge.name}</b><br/>
                <span style="color:#a855f7">BRIDGE</span> · Risk: <b style="color:${color}">${bridge.riskLevel.toUpperCase()}</b> (${bridge.riskScore}/100)<br/>
                <span style="color:#00d4ff;font-size:9px;">Flood: ${bridge.floodExposure}% | Wind: ${bridge.windExposure}%</span>
              </div>`
            )
            .addTo(g);
        }
      });
      groups.bridges = g;
    }

    // ── 5. Hospitals ───────────────────────────────────────────────────────────
    {
      const g = L.layerGroup();
      (assets.hospitals || []).forEach((h) => {
        const color = SEVERITY_HEX[h.riskLevel] ?? '#00e5a0';
        const icon = L.divIcon({
          html: `<div style="
            width:18px;height:18px;
            background:#00e5a020;border:2px solid ${color};
            border-radius:50%;display:flex;align-items:center;justify-content:center;
            box-shadow:0 0 12px #00e5a060;
          ">
            <div style="color:#00e5a0;font-size:10px;font-weight:900;line-height:1;">+</div>
          </div>`,
          iconSize: [18, 18],
          iconAnchor: [9, 9],
          className: '',
        });
        if (h.lat != null && h.lng != null) {
          L.marker([h.lat, h.lng], { icon, zIndexOffset: 200 })
            .on('click', () => {
              onSelectFeature({ kind: 'infrastructure', data: h });
            })
            .bindTooltip(
              `<div style="font-size:10px;font-family:Inter,sans-serif;color:#e2eaf4">
                <b>${h.name}</b><br/>
                <span style="color:#00e5a0">HOSPITAL</span> · Risk: <b style="color:${color}">${h.riskLevel.toUpperCase()}</b> (${h.riskScore}/100)<br/>
                <span style="color:#00d4ff;font-size:9px;">Flood: ${h.floodExposure}% | Wind: ${h.windExposure}%</span>
              </div>`
            )
            .addTo(g);
        }
      });
      groups.hospitals = g;
    }

    // ── 6. Power Substations ───────────────────────────────────────────────────
    {
      const g = L.layerGroup();
      (assets.power || []).forEach((p) => {
        const color = SEVERITY_HEX[p.riskLevel] ?? '#f59e0b';
        const icon = L.divIcon({
          html: `<div style="
            width:16px;height:16px;
            background:#f59e0b20;border:2px solid ${color};
            border-radius:3px;display:flex;align-items:center;justify-content:center;
            box-shadow:0 0 10px #f59e0b60;
            transform:rotate(45deg);
          ">
            <div style="width:6px;height:6px;background:#f59e0b;border-radius:1px;transform:rotate(-45deg);"></div>
          </div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8],
          className: '',
        });
        if (p.lat != null && p.lng != null) {
          L.marker([p.lat, p.lng], { icon })
            .on('click', () => {
              onSelectFeature({ kind: 'infrastructure', data: p });
            })
            .bindTooltip(
              `<div style="font-size:10px;font-family:Inter,sans-serif;color:#e2eaf4">
                <b>${p.name}</b><br/>
                <span style="color:#f59e0b">POWER SUBSTATION</span> · Risk: <b style="color:${color}">${p.riskLevel.toUpperCase()}</b> (${p.riskScore}/100)<br/>
                <span style="color:#00d4ff;font-size:9px;">Flood: ${p.floodExposure}% | Wind: ${p.windExposure}%</span>
              </div>`
            )
            .addTo(g);
        }
      });
      groups.power = g;
    }

    // ── 7. Shelters ────────────────────────────────────────────────────────────
    {
      const g = L.layerGroup();
      (assets.shelters || []).forEach((s) => {
        const color = SEVERITY_HEX[s.riskLevel] ?? '#1a6cff';
        const icon = L.divIcon({
          html: `<div style="
            width:16px;height:16px;
            background:#1a6cff25;border:2px solid ${color};
            border-radius:3px;display:flex;align-items:center;justify-content:center;
            box-shadow:0 0 10px #1a6cff60;
          ">
            <div style="width:6px;height:6px;background:#1a6cff;border-radius:1px;"></div>
          </div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8],
          className: '',
        });
        if (s.lat != null && s.lng != null) {
          L.marker([s.lat, s.lng], { icon })
            .on('click', () => {
              onSelectFeature({ kind: 'infrastructure', data: s });
            })
            .bindTooltip(
              `<div style="font-size:10px;font-family:Inter,sans-serif;color:#e2eaf4">
                <b>${s.name}</b><br/>
                <span style="color:#3b82f6">SHELTER</span> · Risk: <b style="color:${color}">${s.riskLevel.toUpperCase()}</b> (${s.riskScore}/100)<br/>
                <span style="color:#00d4ff;font-size:9px;">Flood: ${s.floodExposure}% | Surge: ${s.stormSurgeExposure}%</span>
              </div>`
            )
            .addTo(g);
        }
      });
      groups.shelters = g;
    }

    // ── 8. Schools (Phase 4) ───────────────────────────────────────────────────
    {
      const g = L.layerGroup();
      (assets.schools || []).forEach((sc) => {
        const color = SEVERITY_HEX[sc.riskLevel] ?? '#6366f1';
        const icon = L.divIcon({
          html: `<div style="
            width:16px;height:16px;
            background:#6366f125;border:2px solid ${color};
            border-radius:4px;display:flex;align-items:center;justify-content:center;
            box-shadow:0 0 10px #6366f160;
          ">
            <div style="color:#818cf8;font-size:9px;font-weight:900;line-height:1;">S</div>
          </div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8],
          className: '',
        });
        if (sc.lat != null && sc.lng != null) {
          L.marker([sc.lat, sc.lng], { icon })
            .on('click', () => {
              onSelectFeature({ kind: 'infrastructure', data: sc });
            })
            .bindTooltip(
              `<div style="font-size:10px;font-family:Inter,sans-serif;color:#e2eaf4">
                <b>${sc.name}</b><br/>
                <span style="color:#818cf8">SCHOOL / SHELTER</span> · Risk: <b style="color:${color}">${sc.riskLevel.toUpperCase()}</b> (${sc.riskScore}/100)<br/>
                <span style="color:#00d4ff;font-size:9px;">Flood: ${sc.floodExposure}% | Wind: ${sc.windExposure}%</span>
              </div>`
            )
            .addTo(g);
        }
      });
      groups.schools = g;
    }

    // ── 9. Telecommunications (Phase 4) ────────────────────────────────────────
    {
      const g = L.layerGroup();
      (assets.telecommunications || []).forEach((tc) => {
        const color = SEVERITY_HEX[tc.riskLevel] ?? '#06b6d4';
        const icon = L.divIcon({
          html: `<div style="
            width:16px;height:16px;
            background:#06b6d425;border:2px solid ${color};
            border-radius:50%;display:flex;align-items:center;justify-content:center;
            box-shadow:0 0 10px #06b6d460;
          ">
            <div style="width:6px;height:6px;background:#06b6d4;border-radius:50%;"></div>
          </div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8],
          className: '',
        });
        if (tc.lat != null && tc.lng != null) {
          L.marker([tc.lat, tc.lng], { icon })
            .on('click', () => {
              onSelectFeature({ kind: 'infrastructure', data: tc });
            })
            .bindTooltip(
              `<div style="font-size:10px;font-family:Inter,sans-serif;color:#e2eaf4">
                <b>${tc.name}</b><br/>
                <span style="color:#22d3ee">COMMS TOWER</span> · Risk: <b style="color:${color}">${tc.riskLevel.toUpperCase()}</b> (${tc.riskScore}/100)<br/>
                <span style="color:#00d4ff;font-size:9px;">Wind: ${tc.windExposure}% | Surge: ${tc.stormSurgeExposure}%</span>
              </div>`
            )
            .addTo(g);
        }
      });
      groups.telecommunications = g;
    }

    // ── 10. Population Exposure Grid (Phase 6) ─────────────────────────────────
    {
      const g = L.layerGroup();
      const cells = getBaselineGrid();
      cells.forEach((cell) => {
        const color = SEVERITY_HEX[cell.risk_category] ?? '#ec4899';
        const radius = Math.min(15, Math.max(6, Math.round(Math.sqrt(cell.population / 1000) * 1.6)));
        const marker = L.circleMarker([cell.lat, cell.lng], {
          radius,
          fillColor: color,
          fillOpacity: 0.65,
          color: '#ffffff',
          weight: 1.5,
          opacity: 0.9,
        });

        marker.on('click', () => {
          onSelectFeature({ kind: 'populationCell', data: cell });
        });

        marker.bindTooltip(`
          <div style="font-size:10px;font-family:Inter,sans-serif;color:#e2eaf4">
            <b>${cell.name}</b><br/>
            <span style="color:#f472b6">POPULATION GRID CELL</span> · <b>${cell.population.toLocaleString()}</b> pop.<br/>
            Risk: <b style="color:${color}">${cell.risk_category.toUpperCase()}</b> (${cell.risk_score}/100)<br/>
            <span style="color:#00d4ff;font-size:9px;">Elevation: ${cell.elevation_m}m · Area: ${cell.area_km2} km²</span>
          </div>
        `);

        marker.addTo(g);
      });
      groups.populationGrid = g;
    }

    return groups;
  }, [onSelectFeature, predictedZones, spatialGridData, assessedAssetsByType]);

  // ── Re-sync riskZones, spatialGrid, and infrastructure when dynamic data arrives ─
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const newGroups = buildLayers();

    // Re-sync all layer groups dynamically
    Object.entries(newGroups).forEach(([id, newGroup]) => {
      const layerId = id as LayerId;
      const oldGroup = layerGroupRef.current[layerId];
      if (oldGroup && map.hasLayer(oldGroup)) {
        map.removeLayer(oldGroup);
      }
      layerGroupRef.current[layerId] = newGroup;
      if (visibleLayers[layerId] && newGroup) {
        newGroup.addTo(map);
      }
    });
  }, [predictedZones, spatialGridData, assessedAssetsByType, buildLayers, visibleLayers]);

  // ── Initialize map ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!containerRef.current) return;
    if (mapInstanceRef.current) return;

    // Create Leaflet map
    const map = L.map(containerRef.current, {
      center: [19.8, 85.8],
      zoom: 7,
      zoomControl: false,
      attributionControl: false,
    });

    mapInstanceRef.current = map;
    (mapRef as React.MutableRefObject<L.Map | null>).current = map;

    // Dark tile layer (ESRI Dark Gray Canvas - reliable, fast, zero watermark)
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
        maxZoom: 16,
      }
    ).addTo(map);

    L.control.attribution({ prefix: false, position: 'bottomright' }).addTo(map);
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Build layer groups synchronously
    const groups = buildLayers();
    layerGroupRef.current = groups;

    // Add all layers that start visible
    Object.entries(groups).forEach(([id, group]) => {
      if (visibleLayers[id as LayerId] && group) {
        group.addTo(map);
      }
    });

    // Invalidate size immediately and with short timeouts
    map.invalidateSize();
    const timers = [50, 150, 400, 800].map((ms) =>
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, ms)
    );

    // Watch container resize for smooth sidebar/panel collapsing
    const ro = new ResizeObserver(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    });
    ro.observe(containerRef.current);

    return () => {
      timers.forEach(clearTimeout);
      ro.disconnect();
      map.remove();
      mapInstanceRef.current = null;
      (mapRef as React.MutableRefObject<L.Map | null>).current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Sync layer visibility ─────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    Object.entries(layerGroupRef.current).forEach(([id, group]) => {
      if (!group) return;
      const shouldShow = visibleLayers[id as LayerId];
      if (shouldShow && !map.hasLayer(group)) {
        group.addTo(map);
      } else if (!shouldShow && map.hasLayer(group)) {
        map.removeLayer(group);
      }
    });
  }, [visibleLayers]);

  return (
    <div
      ref={containerRef}
      id="risk-map-leaflet-container"
      className="absolute inset-0 w-full h-full"
    />
  );
}
