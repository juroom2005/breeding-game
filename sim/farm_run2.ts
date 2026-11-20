import { report } from './farm';
const base = { days: 150, gest: 1, cooldown: 1, attempts: 2, fert: 0.85, marketEvery: 3, alleleSd: 2.2, jump: 0.02 };
report({ ...base, label: '편차↑+도약 | 농장4 임신실2', farm: 4, preg: 2 });
report({ ...base, label: '편차↑+도약 | 농장6 임신실1', farm: 6, preg: 1 });
report({ ...base, label: '편차↑+도약 | 마켓 안 씀, 농장6 임신실2', farm: 6, preg: 2, marketEvery: 0 });
