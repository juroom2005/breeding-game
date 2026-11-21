// 핵심 규칙 자동 테스트: npx tsx --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { World, raceLabel, MORPHS, PIGMENT, RACES, SKIN_COLORS, CONFIG, type Individual } from '../src/engine';
import { HAS, NOT, TRAITS, traitLocus } from '../src/engine/data/traits';

const adultWorld = (seed = 1) => {
  const w = new World(seed);
  return w;
};
const grow = (w: World) => { w.day += 10; };

test('같은 시드면 같은 결과', () => {
  const run = () => {
    const w = new World(42);
    const m = w.buyFromMarket('elf', 'F');
    const f = w.buyFromMarket('human', 'M');
    const kids = [0, 1, 2, 3, 4].map(() => w.breedInstant(m.id, f.id));
    return JSON.stringify(kids.map((k) => [k.name, k.pheno.eyeColor, k.pheno.stats]));
  };
  assert.equal(run(), run());
});

test('근친 계수: 남매 0.25, 이복남매 0.125, 부모-자식 0.25, 무관 0', () => {
  const w = adultWorld();
  const m = w.buyFromMarket('human', 'F');
  const f = w.buyFromMarket('human', 'M');
  const f2 = w.buyFromMarket('human', 'M');
  grow(w);
  const sis = w.breedInstant(m.id, f.id, 'F');
  const bro = w.breedInstant(m.id, f.id, 'M');
  const halfBro = w.breedInstant(m.id, f2.id, 'M');
  grow(w);
  assert.equal(w.breedInstant(sis.id, bro.id).coi, 0.25);
  assert.equal(w.breedInstant(sis.id, halfBro.id).coi, 0.125);
  assert.equal(w.breedInstant(sis.id, f.id).coi, 0.25);
  assert.equal(w.breedInstant(m.id, f2.id).coi, 0);
});

test('열성 유전: 캐리어끼리 교배하면 약 25% 발현', () => {
  const w = adultWorld(3);
  const sturdy = TRAITS.find((t) => t.id === 'sturdy')!;
  const key = traitLocus(sturdy, 0);
  const m = w.buyFromMarket('human', 'F');
  const f = w.buyFromMarket('human', 'M');
  for (const p of [m, f]) {
    p.genome[key][0].v = HAS;
    p.genome[key][1].v = NOT;
  }
  let n = 0;
  const N = 2000;
  for (let i = 0; i < N; i++) if (w.breedInstant(m.id, f.id).pheno.traits.some((t) => t.id === 'sturdy')) n++;
  assert.ok(Math.abs(n / N - 0.25) < 0.04, `발현 비율 ${n / N}`);
});

test('종족 분류: 하프, 쿼터, 그 뒤는 다수 종족', () => {
  assert.equal(raceLabel({ elf: 1 }), '순혈 엘프');
  assert.equal(raceLabel({ elf: 0.875, human: 0.125 }), '엘프');
  assert.equal(raceLabel({ elf: 0.5, human: 0.5 }), '하프엘프');
  assert.equal(raceLabel({ elf: 0.25, human: 0.75 }), '쿼터엘프');
  assert.equal(raceLabel({ elf: 0.125, human: 0.875 }), '인간');
  assert.equal(raceLabel({ elf: 0.75, human: 0.25 }), '엘프');
  assert.equal(raceLabel({ elf: 0.125, human: 0.375, mermaid: 0.5 }), '인어');
  assert.equal(raceLabel({ elf: 0.5, mermaid: 0.5 }, 'mermaid'), '하프인어');

  const w = adultWorld(4);
  const elf = w.buyFromMarket('elf', 'F');
  const hum = w.buyFromMarket('human', 'M');
  grow(w);
  const half = w.breedInstant(elf.id, hum.id, 'F');
  assert.equal(half.raceLabel, '하프엘프');
  grow(w);
  const quarter = w.breedInstant(half.id, w.buyFromMarket('human', 'M').id, 'F');
  assert.equal(quarter.raceLabel, '쿼터엘프');
});

test('연관 유전: 혼혈끼리의 자식은 종족 파츠가 대부분 한 덩어리로 다닌다', () => {
  const w = adultWorld(5);
  const kids: Individual[] = [];
  for (let i = 0; i < 60; i++) {
    const m = w.buyFromMarket('mermaid', 'F');
    const f = w.buyFromMarket('elf', 'M');
    grow(w);
    const a = w.breedInstant(m.id, f.id, 'F');
    const b = w.breedInstant(m.id, f.id, 'M');
    grow(w);
    for (let j = 0; j < 10; j++) kids.push(w.breedInstant(a.id, b.id));
  }
  // 지느러미 귀를 가진 개체 중 비늘도 있는 비율 (연관 없으면 약 25%)
  const fin = kids.filter((k) => k.pheno.slots.ear === '지느러미 귀');
  const both = fin.filter((k) => k.pheno.slots.skinPattern === '비늘').length / fin.length;
  assert.ok(both > 0.75, `지느러미 귀 + 비늘 ${both}`);
});

test('이형: 알비노/루시스틱, 오드아이, 황혼 쵸즌', () => {
  const saved = JSON.parse(JSON.stringify(MORPHS));
  const force = (ids: (keyof typeof MORPHS)[]) => {
    for (const id of Object.keys(MORPHS) as (keyof typeof MORPHS)[]) {
      Object.assign(MORPHS[id], ids.includes(id) ? { center: 0, slope: 1, pmax: 1 } : { center: 999, slope: 1, pmax: 0 });
    }
  };
  try {
    const w = adultWorld(6);
    force(['pigment']);
    const pale = Array.from({ length: 40 }, (_, i) => w.buyFromMarket('human', i % 2 ? 'F' : 'M'));
    const alb = pale.filter((x) => x.pheno.albino);
    const leu = pale.filter((x) => x.pheno.leucistic);
    assert.ok(alb.length > 5 && leu.length > 5, '알비노와 루시스틱이 둘 다 나와야 함');
    for (const x of alb) { assert.equal(x.pheno.eyeLeft, PIGMENT.albino.eye); assert.equal(x.pheno.hairColor, PIGMENT.albino.hair); }
    for (const x of leu) { assert.notEqual(x.pheno.eyeLeft, PIGMENT.albino.eye); assert.equal(x.pheno.hairColor, PIGMENT.leucistic.hair); }

    force(['oddEye']);
    for (let i = 0; i < 20; i++) {
      const x = w.buyFromMarket('elf', 'F');
      assert.ok(x.pheno.oddEye);
      assert.notEqual(x.pheno.eyeLeft, x.pheno.eyeRight);
    }

    force(['angel', 'devil']);
    for (let i = 0; i < 30; i++) {
      const x = w.buyFromMarket('mermaid', 'M');
      assert.deepEqual(x.pheno.morphs, ['황혼 쵸즌']);
      const ep = x.pheno.extraParts;
      assert.ok(ep.wings);
      if (ep.wings!.type === '깃털 날개') { assert.ok(ep.horns); assert.equal(ep.halo, null); }
      else { assert.ok(ep.halo); assert.equal(ep.horns, null); }
    }
  } finally {
    for (const id of Object.keys(saved)) Object.assign(MORPHS[id as keyof typeof MORPHS], saved[id]);
  }
});

test('문신: 혈통 위치 고정, 순도에 비례한 진하기, 연계면 연계 문신', () => {
  const w = adultWorld(12);
  const mag = w.buyFromMarket('human', 'F', ['magic']);
  assert.equal(mag.pheno.tattoos.length, 1);
  assert.deepEqual(mag.pheno.tattoos[0].areas, ['얼굴', '팔']);
  assert.ok(mag.pheno.tattoos[0].opacity >= 0.3 && mag.pheno.tattoos[0].opacity <= 1);
  const both = w.buyFromMarket('human', 'M', ['magic', 'fire']);
  assert.equal(both.pheno.tattoos.length, 1);
  assert.equal(both.pheno.tattoos[0].source, '불 마법사');
});

test('임신: 하루 한 번 시도, 종족별 임신 기간 뒤 출산', () => {
  const w = adultWorld(7);
  const m = w.buyFromMarket('elf', 'F');
  const f = w.buyFromMarket('elf', 'M');
  let tries = 0;
  let res = w.tryMate(m.id, f.id);
  tries++;
  if (!res.ok) {
    assert.equal(w.tryMate(m.id, f.id).chance, 0, '같은 날 두 번째 시도는 막혀야 함');
  }
  while (!res.ok && tries < 50) {
    w.advanceDay();
    res = w.tryMate(m.id, f.id);
    tries++;
  }
  assert.ok(res.ok);
  assert.equal(res.dueDay! - w.day, 3, '엘프 임신 기간 3일');
  assert.ok(w.tryMate(m.id, f.id).message.includes('임신 중'));
  w.advanceDay();
  w.advanceDay();
  const births = w.advanceDay();
  assert.equal(births.length, 1);
  assert.ok(births[0].children.length >= 1);
  assert.equal(m.pregnancy, null);
});

test('쌍둥이 비율: 인간 약 1.2%, 엘프는 더 낮음', () => {
  const count = (race: 'human' | 'elf') => {
    const w = adultWorld(8);
    let twins = 0, births = 0;
    for (let i = 0; i < 4000; i++) {
      const m = w.buyFromMarket(race, 'F');
      const f = w.buyFromMarket(race, 'M');
      for (let d = 0; d < 20 && !m.pregnancy; d++) { w.tryMate(m.id, f.id); if (!m.pregnancy) w.advanceDay(); }
      if (!m.pregnancy) continue;
      births++;
      if (m.pregnancy.embryos.length > 1) twins++;
      w.sell(f.id);
    }
    return twins / births;
  };
  const h = count('human');
  assert.ok(h > 0.005 && h < 0.025, `인간 ${h}`);
  // 엘프(0.7%)와 인간(1.2%)의 차이는 시드 하나 4000회로는 우연에 묻힐 수 있어 확률값을 직접 비교한다
  const w = adultWorld(8);
  const plain = (race: 'human' | 'elf') => {
    for (;;) {
      const x = w.buyFromMarket(race, 'F');
      if (x.pheno.traits.length === 0) return x;
    }
  };
  assert.ok(w.twinChance(plain('elf')) < w.twinChance(plain('human')));
});

test('판매해도 족보와 근친 계산은 유지되고, 저장/불러오기가 같다', () => {
  const w = adultWorld(9);
  const m = w.buyFromMarket('human', 'F');
  const f = w.buyFromMarket('elf', 'M');
  grow(w);
  const sis = w.breedInstant(m.id, f.id, 'F');
  const bro = w.breedInstant(m.id, f.id, 'M');
  assert.equal(w.sell(m.id), null);
  assert.equal(w.sell(f.id), null);
  assert.equal(m.status, 'sold');
  assert.deepEqual(m.genome, {});
  grow(w);
  const kid = w.breedInstant(sis.id, bro.id);
  assert.equal(kid.coi, 0.25);
  assert.throws(() => w.breedInstant(m.id, bro.id));

  const saved = JSON.stringify(w.serialize());
  const w2 = World.load(JSON.parse(saved));
  const k2 = w2.get(kid.id)!;
  assert.equal(k2.pheno.eyeColor, kid.pheno.eyeColor);
  assert.equal(k2.genome.eyeColor[0].v, kid.genome.eyeColor[0].v);
  assert.equal(w2.get(m.id)!.status, 'sold');
  // 다음 랜덤도 같아야 함
  assert.equal(w2.rng.next(), w.rng.next());
});

test('유전자 키트: 쓰기 전에는 안 보이고, 쓰면 문턱 근처 소인이 보인다', () => {
  const w = adultWorld(13);
  let found: Individual | undefined;
  for (let i = 0; i < 2000 && !found; i++) {
    const x = w.buyFromMarket('elf', 'F');
    assert.deepEqual(w.geneKitReport(x), []);
    w.useGeneKit(x.id);
    if (w.geneKitReport(x).length) found = x;
  }
  assert.ok(found, '소인이 있는 개체를 찾아야 함');
  for (const r of w.geneKitReport(found!)) assert.ok(r.chance > 0);
});

test('초대는 항상 혈통이 발현된다', () => {
  const w = adultWorld(10);
  for (let i = 0; i < 300; i++) {
    const x = w.buyFromMarket('human', i % 2 ? 'F' : 'M', ['magic']);
    assert.ok(x.pheno.bloodlines.magic.expressed);
    assert.ok(x.pheno.bloodlines.magic.pattern);
  }
});

test('아기 단계: 인간 2일, 엘프 3일, 하프는 섞어서 반올림', () => {
  const w = new World(7);
  const hf = w.buyFromMarket('human', 'F'), hm = w.buyFromMarket('human', 'M');
  const ef = w.buyFromMarket('elf', 'F'), em = w.buyFromMarket('elf', 'M');
  const human = w.breedInstant(hf.id, hm.id);
  const elf = w.breedInstant(ef.id, em.id);
  const half = w.breedInstant(hf.id, em.id);
  assert.equal(w.babyDays(human), 2);
  assert.equal(w.babyDays(elf), 3);
  assert.equal(w.babyDays(half), 3);
  w.day += 2;
  assert.ok(w.isAdult(human));
  assert.ok(!w.isAdult(elf));
  assert.equal(w.daysUntilAdult(elf), 1);
});

test('마켓 매물: 사기 전엔 농장 밖, 사면 농장, 안 사면 지워짐', () => {
  const w = new World(11);
  const a = w.createMarketOffer('human', 'F');
  const b = w.createMarketOffer('elf', 'M');
  assert.equal(a.status, 'market');
  assert.equal(w.active().length, 0);
  w.acceptOffer(a.id);
  assert.equal(w.active().length, 1);
  w.discardOffers();
  assert.equal(w.get(b.id), undefined);
  assert.ok(w.get(a.id));
});

test('마켓 매물 옵션: 능력치 이동, 이형 강제, 초대 끄기', () => {
  const w = new World(12);
  const avg = (shift: number) => {
    let s = 0;
    for (let i = 0; i < 300; i++) s += w.createMarketOffer('human', 'F', { statShift: shift }).pheno.stats.charm;
    w.discardOffers();
    return s / 300;
  };
  assert.ok(avg(-15) < avg(0) - 10);
  for (const m of ['pigment', 'oddEye', 'angel', 'devil'] as const) {
    assert.ok(w.createMarketOffer('human', 'M', { morph: m }).pheno.morphs.length > 0, m);
  }
  for (let i = 0; i < 2000; i++) {
    assert.equal(w.createMarketOffer('human', 'F', { naturalFounders: false }).foundedBloodlines.length, 0);
  }
});

test('피부색: 부모 색 중 하나, 낮은 확률로 혈통 풀에서 새 색', () => {
  const w = adultWorld(31);
  let same = 0, fresh = 0, total = 0;
  const elfPool = new Set(Object.keys(RACES.elf.skinColor));
  const humanPool = new Set(Object.keys(RACES.human.skinColor));
  for (let i = 0; i < 300; i++) {
    const m = w.buyFromMarket('elf', 'F');
    const f = w.buyFromMarket('human', 'M');
    for (let k = 0; k < 10; k++) {
      const kid = w.breedInstant(m.id, f.id);
      const c = kid.pheno.skinColor;
      total++;
      assert.ok(SKIN_COLORS[c], c);
      // 하프엘프의 새 색은 엘프 또는 인간 풀에서만
      assert.ok(elfPool.has(c) || humanPool.has(c), c);
      // 두 대립유전자는 늘 같은 색 (보이는 색만 전해짐)
      assert.equal(kid.genome.skinColor[0].v, kid.genome.skinColor[1].v);
      if (c === m.pheno.skinColor || c === f.pheno.skinColor) same++;
      if (kid.genome.skinColor[0].origin === kid.id) fresh++;
    }
    w.sell(m.id);
    w.sell(f.id);
  }
  const p = fresh / total;
  assert.ok(Math.abs(p - CONFIG.skinNewColorChance) < 0.02, `새 색 비율 ${p}`);
  assert.ok(same / total > 0.94, `부모 색 비율 ${same / total}`);
});

test('예전 저장(형식 2): 피부 단계와 한국어 색 이름을 새 ID로 옮김', () => {
  const w = adultWorld(32);
  const m = w.buyFromMarket('human', 'F');
  const f = w.buyFromMarket('human', 'M');
  w.breedInstant(m.id, f.id);
  const data = JSON.parse(JSON.stringify(w.serialize()));
  data.version = 2;
  for (const raw of data.individuals) {
    const g = raw.genome;
    // 예전 형식 흉내: skinColor → skin.0~2 (합 4 = 구릿빛), 눈/머리색 한국어
    const race = g.skinColor[0][2];
    delete g.skinColor;
    for (let i = 0; i < 3; i++) g[`skin.${i}`] = [[i < 2 ? 1 : 0, raw.id, race, ''], [i < 2 ? 1 : 0, raw.id, race, '']];
    g.eyeColor = [['갈색', raw.id, race, ''], ['파랑', raw.id, race, '']];
    g.hairColor = [['검정', raw.id, race, ''], ['금발', raw.id, race, '']];
    raw.pheno.eyeLeft = raw.pheno.eyeRight = raw.pheno.eyeColor = '갈색';
    raw.pheno.hairColor = '검정';
    raw.pheno.skinTone = 4;
    raw.pheno.skinToneName = '구릿빛';
    delete raw.pheno.skinColor;
  }
  const w2 = World.load(data);
  for (const x of w2.all()) {
    assert.equal(x.pheno.skinColor, 'Bronze');
    assert.deepEqual(x.genome.skinColor.map((a) => a.v), ['Bronze', 'Bronze']);
    assert.equal(x.genome['skin.0'], undefined);
    assert.deepEqual(x.genome.eyeColor.map((a) => a.v), ['Chestnut', 'Sapphire']);
    assert.equal(x.pheno.eyeColor, 'Chestnut');
    assert.equal(x.pheno.hairColor, 'Raven');
    assert.equal((x.pheno as unknown as { skinTone?: number }).skinTone, undefined);
  }
  // 옮긴 뒤에도 교배가 된다
  const [m2, f2] = [w2.get(m.id)!, w2.get(f.id)!];
  const saved = CONFIG.skinNewColorChance;
  CONFIG.skinNewColorChance = 0;
  try {
    assert.equal(w2.breedInstant(m2.id, f2.id).pheno.skinColor, 'Bronze');
  } finally {
    CONFIG.skinNewColorChance = saved;
  }
  assert.equal(w2.serialize().version, 3);
});
