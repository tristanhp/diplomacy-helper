import { Province, ProvinceID } from './types';

// Classic Diplomacy (1901) full board
// Notes:
// - Split coasts are modeled as distinct coastal nodes (e.g., spa-nc, spa-sc, bul-ec, bul-sc, stp-nc, stp-sc).
// - Each node has its own adjacency list. Fleets must specify coasts. Armies can enter coastal nodes as well in this simplified model.
// - Supply centers are marked on their corresponding nodes. For split-coast SCs, both coast nodes are marked as SC to allow capture from either coast in this simplified implementation.

export const createStandardMap = (): Record<ProvinceID, Province> => {
  const m: Record<ProvinceID, Province> = {};
  const add = (p: Province) => (m[p.id] = p);

  // Seas
  add({ id: 'adr', name: 'Adriatic Sea', type: 'sea', adjacents: ['ven','tri','alb','apu','ion'] });
  add({ id: 'aeg', name: 'Aegean Sea', type: 'sea', adjacents: ['gre','bul-sc','con','smy','eas','ion'] });
  add({ id: 'bal', name: 'Baltic Sea', type: 'sea', adjacents: ['kie','den','swe','bot','pru','lvn','ber'] });
  add({ id: 'bar', name: 'Barents Sea', type: 'sea', adjacents: ['nwg','nwy','stp-nc'] });
  add({ id: 'bla', name: 'Black Sea', type: 'sea', adjacents: ['rum','sev','arm','ank','con','bul-ec'] });
  add({ id: 'bot', name: 'Gulf of Bothnia', type: 'sea', adjacents: ['swe','fin','stp-sc','lvn','bal'] });
  add({ id: 'eas', name: 'Eastern Mediterranean', type: 'sea', adjacents: ['ion','aeg','smy','syr'] });
  add({ id: 'eng', name: 'English Channel', type: 'sea', adjacents: ['iri','wal','lon','pic','bre','mao','bel'] });
  add({ id: 'gol', name: 'Gulf of Lyon', type: 'sea', adjacents: ['wes','tyo','tus','pie','mar','spa-sc'] });
  add({ id: 'hel', name: 'Helgoland Bight', type: 'sea', adjacents: ['nth','hol','kie','den'] });
  add({ id: 'ion', name: 'Ionian Sea', type: 'sea', adjacents: ['tun','tyo','nap','apu','adr','alb','gre','aeg','eas'] });
  add({ id: 'iri', name: 'Irish Sea', type: 'sea', adjacents: ['nao','lvp','wal','eng','mao'] });
  add({ id: 'mao', name: 'Mid-Atlantic Ocean', type: 'sea', adjacents: ['nao','iri','eng','bre','gas','spa-nc','por','wes'] });
  add({ id: 'nao', name: 'North Atlantic Ocean', type: 'sea', adjacents: ['cly','nwg','iri','mao'] });
  add({ id: 'nth', name: 'North Sea', type: 'sea', adjacents: ['nwg','edi','yor','lon','eng','bel','hol','hel','den','ska','nwy','swe'] });
  add({ id: 'nwg', name: 'Norwegian Sea', type: 'sea', adjacents: ['nao','cly','edi','nth','nwy','bar'] });
  add({ id: 'ska', name: 'Skagerrak', type: 'sea', adjacents: ['nth','nwy','swe','den'] });
  add({ id: 'tyo', name: 'Tyrrhenian Sea', type: 'sea', adjacents: ['wes','tun','ion','nap','rom','tus','gol'] });
  add({ id: 'wes', name: 'Western Mediterranean', type: 'sea', adjacents: ['mao','spa-sc','gol','tyo','tun'] });

  // England and surrounding
  add({ id: 'lon', name: 'London', type: 'coastal', supplyCenter: true, homeCenters: ['England'], adjacents: ['wal','yor','nth','eng'] });
  add({ id: 'wal', name: 'Wales', type: 'coastal', adjacents: ['lon','lvp','iri','eng'] });
  add({ id: 'yor', name: 'Yorkshire', type: 'coastal', adjacents: ['lon','edi','nth'] });
  add({ id: 'lvp', name: 'Liverpool', type: 'coastal', supplyCenter: true, homeCenters: ['England'], adjacents: ['cly','edi','wal','iri','nao'] });
  add({ id: 'edi', name: 'Edinburgh', type: 'coastal', supplyCenter: true, homeCenters: ['England'], adjacents: ['cly','yor','nth','nwg','lvp'] });
  add({ id: 'cly', name: 'Clyde', type: 'coastal', adjacents: ['edi','nwg','nao','lvp'] });

  // France and Iberia
  add({ id: 'bre', name: 'Brest', type: 'coastal', supplyCenter: true, homeCenters: ['France'], adjacents: ['eng','pic','par','gas','mao'] });
  add({ id: 'par', name: 'Paris', type: 'land', supplyCenter: true, homeCenters: ['France'], adjacents: ['bre','pic','bur','gas'] });
  add({ id: 'pic', name: 'Picardy', type: 'coastal', adjacents: ['bel','eng','bre','par','bur'] });
  add({ id: 'bur', name: 'Burgundy', type: 'land', adjacents: ['par','pic','bel','ruh','mun','mar','gas'] });
  add({ id: 'gas', name: 'Gascony', type: 'coastal', adjacents: ['bre','par','bur','spa-nc','mao','mar'] });
  add({ id: 'mar', name: 'Marseilles', type: 'coastal', supplyCenter: true, homeCenters: ['France'], adjacents: ['bur','spa-sc','pie','gol','gas'] });
  add({ id: 'spa-nc', name: 'Spain (nc)', type: 'coastal', supplyCenter: true, adjacents: ['por','gas','mao'] });
  add({ id: 'spa-sc', name: 'Spain (sc)', type: 'coastal', supplyCenter: true, adjacents: ['wes','gol','mar'] });
  add({ id: 'por', name: 'Portugal', type: 'coastal', supplyCenter: true, adjacents: ['mao','spa-nc'] });

  // Italy
  add({ id: 'pie', name: 'Piedmont', type: 'coastal', adjacents: ['mar','tus','tyr','gol'] });
  add({ id: 'tus', name: 'Tuscany', type: 'coastal', adjacents: ['pie','rom','tyo','gol'] });
  add({ id: 'rom', name: 'Rome', type: 'coastal', supplyCenter: true, homeCenters: ['Italy'], adjacents: ['tus','ven','apu','nap','tyo'] });
  add({ id: 'nap', name: 'Naples', type: 'coastal', supplyCenter: true, homeCenters: ['Italy'], adjacents: ['rom','apu','ion','tyo'] });
  add({ id: 'apu', name: 'Apulia', type: 'coastal', adjacents: ['ven','rom','nap','ion','adr'] });
  add({ id: 'ven', name: 'Venice', type: 'coastal', supplyCenter: true, homeCenters: ['Italy'], adjacents: ['tyr','tri','adr','apu','rom','tus'] });
  add({ id: 'tyr', name: 'Tyrolia', type: 'land', adjacents: ['mun','boh','vie','tri','ven','pie'] });

  // Germany and Low Countries
  add({ id: 'bel', name: 'Belgium', type: 'coastal', supplyCenter: true, adjacents: ['hol','ruh','bur','pic','eng','nth'] });
  add({ id: 'hol', name: 'Holland', type: 'coastal', supplyCenter: true, adjacents: ['bel','ruh','kie','hel','nth'] });
  add({ id: 'ruh', name: 'Ruhr', type: 'land', adjacents: ['bel','hol','kie','mun','bur'] });
  add({ id: 'kie', name: 'Kiel', type: 'coastal', supplyCenter: true, homeCenters: ['Germany'], adjacents: ['ruh','den','hel','bal','ber','mun','hol'] });
  add({ id: 'den', name: 'Denmark', type: 'coastal', supplyCenter: true, adjacents: ['hel','nth','ska','bal','kie','swe'] });
  add({ id: 'ber', name: 'Berlin', type: 'coastal', supplyCenter: true, homeCenters: ['Germany'], adjacents: ['kie','bal','pru','sil','mun'] });
  add({ id: 'mun', name: 'Munich', type: 'land', supplyCenter: true, homeCenters: ['Germany'], adjacents: ['kie','ruh','bur','sil','boh','tyr','ber'] });

  // Austria
  add({ id: 'boh', name: 'Bohemia', type: 'land', adjacents: ['mun','tyr','vie','gal','sil'] });
  add({ id: 'vie', name: 'Vienna', type: 'land', supplyCenter: true, homeCenters: ['Austria'], adjacents: ['tyr','boh','gal','bud','tri'] });
  add({ id: 'bud', name: 'Budapest', type: 'land', supplyCenter: true, homeCenters: ['Austria'], adjacents: ['vie','gal','rum','ser','tri'] });
  add({ id: 'tri', name: 'Trieste', type: 'coastal', supplyCenter: true, homeCenters: ['Austria'], adjacents: ['tyr','vie','bud','ser','alb','adr','ven'] });

  // Balkans and Turkey
  add({ id: 'alb', name: 'Albania', type: 'coastal', adjacents: ['tri','ser','gre','ion','adr'] });
  add({ id: 'gre', name: 'Greece', type: 'coastal', supplyCenter: true, adjacents: ['alb','ser','bul-sc','aeg','ion'] });
  add({ id: 'ser', name: 'Serbia', type: 'land', supplyCenter: true, adjacents: ['bud','rum','bul-ec','bul-sc','gre','alb','tri'] });
  add({ id: 'bul-ec', name: 'Bulgaria (ec)', type: 'coastal', supplyCenter: true, adjacents: ['rum','con','bla','ser'] });
  add({ id: 'bul-sc', name: 'Bulgaria (sc)', type: 'coastal', supplyCenter: true, adjacents: ['gre','con','aeg','ser'] });
  add({ id: 'con', name: 'Constantinople', type: 'coastal', supplyCenter: true, homeCenters: ['Turkey'], adjacents: ['bul-ec','bul-sc','ank','smy','aeg','bla'] });
  add({ id: 'ank', name: 'Ankara', type: 'coastal', supplyCenter: true, homeCenters: ['Turkey'], adjacents: ['con','smy','arm','bla'] });
  add({ id: 'smy', name: 'Smyrna', type: 'coastal', supplyCenter: true, homeCenters: ['Turkey'], adjacents: ['ank','con','aeg','eas','syr','arm'] });
  add({ id: 'arm', name: 'Armenia', type: 'coastal', adjacents: ['sev','ank','smy','bla','syr'] });
  add({ id: 'syr', name: 'Syria', type: 'coastal', adjacents: ['smy','eas'] });

  // Russia and East
  add({ id: 'sev', name: 'Sevastopol', type: 'coastal', supplyCenter: true, homeCenters: ['Russia'], adjacents: ['ukr','mos','arm','bla','rum'] });
  add({ id: 'mos', name: 'Moscow', type: 'land', supplyCenter: true, homeCenters: ['Russia'], adjacents: ['sev','ukr','war','lvn'] });
  add({ id: 'war', name: 'Warsaw', type: 'land', supplyCenter: true, homeCenters: ['Russia'], adjacents: ['lvn','pru','sil','gal','ukr'] });
  add({ id: 'stp-nc', name: 'St. Petersburg (nc)', type: 'coastal', supplyCenter: true, homeCenters: ['Russia'], adjacents: ['bar','nwy'] });
  add({ id: 'stp-sc', name: 'St. Petersburg (sc)', type: 'coastal', supplyCenter: true, homeCenters: ['Russia'], adjacents: ['bot','lvn','fin'] });
  add({ id: 'ukr', name: 'Ukraine', type: 'land', adjacents: ['war','mos','sev','rum','gal'] });
  add({ id: 'lvn', name: 'Livonia', type: 'coastal', adjacents: ['stp-sc','bot','bal','pru','war','mos'] });
  add({ id: 'pru', name: 'Prussia', type: 'coastal', adjacents: ['bal','lvn','war','sil','ber'] });
  add({ id: 'sil', name: 'Silesia', type: 'land', adjacents: ['ber','mun','boh','gal','war','pru'] });
  add({ id: 'gal', name: 'Galicia', type: 'land', adjacents: ['boh','sil','war','ukr','rum','bud','vie'] });
  add({ id: 'rum', name: 'Rumania', type: 'coastal', supplyCenter: true, adjacents: ['sev','ukr','gal','bud','ser','bul-ec','bla'] });
  add({ id: 'fin', name: 'Finland', type: 'coastal', adjacents: ['nwy','swe','bot','stp-sc'] });
  add({ id: 'swe', name: 'Sweden', type: 'coastal', supplyCenter: true, adjacents: ['ska','nth','nwy','bot','fin','bal','den'] });
  add({ id: 'nwy', name: 'Norway', type: 'coastal', supplyCenter: true, adjacents: ['bar','nwg','nth','ska','swe','fin','stp-nc'] });

  // Italy/Africa south-west corner
  add({ id: 'tun', name: 'Tunis', type: 'coastal', supplyCenter: true, adjacents: ['wes','tyo','ion'] });
  add({ id: 'naf', name: 'North Africa', type: 'coastal', adjacents: ['mao','wes'] });

  // Remaining Western Europe
  // Clean list continues

  return m;
};
