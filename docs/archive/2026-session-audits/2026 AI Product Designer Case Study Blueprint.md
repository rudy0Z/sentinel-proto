# **The 2026 AI Product Designer Case Study Blueprint (The "EY" Edition)**

**The Core Philosophy:** Stop telling the story of *what you did* (The Process Diary). Start telling the story of *what the product needed* (The Decision Story).

Design for the recruiter's 30-second **Scan** and the hiring manager's 3-minute **Scrutiny**.

## **SECTION 1: The Newspaper Title & Hook (The 5-Second Scan)**

*Goal: Hook the reader immediately. Do not make them click to a second page or guess what the product does.*

* **The Title (Newspaper Style):** \* *Formula:* \[Product Name\]: \[Action\] \[Metric\] by \[Specific AI Design Intent\]  
  * *Example:* LokAI: Reducing Legal Research Time by 40% with Multilingual AI Assistance.  
* **The Hook:** \* *Format:* 2 sentences that drop the reader into the emotional/business reality.  
  * *Example:* "For non-English speakers, government portals are a dead end. Users abandon the site in under 3 minutes, not because the law isn't there, but because the cognitive load of translating legal jargon is too high."  
* **The Visual Tease:** \* *Format:* 1 massive, full-bleed looping video or highly annotated hero screen. Show the absolute best AI interaction immediately.

## **SECTION 2: Business Context & Validation (The 15-Second Setup)**

*Goal: Give the boundaries of the sandbox and prove you understand root causes.*

* **Metadata Strip (Keep it to 2 lines):**  
  * **Role:** Lead Product Designer (0-to-1 Concept)  
  * **Timeline:** 8 Weeks  
  * **Platform:** iOS / Web  
* **The Root Cause Statement:**  
  * *Formula:* \[User type\] \+ \[specific action\] \+ \[root cause\] \+ \[measurable outcome\]  
  * *Example:* Drone operators monitoring multiple fleets abandon anomaly checks because hierarchical data overload causes cognitive fatigue, resulting in missed critical warnings.  
* **Validation & Insights (The Junior Research Hack):**  
  * *Do not* list all your research methods (empathy maps, etc.).  
  * *Format:* State the method in one sentence, then highlight the core insight.  
  * *Example:* "To validate the legal terminology barrier, I ran usability tests on 5 users using the live government portal. **The Insight:** 4/5 users abandoned the task within 3 minutes. The core problem wasn't lack of data, but lack of conversational translation."

## **SECTION 3: The Solution Journey (The "Apple Demo")**

*Goal: Do not dump a 3x3 grid of screens. Give a guided tour of ONE critical AI flow — and then extend that flow into the failure states, edge cases, and chaos states that prove the system holds up when things go wrong.*

### **3A. The Happy Path**

* **The Flow:** Pick the single most valuable flow (e.g., Handling an AI legal query in LokAI, or responding to a drone anomaly in Sentinel).  
* **The Structure (per screen):**  
  * **User Emotion/Intent:** What is the user thinking right now? (e.g., "Rahul is panicking because the drone lost GPS.")  
  * **The Screen:** Large, crisp mockup.  
  * **Decision Annotations:** Connect text directly to UI elements. *Do not describe aesthetics.* Describe business/product logic.  
  * *Bad Annotation:* "Clean red button for alerts."  
  * *Good Annotation:* "Alert isolated above the fold—testing showed operators miss lower-third notifications during high-stress anomalies."

### **3B. Failure States, Edge Cases & Chaos States (MANDATORY for AI Roles)**

*Goal: Show what the user sees when the system breaks. Failure states are SCREENS with backend-context annotations — not prose. This is the senior-signal content that separates a polished demo from a system you'd trust in production.*

* **How many:**
  * High-stakes AI products (medical, emergency response, legal, financial): **4-8 failure-state screens**
  * Lower-stakes consumer AI products: **2-3 failure-state screens**
* **The Structure (per failure-state screen):**
  * **The Trigger:** What went wrong in the system that caused this state? (Backend context, named specifically — *"Wind vector reversed 180° at T+62s, invalidating active spread projection"* or *"AI confidence dropped below 67% as satellite IR feed disconnected"*)
  * **The Screen:** The actual failure-state UI — what the user sees on screen at this moment. Large, crisp mockup. Don't abstract the failure; show it.
  * **User-Visible Signal:** What the user notices on screen — the chip, the indicator, the modal, the colour shift. Annotation should map directly to the UI element.
  * **Recovery Path:** What action options does the user have? Document each option as a UI element with its consequence.
  * **Accountability:** Who's responsible / where the audit trail logs this event. *Especially critical for high-stakes products.*
* **What to show, per project type:**
  * Emergency / safety-critical AI: hardware failure, weather/environment change, multi-incident overload, AI confidence collapse, handoff between shifts, airspace conflict, false positive rollback
  * Consumer AI (legal, health, finance): out-of-scope query, low-confidence response, language detection failure, citation gap, consent withdrawn mid-action
  * Marketplace / two-sided AI: fraud attempt, validator disagreement, refund/dispute, consensus mismatch, content-policy violation, rate-limit hit
* **What NOT to do here:**
  * No prose chapter "explaining" failure handling — the screens with annotations do the work
  * No abstract "we considered edge cases" sentences — name each one with its trigger, screen, and recovery path
  * No happy-path screens disguised as failure states (a successful retry is a happy path, not a failure state)
* **Connecting to §4:** At least one Decision Story in §4 must address the DESIGN CHOICE behind a failure-state pattern (e.g., "Why I chose confidence-collapse over silent-fallback"). The screens in §3B show *what the user sees*; the Decision Story in §4 explains *why this design over the alternatives*.

## **SECTION 4: The Deep Scrutiny (3 to 5 Decision Stories)**

*Goal: This is where you win the job. Prove you think in trade-offs.*

For each of the 3 to 5 stories, use this exact structure:

### **Decision Story \#\[X\]: \[Punchy Title, e.g., "Designing for AI Hallucinations"\]**

* **The Messy Before:** What was broken or what was the initial constraint?  
* **Options Considered:** Present 3 genuinely different approaches (not just 3 different colors).  
  * *Option A:* \[Approach 1\] \-\> Rejected because \[Product Logic\].  
  * *Option B:* \[Approach 2\] \-\> Rejected because \[Product Logic\].  
  * *Option C:* \[Chosen Approach\] \-\> Why it aligns with the business goal.  
* **The Trade-off Statement (MANDATORY):**  
  * *Formula:* "I chose \[Option C\] over \[A & B\]. The trade-off was \[what you sacrificed\], but I accepted it because \[data/reasoning justifying the sacrifice\]."  
  * *Example:* "The trade-off was allocating 30% of the screen to a permanent citation sidebar, sacrificing mobile real estate. I accepted this because user trust in AI legal advice was zero without visible, immediate source links."  
* **The Result:** The specific UI move made after this decision.

***Crucial Requirement for AI Roles (MANDATORY):** At least one of the 3-5 Decision Stories MUST address a **failure-handling design choice** — not just a happy-path UI decision. The failure-state SCREENS live in §3B; this Decision Story explains the THINKING behind the failure-handling pattern.*

*Examples of what counts:*
* *"Why I chose AI confidence collapse over silent fallback"* (Sentinel — why a self-contradicting AI surfaces uncertainty rather than pushing through)
* *"Why the boundary is an agentic redirect, not an error message"* (LokAI — why hitting an out-of-scope query drafts an email to a NALSA legal aid centre instead of stopping at "I can't help")
* *"Why fraud-mitigation lives at the back-end withdrawal gate, not in the Calibration Quest UI"* (Feul — why the interface stays a Guaranteed-Win while detection logic runs invisibly behind the scenes)

*Examples of what does NOT count (these are happy-path decisions, not failure-handling):*
* *"Why I chose a sidebar over tabs"* (information architecture decision)
* *"Why the primary CTA is orange"* (visual decision)
* *"Why I picked tap over swipe"* (interaction decision)

*The failure-handling Decision Story is the senior-signal content. Without it, the case study reads as "designer built a happy path"; with it, the case study reads as "designer specified the full behaviour surface including what happens when things break."*

## **SECTION 5: The Iteration Archive (The "I'm Not Perfect" Proof)**

*Goal: Prove you have a growth mindset and that you actually test ideas.*

* **What to show:** 1 or 2 wireframes, ugly sketches, or early UI attempts that you threw away.  
* **What to write:** Explain exactly *why* they failed.  
* *Example:* "My first attempt at the Sentinel dashboard tried to show all 4 drone camera feeds at once. Usability testing revealed this actually caused 'change blindness.' I scrapped it for a single-focus dynamic feed."

## **SECTION 6: UI System & Tool Craft**

*Goal: Prove you have the visual discipline and Figma skills to be production-ready.*

* **Typography & Semantic Colors:** Show the system, not just the hex codes. Explain *why* you chose them (e.g., "Used Inter for maximum legibility at 12px for dense telemetry data").  
* **Tool Craft (Figma Properties):** Show your core components (Buttons, Cards) *alongside their Figma properties panel*. Show that you know how to wire up variants, boolean states, and auto-layout.

## **SECTION 7: Outcome & Honest Reflection**

*Goal: Close the loop on the metric you promised in Section 1 and show maturity.*

* **The Junior Metric Hack (Proxy Metrics \+ Estimated Impact):**  
  * Since you didn't ship this to 100,000 live users, use prototype data.  
  * *Usability Data:* "Prototype testing reduced time-on-task from 4 minutes to 45 seconds."  
  * *Estimated Business Impact:* "Based on a 40% reduction in friction, applying industry-standard conversion rates, this UX translates to an estimated \[X\] increase in successful task completions."  
* **Honest Reflection:**  
  * What is one thing you would change if you had to do it again?  
  * *Example:* "If I rebuilt this tomorrow, I would spend less time polishing the dashboard UI and more time testing the AI prompt-generation logic with actual lawyers, as the current model still relies on my best assumptions."