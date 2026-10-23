// Word/sentence pronunciation through the browser's built-in speechSynthesis.
//
// Every SpeakButton call site (Vocab, Grammar, Kanji, Verb Forms,
// Transitivity, Usage, Homophones, Counters) goes through speak() below.
//
// This used to have a second, self-hosted VOICEVOX backend (a Docker sidecar
// proxied through nginx). It was removed: the engine image is a multi-GB
// download that burns CPU on every tap, for audio that can't work offline and
// can't be bundled with a static deploy. The browser voice has no setup, works
// offline, and on current Chrome/Edge/Safari the best installed Japanese voice
// (see pickJapaneseVoice) is a neural one.
//
// The app's primary target is an iPhone PWA, which shapes two choices here:
//  - speak() does no async work before calling synth.speak() - iOS Safari only
//    allows speech synthesis to start synchronously within the tap that
//    triggered it.
//  - Voices load asynchronously and getVoices() can legitimately keep
//    returning [] on iOS even once a Japanese voice is available - so "no
//    cached voice yet" must never disable the button; lang="ja-JP" with no
//    explicit `voice` still speaks correctly through the system default.

let cachedVoices: SpeechSynthesisVoice[] = []
const voiceListeners = new Set<() => void>()

export function isSpeechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window
}

function refreshVoices() {
  if (!isSpeechSupported()) return
  const list = window.speechSynthesis.getVoices()
  if (list.length > 0) cachedVoices = list
  for (const l of voiceListeners) l()
}

if (isSpeechSupported()) {
  refreshVoices()
  window.speechSynthesis.addEventListener("voiceschanged", refreshVoices)
}

// Neural / premium voices sound far more natural than the compact defaults:
// Edge ships "Microsoft Nanami Online (Natural)", Chrome has "Google 日本語",
// Apple has Kyoko/O-Ren/Otoya (and the downloadable Enhanced/Premium builds).
const QUALITY_VOICE = /natural|neural|online|premium|enhanced|google|kyoko|o-?ren|otoya|siri/i

// Exact 'ja-JP' beats a looser 'ja-*' match; a higher-quality voice beats a
// plain one. Network-backed voices fail silently when the device is offline,
// so while offline an on-device voice wins instead of just getting a bonus.
// Reads whatever is cached right now; never waits for more voices to arrive.
function pickJapaneseVoice(): SpeechSynthesisVoice | null {
  const ja = cachedVoices.filter(v => v.lang.toLowerCase().replace("_", "-").startsWith("ja"))
  if (ja.length === 0) return null
  const online = typeof navigator === "undefined" || navigator.onLine !== false
  const score = (v: SpeechSynthesisVoice) =>
    (v.lang.toLowerCase().replace("_", "-") === "ja-jp" ? 2 : 0) +
    (QUALITY_VOICE.test(v.name) ? 3 : 0) +
    (v.localService ? (online ? 1 : 10) : 0)
  return ja.slice().sort((a, b) => score(b) - score(a))[0]
}

/** Name of the Japanese voice speak() will use right now, or null if the
 *  device hasn't exposed one (it then falls back to the system default). */
export function getJapaneseVoiceName(): string | null {
  return pickJapaneseVoice()?.name ?? null
}

/** Notifies when the browser's voice list (re)loads, for Settings' voice label. */
export function subscribeVoices(listener: () => void): () => void {
  voiceListeners.add(listener)
  return () => voiceListeners.delete(listener)
}

// ---------------------------------------------------------------------------
// Shared "who's speaking right now" store, read via useSyncExternalStore --
// so a SpeakButton can pulse while its own utterance is playing.
// ---------------------------------------------------------------------------
type Listener = () => void
const listeners = new Set<Listener>()
let activeId: string | null = null

function setActiveId(id: string | null) {
  if (activeId === id) return
  activeId = id
  for (const l of listeners) l()
}

export function getActiveSpeechId(): string | null {
  return activeId
}

export function subscribeSpeech(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// The one utterance currently in flight. Guards onend/onerror against firing
// for an utterance that's no longer the current one - e.g. a second tap that
// calls cancel() can still leave the first utterance's onerror queued, and
// without this check it would clear the *new* utterance's active/pulsing
// state instead of its own.
let currentUtterance: SpeechSynthesisUtterance | null = null

export function cancelSpeech() {
  currentUtterance = null
  setActiveId(null)
  if (isSpeechSupported()) window.speechSynthesis.cancel()
}

interface SpeakOptions {
  /** Identifies this utterance to the active-speech store; pass the same id
   *  a SpeakButton was given so it can highlight itself while playing. */
  id: string
  /** 0.5-2. Learners benefit from slightly-slower-than-native speech; 1 is
   *  the voice's normal rate. */
  rate?: number
}

export function speak(text: string, { id, rate = 0.85 }: SpeakOptions): boolean {
  const trimmed = text.trim()
  if (!trimmed || !isSpeechSupported()) return false
  const synth = window.speechSynthesis
  synth.cancel()

  const voice = pickJapaneseVoice()
  const utterance = new SpeechSynthesisUtterance(trimmed)
  utterance.lang = voice?.lang ?? "ja-JP"
  if (voice) utterance.voice = voice
  utterance.rate = rate

  currentUtterance = utterance
  utterance.onstart = () => {
    if (currentUtterance === utterance) setActiveId(id)
  }
  const finish = () => {
    if (currentUtterance !== utterance) return
    currentUtterance = null
    setActiveId(null)
  }
  utterance.onend = finish
  utterance.onerror = finish

  synth.speak(utterance)
  return true
}
