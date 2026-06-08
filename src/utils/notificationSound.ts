// Bell arpeggio: C6 → E6 → G6 → C7, each note has fundamental + bell harmonic (2.756x)
// for a natural "leng keng" timbre without any audio file.
export function playNotificationSound(): void {
  if (typeof window === 'undefined') return;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;

  try {
    const ctx = new AC();

    const melody = [
      { freq: 1046.50, t: 0.00, vol: 0.38 }, // C6
      { freq: 1318.51, t: 0.09, vol: 0.32 }, // E6
      { freq: 1567.98, t: 0.18, vol: 0.30 }, // G6
      { freq: 2093.00, t: 0.28, vol: 0.42 }, // C7 — louder final note
    ];

    melody.forEach(({ freq, t, vol }) => {
      // Each bell note = fundamental sine + 2.756× partial (classic bell overtone ratio)
      [1, 2.756].forEach((ratio, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'sine';
        osc.frequency.value = freq * ratio;

        const partialVol = i === 0 ? vol : vol * 0.35;
        const start = ctx.currentTime + t;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(partialVol, start + 0.006);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.45);

        osc.start(start);
        osc.stop(start + 0.5);
      });
    });

    // Close AudioContext after all notes finish to free resources
    setTimeout(() => ctx.close().catch(() => {}), 1400);
  } catch {
    // AudioContext unavailable (e.g. blocked by browser policy) — skip silently
  }
}
