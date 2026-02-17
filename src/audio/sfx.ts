let audioContext: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null

  if (!audioContext) {
    try {
      audioContext = new AudioContext()
    } catch {
      audioContext = null
    }
  }

  return audioContext
}

export function playAttackSound(): void {
  const ctx = getAudioContext()
  if (!ctx) return

  const osc = ctx.createOscillator()
  const gain = ctx.createGain()

  osc.type = 'square'
  osc.frequency.value = 440

  gain.gain.value = 0.15

  osc.connect(gain)
  gain.connect(ctx.destination)

  const now = ctx.currentTime
  osc.start(now)
  osc.stop(now + 0.05)
}

