import { RACES } from '../src/engine';
import { report } from './farm';
const base = { days: 150, gest: 1, cooldown: 1, attempts: 2, fert: 0.85, marketEvery: 3, alleleSd: 2.2, jump: 0.02, farm: 10, preg: 2 };
(RACES.human as any).babyDays = 3; report({ ...base, label: '아기 3일 | 농장10 임신실2' });
(RACES.human as any).babyDays = 2; report({ ...base, label: '아기 2일 | 농장10 임신실2' });
