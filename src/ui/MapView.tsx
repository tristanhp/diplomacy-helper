import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useGameStore } from './store';
import type { GameState, Power, Province, ProvinceID, Unit } from '../engine/types';
import { CANVAS, GEO_POS, LABEL_OFFSET } from './geoLayout';

const powerColor: Record<Power, string> = {
  England: '#7c3aed',
  France: '#2563eb',
  Germany: '#4b5563',
  Italy: '#16a34a',
  Austria: '#dc2626',
  Russia: '#059669',
  Turkey: '#f59e0b',
};

const typeColor: Record<Province['type'], string> = {
  sea: '#1e3a8a',
  coastal: '#0d9488',
  land: '#166534',
};

export function MapView() {
  const state = useGameStore((s) => s.state);

  // Transformed positions: radial spread from layout center, then fit to canvas with margins
  const POS = useMemo(() => {
    const ids = Object.keys(state.map) as ProvinceID[];
    const pts = ids
      .map((id) => ({ id, p: GEO_POS[id] as { x: number; y: number } | undefined }))
      .filter((v): v is { id: ProvinceID; p: { x: number; y: number } } => !!v.p);
    if (pts.length === 0) return GEO_POS as Record<ProvinceID, { x: number; y: number }>;    
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const { p } of pts) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y); }
    const cx = (minX + maxX) / 2; const cy = (minY + maxY) / 2;
    const expanded = pts.map(({ id, p }) => ({ id, x: cx + (p.x - cx) * 1.35, y: cy + (p.y - cy) * 1.35 }));
    // Fit to canvas with margin
    const M = 60;
    let exMinX = Infinity, exMaxX = -Infinity, exMinY = Infinity, exMaxY = -Infinity;
    for (const e of expanded) { exMinX = Math.min(exMinX, e.x); exMaxX = Math.max(exMaxX, e.x); exMinY = Math.min(exMinY, e.y); exMaxY = Math.max(exMaxY, e.y); }
    const sx = (CANVAS.width - 2 * M) / (exMaxX - exMinX);
    const sy = (CANVAS.height - 2 * M) / (exMaxY - exMinY);
    const sFit = Math.min(sx, sy);
    const exCx = (exMinX + exMaxX) / 2; const exCy = (exMinY + exMaxY) / 2;
    const targetCx = CANVAS.width / 2; const targetCy = CANVAS.height / 2;
    const out: Record<ProvinceID, { x: number; y: number }> = { ...GEO_POS } as any;
    for (const e of expanded) {
      out[e.id] = {
        x: targetCx + (e.x - exCx) * sFit,
        y: targetCy + (e.y - exCy) * sFit,
      };
    }
    return out;
  }, [state.map]);

  const unitsByProv: Record<string, Unit[]> = {};
  (Object.values(state.units) as Unit[]).forEach((u) => {
    (unitsByProv[u.location] ||= []).push(u);
  });

  // Edges removed (no lines between territories)

  // UI state
  const [showLabels, setShowLabels] = useState(true);
  const [hoverProv, setHoverProv] = useState<string | null>(null);

  // Responsive viewport
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [viewport, setViewport] = useState<{ w: number; h: number }>({ w: CANVAS.width, h: CANVAS.height });
  useEffect(() => {
    if (!wrapRef.current) return;
    const aspect = CANVAS.height / CANVAS.width;
    const update = () => {
      if (!wrapRef.current) return;
      const rect = wrapRef.current.getBoundingClientRect();
      const w = Math.max(320, Math.floor(rect.width));
      const h = Math.max(240, Math.floor(w * aspect));
      setViewport({ w, h });
    };
    update();
    const ro = new ResizeObserver(() => update());
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  const autoScale = useMemo(() => {
    const sx = viewport.w / CANVAS.width;
    const sy = viewport.h / CANVAS.height;
    return Math.min(sx, sy) * 0.98; // slight padding
  }, [viewport]);

  // Fixed offset to center the scaled canvas within the viewport
  const fixedOffset = useMemo(() => {
    const x = Math.round((viewport.w - CANVAS.width * autoScale) / 2);
    const y = Math.round((viewport.h - CANVAS.height * autoScale) / 2);
    return { x, y };
  }, [viewport, autoScale]);

  const highlightSet = new Set<string>();
  if (hoverProv) {
    highlightSet.add(hoverProv);
    (state.map[hoverProv]?.adjacents || []).forEach((n) => highlightSet.add(n));
  }

  // No external basemap; render only provinces and edges using GEO_POS

  return (
    <div className="mb-4 rounded border border-slate-700 bg-slate-900/60 p-2">
      <div className="mb-2 flex items-center justify-between text-sm text-slate-300">
        <div>Map</div>
        <div className="flex items-center gap-3">
          {/* Edges toggle removed */}
          <label className="inline-flex items-center gap-1"><input type="checkbox" className="accent-slate-300" checked={showLabels} onChange={(e)=>setShowLabels(e.target.checked)} />Labels</label>
            {/* Zoom controls removed to lock zoom */}
        </div>
      </div>
    <div className="w-full overflow-hidden" ref={wrapRef}>
        <svg
          width={viewport.w}
          height={viewport.h}
          style={{ maxWidth: '100%', cursor: 'default' }}
        >
          <g transform={`translate(${fixedOffset.x},${fixedOffset.y}) scale(${autoScale})`}>
            {/* Background rectangles for provinces (touching, no lines) */}
            <g>
              {Object.entries(state.map).map(([id, p]) => {
                const pos = POS[id as ProvinceID];
                if (!pos) return null;
                const base = typeColor[p.type];
                const hovered = highlightSet.has(id);
                const W = 56, H = 42; // larger background rect size to touch/overlap more
                return (
                  <rect key={`bg-${id}`} x={pos.x - W/2} y={pos.y - H/2} width={W} height={H} rx={2}
                        fill={base} stroke={hovered? '#e2e8f0' : 'none'} strokeWidth={hovered? 1.6 : 0} />
                );
              })}
            </g>

            {/* edges removed */}

            {/* Units, SC markers, and labels on top */}
            <g>
              {Object.entries(state.map).map(([id, p]) => {
                const pos = POS[id as ProvinceID];
                if (!pos) return null;
                const hasSC = !!p.supplyCenter;
                const u = (unitsByProv[id] || [])[0];
                const unitColor = u ? powerColor[u.power] : undefined;
                const hovered = highlightSet.has(id);
                const FLEET_S = 18; // side length for triangle
                const TRI_H = FLEET_S * 0.866;
                const triPoints = `${pos.x},${pos.y - TRI_H/2} ${pos.x - FLEET_S/2},${pos.y + TRI_H/2} ${pos.x + FLEET_S/2},${pos.y + TRI_H/2}`;
                return (
                  <g key={id} onMouseEnter={()=>setHoverProv(id)} onMouseLeave={()=>setHoverProv(null)}>
                    {/* supply center marker */}
                    {hasSC && <circle cx={pos.x} cy={pos.y} r={4} fill="#fbbf24" stroke="#92400e" strokeWidth={0.6} />}
                    {/* unit marker */}
                    {u && (
                      u.type === 'Army' ? (
                        <circle cx={pos.x} cy={pos.y} r={8} fill={unitColor} stroke="#0f172a" strokeWidth={1} />
                      ) : (
                        <polygon points={triPoints} fill={unitColor} stroke="#0f172a" strokeWidth={1} />
                      )
                    )}
                    {/* label */}
                    {showLabels && (
                      <text x={pos.x + (LABEL_OFFSET[id as ProvinceID]?.dx ?? 14)} y={pos.y + (LABEL_OFFSET[id as ProvinceID]?.dy ?? 6)} fontSize={12} fill="#e5e7eb">
                        {p.name}
                      </text>
                    )}
                    {/* title tooltip */}
                    <title>
                      {p.name}
                      {u ? `\n${u.power} ${u.type}` : ''}
                      {hasSC ? '\nSupply Center' : ''}
                    </title>
                  </g>
                );
              })}
            </g>
          </g>
        </svg>
      </div>
    </div>
  );
}
