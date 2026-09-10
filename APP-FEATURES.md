# HANNCREST — full feature list, all apps

One reference doc listing every user-facing feature across the five HANNCREST
apps, so a feature comparison, bug report, or new site copy always starts from
the same source instead of five different READMEs. This is a summary index —
each app's own repo has the full detail (README/FEATURES.md/CONTEXT.md); links
below.

Last compiled: 2026-09-06, from each app's own README/FEATURES.md/App Store
metadata plus the most recent feature commits.

---

## Vitals — menu-bar system monitor

`com.vitals.app` (direct) / `com.vitals.monitor` (App Store) · macOS 13+ ·
Free + one-time Pro IAP ($14.99, 14-day trial) · full docs:
[`Vitals/README.md`](../Vitals/README.md), [`Vitals/CONTEXT.md`](../Vitals/CONTEXT.md)

**Free**
- Live menu-bar readout — CPU, memory, GPU load, VRAM, free disk space, network
  speed; the VRAM icon turns into a brain the moment a local model is loaded.
- Overview dashboard — 0–100 health score with the reason for anything below
  100, storage (pick which disk), memory, processor, graphics, live network.
- Desktop widget — same live cards as a floating panel, compact or full layout.
- 12 colour themes; choose which metrics show in the menu bar, add a mini-graph
  next to each, or collapse to one neutral icon for screen-sharing.
- Bug/feature-request reporter — optional screenshot/zip attachments (15MB
  cap), client-side email validation, resend-safe (no duplicate/misattributed
  attachments on a second send).
- More Apps hub — embedded, always-current list of the other HANNCREST apps.

**Pro (one-time)**
- Performance — per-core load reading the OS's own performance-tier names
  (`hw.perflevelN.name`, so M5/M6's 3-tier Super/Performance/Efficiency chips
  are labeled correctly instead of assuming 2 tiers), memory pressure &
  compression, GPU/VRAM, top processes by CPU/memory with one-click quit, a
  memory-leak watch, per-component temperatures, fan RPM, a throttling
  timeline that names the responsible process.
- Local AI tools — finds any local model server on any port (not a fixed
  list), reads Ollama's exact parameter size/quantization/VRAM held, a
  tokens-per-second speed test, scans model folders (LM Studio, Ollama,
  GPT4All, Jan, Hugging Face cache), watches models load/unload with a session
  log and a one-tap Quit to reclaim VRAM.
- Network — latency/jitter/drops, speed test, DNS benchmark, Wi-Fi scanner
  plus rolling signal/noise/roaming history, ping/traceroute with a live
  chart, open-ports scanner, router info, per-app bandwidth, monthly data-cap
  tracking, public IP/VPN status read only on request.
- Storage — S.M.A.R.T. health, running bytes-written total, read/write speed
  test, disk activity by app, Time Machine status, reclaimable-space scanner
  (correctly skips mounted disk images like installer `.dmg`s instead of
  scoring them as a failing drive).
- Energy — live wall-wattage draw shown alongside battery charge rate, time
  remaining from actual drain rate (not the system's rough guess), top energy
  users today, battery health/cycle count, Bluetooth device battery, Battery
  Vampire (Tame/Freeze-Resume/Force-Quit a draining process, optional
  watch-while-plugged-in), Sleep Drain report ("lost X% while asleep for Yh
  Zm" plus who held the wake lock).
- System — anomaly detection (learns the Mac's normal ranges), connected
  USB/Thunderbolt peripherals with negotiated speed, uptime/sleep history/what
  kept the Mac awake, crashes and panics explained in plain language, startup
  items, active-use time, camera/mic indicator, start/stop benchmark, a run
  recorder for comparing sessions.
- History & Reports — every resource logged once a minute, kept 30 days;
  area/column charts with peak/low marked, filtered by hour/day/week/month; a
  weekly report card; CSV/Numbers export.
- Alerts — thresholds for CPU/GPU/disk/battery/temperature/memory
  pressure/model load-unload, a once-a-day digest, optional push to phone via
  a free notification service.

---

## Breeze — Mac clean-up & tune-up

`com.breeze.app` · macOS 14+ · Free core + one-time Pro IAP ($24.99) · shares
its system-metrics engine with Vitals and cross-promotes it in-app · full docs:
[`Breeze/README.md`](../Breeze/README.md)

**Free**
- Smart Scan — one-click aggregate scan with a live Breeze Health Score (disk,
  memory, junk, startup, protection) and an all-volumes storage view.
- Storage — interactive map of where space is going, folder by folder, with
  right-click "Reveal in Finder."
- Applications — inventory with sizes & bundle IDs; uninstall an app *and*
  every leftover (preferences, caches, containers, launch agents, receipts).
- Memory — live pressure & composition, swap, compression ratio, top memory
  processes with one-click quit, purge inactive memory.
- Presets — one-tap cleanup bundles for common scenarios.
- Trash bins — empty every Trash on every mounted volume from one place.
- Safety model: scan → review → confirm; removed items go to Trash, never
  hard-deleted (except the Shredder, on explicit confirmation only); system,
  Apple, and SIP-protected paths are never touched.

**Pro (one-time)**
- System junk, Downloads sweep, Reclaim space (large & old files), Developer
  junk (Xcode DerivedData, device support, `node_modules`, etc.), Purgeable
  space (local Time Machine snapshots), System data breakdown, Duplicates
  finder (hash-based), Similar photos finder (perceptual hash), Shredder
  (secure overwrite-delete).
- Leftovers finder (orphaned files from already-deleted apps, including hidden
  `~/.name` folders), Unused-apps detector (real activity, not just
  Spotlight's date), Startup items, Extensions inventory, Updates detector
  (Homebrew/Mac App Store/Sparkle + pending macOS updates), App permissions
  (camera/mic auditor).
- Battery health/cycles, Network throughput + speed test, Energy (CPU hogs,
  energy-impact processes), Boot-time analysis, Disk speed benchmark, Disk
  trends (forecast of running low).
- Privacy & Privacy traces cleanup, Breeze Guard (real-time adware/suspicious
  startup-item watch).
- Auto-clean scheduling with low-space alerts + weekly digest, History log
  with undo.

---

## StealthShare — screen-share privacy

macOS 13+ · 14-day free trial, one-time $14.99 · full docs:
[`stealthshare/FEATURES.md`](../stealthshare/FEATURES.md)

- Privacy Mode master switch — popover toggle, global hotkey (⌘⇧P default),
  auto-detect, or calendar auto-arm; restores everything when turned off and
  never overrides a switch flipped by hand.
- Hide desktop icons and hide desktop widgets (full-screen frosted mask).
- Studio-backdrop wallpaper swap while sharing, restored after.
- Confidential app-window blurring, customizable list (Slack, WhatsApp, Mail,
  Messages, Safari Private on by default; Notes/Spotify off).
- Accidental-Paste Guard — blocks ⌘V of anything that looks like an API
  key/JWT/credit-card number (Luhn-checked)/private key/password while
  sharing; red warning flash is excluded from the shared feed; press ⌘V again
  within ~4s to override.
- Do Not Disturb control via two user-created Shortcuts (`StealthShare DND
  On`/`Off`).
- Notification Blocker + after-call summary of how long banners were held and
  which comms apps were running.
- Auto-detect meetings by app list (Zoom, Teams, Meet, Slack Huddles,
  FaceTime, custom) or by live camera/mic use — camera + mic in both builds.
  The sandbox blocks camera-in-use reads even with the entitlement (verified
  on-device), so the App Store build reads the macOS recording-indicator
  window instead, which needs no permission at all. Trade-off: macOS lights
  that indicator for screen recording too, so a screen recording can also
  auto-arm in the App Store build. Detection is mic/camera only — a meeting
  app merely being open or frontmost no longer counts, which used to arm
  Privacy Mode permanently for anyone who leaves Slack or Teams running.
- Calendar Auto-Arm — arms ~60s before scheduled Zoom/Teams/Meet events;
  works with Google and Exchange calendars.
- Global hotkey, launch at login, mode-toggle sound.
- More Apps hub + in-app bug reporter (sends only on tap, nothing in the
  background).

---

## Aura — offline local AI text assistant

macOS 14+ · one-time $24.99 · full docs: [`Aura/README.md`](../Aura/README.md)

- Select text anywhere, press ⇧⌘P — rewritten text streams back in place via a
  floating HUD; longer selections get a word-level diff review card
  (deletions red, insertions green) before Insert/Discard; `esc` cancels,
  leaving the original and clipboard untouched.
- Modes: Proofread (default), Improve Clarity, Formal/Academic, Friendly, Make
  Concise, Expand, Bullet Points, Custom Instruction — plus a second,
  always-proofread shortcut.
- Dashboard window — Rewrite scratchpad (works without cross-app focus,
  because it happens inside Aura), Voice, Presets, Engine, Model, General,
  Shortcuts.
- Voice Mirroring — measures the user's own writing style on-device from up to
  3 samples (sentence length, contraction habits, register, punctuation
  fingerprints, emoji use) and applies it to rewrites; deliberately excluded
  from Proofread.
- Four engines, auto-picked best available: Apple Intelligence (macOS 26+,
  free) → Aura's own downloadable model (MLX, 3 sizes, fully offline after
  download) → any local OpenAI-compatible server (LM Studio/Ollama/llama.cpp,
  loopback addresses only) → built-in `NSSpellChecker`-based deterministic
  cleanup (always available, Proofread only).
- One permission (Accessibility); reads the selection via AX or a synthesized
  ⌘C, writes the result back via clipboard+⌘V (or AX), restoring the previous
  clipboard afterward.
- Prompt-injection resistant — the selection is always treated as material to
  edit, never as instructions to the model.

---

## WhisperType — local voice dictation

macOS, Apple Silicon (Neural Engine) · one-time $19.99 · full docs:
[`WhisperType/README.md`](../WhisperType/README.md)

- Global hotkey (default ⌥Space) — toggle mode (press to start, press to stop
  & insert) or push-to-talk (hold to speak).
- Floating HUD with a live level meter while listening, a spinner while
  transcribing, a "Purr" sound on completion.
- Auto-stop on silence (default 3s, adjustable 1–10s, can be turned off); `esc`
  cancels anytime without inserting anything.
- Runs OpenAI Whisper models locally via WhisperKit/CoreML on the Neural
  Engine — audio is never written to disk.
- Four model sizes (`tiny.en`/`base.en`/`small.en`/`medium.en`) trading
  size/speed/accuracy; on-demand download with a live progress bar; a Storage
  panel to see and remove downloaded models.
- Auto-paste via a simulated ⌘V with the previous clipboard restored a moment
  later (or leave the transcription on the clipboard only, for manual paste).
- Menu bar icon + a status dot show idle/listening/transcribing at a glance.
- Requires Microphone + Accessibility permissions, with one-click buttons to
  the right System Settings pane.
