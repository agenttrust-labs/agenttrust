# Phase R — UI gap analysis (web/ scope only)

**Date:** 2026-05-08. **Branch:** `ui/r-presentable-v1`. **Scope (locked by Mohit):** `/web` only — `docs-site/`, `mcp/`, `trustgate/`, `programs/`, `examples/`, `tests/`, and `status-page/` are out of scope. Per `docs/proofs/HOSTED_SURFACES.md`, the live URL inventory is the source of truth and every CTA the landing exposes must hit a working live surface.

This is a planning doc. **No code changes have been made.** First Mohit reads, picks the order, and approves component-by-component; only then does the branch start receiving commits.

---

## 1. What www.agenttrust.tech currently is

Single Next.js 16 app at `web/` with one composed landing page (`web/app/page.tsx`). Visitor sees, in order:

```
TopNav  →  SectionMarkers (right rail)  →  Hero  →  BenchmarkSection
   →  StorytellingSection  →  PerformanceSection  →  PlugAndPlaySection
   →  NetworkSection  →  TrilemmaSection  →  ExploreSection
   →  EventsSection  →  MediaSection  →  FooterSection
```

Locked aesthetic per `HOSTED_SURFACES.md` rule 4: Fraunces (editorial) + Geist (UI), cream/ink palette, electric purple `#6F4CFF` (matches `web/data/heroGeometry.ts:14` `accent: "#6f4cff"`). Locked craft reference: `docs-site/references/monad-docs/NOTES.md` (out of scope to read but the aesthetic intent is in scope).

Headless 1440×900 page-load probe: HTTP 200, **zero console errors / warnings**, accessibility tree complete. The structural plumbing is healthy. What's wrong is **content** and **what's surfaced**, not the build pipeline.

---

## 2. Live-page audit — section-by-section

For each section: `(a)` what it renders, `(b)` what's missing or stale relative to post-Phase-Q reality (Pay.sh integration, `@agenttrust-sdk/mcp@0.2.6`, 6 hosted surfaces live, 6 Kani proofs / 635 sub-checks, 10 capability namespaces seeded, 4-tx chained-validation trace, 9 GitHub releases — per `docs/proofs/phase-h-report.md`, `phase-p-llm-routing.md`, `phase-m-mcp-e2e.md`, `HOSTED_SURFACES.md`), `(c)` what's redundant, `(d)` what's mis-prioritized.

### 2.1 Hero — `web/components/Hero.tsx` + `web/data/hero.ts`

`(a)` Foundation line: "Live on Solana devnet - identity, policy, and feedback checks before settlement." Headline: "Trust AI-agent payments before settlement." Body: "AgentTrust ties payment decisions to identity, reputation, and policy. Pay.sh proves the first live x402 route; the same trust path can follow the next facilitator." Two CTAs: "Integrate SDK" → `docs.agenttrust.tech/getting-started/quickstart`, "Read the Documentation" → `docs.agenttrust.tech`. Right-side hero panel renders 4 stats from `HERO_STATS` and an SDK panel with `npm install @agenttrust-sdk/trustgate` + a 7-line demo terminal.

`(b)` **Missing — the Foundation-alignment wedge.** The locked narrative (`docs/COMPLETING-THE-TRUST-STACK.md` ¶1, README ¶51, pitch-video Variant B Beat 2) frames AgentTrust as completing the third leg Quantu archived in v0.5.0, with **day-one Pay.sh integration** (the Solana Foundation's first x402 facilitator, launched 2026-05-05 with Google Cloud). None of that lands in the hero — Pay.sh is mentioned as a generic "first live x402 route" without the Foundation context, and the third-leg / ERC-8004 differentiator is invisible.

`(b)` **Missing — proof and live-surface CTAs.** README has a 6-row "Get started in 60 seconds" surface table; the hero exposes one (npm SDK) plus GitHub. `demo.agenttrust.tech` (live `/protected` round-trip), `mcp.agenttrust.tech` (hosted MCP), `api.agenttrust.tech` (facilitator), `npm @agenttrust-sdk/mcp@0.2.6`, and the three deployed devnet program IDs (Solana Explorer-clickable) are all live and absent from the hero.

`(b)` **Stale — Kani 5/5.** `web/data/stats.ts:9` HERO_STATS reads `"5 / 5"` for "Invariants verified". Reality (Phase J5 + `kani-summary.txt` + README badge + pitch-video Beat 5): **6 invariants, 635 sub-checks, ~64 s.** The 6th (`gate_payment_strict_correctness`, 258 sub-checks, 0.9 s) is the load-bearing one for the atomic-tx invariant.

`(b)` **Stale — `KANI_HARNESS_NAMES` is 5 elements** (`web/data/stats.ts:13–19`). Missing `gate_payment_strict_correctness`. Currently unused by any rendered component (grep `web/components/` returns zero hits) but still misleading as a data source.

`(b)` **Banned — `localhost` in published copy.** `web/data/heroSdk.ts:50` ships `"pay --sandbox curl http://localhost:3402/protected"` as a terminal line. HOSTED_SURFACES rule 3: every code sample in published surfaces must run as-is against the live hosted endpoint. Replace with `https://demo.agenttrust.tech/protected`.

`(c)` **Redundant — the `/health` and `/protected` story sits in the hero terminal but PerformanceSection's "Identity / Policy / Feedback" labels and StorytellingSection's three panels say almost the same thing in different costumes.** Hero's terminal already tells the trust-path story (parseRequest → gate_payment Allow → SERVICE signature → SPL transfer + emit_feedback). Three more sections then re-tell it without new information.

`(d)` **Mis-prioritized — body copy buries the wedge.** The body sentence mentions Pay.sh second, after a generic "ties payment decisions to identity, reputation, and policy" line. The locked Variant B opener ("AgentTrust gates AI-agent payments on Solana — by counterparty trust") and the COMPLETING-THE-TRUST-STACK ¶1 ("smart contracts held up; the human-trust layer didn't") are both sharper.

### 2.2 BenchmarkSection — `web/components/BenchmarkSection.tsx` + `web/data/benchmark.ts`

`(a)` Two-line title only: "A new benchmark / for agent trust." No body. No stat. No artifact link.

`(b)` This is the natural home for the proof bar — **6/6 Kani proven · 635 sub-checks · 50 anchor tests · 360 total tests · 9 GitHub releases · MIT** — none of which exists anywhere on the page. README §"Test coverage" is the source.

`(c)` Title-only sections add scroll length without adding judge-impression. As a one-line reveal it's pleasant Monad-style craft, but `BenchmarkStatement` could carry a small proof-bar without breaking the rhythm.

`(d)` It's positioned right after the hero — the highest-attention slot. Currently it spends that slot on a typographic flourish.

### 2.3 StorytellingSection — `web/components/StorytellingSection.tsx` + `web/data/storytelling.ts`

`(a)` Three panels (Identity → Policy → Feedback), each with eyebrow + title + body + "Read X" docs link, side-locked Lottie visuals from `web/data/monadBenchmarkVisuals.ts`. CTAs link to `/getting-started/architecture-overview`, `/sdk/gate-payment`, `/programs/trustgate`.

`(b)` Solid section. **The one stale link:** panel 3's CTA goes to `/programs/trustgate` (TrustGate doc) but the panel narrates "Make trust decisions auditable / Feedback records the reason a route passed or stopped" — `/sdk/atomic-tx-invariant` or `/programs/validation-registry` would tighten the link semantics.

`(c)` The 3-panel Identity/Policy/Feedback frame **also runs in PerformanceSection** (`PERFORMANCE_SECTION_LABELS = ["/ Identity first", "/ Policy in path", "/ Feedback recorded"]`) and **NetworkSection** (`NETWORK_SIGNALS` — three articles "Recipient known / Rules enforced / Receipt emitted") and **TrilemmaSection** (`TRILEMMA_COPY.pillars = [Identity, Policy, Feedback]`). Four sections repeat the same I/P/F triad with different visuals.

`(d)` Strong section, but it earns its weight only if the three subsequent re-tellings get pruned or differentiated.

### 2.4 PerformanceSection — `web/components/PerformanceSection.tsx` + `web/data/performance.ts`

`(a)` Eyebrow labels `/ Identity first / Policy in path / Feedback recorded`. Headline "One trust layer. / Every *agent* payment." Then `PerformanceScroll` with stats cards (`PERFORMANCE_STATS`) and a 80-bar decorative bar chart from `PERFORMANCE_BARS`.

`(b)` **Stale — `PERFORMANCE_STATS` reads `5 / 5`** (`web/data/performance.ts:60`). Same Kani staleness as hero. Also `PERFORMANCE_STATEMENT` is poetic ("AgentTrust keeps identity, policy, and feedback in one Solana-native decision path") but contains no provable fact a judge can copy-paste.

`(b)` **`PERFORMANCE_BARS` is a hand-tuned random sequence of 80 heights** (`web/data/performance.ts:68–149`) — purely decorative, doesn't represent any measured metric. Could either ship as a clearly-decorative element (renamed) or be replaced with a real chart sourced from `docs/proofs/kani-summary.txt` (sub-check counts per harness) or `phase-f-verification-report.md` (test-count delta).

`(c)` Eyebrow labels duplicate Storytelling's Identity/Policy/Feedback panels. Stats list (`Trust checks: 3 / Settlement path: 1 tx / Invariants verified: 5 / 5 / Live route: Pay.sh`) duplicates HERO_STATS (`Trust checks: 3 / Atomic settlement: 1 tx / Invariants verified: 5 / 5 / Open-source license: MIT`). Three of four numbers are identical.

`(d)` This slot wants to be the proof-density section but its main visual is decorative bars and its main copy duplicates the hero. High-impact section under-used.

### 2.5 PlugAndPlaySection — `web/components/PlugAndPlaySection.tsx` + `web/data/plugAndPlay.ts`

`(a)` Title "Plug and play." Two-segment copy. CTA "Check Integration Briefing" → quickstart. Three rows of horizontally-marquee'ing chips:
- Row 1: Identity / Policy / Feedback / SERVICE Signature / Gate Decision / SPL Transfer / Receipt
- Row 2: SDK / Verifier / Replay Cache / Proof Validator / Policy Route / Audit Trail / Devnet
- Row 3: Pay.sh / Dexter / atxp_ai / MCPay / Adapter / Route / Atomic Tx

`(b)` **The four facilitator names live here as moving chips, not as the actual integrations grid the README + COMPLETING-THE-TRUST-STACK call for.** README §"How it composes with x402 facilitators" frames Pay.sh as the canonical Foundation-launched adapter and Dexter/atxp/MCPay as drop-in adapters that share a `FacilitatorAdapter` interface. **Status nuance** that needs a Mohit copy decision: `docs-site/content/docs/index.mdx` calls Pay.sh "live", Dexter "in flight", atxp_ai/MCPay "roadmap"; `phase-h-report.md` shows the hosted facilitator at `api.agenttrust.tech` advertises `adapters: ["pay-sh"]` only. **Question for Mohit (don't decide myself):** does the landing's facilitator section say "1 live, 3 drop-in adapters ready" (matching docs/index) or "4 facilitator adapters" (matching the README's Component-2 framing)? Both are true, but the framing changes per surface.

`(c)` Marquee-chip novelty has limited information density compared to a 4-tile facilitator grid (logo / name / status pill / docs link). The chips are kinetic decoration; a tile grid would be a CTA surface.

`(d)` This is the only place on the landing the facilitator names appear — they deserve more than chip-confetti.

### 2.6 NetworkSection — `web/components/NetworkSection.tsx` + `web/data/network.ts`

`(a)` Headline "Bring any route. / Keep trust intact." Body "AgentTrust owns the decision path: who is paid, which rules apply, and what feedback is recorded. Adapters only translate the route around it." CTA "Add A Route" → docs/integration-guides/facilitator-adapters. Three feature articles `/ Trust contract / / Live x402 route / / Next route`. Right-rail signals: 3 `NETWORK_SIGNALS` repeating the I/P/F frame again (Recipient known / Rules enforced / Receipt emitted). Plus `NetworkGlobe` visual.

`(b)` Most prose-heavy section that says the least new. The "AgentTrust owns the decision path" claim is exactly the wedge the hero already established (post-update). Without numbers, program IDs, or the chained-validation trace, this section is paraphrase.

`(c)` `NETWORK_SIGNALS` is the third or fourth occurrence of Identity/Policy/Feedback as a 3-card row.

`(d)` The "Add A Route" CTA is the highest-leverage developer-conversion CTA on the page (build-your-own-adapter), but it's buried in a poetic section after the user has already seen 3 paraphrases of the same I/P/F triad.

### 2.7 TrilemmaSection — `web/components/TrilemmaSection.tsx` + `web/data/trilemma.ts`

`(a)` Section markup: `<h2 class="visuallyHidden">The Trilemma</h2>` + `<TrilemmaScroll />`. Live snapshot at viewport `1440×900` shows **only the visually-hidden h2 in the accessibility tree** — the scroll-driven content (lead lines, three Identity/Policy/Feedback pillars, "All before settlement." resolve line) is not visible at default viewport.

`(b)` `TRILEMMA_COPY` data file is fully populated. The empty-DOM behaviour is by design (scroll-driven reveal via `TrilemmaScroll`), but a judge skim-scrolling at modest velocity may glide past it without seeing the payload. Worth checking whether `TrilemmaScroll`'s reveal threshold fires at the rates a Loom-recorded judge demo actually scrolls.

`(c)` Pillars `Identity / Policy / Feedback` are the **fourth** rendering of that triad on the page (Storytelling, Performance labels, Network signals, Trilemma).

`(d)` This is the lowest-information-density section per pixel-of-scroll-height. Either it earns differentiation (e.g., "all three IN ONE TRANSACTION — atomic tx invariant" angle, which is unique to the trilemma) or the section gets folded into Network or removed.

### 2.8 ExploreSection — `web/components/ExploreSection.tsx` + `web/data/explore.ts`

`(a)` Heading "Explore AgentTrust" (rendered twice in the live DOM — once as the section h2 and once inside the children). Two cards: "Trust Layer" → `docsArchitecture` and "Builder Kit" → `docsQuickstart`.

`(b)` **Two cards is thin.** Natural slots for additional cards: "Live Demo" → `demo.agenttrust.tech`, "MCP for Claude / Cursor" → npm `@agenttrust-sdk/mcp`, "Devnet Programs" → 3 Solana Explorer URLs, "Capability Namespaces" → the `kyc.tier-1.v1` Explorer link from `HOSTED_SURFACES.md`.

`(c)` Both existing cards CTA back into docs — same as the hero's existing CTAs and the footer's Build column. The Explore section currently doesn't introduce any path that isn't already 2 clicks away from the hero.

`(d)` "Explore" is the natural place to surface the live-surfaces grid that the hero shouldn't carry. Currently under-used.

### 2.9 EventsSection — `web/components/EventsSection.tsx` + `web/data/events.ts`

`(a)` Heading "Trust work happens onchain - and in review." Four rows in a table-ish layout: SDK / Proofs / Settlement / Adapters — each linking to a docs page.

`(b)` **None of these are events.** They are docs pages re-skinned with date-like labels ("SDK", "Proofs", "Settlement", "Adapters") and locations ("Remote", "GitHub", "Solana builders", "Partner call"). For a hackathon submission with no actual event calendar, this entire section is **either wrong (fake events) or generic (renamed nav links)**. A judge clicking "AgentTrust quickstart lab" expects a calendar entry; they get a docs page.

`(c)` Every link here also exists in the footer "Build" / "Proofs" columns, the TopNav menu, and the Explore section.

`(d)` **Highest-removal-candidate section on the page.** Either replace with a real artifact (e.g., "Recent on-chain proofs" — link the 4 chained-validation tx signatures from `HOSTED_SURFACES.md` §"Live RequireValidation chain" with timestamps) or cut entirely. Faking events is worse than not having events.

### 2.10 MediaSection — `web/components/MediaSection.tsx` + `web/data/media.ts`

`(a)` Heading "AgentTrust Media" + 3 cards: Proof Notes / Builder Log / Settlement Notes. All three CTAs link to docs.

`(b)` **No real media.** The pitch video and tech demo (`docs/video-scripts/`) are scheduled for Day-13/14 recording but if they're up by submission they belong here. README also references `solana.com/news/solana-foundation-launches-pay-sh-in-collaboration-with-google-cloud` — a real third-party media link.

`(c)` Same story as Events — re-skins of docs links. "Proof Notes" / "Settlement Notes" are not real artifacts.

`(d)` Like Events, this section either earns real media or it's a candidate for removal/folding.

### 2.11 FooterSection + Newsletter — `web/components/FooterSection.tsx` + `web/data/footer.ts`

`(a)` 4 link columns (Product / Build / Proofs / Legal) + utility links + 4 social icons. Newsletter subscribe form.

`(b)` **Social links all hard-code `href="#footer"`** (`web/data/links.ts:34–39`). X, Discord, YouTube, LinkedIn icons are dead — they scroll to the footer they're already in. Either remove the icons until real handles exist (cleanest) or wire them to real handles if Mohit has them.

`(b)` **Newsletter form has no backing — nothing to verify.** This is acceptable as visual rhythm only if the form actually submits somewhere (Buttondown / Substack / etc.). If the submit button does nothing, drop the form.

`(c)` Footer's Proofs column has "Benchmark" → `#benchmark` (an in-page anchor to a title-only section), "Operator Briefings" → `#events` (the fake-events section). Both anchors land on under-built sections.

`(d)` Solid skeleton; needs the 5 cosmetic fixes above.

### 2.12 TopNav + SectionMarkers — `web/components/TopNav.tsx` + `web/data/navigation.ts`

`(a)` Top nav: AgentTrust logo (links `#home`), Home / Explore / Build / Resources, "Read Docs" CTA pill. Build + Explore + Resources have rich dropdown menus (3+3 items each per `navigation.ts`). Right-side section markers: vertical list of 10 anchors (`SECTION_MARKERS`).

`(b)` **TopNav doesn't surface a "Try the demo" or "Install MCP" CTA** — both are higher-leverage developer actions than "Read Docs." Worth a Mohit decision on whether to add a second pill.

`(c)` Section markers list 10 sections, but per the audits above 4 of those (Benchmark / Plug And Play / Trilemma / Events) are content-thin, redundant, or misleading; if any get removed in the pass, `SECTION_MARKERS` needs to track.

---

## 3. Per-section component inventory (visit order)

| # | Component | Source | Data | Communicates | Accuracy post-Phase-Q | Redundant with |
|---:|---|---|---|---|---|---|
| 1 | TopNav | `web/components/TopNav.tsx` | `data/navigation.ts` | Site nav + docs CTA | No "Try" / "MCP" CTA — partial | — |
| 2 | SectionMarkers | `components/SectionMarkers.tsx` | `data/sections.ts` | Right-rail anchor jump-list | Tracks current 10 sections; needs to follow content cuts | — |
| 3 | Hero | `components/Hero.tsx` (+ 8 sub) | `data/hero.ts`, `data/stats.ts`, `data/heroSdk.ts` | Pitch + SDK quickstart | **5/5 stale, no demo CTA, localhost in terminal, soft wedge** | — |
| 4 | BenchmarkSection | `components/BenchmarkSection.tsx` | `data/benchmark.ts` | Title-only typographic beat | No proof bar / numbers | — |
| 5 | StorytellingSection | `components/StorytellingSection.tsx` | `data/storytelling.ts` | I/P/F frame with deep-link CTAs | Solid, panel-3 link could tighten | Performance, Network, Trilemma |
| 6 | PerformanceSection | `components/PerformanceSection.tsx` | `data/performance.ts` | Trust-layer + 4-stat + decorative bars | **5/5 stale, stats duplicate hero, bars random** | Hero, Storytelling |
| 7 | PlugAndPlaySection | `components/PlugAndPlaySection.tsx` | `data/plugAndPlay.ts` | 3 marquee chip-rows incl. 4 facilitators | Facilitator names buried as chips | — |
| 8 | NetworkSection | `components/NetworkSection.tsx` | `data/network.ts` | Adapter contract + 3 signals + globe | Paraphrase of hero wedge; no proof | Storytelling |
| 9 | TrilemmaSection | `components/TrilemmaSection.tsx` | `data/trilemma.ts` | Scroll-driven I/P/F resolve | **Empty in 1440×900 default DOM** + 4th I/P/F repetition | Storytelling |
| 10 | ExploreSection | `components/ExploreSection.tsx` | `data/explore.ts` | 2 cards → docs | Thin; misses live-surfaces grid | Hero CTAs |
| 11 | EventsSection | `components/EventsSection.tsx` | `data/events.ts` | 4 docs links labeled as events | **Fake events; everything also in footer/nav** | Footer Build column |
| 12 | MediaSection | `components/MediaSection.tsx` | `data/media.ts` | 3 docs links labeled as media | **No real media** | Footer |
| 13 | FooterSection | `components/FooterSection.tsx` | `data/footer.ts`, `data/links.ts` | Link map + newsletter + socials | **Socials dead (`#footer`); newsletter unbacked** | — |

---

## 4. Cross-cutting findings

### 4.1 Banned-vocabulary leakage

`grep -rEni "soulbound|primitive|infrastructure|platform|Token-2022|programmable|dual-score|sybil-resistant|SAEP" web/data web/components web/app` returns:

- `web/data/legal.ts:27` — `"social platforms"` (generic English usage; not the pitch sense). Borderline; not in a pitch surface. Recommend leave-as-is unless Mohit wants strict compliance everywhere.

Component names `PolicyVault` / `TrustGate` / `ValidationRegistry` appear **only** in `PUBLIC_LINKS` href identifiers (`web/data/links.ts:18,22,23` and `web/data/navigation.ts:123,129,135`) — **never in user-visible copy**. Banned-in-pitch-openers rule respected. A future technical/architecture sub-section can properly use them.

### 4.2 Live URL inventory mismatch with `HOSTED_SURFACES.md`

URLs surfaced on landing today:
- `npmjs.com/package/@agenttrust-sdk/trustgate` ✅
- `github.com/agenttrust-labs/agenttrust` ✅
- `docs.agenttrust.tech` ✅ (multiple anchored deep-links)

URLs **missing** from landing despite being live:
- `demo.agenttrust.tech` (live `/protected` round-trip — Phase H deployed; Phase F devnet smoke trace)
- `mcp.agenttrust.tech` (hosted MCP HTTP endpoint)
- `api.agenttrust.tech` (hosted facilitator service)
- `npmjs.com/package/@agenttrust-sdk/mcp` (published `0.2.6` per Phase Q)
- 3 Solana Explorer URLs for the deployed program IDs (`8Y6f…QTR`, `HF8z…rih2N`, `Cx4R…Khtv` — already in `web/data/programs.ts`, never rendered)
- The 4 chained-validation tx signatures from HOSTED_SURFACES §"Live RequireValidation chain"
- The 10 capability-namespace PDA URLs from HOSTED_SURFACES §"Live capability namespaces"

`web/data/programs.ts` exists with the 3 program IDs but **no component imports it.** `grep "DEVNET_PROGRAMS\|programs.ts" web/components/` returns zero hits. The data is staged for a renderer that was never wired.

### 4.3 Stale package versions / localhost references

- `web/data/heroSdk.ts:50` — `pay --sandbox curl http://localhost:3402/protected` (banned per HOSTED_SURFACES rule 3)
- No `@agenttrust/...` (correct rebranded scope `@agenttrust-sdk/` everywhere)
- Landing does not pin SDK or MCP versions in copy; npm tile uses live npm package page (correct).

### 4.4 Stale Kani 5/5 (highest-impact factual error)

| File | Line | Current | Should be |
|---|---:|---|---|
| `web/data/stats.ts` | 9 | `value: "5 / 5"` (Invariants verified) | `"6 / 6"` |
| `web/data/stats.ts` | 13–19 | 5-element `KANI_HARNESS_NAMES` | 6-element (add `gate_payment_strict_correctness`) |
| `web/data/performance.ts` | 60 | `value: "5 / 5"` (Invariants verified) | `"6 / 6"` |

(Sub-check count `635` — a stronger number to anchor — never appears on landing.)

### 4.5 Aesthetic deviations from the Monad reference

Locked reference: `docs-site/references/monad-docs/NOTES.md` + `computed-style-notes.json` (sidebar 14px / 6px vertical pad / 12px radius / hairline borders / accent `rgb(131, 110, 249)` — close cousin of the AgentTrust `#6F4CFF`).

Out-of-scope here (no `docs-site/`), but for `web/`:
- Hero typography rhythm is good (Fraunces hero + Geist body, em-dash usage).
- Section spacing varies: BenchmarkSection has a `spacer` block before the title (intentional), Performance uses a `spacer` similarly, others don't — inconsistent. Worth a single pass once content is locked.
- `HERO_FOUNDATION_LINE` and `EVENTS_HEADING` use ASCII hyphen `-` where an em-dash `—` reads more editorial: "devnet - identity" → "devnet — identity"; "onchain - and in review" → "onchain — and in review". Trivial fix.
- Cookie banner is a full-width fixed bottom bar — Monad uses a smaller corner toast. Acceptable; current implementation is fine.

### 4.6 Section-count discipline

Current page has 10 main content sections + footer. The locked Monad-class craft reference is dense (single-page docs with a TOC), and pitch surfaces typically run 5–7 well-loaded sections. **3 of 10 current sections are content-thin or redundant** (Benchmark = title only, Trilemma = empty in default viewport, Events = fake events) and 1 is duplicative (Network re-tells the wedge). Pruning to 6–7 dense sections would lift density without losing meaning.

### 4.7 Things `web/data/` already supports that nothing renders

- `web/data/programs.ts` — 3 program IDs, no component imports.
- `web/data/stats.ts` — `KANI_HARNESS_NAMES` array, no component imports.

These look like Phase-A scaffolds whose render surfaces never landed. Either ship them (quickly, as a proof-bar / harness-list) or delete to keep the data layer truthful.

---

## 5. Proposed component change list

Ordered by my best read of impact-per-LOC, but ultimately Mohit picks. Each row is a single discrete slice that lands its own commit on `ui/r-presentable-v1`.

| # | Component path | Change shape | Reason | Est. LOC | Depends on |
|---:|---|---|---|---:|---|
| C1 | `data/hero.ts` + `data/stats.ts` + `data/heroSdk.ts` + `components/HeroActions.tsx` | restructure (data + actions widening) | Sharpen hero copy to Foundation-alignment voice, fix 5/5 → 6/6, fix `localhost` terminal line, add 3rd "Try the demo" CTA | ~80 | none |
| C2 | `data/programs.ts` + new `components/ProgramIdsBar` + `components/BenchmarkSection.tsx` | additive (new component, wires existing data) | Light proof bar under benchmark title — 6/6 Kani · 635 sub-checks · 50 anchor tests · MIT — and link the 3 program IDs to Solana Explorer | ~120 | C1 (consistent stat numbers) |
| C3 | `data/performance.ts` + `components/PerformanceStats.tsx` | restructure (de-dup + real numbers) | Replace duplicate-of-hero stats with metrics the hero doesn't carry (635 sub-checks · 360 tests · 9 releases · 4-tx chained-validation trace), keep bars but rename as decorative | ~60 | C1 |
| C4 | `data/plugAndPlay.ts` + new `components/FacilitatorGrid` (or extend `PlugAndPlaySection`) | replace one chip-row with a 4-tile facilitator grid | Surface Pay.sh / Dexter / atxp / MCPay as discrete cards with status pills + adapter-source links — needs Mohit copy decision on status framing (see §2.5) | ~150 | needs Mohit copy call |
| C5 | `data/network.ts` + `components/NetworkSection.tsx` | restructure (cut paraphrase, surface chained-validation trace) | Replace 3 redundant signals with the 4-tx RequireValidation chain — first concrete proof of the third leg closing | ~80 | C2 |
| C6 | `data/trilemma.ts` + `components/TrilemmaSection.tsx` | restructure or remove | Either differentiate to "atomic tx" (the only unique-to-trilemma angle) or fold into Network | ~50 or `-100` | C5 |
| C7 | `data/explore.ts` + `components/ExploreSection.tsx` | restructure (additive cards) | Add Live Demo / MCP / Devnet Programs / Capability Namespaces cards — turn this into the live-surfaces grid | ~80 | C1, C2 |
| C8 | `data/events.ts` + `components/EventsSection.tsx` | replace or remove | Either replace with "Recent on-chain proofs" (real tx signatures + timestamps) or remove section entirely | ~120 or `-200` | none |
| C9 | `data/media.ts` + `components/MediaSection.tsx` | replace or remove | Wire the pitch video + tech demo + Pay.sh launch link if available; otherwise remove | varies | none (independent) |
| C10 | `data/links.ts` + `data/footer.ts` + `components/FooterSocialLink.tsx` | additive (real socials) or restructure (drop dead icons) | Replace `href="#footer"` social hrefs with real handles, or remove until handles exist | ~30 | needs Mohit handle decision |
| C11 | `data/sections.ts` + `data/navigation.ts` + `components/TopNav.tsx` | restructure | Track section list to whatever survives C8/C9; optionally add second TopNav CTA "Try Demo" | ~50 | C1, C8, C9 |
| C12 | hyphen-vs-em-dash sweep: `data/hero.ts:16`, `data/events.ts:13`, others | mechanical | Cosmetic typography polish | ~10 | last |

**Priority recommendation (subject to Mohit override):** C1 → C2 → C3 → C7 → C5 → C8 → C4 → C6 → C9 → C10 → C11 → C12. C1 unlocks everything (consistent stat numbers, locked voice). C8 is the highest-leverage cut — turning fake-events into either a real artifact list or fewer sections is pure quality lift. C4 (facilitator grid) is the largest single chunk and needs a copy decision before it starts.

---

## 6. What I deliberately did NOT include in this gap analysis

- **No docs-site audit.** Out of scope per Mohit's 2026-05-08 scope clarification.
- **No `mcp/`, `trustgate/`, `programs/`, `examples/`, `tests/`, `status-page/` audits.** Out of scope.
- **No banned-vocab strict-mode rewrites.** "Social platforms" in `legal.ts` is borderline; flagged but not auto-fixed.
- **No code samples or full diffs.** This is a planning doc per the brief.
- **No copy rewrites for pitch lines.** Per `feedback_no_verdicts_on_founder_calls` and the brief's "If a component needs a content/copy decision … ask Mohit before implementing." Voice decisions sit with Mohit.
- **No CSS / theme-token recomputation** until Mohit says the section list is locked — recomputing rhythm before the section count is stable wastes work.

---

## 7. Open content/copy questions for Mohit

These need a decision before I start implementing the components that depend on them.

1. **Facilitator status framing (blocks C4).** Landing-grid copy: "1 live, 3 drop-in adapters ready" (matches docs/index `live / in flight / roadmap / roadmap`) or "4 facilitator adapters" (matches README §2)?
2. **Hero CTA count + labels (shapes C1).** Two CTAs (current) or three? If three, the proposal is `Try the live demo` (primary) → `demo.agenttrust.tech/protected`, `Install SDK` (secondary) → npm trustgate, `Read the Documentation` (tertiary) → docs root. Mohit owns the ordering.
3. **Foundation-alignment voice in hero body (shapes C1).** Current body: poetic. Proposed direction: name "Pay.sh — the Solana Foundation's first x402 facilitator, launched 2026-05-05" explicitly + "completes the third leg" wedge. Asking before writing because the locked narrative has multiple voice options (README ¶51, COMPLETING-THE-TRUST-STACK ¶1, pitch-video Variant B Beat 2) — Mohit picks which voice the hero rhymes with.
4. **Trilemma section's fate (C6).** Differentiate (atomic-tx angle) or fold into Network?
5. **Events + Media sections' fate (C8 + C9).** Replace with real artifacts or remove? If replace, what artifacts?
6. **Social handles (C10).** Real X / Discord / YouTube / LinkedIn URLs available, or remove icons until they are?
7. **Newsletter form (sub-question of footer).** Is there a real backing service? If not, remove the form?

When these are answered, the per-component implementation proposals can finalize and the branch starts taking commits.

---

## 8. Verification plan after the pass

For the final report at `docs/proofs/phase-r-ui-final.md`:

- `pnpm --filter ./web build` clean.
- `pnpm --filter ./web lint` clean.
- Headless 1440×900 + 1280×800 + 768×1024 + 390×844 (mobile) page-load probes: all 4 viewports return 200, 0 console errors, every internal link resolves.
- Banned-vocab final grep — same shape as §4.1, expected to remain clean (or strictly clean if Mohit decides on the `legal.ts` "platforms" call).
- Lighthouse scores (mobile + desktop) for `https://www.agenttrust.tech` post-deploy.
- Live deploy URL confirmed at HTTP 200 post `vercel --prod` from `web/`.

---

**End of gap analysis.** Awaiting Mohit's component pick + the §7 content/copy answers.
