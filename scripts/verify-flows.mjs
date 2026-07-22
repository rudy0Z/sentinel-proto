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
    await page.goto(`${baseUrl}#/?scene=verify-active&core=1`, { waitUntil: "domcontentloaded" });
    await page.getByText("SOURCE DISAGREEMENT", { exact: false }).waitFor();
    await page.getByLabel(/verified agricultural burn permits/i).check();
    await page.getByRole("button", { name: "Prepare authority packet" }).click();
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
    await page.goto(`${baseUrl}#/?scene=monitoring-contested&core=1`, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /Ground truth arrived/i }).click();
    await page.getByRole("dialog", { name: /reconciliation/i }).waitFor();
    await page.getByText(/Operator was right|TALON was right|Inconclusive/i).first().waitFor();
    await page.getByText(/System response/i).waitFor();
  });

  /* Regression: the exception banner used to offer a recovery command that
     assigned a drone and left the operator stranded in the degraded scene. */
  await run("degraded scene recovery actually exits the scene", async (page) => {
    await page.goto(`${baseUrl}#/?scene=network-degraded&core=1`, { waitUntil: "domcontentloaded" });
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
    await page.getByRole("button", { name: /Send Authority Packet/i }).first().click();
    await page.getByRole("dialog").waitFor();
    await page.keyboard.press("Escape");
    await page.getByRole("dialog").waitFor({ state: "hidden" });
  });

  await run("TALON scripted session", async (page) => {
    await page.goto(`${baseUrl}#/?scene=contain-recommended&core=1`, {
      waitUntil: "domcontentloaded",
    });
    await page.getByRole("button", { name: "Open TALON session" }).click();
    await page.getByRole("button", { name: "Use scripted fallback" }).click();
    await page.getByText(/Recommendation ready|Human approval required/i).first().waitFor({ timeout: 12000 });
    await page.getByText("Prototype disclosure", { exact: false }).first().waitFor();
  });

  await run("map selection, pinned rail, and drag", async (page) => {
    await page.goto(`${baseUrl}#/?scene=contain-recommended`, { waitUntil: "domcontentloaded" });
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
    await page.goto(`${baseUrl}#/?scene=contain-recommended`, { waitUntil: "domcontentloaded" });
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
    await page.goto(`${baseUrl}#/?scene=rescue-nominal`, { waitUntil: "domcontentloaded" });
    await page.getByRole("tab", { name: /Priorities/ }).click();
    await page.getByText("Compare containment options").waitFor();
    await page.getByTestId("action-outcome-verification").waitFor();
    await page.getByRole("button", { name: "Open incident queue" }).click();
    await page.getByText("Grid 4C is the only fully simulated incident", { exact: false }).waitFor();
    await page.getByRole("button", { name: /Reservoir access smoke report/ }).click();
    await page.getByText("Read-only summary").waitFor();
  });

  await run("map legend and uncertainty envelope", async (page) => {
    await page.goto(`${baseUrl}#/?scene=satellite-feed-loss`, { waitUntil: "domcontentloaded" });
    await page.getByTestId("spatial-uncertainty-envelope").waitFor();
    await page.getByTestId("map-legend-trigger").click();
    await page.getByTestId("map-legend-popover").waitFor();
  });

  await run("direct escalation recovery", async (page) => {
    await page.goto(`${baseUrl}#/?escalation=1&core=1`, { waitUntil: "domcontentloaded" });
    await page.getByText("Operator approval unavailable").waitFor();
    await page.getByText("TALON has not dispatched any drones", { exact: false }).waitFor();
  });
} finally {
  await browser.close();
}

const failed = results.filter((result) => result.status === "failed");
console.log(`Checked ${results.length} flows; ${failed.length} failed.`);
if (failed.length) process.exitCode = 1;
