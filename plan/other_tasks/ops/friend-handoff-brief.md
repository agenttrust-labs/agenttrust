# Friend Handoff Brief — AgentTrust Video + Deck Production

**Audience:** Mohit's non-Web3 friend, handling video editing + deck design + ops for Frontier 2026 submission. This brief lets the friend produce both videos + finalize the deck without Mohit's day-to-day involvement during Days 13-15.

**Mohit's role:** records narration, captures CLI demo, makes go/no-go calls on takes. Friend does everything else.

**Last updated:** 2026-04-28 (Day 4.5). Friend confirms availability Day 5 morning.

---

## Timeline (absolute dates)

| Date | Day # | Friend deliverable |
|------|-------|---------------------|
| 2026-04-29 | 5 | Confirm availability + receive these scripts + read entire brief once |
| 2026-05-06 | 12 | Receive Mohit's recorded narration audio + raw CLI screen captures |
| 2026-05-07 | 13 | First cut of pitch video (3 minutes) — rough edit |
| 2026-05-08 | 14 | First cut of technical demo (90 seconds) — rough edit + first deck design pass |
| 2026-05-09 | 15 | Final cuts both videos + deck v2 + subtitles + music mix |
| 2026-05-10 | 16 | Mohit reviews; friend applies last revisions; final exports |
| 2026-05-11 | 17 | Submission day. Files locked Day 16 evening, 9pm IST. |

**Critical-path warning:** if Mohit's audio is late (2026-05-07 instead of 2026-05-06), compress all subsequent days by 24 hours. Day 17 submission is non-negotiable.

---

## Source materials friend will receive (Day 12)

1. **Pitch video script (3 min):** `plan/other_tasks/ops/pitch-video-script-3min.md`
2. **Technical demo script (90s):** `plan/other_tasks/ops/technical-demo-script.md`
3. **Pitch deck content (10 slides):** `plan/other_tasks/ops/pitch-deck-10-slides.md`
4. **Mohit's narration audio:** WAV files, 48kHz, mono. One file per beat (10-12 files for pitch, 6-8 for demo). File-naming: `pitch_v3_beat1.wav`, etc.
5. **Mohit's screen recordings:** MP4, 1080p 60fps, lossless if possible. One file per CLI moment (5-6 files for demo).
6. **Mohit's on-camera shots:** MP4, 1080p 30fps, plain wall background. 2-3 takes per beat for pitch video. Headshot shot for slide 9 of deck.

---

## Music — royalty-free sources

**Recommended platforms (in priority order):**

1. **Epidemic Sound** ($9.99/mo personal, $19/mo commercial) — direct license, no PRO complications, 30,000+ tracks. Single-track licenses ($99-499) available if Mohit avoids subscription. [epidemicsound.com](https://www.epidemicsound.com/) — preferred for video that may go on Twitter / Mohit's YouTube channel post-hackathon.
2. **Artlist** ($9.99/mo annual) — 30,000+ tracks + 300,000 assets. Cue sheets needed for broadcast (not relevant for hackathon).  Cheaper alternative if Epidemic Sound subscription not chosen. [artlist.io](https://artlist.io/)
3. **YouTube Audio Library** (free) — Solid fallback. Less polished but zero cost. [youtube.com/audiolibrary](https://www.youtube.com/audiolibrary) — use only if budget is hard zero.

**Selection brief:**
- **Style:** instrumental, ambient/electronic/cinematic. NO vocals. NO drops. NO overt EDM.
- **BPM:** 80-95 (moderate, not too slow, not too energetic).
- **Mood:** purposeful, focused, slightly futuristic. Think Apple keynote backing track. Not "epic-build" trailer music.
- **Length:** 4+ minute track (so we can fade in/out cleanly, not loop).

**Searchable tags on Epidemic Sound:** `tech`, `corporate`, `cinematic`, `ambient`, `electronic`, `inspiring`, `subtle`. Avoid: `epic`, `trailer`, `hype`, `EDM`, `dance`, `rock`.

**Suggested track shortlist (friend confirms availability + picks one per video):**
- For pitch video: a track that builds slightly through the 3 minutes — starts at 0:30, peaks at 1:30 demo beat, drops at 2:00, resolves at close.
- For technical demo: a more minimal track — starts at 0:35, holds low through demo, swells gently for close at 1:20.

---

## Pacing notes (per video)

### Pitch video (3 min)

| Beat | Time | Music behavior |
|------|------|----------------|
| Variant B opener | 0:00–0:30 | NO MUSIC. Silence behind Mohit's voice. The "garbage" pause must land in absolute quiet. |
| Market shape + Foundation gap | 0:30–1:00 | Music starts low (-18 dB). Builds through this beat. |
| Architecture | 1:00–1:30 | Music holds steady. |
| Demo | 1:30–2:00 | Music swells (-12 dB). The five-green-checks moment is the music peak. |
| Named buyer | 2:00–2:30 | Music drops back to low. Don't let music compete with the integration claim. |
| Solo close | 2:30–3:00 | Music swells gently (-10 dB) for emotional close. Fade on end-card. |

### Technical demo (90s)

| Beat | Time | Music behavior |
|------|------|----------------|
| Variant A opener | 0:00–0:08 | NO MUSIC. Silence behind the failure-noun. |
| Set-up storefronts | 0:08–0:20 | Still no music. CLI is the audio. |
| Pre-flight denial | 0:20–0:35 | Still no music. The denial is the dramatic beat. |
| Pre-flight accept | 0:35–0:50 | Music starts low (-18 dB) at "Tier four. Allowed." |
| Settlement | 0:50–1:05 | Music holds low. |
| Feedback CPI | 1:05–1:20 | Music swells gently (-12 dB) for the loop-close. |
| Mohit close | 1:20–1:30 | Music holds. Fade on end-card. |

**Rule for both:** when CLI lines stream on screen, music drops -3 dB further. CLI is content, not background.

---

## B-roll suggestions (collected; friend uses as appropriate)

For pitch video:

1. **Quantu mainnet explorer** — screenshot of `solana.com/agent-registry` homepage. Used in Slide 6 deck + 2:00-2:30 beat of pitch video.
2. **Cargo kani green checks** — terminal screen capture showing all 5 invariants proven. Used in 1:30-2:00 beat of pitch + optional 2:00-2:30 extension of demo.
3. **x402 ecosystem map** — official x402.org/ecosystem image showing Solana, Base, Polygon members. Used in 0:30-1:00 beat of pitch.
4. **AgentTrust architecture diagram** — drawn in Excalidraw, exported as PNG with transparent background. Used in 1:00-1:30 beat of pitch + Slide 4 of deck.
5. **Two-pane scam-vs-canonical agent** — JSON snippet of two agent registry entries side-by-side. Used in 0:08-0:20 beat of demo.
6. **Headshot of Mohit** — for deck Slide 9 + end-card.

For technical demo:

7. **Solana Explorer "$1.2M USDC transfer to clone" still** — dark-mode screenshot of a Solana Explorer transaction page showing a $1.2M USDC transfer with an arrow annotation pointing at the receiving wallet labeled "clone." Used in 0:00-0:08 beat of demo (Variant A cold open per `plan/final_idea/PITCH_FRAMES_LOCKED.md`).
8. **Solana Explorer screenshot** — actual transaction signature view showing the USDC transfer + AgentTrust program log. Used in 0:50-1:05 beat of demo.
9. **Atom Engine reputation score view** — solana.com/agent-registry screenshot of the demo agent's tier ticking up. Used in 1:05-1:20 beat of demo.

---

## Color grading

- **Pitch video:** subtle teal-orange grade (engineer-aesthetic, not Hollywood). Slight contrast bump (+10). No saturation increase. Skin tones natural. Plain wall background should be true neutral grey, not pushed warm.
- **Technical demo:** zero color grade on terminal recordings (preserve actual terminal colors — green/red/white must read as themselves). Mohit's close shot (1:20-1:30) gets the same teal-orange grade as pitch video for consistency.
- **Deck:** dark mode throughout. Background hex `#0F0F0F` (charcoal), text hex `#F5F5F5` (off-white), accent hex `#9945FF` (Solana purple) used sparingly. NO white background, NO Solana green (`#14F195` reads cluttered next to purple).

---

## Subtitles (required)

1. **Generate auto-subtitles** via YouTube Studio or Descript or Whisper-large-v3 locally. CSV-export.
2. **Human-correct mandatory** — these terms always get mistranscribed:
   - "x402" (auto-transcribes as "x for two" or "ex four oh two")
   - "Quantu" (auto-transcribes as "Quantum")
   - "ERC-8004" (auto-transcribes as "ERC eight thousand four")
   - "Kani" (auto-transcribes as "Connie" or "Khani")
   - "atxp_ai" (auto-transcribes as "ATX P A I")
   - "MCPay" (auto-transcribes as "MC Pay" or "Mick pay")
   - "Anthropic" (usually fine)
   - "Halborn" (auto-transcribes as "Hal Born")
   - "Asymmetric Research" (usually fine)
   - "atom-engine" (auto-transcribes as "atom engineer" sometimes)
3. **Embed subtitles as VTT** (sidecar file) for the YouTube/Twitter upload. Some platforms re-OCR — VTT survives more reliably than burned-in.
4. **Burn-in copy** — for direct-Twitter / Loom share, burn captions into the video at lower-third position, white text on a black 60%-opacity bar. Friend produces a "burned" export and a "VTT-only" export.

---

## Export specifications (Frontier Colosseum upload)

Per Colosseum technical guidance (from past-cycle submissions):

| Spec | Value |
|------|-------|
| Resolution | 1080p (1920×1080) |
| Frame rate | 30 fps (NOT 60; Colosseum reduces to 30 anyway) |
| Codec | H.264 (libx264), main profile |
| Bitrate | 8-12 Mbps target (CRF 18-22) |
| Audio | AAC, 192 kbps stereo |
| Container | .mp4 |
| File size | < 100 MB per video (hard limit; Colosseum's uploader rejects above) |
| Length | Pitch ≤ 3:00, Demo ≤ 3:00 (per Colosseum's `perfecting-your-hackathon-submission` guide, 3-minute limit on both videos) |
| Aspect ratio | 16:9 |
| Naming | `agenttrust-pitch-v1-final.mp4` and `agenttrust-demo-v1-final.mp4` |

**Quality-vs-size tradeoff:** if 100 MB cap forces a quality cut, drop bitrate first (down to 6 Mbps). Do NOT drop resolution. Do NOT drop frame rate to 24 (looks cinematic but reads "amateur" on tech demos).

---

## Deck design (10 slides)

Friend produces in Figma or Keynote. Reference content brief in `plan/other_tasks/ops/pitch-deck-10-slides.md`.

**Constraints:**
- 1920×1080 export
- PDF + PNG-per-slide outputs
- Locked typography: Inter or system sans-serif. Body 24pt, titles 48pt.
- One idea per slide. If a slide has two ideas, split it.
- Mohit reviews on Day 14. Friend produces v2 by Day 15. Mohit final-approves Day 16.

---

## Communication protocol

- **Daily standup, Days 12-16:** 15-minute call between Mohit and friend. 9pm IST start. Friend leads agenda — surfaces blockers, presents work-to-date, asks for Mohit feedback.
- **Slack/WhatsApp channel:** dedicated thread for asset drops + version markers. Friend posts every export with version tag.
- **No surprises rule:** friend does NOT ship anything to Mohit's drive without flagging in the channel first. Even small revisions get a mini-changelog post.
- **Mohit's promised turnaround:** all friend asks get responded to within 4 hours during Days 12-16. If Mohit can't meet a 4-hour SLA, he flags before going dark.

---

## Failure modes (how this can break — and the fallback)

1. **Mohit's audio recording quality is low.** Fallback: re-record on Day 13 morning. Two-hour cost. If friend flags audio quality issue Day 12, Mohit re-records that night, not the morning of.
2. **Friend's video software crashes / project corrupts.** Fallback: friend keeps two backup copies on different drives (cloud + local). Daily snapshots tagged by date.
3. **Music license issue surfaces.** Fallback: switch to YouTube Audio Library track within 2 hours. Friend pre-selects 2 backup tracks on Day 12 just in case.
4. **Friend gets sick Days 13-15.** Fallback: Mohit shifts solo to a Loom-recorded "rough" pitch video for the deck/submission and submits Day-17 with a note "v1 video, polished v2 to follow." Submission still goes in. Polish is real but not infinitely load-bearing.
5. **Submission upload fails Day 17.** Fallback: Mohit submits via email to colosseum hackathon@colosseum.com (per Frontier rules) within 4 hours of upload failure. Friend's job ends Day 16; submission is Mohit's responsibility from there.

---

## What this brief is NOT

- This brief is NOT a substitute for friend reading the actual scripts and deck content. Friend MUST read those too.
- This brief is NOT a contract. It's a working document. If something needs changing, change it — and tell Mohit in the daily standup.
- This brief does NOT cover Twitter video versions. Those get a separate cut for square 1:1 (1080×1080) with burned-in subtitles, max 60 seconds, on Day 16 if time permits. If time doesn't permit, skip the Twitter cut and post the YouTube link instead.
