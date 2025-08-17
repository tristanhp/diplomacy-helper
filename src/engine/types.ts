export type Power =
  | 'England'
  | 'France'
  | 'Germany'
  | 'Italy'
  | 'Austria'
  | 'Russia'
  | 'Turkey';

export type UnitType = 'Army' | 'Fleet';
export type ProvinceType = 'land' | 'sea' | 'coastal';
export type Coast = 'NC' | 'SC' | 'EC' | 'WC' | 'NC/SC' | null;

export type ProvinceID = string; // canonical id like 'par', 'spa'

export interface Province {
  id: ProvinceID;
  name: string;
  type: ProvinceType;
  splitCoasts?: Coast[]; // for fleets, e.g., ['NC','SC']
  supplyCenter?: boolean;
  homeCenters?: Power[]; // which powers have home SC here
  adjacents: ProvinceID[]; // adjacency graph at province or coast-level where needed
}

export interface Unit {
  id: string;
  power: Power;
  type: UnitType;
  location: ProvinceID; // province or coast node
}

export type PhaseSeason = 'Spring' | 'Fall' | 'Winter';
export type PhaseType = 'Orders' | 'Retreats' | 'Adjustments';

export interface Phase {
  year: number;
  season: PhaseSeason; // Winter uses Adjustments
  type: PhaseType;
}

// Orders
export type OrderType =
  | 'Hold'
  | 'Move'
  | 'SupportHold'
  | 'SupportMove'
  | 'Convoy';

export interface BaseOrder {
  id: string;
  unitId: string;
  power: Power;
  type: OrderType;
}

export interface HoldOrder extends BaseOrder {
  type: 'Hold';
}

export interface MoveOrder extends BaseOrder {
  type: 'Move';
  from: ProvinceID; // must equal unit location
  to: ProvinceID; // adjacent or via convoy
  viaConvoy?: boolean; // declared intent
}

export interface SupportHoldOrder extends BaseOrder {
  type: 'SupportHold';
  targetUnitId: string;
  targetProvince: ProvinceID; // province being held
}

export interface SupportMoveOrder extends BaseOrder {
  type: 'SupportMove';
  from: ProvinceID; // source province of the mover
  to: ProvinceID; // destination province of the mover
  targetUnitId: string;
}

export interface ConvoyOrder extends BaseOrder {
  type: 'Convoy';
  armyUnitId: string;
  from: ProvinceID;
  to: ProvinceID;
}

export type Order =
  | HoldOrder
  | MoveOrder
  | SupportHoldOrder
  | SupportMoveOrder
  | ConvoyOrder;

export interface OrderResult {
  orderId: string;
  success: boolean | null; // null until adjudicated
  reason?: string;
}

export interface Dislodgement {
  unitId: string;
  from: ProvinceID;
  byPower: Power;
  attackerFrom?: ProvinceID;
}

export interface RetreatOption {
  unitId: string;
  options: ProvinceID[];
}

export interface Adjustment {
  power: Power;
  builds: number; // positive builds, negative means disbands required
}

export interface GameState {
  map: Record<ProvinceID, Province>;
  units: Record<string, Unit>; // unitId -> unit
  scOwners: Record<ProvinceID, Power | null>; // only for SC provinces; null if neutral
  phase: Phase;
  history: Array<{ phase: Phase; orders: Order[]; results: OrderResult[] }>; 
}
