# How to add an app to the HANNCREST family

A reusable checklist for standing up a new app the same way **Vitals** and **Breeze** are done —
a landing page on the shared site, a card in the cross-promo hub, and a decoupled "More Apps"
section inside the app itself. Do this once per app (StealthShare, Aura, WhisperType, …).

Two moving parts:

1. **The website** (`vitals-site` repo → auto-deploys to `hanncrest.com` via Vercel, and to
   `azziolfati-hash.github.io/vitals-site/` via GitHub Pages).
2. **The app** (each app embeds the shared hub in a `WKWebView`, so the app list updates when the
   *website* changes — no app rebuild).

Throughout, replace `APP` with the lowercase app slug (e.g. `stealthshare`) and `App Name` with
the display name.

---

## Part A — the website

### 1. Assets
- Icon: `assets/apps/APP.png` (square, ~120px+; extract from the app's `.icns`/AppIcon). These
  already exist for all five apps.
- Screenshots: put clean, dialog-free captures in `assets/shots/APP/`. Only publish shots with no
  system permission dialogs on screen. If you don't have clean screenshots yet, lean on an
  animated in-page preview (see Breeze's hero in `breeze/index.html`) plus a single hero shot.

### 2. Landing pages — copy Breeze's, then rewrite
Breeze is the cleanest template. Copy the folder and edit:
```bash
cp -R breeze APP        # gives APP/index.html, APP/privacy.html, APP/support.html
```
In all three files:
- Set a per-app **accent gradient** in `:root` (`--g1`, `--g2`) so each app has its own identity
  (Vitals = pink→purple, Breeze = cyan→blue). Keep the same layout/tokens.
- Update `<title>`, `<meta name="description">`, the favicon (`../assets/apps/APP.png`), the nav
  brand, hero copy, feature cards, the split section, pricing, privacy and support copy.
- Point image `src`s at `../assets/shots/APP/…`.
- Keep the footer, HANNCREST link (`href="/"`), and `contact@hanncrest.com`.
- **Pricing/download links:** if price isn't final, leave the `<span class="ph">price soon</span>`
  / `link soon` placeholders in place rather than inventing a number.

### 3. Promote the app in the two listings
When the app is ready to be shown as live (not "coming soon"):

- **`apps.html`** (the embedded hub) — turn the `<div class="card soon" data-app="APP">…</div>`
  into a link:
  ```html
  <a class="card" href="APP/" data-app="APP">
    …<h2>App Name <span class="chip">Free + Pro</span></h2>…
    <span class="link">Learn more →</span>
  </a>
  ```
- **`index.html`** (the hanncrest.com home) — turn the matching `<div class="app soon reveal">`
  into `<a class="app reveal" href="APP/">` with `<span class="chip live">Available now</span>`
  and a `<span class="go">Explore App Name <span class="arrow">→</span></span>`.

Leave apps that aren't ready as `card soon` / `app soon` — the hub is happy to mix live and
coming-soon cards.

### 4. Verify, commit, push
```bash
python3 -m http.server 8000    # then open http://localhost:8000/APP/ and http://localhost:8000/apps.html
git add -A && git commit -m "APP: landing page + promote in hub" && git push
```
Pushing to `main` auto-deploys to **hanncrest.com** (Vercel) and GitHub Pages. Give the CDN a
minute, then confirm `https://hanncrest.com/APP/` returns 200.

---

## Part B — the app (the "More Apps" section)

Every app embeds the **same** hub page, so this code is nearly identical across apps — only the
`UserDefaults` override key and the offline copy change. Reference implementation:
`Breeze → Sources/CleanUp/Features/MoreApps/MoreAppsView.swift`.

### 1. Drop in the hub view
Copy `MoreAppsView.swift` into the app and adjust three things:
```swift
enum AppLinks {
    static let defaultHubURL = "https://www.hanncrest.com/apps.html"   // same hub for every app
    static var hubURL: URL {
        let s = UserDefaults.standard.string(forKey: "APP.hubURL") ?? defaultHubURL   // per-app key
        return URL(string: s) ?? URL(string: defaultHubURL)!
    }
}
// …and the offline text: "More from the makers of App Name"
```
Everything else (the `WKWebView` wrapper, link-clicks-open-in-browser, offline fallback) is
unchanged. Repoint without a rebuild: `defaults write <bundle-id> APP.hubURL "https://…"`.

### 2. Wire it in
- Add a section/route that renders `MoreAppsView()` (windowed apps) or `MoreAppsPage()` embedded in
  a settings/dashboard tab (menu-bar apps, as Vitals does).
- Add a quiet sidebar/menu entry point ("More Apps · from HANNCREST → Discover our other Mac apps").
- Delete any old hardcoded cross-promo view — it's now dead code.

### 3. Entitlement (sandboxed / App Store builds only)
Add `com.apple.security.network.client` to the entitlements so the web view can load the hub.
Non-sandboxed Developer-ID builds need nothing.

### 4. Rules that keep App Review happy
- The hub loads **in place**; every link click opens in the user's **browser**
  (`NSWorkspace.shared.open`, return `.cancel`) — never navigate arbitrary pages inside the panel.
- Link to each app's **App Store page** where possible, not to outside downloads.
- No private-API background hacks; guard `underPageBackgroundColor` with `if #available(macOS 12,*)`.

---

## Part C — the "Report a Bug" reporter

Every app ships the same user-initiated bug reporter that POSTs JSON to **one shared endpoint**
(`https://hanncrest.com/api/report-bug`), tagged by the `app` field. Reference implementations:
`Vitals → Sources/Vitals/BugReport.swift` and `Breeze → Sources/CleanUp/Features/BugReport/BugReportView.swift`.

### 1. Drop in the reporter
Copy `BugReportView.swift` and change four things:
```swift
enum BugReportConfig {
    static let defaultEndpoint = "https://hanncrest.com/api/report-bug"   // shared by every app
    static let appTag = "APP"                                            // this app's tag
    static var endpoint: URL {
        let s = UserDefaults.standard.string(forKey: "APP.bugReportURL") ?? defaultEndpoint
        return URL(string: s) ?? URL(string: defaultEndpoint)!
    }
}
```
- Point `proStatus` at the app's own license (`LicenseStore.shared` in Breeze, `Pro.shared` in
  Vitals) — or drop it if the app has no Pro tier.
- Map the outcome/header colors to the app's `Palette`.
- Update the header copy ("…the makers of App Name").

Everything else is identical: the `BugReporter` (collect → preview → POST), the two-tier privacy
model, and the `BugReportView` sheet.

### 2. Wire it in
- Add an observable flag (`var showBugReport = false`) to the app model.
- Present the sheet where the main UI lives: `.sheet(isPresented: $model.showBugReport) { BugReportView() }`.
- Add an **app-menu item** "Report a Bug…" that opens the window and flips the flag.
- Optional but nice: a visible entry in the app's settings/control panel (Breeze adds a
  "Report a bug" row that calls `onOpen(nil); model.showBugReport = true`).

### 3. The privacy contract (keep it intact — reviewers rely on it)
- **Nothing is ever sent in the background** — only on an explicit "Send Report" tap.
- **Basic tier (always):** the user's message, app version/build, macOS version, and an email
  *only if they typed one*.
- **Diagnostics tier (opt-in toggle):** an anonymous hardware/state profile (Mac model, CPU/RAM,
  locale, uptime, thermal state, Pro status). No name, account, files, location, or persistent id;
  the report id is random per report. The user can inspect the exact JSON ("Show exactly what will
  be sent") and, if the endpoint is down, **Copy details** to send by hand.

### 4. The backend
The endpoint is a single Vercel serverless function shared by all apps — **`api/report-bug.js`** in
this repo (see `api/README.md`). It tags by the `app` field and emails each report via direct SMTP
through hanncrest.com's own mailbox (Purelymail), with a clear subject (`🐞 [AppName] <snippet> —
vX.Y.Z`). A new app needs **no backend work** — just send the same JSON with its own `app` tag. To
enable email delivery, set `SMTP_USER` and `SMTP_PASS` in Vercel; until then it returns 200 and
logs the report. The per-app URL is overridable without a rebuild via
`defaults write <bundle-id> APP.bugReportURL "…"`.

---

## Why it's built this way
The app list, prices, copy and links live on **one web page**. Change the website and **every app
updates instantly — no rebuild, no resubmit.** Only the hub URL is baked into each binary, and even
that is overridable at runtime. See `.claude/skills/decoupled-cross-promo` for the full rationale.
