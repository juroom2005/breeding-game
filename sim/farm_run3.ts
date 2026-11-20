import { report } from './farm';
const base = { days: 150, gest: 1, cooldown: 1, attempts: 2, fert: 0.85, marketEvery: 3, alleleSd: 2.2, jump: 0.02, farm: 10 };
for (const preg of [1, 2, 3, 4]) report({ ...base, label: `편차↑+도약 | 농장10 임신실${preg}`, preg });
