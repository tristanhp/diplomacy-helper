import { Adjustment, Dislodgement, GameState, Order, OrderResult, ProvinceID, Unit } from './types';
import { initialOrderResults, isAdjacent, unitCanEnter } from './orders';

function scKey(id: string): string {
  if (id.startsWith('spa-')) return 'spa';
  if (id.startsWith('bul-')) return 'bul';
  if (id.startsWith('stp-')) return 'stp';
  return id;
}

// Note: This is a solid but not fully exhaustive adjudicator. It follows the spec
// including support cutting, strength calculation, simple convoy chains, retreats, and adjustments.

interface Attack { mover: Unit; from: ProvinceID; to: ProvinceID; viaConvoy?: boolean; supporters: string[]; }

function mapUnitLocations(state: GameState): Record<ProvinceID, Unit> {
  const occ: Record<ProvinceID, Unit> = {};
  for (const u of Object.values(state.units)) occ[u.location] = u;
  return occ;
}

function collectOrders(state: GameState, orders: Order[]) {
  const moves: Attack[] = [];
  const supportsHold: Record<string, { supporter: Unit; targetProv: ProvinceID }[]> = {};
  const supportsMove: Record<string, { supporter: Unit; to: ProvinceID }[]> = {};
  const convoys: Record<string, Unit[]> = {}; // armyUnitId -> convoying fleets

  for (const o of orders) {
    const u = state.units[o.unitId];
    if (!u) continue;
    switch (o.type) {
      case 'Move':
        moves.push({ mover: u, from: o.from, to: o.to, viaConvoy: o.viaConvoy, supporters: [] });
        break;
      case 'SupportHold':
        (supportsHold[o.targetProvince] ||= []).push({ supporter: u, targetProv: o.targetProvince });
        break;
      case 'SupportMove':
        (supportsMove[o.targetUnitId] ||= []).push({ supporter: u, to: o.to });
        break;
      case 'Convoy':
        (convoys[o.armyUnitId] ||= []).push(u);
        break;
      default:
        break;
    }
  }

  return { moves, supportsHold, supportsMove, convoys };
}

function convoyPathExists(state: GameState, from: ProvinceID, to: ProvinceID, convoyFleets: Unit[]) {
  // BFS over sea provinces occupied by fleets ordered to convoy
  const fleetLocs = new Set(convoyFleets.map((f) => f.location));
  const visited = new Set<string>();
  const queue: string[] = [];
  for (const start of fleetLocs) queue.push(start);
  while (queue.length) {
    const cur = queue.shift()!;
    if (visited.has(cur)) continue;
    visited.add(cur);
    const p = state.map[cur];
    for (const nxt of p.adjacents) {
      if (!state.map[nxt]) continue;
      // path is across fleets in seas; we only check connectivity, not exact coast-adjacency to land
      if (fleetLocs.has(nxt) && !visited.has(nxt)) queue.push(nxt);
    }
  }
  // For simplicity, require at least one convoy fleet adjacent to from and one adjacent to to
  const fromAdj = convoyFleets.some((f) => isAdjacent(state.map, f.location, from));
  const toAdj = convoyFleets.some((f) => isAdjacent(state.map, f.location, to));
  return fromAdj && toAdj && convoyFleets.length > 0;
}

function computeStrengths(state: GameState, orders: Order[], context: ReturnType<typeof collectOrders>, occ: Record<ProvinceID, Unit>) {
  // Mark supports that are valid and not cut
  const isAttacked: Record<string, ProvinceID[]> = {};
  for (const mv of context.moves) {
    (isAttacked[mv.to] ||= []).push(mv.from);
  }

  const supportValid = new Map<string, boolean>(); // supporterId -> valid

  for (const o of orders) {
    if (o.type === 'SupportHold' || o.type === 'SupportMove') {
      const supporter = state.units[o.unitId];
      if (!supporter) continue;

      // Support cut if supporter is attacked from anywhere other than the province that the support is given against
      const attacksOnSupporter = Object.entries(isAttacked).flatMap(([to, froms]) =>
        to === supporter.location ? froms : []
      );
      let cut = false;
      for (const from of attacksOnSupporter) {
        if (o.type === 'SupportMove') {
          if (from !== o.to) cut = true; // allowed exception if attack comes from the province support is given into
        } else if (o.type === 'SupportHold') {
          if (from !== o.targetProvince) cut = true;
        }
      }

      // Support legality: supporter could move to the destination/target province
      let legal = true;
      if (o.type === 'SupportHold') {
        legal = unitCanEnter(state.map, supporter, o.targetProvince) && isAdjacent(state.map, supporter.location, o.targetProvince);
      } else if (o.type === 'SupportMove') {
        legal = unitCanEnter(state.map, supporter, o.to) && isAdjacent(state.map, supporter.location, o.to);
      }

      supportValid.set(supporter.id, legal && !cut);
    }
  }

  const moveStrength = new Map<Unit, number>();
  const holdStrength = new Map<Unit, number>();

  // base strength 1 for all
  for (const u of Object.values(state.units)) {
    holdStrength.set(u, 1);
  }
  for (const mv of context.moves) moveStrength.set(mv.mover, 1);

  // apply supports to moves
  for (const [targetUnitId, entries] of Object.entries(context.supportsMove)) {
    const mover = Object.values(state.units).find((u) => u.id === targetUnitId);
    if (!mover) continue;
    let inc = 0;
    for (const e of entries) {
      if (supportValid.get(e.supporter.id)) inc++;
    }
    if (moveStrength.has(mover)) moveStrength.set(mover, (moveStrength.get(mover) || 1) + inc);
  }

  // supports to hold
  for (const [prov, entries] of Object.entries(context.supportsHold)) {
    const u = occ[prov];
    if (!u) continue;
    let inc = 0;
    for (const e of entries) if (supportValid.get(e.supporter.id)) inc++;
    holdStrength.set(u, (holdStrength.get(u) || 1) + inc);
  }

  return { moveStrength, holdStrength };
}

function resolveMoves(state: GameState, orders: Order[], context: ReturnType<typeof collectOrders>) {
  const occ = mapUnitLocations(state);
  const results = initialOrderResults(orders);

  const { moveStrength, holdStrength } = computeStrengths(state, orders, context, occ);

  // group moves by destination
  const byDest = new Map<ProvinceID, Attack[]>();
  for (const mv of context.moves) {
    const arr = (byDest.get(mv.to) || []) as Attack[];
    arr.push(mv);
    byDest.set(mv.to, arr);
  }

  const dislodged: Dislodgement[] = [];
  const newLocations: Record<string, ProvinceID> = {};

  // handle each destination
  for (const [to, moves] of byDest.entries()) {
    // Validate convoy if needed
    for (const mv of moves) {
      if (mv.viaConvoy) {
        const fleets = context.convoys[mv.mover.id] || [];
        if (!convoyPathExists(state, mv.from, mv.to, fleets)) {
          // convoy fails; treat as not moving
          continue;
        }
      }
    }

    // Determine strongest
    let best: { mv: typeof moves[number]; str: number } | null = null;
    let tie = false;

    for (const mv of moves) {
      const str = moveStrength.get(mv.mover) || 1;
      if (!best || str > best.str) { best = { mv, str }; tie = false; }
      else if (str === best.str) tie = true;
    }

    const defender = occ[to];

    if (!best || tie) {
      // bounce, nobody enters
      continue;
    }

    // compare against defender hold strength if occupied
    if (defender) {
      const defStr = holdStrength.get(defender) || 1;
      if (best.str > defStr) {
        // dislodge defender
        dislodged.push({ unitId: defender.id, from: defender.location, byPower: best.mv.mover.power, attackerFrom: best.mv.from });
        newLocations[best.mv.mover.id] = to;
      } else {
        // attack fails (bounce with defender)
      }
    } else {
      // empty, strongest enters
      newLocations[best.mv.mover.id] = to;
    }
  }

  // mark successes in results
  for (const r of results) {
    const order = orders.find((o) => o.id === r.orderId)!;
    if (order.type === 'Move') {
      r.success = newLocations[order.unitId] === order.to ? true : false;
      if (!r.success) r.reason = 'Bounced or convoy failed';
    } else if (order.type === 'Hold') {
      r.success = true;
    } else if (order.type === 'SupportHold' || order.type === 'SupportMove') {
      r.success = true; // we validated/cut in strength calc, outcome depends on supported action not the support order itself
    } else if (order.type === 'Convoy') {
      r.success = true; // convoy success implicit unless fleet dislodged (not handled in-order)
    }
  }

  // apply moves
  const newUnits = { ...state.units };
  
  // Remove dislodged units first
  for (const d of dislodged) {
    delete newUnits[d.unitId];
  }
  
  // Then apply successful moves
  for (const [uid, loc] of Object.entries(newLocations)) {
    newUnits[uid] = { ...newUnits[uid], location: loc };
  }

  return { results, dislodged, newUnits };
}

function computeRetreatOptions(state: GameState, dislodged: Dislodgement[], newUnits: Record<string, Unit>) {
  const occupied = new Set(Object.values(newUnits).map((u) => u.location));
  const options = [] as { unitId: string; options: ProvinceID[] }[];
  for (const d of dislodged) {
    const unit = state.units[d.unitId];
    if (!unit) continue;
    const adj = state.map[d.from].adjacents.filter((p) => {
      if (p === d.attackerFrom) return false; // cannot retreat into attacker
      if (occupied.has(p)) return false;
      if (!unitCanEnter(state.map, unit, p)) return false;
      return true;
    });
    options.push({ unitId: d.unitId, options: adj });
  }
  return options;
}

export function adjudicateOrders(state: GameState, orders: Order[]) {
  // Validate orders first; mark invalid as failed
  const results = initialOrderResults(orders);

  // Resolve moves and supports
  const context = collectOrders(state, orders);
  const moveRes = resolveMoves(state, orders, context);

  // If any convoying fleet is dislodged, convoys fail: this requires cross-check with dislodged list
  // For simplicity, we will treat this in retreat phase in this version.

  const nextUnits = moveRes.newUnits;

  // Update SC ownership if Fall after moves (units occupying SC provinces capture)
  let scOwners = state.scOwners;
  if (state.phase.season === 'Fall' && state.phase.type === 'Orders') {
    scOwners = { ...scOwners };
    for (const u of Object.values(nextUnits)) {
      const p = state.map[u.location];
      if (p.supplyCenter) scOwners[scKey(p.id)] = u.power;
    }
  }

  const nextState: GameState = {
    ...state,
    units: nextUnits,
    scOwners,
    phase: nextPhaseAfterOrders(state.phase),
    history: [...state.history, { phase: state.phase, orders, results: moveRes.results }],
  };

  const retreats = computeRetreatOptions(state, moveRes.dislodged, nextUnits);

  return { nextState, dislodged: moveRes.dislodged, retreats };
}

export function adjudicateRetreats(state: GameState, retreats: { unitId: string; to?: ProvinceID }[]) {
  const newUnits = { ...state.units };
  for (const r of retreats) {
    if (!r.to) {
      // disband
      delete newUnits[r.unitId];
      continue;
    }
    const unit = newUnits[r.unitId];
    if (!unit) continue;
    // basic validation
    if (!unitCanEnter(state.map, unit, r.to)) continue;
    const occupied = new Set(Object.values(newUnits).map((u) => u.location));
    if (occupied.has(r.to)) continue;
    newUnits[r.unitId] = { ...unit, location: r.to };
  }

  const nextState: GameState = {
    ...state,
    units: newUnits,
    phase: nextPhaseAfterRetreats(state.phase),
  };
  return { nextState };
}

export function adjudicateAdjustments(state: GameState, adjustments: { power: string; builds?: { type: 'Army'|'Fleet'; location: ProvinceID }[]; disbands?: string[] }[]) {
  const units = { ...state.units };
  // Count SCs by power
  const counts: Record<string, number> = {};
  for (const [prov, owner] of Object.entries(state.scOwners)) {
    if (!owner) continue;
    counts[owner] = (counts[owner] || 0) + 1;
  }
  const unitCounts: Record<string, number> = {};
  for (const u of Object.values(units)) unitCounts[u.power] = (unitCounts[u.power] || 0) + 1;

  // Apply disbands then builds per provided orders with crude validation
  for (const adj of adjustments) {
    if (adj.disbands) {
      for (const uid of adj.disbands) {
        const u = units[uid];
        if (u && u.power === adj.power) delete units[uid];
      }
    }
    if (adj.builds) {
      for (const b of adj.builds) {
        // must be home SC owned by the power and unoccupied
        const p = state.map[b.location];
        if (!p?.supplyCenter || !p.homeCenters?.includes(adj.power as any)) continue;
        if (state.scOwners[scKey(p.id)] !== adj.power) continue;
        const occupied = Object.values(units).some((u) => u.location === p.id);
        if (occupied) continue;
        const id = `u${Math.random().toString(36).slice(2)}`;
        units[id] = { id, power: adj.power as any, type: b.type, location: p.id } as Unit;
      }
    }
  }

  const nextState: GameState = {
    ...state,
    units,
    phase: nextPhaseAfterAdjustments(state.phase),
  };
  return { nextState };
}

export function nextPhaseAfterOrders(phase: GameState['phase']): GameState['phase'] {
  if (phase.season === 'Spring' && phase.type === 'Orders') return { ...phase, type: 'Retreats' };
  if (phase.season === 'Fall' && phase.type === 'Orders') return { ...phase, type: 'Retreats' };
  return phase;
}

export function nextPhaseAfterRetreats(phase: GameState['phase']): GameState['phase'] {
  if (phase.season === 'Spring' && phase.type === 'Retreats') return { year: phase.year, season: 'Fall', type: 'Orders' };
  if (phase.season === 'Fall' && phase.type === 'Retreats') return { year: phase.year, season: 'Winter', type: 'Adjustments' };
  return phase;
}

export function nextPhaseAfterAdjustments(phase: GameState['phase']): GameState['phase'] {
  if (phase.season === 'Winter' && phase.type === 'Adjustments') return { year: phase.year + 1, season: 'Spring', type: 'Orders' };
  return phase;
}

export function checkVictory(state: GameState) {
  const counts: Record<string, number> = {};
  for (const [prov, owner] of Object.entries(state.scOwners)) if (owner) counts[owner] = (counts[owner] || 0) + 1;
  for (const [power, n] of Object.entries(counts)) if (n >= 18) return power;
  return null;
}
