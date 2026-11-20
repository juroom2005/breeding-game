'use client';

// 떼어낼 때: src/debug 폴더를 지우고 page.tsx에서 DebugRemote import, loadSave, <DebugRemote /> 를 지운다.
// game.ts의 DayOptions(free, ignoreOverflow)는 남겨둬도 게임에 영향이 없다.
import { useEffect, useId, useState } from 'react';
import { BLOODLINE_IDS, BLOODLINES, MORPH_IDS, MORPHS, RACE_IDS, RACES, STAT_NAMES, TRAITS, type World } from '@/engine';
import { SHOWN_STATS, totalScore, type GameState } from '@/game/game';
import * as A from './actions';
import type { NewIndividual } from './actions';

interface Props {
  state: GameState;
  world: World;
  commit: (s: GameState) => void;
  onLoad: (s: GameState) => void;
}

type Tab = 'time' | 'ind' | 'add' | 'farm';

const TABS: [Tab, string][] = [
  ['time', '시간·돈'],
  ['ind', '개체'],
  ['add', '추가'],
  ['farm', '농장·저장'],
];

const OPEN_KEY = 'debug-open';
const SIDE_KEY = 'debug-side';

export function debugEnabled(): boolean {
  if (process.env.NODE_ENV !== 'production') return true;
  try {
    return new URLSearchParams(window.location.search).has('debug') || localStorage.getItem('debug') === '1';
  } catch {
    return false;
  }
}

function loadFlag(key: string, on: string): boolean {
  try {
    return localStorage.getItem(key) === on;
  } catch {
    return false;
  }
}

function saveFlag(key: string, v: string) {
  try {
    localStorage.setItem(key, v);
  } catch {}
}

export default function DebugRemote(props: Props) {
  const [enabled] = useState(debugEnabled);
  if (!enabled) return null;
  return <Remote {...props} />;
}

function Remote({ state, world, commit, onLoad }: Props) {
  const [open, setOpen] = useState(() => loadFlag(OPEN_KEY, '1'));
  const [right, setRight] = useState(() => loadFlag(SIDE_KEY, 'right'));
  const [tab, setTab] = useState<Tab>('time');
  const [msg, setMsg] = useState('');
  const [targetId, setTargetId] = useState<string | null>(null);
  const [follow, setFollow] = useState(true);
  const panelId = useId();

  const toggle = (v: boolean) => {
    setOpen(v);
    saveFlag(OPEN_KEY, v ? '1' : '0');
  };

  const flip = () => {
    setRight(!right);
    saveFlag(SIDE_KEY, right ? 'left' : 'right');
  };
  const side = right ? 'right-4' : 'left-4';

  const apply = (r: A.Result) => {
    commit(r.state);
    setMsg(r.message);
  };

  // F2는 브라우저 기본 동작이 없고 글자 키가 아니라 게임 단축키와 겹치지 않는다
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'F2') return;
      e.preventDefault();
      toggle(!open);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // 농장 화면에서 고른 개체를 따라간다 (카드 클릭이나 방향키 이동)
  useEffect(() => {
    if (!follow) return;
    const pick = (e: Event) => {
      const el = (e.target as Element | null)?.closest?.('[data-card-id]') as HTMLElement | null;
      if (el?.dataset.cardId) setTargetId(el.dataset.cardId);
    };
    document.addEventListener('click', pick, true);
    document.addEventListener('focusin', pick);
    return () => {
      document.removeEventListener('click', pick, true);
      document.removeEventListener('focusin', pick);
    };
  }, [follow]);

  return (
    <>
      <button
        type="button"
        onClick={() => toggle(!open)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-keyshortcuts="F2"
        className={`fixed bottom-4 ${side} z-[60] h-9 w-24 rounded-lg border border-ink bg-ink text-xs font-semibold text-white shadow-lg hover:opacity-90`}
      >
        디버그 <kbd className="font-sans opacity-80">F2</kbd>
      </button>
      <section
        id={panelId}
        aria-label="디버그 리모컨"
        className={`fixed bottom-16 ${side} z-[60] ${open ? 'flex' : 'hidden'} h-[min(600px,calc(100dvh-6rem))] w-[360px] flex-col rounded-2xl border-2 border-ink bg-panel text-ink shadow-2xl`}
      >
        <header className="flex h-11 shrink-0 items-center gap-2 border-b border-line px-4">
          <h2 className="text-sm font-bold">디버그 리모컨</h2>
          <span className="text-xs tabular-nums text-mute">{world.day + 1}일차 · {state.gold.toLocaleString()}g</span>
          <button type="button" onClick={flip} className="ml-auto h-7 w-16 rounded-md border border-line text-xs hover:border-accent">
            {right ? '왼쪽으로' : '오른쪽으로'}
          </button>
          <button type="button" onClick={() => toggle(false)} className="h-7 w-12 rounded-md border border-line text-xs hover:border-accent">
            닫기
          </button>
        </header>
        <div role="group" aria-label="디버그 메뉴" className="grid shrink-0 grid-cols-4 gap-1 border-b border-line p-2">
          {TABS.map(([t, label]) => (
            <button
              key={t}
              type="button"
              aria-pressed={tab === t}
              onClick={() => setTab(t)}
              className={`h-8 rounded-md text-xs ${tab === t ? 'bg-ink font-semibold text-white' : 'hover:bg-[#efe9dd]'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4 text-sm [scrollbar-gutter:stable]">
          {tab === 'time' && <TimeTab state={state} world={world} apply={apply} />}
          {tab === 'ind' && (
            <IndividualTab state={state} world={world} apply={apply} targetId={targetId} setTargetId={setTargetId} follow={follow} setFollow={setFollow} />
          )}
          {tab === 'add' && <AddTab state={state} world={world} apply={apply} />}
          {tab === 'farm' && <FarmTab state={state} world={world} apply={apply} onLoad={onLoad} setMsg={setMsg} />}
        </div>
        <p role="status" className="h-10 shrink-0 truncate border-t border-line px-4 py-2.5 text-xs text-mute">
          {msg}
        </p>
      </section>
    </>
  );
}

type TabProps = { state: GameState; world: World; apply: (r: A.Result) => void };

const btn = 'h-8 rounded-md border border-line px-2 text-xs hover:border-accent disabled:cursor-not-allowed disabled:opacity-40';

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-4">
      <h3 className="mb-1.5 text-xs font-semibold text-mute">{title}</h3>
      {children}
    </section>
  );
}

function TimeTab({ state, world, apply }: TabProps) {
  const [free, setFree] = useState(false);
  const [ignore, setIgnore] = useState(true);
  const [days, setDays] = useState(10);
  const [gold, setGold] = useState(state.gold);
  const opts = { free, ignoreOverflow: ignore };
  return (
    <>
      <Group title="날짜">
        <div className="grid grid-cols-4 gap-1.5">
          {[1, 3, 7, 30].map((n) => (
            <button key={n} type="button" className={btn} onClick={() => apply(A.skipDays(state, world, n, opts))}>
              +{n}일
            </button>
          ))}
        </div>
        <div className="mt-1.5 flex gap-1.5">
          <label className="flex items-center gap-1.5 text-xs">
            <span>직접</span>
            <input type="number" min={1} max={365} value={days} onChange={(e) => setDays(Number(e.target.value))} className="h-8 w-16 rounded-md border border-line px-2 tabular-nums" />
            <span>일</span>
          </label>
          <button type="button" className={btn} onClick={() => apply(A.skipDays(state, world, Math.max(1, Math.min(365, days || 1)), opts))}>
            넘기기
          </button>
          <button type="button" className={`${btn} ml-auto`} onClick={() => apply(A.skipToTaxEve(state, world))}>
            세금 전날로
          </button>
        </div>
        <label className="mt-2 flex items-center gap-2 text-xs">
          <input type="checkbox" checked={free} onChange={(e) => setFree(e.target.checked)} className="size-4 accent-accent" />
          유지비·세금 없이 넘기기
        </label>
        <label className="mt-1 flex items-center gap-2 text-xs">
          <input type="checkbox" checked={ignore} onChange={(e) => setIgnore(e.target.checked)} className="size-4 accent-accent" />
          농장 칸이 넘쳐도 넘기기
        </label>
        <p className="mt-1 text-xs text-mute">출산, 성체, 마켓 재입고는 평소처럼 일어납니다. 세금 전날로는 항상 무료입니다.</p>
      </Group>
      <Group title="골드">
        <div className="grid grid-cols-4 gap-1.5">
          {[100, 1000, 10000].map((n) => (
            <button key={n} type="button" className={btn} onClick={() => apply(A.setGold(state, state.gold + n))}>
              +{n.toLocaleString()}
            </button>
          ))}
          <button type="button" className={btn} onClick={() => apply(A.setGold(state, 0))}>
            0으로
          </button>
        </div>
        <div className="mt-1.5 flex gap-1.5">
          <label className="flex items-center gap-1.5 text-xs">
            <span>정확히</span>
            <input type="number" value={gold} onChange={(e) => setGold(Number(e.target.value))} className="h-8 w-28 rounded-md border border-line px-2 tabular-nums" />
            <span>g</span>
          </label>
          <button type="button" className={btn} onClick={() => apply(A.setGold(state, Math.round(gold || 0)))}>
            맞추기
          </button>
        </div>
      </Group>
    </>
  );
}

function IndividualTab({
  state,
  world,
  apply,
  targetId,
  setTargetId,
  follow,
  setFollow,
}: TabProps & { targetId: string | null; setTargetId: (id: string) => void; follow: boolean; setFollow: (v: boolean) => void }) {
  const list = world.active();
  const ind = world.get(targetId) && world.get(targetId)!.status === 'active' ? world.get(targetId)! : list[0];
  const [genetic, setGenetic] = useState(true);
  const [name, setName] = useState('');
  if (!ind) return <p className="text-mute">농장에 개체가 없습니다.</p>;
  const adult = world.isAdult(ind);
  return (
    <>
      <label className="flex flex-col gap-1 text-xs">
        <span className="font-semibold text-mute">대상 개체</span>
        <select value={ind.id} onChange={(e) => setTargetId(e.target.value)} className="h-8 rounded-md border border-line bg-white px-2 text-sm">
          {list.map((x) => (
            <option key={x.id} value={x.id}>
              {x.sex === 'F' ? '♀' : '♂'} {x.name} · {x.raceLabel} · {world.isAdult(x) ? `${totalScore(x)}점` : '아기'}
            </option>
          ))}
        </select>
      </label>
      <label className="mb-4 mt-1.5 flex items-center gap-2 text-xs">
        <input type="checkbox" checked={follow} onChange={(e) => setFollow(e.target.checked)} className="size-4 accent-accent" />
        농장에서 고른 개체를 따라가기
      </label>

      <Group title="상태">
        <div className="grid grid-cols-2 gap-1.5">
          <button type="button" className={btn} disabled={adult} onClick={() => apply(A.growUp(state, world, ind.id))}>
            바로 성체로
          </button>
          <button type="button" className={btn} disabled={!ind.pregnancy} onClick={() => apply(A.dueTomorrow(state, world, ind.id))}>
            출산일을 내일로
          </button>
          <button type="button" className={btn} disabled={ind.lastMateDay !== world.day} onClick={() => apply(A.resetMate(state, world, ind.id))}>
            오늘 교배 다시 허용
          </button>
          <button type="button" className={`${btn} text-danger`} onClick={() => apply(A.removeIndividual(state, world, ind.id))}>
            돈 없이 내보내기
          </button>
        </div>
      </Group>

      <Group title="이름">
        <div className="flex gap-1.5">
          <input
            aria-label="새 이름"
            value={name}
            placeholder={ind.name}
            onChange={(e) => setName(e.target.value)}
            className="h-8 min-w-0 flex-1 rounded-md border border-line px-2"
          />
          <button type="button" className={btn} disabled={!name.trim()} onClick={() => {
              apply(A.patchIndividual(state, world, ind.id, { name }));
              setName('');
            }}>
            바꾸기
          </button>
        </div>
      </Group>

      <Group title={`능력치 (종합 ${totalScore(ind)}점)`}>
        <ul className="flex flex-col gap-1.5">
          {SHOWN_STATS.map((k) => (
            <StatRow
              key={`${ind.id}-${k}-${ind.pheno.stats[k]}`}
              label={STAT_NAMES[k]}
              value={ind.pheno.stats[k]}
              onSet={(v) => apply(A.patchIndividual(state, world, ind.id, { stats: { [k]: v }, geneticToo: genetic }))}
            />
          ))}
        </ul>
        <button
          type="button"
          className={`${btn} mt-1.5 w-full`}
          onClick={() => apply(A.patchIndividual(state, world, ind.id, { stats: Object.fromEntries(SHOWN_STATS.map((k) => [k, 100])), geneticToo: genetic }))}
        >
          전부 100으로
        </button>
        <label className="mt-2 flex items-center gap-2 text-xs">
          <input type="checkbox" checked={genetic} onChange={(e) => setGenetic(e.target.checked)} className="size-4 accent-accent" />
          유전자도 같이 바꾸기 (자식에게 이어짐)
        </label>
      </Group>

      <Group title="트레잇 (유전자째 바꿈)">
        <ul className="flex flex-col gap-1">
          {TRAITS.map((t) => (
            <li key={t.id}>
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={ind.pheno.traits.some((x) => x.id === t.id)}
                  onChange={(e) => apply(A.setTrait(state, world, ind.id, t.id, e.target.checked))}
                  className="size-4 accent-accent"
                />
                {t.name} <span className="text-mute">· {t.tier} · {t.good ? '좋음' : '나쁨'}</span>
              </label>
            </li>
          ))}
        </ul>
      </Group>
      <p className="text-xs text-mute">이형과 특수 혈통은 &lsquo;추가&rsquo; 탭에서 새 개체로 만드세요. 기존 개체의 겉모습은 바꾸지 않습니다.</p>
    </>
  );
}

function StatRow({ label, value, onSet }: { label: string; value: number; onSet: (v: number) => void }) {
  const [v, setV] = useState(value);
  return (
    <li className="flex items-center gap-2 text-xs">
      <label className="flex flex-1 items-center gap-2">
        <span className="w-8">{label}</span>
        <input type="range" min={1} max={100} value={v} onChange={(e) => setV(Number(e.target.value))} className="flex-1 accent-accent" />
        <span className="w-7 text-right tabular-nums">{v}</span>
      </label>
      <button type="button" className={`${btn} w-12`} disabled={v === value} onClick={() => onSet(v)}>
        적용
      </button>
    </li>
  );
}

function AddTab({ state, world, apply }: TabProps) {
  const [o, setO] = useState<NewIndividual>({ race: 'human', sex: 'F', score: 50, morph: '', founders: [] });
  const set = (p: Partial<NewIndividual>) => setO((x) => ({ ...x, ...p }));
  return (
    <>
      <Group title="종족 · 성별">
        <div className="flex gap-1.5">
          <select aria-label="종족" value={o.race} onChange={(e) => set({ race: e.target.value as NewIndividual['race'] })} className="h-8 flex-1 rounded-md border border-line bg-white px-2">
            {RACE_IDS.map((r) => (
              <option key={r} value={r}>
                {RACES[r].name}
              </option>
            ))}
          </select>
          <select aria-label="성별" value={o.sex} onChange={(e) => set({ sex: e.target.value as NewIndividual['sex'] })} className="h-8 w-20 rounded-md border border-line bg-white px-2">
            <option value="F">여성</option>
            <option value="M">남성</option>
          </select>
        </div>
      </Group>
      <Group title="목표 종합 점수">
        <label className="flex items-center gap-2 text-xs">
          <span className="sr-only">목표 종합 점수</span>
          <input type="range" min={5} max={95} value={o.score} onChange={(e) => set({ score: Number(e.target.value) })} className="flex-1 accent-accent" />
          <span className="w-7 text-right tabular-nums">{o.score}</span>
        </label>
        <p className="mt-1 text-xs text-mute">유전자를 이 점수에 맞춰 만들어서 자식도 비슷하게 나옵니다. 실제 점수는 ±몇 점 다를 수 있습니다.</p>
      </Group>
      <Group title="이형">
        <select aria-label="이형" value={o.morph} onChange={(e) => set({ morph: e.target.value as NewIndividual['morph'] })} className="h-8 w-full rounded-md border border-line bg-white px-2">
          <option value="">없음</option>
          {MORPH_IDS.map((m) => (
            <option key={m} value={m}>
              {m === 'pigment' ? '알비노 / 루시스틱' : MORPHS[m].name}
            </option>
          ))}
        </select>
      </Group>
      <Group title="특수 혈통 (초대로 만듦)">
        <div className="flex gap-4">
          {BLOODLINE_IDS.map((b) => (
            <label key={b} className="flex items-center gap-1.5 text-xs">
              <input
                type="checkbox"
                checked={o.founders.includes(b)}
                onChange={(e) => set({ founders: e.target.checked ? [...o.founders, b] : o.founders.filter((x) => x !== b) })}
                className="size-4 accent-accent"
              />
              {BLOODLINES[b].name}
            </label>
          ))}
        </div>
      </Group>
      <button type="button" className="h-10 w-full rounded-lg bg-accent text-sm font-semibold text-white hover:opacity-90" onClick={() => apply(A.addIndividual(state, world, o))}>
        농장에 추가 (무료, 칸 제한 무시)
      </button>
    </>
  );
}

function FarmTab({ state, world, apply, onLoad, setMsg }: TabProps & { onLoad: (s: GameState) => void; setMsg: (m: string) => void }) {
  const fileId = useId();
  const exportSave = () => {
    const data = JSON.stringify({ ...state, world: world.serialize() });
    const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `breeding-${state.farmName}-${world.day + 1}일차.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMsg('저장 파일을 내려받았습니다');
  };
  const importSave = async (file: File | undefined) => {
    if (!file) return;
    try {
      const s = JSON.parse(await file.text()) as GameState;
      if (!s?.world?.individuals) throw new Error();
      onLoad(s);
      setMsg(`${file.name} 불러옴`);
    } catch {
      setMsg('저장 파일을 읽지 못했습니다');
    }
  };
  return (
    <>
      <Group title={`농장 칸 ${state.farmSlots} · 임신실 ${state.pregnancyRoom}`}>
        <div className="grid grid-cols-4 gap-1.5">
          <button type="button" className={btn} onClick={() => apply(A.changeSlots(state, 'farmSlots', 1))}>농장 +1</button>
          <button type="button" className={btn} onClick={() => apply(A.changeSlots(state, 'farmSlots', -1))}>농장 -1</button>
          <button type="button" className={btn} onClick={() => apply(A.changeSlots(state, 'pregnancyRoom', 1))}>임신실 +1</button>
          <button type="button" className={btn} onClick={() => apply(A.changeSlots(state, 'pregnancyRoom', -1))}>임신실 -1</button>
        </div>
      </Group>
      <Group title="모드">
        <div className="grid grid-cols-2 gap-1.5">
          <button type="button" className={btn} onClick={() => apply(A.toggleDifficulty(state))}>
            {state.difficulty === 'normal' ? '즐기는 모드로' : '일반 모드로'}
          </button>
          <button type="button" className={btn} disabled={!state.gameOver} onClick={() => apply(A.clearGameOver(state))}>
            게임오버 해제
          </button>
        </div>
      </Group>
      <Group title="마켓">
        <div className="grid grid-cols-2 gap-1.5">
          <button type="button" className={btn} onClick={() => apply(A.rerollMarket(state, world))}>매물 새로 뽑기</button>
          <button type="button" className={btn} onClick={() => apply(A.resetRefresh(state))}>새로고침 횟수 초기화</button>
        </div>
      </Group>
      <Group title="저장 파일">
        <div className="grid grid-cols-2 gap-1.5">
          <button type="button" className={btn} onClick={exportSave}>내려받기</button>
          <label htmlFor={fileId} className={`${btn} flex cursor-pointer items-center justify-center focus-within:outline focus-within:outline-3 focus-within:outline-accent`}>
            불러오기
            <input id={fileId} type="file" accept="application/json,.json" className="sr-only" onChange={(e) => void importSave(e.target.files?.[0])} />
          </label>
        </div>
        <p className="mt-1 text-xs text-mute">버그를 만난 상태를 파일로 남겨두면 그대로 다시 열어볼 수 있습니다.</p>
      </Group>
    </>
  );
}
