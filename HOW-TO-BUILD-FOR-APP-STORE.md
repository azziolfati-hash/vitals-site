# How to build a HANNCREST app for the Mac App Store

A reusable checklist for the **sandboxed App Store build** — the pipeline that produces a
real-team-signed app you can install to `/Applications` for runtime testing, and eventually
submit to App Store Connect. Reference implementation: **Vitals** —
`Vitals → project.yml` + `Vitals → build_appstore.sh`. Copy that pair for a new app and change
only what's called out below.

This is a different pipeline from direct sale (Developer ID + notarization, e.g. Vitals'
`build_app.sh`/`release.sh`) — App Store builds run **sandboxed**, direct-sale builds don't.
See `SHIPPING.md` in each app's repo for the direct-sale side.

---

## 1. One-time account setup (per Apple ID, not per app)

- A **paid Apple Developer Program** membership ($99/yr) — confirm it by checking whether an
  **Apple Distribution** certificate can be generated (free accounts can't get one).
- Xcode signed in: **Xcode ▸ Settings ▸ Accounts**.
- An **Apple Development** certificate for this Mac: **Manage Certificates ▸ + ▸ Apple
  Development**. Enough on its own to build, sign, and run a sandboxed build locally — you do
  **not** need the Distribution cert until an actual App Store Connect upload.
- **The WWDR intermediate certificate must be current.** If `security find-identity -v
  -p codesigning` shows **0 valid identities** even though a cert exists in Xcode's list, this
  is almost always the cause — check before assuming the certificate itself is broken:
  ```bash
  security find-certificate -a -c "Apple Worldwide Developer Relations" -p /Library/Keychains/System.keychain | openssl x509 -noout -dates
  ```
  If it's expired (an old **G1** cert expires Feb 2023), download the current one and install
  it into your **login** keychain via Keychain Access (double-click the `.cer`, pick "login" in
  the Add Certificates dialog — `security list-keychains` shows what's actually in the codesign
  search path, usually just login + System):
  ```
  https://www.apple.com/certificateauthority/AppleWWDRCAG3.cer
  ```
  After that, `security find-identity -v -p codesigning` should show your cert(s) as valid.

Certs and profiles are tied to the **Apple ID/team**, not a specific Mac — moving to a new Mac
only means regenerating a Development cert there and re-checking the WWDR chain, nothing about
the app itself changes.

## 2. Per-app project setup (`project.yml`)

Use XcodeGen so the Xcode project is generated, not hand-maintained. Copy Vitals' `project.yml`
and change:
- `name` / `bundleIdPrefix` → the app's own reverse-DNS prefix.
- `DEVELOPMENT_TEAM` → your Team ID (constant across every app on the same Apple ID — Vitals
  uses `RT47TD97E4`). Find it in the cert's OU, not the `(XXXXXXXXXX)` suffix in the cert's
  display name — that parenthetical is a per-**account** common-name id, identical across every
  cert this Apple ID generates on any Mac, and is easy to mistake for the team.
- `CODE_SIGN_ENTITLEMENTS` → the app's own entitlements file, with **`com.apple.security.app-sandbox`
  set true** plus only the specific capabilities the app actually needs (network client,
  `temporary-exception` file-read paths, app groups, etc.) — over-asking invites App Review
  pushback, under-asking crashes at runtime.
- `INFOPLIST_KEY_LSApplicationCategoryType`, `ITSAppUsesNonExemptEncryption`, and the two
  `NSLocation*UsageDescription` keys (or whichever usage-description keys the app's own
  permissions need) — set these up front, not at archive time, so the generated project never
  needs manual Info.plist edits.

Regenerate any time with `xcodegen generate`.

## 3. The build script (`build_appstore.sh`)

Copy Vitals' script and change `IDENTITY` (must match your cert's exact display name — e.g.
`"Apple Development: Your Name (XXXXXXXXXX)"`, verify with `security find-identity -v
-p codesigning`), `TEAM`, and the app name/bundle id. The pattern:

1. `xcodegen generate` — keep the project in sync with `project.yml`.
2. `xcodebuild ... CODE_SIGNING_ALLOWED=NO build` — build unsigned. (Automatic signing needs a
   real App Store provisioning profile you won't have yet; manual codesign with the dev cert
   works without one.)
3. `codesign --force --sign "$IDENTITY" --entitlements <path> "$APP"` — sign by hand.
4. `codesign --verify --deep --strict` — fail loudly if signing didn't take.
5. **Install straight to `/Applications`** (`cp -R`, then strip the quarantine flag with
   `xattr -dr com.apple.quarantine`) — this is the step that makes "build the App Store
   version" actually produce a real, launchable, checkable app instead of just a build artifact
   sitting in derived data. `/Applications` is group-writable by `admin` on a normal single-user
   Mac, so this needs no `sudo`. A real installed app is also what any other installed-apps
   scanner (e.g. Breeze's cleanup tool) will see — useful for confirming the install actually
   "took."
6. Optionally also `pkgbuild` an installable `.pkg` — handy for testing the install experience
   itself or handing a build to another tester, but not required just to get a working local
   copy.

## 4. Runtime-test the sandbox

A `temporary-exception` entitlement lets code *compile and be granted* access — it doesn't
prove the actual syscalls succeed under sandbox the way they do unsandboxed. After installing:
open **Console.app**, filter on `sandboxd`, and exercise every feature that touches the
filesystem, network, or other processes, watching for denials. Anything blocked either needs a
narrower/broader entitlement or has to be dropped from the sandboxed build and kept as a
direct-sale-only feature (document it in that app's `SHIPPING.md`, the way Vitals does for its
disk-health SMART/NVMe read).

## 5. Actual App Store Connect submission (separate from local testing)

Everything above gets you a working local build. An actual upload additionally needs:
1. Register the app's bundle ID(s) (and any App Group) in App Store Connect / the developer
   portal.
2. Swap `IDENTITY`/the project's signing for the **Apple Distribution** certificate, and let
   Xcode manage the Distribution provisioning profile (Team stays the same).
3. `Product ▸ Archive ▸ Distribute App ▸ App Store Connect` in Xcode, or `xcodebuild archive`
   + `-exportArchive` with an `ExportOptions.plist`.

Nothing in `project.yml` or the entitlements needs to change for this — the sandbox/entitlement
work from steps 2–4 carries over directly.

---

## Why it's built this way

Sandboxed and direct-sale are genuinely different products (different bundle ID, different
entitlements, sometimes different feature sets) built from the **same source tree** via two
separate scripts — no branching, no `#if` maze beyond gating truly sandbox-incompatible APIs
(e.g. `DIRECT_BUILD`-only private-API features). Keeping the App Store script's last step as a
direct `/Applications` install (rather than stopping at "produced a signed .app somewhere")
means "build the App Store version" and "I have a real app to test" are the same action, not
two.
