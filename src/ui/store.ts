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
  downloadGameHistory: () => void;
  downloadGameHistoryImage: () => void;
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
  downloadGameHistory: () => {
    const { state } = get();
    const gameReport = generateGameReport(state);
    downloadTextFile(gameReport, `diplomacy-game-${new Date().toISOString().split('T')[0]}.txt`);
  },
  downloadGameHistoryImage: () => {
    const { state } = get();
    generateGameHistoryImages(state);
  },
}});

function generateGameReport(state: GameState): string {
  const lines: string[] = [];
  
  lines.push('DIPLOMACY GAME HISTORY');
  lines.push('======================');
  lines.push('');
  lines.push(`Generated: ${new Date().toLocaleString()}`);
  lines.push('');
  
  // Final results
  const scCounts = countSupplyCenters(state);
  lines.push('FINAL SUPPLY CENTER COUNT:');
  lines.push('--------------------------');
  Object.entries(scCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([power, count]) => {
      lines.push(`${power}: ${count} centers`);
    });
  lines.push('');
  
  // Game history
  lines.push('GAME HISTORY:');
  lines.push('=============');
  lines.push('');
  
  if (state.history.length === 0) {
    lines.push('No moves recorded yet.');
  } else {
    state.history.forEach((turn, index) => {
      const { phase, orders, results } = turn;
      lines.push(`${phase.season} ${phase.year} - ${phase.type}`);
      lines.push('-'.repeat(30));
      
      if (orders.length === 0) {
        lines.push('No orders submitted.');
      } else {
        // Group orders by power
        const ordersByPower: Record<string, typeof orders> = {};
        orders.forEach(order => {
          const unit = Object.values(state.units).find(u => u.id === order.unitId);
          if (unit) {
            if (!ordersByPower[unit.power]) ordersByPower[unit.power] = [];
            ordersByPower[unit.power].push(order);
          }
        });
        
        Object.entries(ordersByPower).forEach(([power, powerOrders]) => {
          lines.push(`${power}:`);
          powerOrders.forEach(order => {
            const result = results?.find(r => r.orderId === order.id);
            const unit = Object.values(state.units).find(u => u.id === order.unitId);
            if (unit) {
              const orderText = formatOrder(order, unit, state);
              const success = result?.success ? '✓' : '✗';
              const reason = result?.reason ? ` (${result.reason})` : '';
              lines.push(`  ${success} ${orderText}${reason}`);
            }
          });
          lines.push('');
        });
      }
      lines.push('');
    });
  }
  
  return lines.join('\n');
}

function countSupplyCenters(state: GameState): Record<string, number> {
  const counts: Record<string, number> = {};
  Object.values(state.scOwners).forEach(owner => {
    if (owner) {
      counts[owner] = (counts[owner] || 0) + 1;
    }
  });
  return counts;
}

function formatOrder(order: any, unit: any, state: GameState): string {
  const unitName = `${unit.type} ${unit.location}`;
  const getProvinceName = (id: string) => state.map[id]?.name || id;
  
  switch (order.type || order.action) {
    case 'Hold':
      return `${unitName} holds`;
    case 'Move':
    case 'move':
      return `${unitName} moves to ${getProvinceName(order.to)}`;
    case 'SupportHold':
    case 'support':
      if (order.supportType === 'hold') {
        return `${unitName} supports ${getProvinceName(order.targetProvince)}`;
      } else {
        return `${unitName} supports ${getProvinceName(order.from)} to ${getProvinceName(order.to)}`;
      }
    case 'SupportMove':
      return `${unitName} supports ${getProvinceName(order.from)} to ${getProvinceName(order.to)}`;
    case 'Convoy':
    case 'convoy':
      return `${unitName} convoys ${getProvinceName(order.from)} to ${getProvinceName(order.to)}`;
    default:
      return `${unitName} - unknown order`;
  }
}

function downloadTextFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function generateGameHistoryImages(state: GameState): void {
  // Generate summary image
  generateSummaryImage(state);
  
  // Generate individual season images
  state.history.forEach((turn, index) => {
    generateSeasonImage(state, turn, index + 1);
  });
}

function generateSummaryImage(state: GameState): void {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Mobile-friendly dimensions (portrait orientation)
  canvas.width = 800;
  canvas.height = 1200;

  // Background
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Title
  ctx.fillStyle = '#f1f5f9';
  ctx.font = 'bold 32px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Diplomacy Game Summary', canvas.width / 2, 60);

  // Date
  ctx.font = '18px Arial';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText(new Date().toLocaleDateString(), canvas.width / 2, 90);

  // Supply center counts
  const scCounts = countSupplyCenters(state);
  const powers = Object.entries(scCounts).sort((a, b) => b[1] - a[1]);
  
  ctx.font = 'bold 24px Arial';
  ctx.fillStyle = '#f1f5f9';
  ctx.fillText('Final Supply Center Count', canvas.width / 2, 140);
  
  const powerColors: Record<string, string> = {
    'England': '#ec4899',
    'France': '#3b82f6', 
    'Germany': '#6b7280',
    'Italy': '#ef4444',
    'Austria': '#eab308',
    'Russia': '#60a5fa', // Light blue - definitely visible
    'Turkey': '#22c55e'
  };

  // Draw supply center bars (stacked vertically for mobile)
  const barWidth = canvas.width - 200;
  const barHeight = 40;
  const barStartY = 180;
  const maxCenters = Math.max(...powers.map(([, count]) => count));
  
  powers.forEach(([power, count], index) => {
    const y = barStartY + (index * (barHeight + 20));
    const barLength = (count / maxCenters) * barWidth;
    
    // Bar
    ctx.fillStyle = powerColors[power] || '#94a3b8';
    ctx.fillRect(100, y, barLength, barHeight);
    
    // Power name and count
    ctx.fillStyle = '#f1f5f9';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`${power}`, 110, y + 26);
    
    // Count
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(count.toString(), canvas.width - 110, y + 28);
  });

  // Game timeline
  const timelineY = barStartY + (powers.length * 60) + 60;
  ctx.fillStyle = '#f1f5f9';
  ctx.font = 'bold 22px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Game Timeline', canvas.width / 2, timelineY);

  if (state.history.length > 0) {
    const timelineStartY = timelineY + 40;
    const timelineWidth = canvas.width - 100;
    const timelineX = 50;
    
    // Timeline background
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(timelineX, timelineStartY);
    ctx.lineTo(timelineX + timelineWidth, timelineStartY);
    ctx.stroke();

    // Timeline points (arranged vertically if too many)
    if (state.history.length <= 8) {
      // Horizontal timeline for fewer turns
      state.history.forEach((turn, index) => {
        const x = timelineX + (index / Math.max(1, state.history.length - 1)) * timelineWidth;
        const { phase, orders } = turn;
        
        // Point
        ctx.fillStyle = '#3b82f6';
        ctx.beginPath();
        ctx.arc(x, timelineStartY, 10, 0, 2 * Math.PI);
        ctx.fill();

        // Phase label
        ctx.fillStyle = '#f1f5f9';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${phase.season} ${phase.year}`, x, timelineStartY - 25);
        ctx.font = '12px Arial';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(phase.type, x, timelineStartY - 10);
        ctx.fillText(`${orders.length} orders`, x, timelineStartY + 30);
      });
    } else {
      // Vertical list for many turns
      state.history.forEach((turn, index) => {
        const y = timelineStartY + 20 + (index * 40);
        const { phase, orders } = turn;
        
        // Point
        ctx.fillStyle = '#3b82f6';
        ctx.beginPath();
        ctx.arc(timelineX, y, 8, 0, 2 * Math.PI);
        ctx.fill();

        // Phase info
        ctx.fillStyle = '#f1f5f9';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`${phase.season} ${phase.year} - ${phase.type}`, timelineX + 20, y - 5);
        ctx.font = '14px Arial';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(`${orders.length} orders`, timelineX + 20, y + 15);
      });
    }
  }

  // Current units summary - Table format
  const unitsY = timelineY + (state.history.length > 8 ? state.history.length * 40 + 80 : 140);
  ctx.fillStyle = '#f1f5f9';
  ctx.font = 'bold 22px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Final Unit Positions', canvas.width / 2, unitsY);

  // Initialize all powers, even if they have no units
  const allPowers = ['England', 'France', 'Germany', 'Italy', 'Austria', 'Russia', 'Turkey'];
  const unitsByPower: Record<string, any[]> = {};
  allPowers.forEach(power => {
    unitsByPower[power] = [];
  });
  
  Object.values(state.units).forEach(unit => {
    if (unitsByPower[unit.power]) {
      unitsByPower[unit.power].push(unit);
    }
  });

  // Draw table
  const tableStartY = unitsY + 50;
  const rowHeight = 35;
  const colWidth = (canvas.width - 100) / 3; // 3 columns: Power, Count, Units
  
  // Table headers
  ctx.fillStyle = '#475569';
  ctx.fillRect(50, tableStartY, canvas.width - 100, rowHeight);
  
  ctx.fillStyle = '#f1f5f9';
  ctx.font = 'bold 16px Arial';
  ctx.textAlign = 'left';
  ctx.fillText('Power', 60, tableStartY + 22);
  ctx.fillText('Units', 60 + colWidth, tableStartY + 22);
  ctx.fillText('Positions', 60 + colWidth * 2, tableStartY + 22);

  // Table rows
  allPowers.forEach((power, index) => {
    const units = unitsByPower[power] || [];
    const y = tableStartY + ((index + 1) * rowHeight);
    
    // Row background (alternating colors)
    ctx.fillStyle = index % 2 === 0 ? '#334155' : '#1e293b';
    ctx.fillRect(50, y, canvas.width - 100, rowHeight);
    
    // Power name with color
    ctx.fillStyle = power === 'Russia' ? '#60a5fa' : (powerColors[power] || '#94a3b8'); // Use light blue for Russia
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(power, 60, y + 22);
    
    // Unit count
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '16px Arial';
    ctx.fillText(units.length.toString(), 60 + colWidth, y + 22);
    
    // Unit positions (truncated if too long)
    const positions = units.length === 0 ? 'Eliminated' : 
      units.map(u => `${u.type[0]} ${state.map[u.location]?.name || u.location}`).join(', ');
    
    const maxWidth = colWidth - 20;
    let displayText = positions;
    const metrics = ctx.measureText(positions);
    if (metrics.width > maxWidth) {
      // Truncate and add "..."
      while (ctx.measureText(displayText + '...').width > maxWidth && displayText.length > 0) {
        displayText = displayText.slice(0, -1);
      }
      displayText += '...';
    }
    
    ctx.fillStyle = units.length === 0 ? '#94a3b8' : '#e2e8f0';
    ctx.fillText(displayText, 60 + colWidth * 2, y + 22);
  });

  // Download
  canvas.toBlob((blob) => {
    if (blob) {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `diplomacy-summary-${new Date().toISOString().split('T')[0]}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  }, 'image/png');
}

function generateSeasonImage(state: GameState, turn: any, turnNumber: number): void {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Mobile-friendly dimensions (portrait orientation)
  canvas.width = 800;
  canvas.height = 1400;

  // Background
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const { phase, orders, results } = turn;

  // Title
  ctx.fillStyle = '#f1f5f9';
  ctx.font = 'bold 32px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(`${phase.season} ${phase.year} - ${phase.type}`, canvas.width / 2, 60);

  // Subtitle
  ctx.font = '18px Arial';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText(`Turn ${turnNumber} • ${orders.length} Orders Submitted`, canvas.width / 2, 90);

  const powerColors: Record<string, string> = {
    'England': '#ec4899',
    'France': '#3b82f6', 
    'Germany': '#6b7280',
    'Italy': '#ef4444',
    'Austria': '#eab308',
    'Russia': '#60a5fa', // Light blue - definitely visible
    'Turkey': '#22c55e'
  };

  // Group orders by power
  const ordersByPower: Record<string, any[]> = {};
  orders.forEach((order: any) => {
    const unit = Object.values(state.units).find((u: any) => u.id === order.unitId);
    if (unit) {
      const power = (unit as any).power;
      if (!ordersByPower[power]) ordersByPower[power] = [];
      ordersByPower[power].push({ order, unit, result: results?.find((r: any) => r.orderId === order.id) });
    }
  });

  if (Object.keys(ordersByPower).length === 0) {
    ctx.fillStyle = '#94a3b8';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('No orders submitted this turn', canvas.width / 2, 180);
  } else {
    // Draw orders for each power (single column layout for mobile)
    let currentY = 140;

    Object.entries(ordersByPower).forEach(([power, powerOrders]) => {
      // Power header
      ctx.fillStyle = powerColors[power] || '#94a3b8';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(`${power}`, 50, currentY);
      
      // Underline
      ctx.strokeStyle = powerColors[power] || '#94a3b8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(50, currentY + 8);
      ctx.lineTo(canvas.width - 50, currentY + 8);
      ctx.stroke();
      
      currentY += 45;

      // Orders
      powerOrders.forEach(({ order, unit, result }) => {
        const success = result?.success;
        const successIcon = success === true ? '✓' : success === false ? '✗' : '?';
        const successColor = success === true ? '#22c55e' : success === false ? '#ef4444' : '#94a3b8';
        
        // Success icon
        ctx.fillStyle = successColor;
        ctx.font = 'bold 20px Arial';
        ctx.fillText(successIcon, 50, currentY);
        
        // Order text
        ctx.fillStyle = '#f1f5f9';
        ctx.font = '16px Arial';
        const orderText = formatOrder(order, unit, state);
        
        // Wrap long text for mobile
        const maxWidth = canvas.width - 120;
        const words = orderText.split(' ');
        let line = '';
        let y = currentY;
        
        words.forEach(word => {
          const testLine = line + word + ' ';
          const metrics = ctx.measureText(testLine);
          if (metrics.width > maxWidth && line !== '') {
            ctx.fillText(line, 85, y);
            line = word + ' ';
            y += 22;
          } else {
            line = testLine;
          }
        });
        ctx.fillText(line, 85, y);
        
        // Failure reason if applicable
        if (result?.reason && !result.success) {
          ctx.fillStyle = '#94a3b8';
          ctx.font = '14px Arial';
          ctx.fillText(`(${result.reason})`, 85, y + 20);
          y += 20;
        }
        
        currentY = y + 35;
      });
      
      currentY += 30; // Space between powers
    });
  }

  // Download
  canvas.toBlob((blob) => {
    if (blob) {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `diplomacy-turn-${turnNumber.toString().padStart(2, '0')}-${phase.season}${phase.year}-${phase.type}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  }, 'image/png');
}
