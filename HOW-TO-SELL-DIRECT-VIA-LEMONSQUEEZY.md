# Selling a Mac app direct via Lemon Squeezy (license-key activation)

Reusable playbook for any Hanncrest app sold outside the Mac App Store
(store.hanncrest.com, on Lemon Squeezy). Reference implementation: **Vitals**
— `/Users/azzi/Vitals/Sources/Vitals/Pro.swift`, `LicenseAPI.swift`,
`PrefsView.swift`. Follow this doc for the next product (Breeze, Aura,
WhisperType, …) without re-deriving the approach from scratch.

## The model

The app downloads free/unactivated; a Lemon Squeezy purchase emails the buyer
a license key; the app has one text field where they paste it in; activation
calls Lemon Squeezy's API directly from the app — **no backend of your own**.

This slots into whatever "Pro" unlock seam the app already has as one more
source feeding the same boolean. Vitals' `Pro.swift` documents its sources as
A (StoreKit IAP), B (`-DPRO_BUILD` hardcode), C (Keychain trial); license-key
is **Source D**. If the target app has no such seam yet, build one first —
every gated feature should ask exactly one object one question
(`Pro.shared.has(...)` in Vitals), never check StoreKit/flags/keychain itself.

## 1. Lemon Squeezy store setup

1. In store.hanncrest.com, create the product (one-time purchase, match
   whatever price the App Store listing uses if there is one).
2. Product → **Advanced → License Keys** → enable. Lemon Squeezy generates a
   unique key per order automatically; no custom key-gen needed.
3. Set an **activation limit** (Vitals uses 3 — one purchase, a few Macs).
4. Attach the notarized DMG as the product's downloadable file, so checkout
   delivers "here's your download + here's your key" in one email.
5. You can build and test the app-side code (§2) against a $0 test product
   before the real one is live — the API contract doesn't change.

## 2. App side (Swift / SwiftUI, AppKit menu-bar or otherwise)

Copy the pattern, not the file — feature names and UI chrome differ per app.

**`LicenseAPI.swift`** — a small, key-less client for Lemon Squeezy's public
License API (`docs.lemonsqueezy.com/help/licensing/license-api`). No secret
ships in the app; the license key itself is the credential. Three calls:
`activate(key:instanceName:)`, `validate(key:instanceID:)`,
`deactivate(key:instanceID:)`, all POSTs to
`https://api.lemonsqueezy.com/v1/licenses/{activate,validate,deactivate}`
with form-encoded body and `Accept: application/json`. Wrap the whole file in
`#if DIRECT_BUILD` so it never links into the App Store target.

**`LicenseKeychain`** (private enum inside the Pro-gate file) — stores the
activated key **and** the `instance_id` Lemon Squeezy returns on activate
(needed later to validate/deactivate that specific machine). Keychain, not
UserDefaults: it survives an app delete/reinstall, matching the existing
trial-clock pattern in the same file.

**Wire it into the existing unlock object:**
- `recompute()` (sync, cheap): if a key is cached, optimistically treat as
  purchased — mirrors the trial clock's "immediate best guess" step.
- `refresh()` (async, authoritative): on the direct build, call
  `LicenseAPI.validate` instead of the StoreKit entitlement check.
  **Fail open on network errors** — keep the cached activation trusted if
  Lemon Squeezy can't be reached; only an explicit "not valid" response
  revokes it. This is the opposite default from privacy-gating logic
  elsewhere (e.g. StealthShare fails *closed*) — licensing and exposure
  carry opposite costs when uncertain, so don't copy that default reflexively.
- `activateLicense(_:)`: trims input, calls `LicenseAPI.activate`, saves
  key + instance_id to Keychain on success, sets the purchased flag.
- `deactivateLicense()`: best-effort remote deactivate (frees the activation
  slot), then always clears local state regardless of network result.

**UI**: one `TextField` + "Activate" button, shown only on the direct build
and only while unpurchased (`#if DIRECT_BUILD && !PRO_BUILD`) — swap it in
wherever the app's existing Buy/Restore buttons live. Add a small
"Deactivate license on this Mac" link inside the already-unlocked state.

**Build flags**: if the app doesn't already build a separate non-sandboxed
"direct" binary, add one. Vitals' `build_app.sh` always compiles
`-DDIRECT_BUILD` (that script only ever produces the direct DMG) and adds
`-DPRO_BUILD` on top when `PRO=1` is passed for a personal always-unlocked
build. The Mac App Store build (`build_appstore.sh` / the Xcode target)
defines neither, so it falls through to the StoreKit path untouched.

**Verify all three build configs compile** before shipping:
```bash
swift build                                            # App Store style — no flags
swift build -Xswiftc -DDIRECT_BUILD                     # sold direct, license-gated
swift build -Xswiftc -DDIRECT_BUILD -Xswiftc -DPRO_BUILD # personal/dev, always unlocked
```

## 3. Website

Add a "Buy Direct" button on the product's marketing page pointing at the
Lemon Squeezy checkout URL (`store.hanncrest.com/checkout/buy/<variant-id>`),
next to the Mac App Store link if one exists.

## 4. Known trade-offs (accepted, don't "fix" without reason)

- **Offline activation never happens.** The first `activate` call needs a
  network round trip — acceptable, it's a one-time step during setup.
- **Deactivating while offline doesn't free the remote slot.** The Mac locks
  locally either way; the license's activation-limit slot only frees once
  *some* Mac with that key reaches the API, or the buyer deactivates it from
  the Lemon Squeezy customer portal directly.
- **No periodic re-validation beyond launch.** `refresh()` runs once at
  startup; a refund revokes access on the customer's *next* launch, not
  instantly. Fine for a $15–20 utility; revisit only if chargebacks become a
  real problem.

## 5. Checklist for the next product

- [ ] Product created in Lemon Squeezy, license keys on, DMG attached
- [ ] `LicenseAPI.swift` copied in, wrapped in `#if DIRECT_BUILD`
- [ ] `LicenseKeychain` + `activateLicense`/`deactivateLicense`/`refreshLicense`
      added to the app's existing Pro/unlock object
- [ ] Activation `TextField` + button added to the direct build's UI only
- [ ] Direct build script defines `-DDIRECT_BUILD`; App Store target doesn't
- [ ] All three build configs (`plain`, `DIRECT_BUILD`, `DIRECT_BUILD+PRO_BUILD`)
      compile clean
- [ ] Website has a "Buy Direct" link to the Lemon Squeezy checkout
