import type { Individual, World } from '@/engine';
import Portrait from './Portrait';

interface Props {
  world: World;
  capacity: number;
  mothers: Individual[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function PregnancyRoom({ world, capacity, mothers, selectedId, onSelect }: Props) {
  const empty = Math.max(0, capacity - mothers.length);
  return (
    <section aria-labelledby="room-title" className="flex h-full min-w-0 flex-col rounded-2xl border border-line bg-panel p-4">
      <h2 id="room-title" className="mb-2 text-sm font-semibold">
        임신실 <span className="tabular-nums text-mute">{mothers.length} / {capacity}</span>
      </h2>
      <ul className="flex min-h-0 flex-1 items-center gap-2 overflow-x-auto">
        {mothers.map((m) => {
          const days = m.pregnancy ? m.pregnancy.dueDay - world.day : 0;
          return (
            <li key={m.id} className="shrink-0">
              <button
                type="button"
                onClick={() => onSelect(m.id)}
                aria-pressed={selectedId === m.id}
                className={`flex h-16 w-32 items-center gap-2 rounded-xl border bg-white p-1.5 text-left ${
                  selectedId === m.id ? 'border-accent ring-2 ring-accent/30' : 'border-female/40 hover:border-accent'
                }`}
              >
                <Portrait ind={m} size={48} decorative />
                <span className="min-w-0 text-sm">
                  <span className="block truncate font-semibold">{m.name}</span>
                  <span className="block text-xs text-female tabular-nums">
                    <span aria-hidden="true">출산 D-{days}</span>
                    <span className="sr-only">{days}일 뒤 출산</span>
                  </span>
                </span>
              </button>
            </li>
          );
        })}
        {Array.from({ length: empty }, (_, i) => (
          <li key={`empty-${i}`} className="flex h-16 w-32 shrink-0 items-center justify-center rounded-xl border border-dashed border-line text-xs text-mute">
            빈 칸
          </li>
        ))}
      </ul>
    </section>
  );
}
