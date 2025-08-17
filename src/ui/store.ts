import create from 'zustand';
import { GameState, Order, ProvinceID } from '../engine/types';
import { createInitialState } from '../engine/initial';
import { adjudicateAdjustments, adjudicateOrders, adjudicateRetreats, checkVictory } from '../engine/adjudicate';

export type UIOrder = Order & { text?: string };

export interface GameStore {
  state: GameState;
  pendingOrders: UIOrder[];
  winner: string | null;
  retreatOptions: { unitId: string; options: ProvinceID[] }[];
  addOrder: (o: UIOrder) => void;
  removeOrder: (id: string) => void;
  clearOrders: () => void;
  resolveOrders: () => void;
  resolveRetreats: (decisions: { unitId: string; to?: ProvinceID }[]) => void;
  resolveAdjustments: (decisions: Parameters<typeof adjudicateAdjustments>[1]) => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  state: createInitialState(),
  pendingOrders: [],
  winner: null,
  retreatOptions: [],
  addOrder: (o) => set((s) => ({ pendingOrders: [...s.pendingOrders, o] })),
  removeOrder: (id) => set((s) => ({ pendingOrders: s.pendingOrders.filter((o) => o.id !== id) })),
  clearOrders: () => set({ pendingOrders: [] }),
  resolveOrders: () => {
    const s = get();
    const { nextState, retreats } = adjudicateOrders(s.state, s.pendingOrders as Order[]);
    const winner = checkVictory(nextState);
    set({ state: nextState, winner, pendingOrders: [], retreatOptions: retreats });
  },
  resolveRetreats: (decisions) => {
    const s = get();
    const { nextState } = adjudicateRetreats(s.state, decisions);
    const winner = checkVictory(nextState);
    set({ state: nextState, winner, retreatOptions: [] });
  },
  resolveAdjustments: (decisions) => {
    const s = get();
    const { nextState } = adjudicateAdjustments(s.state, decisions);
    const winner = checkVictory(nextState);
    set({ state: nextState, winner });
  },
}));
