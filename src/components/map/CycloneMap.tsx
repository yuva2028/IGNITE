import { useEffect, useRef } from 'react';
import { DEMO_CYCLONE_PATH, DEMO_INFRASTRUCTURE_ASSETS, DEMO_RISK_ZONES } from '../../data/mockData';

// We load Leaflet dynamically to avoid SSR issues
let L: typeof import('leaflet') | null = null;

async function getLeaflet() {
  if (!L) {
    L = (await import('leaflet')).default;
    // Fix default marker icons
    delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    });
  }
  return L;
}

export default function CycloneMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<import('leaflet').Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    let mounted = true;

    getLeaflet().then((Leaflet) => {
      if (!mounted || !mapRef.current || mapInstanceRef.current) return;

      // Init map
      const map = Leaflet.map(mapRef.current, {
        center: [DEMO_CYCLONE_PATH.currentPosition.lat, DEMO_CYCLONE_PATH.currentPosition.lng],
        zoom: 6,
        zoomControl: false,
        attributionControl: false,
      });

      mapInstanceRef.current = map;

      // Dark tile layer (ESRI Dark Gray Canvas - crisp, fast, no watermark)
      Leaflet.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
        {
          attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
          maxZoom: 16,
        }
      ).addTo(map);

      // Attribution (small)
      Leaflet.control.attribution({ prefix: false, position: 'bottomright' }).addTo(map);

      // Zoom control top-right
      Leaflet.control.zoom({ position: 'topright' }).addTo(map);

      // ── Historic track (dotted white) ──────────────────────────────────────
      const historicCoords = DEMO_CYCLONE_PATH.historicTrack.map(
        (p): [number, number] => [p.lat, p.lng]
      );
      Leaflet.polyline(historicCoords, {
        color: '#8fa3b8',
        weight: 2,
        opacity: 0.5,
        dashArray: '4 6',
      }).addTo(map);

      // ── Forecast track (cyan dashed) ───────────────────────────────────────
      const forecastCoords = DEMO_CYCLONE_PATH.forecastTrack.map(
        (p): [number, number] => [p.lat, p.lng]
      );
      const currentCoord: [number, number] = [
        DEMO_CYCLONE_PATH.currentPosition.lat,
        DEMO_CYCLONE_PATH.currentPosition.lng,
      ];
      Leaflet.polyline([currentCoord, ...forecastCoords], {
        color: '#00d4ff',
        weight: 2.5,
        opacity: 0.8,
        dashArray: '8 4',
      }).addTo(map);

      // ── Impact radius circle ──────────────────────────────────────────────
      Leaflet.circle(currentCoord, {
        radius: DEMO_CYCLONE_PATH.affectedRadius * 1000,
        color: '#ef4444',
        fillColor: '#ef4444',
        fillOpacity: 0.04,
        weight: 1,
        opacity: 0.3,
        dashArray: '5 5',
      }).addTo(map);

      // ── Eye marker ────────────────────────────────────────────────────────
      const eyeIcon = Leaflet.divIcon({
        html: `<div style="
          width: 32px; height: 32px;
          background: rgba(239,68,68,0.15);
          border: 2px solid #ef4444;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 0 20px rgba(239,68,68,0.5), 0 0 40px rgba(239,68,68,0.2);
          animation: spin 8s linear infinite;
        ">
          <div style="
            width: 10px; height: 10px;
            background: #ef4444;
            border-radius: 50%;
          "></div>
        </div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        className: '',
      });
      Leaflet.marker(currentCoord, { icon: eyeIcon })
        .addTo(map)
        .bindPopup(`
          <div style="font-family: Inter, sans-serif; font-size: 11px; color: #e2eaf4; background: #0f1a25; padding: 8px; border-radius: 6px;">
            <div style="font-weight: 700; font-size: 12px; color: #ef4444; margin-bottom: 4px;">⚠ CYCLONE VAYU-B</div>
            <div>Category: <b>4</b></div>
            <div>Wind Speed: <b>220 km/h</b></div>
            <div>Heading: <b>NNW</b></div>
          </div>
        `);

      // ── Infrastructure markers ────────────────────────────────────────────
      const COLOR_MAP: Record<string, string> = {
        hospitals: '#00e5a0',
        shelters: '#1a6cff',
        power: '#f59e0b',
        roads: '#8fa3b8',
        bridges: '#7c3aed',
      };

      DEMO_INFRASTRUCTURE_ASSETS.forEach((asset) => {
        const color = COLOR_MAP[asset.type] ?? '#8fa3b8';
        const riskColor = asset.riskLevel === 'critical' ? '#ef4444' : asset.riskLevel === 'high' ? '#f97316' : '#f59e0b';
        const dot = Leaflet.divIcon({
          html: `<div style="
            width: 10px; height: 10px;
            background: ${color};
            border: 2px solid ${riskColor};
            border-radius: 50%;
            box-shadow: 0 0 6px ${color}80;
          "></div>`,
          iconSize: [10, 10],
          iconAnchor: [5, 5],
          className: '',
        });
        Leaflet.marker([asset.lat, asset.lng], { icon: dot })
          .addTo(map)
          .bindTooltip(`<span style="font-size:10px;font-family:Inter,sans-serif">${asset.name}</span>`);
      });

      // ── Risk zone polygons ─────────────────────────────────────────────────
      const RISK_COLORS: Record<string, string> = {
        critical: '#ef4444',
        high: '#f97316',
        medium: '#f59e0b',
        low: '#22c55e',
      };

      DEMO_RISK_ZONES.forEach((zone) => {
        const color = RISK_COLORS[zone.severity];
        Leaflet.polygon(zone.coordinates as [number, number][], {
          color,
          fillColor: color,
          fillOpacity: 0.08,
          weight: 1,
          opacity: 0.4,
          dashArray: '3 3',
        })
          .addTo(map)
          .bindTooltip(`<span style="font-size:10px;font-family:Inter,sans-serif">${zone.name} — ${zone.severity.toUpperCase()}</span>`);
      });

      // ── Forecast node markers ─────────────────────────────────────────────
      DEMO_CYCLONE_PATH.forecastTrack.forEach((pt, i) => {
        const size = 6 - i * 0.5;
        const dot = Leaflet.divIcon({
          html: `<div style="
            width: ${Math.max(size, 4)}px; height: ${Math.max(size, 4)}px;
            background: #00d4ff;
            border-radius: 50%;
            opacity: ${1 - i * 0.1};
            border: 1px solid #00d4ff60;
          "></div>`,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
          className: '',
        });
        Leaflet.marker([pt.lat, pt.lng], { icon: dot }).addTo(map);
      });
    });

    return () => {
      mounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full rounded-xl" />

      {/* Map Overlay: Legend */}
      <div className="absolute bottom-3 left-3 z-[100] bg-[#0f1a25]/90 backdrop-blur-sm border border-[#1e2d3d] rounded-lg p-2.5 space-y-1.5">
        <p className="text-[8px] font-bold text-[#4a6278] uppercase tracking-widest mb-2">Map Legend</p>
        {[
          { color: '#ef4444', label: 'Critical Zone' },
          { color: '#f97316', label: 'High-Risk Zone' },
          { color: '#00d4ff', label: 'Forecast Track' },
          { color: '#8fa3b8', label: 'Historic Track' },
          { color: '#00e5a0', label: 'Hospitals' },
          { color: '#1a6cff', label: 'Shelters' },
          { color: '#f59e0b', label: 'Power Infra' },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
            <span className="text-[9px] text-[#8fa3b8]">{item.label}</span>
          </div>
        ))}
      </div>

      {/* Map Overlay: Status */}
      <div className="absolute top-3 left-3 z-[100] flex items-center gap-2 bg-[#0f1a25]/90 backdrop-blur-sm border border-[#1e2d3d] rounded-lg px-3 py-1.5">
        <span className="flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-1.5 w-1.5 rounded-full bg-amber-400 opacity-60" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-400" />
        </span>
        <span className="text-[9px] font-bold text-amber-400 tracking-widest uppercase">Simulated Track — Demo Mode</span>
      </div>
    </div>
  );
}
