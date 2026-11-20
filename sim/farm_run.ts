import { report } from './farm';
const base = { days: 150, gest: 1, cooldown: 1, attempts: 2, fert: 0.85, marketEvery: 3 };
console.log('농장 최고 개체 종합 점수(5스탯 환산, 100점 만점) 평균. 인간만, 임신 1일, 출산 후 1일 쉼, 하루 2회 시도');
report({ ...base, label: '현재 유전 | 농장6 임신실2', farm: 6, preg: 2 });
report({ ...base, label: '현재 유전 | 농장12 임신실4', farm: 12, preg: 4 });
report({ ...base, label: '편차↑(2.2) | 농장6 임신실2', farm: 6, preg: 2, alleleSd: 2.2 });
report({ ...base, label: '편차↑(2.2) | 농장12 임신실4', farm: 12, preg: 4, alleleSd: 2.2 });
report({ ...base, label: '편차↑+도약2% | 농장6 임신실2', farm: 6, preg: 2, alleleSd: 2.2, jump: 0.02 });
report({ ...base, label: '편차↑+도약2% | 농장12 임신실4', farm: 12, preg: 4, alleleSd: 2.2, jump: 0.02 });
