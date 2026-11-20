# 브리딩 유전 엔진 v0.6

화면과 분리된 순수 TypeScript 유전 엔진. 인간 / 엘프 / 인어 3종족.

## 폴더

```
src/engine/
  data/config.ts      밸런스 수치 (돌연변이율, 신체 라벨 기준, 근친 페널티 등)
  data/loci.ts        모든 종족 공유 유전자 정의 (색, 파츠 슬롯, 신체, 능력치, 특수 혈통 수치)
  data/races.ts       종족별 시작 값 (색 빈도, 고유 파츠, 신체/능력치 평균)
  data/bloodlines.ts  특수 혈통 (문턱, 순도 단계, 문신, 발생 확률), 연계 혈통 규칙표
  data/traits.ts      트레잇 (예시 목록)
  data/morphs.ts      이형 (색소 결핍, 오드아이, 엔젤/데빌 쵸즌, 황혼 쵸즌)
  classify.ts         종족 분류 이름 (하프엘프, 쿼터엘프 ...)
  save.ts             저장 형식 압축
  genome.ts           마켓 1세대 생성, 교배(감수분열), 돌연변이, 초대 각성
  phenotype.ts        유전형 → 겉모습/능력치
  world.ts            개체 저장소, 마켓 구매, 교배(임신), 판매, 족보(근친 계수, 관계), 저장/불러오기
  index.ts            외부에 내보내는 것들
sim/                  밸런스 시뮬레이션 (simulate, extras, inbreeding, tail, morphs)
tests/engine.test.ts  자동 테스트
playground/           테스트 화면 (main.ts + shell.html)
```

## 실행

```bash
npm i -D typescript tsx esbuild
npx tsx --test tests/engine.test.ts  # 자동 테스트
npx tsx sim/simulate.ts            # 확률 시뮬레이션
npx tsc --noEmit                   # 타입 검사
npx esbuild playground/main.ts --bundle --format=iife --outfile=playground/dist/app.js
```

## Next.js 프로젝트에 넣을 때

`src/engine` 폴더를 그대로 복사해서 쓰면 된다. 외부 라이브러리 의존성이 없다.

```ts
import { World } from '@/engine';

const world = new World(12345);                 // 시드
const mom = world.buyFromMarket('elf', 'F');
const dad = world.buyFromMarket('human', 'M');
const r = world.tryMate(mom.id, dad.id);        // 하루 한 번, 수정 확률 적용
// r.ok 이면 임신. 실패하면 다음 날 다시 시도
const births = world.advanceDay();              // 출산 예정일이 된 엄마들이 출산
const child = births[0]?.children[0];
child?.raceLabel;                               // '하프엘프'
child?.notes;                                   // 조부모 유전, 숨은 유전, 쌍둥이, 근친 부작용 메모
world.sell(dad.id);                             // 족보에는 남음
await idbSet('save', world.serialize());        // 실제 게임은 IndexedDB 권장
```

## 핵심 규칙

- 모든 개체는 모든 유전자를 갖는다. 종족은 시작 값만 다르다.
- 대립유전자마다 `origin`(처음 기록된 개체), `race`(출신 종족), `shownBy`(마지막으로 겉으로 드러낸 조상)를 달고 다닌다.
  조부모/증조부모 유전 표시는 `shownBy`로 판단하므로 3세대부터 자동으로 생긴다.
- 특수 혈통은 문턱 모델. 마력 = 마법 혈통 수치, 15 이상이면 발현.
- 겉모습과 능력치는 출생 시 한 번 계산해서 저장한다 (환경 랜덤 포함).
