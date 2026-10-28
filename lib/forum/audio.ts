let audio: HTMLAudioElement | null = null

function getAudio(): HTMLAudioElement {
  if (!audio) {
    audio = new Audio('/bgm.mp3')
    audio.volume = 0.4
    audio.loop = false
  }
  return audio
}

export function toggleBgm() {
  const a = getAudio()
  if (a.paused) { a.play().catch(() => {}) } else { a.pause() }
}

export function isBgmPlaying() {
  return audio ? !audio.paused : false
}

export function playBgm() {
  getAudio().play().catch(() => {})
}

export function pauseBgm() {
  if (audio) audio.pause()
}
