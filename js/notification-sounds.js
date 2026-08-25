/**
 * notification-sounds.js (BeTheGrid copy — plain script, not an ES module)
 *
 * Two distinct notification sounds synthesized live with the Web Audio API.
 * No audio files to host.
 *
 * - playNewMailSound()    → two-note descending bell, slower and more formal
 * - playNewMessageSound() → single rising "pop", fast and casual
 *
 * Note: browsers block audio until a user gesture has occurred on the page.
 * Call initNotificationAudio() from inside a click/tap handler (the dashboard
 * calls it on the login click) so the AudioContext is unlocked, then the
 * play* functions can fire later from polling timers.
 */

let audioCtx;
function getCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

/** Unlock the AudioContext — call from a user-gesture handler. */
function initNotificationAudio() {
  try { getCtx().resume().catch(function () {}); } catch (e) {}
}

function tone(ctx, freq, startTime, duration, gainPeak) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;

  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(gainPeak, startTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  osc.connect(gain).connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration);
}

/**
 * New mail — two-note descending sine bell.
 */
function playNewMailSound(opts = {}) {
  const ctx = getCtx();
  const f1 = opts.freq1 ?? 1467;
  const f2 = opts.freq2 ?? 731;
  const gapMs = opts.gap ?? 35;
  const gainPeak = opts.gain ?? 0.35;
  const now = ctx.currentTime;

  tone(ctx, f1, now, 0.55, gainPeak);
  tone(ctx, f2, now + gapMs / 1000, 0.7, gainPeak);
}

/**
 * New message — single rising triangle-wave pop.
 */
function playNewMessageSound(opts = {}) {
  const ctx = getCtx();
  const startFreq = opts.start ?? 872;
  const endFreq = opts.end ?? 2004;
  const duration = (opts.duration ?? 215) / 1000;
  const gainPeak = opts.gain ?? 0.3;
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(startFreq, now);
  osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration * 0.7);

  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(gainPeak, now + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration);
}
