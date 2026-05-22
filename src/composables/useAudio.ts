import type { Ref } from 'vue';

const BG_MELODY = [261, 329, 392, 523, 392, 329, 440, 349, 392, 261, 329, 294];

let audioCtx: AudioContext | null = null;
let bgMusicInterval: ReturnType<typeof setInterval> | null = null;
let bgStep = 0;

export function useAudio(
  muted: Ref<boolean>,
  paused: Ref<boolean>,
  gameOver: Ref<boolean>,
  won: Ref<boolean>,
) {
  function resumeAudio() {
    if (!audioCtx) {
      const C =
        (window as typeof window & { webkitAudioContext?: typeof AudioContext }).AudioContext ??
        (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!C) return;
      audioCtx = new C();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
  }

  function playTone(
    type: OscillatorType,
    freq: number,
    dur: number,
    vol = 0.04,
    freq2: number | null = null,
  ) {
    if (muted.value || !audioCtx) return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (freq2 !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq2), now + dur);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(vol, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + dur + 0.02);
  }

  const sfxJump = () => playTone('square', 420, 0.12, 0.03, 620);
  const sfxFly = () => playTone('triangle', 860, 0.12, 0.035, 1120);
  const sfxStomp = () => playTone('square', 180, 0.15, 0.045, 90);
  const sfxHit = () => playTone('sawtooth', 240, 0.2, 0.04, 120);
  const sfxCheckpoint = () => playTone('triangle', 540, 0.26, 0.04, 920);
  const sfxPowerUp = () => playTone('triangle', 700, 0.08, 0.035, 1400);
  const sfxWin = () => {
    playTone('triangle', 660, 0.18, 0.03, 990);
    setTimeout(() => playTone('triangle', 990, 0.22, 0.03, 1320), 120);
  };

  function startBgMusic() {
    if (bgMusicInterval) return;
    bgStep = 0;
    bgMusicInterval = setInterval(() => {
      if (muted.value || paused.value || gameOver.value || won.value) return;
      resumeAudio();
      playTone('triangle', BG_MELODY[bgStep % BG_MELODY.length], 0.28, 0.018);
      bgStep++;
    }, 350);
  }

  function stopBgMusic() {
    if (bgMusicInterval) {
      clearInterval(bgMusicInterval);
      bgMusicInterval = null;
    }
  }

  function closeAudioCtx() {
    if (audioCtx && audioCtx.state !== 'closed') audioCtx.close();
  }

  return {
    resumeAudio,
    playTone,
    sfxJump,
    sfxFly,
    sfxStomp,
    sfxHit,
    sfxCheckpoint,
    sfxPowerUp,
    sfxWin,
    startBgMusic,
    stopBgMusic,
    closeAudioCtx,
  };
}
