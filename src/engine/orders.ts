import { GameState, Order, OrderResult, ProvinceID, Unit, UnitType } from './types';

export function isAdjacent(map: GameState['map'], from: ProvinceID, to: ProvinceID) {
  const p = map[from];
  return p?.adjacents.includes(to) ?? false;
}

export function unitCanEnter(map: GameState['map'], unit: Unit, provinceId: ProvinceID): boolean {
  const p = map[provinceId];
  if (!p) return false;
  if (unit.type === 'Army') {
    return p.type === 'land' || p.type === 'coastal';
  }
  // Fleet
  return p.type === 'sea' || p.type === 'coastal';
}

export function validateOrder(state: GameState, order: Order): string | null {
  const unit = state.units[order.unitId];
  if (!unit) return 'No such unit';
  if (unit.power !== order.power) return 'Unit not owned by power';

  if (order.type === 'Hold') {
    return null;
  }

  if (order.type === 'Move') {
    if (order.from !== unit.location) return 'Move source mismatch';
    if (!unitCanEnter(state.map, unit, order.to)) return 'Unit cannot enter destination';
    if (!isAdjacent(state.map, order.from, order.to) && !order.viaConvoy) return 'Not adjacent unless convoy';
    return null;
  }

  if (order.type === 'SupportHold') {
    const target = state.units[order.targetUnitId];
    if (!target) return 'No such target unit';
    // supporter must be able to move into target province
    if (!unitCanEnter(state.map, unit, order.targetProvince)) return 'Supporter cannot move into target province';
    if (!isAdjacent(state.map, unit.location, order.targetProvince)) return 'Supporter not adjacent to target province';
    return null;
  }

  if (order.type === 'SupportMove') {
    const target = state.units[order.targetUnitId];
    if (!target) return 'No such target unit';
    // supporter must be able to move into move destination
    if (!unitCanEnter(state.map, unit, order.to)) return 'Supporter cannot move into destination';
    if (!isAdjacent(state.map, unit.location, order.to)) return 'Supporter not adjacent to destination';
    // also target.from must be adjacent to target.to or convoyed, but validation defers to adjudication
    return null;
  }

  if (order.type === 'Convoy') {
    const target = state.units[order.armyUnitId];
    if (!target) return 'No such army';
    if (target.type !== 'Army') return 'Only armies can be convoyed';
    const fleetProv = state.map[state.units[order.unitId].location];
    if (fleetProv.type !== 'sea') return 'Convoying fleet must be in sea province';
    return null;
  }

  return 'Unknown order type';
}

export function initialOrderResults(orders: Order[]): OrderResult[] {
  return orders.map((o) => ({ orderId: o.id, success: null }));
}
