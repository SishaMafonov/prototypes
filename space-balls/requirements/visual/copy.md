# Copy and semantic checks
OpenCV texture matching does not read arbitrary text. Use DOM textContent/visibility,
or a separately validated text recognizer. Never pass exact copy from shape alone.
Source: [main](../../src/main.ts), [match](../../src/match.ts).

## V-TEXT-01 — menu and ready
| Selector | Expected |
| --- | --- |
| #selection-title | Pick your planet |
| .planet-name | chosen Earth/Jupiter/Lava/Ice |
| .planet-count | selected index+1 / 4 |
| .selection .confirm | Loading game… / Confirm / Game assets unavailable by stage |
| .load-status | Unable to load the game artwork. Please reload to try again. on error |
| .start-title | Tap or click to start |
| .start-hint | First to 10 points. Win by 2. |

## V-TEXT-02 — match and result
| Selector | Expected |
| --- | --- |
| .score-you strong / .score-opponent strong | exact known match scores |
| .match-rule | First to 10 · Win by 2 / Deuce · Win by 2 / Match point · You / Match point · Opponent / Match complete |
| .round-word | Ready? / Steady! / GO! / You score! / Opponent scores! by phase/scorer |
| .round-hint | Get ready for launch in countdown; Next round starting… in goal |
| #result-title | You win! or Opponent wins! |
| .result-you-score / .result-opponent-score | exact final match scores |
| #result-summary | Choose a new planet and play another match. |
| .new-game | New Game |

## V-TEXT-03 — microphone base states
| State | Toggle | Status when no drive/applied feedback |
| --- | --- | --- |
| off | Enable microphone | Mic off · Hold Boost or Space to play without a mic. |
| requesting | Cancel microphone | Allow microphone access in your browser to use your voice. |
| active | Turn mic off | Mic listening · Speak to light up your <Planet>. |
| paused | Resume microphone | Audio paused · Resume microphone or hold Boost. |
| denied | Enable microphone | Microphone permission declined · Use Boost or Space instead. |
| unavailable, secure | Enable microphone | No microphone available · Use Boost or Space instead. |
| unavailable, insecure | Enable microphone | Microphone needs HTTPS or localhost · Use Boost or Space instead. |
| error | Enable microphone | Could not start microphone · Try again or use Boost. |

## V-TEXT-04 — drive overrides
.voice-help: "Boost your <Planet> on the left when the asteroid enters its field."
In match playing, applied feedback takes precedence:
"<Planet> boosted the asteroid!"
Otherwise drive>.03 uses "Voice detected" if mic level>.03, else "Boost ready",
followed by " · Waiting for the asteroid in <Planet>'s ring."
Outside match playing it ends " · <Planet> is ready for the next launch."
Quiet canvas label=YOUR <PLANET>; drive label=VOICE ACTIVE or BOOST ACTIVE.
Check exact source punctuation; normalize whitespace only, not meaning.
Canvas label has no DOM text node: use controlled glyph rendering or an external recognizer.
Do not treat the unused generic active-status source string as the normal visible status.

```cv-config
[
{"id":"V-TEXT-01","exclude":"Exact text/semantic assertions are delegated to DOM/E2E tools."},
{"id":"V-TEXT-02","exclude":"Exact text/semantic assertions are delegated to DOM/E2E tools."},
{"id":"V-TEXT-03","exclude":"Exact text/semantic assertions are delegated to DOM/E2E tools."},
{"id":"V-TEXT-04","exclude":"Exact text/semantic assertions are delegated to DOM/E2E tools."}
]
```
