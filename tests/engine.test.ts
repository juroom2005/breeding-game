// 핵심 규칙 자동 테스트: npx tsx --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { World, raceLabel, MORPHS, type Individual } from '../src/engine';
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
  assert.equal(raceLabel({ elf: 1 }), '엘프');
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
    for (const x of alb) { assert.equal(x.pheno.eyeLeft, '붉은색'); assert.equal(x.pheno.hairColor, '백색'); }
    for (const x of leu) { assert.notEqual(x.pheno.eyeLeft, '붉은색'); assert.equal(x.pheno.hairColor, '백색'); }

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
  const e = count('elf');
  assert.ok(h > 0.005 && h < 0.025, `인간 ${h}`);
  assert.ok(e < h, `엘프 ${e} < 인간 ${h}`);
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
