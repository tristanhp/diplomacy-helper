import React, { useMemo, useState } from 'react';
import { useGameStore } from './store';
import { Order, ProvinceID, Unit } from '../engine/types';
import { isAdjacent, unitCanEnter } from '../engine/orders';

function uid() { return Math.random().toString(36).slice(2); }

export function OrdersPanel() {
  const state = useGameStore((s) => s.state);
  const drafting = useGameStore((s) => s.drafting);
  const pendingOrders = useGameStore((s) => s.pendingOrders);
  const addOrder = useGameStore((s) => s.addOrder);
  const removeOrder = useGameStore((s) => s.removeOrder);
  const clearOrders = useGameStore((s) => s.clearOrders);
  const resolveOrders = useGameStore((s) => s.resolveOrders);
  const submitCurrentDraft = useGameStore((s) => s.submitCurrentDraft);
  const previousDraft = useGameStore((s) => s.previousDraft);
  const revealAndResolve = useGameStore((s) => s.revealAndResolve);

  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);
  const [orderType, setOrderType] = useState<'Hold'|'Move'|'SupportHold'|'SupportMove'|'Convoy'>('Hold');
  const [to, setTo] = useState<string>('');
  const [targetUnit, setTargetUnit] = useState<string>('');

  const unitsAll = Object.values(state.units);
  const currentPower = drafting.active ? drafting.powers[drafting.index] : undefined;
  const units = drafting.active && currentPower
    ? unitsAll.filter((u) => u.power === currentPower)
    : unitsAll;
  const provinces = Object.values(state.map);

  const u = selectedUnit ? state.units[selectedUnit] : null;

  // Compute convoy-reachable destinations for the selected Army based on current pending Convoy orders
  const convoyReachable = useMemo(() => {
    if (!u || u.type !== 'Army') return new Set<string>();
    // Collect fleets ordered to convoy this army
    const fleets: Unit[] = (pendingOrders as Order[])
      .filter((o) => o.type === 'Convoy' && o.armyUnitId === u.id)
      .map((o) => state.units[o.unitId])
      .filter((f): f is Unit => !!f && state.map[f.location]?.type === 'sea');
    if (fleets.length === 0) return new Set<string>();

    const fleetLocs = fleets.map((f) => f.location);
    // Build adjacency among convoying fleet sea provinces
    const graph: Record<string, string[]> = {};
    for (const loc of fleetLocs) {
      const adj = state.map[loc]?.adjacents || [];
      graph[loc] = adj.filter((a) => fleetLocs.includes(a));
    }
    // Connected components of convoying fleets
    const visited = new Set<string>();
    const comps: string[][] = [];
    for (const loc of fleetLocs) {
      if (visited.has(loc)) continue;
      const comp: string[] = [];
      const q = [loc];
      while (q.length) {
        const cur = q.shift()!;
        if (visited.has(cur)) continue;
        visited.add(cur);
        comp.push(cur);
        for (const nxt of graph[cur] || []) if (!visited.has(nxt)) q.push(nxt);
      }
      comps.push(comp);
    }

    // Only components that touch the army's source province via adjacency are usable
    const usableComps = comps.filter((comp) => comp.some((fl) => isAdjacent(state.map, fl as ProvinceID, u.location as ProvinceID)));
    if (usableComps.length === 0) return new Set<string>();

    // Any land/coastal province adjacent to any fleet in a usable component is a potential convoy destination
    const dests = new Set<string>();
    for (const comp of usableComps) {
      for (const fl of comp) {
        for (const adj of state.map[fl]?.adjacents || []) {
          const p = state.map[adj];
          if (!p) continue;
          if ((p.type === 'land' || p.type === 'coastal') && adj !== u.location) dests.add(adj);
        }
      }
    }
    return dests;
  }, [u, pendingOrders, state.map, state.units]);

  // Legal target units based on order type and selected unit
  const legalTargetUnits = useMemo(() => {
    if (!u) return units;
    if (orderType === 'SupportHold') {
      return units.filter((tu) =>
        tu.id !== u.id &&
        isAdjacent(state.map, u.location as ProvinceID, tu.location as ProvinceID) &&
        unitCanEnter(state.map, u, tu.location as ProvinceID)
      );
    }
    if (orderType === 'SupportMove') {
      return units.filter((tu) => tu.id !== u.id);
    }
    if (orderType === 'Convoy') {
      // Only armies can be convoyed; fleet must be in sea province
      const supporterProv = state.map[u.location];
      if (u.type !== 'Fleet' || supporterProv.type !== 'sea') return [];
      return units.filter((tu) => tu.type === 'Army' && tu.id !== u.id);
    }
    return units;
  }, [u, units, orderType, state.map]);

  // Legal destination provinces based on order type and selections
  const legalDestinations = useMemo(() => {
    if (!u) return provinces;
    if (orderType === 'Move') {
      const adjMoves = state.map[u.location].adjacents
        .filter((pid) => unitCanEnter(state.map, u, pid as ProvinceID));
      // If Army, include convoy-reachable destinations based on current convoy orders
      const extra = u.type === 'Army' ? Array.from(convoyReachable) : [];
      const all = Array.from(new Set([...adjMoves, ...extra]));
      return all.map((pid) => state.map[pid]);
    }
    if (orderType === 'SupportHold') {
      // Province is the target province; prefer adjacent provinces that currently have a unit
      const adj = state.map[u.location].adjacents.filter((pid) => unitCanEnter(state.map, u, pid as ProvinceID));
      const occupied = adj.filter((pid) => units.some((x) => x.location === pid));
      return (occupied.length ? occupied : adj).map((pid) => state.map[pid]);
    }
    if (orderType === 'SupportMove') {
      if (!targetUnit) return [];
      const mover = state.units[targetUnit];
      if (!mover) return [];
      // destination must be adjacent to mover and also adjacent to supporter and enterable by supporter
      const moverAdj = state.map[mover.location].adjacents;
      const suppAdj = state.map[u.location].adjacents;
      const intersection = moverAdj.filter((pid) => suppAdj.includes(pid));
      return intersection
        .filter((pid) => unitCanEnter(state.map, u, pid as ProvinceID))
        .map((pid) => state.map[pid]);
    }
    if (orderType === 'Convoy') {
      // Only show destinations reachable by the selected convoying fleet component
      if (!u) return [];
      const fleetHere = state.map[u.location];
      if (u.type !== 'Fleet' || fleetHere.type !== 'sea') return [];
      if (!targetUnit) return [];
      const army = state.units[targetUnit];
      if (!army || army.type !== 'Army') return [];

      // Gather fleets already ordered to convoy this army, include the selected fleet
      const convoyFleets: Unit[] = [(u as Unit),
        ...((pendingOrders as Order[])
          .filter((o) => o.type === 'Convoy' && o.armyUnitId === army.id)
          .map((o) => state.units[o.unitId])
          .filter((f): f is Unit => !!f))
      ].filter((f, idx, arr) => state.map[f.location]?.type === 'sea' && arr.findIndex((x) => x.id === f.id) === idx);

      if (convoyFleets.length === 0) return [];

      // Build adjacency among these convoying fleets
      const fleetLocs = convoyFleets.map((f) => f.location);
      const graph: Record<string, string[]> = {};
      for (const loc of fleetLocs) {
        const adj = state.map[loc]?.adjacents || [];
        graph[loc] = adj.filter((a) => fleetLocs.includes(a));
      }

      // BFS from selected fleet's location to get its component
      const start = u.location;
      const visited = new Set<string>();
      const q = [start];
      while (q.length) {
        const cur = q.shift()!;
        if (visited.has(cur)) continue;
        visited.add(cur);
        for (const nxt of graph[cur] || []) if (!visited.has(nxt)) q.push(nxt);
      }

      // Component must touch the army's source (adjacent to at least one fleet in component)
      const touchesSource = Array.from(visited).some((fl) => isAdjacent(state.map, fl as ProvinceID, army.location as ProvinceID));
      if (!touchesSource) return [];

      // Destinations: land/coastal adjacent to any fleet in the component, excluding the army's current loc
      const destIds = new Set<string>();
      for (const fl of visited) {
        for (const adj of state.map[fl]?.adjacents || []) {
          const p = state.map[adj];
          if (!p) continue;
          if ((p.type === 'land' || p.type === 'coastal') && adj !== army.location) destIds.add(adj);
        }
      }
      return Array.from(destIds).map((pid) => state.map[pid]);
    }
    return provinces;
  }, [u, orderType, state.map, provinces, targetUnit, units, convoyReachable]);

  const add = () => {
    if (!selectedUnit) return;
    const u = state.units[selectedUnit];
    if (!u) return;
    let order: Order;
    if (orderType === 'Hold') {
      order = { id: uid(), type: 'Hold', unitId: u.id, power: u.power };
    } else if (orderType === 'Move') {
      const nonAdjacent = !isAdjacent(state.map, u.location as ProvinceID, to as ProvinceID);
      order = { id: uid(), type: 'Move', unitId: u.id, power: u.power, from: u.location, to, viaConvoy: u.type === 'Army' && nonAdjacent ? true : undefined };
    } else if (orderType === 'SupportHold') {
      const target = state.units[targetUnit];
      const targetProvince = target ? (target.location as ProvinceID) : (to as ProvinceID);
      order = { id: uid(), type: 'SupportHold', unitId: u.id, power: u.power, targetUnitId: targetUnit, targetProvince };
    } else if (orderType === 'SupportMove') {
      const mover = state.units[targetUnit];
      const from = mover ? (mover.location as ProvinceID) : ('' as ProvinceID);
      order = { id: uid(), type: 'SupportMove', unitId: u.id, power: u.power, from, to: to as ProvinceID, targetUnitId: targetUnit };
    } else {
      const army = state.units[targetUnit];
      const from = army ? (army.location as ProvinceID) : ('' as ProvinceID);
      order = { id: uid(), type: 'Convoy', unitId: u.id, power: u.power, armyUnitId: targetUnit, from, to: to as ProvinceID };
    }
    addOrder(order as any);
  };

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      <div className="rounded border border-slate-700 p-3">
        <div className="mb-2 text-lg font-semibold">Units - {currentPower ?? 'None'}</div>
        <ul className="space-y-1">
          {units.map((u) => (
            <li key={u.id}>
              <button
                className={`w-full rounded px-2 py-1 text-left ${selectedUnit===u.id? 'bg-slate-700' : 'bg-slate-800 hover:bg-slate-700'}`}
                onClick={() => setSelectedUnit(u.id)}
              >{u.power} {u.type[0]} - {state.map[u.location].name}</button>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded border border-slate-700 p-3">
        <div className="mb-2 text-lg font-semibold">Compose Order</div>
        <div className="space-y-2">
          <div>
            <label className="mb-1 block text-sm">Order Type</label>
            <select className="w-full rounded bg-slate-800 p-2" value={orderType} onChange={(e)=>setOrderType(e.target.value as any)}>
              <option>Hold</option>
              <option>Move</option>
              <option>SupportHold</option>
              <option>SupportMove</option>
              <option>Convoy</option>
            </select>
          </div>
          {(orderType==='Move'||orderType==='SupportHold'||orderType==='SupportMove'||orderType==='Convoy') && (
            <div>
              <label className="mb-1 block text-sm">{orderType==='SupportHold' ? 'Target Province' : 'Destination'}</label>
              <select className="w-full rounded bg-slate-800 p-2" value={to} onChange={(e)=>setTo(e.target.value)} disabled={orderType==='SupportHold'}>
                <option value="">Select...</option>
                {legalDestinations.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
              </select>
            </div>
          )}
          {(orderType==='SupportHold'||orderType==='SupportMove'||orderType==='Convoy') && (
            <div>
              <label className="mb-1 block text-sm">Target Unit</label>
              <select className="w-full rounded bg-slate-800 p-2" value={targetUnit} onChange={(e)=>{ setTargetUnit(e.target.value); if (orderType==='SupportHold') { const t = state.units[e.target.value]; if (t) setTo(t.location); } }}>
                <option value="">Select...</option>
                {legalTargetUnits.map((u) => (<option key={u.id} value={u.id}>{u.power} {u.type[0]} - {state.map[u.location].name}</option>))}
              </select>
            </div>
          )}
          <button
            className="rounded bg-emerald-600 px-3 py-2 text-white hover:bg-emerald-500 disabled:opacity-50"
            disabled={!selectedUnit || (orderType!=='Hold' && !to && orderType!=='SupportHold') || ((orderType==='SupportHold'||orderType==='SupportMove'||orderType==='Convoy') && !targetUnit)}
            onClick={add}
          >Add Order</button>
        </div>
      </div>

      <OrdersList />
      
      <div className="rounded border border-slate-700 p-3">
        <div className="mb-2 text-lg font-semibold">Turn Controls</div>
        <div className="flex flex-col gap-2">
          <div className="text-sm text-slate-300">Current: {currentPower ?? '—'} ({drafting.index+1}/{drafting.powers.length})</div>
          <div className="flex gap-2">
            <button className="rounded bg-slate-700 px-3 py-1 hover:bg-slate-600 disabled:opacity-50" onClick={previousDraft} disabled={drafting.index===0}>Previous</button>
            <button className="rounded bg-emerald-600 px-3 py-1 hover:bg-emerald-500" onClick={submitCurrentDraft} disabled={!currentPower}>Save & Next</button>
            <button className="rounded bg-indigo-600 px-3 py-1 hover:bg-indigo-500" onClick={revealAndResolve} disabled={drafting.index < drafting.powers.length-1}>Reveal & Resolve</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function OrdersList() {
  const orders = useGameStore((s) => s.pendingOrders);
  const removeOrder = useGameStore((s) => s.removeOrder);
  const clearOrders = useGameStore((s) => s.clearOrders);
  const resolveOrders = useGameStore((s) => s.resolveOrders);
  const drafting = useGameStore((s) => s.drafting);

  return (
    <div className="rounded border border-slate-700 p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-lg font-semibold">Pending Orders (Hidden from other players)</div>
        <div className="space-x-2">
          <button className="rounded bg-slate-700 px-2 py-1 hover:bg-slate-600" onClick={clearOrders}>Clear</button>
        </div>
      </div>
      <ul className="space-y-1">
        {orders.map((o) => (
          <li key={o.id} className="flex items-center justify-between rounded bg-slate-800 px-2 py-1">
            <span>{renderOrder(o)}</span>
            <button className="rounded bg-red-600 px-2 py-1 text-sm hover:bg-red-500" onClick={()=>removeOrder(o.id)}>Remove</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function renderOrder(o: Order) {
  switch (o.type) {
    case 'Hold': return `${o.power}: ${o.unitId} H`;
    case 'Move': return `${o.power}: ${o.unitId} ${o.from} - ${o.to}`;
    case 'SupportHold': return `${o.power}: ${o.unitId} S ${o.targetUnitId} H @ ${o.targetProvince}`;
    case 'SupportMove': return `${o.power}: ${o.unitId} S ${o.targetUnitId} - ${o.to}`;
    case 'Convoy': return `${o.power}: ${o.unitId} C ${o.armyUnitId} ${o.from}-${o.to}`;
  }
}
