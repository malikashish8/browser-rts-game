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
    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
  </svg>`
}

function iconOff(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
    <path d="M16.5 12A4.5 4.5 0 0 0 14 7.97v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
  </svg>`
}

export function isMusicMuted(): boolean {
  return muted
}
