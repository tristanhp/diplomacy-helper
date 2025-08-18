import { create } from 'zustand';
import { GameState, Order, ProvinceID, Power } from '../engine/types';
import { createInitialState } from '../engine/initial';
import { adjudicateAdjustments, adjudicateOrders, adjudicateRetreats, checkVictory } from '../engine/adjudicate';

export type UIOrder = Order & { text?: string };

type DraftingState = {
  active: boolean;
  powers: Power[];
  index: number;
  drafts: Partial<Record<Power, UIOrder[]>>;
};

export interface GameStore {
  state: GameState;
  pendingOrders: UIOrder[];
  winner: string | null;
  retreatOptions: { unitId: string; options: ProvinceID[] }[];
  drafting: DraftingState;
  revealVisible: boolean;
  addOrder: (o: UIOrder) => void;
  removeOrder: (id: string) => void;
  clearOrders: () => void;
  resolveOrders: () => void;
  resolveRetreats: (decisions: { unitId: string; to?: ProvinceID }[]) => void;
  resolveAdjustments: (decisions: Parameters<typeof adjudicateAdjustments>[1]) => void;
  startDraft: () => void;
  submitCurrentDraft: () => void;
  previousDraft: () => void;
  cancelDraft: () => void;
  revealAndResolve: () => void;
  hideReveal: () => void;
}

export const useGameStore = create<GameStore>((set, get) => {
  // Initialize with proper power list on first load
  const initialState = createInitialState();
  const order: Power[] = ['England','France','Germany','Italy','Austria','Russia','Turkey'];
  const present = new Set<Power>(Object.values(initialState.units).map((u) => u.power) as Power[]);
  const powers = order.filter((p) => present.has(p));

  return {
  state: initialState,
  pendingOrders: [],
  winner: null,
  retreatOptions: [],
  drafting: { active: true, powers, index: 0, drafts: {} },
  revealVisible: false,
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
    
    // After retreats, check if we should start drafting for next phase
    if (nextState.phase.type === 'Adjustments') {
      // Go to adjustments phase (no drafting)
      set({ state: nextState, winner, retreatOptions: [] });
    } else if (nextState.phase.type === 'Orders') {
      // Go to next orders phase - start drafting
      const order: Power[] = ['England','France','Germany','Italy','Austria','Russia','Turkey'];
      const present = new Set<Power>(Object.values(nextState.units).map((u) => u.power) as Power[]);
      const powers = order.filter((p) => present.has(p));
      set({ 
        state: nextState, 
        winner, 
        retreatOptions: [], 
        drafting: { active: true, powers, index: 0, drafts: {} },
        pendingOrders: []
      });
    }
  },
  resolveAdjustments: (decisions) => {
    const s = get();
    const { nextState } = adjudicateAdjustments(s.state, decisions);
    const winner = checkVictory(nextState);
    
    // After adjustments, always start drafting for next orders phase
    const order: Power[] = ['England','France','Germany','Italy','Austria','Russia','Turkey'];
    const present = new Set<Power>(Object.values(nextState.units).map((u) => u.power) as Power[]);
    const powers = order.filter((p) => present.has(p));
    set({ 
      state: nextState, 
      winner,
      drafting: { active: true, powers, index: 0, drafts: {} },
      pendingOrders: []
    });
  },
  startDraft: () => {
    const s = get();
    const order: Power[] = ['England','France','Germany','Italy','Austria','Russia','Turkey'];
    const present = new Set<Power>(Object.values(s.state.units).map((u) => u.power) as Power[]);
    const powers = order.filter((p) => present.has(p));
    set({ drafting: { active: true, powers, index: 0, drafts: {} }, pendingOrders: [] });
  },
  submitCurrentDraft: () => {
    const s = get();
    if (!s.drafting.active) return;
    const pwr = s.drafting.powers[s.drafting.index];
    if (!pwr) return;
    const mine = (s.pendingOrders as UIOrder[]).filter((o) => o.power === pwr);
    const drafts = { ...(s.drafting.drafts || {}) };
    drafts[pwr] = mine;
    const nextIdx = s.drafting.index + 1;
    // Don't advance beyond the last power
    if (nextIdx >= s.drafting.powers.length) return;
    const nextPwr = s.drafting.powers[nextIdx];
    const nextPending = nextPwr ? (drafts[nextPwr] || []) : [];
    set({ drafting: { ...s.drafting, drafts, index: nextIdx }, pendingOrders: nextPending });
  },
  previousDraft: () => {
    const s = get();
    if (!s.drafting.active) return;
    const prevIdx = Math.max(0, s.drafting.index - 1);
    const prevPwr = s.drafting.powers[prevIdx];
    const pending = (s.drafting.drafts[prevPwr] || []) as UIOrder[];
    set({ drafting: { ...s.drafting, index: prevIdx }, pendingOrders: pending });
  },
  cancelDraft: () => set({ drafting: { active: false, powers: [], index: 0, drafts: {} }, pendingOrders: [] }),
  revealAndResolve: () => {
    const s = get();
    if (!s.drafting.active) return;
    const lastPwr = s.drafting.powers[s.drafting.index];
    const drafts = { ...(s.drafting.drafts || {}) } as Partial<Record<Power, UIOrder[]>>;
    if (lastPwr) drafts[lastPwr] = (s.pendingOrders as UIOrder[]).filter((o) => o.power === lastPwr);
    const all: UIOrder[] = s.drafting.powers.flatMap((p) => drafts[p] || []);
    const { nextState, retreats } = adjudicateOrders(s.state, all as Order[]);
    const winner = checkVictory(nextState);
    
    // Check what phase we're in after adjudication
    if (nextState.phase.type === 'Retreats') {
      // If we have retreats to handle, stop drafting and show retreat interface
      set({ 
        state: nextState, 
        winner, 
        pendingOrders: [], 
        retreatOptions: retreats, 
        drafting: { active: false, powers: [], index: 0, drafts: {} },
        revealVisible: true 
      });
    } else if (nextState.phase.type === 'Adjustments') {
      // If we're directly in adjustments (no retreats), stop drafting and show adjustment interface
      set({ 
        state: nextState, 
        winner, 
        pendingOrders: [], 
        retreatOptions: [], 
        drafting: { active: false, powers: [], index: 0, drafts: {} },
        revealVisible: true 
      });
    } else {
      // If we're in the next orders phase, restart drafting for next phase
      const order: Power[] = ['England','France','Germany','Italy','Austria','Russia','Turkey'];
      const present = new Set<Power>(Object.values(nextState.units).map((u) => u.power) as Power[]);
      const newPowers = order.filter((p) => present.has(p));
      
      set({ 
        state: nextState, 
        winner, 
        pendingOrders: [], 
        retreatOptions: [], 
        drafting: { active: true, powers: newPowers, index: 0, drafts: {} }, 
        revealVisible: true 
      });
    }
  },
  hideReveal: () => set({ revealVisible: false }),
}});
