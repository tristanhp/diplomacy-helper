import React from 'react';
import { useGameStore, type GameStore } from './store';
import { OrdersPanel } from './OrdersPanel';
import { MapView } from './MapView';
import type { ProvinceID, Unit } from '../engine/types';

export function App() {
  const phase = useGameStore((s) => s.state.phase);
  const winner = useGameStore((s) => s.winner);
  const revealVisible = useGameStore((s) => s.revealVisible);
  const hideReveal = useGameStore((s) => s.hideReveal);

  return (
    <div className="min-h-screen p-4">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Diplomacy Adjudicator</h1>
        <div className="text-sm text-slate-300">{phase.season} {phase.type} {phase.year}</div>
      </header>

      {winner && (
        <div className="mb-4 rounded bg-emerald-800/40 p-3 text-emerald-200">Winner: {winner}</div>
      )}

      <MapView />

      {phase.type === 'Orders' && <OrdersPanel />}
      {phase.type === 'Retreats' && <RetreatsPanel />}
      {phase.type === 'Adjustments' && <AdjustmentsPanel />}

      {revealVisible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-w-3xl w-full rounded bg-slate-900 p-4 text-slate-100 shadow-xl border border-slate-700">
            <h2 className="mb-3 text-xl font-semibold">Orders Resolved</h2>
            <p className="mb-4 text-sm text-slate-300">Orders have been revealed and adjudicated. Review the map and proceed.</p>
            <div className="text-right">
              <button className="rounded bg-emerald-600 px-3 py-2 hover:bg-emerald-500" onClick={hideReveal}>Continue</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RetreatsPanel() {
  const retreatOptions = useGameStore((s: GameStore) => s.retreatOptions);
  const resolveRetreats = useGameStore((s: GameStore) => s.resolveRetreats);
  const map = useGameStore((s: GameStore) => s.state.map);

  const [choices, setChoices] = React.useState<Record<string, string | undefined>>({});

  const submit = () => {
    const decisions = retreatOptions.map((r) => ({ unitId: r.unitId, to: choices[r.unitId] as ProvinceID | undefined }));
    resolveRetreats(decisions);
  };

  return (
    <div className="max-w-2xl space-y-3">
      <div className="text-lg font-semibold">Retreats</div>
      {retreatOptions.length === 0 && <div>No retreats. Advance phase via Resolve (Orders).</div>}
      {retreatOptions.map((r) => (
        <div key={r.unitId} className="rounded border border-slate-700 p-3">
          <div className="mb-2 text-sm">Unit: {r.unitId}</div>
          <select className="w-full rounded bg-slate-800 p-2" value={choices[r.unitId] || ''} onChange={(e)=>setChoices({ ...choices, [r.unitId]: e.target.value || undefined })}>
            <option value="">Disband</option>
            {r.options.map((p) => <option key={p} value={p}>{map[p].name}</option>)}
          </select>
        </div>
      ))}
      <button className="rounded bg-indigo-600 px-3 py-2 hover:bg-indigo-500" onClick={submit}>Confirm Retreats</button>
    </div>
  );
}

function AdjustmentsPanel() {
  const state = useGameStore((s: GameStore) => s.state);
  const resolveAdjustments = useGameStore((s: GameStore) => s.resolveAdjustments);
  const [builds, setBuilds] = React.useState<{ power: string; type: 'Army'|'Fleet'; location: string }[]>([]);
  const [disbands, setDisbands] = React.useState<string[]>([]);

  // Compute deltas
  const scCounts: Record<string, number> = {};
  (Object.entries(state.scOwners) as Array<[keyof typeof state.scOwners, string | null]>).forEach(([prov, owner]) => {
    if (owner) scCounts[owner] = (scCounts[owner] || 0) + 1;
  });
  const unitCounts: Record<string, number> = {};
  (Object.values(state.units) as Unit[]).forEach((u) => {
    unitCounts[u.power] = (unitCounts[u.power] || 0) + 1;
  });

  const deltas: Record<string, number> = {};
  Object.keys(scCounts).forEach((p) => {
    deltas[p] = (scCounts[p] || 0) - (unitCounts[p] || 0);
  });

  // Home buildable locations per power (unoccupied, owned home SCs)
  const homeBuilds: Record<string, string[]> = {};
  (Object.values(state.map) as any[]).forEach((prov: any) => {
    if (!prov?.supplyCenter || !prov.homeCenters || prov.homeCenters.length === 0) return;
    for (const home of prov.homeCenters as string[]) {
      if (!homeBuilds[home]) homeBuilds[home] = [];
      homeBuilds[home].push(prov.id as string);
    }
  });

  const submit = () => {
    const adjOrders = new Map<string, { power: string; builds?: any[]; disbands?: string[] }>();
    for (const [power, delta] of Object.entries(deltas)) {
      if (delta > 0) {
        const items = builds.filter((b) => b.power === power).slice(0, delta);
        adjOrders.set(power, { power, builds: items.map((i) => ({ type: i.type, location: i.location as ProvinceID })) });
      } else if (delta < 0) {
        const items = disbands.filter((uid) => (state.units as Record<string, Unit>)[uid]?.power === power).slice(0, -delta);
        adjOrders.set(power, { power, disbands: items });
      }
    }
    resolveAdjustments(Array.from(adjOrders.values()) as any);
  };

  const toggleBuild = (power: string, type: 'Army'|'Fleet', location: string) => {
    setBuilds((b) => {
      const idx = b.findIndex((x) => x.power===power && x.location===location && x.type===type);
      if (idx >= 0) {
        // Remove this specific build
        return [...b.slice(0, idx), ...b.slice(idx+1)];
      } else {
        // Check how many builds this power already has selected
        const currentBuildsForPower = b.filter((x) => x.power === power).length;
        const maxBuilds = deltas[power] > 0 ? deltas[power] : 0;
        
        if (currentBuildsForPower >= maxBuilds) {
          // Already at max builds, don't add more
          return b;
        }
        
        // Remove any other type at this location first, then add the new one
        const filtered = b.filter((x) => !(x.power===power && x.location===location));
        return [...filtered, { power, type, location }];
      }
    });
  };

  const toggleDisband = (unitId: string) => {
    setDisbands((d) => d.includes(unitId) ? d.filter((x)=>x!==unitId) : [...d, unitId]);
  };

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div className="space-y-3">
        <div className="text-lg font-semibold">Adjustments</div>
        {Object.entries(deltas).map(([power, delta]) => (
          <div key={power} className="rounded border border-slate-700 p-3">
            <div className="mb-2 font-medium">{power}: {unitCounts[power]||0} units vs {scCounts[power]||0} SCs → {delta>0?`Build ${delta}`:delta<0?`Disband ${-delta}`:'Even'}</div>
            {delta > 0 && (
              <div>
                <div className="mb-1 text-sm text-slate-300">Choose build locations</div>
                <div className="flex flex-wrap gap-2">
                  {(homeBuilds[power]||[]).map((loc) => (
                    <button key={loc} className={`rounded border px-2 py-1 ${builds.find(b=>b.power===power&&b.location===loc&&b.type==='Army')?'bg-emerald-700 border-emerald-500':'bg-slate-800 border-slate-600'}`} onClick={()=>toggleBuild(power,'Army',loc)}>{state.map[loc]?.name || loc} (A)</button>
                  ))}
                  {(homeBuilds[power]||[]).map((loc) => (
                    <button key={loc+':F'} className={`rounded border px-2 py-1 ${builds.find(b=>b.power===power&&b.location===loc&&b.type==='Fleet')?'bg-emerald-700 border-emerald-500':'bg-slate-800 border-slate-600'}`} onClick={()=>toggleBuild(power,'Fleet',loc)}>{state.map[loc]?.name || loc} (F)</button>
                  ))}
                </div>
              </div>
            )}
            {delta < 0 && (
              <div>
                <div className="mb-1 text-sm text-slate-300">Select units to disband</div>
                <div className="flex flex-wrap gap-2">
                  {(Object.values(state.units) as Unit[]).filter(u=>u.power===power).map((u) => (
                    <button key={u.id} className={`rounded border px-2 py-1 ${disbands.includes(u.id)?'bg-red-700 border-red-500':'bg-slate-800 border-slate-600'}`} onClick={()=>toggleDisband(u.id)}>{u.id} @ {state.map[u.location].name}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      <div>
        <button className="rounded bg-indigo-600 px-3 py-2 hover:bg-indigo-500" onClick={submit}>Confirm Adjustments</button>
      </div>
    </div>
  );
}
