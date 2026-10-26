# Sentinel — Case-Study Pointers for the Portfolio

> **Status**: canonical · Written for the portfolio case study of this project. Every claim below is
> backed by a running artifact in this repo — link or show the artifact, never the assertion alone.

## The one-line thesis

> A wildfire command console where the AI prepares and a human authorizes — and where **every number
> admits where it came from**. Governance is not a settings page; it is the interaction model.

## The 8 pointers, in telling order

**1. Open with the founding scene, not the product.** 3:47 AM, a 48-minute manual baseline vs a
90-second target (FlytBase's own brief). Then one sentence: "The design problem is not speed — it is
*cognitive overload, false confidence, and loss of control* at speed." Every screenshot that follows
is evidence against those three risks.

**2. Show the state machine as the design artifact.** The strongest systems-thinking evidence you
own: a transition table where every edge carries a gate, a reason, and a lapse consequence. Show the
graph *and* one edge zoomed ("silence is never approval" — the lapse path). Recruiters who think
"designer = screens" meet a designer who models.

**3. Make the honesty system the hero.** The provenance ladder (MEA/MOD/AUT on every number), the
truth guard on the live model, the "I was wrong about Encinal Canyon Rd" correction with the old
projection kept visible. Contrast slide: "what a generic AI dashboard would do" vs "what Sentinel
does." This is your differentiator — no other portfolio piece has it.

**4. Prove the authority boundary is structural, not copy.** Three receipts: effects run only
through the operator's pick (tested at the API boundary); the interrupt budget (2/10 min, visibly
depletable); the dissent record with both positions verbatim and the re-raise routed to a second
authority with *only new evidence*.

**5. Show failure as a designed state.** The lapse paths (plan and report), the registry-vs-IR
source conflict, the battery handover with its failsafe branch, satellite loss with confidence
honestly dropping. One frame of the contain arc: *no evacuation — but the authority is still
notified*, and the CAD report is what queues the dozer. Consequence chains, not error toasts.

**6. Numbers discipline.** Every metric in the study must carry its basis, same as the product:
"7:48 detection→order (**measured in the exercise run**), vs the brief's 38-min manual baseline
(**authored scenario goal**)". Include the gates table: 34 verify + 31 e2e checks, all green, listed.
The verification culture IS the craft evidence.

**7. The two-surface AI interaction.** Edge rail (only when agents are alive) + decision cards that
exist only while a decision is open + floating chat. Contrast with v1's half-screen panel: show the
before/after and name the principle — *persistent presence is cognitive tax*.

**8. Close with scope discipline.** What you did NOT build (the 15-feature FlytBase catalog) and
why: the brief is wildfire initial attack. Then the honest roadmap: evidence export shipped
(SHA-256 integrity digest, not "court-ready"), telemetry-over-time and structure-risk lists next.

## Artifacts to embed (all exist today)

| Artifact | Where |
|---|---|
| 90-second arc, card-first | `?situation=wui-breakout` screenshots / `qa/one-plan.png` |
| Contain arc (authorities always) | `?situation=contain` / `qa/contain-notify.png` |
| False positive (the save) | `?situation=falsepos` / `qa/falsepos-resolved.png` |
| Lapse paths, dissent, failsafe | `tools/e2e.mjs` output log |
| Truth guard battery | `tools/verify.mjs` "live-model adapter" checks |
| Evidence export (JSON+MD+digest) | Review tab → Export evidence |
| Design system sheet | `/tokens.html` |
| Quiet standby (calm column) | `?situation=standby` / `qa/a11y-standby.png` |
| This audit trail | `docs/AUDIT-E2E-2026-10-26.md` |

## Anti-patterns to keep out of the study

- No "AI-powered" adjectives without a mechanism shown next to them.
- No 3D flyover screenshots as the hero (it is the explore surface, not the decision surface).
- No unattributed numbers, including your own performance claims.
- No "handled edge cases" without naming three of them.
