import { GameState, Unit } from './types';
import { createStandardMap } from './map';

function scKey(id: string): string {
  // Normalize split-coast IDs to their parent province for SC ownership
  if (id.startsWith('spa-')) return 'spa';
  if (id.startsWith('bul-')) return 'bul';
  if (id.startsWith('stp-')) return 'stp';
  return id;
}

export function createInitialState(): GameState {
  const map = createStandardMap();

  // Standard 1901 starting positions
  const units: Record<string, Unit> = {
    // England
    e_f_edi: { id: 'e_f_edi', power: 'England', type: 'Fleet', location: 'edi' },
    e_f_lon: { id: 'e_f_lon', power: 'England', type: 'Fleet', location: 'lon' },
    e_a_lvp: { id: 'e_a_lvp', power: 'England', type: 'Army', location: 'lvp' },
    // France
    f_f_bre: { id: 'f_f_bre', power: 'France', type: 'Fleet', location: 'bre' },
    f_a_par: { id: 'f_a_par', power: 'France', type: 'Army', location: 'par' },
    f_a_mar: { id: 'f_a_mar', power: 'France', type: 'Army', location: 'mar' },
    // Germany
    g_a_mun: { id: 'g_a_mun', power: 'Germany', type: 'Army', location: 'mun' },
    g_a_ber: { id: 'g_a_ber', power: 'Germany', type: 'Army', location: 'ber' },
    g_f_kie: { id: 'g_f_kie', power: 'Germany', type: 'Fleet', location: 'kie' },
    // Italy
    i_a_ven: { id: 'i_a_ven', power: 'Italy', type: 'Army', location: 'ven' },
    i_a_rom: { id: 'i_a_rom', power: 'Italy', type: 'Army', location: 'rom' },
    i_f_nap: { id: 'i_f_nap', power: 'Italy', type: 'Fleet', location: 'nap' },
    // Austria
    a_a_vie: { id: 'a_a_vie', power: 'Austria', type: 'Army', location: 'vie' },
    a_a_bud: { id: 'a_a_bud', power: 'Austria', type: 'Army', location: 'bud' },
    a_f_tri: { id: 'a_f_tri', power: 'Austria', type: 'Fleet', location: 'tri' },
    // Russia
    r_a_mos: { id: 'r_a_mos', power: 'Russia', type: 'Army', location: 'mos' },
    r_a_war: { id: 'r_a_war', power: 'Russia', type: 'Army', location: 'war' },
    r_f_sev: { id: 'r_f_sev', power: 'Russia', type: 'Fleet', location: 'sev' },
    r_f_stp: { id: 'r_f_stp', power: 'Russia', type: 'Fleet', location: 'stp-sc' },
    // Turkey
    t_a_con: { id: 't_a_con', power: 'Turkey', type: 'Army', location: 'con' },
    t_a_smy: { id: 't_a_smy', power: 'Turkey', type: 'Army', location: 'smy' },
    t_f_ank: { id: 't_f_ank', power: 'Turkey', type: 'Fleet', location: 'ank' },
  };

  // Initialize SC ownership: home centers start owned by their powers; neutrals start unowned.
  const scOwners: GameState['scOwners'] = {};
  for (const p of Object.values(map)) {
    if (!p.supplyCenter) continue;
    const key = scKey(p.id);
    if (key in scOwners) continue; // avoid duplicating split coasts
    const home = p.homeCenters && p.homeCenters.length ? p.homeCenters[0] : null;
    scOwners[key] = home;
  }

  return {
    map,
    units,
    scOwners,
    phase: { year: 1901, season: 'Spring', type: 'Orders' },
    history: [],
  };
}
