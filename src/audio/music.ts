const STORAGE_KEY = 'rts-music-muted'

let audio: HTMLAudioElement | null = null
let muted = localStorage.getItem(STORAGE_KEY) === 'true'
let button: HTMLButtonElement | null = null
let container: HTMLDivElement | null = null

export function initMusic(): void {
  audio = new Audio('/music/background.mp3')
  audio.loop = true
  audio.volume = 0.35

  // Hard fallback: some browsers silently ignore the loop attribute on
  // longer MP3s. Restarting manually on 'ended' guarantees the loop.
  audio.addEventListener('ended', () => {
    if (!muted && audio) {
      audio.currentTime = 0
      audio.play().catch(() => {})
    }
  })

  // Create container for both music and SFX toggles.
  container = document.createElement('div')
  container.id = 'sound-toggles'
  document.body.appendChild(container)

  button = document.createElement('button')
  button.id = 'music-toggle'
  button.setAttribute('aria-label', 'Toggle music')
  button.innerHTML = muted ? iconOff() : iconOn()
  button.addEventListener('click', (e) => {
    e.stopPropagation()
    toggleMusic()
  })
  container.appendChild(button)

  // Browsers block autoplay until a user gesture. We keep retrying on every
  // pointerdown until play() actually resolves so a failed first attempt
  // (e.g. gesture fired before the audio element was ready) doesn't
  // permanently silence the music.
  if (!muted) {
    schedulePlay()
  }
}

function schedulePlay(): void {
  const tryPlay = () => {
    if (muted || !audio) return
    audio.play()
      .catch(() => {
        // Still blocked — retry on the very next gesture.
        document.addEventListener('pointerdown', tryPlay, { once: true })
      })
  }
  document.addEventListener('pointerdown', tryPlay, { once: true })
}

function toggleMusic(): void {
  muted = !muted
  localStorage.setItem(STORAGE_KEY, String(muted))
  if (button) button.innerHTML = muted ? iconOff() : iconOn()

  if (audio) {
    if (muted) {
      audio.pause()
    } else {
      // The toggle click itself counts as a user gesture, so play() will
      // succeed here. schedulePlay() is a safety net if it somehow doesn't.
      audio.play().catch(() => { schedulePlay() })
    }
  }
}

function iconOn(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
  </svg>`
}

function iconOff(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
    <path d="M4.27 3L3 4.27l9 9v.28c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4v-1.73L19.73 21 21 19.73 4.27 3zM14 7h4V3h-6v5.18l2 2z"/>
  </svg>`
}

export function isMusicMuted(): boolean {
  return muted
}
