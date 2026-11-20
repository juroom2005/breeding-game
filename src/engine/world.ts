// 개체 저장소 + 마켓 구매 + 교배(임신) + 족보 계산 + 저장

import { Rng } from './rng';
import type { BloodlineId, Embryo, Individual, InheritNote, RaceId, Sex } from './types';
import { CONFIG } from './data/config';
import { RACES } from './data/races';
import { BLOODLINE_IDS, BLOODLINES } from './data/bloodlines';
import { TRAITS } from './data/traits';
import { applyInbreeding, awakenFounder, breedGenome, createMarketGenome, DISCRETE_LOCI, geneticRace, morphChance, type MarketGenomeOptions } from './genome';
import { CHOSEN_HYBRID_NAME, MORPHS, MORPH_IDS, PIGMENT, type MorphId } from './data/morphs';
import { computePhenotype } from './phenotype';
import { blendByRace, mainRaceOf, raceLabel } from './classify';
import { decodeGenome, encodeGenome, type EncodedGenome } from './save';

export interface SaveData {
  version: 2;
  seed: number;
  rngState: number;
  day: number;
  counter: number;
  individuals: (Omit<Individual, 'genome' | 'pregnancy'> & {
    genome: EncodedGenome;
    pregnancy: (Omit<NonNullable<Individual['pregnancy']>, 'embryos'> & { embryos: (Omit<Embryo, 'genome'> & { genome: EncodedGenome })[] }) | null;
  })[];
}

export interface MateResult {
  ok: boolean;
  /** 수정 확률 (0~1). 조건이 안 맞아 시도 자체를 못 했으면 0 */
  chance: number;
  message: string;
  dueDay?: number;
}

export interface BirthEvent {
  mother: Individual;
  children: Individual[];
}

export class World {
  readonly individuals = new Map<string, Individual>();
  rng: Rng;
  seed: number;
  day = 0;
  private counter = 0;
  private kinCache = new Map<string, number>();

  constructor(seed = Date.now() % 2147483647) {
    this.seed = seed;
    this.rng = new Rng(seed);
  }

  get(id: string | null): Individual | undefined {
    return id ? this.individuals.get(id) : undefined;
  }

  all(): Individual[] {
    return [...this.individuals.values()].sort((a, b) => a.birthOrder - b.birthOrder);
  }

  /** 농장에 있는 개체만 */
  active(): Individual[] {
    return this.all().filter((x) => x.status === 'active');
  }

  private newId(): string {
    this.counter++;
    return `i${this.counter}`;
  }

  private makeName(race: RaceId, sex: Sex): string {
    return this.rng.pick(RACES[race].names[sex]);
  }

  /** 개체의 주 종족 (동률이면 모계를 따라 거슬러 올라가며 결정) */
  mainRace(ind: Individual): RaceId {
    return mainRaceOf(ind.pedigreeRace, this.motherMain(ind));
  }

  private motherMain(ind: Individual): RaceId | undefined {
    const mom = this.get(ind.motherId);
    return mom ? this.mainRace(mom) : undefined;
  }

  // ─── 생애 단계 ───
  isAdult(ind: Individual): boolean {
    return ind.source === 'market' || this.day - ind.bornDay >= this.babyDays(ind);
  }

  daysUntilAdult(ind: Individual): number {
    return ind.source === 'market' ? 0 : Math.max(0, this.babyDays(ind) - (this.day - ind.bornDay));
  }

  babyDays(ind: Individual): number {
    return Math.max(1, Math.round(blendByRace(ind.pedigreeRace, (r) => RACES[r].babyDays)));
  }

  /** 아기 얼굴: 계보상 혈통 %가 가장 높은 종족, 동률이면 모계 */
  babyFace(ind: Individual): string {
    return RACES[mainRaceOf(ind.pedigreeRace, this.motherMain(ind))].babyFace;
  }

  // ─── 마켓 ───
  buyFromMarket(race: RaceId, sex: Sex, forceFounder: BloodlineId[] = []): Individual {
    const ind = this.createMarketOffer(race, sex, { forceFounder });
    ind.status = 'active';
    return ind;
  }

  /**
   * 마켓 매물: 농장에 들이기 전까지 status 'market'. 사면 acceptOffer, 안 사면 discardOffers로 지운다.
   * morph를 주면 그 이형이 겉으로 드러날 때까지 겉모습을 다시 계산한다
   */
  createMarketOffer(race: RaceId, sex: Sex, opts: MarketGenomeOptions = {}): Individual {
    const id = this.newId();
    const { genome, founded } = createMarketGenome(race, id, this.rng, opts);
    let pheno = this.phenoWithFounders(genome, sex, 0, founded, id, race);
    for (let i = 0; opts.morph && i < 200 && !morphShown(pheno.morphs, opts.morph); i++) {
      pheno = this.phenoWithFounders(genome, sex, 0, founded, id, race);
    }
    const houses: Individual['houses'] = {};
    for (const b of founded) houses[b] = { [id]: 1 };
    const ind: Individual = {
      id,
      name: this.makeName(race, sex),
      sex,
      generation: 1,
      motherId: null,
      fatherId: null,
      birthOrder: this.counter,
      bornDay: this.day,
      source: 'market',
      status: 'market',
      pedigreeRace: { [race]: 1 },
      raceLabel: RACES[race].name,
      coi: 0,
      genome,
      pheno,
      notes: [
        ...founded.map((b) => ({ locus: b, label: `${BLOODLINES[b].name} 혈통 초대 (마켓)`, kind: 'founder' as const })),
        ...pheno.morphs.map((m) => ({ locus: 'morph', label: `이형: ${m}`, kind: 'morph' as const })),
      ],
      foundedBloodlines: founded,
      houses,
      pregnancy: null,
      lastMateDay: null,
      litterSize: 1,
      geneKit: false,
    };
    this.markShown(ind);
    this.individuals.set(id, ind);
    return ind;
  }

  acceptOffer(id: string): Individual | null {
    const ind = this.individuals.get(id);
    if (!ind || ind.status !== 'market') return null;
    ind.status = 'active';
    ind.bornDay = this.day;
    return ind;
  }

  /** 팔리지 않은 매물은 기록에 남길 필요가 없어서 지운다 */
  discardOffers(ids?: string[]) {
    for (const [id, ind] of this.individuals) {
      if (ind.status === 'market' && (!ids || ids.includes(id))) this.individuals.delete(id);
    }
  }

  // ─── 교배 (임신) ───

  /** 교배 시도가 가능한지. 불가능하면 이유 */
  canMate(mother: Individual, father: Individual): string | null {
    if (mother.sex !== 'F') return '엄마 쪽이 여성이 아님';
    if (father.sex !== 'M') return '아빠 쪽이 남성이 아님';
    for (const x of [mother, father]) {
      if (x.status !== 'active') return `${x.name}은(는) 농장에 없음`;
      if (!this.isAdult(x)) return `${x.name}은(는) 아직 아기 단계`;
    }
    if (mother.pregnancy) return `${mother.name}은(는) 임신 중 (${mother.pregnancy.dueDay - this.day}일 뒤 출산)`;
    if (mother.lastMateDay === this.day) return `${mother.name}은(는) 오늘 이미 교배를 시도함. 내일 다시 시도 가능`;
    return null;
  }

  /** 수정 확률: 부모 종족 수정률 평균 × 아빠 활력 보정 */
  conceptionChance(mother: Individual, father: Individual): number {
    const fert = (blendByRace(mother.pedigreeRace, (r) => RACES[r].fertility) + blendByRace(father.pedigreeRace, (r) => RACES[r].fertility)) / 2;
    const vit = CONFIG.fertilityVitalityBase + father.pheno.stats.vitality / 100;
    return Math.max(CONFIG.fertilityMin, Math.min(CONFIG.fertilityMax, fert * vit));
  }

  /** 임신 기간: 엄마의 계보상 혈통 비율로 종족 기간을 섞어서 반올림 */
  gestationDays(mother: Individual): number {
    return Math.max(1, Math.round(blendByRace(mother.pedigreeRace, (r) => RACES[r].gestationDays)));
  }

  /** 쌍둥이 확률 (세쌍둥이는 이 값의 제곱) */
  twinChance(mother: Individual): number {
    let p = blendByRace(mother.pedigreeRace, (r) => RACES[r].twinRate);
    for (const t of mother.pheno.traits) {
      const def = TRAITS.find((d) => d.id === t.id);
      if (def?.twinMultiplier) p *= def.twinMultiplier;
    }
    return Math.min(p, 0.5);
  }

  /** 교배 시도. 성공하면 임신, 실패해도 그날은 끝 (다음 날 다시 시도 가능) */
  tryMate(motherId: string, fatherId: string): MateResult {
    const mother = this.get(motherId);
    const father = this.get(fatherId);
    if (!mother || !father) return { ok: false, chance: 0, message: '개체를 찾을 수 없음' };
    const err = this.canMate(mother, father);
    if (err) return { ok: false, chance: 0, message: err };

    const chance = this.conceptionChance(mother, father);
    mother.lastMateDay = this.day;
    if (!this.rng.chance(chance)) {
      return { ok: false, chance, message: `수정 실패 (확률 ${Math.round(chance * 100)}%). 내일 다시 시도할 수 있어요.` };
    }
    const twin = this.twinChance(mother);
    const r = this.rng.next();
    const litter = r < twin * twin ? 3 : r < twin * twin + twin ? 2 : 1;
    const embryos = Array.from({ length: litter }, () => this.conceive(mother, father));
    const dueDay = this.day + this.gestationDays(mother);
    mother.pregnancy = { fatherId, conceivedDay: this.day, dueDay, embryos };
    return { ok: true, chance, dueDay, message: `임신 성공 (확률 ${Math.round(chance * 100)}%). ${dueDay - this.day}일 뒤 출산 예정.` };
  }

  /** 하루 넘기기: 출산 예정일이 된 엄마들이 출산 */
  advanceDay(): BirthEvent[] {
    this.day++;
    const events: BirthEvent[] = [];
    for (const m of this.active()) {
      if (m.pregnancy && m.pregnancy.dueDay <= this.day) events.push({ mother: m, children: this.deliver(m) });
    }
    return events;
  }

  /** 테스트/시뮬레이션용: 임신 과정 없이 바로 1마리 출산 (수정 확률, 하루 제한 무시) */
  breedInstant(motherId: string, fatherId: string, sex?: Sex): Individual {
    const mother = this.get(motherId);
    const father = this.get(fatherId);
    if (!mother || !father) throw new Error('개체를 찾을 수 없음');
    if (mother.sex !== 'F' || father.sex !== 'M') throw new Error('엄마는 여성, 아빠는 남성이어야 함');
    if (!this.isAdult(mother) || !this.isAdult(father)) throw new Error('아기 단계 개체는 교배 불가');
    if (mother.status !== 'active' || father.status !== 'active') throw new Error('농장에 없는 개체');
    return this.birth(mother, father, this.conceive(mother, father), 1, sex);
  }

  /** 수정: 이 시점에 유전자가 정해진다 */
  private conceive(mother: Individual, father: Individual): Embryo {
    const id = this.newId();
    const genome = breedGenome(mother.genome, father.genome, id, this.rng);
    const coi = this.kinship(mother, father);
    const inbred = applyInbreeding(genome, coi, id, this.rng);
    return { id, birthOrder: this.counter, genome, coi, inbred };
  }

  private deliver(mother: Individual): Individual[] {
    const preg = mother.pregnancy!;
    const father = this.get(preg.fatherId)!;
    const kids = preg.embryos.map((e) => this.birth(mother, father, e, preg.embryos.length));
    mother.pregnancy = null;
    return kids;
  }

  /** 출생: 겉모습 계산, 초대 각성, 가문, 유전 메모 */
  private birth(mother: Individual, father: Individual, e: Embryo, litterSize: number, sex?: Sex): Individual {
    const { id, genome, coi } = e;
    const childSex: Sex = sex ?? (this.rng.chance(0.5) ? 'F' : 'M');

    const pedigreeRace: Individual['pedigreeRace'] = {};
    for (const p of [mother, father]) {
      for (const [r, v] of Object.entries(p.pedigreeRace) as [RaceId, number][]) {
        pedigreeRace[r] = (pedigreeRace[r] ?? 0) + v / 2;
      }
    }
    const momMain = this.mainRace(mother);
    const mainRace = mainRaceOf(pedigreeRace, momMain);

    // 농장 각성: 부모 둘 다 해당 혈통이 아니면 아주 낮은 확률로 초대 탄생
    const founded: BloodlineId[] = [];
    for (const b of BLOODLINE_IDS) {
      const parentsHave = mother.pheno.bloodlines[b].expressed || father.pheno.bloodlines[b].expressed;
      if (!parentsHave && this.rng.chance(BLOODLINES[b].farmFounderChance)) {
        awakenFounder(genome, b, id, mainRace, this.rng);
        founded.push(b);
      }
    }

    const pheno = this.phenoWithFounders(genome, childSex, coi, founded, id, mainRace);

    // 가문 비율 = 부모 평균 (+ 본인이 초대면 본인 100%)
    const houses: Individual['houses'] = {};
    for (const b of BLOODLINE_IDS) {
      if (founded.includes(b)) {
        houses[b] = { [id]: 1 };
        continue;
      }
      const merged: Record<string, number> = {};
      for (const p of [mother, father]) {
        for (const [h, v] of Object.entries(p.houses[b] ?? {})) merged[h] = (merged[h] ?? 0) + v / 2;
      }
      if (Object.keys(merged).length) houses[b] = merged;
    }

    const child: Individual = {
      id,
      name: this.makeName(mainRace, childSex),
      sex: childSex,
      generation: Math.max(mother.generation, father.generation) + 1,
      motherId: mother.id,
      fatherId: father.id,
      birthOrder: e.birthOrder,
      bornDay: this.day,
      source: 'farm',
      status: 'active',
      pedigreeRace,
      raceLabel: raceLabel(pedigreeRace, momMain),
      coi,
      genome,
      pheno,
      notes: [],
      foundedBloodlines: founded,
      houses,
      pregnancy: null,
      lastMateDay: null,
      litterSize,
      geneKit: false,
    };
    this.individuals.set(id, child);
    child.notes = [
      ...(litterSize > 1 ? [{ locus: 'birth', label: litterSize === 2 ? '쌍둥이로 태어남' : '세쌍둥이로 태어남', kind: 'birth' as const }] : []),
      ...founded.map((b) => ({ locus: b, label: `${BLOODLINES[b].name} 혈통 초대 (농장 각성)`, kind: 'founder' as const })),
      ...pheno.morphs.map((m) => ({ locus: 'morph', label: `이형: ${m}`, kind: 'morph' as const })),
      ...e.inbred.map((x) => ({
        locus: 'trait',
        label: x.kind === 'express' ? `근친 부작용: 숨어 있던 ${x.name} 발현` : `근친 부작용: ${x.name} 유전자 새로 생김`,
        kind: 'inbreeding' as const,
      })),
      ...this.inheritNotes(child),
    ];
    this.markShown(child);
    return child;
  }

  /** 초대는 반드시 발현돼야 하므로, 환경 랜덤 때문에 문턱 아래로 떨어지면 유전자를 다시 뽑는다 */
  private phenoWithFounders(
    genome: Individual['genome'], sex: Sex, coi: number, founded: BloodlineId[], id: string, race: RaceId,
  ) {
    let pheno = computePhenotype(genome, sex, coi, this.rng);
    for (let tries = 0; tries < 50; tries++) {
      const missing = founded.filter((b) => !pheno.bloodlines[b].expressed);
      if (!missing.length) break;
      for (const b of missing) awakenFounder(genome, b, id, race, this.rng);
      pheno = computePhenotype(genome, sex, coi, this.rng);
    }
    return pheno;
  }

  /** 겉으로 보이는 값 (알비노면 눈/머리색 없음, 오드아이면 눈색 두 개) */
  private shownValues(ind: Individual, locusId: string): string[] {
    const p = ind.pheno;
    if (locusId === 'eyeColor') {
      if (p.albino) return [];
      // 오드아이 변이색(대립유전자에 없는 색)은 제외
      const alleles = ind.genome.eyeColor.map((a) => a.v);
      return [...new Set([p.eyeLeft, p.eyeRight])].filter((c) => alleles.includes(c));
    }
    if (locusId === 'hairColor') return p.albino || p.leucistic ? [] : [p.hairColor];
    return [p.slots[locusId]];
  }

  /** 발현된 색/파츠의 대립유전자에 "이 개체가 드러냈다" 표시 */
  private markShown(ind: Individual) {
    for (const locus of DISCRETE_LOCI) {
      const shown = this.shownValues(ind, locus.id);
      for (const a of ind.genome[locus.id]) if (shown.includes(a.v as string)) a.shownBy = ind.id;
    }
  }

  /** 색/파츠가 어디서 왔는지 (부모 유전은 기록하지 않음) */
  private inheritNotes(child: Individual): InheritNote[] {
    const notes: InheritNote[] = [];
    const rankOf: Record<InheritNote['kind'], number> = {
      parent: 0, grandparent: 1, great: 2, distant: 3, hidden: 4, mutation: 5, founder: 6, suppressed: 7, inbreeding: 8, birth: 9, morph: 10,
    };
    const race = geneticRace(child.genome);
    for (const locus of DISCRETE_LOCI) {
      if (!locus.showInheritance) continue;
      const pair = child.genome[locus.id];
      const shownList = this.shownValues(child, locus.id);
      // 혈통 % 조건 때문에 숨은 파츠
      for (const v of new Set(pair.map((a) => a.v as string))) {
        const c = locus.conditions?.[v];
        if (c && !shownList.includes(v) && (race[c.race] ?? 0) < c.min) {
          notes.push({
            locus: locus.id,
            label: `${locus.name}: ${v} 유전자 있음, ${RACES[c.race].name} 혈통 ${Math.round((race[c.race] ?? 0) * 100)}% (기준 ${Math.round(c.min * 100)}%)라 발현 안 됨`,
            kind: 'suppressed',
          });
        }
      }
      for (const shown of shownList) {
        const matching = pair.filter((a) => a.v === shown);
        if (!matching.length) {
          if (shown !== locus.fallback) notes.push({ locus: locus.id, label: `${locus.name}: ${shown} (중간형, 불완전 우성)`, kind: 'parent' });
          continue;
        }
        let best: InheritNote | null = null;
        for (const a of matching) {
          let note: InheritNote;
          if (a.origin === child.id) {
            note = { locus: locus.id, label: `${locus.name}: ${shown} (돌연변이)`, kind: 'mutation' };
          } else {
            const rel = this.relation(child, a.shownBy);
            if (rel.kind === 'parent') note = { locus: locus.id, label: '', kind: 'parent' };
            else if (rel.kind === 'hidden')
              note = { locus: locus.id, label: `${locus.name}: ${shown} (숨은 유전, 기록된 조상 중 이 ${locus.name}을 보인 개체 없음)`, kind: 'hidden' };
            else note = { locus: locus.id, label: `${locus.name}: ${shown} (${rel.title} ${rel.name}의 ${locus.name})`, kind: rel.kind };
          }
          if (!best || rankOf[note.kind] < rankOf[best.kind]) best = note;
        }
        if (best && best.kind !== 'parent') notes.push(best);
      }
    }
    return notes;
  }

  /** 자식 기준으로 ancestorId가 어떤 관계인지 */
  relation(
    child: Individual,
    ancestorId: string | null,
  ): { kind: 'parent' | 'grandparent' | 'great' | 'distant' | 'hidden'; title: string; name: string } {
    if (!ancestorId) return { kind: 'hidden', title: '', name: '' };
    type Step = { ind: Individual; path: ('M' | 'F')[] };
    let frontier: Step[] = [{ ind: child, path: [] }];
    for (let depth = 1; depth <= 12 && frontier.length; depth++) {
      const next: Step[] = [];
      for (const s of frontier) {
        const parents: [string | null, 'M' | 'F'][] = [[s.ind.motherId, 'M'], [s.ind.fatherId, 'F']];
        for (const [pid, side] of parents) {
          const p = this.get(pid);
          if (!p) continue;
          const path = [...s.path, side];
          if (p.id === ancestorId) {
            const sideWord = path[0] === 'M' ? '외' : '친';
            const g = p.sex === 'F' ? '모' : '부';
            if (depth === 1) return { kind: 'parent', title: p.sex === 'F' ? '엄마' : '아빠', name: p.name };
            if (depth === 2) return { kind: 'grandparent', title: `${sideWord}조${g}`, name: p.name };
            if (depth === 3) return { kind: 'great', title: `${sideWord}증조${g}`, name: p.name };
            return { kind: 'distant', title: `${depth}대 위 조상`, name: p.name };
          }
          next.push({ ind: p, path });
        }
      }
      frontier = next;
    }
    return { kind: 'hidden', title: '', name: '' };
  }

  // ─── 족보 계산 ───

  /** 친족 계수: 두 개체에서 같은 조상 유전자를 받았을 확률. 자식의 근친 계수 = 부모의 친족 계수 */
  kinship(a: Individual | undefined, b: Individual | undefined): number {
    if (!a || !b) return 0;
    if (a.id === b.id) return 0.5 * (1 + a.coi);
    if (a.birthOrder > b.birthOrder) [a, b] = [b, a];
    const key = `${a.id}|${b.id}`;
    const cached = this.kinCache.get(key);
    if (cached !== undefined) return cached;
    const v = 0.5 * (this.kinship(a, this.get(b.motherId)) + this.kinship(a, this.get(b.fatherId)));
    this.kinCache.set(key, v);
    return v;
  }

  children(id: string): Individual[] {
    return this.all().filter((x) => x.motherId === id || x.fatherId === id);
  }

  // ─── 유전자 키트: 문턱 근처의 숨은 이형 소인을 보여준다 ───

  /** 키트 사용 (게임에서는 아이템 소모). 한 번 쓰면 그 개체는 계속 보임 */
  useGeneKit(id: string): string | null {
    const ind = this.get(id);
    if (!ind) return '개체를 찾을 수 없음';
    if (ind.status !== 'active') return `${ind.name}은(는) 농장에 없음`;
    ind.geneKit = true;
    return null;
  }

  /**
   * 키트 결과: 아직 발현되지 않은 이형 중 소인이 문턱 근처인 것.
   * 자식이 이 이형으로 태어날 확률은 부모 소인 평균에 가까우므로 교배 계획에 쓸 수 있다.
   */
  geneKitReport(ind: Individual): { morph: string; level: '소인 있음' | '소인 높음'; chance: number }[] {
    if (!ind.geneKit || ind.status !== 'active') return [];
    const out: { morph: string; level: '소인 있음' | '소인 높음'; chance: number }[] = [];
    for (const m of MORPH_IDS) {
      const d = MORPHS[m];
      const p = morphChance(ind.genome, m);
      if (p >= d.pmax * CONFIG.geneKit.highAt) out.push({ morph: d.name, level: '소인 높음', chance: p });
      else if (p >= d.pmax * CONFIG.geneKit.someAt) out.push({ morph: d.name, level: '소인 있음', chance: p });
    }
    return out;
  }

  // ─── 떠나는 개체: 족보용 정보만 남김 ───

  sell(id: string): string | null {
    return this.retire(id, 'sold');
  }

  /** 사망 처리 (임무 중 사망 전용, 추후 임무 시스템에서 호출) */
  markDead(id: string): string | null {
    return this.retire(id, 'dead');
  }

  private retire(id: string, status: 'sold' | 'dead'): string | null {
    const ind = this.get(id);
    if (!ind) return '개체를 찾을 수 없음';
    if (ind.status !== 'active') return `${ind.name}은(는) 이미 농장에 없음`;
    if (status === 'sold' && ind.pregnancy) return `${ind.name}은(는) 임신 중이라 판매할 수 없음`;
    ind.status = status;
    // 유전형은 버린다. 자손은 이미 대립유전자를 복사해 갖고 있고, 족보/근친 계산은 부모 ID와 근친 계수만 쓴다
    ind.genome = {};
    ind.pregnancy = null;
    return null;
  }

  // ─── 저장/불러오기 ───
  serialize(): SaveData {
    return {
      version: 2,
      seed: this.seed,
      rngState: this.rng.getState(),
      day: this.day,
      counter: this.counter,
      individuals: this.all().map((ind) => ({
        ...ind,
        genome: encodeGenome(ind.genome),
        pregnancy: ind.pregnancy
          ? { ...ind.pregnancy, embryos: ind.pregnancy.embryos.map((e) => ({ ...e, genome: encodeGenome(e.genome) })) }
          : null,
      })),
    };
  }

  static load(data: SaveData): World {
    if (data.version !== 2) throw new Error('지원하지 않는 저장 형식');
    const w = new World(data.seed);
    w.rng = new Rng(data.rngState);
    w.day = data.day;
    w.counter = data.counter;
    for (const raw of data.individuals) {
      const ind: Individual = {
        ...raw,
        genome: decodeGenome(raw.genome),
        pregnancy: raw.pregnancy
          ? { ...raw.pregnancy, embryos: raw.pregnancy.embryos.map((e) => ({ ...e, genome: decodeGenome(e.genome) })) }
          : null,
      };
      w.individuals.set(ind.id, ind);
    }
    return w;
  }
}

function morphShown(morphs: string[], m: MorphId): boolean {
  if (m === 'pigment') return morphs.includes(PIGMENT.albino.name) || morphs.includes(PIGMENT.leucistic.name);
  if (m === 'oddEye') return morphs.includes(MORPHS.oddEye.name);
  return morphs.includes(MORPHS[m].name) || morphs.includes(CHOSEN_HYBRID_NAME);
}
