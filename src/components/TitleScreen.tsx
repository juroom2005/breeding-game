'use client';

import { useState } from 'react';
import { DIFFICULTY_DESC, DIFFICULTY_LABEL, type Difficulty } from '@/game/game';

interface Props {
  hasSave: boolean;
  onContinue: () => void;
  onNewGame: (farmName: string, difficulty: Difficulty) => void;
}

const DIFFICULTIES: Difficulty[] = ['casual', 'normal'];

export default function TitleScreen({ hasSave, onContinue, onNewGame }: Props) {
  const [step, setStep] = useState<'title' | 'setup'>('title');
  const [farmName, setFarmName] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);

  if (step === 'title') {
    return (
      <main id="main" className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-sm text-center">
          <p className="text-sm tracking-widest text-mute" aria-hidden="true">BREEDING GAME</p>
          <h1 className="mt-2 text-4xl font-bold">브리딩 게임</h1>
          <p className="mt-2 text-sm text-mute">(가제)</p>
          <div className="mt-10 flex flex-col gap-3">
            {hasSave && (
              <button type="button" onClick={onContinue} className="h-12 rounded-xl bg-accent font-semibold text-white hover:opacity-90">
                이어하기
              </button>
            )}
            <button
              type="button"
              onClick={() => setStep('setup')}
              className={`h-12 rounded-xl font-semibold ${hasSave ? 'border border-line bg-panel hover:border-accent' : 'bg-accent text-white hover:opacity-90'}`}
            >
              새 게임
            </button>
          </div>
        </div>
      </main>
    );
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (hasSave && !confirmOverwrite) {
      setConfirmOverwrite(true);
      return;
    }
    onNewGame(farmName, difficulty);
  };

  return (
    <main id="main" className="flex flex-1 items-center justify-center p-6">
      <form onSubmit={submit} className="w-full max-w-md rounded-2xl border border-line bg-panel p-7 shadow-sm">
        <h1 className="text-xl font-bold">새 농장 만들기</h1>

        <label className="mt-6 block text-sm font-medium" htmlFor="farm-name">농장 이름</label>
        <p id="farm-name-help" className="text-xs text-mute">농장에서 태어난 개체에 브리더 이름으로 남습니다.</p>
        <input
          id="farm-name"
          value={farmName}
          onChange={(e) => setFarmName(e.target.value)}
          maxLength={20}
          placeholder="예: 달빛 농장"
          aria-describedby="farm-name-help"
          autoComplete="off"
          className="mt-2 h-11 w-full rounded-lg border border-line bg-white px-3 outline-none focus:border-accent"
        />

        <fieldset className="mt-6">
          <legend className="text-sm font-medium">난이도</legend>
          <div className="mt-2 grid gap-2">
            {DIFFICULTIES.map((d) => (
              <label
                key={d}
                className={`flex cursor-pointer gap-3 rounded-lg border px-4 py-3 has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-accent ${
                  difficulty === d ? 'border-accent bg-accent-soft' : 'border-line bg-white hover:border-accent'
                }`}
              >
                <input
                  type="radio"
                  name="difficulty"
                  value={d}
                  checked={difficulty === d}
                  onChange={() => setDifficulty(d)}
                  className="mt-1 accent-accent"
                />
                <span>
                  <span className="font-semibold">{DIFFICULTY_LABEL[d]}</span>
                  <span className="mt-0.5 block text-xs text-mute">{DIFFICULTY_DESC[d]}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <p role="alert" className={`mt-5 min-h-14 rounded-lg px-3 py-2 text-sm ${confirmOverwrite ? 'bg-danger-soft text-danger' : ''}`}>
          {confirmOverwrite && '저장된 게임이 있습니다. 새로 시작하면 지워집니다. 한 번 더 누르면 시작합니다.'}
        </p>

        <div className="mt-3 flex gap-2">
          <button type="button" onClick={() => setStep('title')} className="h-11 rounded-lg border border-line px-4 hover:border-accent">
            뒤로
          </button>
          <button type="submit" className="h-11 flex-1 rounded-lg bg-accent font-semibold text-white hover:opacity-90">
            {confirmOverwrite ? '지우고 새로 시작' : '시작하기'}
          </button>
        </div>
      </form>
    </main>
  );
}
