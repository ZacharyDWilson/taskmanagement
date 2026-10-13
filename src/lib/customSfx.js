// Your own sound files. Drop audio into src/assets/sfx/ and name each file after the moment it plays
// (for example press.mp3, open.wav, intro.mp3). Anything you don't provide falls back to a built-in pack.
const files = import.meta.glob('../assets/sfx/*.{mp3,wav,ogg,m4a,webm,aac}', { eager: true, query: '?url', import: 'default' })

export const CUSTOM_SFX = Object.fromEntries(
  Object.entries(files).map(([path, url]) => [path.split('/').pop().replace(/\.[^.]+$/, '').toLowerCase(), url]),
)
export const HAS_CUSTOM_SFX = Object.keys(CUSTOM_SFX).length > 0

// The moments the app plays sounds for. Name your files after these.
export const SFX_CUES = ['loading', 'intro', 'celebrate', 'press', 'open', 'close', 'check', 'uncheck', 'success', 'info', 'notification', 'start', 'stop', 'complete']
