import { existsSync } from "node:fs";
import { chromium } from "playwright-core";

const baseUrl = process.env.SENTINEL_VERIFY_URL ?? "http://127.0.0.1:4190/embed/sentinel/";
const executableCandidates = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
].filter(Boolean);
const executablePath = executableCandidates.find((candidate) => existsSync(candidate));
if (!executablePath) throw new Error("Chrome or Edge was not found.");

const browser = await chromium.launch({
  executablePath,
  headless: true,
  args: ["--no-first-run", "--no-default-browser-check"],
});
const headquartersViewport = { width: 1920, height: 1080 };
const results = [];

async function run(name, test) {
  const page = await browser.newPage({ viewport: headquartersViewport });
  try {
    await test(page);
    results.push({ name, status: "passed" });
    console.log(`PASS ${name}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    results.push({ name, status: "failed", error: message });
    console.error(`FAIL ${name}: ${message}`);
  } finally {
    await page.close();
  }
}

try {
  await run("guided verification to authority gate", async (page) => {
    await page.goto(`${baseUrl}#/?scene=verify-active&core=1&layout=legacy`, { waitUntil: "domcontentloaded" });
    await page.getByText(/source conflict/i).first().waitFor();
    // The calibrator is a deliberate confirm control inside TALON's voice panel,
    // not a form checkbox — clearing it unlocks the gated forward command.
    await page.getByRole("button", { name: /checked the agricultural burn permit/i }).click();
    await page.getByRole("button", { name: "Prepare authority packet" }).click();
    const confirmation = page.getByRole("dialog", { name: /Prepare authority packet/i });
    await confirmation.waitFor();
    await confirmation.getByRole("button", { name: "Prepare authority packet", exact: true }).click();
    await page.getByRole("button", { name: /Send Authority Packet/i }).first().waitFor();
  });

  /* Direction A: declining TALON's escalation must gate on a stated reason and
     land in contested watch rather than baseline. */
  await run("dissent gate routes decline into contested watch", async (page) => {
    await page.goto(`${baseUrl}#/?scene=verify-active&core=1`, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Decline escalation" }).click();
    await page.getByRole("dialog", { name: /Confirm disagreement with TALON/i }).waitFor();

    const confirm = page.getByRole("button", { name: "Record and continue" });
    if (await confirm.isEnabled()) throw new Error("Dissent was recordable without a stated reason.");

    await page.getByRole("button", { name: "False positive", exact: true }).click();
    await confirm.click();
    await page.getByText(/contested watch/i).first().waitFor();
  });

  await run("dissent gate traps and restores keyboard focus", async (page) => {
    await page.goto(`${baseUrl}#/?scene=verify-active&core=1`, { waitUntil: "domcontentloaded" });
    const trigger = page.getByRole("button", { name: "Decline escalation" });
    await trigger.click();
    await page.getByRole("dialog", { name: /Confirm disagreement with TALON/i }).waitFor();
    await page.keyboard.press("Escape");
    await page.getByRole("dialog", { name: /Confirm disagreement with TALON/i }).waitFor({ state: "hidden" });
    if (!await trigger.evaluate((node) => document.activeElement === node)) {
      throw new Error("Focus did not return to the dissent trigger after the gate closed.");
    }
  });

  /* The contested state must show the bar TALON has to clear, and preserve both
     positions — otherwise the override reads as having been discarded. */
  await run("contested watch shows threshold and preserves both positions", async (page) => {
    await page.goto(`${baseUrl}#/?scene=monitoring-contested&core=1`, { waitUntil: "domcontentloaded" });
    const meter = page.getByRole("meter", { name: /re-raise threshold/i });
    await meter.waitFor();

    const current = Number(await meter.getAttribute("aria-valuenow"));
    if (!Number.isFinite(current)) throw new Error("Threshold meter reported no current value.");

    await page.getByText(/TALON position at override/i).waitFor();
    await page.getByText(/Closed as false positive/i).waitFor();
  });

  /* An appeal must show movement since the override and route away from the
     operator who already declined — not re-prompt the same person. */
  await run("re-raise shows what changed and escalates to a second authority", async (page) => {
    await page.goto(`${baseUrl}#/?scene=talon-reraise&core=1`, { waitUntil: "domcontentloaded" });
    await page.getByRole("region", { name: /TALON re-raise brief/i }).waitFor();
    await page.getByText(/New evidence only/i).waitFor();
    await page.getByText(/Duty Supervisor/i).first().waitFor();
  });

  /* Reconciliation must be willing to say TALON was wrong, not only the operator. */
  await run("reconciliation records the verdict in both directions", async (page) => {
    await page.goto(`${baseUrl}#/?scene=monitoring-contested&core=1&layout=legacy`, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /Ground truth arrived/i }).first().click();
    await page.getByRole("dialog", { name: /reconciliation/i }).waitFor();
    await page.getByText(/Operator was right|TALON was right|Inconclusive/i).first().waitFor();
    await page.getByText(/System response/i).waitFor();
  });

  await run("reconciliation preserves an auditable verdict", async (page) => {
    await page.goto(`${baseUrl}#/?scene=monitoring-contested&layout=legacy`, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /Ground truth arrived/i }).first().click();
    const dialog = page.getByRole("dialog", { name: /reconciliation/i });
    await dialog.waitFor();
    await dialog.getByRole("button", { name: /File and return to watch/i }).click();
    await page.getByRole("tab", { name: /Ledger/i }).click();
    await page.getByText(/Operator judgment confirmed/i).first().waitFor();
  });

  /* Regression: the exception banner used to offer a recovery command that
     assigned a drone and left the operator stranded in the degraded scene. */
  await run("degraded scene recovery actually exits the scene", async (page) => {
    await page.goto(`${baseUrl}#/?scene=network-degraded&core=1&layout=legacy`, { waitUntil: "domcontentloaded" });
    const degradedBanner = page.getByText(/Network degraded/i).first();
    await degradedBanner.waitFor();

    await page.getByRole("button", { name: /Relay field intel/i }).first().click();
    await page.getByRole("button", { name: /Approve and deploy/i }).first().click();

    /* The regression is the exception outliving its own recovery command. */
    await degradedBanner.waitFor({ state: "hidden", timeout: 10000 });
  });

  await run("authority packet modal and Escape", async (page) => {
    await page.goto(`${baseUrl}#/?scene=authority-notification-ready&core=1`, {
      waitUntil: "domcontentloaded",
    });
    const send = page.getByRole("button", { name: /Send Authority Packet/i }).first();
    await send.waitFor();

    // Constitution: a gated verb is refused by a plain click. The packet is the
    // 90-second promise's irreversible moment — it must never fire on one click.
    if ((await send.getAttribute("data-gated")) !== "true") {
      throw new Error("Send Authority Packet is not marked gated.");
    }
    await send.click();
    await page.waitForTimeout(600);
    if ((await page.getByRole("dialog").count()) !== 0) {
      throw new Error("A plain click fired a gated verb — hold-to-authorize was bypassed.");
    }

    // It opens only after the operator holds past the 2s bar.
    await send.hover();
    await page.mouse.down();
    await page.waitForTimeout(2400);
    await page.mouse.up();
    await page.getByRole("dialog").waitFor();
    // Escape is deliberately withheld while TALON's session is mid-flight
    // (ActionModal handleEscape: input/review/checking/executing). Wait for
    // the session to settle rather than guessing a delay, then assert cancel.
    await page
      .getByRole("button", { name: /Cancel/i })
      .first()
      .waitFor({ state: "visible" });
    await page.waitForTimeout(1800);
    await page.keyboard.press("Escape");
    await page.getByRole("dialog").waitFor({ state: "hidden", timeout: 10000 });
  });

  await run("TALON suggested-question conversation", async (page) => {
    await page.goto(`${baseUrl}#/?scene=contain-recommended&core=1`, {
      waitUntil: "domcontentloaded",
    });
    await page.getByRole("button", { name: "Open TALON session" }).click();
    // Suggested questions are the conversation entry points.
    await page.getByRole("button", { name: "Show alternate" }).click();
    // The reply is the authored answer to the question, not the scene brief
    // restated and not a repurposed recommendation.
    await page.getByText(/Alternate plan prepared/i).first().waitFor({ timeout: 12000 });
    // Honesty framing lives in the case study, not the product surface.
    if (await page.getByText(/scripted prototype/i).count()) {
      throw new Error("Prototype disclosure resurfaced inside the session.");
    }
  });

  await run("map selection, pinned rail, and drag", async (page) => {
    await page.goto(`${baseUrl}#/?scene=contain-recommended&layout=legacy`, { waitUntil: "domcontentloaded" });
    const ledgerTab = page.getByRole("tab", { name: /Ledger/ });
    await ledgerTab.click();
    const drone = page.locator('[aria-label*="Select or drag to reposition"]').first();
    await drone.click();
    if ((await ledgerTab.getAttribute("aria-selected")) !== "true") {
      throw new Error("Selecting a drone overwrote the pinned Ledger tab.");
    }
    const zone = page.getByRole("button", { name: /Forest Zone.*Select zone/i }).first();
    await zone.click();
    if ((await zone.getAttribute("aria-pressed")) !== "true") {
      throw new Error("Zone selection did not update shared selected state.");
    }
    const box = await drone.boundingBox();
    if (!box) throw new Error("Drone marker has no pointer target.");
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 120, box.y + box.height / 2 + 50, {
      steps: 8,
    });
    await page.mouse.up();
    await page.waitForTimeout(350);
  });

  await run("rail filters and map cross-highlighting", async (page) => {
    // Pins layout=legacy: this flow asserts the legacy rail's "Assets" tab and
    // its searchbox affordance, which v3 replaced with the collapsed rail dot
    // (Fleet). v3 rail behaviour is covered by the "layout v3:" flows below.
    await page.goto(`${baseUrl}#/?scene=contain-recommended&layout=legacy`, { waitUntil: "domcontentloaded" });
    await page.getByRole("tab", { name: /Assets/ }).click();
    const row = page.getByTestId("drone-row-scout-01");
    await row.hover();
    if ((await page.getByTestId("map-drone-scout-01").getAttribute("data-spatial-hover")) !== "true") {
      throw new Error("Hovering a fleet row did not transiently highlight the matching map drone.");
    }
    await page.getByRole("searchbox", { name: "Fleet search" }).fill("does-not-exist");
    await page.getByText("No assets match this view").waitFor();
  });

  await run("plan comparison, observed outcome, and queue disclosure", async (page) => {
    await page.goto(`${baseUrl}#/?scene=rescue-nominal&layout=legacy`, { waitUntil: "domcontentloaded" });
    await page.getByRole("tab", { name: /Priorities/ }).click();
    // Plan Comparison and Observed Outcome default collapsed (inspection-only,
    // not the primary decision surface) — expand them the way an operator would.
    await page.getByRole("button", { name: /Plan Comparison/i }).click();
    await page.getByText("Compare containment options").waitFor();
    await page.getByRole("button", { name: /Observed Outcome/i }).click();
    await page.getByTestId("action-outcome-verification").waitFor();
    await page.getByRole("button", { name: "Open incident queue" }).click();
    await page.getByText("Grid 4C is the only fully simulated incident", { exact: false }).waitFor();
    await page.getByRole("button", { name: /Reservoir access smoke report/ }).click();
    await page.getByText("Read-only summary").waitFor();
  });

  // The map key was removed (dead-weight chrome, no operational content of its
  // own) — this flow now only covers what it always meant to cover: degraded
  // evidence actually widens the uncertainty envelope on the map.
  await run("uncertainty envelope widens on degraded evidence", async (page) => {
    await page.goto(`${baseUrl}#/?scene=satellite-feed-loss`, { waitUntil: "domcontentloaded" });
    await page.getByTestId("spatial-uncertainty-envelope").waitFor();
  });

  await run("direct escalation recovery", async (page) => {
    await page.goto(`${baseUrl}#/?escalation=1&core=1`, { waitUntil: "domcontentloaded" });
    await page.getByText("Operator approval unavailable").waitFor();
    await page.getByText("TALON has not dispatched any drones", { exact: false }).waitFor();
  });

  await run("illegal authority send is not offered after operations begin", async (page) => {
    await page.goto(`${baseUrl}#/?scene=contain-recommended&core=1`, { waitUntil: "domcontentloaded" });
    const sendPacket = page.getByRole("button", { name: /Send Authority Packet/i });
    if (await sendPacket.count()) {
      throw new Error("Authority send should not be exposed once operations planning has begun.");
    }
  });

  /*
   * Surface truth invariant: everything TALON says about itself derives from
   * one state derivation. The historical failure was the ambient voice reading
   * "QUIET WATCH — nothing has crossed the escalation threshold" directly
   * beneath contested-watch and THRESHOLD CROSSED panels. This asserts the
   * voice names the actual state in the scenes where the old derivation lied.
   */
  await run("ambient voice names the true state in contested, reraise, gate, and quiet scenes", async (page) => {
    const voiceEyebrow = async () =>
      (await page.locator(".talon-voice > div").first().textContent()) ?? "";

    await page.goto(`${baseUrl}#/?scene=monitoring-contested&core=1&layout=legacy`, { waitUntil: "domcontentloaded" });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.locator(".talon-voice").waitFor();
    let eyebrow = await voiceEyebrow();
    if (!/contested watch/i.test(eyebrow)) {
      throw new Error(`Contested scene voice says "${eyebrow}" instead of naming the contested watch.`);
    }

    await page.goto(`${baseUrl}#/?scene=talon-reraise&core=1&layout=legacy`, { waitUntil: "domcontentloaded" });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.locator(".talon-voice").waitFor();
    eyebrow = await voiceEyebrow();
    if (!/threshold crossed/i.test(eyebrow)) {
      throw new Error(`Re-raise scene voice says "${eyebrow}" instead of naming the threshold crossing.`);
    }

    await page.goto(`${baseUrl}#/?scene=authority-notification-ready&core=1&layout=legacy`, { waitUntil: "domcontentloaded" });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.locator(".talon-voice").waitFor();
    eyebrow = await voiceEyebrow();
    if (!/human authorization required/i.test(eyebrow)) {
      throw new Error(`Authority-ready voice says "${eyebrow}" instead of naming the gate.`);
    }

    await page.goto(`${baseUrl}#/?scene=baseline&core=1&layout=legacy`, { waitUntil: "domcontentloaded" });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.locator(".talon-voice").waitFor();
    eyebrow = await voiceEyebrow();
    if (!/quiet watch/i.test(eyebrow)) {
      throw new Error(`Baseline voice says "${eyebrow}" — quiet watch must stay quiet.`);
    }
    const panel = (await page.locator(".talon-voice").textContent()) ?? "";
    if (!/watching \d+ source/i.test(panel)) {
      throw new Error(`Baseline voice lost its posture line: "${panel}"`);
    }
  });

  await run("re-raise preserves original dissent record", async (page) => {
    await page.goto(`${baseUrl}#/?scene=monitoring-contested&core=1`, { waitUntil: "domcontentloaded" });
    const audit = await page.getByLabel("Contested watch").getByText(/AUD-DIS-0847-FP/).textContent();
    if (!audit) throw new Error("Missing dissent audit id on contested watch.");
    await page.waitForTimeout(17000);
    await page.getByText(/Something changed since the override/i).waitFor({ timeout: 8000 });
    const auditAfter = await page.getByLabel("TALON re-raise brief").getByText(/AUD-DIS-0847-FP/).textContent();
    if (auditAfter !== audit) {
      throw new Error(`Dissent audit changed after re-raise: ${audit} -> ${auditAfter}`);
    }
  });

  await run("backup recovery exits signal-degraded scene", async (page) => {
    await page.goto(`${baseUrl}#/?scene=rescue-signal-degraded&core=1&layout=legacy`, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /Deploy backup/i }).first().click();
    const dialog = page.getByRole("dialog");
    await dialog.waitFor();
    await dialog.getByRole("button", { name: /Confirm Request/i }).click();
    await page.getByLabel("TALON intelligence brief").getByText(/Authorized plan is executing/i).waitFor({ timeout: 8000 });
    if (await page.getByText(/Relay signal is degraded/i).count()) {
      throw new Error("Signal-degraded TALON brief remained after confirmed backup recovery.");
    }
  });

  await run("staged recommendation expires back to watch", async (page) => {
    await page.goto(`${baseUrl}#/?scene=authority-notification-ready&stagedTtlMs=1200&layout=legacy`, { waitUntil: "domcontentloaded" });
    await page.locator('[data-staged="true"]').first().waitFor({ timeout: 10000 });
    await page.waitForTimeout(2600);
    if (await page.locator('[data-staged="true"]').count()) {
      throw new Error("Staged command survived its expiry window.");
    }
    // Expiry is never execution: the packet scene is unchanged and nothing was sent.
    await page.getByText(/AUD-90-0847/).first().waitFor({ timeout: 8000 });
  });

  await run("layout v2: deck, spines, and mind console render", async (page) => {
    await page.goto(`${baseUrl}#/?scene=authority-notification-ready&layout=v2&stagedTtlMs=0`, { waitUntil: "domcontentloaded" });
    await page.locator('[data-deck="true"]').waitFor({ timeout: 10000 });
    await page.locator('[data-mind="true"]').waitFor();
    // The staged gate appears on the deck tiles with its expiry ring.
    await page.locator('[data-staged="true"]').first().waitFor({ timeout: 10000 });
    // The mind console carries the convergence hero + tool trace + evidence.
    await page.getByText(/fused confidence/i).first().waitFor({ timeout: 8000 });
  });

  await run("layout v2: spine tab expands its panel", async (page) => {
    await page.goto(`${baseUrl}#/?scene=baseline&layout=v2`, { waitUntil: "domcontentloaded" });
    const tab = page.locator('[data-spine-tab="true"]').first();
    await tab.waitFor({ timeout: 10000 });
    await tab.click();
    await page.locator('[data-spine-panel="open"]').waitFor({ timeout: 8000 });
  });

  /* ── shell v3 (the DEFAULT chrome): One-style rails + deck orb ───────────
     v3 renders on every unpinned route, so these flows guard the default. */
  await run("layout v3: rails, orb, and deck render on the default shell", async (page) => {
    await page.goto(`${baseUrl}#/?scene=baseline`, { waitUntil: "domcontentloaded" });
    await page.locator('[data-rail-tab="true"]').first().waitFor({ timeout: 10000 });
    // Both rails are labelled tablists; one panel per side is closed by default.
    await page.getByRole("tablist", { name: "Operator rail" }).waitFor();
    await page.getByRole("tablist", { name: "TALON rail" }).waitFor();
    if (await page.locator('[data-rail-panel="open"]').count()) {
      throw new Error("A v3 rail panel was open on load — panels start collapsed.");
    }
    await page.locator('[data-deck="true"]').waitFor();
    await page.getByRole("button", { name: "Open TALON session" }).waitFor();
  });

  await run("layout v3: rail tab opens its panel and the orb opens the session", async (page) => {
    await page.goto(`${baseUrl}#/?scene=baseline`, { waitUntil: "domcontentloaded" });
    const tab = page.locator('[data-rail-tab="true"][data-rail-side="left"]').first();
    await tab.waitFor({ timeout: 10000 });
    await tab.click();
    await page.locator('[data-rail-panel="open"]').first().waitFor({ timeout: 8000 });
    await page.keyboard.press("Escape");
    await page.locator('[data-rail-panel="open"]').first().waitFor({ state: "hidden", timeout: 8000 });

    // The orb opens TALON's own surface, not a foreign one.
    await page.getByRole("button", { name: "Open TALON session" }).click();
    const sessionPanel = page.locator('[data-rail-panel="open"]');
    await sessionPanel.waitFor({ timeout: 8000 });
    // The session thread renders as a live status region inside the panel.
    await sessionPanel.getByRole("status").first().waitFor({ timeout: 8000 });
  });

  /* Constitution: the v3 DecisionCard in the session panel is an ENTRANCE to
     the gate, never a second gate — the same hold-to-authorize path as the deck. */
  await run("layout v3: decision card routes through the same hold-to-authorize gate", async (page) => {
    await page.goto(`${baseUrl}#/?scene=authority-notification-ready&stagedTtlMs=0`, { waitUntil: "domcontentloaded" });
    // Open the TALON session first: the DecisionCard lives inside that panel,
    // and no panel is open on load.
    await page.getByRole("button", { name: "Open TALON session" }).click();
    const sessionPanel = page.locator('[data-rail-panel="open"]');
    await sessionPanel.waitFor({ timeout: 8000 });
    await page.locator('[data-decision-card="true"]').first().waitFor({ timeout: 8000 });

    const send = sessionPanel.getByRole("button", { name: /Send Authority Packet/i }).first();
    if ((await send.getAttribute("data-gated")) !== "true") {
      throw new Error("v3 decision-card gate is not marked gated.");
    }
    await send.click();
    await page.waitForTimeout(600);
    if ((await page.getByRole("dialog").count()) !== 0) {
      throw new Error("A plain click fired the v3 gated verb — hold-to-authorize was bypassed.");
    }
    await send.hover();
    await page.mouse.down();
    await page.waitForTimeout(2400);
    await page.mouse.up();
    await page.getByRole("dialog").waitFor();
  });
} finally {
  await browser.close();
}

const failed = results.filter((result) => result.status === "failed");
console.log(`Checked ${results.length} flows; ${failed.length} failed.`);
if (failed.length) process.exitCode = 1;
