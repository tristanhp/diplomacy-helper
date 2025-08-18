import type { ProvinceID } from '../engine/types';

export const CANVAS = { width: 2000, height: 1250 };

export const GEO_POS: Record<ProvinceID, { x: number; y: number }> = {
  // Oceans and Seas
  nao: { x: 200, y: 230 },
  nwg: { x: 650, y: 125 },
  bar: { x: 1200, y: 110 },
  nth: { x: 710, y: 340 },
  ska: { x: 860, y: 315 },
  hel: { x: 800, y: 360 },
  bal: { x: 930, y: 390 },
  bot: { x: 945, y: 320 },
  iri: { x: 450, y: 420 },
  eng: { x: 570, y: 430 },
  mao: { x: 300, y: 700 },
  wes: { x: 700, y: 820 },
  gol: { x: 730, y: 760 },
  tyo: { x: 850, y: 780 },
  ion: { x: 1000, y: 850 },
  adr: { x: 860, y: 690 },
  aeg: { x: 1100, y: 780 },
  eas: { x: 1150, y: 860 },
  bla: { x: 1150, y: 620 },

  // British Isles
  cly: { x: 420, y: 260 },
  edi: { x: 470, y: 260 },
  lvp: { x: 460, y: 320 },
  yor: { x: 510, y: 320 },
  wal: { x: 490, y: 360 },
  lon: { x: 520, y: 360 },

  // France & Low Countries
  bre: { x: 570, y: 520 },
  par: { x: 620, y: 545 },
  pic: { x: 660, y: 530 },
  bur: { x: 700, y: 555 },
  gas: { x: 620, y: 660 },
  mar: { x: 710, y: 715 },
  bel: { x: 700, y: 500 },
  hol: { x: 740, y: 455 },

  // Iberia
  por: { x: 470, y: 720 },
  'spa-nc': { x: 565, y: 695 },
  'spa-sc': { x: 575, y: 740 },
  naf: { x: 600, y: 880 },
  tun: { x: 880, y: 860 },

  // Italy
  pie: { x: 760, y: 635 },
  tus: { x: 800, y: 720 },
  rom: { x: 840, y: 760 },
  nap: { x: 880, y: 790 },
  apu: { x: 900, y: 760 },
  ven: { x: 825, y: 630 },
  tyr: { x: 830, y: 585 },

  // Germany core
  ruh: { x: 770, y: 480 },
  kie: { x: 830, y: 470 },
  den: { x: 880, y: 345 },
  ber: { x: 865, y: 430 },
  mun: { x: 815, y: 530 },

  // Austria & neighbors
  boh: { x: 865, y: 510 },
  vie: { x: 905, y: 550 },
  bud: { x: 950, y: 600 },
  tri: { x: 905, y: 640 },

  // Balkans
  alb: { x: 920, y: 730 },
  gre: { x: 960, y: 770 },
  ser: { x: 960, y: 670 },
  'bul-ec': { x: 1045, y: 650 },
  'bul-sc': { x: 1030, y: 690 },
  rum: { x: 1080, y: 620 },

  // Turkey
  con: { x: 1100, y: 700 },
  ank: { x: 1200, y: 620 },
  smy: { x: 1160, y: 760 },
  arm: { x: 1260, y: 700 },
  syr: { x: 1220, y: 820 },

  // Russia & East
  sev: { x: 1160, y: 640 },
  ukr: { x: 1060, y: 560 },
  mos: { x: 1185, y: 500 },
  war: { x: 980, y: 450 },
  lvn: { x: 1005, y: 390 },
  pru: { x: 935, y: 440 },
  sil: { x: 900, y: 480 },
  gal: { x: 985, y: 515 },
  fin: { x: 980, y: 300 },
  swe: { x: 900, y: 300 },
  nwy: { x: 900, y: 220 },
  'stp-nc': { x: 1110, y: 215 },
  'stp-sc': { x: 1090, y: 260 },
};

// Label offsets to reduce overlaps; defaults applied in MapView when not specified
export const LABEL_OFFSET: Record<ProvinceID, { dx: number; dy: number }> = {
  // Seas around North
  nth: { dx: 14, dy: -8 },
  hel: { dx: 12, dy: -8 },
  ska: { dx: 12, dy: -8 },
  bal: { dx: 12, dy: -8 },
  iri: { dx: 12, dy: -8 },
  eng: { dx: 14, dy: -8 },
  mao: { dx: 14, dy: -10 },
  wes: { dx: 14, dy: -10 },
  gol: { dx: 14, dy: -8 },
  adr: { dx: 12, dy: -8 },
  ion: { dx: 14, dy: -10 },
  aeg: { dx: 14, dy: -8 },

  // Crowded land areas
  bel: { dx: 14, dy: 10 },
  hol: { dx: 14, dy: -10 },
  kie: { dx: 14, dy: 10 },
  den: { dx: 12, dy: -10 },
  par: { dx: 14, dy: -10 },
  pic: { dx: 14, dy: 12 },
  bur: { dx: 14, dy: 12 },
  mar: { dx: 14, dy: 12 },
  pie: { dx: 14, dy: -10 },
  ven: { dx: 14, dy: 12 },
  tyr: { dx: 14, dy: -10 },
  tri: { dx: 14, dy: 12 },
  vie: { dx: 14, dy: -10 },
  boh: { dx: 14, dy: 12 },
  mun: { dx: 14, dy: -10 },
  ber: { dx: 14, dy: -10 },
  war: { dx: 14, dy: -10 },
  pru: { dx: 14, dy: -10 },
  lvn: { dx: 14, dy: -10 },
  gal: { dx: 14, dy: 12 },
  ukr: { dx: 14, dy: -10 },
  rum: { dx: 14, dy: 12 },
  'bul-ec': { dx: 14, dy: -12 },
  'bul-sc': { dx: 14, dy: 12 },
  gre: { dx: 14, dy: 12 },
  alb: { dx: 14, dy: 12 },
  'spa-nc': { dx: 14, dy: -12 },
  'spa-sc': { dx: 14, dy: 12 },
  'stp-nc': { dx: 14, dy: -10 },
  'stp-sc': { dx: 14, dy: 12 },
};
