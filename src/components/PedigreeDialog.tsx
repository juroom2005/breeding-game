'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { Individual, World } from '@/engine';
import { totalScore } from '@/game/game';
import { josa } from '@/game/josa';
import Portrait from './Portrait';

interface Props {
  rootId: string;
  world: World;
  onClose: () => void;
  /** 농장에 있는 개체를 농장 화면에서 선택 */
  onShow: (id: string) => void;
}

// 증조부모(3대 위)까지 8칸이 한 줄에 들어가도록 고정 크기로 배치한다
const W = 100;
const H = 116;
const GAP = 12;
const ROW = H + 44;
const LEVELS = 3;
const COLS = 2 ** LEVELS;
const CANVAS_W = COLS * W + (COLS - 1) * GAP;

const centerX = (level: number, i: number) => {
  const span = COLS / 2 ** level;
  return (i * span + span / 2) * (W + GAP) - GAP / 2;
};

function relationName(level: number, i: number): string {
  if (level === 1) return i === 0 ? '엄마' : '아빠';
  const side = i < 2 ** level / 2 ? '외' : '친';
  const who = i % 2 === 0 ? '할머니' : '할아버지';
  return level === 2 ? `${side}${who}` : `${side}증조${who}`;
}

function statusText(ind: Individual, world: World): string {
  if (ind.status === 'sold') return '팔려서 농장에 없음';
  if (ind.status === 'dead') return '죽어서 농장에 없음';
  if (ind.status === 'market') return '마켓 매물';
  if (!world.isAdult(ind)) return '지금 농장(육아실)에 있음';
  return ind.pregnancy ? '지금 농장에 있음 · 임신 중' : '지금 농장에 있음';
}

export default function PedigreeDialog({ rootId, world, onClose, onShow }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [centerId, setCenterId] = useState(rootId);
  const [tip, setTip] = useState<{ key: string; x: number; y: number } | null>(null);
  const moved = useRef(false);
  const center = world.get(centerId) ?? world.get(rootId)!;

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);

  useEffect(() => {
    if (!moved.current) return;
    const el = document.getElementById('pedigree-center');
    el?.focus();
    el?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [centerId]);

  const pick = (id: string) => {
    if (id === centerId) return;
    moved.current = true;
    setTip(null);
    setCenterId(id);
  };

  // 조상 칸: [단계][순서], 각 단계에서 짝수 = 엄마 쪽, 홀수 = 아빠 쪽
  const slots: (Individual | undefined)[][] = [[center]];
  for (let lv = 1; lv <= LEVELS; lv++) {
    slots[lv] = [];
    for (let i = 0; i < 2 ** lv; i++) {
      const child = slots[lv - 1][i >> 1];
      slots[lv][i] = child ? world.get(i % 2 === 0 ? child.motherId : child.fatherId) : undefined;
    }
  }
  const depth = Math.max(0, ...slots.map((row, lv) => (row.some(Boolean) ? lv : 0)));
  const seen = new Map<string, number>();
  for (const row of slots.slice(1)) for (const x of row) if (x) seen.set(x.id, (seen.get(x.id) ?? 0) + 1);

  const yOf = (lv: number) => (depth - lv) * ROW;
  const canvasH = depth * ROW + H;

  const lines: string[] = [];
  for (let lv = 0; lv < depth; lv++) {
    slots[lv].forEach((child, i) => {
      const m = slots[lv + 1][2 * i];
      const f = slots[lv + 1][2 * i + 1];
      if (!child || (!m && !f)) return;
      const bar = yOf(lv) - 22;
      const cx = centerX(lv, i);
      const xs = [m && centerX(lv + 1, 2 * i), f && centerX(lv + 1, 2 * i + 1)].filter((x): x is number => x !== undefined);
      for (const x of xs) lines.push(`M${x} ${yOf(lv + 1) + H} V${bar}`);
      lines.push(`M${Math.min(...xs, cx)} ${bar} H${Math.max(...xs, cx)}`, `M${cx} ${bar} V${yOf(lv)}`);
    });
  }

  const others = world.all().filter((x) => x.status !== 'market' && x.id !== center.id);
  const siblings = center.motherId || center.fatherId
    ? others.filter((x) => (center.motherId && x.motherId === center.motherId) || (center.fatherId && x.fatherId === center.fatherId))
    : [];
  const kids = others.filter((x) => x.motherId === center.id || x.fatherId === center.id);
  const byPartner = new Map<string, Individual[]>();
  for (const k of kids) {
    const pid = (k.motherId === center.id ? k.fatherId : k.motherId) ?? '?';
    byPartner.set(pid, [...(byPartner.get(pid) ?? []), k]);
  }

  const siblingRelation = (x: Individual) =>
    x.motherId === center.motherId && x.fatherId === center.fatherId ? '형제자매' : x.motherId === center.motherId ? '엄마가 같음' : '아빠가 같음';

  const node = (ind: Individual, key: string, relation: string, style?: CSSProperties) => (
    <TreeNode
      key={key}
      ind={ind}
      world={world}
      relation={relation}
      repeat={relation && style && key !== 'c' ? (seen.get(ind.id) ?? 0) : 0}
      isCenter={ind.id === center.id && key === 'c'}
      tip={tip?.key === key ? tip : null}
      onTip={(el) => {
        if (!el) return setTip((t) => (t?.key === key ? null : t));
        const r = el.getBoundingClientRect();
        setTip({ key, x: r.left + r.width / 2, y: r.bottom + 4 });
      }}
      onPick={() => pick(ind.id)}
      style={style}
    />
  );

  const showReason = center.status !== 'active' ? `${josa(center.name, '은/는')} 농장에 없습니다` : null;

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={(e) => {
        // 떠 있는 말풍선이 있으면 Esc로 먼저 말풍선만 닫는다 (WCAG 1.4.13)
        if (tip) {
          e.preventDefault();
          setTip(null);
        }
      }}
      aria-labelledby="pedigree-title"
      className="m-auto h-[min(880px,calc(100dvh-2rem))] w-[min(980px,calc(100vw-2rem))] flex-col rounded-2xl border border-line bg-panel text-ink shadow-xl backdrop:bg-ink/40 open:flex"
    >
      <header className="flex shrink-0 items-start gap-3 border-b border-line px-6 py-4">
        <div className="min-w-0 flex-1">
          <h2 id="pedigree-title" className="truncate text-lg font-bold">
            족보 · {center.name}
          </h2>
          <p className="truncate text-sm tabular-nums text-mute">
            {center.raceLabel} · {center.generation}세대 · 근친 계수 {(center.coi * 100).toFixed(1)}%
          </p>
        </div>
        <button
          type="button"
          onClick={() => pick(rootId)}
          disabled={centerId === rootId}
          className="h-9 w-28 shrink-0 rounded-lg border border-line text-sm hover:border-accent disabled:cursor-default disabled:opacity-40"
        >
          처음 개체로
        </button>
        <button
          type="button"
          onClick={() => {
            if (showReason) return;
            ref.current?.close();
            onShow(center.id);
          }}
          aria-disabled={!!showReason}
          aria-describedby={showReason ? 'pedigree-show-reason' : undefined}
          className={`h-9 w-28 shrink-0 rounded-lg border border-line text-sm ${showReason ? 'cursor-not-allowed opacity-40' : 'hover:border-accent'}`}
        >
          농장에서 보기
        </button>
        <button type="button" onClick={() => ref.current?.close()} className="h-9 w-16 shrink-0 rounded-lg bg-ink text-sm font-semibold text-white hover:opacity-90">
          닫기
        </button>
      </header>
      <div className="flex h-9 shrink-0 items-center gap-4 border-b border-line px-6 text-xs text-mute">
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="size-2.5 rounded-full bg-[#2f7d52]" /> 농장에 있음
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="size-2.5 rounded-full border-2 border-mute" /> 농장에 없음 (점선)
        </span>
        <span className="flex items-center gap-1.5">
          <b aria-hidden="true" className="text-danger">×2</b> 족보에 여러 번 나오는 조상
        </span>
        <span id="pedigree-show-reason" className="ml-auto truncate">
          {showReason ?? '개체를 누르면 그 개체 중심으로 바뀝니다'}
        </span>
      </div>

      <div tabIndex={-1} onScroll={() => setTip(null)} className="min-h-0 flex-1 overflow-auto px-6 py-5 [scrollbar-gutter:stable]">
        <section aria-label="조상" className="mx-auto" style={{ width: CANVAS_W }}>
          {depth === 0 && <p className="mb-3 text-center text-sm text-mute">부모 기록이 없습니다 ({center.source === 'market' ? '마켓 출신' : '기록 없음'})</p>}
          <div className="relative" style={{ height: canvasH }}>
            <svg aria-hidden="true" width={CANVAS_W} height={canvasH} className="absolute inset-0 text-line">
              <path d={lines.join(' ')} fill="none" stroke="currentColor" strokeWidth={2} />
            </svg>
            {node(center, 'c', '본인', { position: 'absolute', left: centerX(0, 0) - W / 2, top: yOf(0) })}
            {slots.slice(1, depth + 1).flatMap((row, idx) =>
              row.map((x, i) =>
                x ? node(x, `${idx + 1}-${i}`, relationName(idx + 1, i), { position: 'absolute', left: centerX(idx + 1, i) - W / 2, top: yOf(idx + 1) }) : null,
              ),
            )}
          </div>
        </section>

        <section aria-labelledby="pedigree-kids" className="mt-8">
          <h3 id="pedigree-kids" className="mb-2 text-sm font-semibold">
            자식 <span className="tabular-nums text-mute">{kids.length}</span>
          </h3>
          {kids.length === 0 ? (
            <p className="text-sm text-mute">없음</p>
          ) : (
            [...byPartner].map(([pid, list]) => {
              const partner = world.get(pid);
              return (
                <div key={pid} className="mb-4">
                  <p className="mb-1.5 text-xs text-mute">{partner ? `${josa(partner.name, '와/과')}의 자식 ${list.length}` : `상대 기록 없음 ${list.length}`}</p>
                  <ul className="flex flex-wrap gap-3">
                    {partner && <li>{node(partner, `p-${pid}`, '짝')}</li>}
                    {list.map((k) => (
                      <li key={k.id}>{node(k, `k-${k.id}`, k.sex === 'F' ? '딸' : '아들')}</li>
                    ))}
                  </ul>
                </div>
              );
            })
          )}
        </section>

        <section aria-labelledby="pedigree-sibs" className="mt-4">
          <h3 id="pedigree-sibs" className="mb-2 text-sm font-semibold">
            형제자매 <span className="tabular-nums text-mute">{siblings.length}</span>
          </h3>
          {siblings.length === 0 ? (
            <p className="text-sm text-mute">없음</p>
          ) : (
            <ul className="flex flex-wrap gap-3">
              {siblings.map((s) => (
                <li key={s.id}>{node(s, `s-${s.id}`, siblingRelation(s))}</li>
              ))}
            </ul>
          )}
        </section>
      </div>
      <p className="sr-only" aria-live="polite">
        {center.name} 중심 족보
      </p>
    </dialog>
  );
}

function TreeNode({
  ind,
  world,
  relation,
  repeat,
  isCenter,
  tip,
  onTip,
  onPick,
  style,
}: {
  ind: Individual;
  world: World;
  relation: string;
  repeat: number;
  isCenter: boolean;
  tip: { x: number; y: number } | null;
  onTip: (el: HTMLElement | null) => void;
  onPick: () => void;
  style?: CSSProperties;
}) {
  const here = ind.status === 'active';
  const adult = world.isAdult(ind);
  const female = ind.sex === 'F';
  const status = statusText(ind, world);
  const tipText = [status, here && adult ? `종합 ${totalScore(ind)}점` : '', repeat > 1 ? `이 족보에 ${repeat}번 나옴` : ''].filter(Boolean).join(' · ');

  // 말풍선 위로 마우스를 옮겨도 닫히지 않게 감싸는 요소에서 hover를 잡는다.
  // 말풍선은 fixed라서 스크롤 영역 밖으로 나가도 스크롤바가 생기지 않는다
  return (
    <div
      className="relative"
      style={{ width: W, height: H, ...style }}
      onPointerEnter={(e) => e.pointerType === 'mouse' && onTip(e.currentTarget)}
      onPointerLeave={(e) => e.pointerType === 'mouse' && onTip(null)}
    >
      <button
        type="button"
        id={isCenter ? 'pedigree-center' : undefined}
        aria-current={isCenter ? 'true' : undefined}
        onClick={onPick}
        onFocus={(e) => onTip(e.currentTarget)}
        onBlur={() => onTip(null)}
        className={`flex size-full flex-col items-center rounded-xl border-2 px-1.5 pb-1.5 pt-1 text-center ${
          here ? 'border-line bg-panel' : 'border-dashed border-[#a89c8a] bg-[#f3eee4]'
        } ${isCenter ? 'border-solid !border-accent ring-2 ring-accent/30' : 'hover:border-accent/70'}`}
      >
        <span className="h-4 w-full truncate text-[11px] text-mute">{relation}</span>
        <span className="mt-0.5 size-[52px] shrink-0">
          <Portrait ind={ind} baby={!adult} size={52} decorative />
        </span>
        <span className="mt-1 flex w-full items-center justify-center gap-0.5 text-sm font-semibold">
          <span aria-hidden="true" className={female ? 'text-female' : 'text-male'}>{female ? '♀' : '♂'}</span>
          <span className="truncate">{ind.name}</span>
        </span>
        <span className="w-full truncate text-[11px] text-mute">{ind.raceLabel}</span>
        <span className="sr-only">
          , {female ? '여성' : '남성'}, {status}
          {repeat > 1 ? `, 이 족보에 ${repeat}번 나옴` : ''}
        </span>
        <span
          aria-hidden="true"
          className={`absolute right-2.5 top-7 size-2.5 rounded-full ${here ? 'bg-[#2f7d52]' : 'border-2 border-mute'}`}
        />
        {repeat > 1 && (
          <b aria-hidden="true" className="absolute left-2 top-6 text-[11px] text-danger">
            ×{repeat}
          </b>
        )}
      </button>
      {tip && (
        <p
          aria-hidden="true"
          style={{ left: tip.x, top: tip.y }}
          className="fixed z-30 -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-xs text-white shadow-lg"
        >
          {tipText}
        </p>
      )}
    </div>
  );
}
