import { useRef, useEffect, useState, useCallback } from 'react';

const ITEM_H = 44;
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);
const pad = (n: number) => String(n).padStart(2, '0');

function ScrollColumn({
  data,
  value,
  onChange,
}: {
  data: number[];
  value: number;
  onChange: (v: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState(value);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ignoreScroll = useRef(false);

  // Scroll to value on mount (instant) and on external changes
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const idx = data.indexOf(value);
    if (idx < 0) return;
    ignoreScroll.current = true;
    el.scrollTop = idx * ITEM_H;
    setLive(value);
    // Allow scroll handler again after browser settles
    requestAnimationFrame(() => { ignoreScroll.current = false; });
  }, [value, data]);

  const handleScroll = useCallback(() => {
    if (ignoreScroll.current) return;
    const el = ref.current;
    if (!el) return;
    const idx = Math.round(el.scrollTop / ITEM_H);
    const clamped = Math.max(0, Math.min(data.length - 1, idx));
    setLive(data[clamped]);
    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => onChange(data[clamped]), 180);
  }, [data, onChange]);

  return (
    <div style={{ position: 'relative', height: ITEM_H * 3, flex: 1, minWidth: 0 }}>
      {/* Selection highlight */}
      <div style={{
        position: 'absolute', top: ITEM_H, left: 2, right: 2, height: ITEM_H,
        backgroundColor: 'rgba(255,140,105,0.12)',
        borderTop: '1.5px solid var(--primary)',
        borderBottom: '1.5px solid var(--primary)',
        borderRadius: '8px',
        pointerEvents: 'none', zIndex: 2,
      }} />
      {/* Top fade */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: ITEM_H,
        background: 'linear-gradient(to bottom, var(--bg-card) 30%, transparent)',
        pointerEvents: 'none', zIndex: 3,
      }} />
      {/* Bottom fade */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: ITEM_H,
        background: 'linear-gradient(to top, var(--bg-card) 30%, transparent)',
        pointerEvents: 'none', zIndex: 3,
      }} />

      <div
        ref={ref}
        onScroll={handleScroll}
        className="smm-drum-scroll"
        style={{
          height: '100%',
          overflowY: 'scroll',
          scrollSnapType: 'y mandatory',
          scrollbarWidth: 'none',
        }}
      >
        {/* Top spacer — lets item 0 center in the 3-row window */}
        <div style={{ height: ITEM_H, flexShrink: 0 }} />

        {data.map((item) => (
          <div
            key={item}
            onClick={() => {
              onChange(item);
              const el = ref.current;
              if (el) el.scrollTo({ top: data.indexOf(item) * ITEM_H, behavior: 'smooth' });
            }}
            style={{
              height: ITEM_H,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              scrollSnapAlign: 'center',
              fontSize: '22px', fontWeight: 700,
              color: item === live ? 'var(--text-primary)' : 'var(--text-secondary)',
              opacity: item === live ? 1 : Math.abs(item - live) === 1 ? 0.55 : 0.3,
              userSelect: 'none',
              cursor: 'pointer',
              transition: 'opacity 0.1s, color 0.1s',
            }}
          >
            {pad(item)}
          </div>
        ))}

        {/* Bottom spacer — lets last item center */}
        <div style={{ height: ITEM_H, flexShrink: 0 }} />
      </div>
    </div>
  );
}

export default function TimeScrollPicker({
  hour,
  minute,
  onHourChange,
  onMinuteChange,
  label,
}: {
  hour: number;
  minute: number;
  onHourChange: (h: number) => void;
  onMinuteChange: (m: number) => void;
  label?: string;
}) {
  return (
    <div style={{ padding: '0 4px' }}>
      {label && (
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '6px', fontWeight: 600 }}>
          {label}
        </div>
      )}

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: '4px',
        backgroundColor: 'var(--bg-card)',
        borderRadius: '14px',
        border: '1px solid var(--border)',
        padding: '4px 12px',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-sm)',
      }}>
        <ScrollColumn data={HOURS} value={hour} onChange={onHourChange} />

        <div style={{
          fontSize: '26px', fontWeight: 900, color: 'var(--text-primary)',
          lineHeight: 1, flexShrink: 0, paddingBottom: '2px', userSelect: 'none',
        }}>:</div>

        <ScrollColumn data={MINUTES} value={minute} onChange={onMinuteChange} />
      </div>

      {/* Hide webkit scrollbar — scoped to drum only */}
      <style>{`.smm-drum-scroll::-webkit-scrollbar { display: none; }`}</style>
    </div>
  );
}
