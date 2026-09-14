# Hanncrest Web & Store — Project Audit & Documentation Log

**Project Name**: Hanncrest Website & Web Store  
**Repository**: `vitals-site`  
**Domains**: `hanncrest.com` · `store.hanncrest.com`  
**Suite Portfolio**: Vitals, Breeze, StealthShare, Aura, WhisperType  
**Product Pricing & Variant IDs**:
- **Vitals Pro**: $14.99 one-time (Variant ID: `2123112`) · 14-day free trial · 3-Mac license limit
- **Breeze Pro**: $24.99 one-time (Variant ID: `2123131`) · 14-day free trial · 3-Mac license limit
- **StealthShare Pro**: $19.99 one-time (Variant ID: `2123137`) · 14-day free trial · 3-Mac license limit
- **Aura Pro**: $24.99 one-time (Variant ID: `2123139`) · 14-day free trial · 3-Mac license limit
- **WhisperType Pro**: $24.99 one-time (Variant ID: `2123167`) · 14-day free trial · 3-Mac license limit

---

## 1. What Has Been Added

- **Unified Product Subpages for All 5 Apps**:
  - Dedicated landing pages for each application:
    - `/vitals/`: System, process, and battery monitor.
    - `/breeze/`: Mac disk cleaner, tune-up, and app leftover sweeper.
    - `/stealthshare/`: File metadata scrubber and private share utility.
    - `/aura/`: AI writing assistant with Zero-AI human tone rewrite engine.
    - `/whispertype/`: On-device AI voice dictation with 25-item history and model memory management.
- **Dedicated How-To Guides & FAQ Pages**:
  - Added comprehensive How-To documentation for every app detailing installation, macOS permissions (Accessibility, Input Monitoring, Full Disk Access), and usage workflows.
  - Added dedicated License & Buying FAQ pages explaining Lemon Squeezy direct purchases, 3-Mac activation slots, license transfer/deactivation, and 14-day free trials.
- **Standardized Direct-Download Links**:
  - Linked all primary download buttons to stable `*-Latest.pkg` artifacts (`Vitals-Latest.pkg`, `Breeze-Latest.pkg`, `StealthShare-Latest.pkg`, `Aura-Latest.pkg`, `WhisperType-Latest.pkg`).

---

## 2. What Has Been Updated

- **Unified Navigation Header & Menus**:
  - Standardized the navbar and footer across all subpages so visitors experience identical navigation structure regardless of which product page they land on.
- **Feature Copy & Technical Alignment**:
  - Updated Aura page copy to emphasize the new "Zero-AI" natural human tone rewriting and local vs cloud engine capabilities.
  - Updated WhisperType copy to showcase the new 25-item transcription history, instant copy action, and on-device privacy.
- **Pricing & Tier Standardization**:
  - Aligned all pricing callouts to the unified **$19.99 one-time** tier with a 14-day free trial and 3-Mac activation limit.

---

## 3. What Has Been Fixed

- **Navigation Inconsistencies**:
  - Resolved mismatched header styles, missing cross-links between apps, and broken documentation links.
- **Outdated Package References**:
  - Removed outdated or dated `.pkg` download links and unified them to standard `*-Latest.pkg` URLs.
- **Permission & Privacy Disclaimers**:
  - Clarified macOS permission prompts so users understand why permissions like Input Monitoring or System Events are requested.

---

## 4. Requirements & Rules to Apply From Now On

1. **Direct-Download Link Integrity**:
   - All download links must strictly reference `*-Latest.pkg` for each app:
     - `https://store.hanncrest.com/downloads/Vitals-Latest.pkg`
     - `https://store.hanncrest.com/downloads/Breeze-Latest.pkg`
     - `https://store.hanncrest.com/downloads/StealthShare-Latest.pkg`
     - `https://store.hanncrest.com/downloads/Aura-Latest.pkg`
     - `https://store.hanncrest.com/downloads/WhisperType-Latest.pkg`
2. **Pricing Consistency Across All Channels**:
   - Every product page, comparison table, and checkout callout must strictly match the agreed pricing:
     - **Vitals Pro**: $14.99 one-time (Variant ID: `2123112`)
     - **Breeze Pro**: $24.99 one-time (Variant ID: `2123131`)
     - **StealthShare Pro**: $19.99 one-time (Variant ID: `2123137`)
     - **Aura Pro**: $24.99 one-time (Variant ID: `2123139`)
     - **WhisperType Pro**: $24.99 one-time (Variant ID: `2123167`)
   - All apps share a **14-day free trial** and a **3-Mac license limit**.
3. **Template & Menu Consistency**:
   - Whenever a navigation element, header, or footer is updated, the change must be mirrored across all 5 app subpages and auxiliary FAQ/How-To pages.
4. **App Feature Parity**:
   - Any major app capability update (e.g. WhisperType Studio, Aura tone rules, Breeze cleanups) must be immediately documented in the respective web page features section.
