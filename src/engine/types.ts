export type Sex = 'F' | 'M';
export type RaceId = 'human' | 'elf' | 'mermaid';
export type BloodlineId = 'magic' | 'fire' | 'ice';
export type Source = 'market' | 'farm';
/** active = 농장에 있음 / market = 마켓 매물(아직 안 삼) / sold = 판매됨 / dead = 사망 (임무 중에만). 떠난 개체는 족보용 정보만 남는다 */
export type Status = 'active' | 'market' | 'sold' | 'dead';

/**
 * 대립유전자 하나.
 * - v: 값 (색 이름, 파츠 이름 같은 문자열 또는 수치형 유전자의 숫자)
 * - origin: 이 대립유전자가 처음 기록된 개체 ID (마켓 1세대면 그 개체, 돌연변이면 그 자식)
 * - race: 어느 종족 출신 유전자인지 (실제 유전 혈통 % 계산용)
 * - shownBy: 이 유전자를 겉으로 마지막으로 드러낸 조상 ID (조부모 유전 표시용). 아무도 안 드러냈으면 null
 */
export interface Allele {
  v: string | number;
  origin: string;
  race: RaceId;
  shownBy: string | null;
}

/** 유전자 하나 = 대립유전자 두 벌. [0]은 엄마, [1]은 아빠에게서 받음 */
export type Pair = [Allele, Allele];

/** 개체가 가진 모든 유전자. 키는 유전자 ID (예: 'eyeColor', 'height.3') */
export type Genome = Record<string, Pair>;

export interface BloodlineState {
  value: number; // 수치 (마법은 마력 %)
  expressed: boolean;
  tier: number; // 0 = 미발현, 1~3
  tierName: string;
  carrier: boolean;
  /** 문신 무늬 (발현 시) */
  pattern: string | null;
  /** 문신 진하기 0~1 (발현 시, 순도에 비례) */
  opacity: number;
}

/** 실제로 그려질 문신 하나 (혈통 문신 또는 연계 문신) */
export interface Tattoo {
  source: string; // '마법' 또는 '불 마법사'
  pattern: string;
  areas: string[];
  opacity: number;
}

/** 이형 슬롯으로 열리는 파츠. null이면 없음 */
export interface ExtraParts {
  wings: { type: '깃털 날개' | '피막 날개'; color: string } | null;
  horns: { color: string } | null;
  halo: { color: string } | null;
}

export interface TraitState {
  id: string;
  name: string;
  tier: TraitTier;
  good: boolean;
}

export type TraitTier = '보통' | '희귀' | '전설';

/** 출생 시 한 번 계산해서 저장하는 겉모습/능력치 */
export interface Phenotype {
  /** 눈색 요약 (오드아이면 "파랑 / 초록") */
  eyeColor: string;
  eyeLeft: string;
  eyeRight: string;
  hairColor: string;
  skinTone: number;
  skinToneName: string;
  albino: boolean;
  leucistic: boolean;
  oddEye: boolean;
  /** 발현된 이형 이름 (알비노, 오드아이, 엔젤 쵸즌, 황혼 쵸즌 ...) */
  morphs: string[];
  extraParts: ExtraParts;
  tattoos: Tattoo[];
  hairStyle: string; // 유전 아님, 출생 시 랜덤
  slots: Record<string, string>; // 슬롯 ID → 파츠 이름
  body: { height: number; fat: number; muscle: number; labels: string[] };
  sexTrait: { name: string; value: number; label: string | null };
  sexCarrier: { name: string; label: string } | null;
  stats: Record<StatId, number>;
  bloodlines: Record<BloodlineId, BloodlineState>;
  combos: string[];
  traits: TraitState[];
  traitCarriers: string[];
}

export type StatId = 'vitality' | 'strength' | 'agility' | 'charm' | 'mana';

/** 색/파츠가 어디서 왔는지 표시 (출생 시 계산) */
export interface InheritNote {
  locus: string;
  label: string; // 예: "조모 리아의 눈색", "숨은 유전 (부모에게 없던 색)"
  kind: 'parent' | 'grandparent' | 'great' | 'distant' | 'hidden' | 'mutation' | 'founder' | 'suppressed' | 'inbreeding' | 'birth' | 'morph';
}

/** 배 속의 아이: 수정 시점에 유전자가 정해지고, 출산일에 겉모습이 계산된다 */
export interface Embryo {
  id: string;
  birthOrder: number;
  genome: Genome;
  coi: number;
  inbred: { name: string; kind: 'express' | 'new' }[];
}

export interface Pregnancy {
  fatherId: string;
  conceivedDay: number;
  dueDay: number;
  embryos: Embryo[];
}

export interface Individual {
  id: string;
  name: string;
  sex: Sex;
  generation: number;
  motherId: string | null;
  fatherId: string | null;
  birthOrder: number; // 근친 계수 계산용 순번
  bornDay: number;
  source: Source;
  status: Status;
  /** 계보상 혈통 % (부모 평균, 출생 시 고정) */
  pedigreeRace: Partial<Record<RaceId, number>>;
  /** 종족 분류 이름: 엘프, 하프엘프, 쿼터엘프 ... (출생 시 고정) */
  raceLabel: string;
  /** 근친 계수 (출생 시 계산) */
  coi: number;
  /** 떠난 개체(sold/dead)는 빈 객체. 자손이 이미 유전자를 복사해 갖고 있어서 족보 계산에는 필요 없다 */
  genome: Genome;
  pheno: Phenotype;
  notes: InheritNote[];
  /** 이 개체에서 처음 생긴 특수 혈통 (초대) */
  foundedBloodlines: BloodlineId[];
  /** 가문: 특수 혈통별 초대 ID → 비율 */
  houses: Partial<Record<BloodlineId, Record<string, number>>>;
  /** 임신 중이면 정보, 아니면 null (여성만) */
  pregnancy: Pregnancy | null;
  /** 마지막으로 교배를 시도한 날 (하루 한 번 제한) */
  lastMateDay: number | null;
  /** 같은 배에서 태어난 형제 수 (쌍둥이 = 2) */
  litterSize: number;
  /** 유전자 키트를 사용했는지 (숨은 이형 소인 공개) */
  geneKit: boolean;
}
