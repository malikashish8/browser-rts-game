const SFX_STORAGE_KEY = 'rts-sfx-muted'

let audioContext: AudioContext | null = null
let sfxMuted = localStorage.getItem(SFX_STORAGE_KEY) === 'true'
let sfxButton: HTMLButtonElement | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (sfxMuted) return null

  if (!audioContext) {
    try {
      audioContext = new AudioContext()
    } catch {
      audioContext = null
    }
  }

  return audioContext
}

export function isSfxMuted(): boolean { return sfxMuted }

export function toggleSfx(): void {
  sfxMuted = !sfxMuted
  localStorage.setItem(SFX_STORAGE_KEY, String(sfxMuted))
  if (sfxButton) sfxButton.innerHTML = sfxMuted ? sfxIconOff() : sfxIconOn()
}

export function initSfxToggle(): void {
  const container = document.getElementById('sound-toggles')
  if (!container) return

  sfxButton = document.createElement('button')
  sfxButton.id = 'sfx-toggle'
  sfxButton.setAttribute('aria-label', 'Toggle sound effects')
  sfxButton.innerHTML = sfxMuted ? sfxIconOff() : sfxIconOn()
  sfxButton.addEventListener('click', (e) => {
    e.stopPropagation()
    toggleSfx()
  })
  container.appendChild(sfxButton)
}

function sfxIconOn(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
  </svg>`
}

function sfxIconOff(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
    <path d="M16.5 12A4.5 4.5 0 0 0 14 7.97v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
  </svg>`
}

// ─── Arrow: high-pitched whistle (sine sweep 800→400Hz) ──────────────────────

export function playArrowSound(): void {
  const ctx = getAudioContext()
  if (!ctx) return

  const osc = ctx.createOscillator()
  const gain = ctx.createGain()

  osc.type = 'sine'
  const now = ctx.currentTime
  osc.frequency.setValueAtTime(800, now)
  osc.frequency.linearRampToValueAtTime(400, now + 0.12)

  gain.gain.setValueAtTime(0.12, now)
  gain.gain.linearRampToValueAtTime(0, now + 0.12)

  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(now)
  osc.stop(now + 0.13)
}

// ─── Spear: sharp metallic thrust (sawtooth 200Hz + noise) ───────────────────

export function playSpearSound(): void {
  const ctx = getAudioContext()
  if (!ctx) return

  const now = ctx.currentTime

  // Sawtooth hit
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sawtooth'
  osc.frequency.setValueAtTime(200, now)
  osc.frequency.linearRampToValueAtTime(120, now + 0.08)
  gain.gain.setValueAtTime(0.13, now)
  gain.gain.linearRampToValueAtTime(0, now + 0.08)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(now)
  osc.stop(now + 0.09)

  // Noise burst for metallic texture
  const bufferSize = ctx.sampleRate * 0.06
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.3
  const noise = ctx.createBufferSource()
  noise.buffer = buffer
  const noiseGain = ctx.createGain()
  noiseGain.gain.setValueAtTime(0.08, now)
  noiseGain.gain.linearRampToValueAtTime(0, now + 0.06)
  noise.connect(noiseGain)
  noiseGain.connect(ctx.destination)
  noise.start(now)
  noise.stop(now + 0.07)
}

// ─── Melee / Villager: dull thud (triangle 120Hz, quick decay) ───────────────

export function playMeleeSound(): void {
  const ctx = getAudioContext()
  if (!ctx) return

  const osc = ctx.createOscillator()
  const gain = ctx.createGain()

  osc.type = 'triangle'
  osc.frequency.setValueAtTime(120, ctx.currentTime)
  osc.frequency.linearRampToValueAtTime(60, ctx.currentTime + 0.06)

  gain.gain.setValueAtTime(0.18, ctx.currentTime)
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.06)

  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(ctx.currentTime)
  osc.stop(ctx.currentTime + 0.07)
}

// ─── Lance / Horseman: heavy impact (low sine + square) ──────────────────────

export function playLanceSound(): void {
  const ctx = getAudioContext()
  if (!ctx) return

  const now = ctx.currentTime

  // Low sine thump
  const osc1 = ctx.createOscillator()
  const gain1 = ctx.createGain()
  osc1.type = 'sine'
  osc1.frequency.setValueAtTime(100, now)
  osc1.frequency.linearRampToValueAtTime(50, now + 0.1)
  gain1.gain.setValueAtTime(0.2, now)
  gain1.gain.linearRampToValueAtTime(0, now + 0.1)
  osc1.connect(gain1)
  gain1.connect(ctx.destination)
  osc1.start(now)
  osc1.stop(now + 0.11)

  // Mid square crunch
  const osc2 = ctx.createOscillator()
  const gain2 = ctx.createGain()
  osc2.type = 'square'
  osc2.frequency.setValueAtTime(300, now)
  osc2.frequency.linearRampToValueAtTime(150, now + 0.07)
  gain2.gain.setValueAtTime(0.08, now)
  gain2.gain.linearRampToValueAtTime(0, now + 0.07)
  osc2.connect(gain2)
  gain2.connect(ctx.destination)
  osc2.start(now)
  osc2.stop(now + 0.08)
}

/** @deprecated Use the specific sound functions instead. */
export function playAttackSound(): void {
  playMeleeSound()
}
