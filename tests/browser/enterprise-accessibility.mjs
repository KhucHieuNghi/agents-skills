import { createServer } from "node:http";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { URL } from "node:url";
import process from "node:process";
import assert from "node:assert/strict";
import { chromium } from "../../site/node_modules/@playwright/test/index.mjs";

assert(
  process.argv[2],
  "Usage: node tests/browser/enterprise-accessibility.mjs NEW_OUTPUT",
);
const output = resolve(process.argv[2]);
await mkdir(output);
const fixtures = {
  "modal-exit":
    '<button id="open">Open</button><dialog id="dialog" aria-label="Details"><button id="first">First</button><button id="last">Last</button></dialog><script>openButton=document.getElementById("open");openButton.onclick=()=>document.getElementById("dialog").showModal();</script>',
  "modal-contained":
    '<button id="open">Open</button><dialog id="dialog"><button id="first">First</button><button id="last">Last</button></dialog><script>document.getElementById("open").onclick=()=>document.getElementById("dialog").showModal();document.getElementById("dialog").addEventListener("cancel",e=>e.preventDefault());</script>',
  "focus-hidden":
    '<button id="target" style="position:absolute;top:40px;left:40px;width:100px;height:40px">Target</button><div id="cover" style="position:absolute;top:30px;left:30px;width:140px;height:80px;background:black"></div>',
  "focus-partial":
    '<button id="target" style="position:absolute;top:40px;left:40px;width:100px;height:40px">Target</button><div id="cover" style="position:absolute;top:30px;left:30px;width:60px;height:80px;background:black"></div>',
  "error-text":
    '<form id="form" novalidate><label for="email">Email</label><input id="email"><button id="submit">Continue</button><p id="error"></p></form><script>document.getElementById("form").onsubmit=e=>{e.preventDefault();document.getElementById("email").setAttribute("aria-invalid","true");document.getElementById("error").textContent="Email is required";};</script>',
  "error-silent":
    '<form id="form" novalidate><label for="email">Email</label><input id="email"><button id="submit">Continue</button><p id="error"></p></form><script>document.getElementById("form").onsubmit=e=>{e.preventDefault();document.getElementById("email").setAttribute("aria-invalid","true");};</script>',
  overflow:
    '<p style="width:600px">This deliberately fixed-width paragraph exceeds the narrow viewport.</p>',
  "booking-failed":
    '<button id="book">Book test slot</button><p id="outcome"></p><script>document.getElementById("book").onclick=async()=>{const r=await fetch("/sandbox-booking",{method:"POST"});document.getElementById("outcome").textContent=r.ok?"Confirmed":"Booking failed";};</script>',
};
const requests = [];
const server = createServer((req, res) => {
  requests.push({ method: req.method, path: req.url });
  if (req.url === "/sandbox-booking") {
    res.writeHead(503, { "Content-Type": "application/json" });
    res.end('{"confirmed":false,"synthetic":true}');
    return;
  }
  const html = fixtures[req.url.slice(1)];
  if (!html) {
    res.writeHead(404);
    res.end();
    return;
  }
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(
    '<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Local scenario fixture</title></head><body><main><h1>Local scenario</h1>' +
      html +
      "</main></body></html>",
  );
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
const receipts = [];
try {
  browser = await chromium.launch({ headless: true });
  for (const [fixture, width] of [
    ...Object.keys(fixtures).map((id) => [id, 320]),
    ["overflow", 390],
  ]) {
    const page = await browser.newPage({ viewport: { width, height: 844 } });
    const trace = [];
    await page.route("**/*", (route) =>
      new URL(route.request().url()).origin === origin
        ? route.continue()
        : route.abort(),
    );
    await page.goto(origin + "/" + fixture);
    const capture = async (action) => {
      const facts = await page.evaluate(() => ({
        focusedId: globalThis.document.activeElement?.id ?? null,
        dialogOpen: globalThis.document.querySelector("dialog")?.open ?? null,
        errorText:
          globalThis.document.querySelector("#error")?.textContent ?? null,
        invalid:
          globalThis.document
            .querySelector("#email")
            ?.getAttribute("aria-invalid") ?? null,
        outcome:
          globalThis.document.querySelector("#outcome")?.textContent ?? null,
        width: globalThis.innerWidth,
        documentWidth: globalThis.document.documentElement.scrollWidth,
      }));
      trace.push({ action, at: new Date().toISOString(), facts });
      return facts;
    };
    await capture("loaded");
    if (fixture.startsWith("modal-")) {
      await page.keyboard.press("Tab");
      await capture("Tab");
      await page.keyboard.press("Enter");
      const opened = await capture("Enter");
      assert.equal(opened.dialogOpen, true);
      assert.equal(opened.focusedId, "first");
      await page.keyboard.press("Tab");
      await capture("Tab");
      await page.keyboard.press("Tab");
      await capture("Tab");
      await page.keyboard.press("Escape");
      const after = await capture("Escape");
      assert.equal(after.dialogOpen, fixture === "modal-contained");
      if (fixture === "modal-exit") assert.equal(after.focusedId, "open");
    } else if (fixture.startsWith("focus-")) {
      await page.keyboard.press("Tab");
      const focused = await capture("Tab");
      assert.equal(focused.focusedId, "target");
      const samples = await page.evaluate(() => {
        const el = globalThis.document.getElementById("target"),
          r = el.getBoundingClientRect();
        return [0.1, 0.5, 0.9].map((x) => ({
          x: r.left + r.width * x,
          y: r.top + r.height / 2,
          hit: globalThis.document.elementFromPoint(
            r.left + r.width * x,
            r.top + r.height / 2,
          )?.id,
        }));
      });
      trace.push({
        action: "sample-hit-targets",
        at: new Date().toISOString(),
        samples,
        limitation:
          "Three points do not prove complete visual visibility or contrast",
      });
      assert.equal(
        samples.some((p) => p.hit === "target"),
        fixture === "focus-partial",
      );
    } else if (fixture.startsWith("error-")) {
      await page.keyboard.press("Tab");
      await capture("Tab");
      await page.keyboard.press("Tab");
      await capture("Tab");
      await page.keyboard.press("Enter");
      const after = await capture("Enter");
      assert.equal(after.invalid, "true");
      assert.equal(
        after.errorText,
        fixture === "error-text" ? "Email is required" : "",
      );
    } else if (fixture === "booking-failed") {
      await page.keyboard.press("Tab");
      await capture("Tab");
      await page.keyboard.press("Enter");
      await page.getByText("Booking failed", { exact: true }).waitFor();
      assert.equal(
        (await capture("terminal-outcome")).outcome,
        "Booking failed",
      );
    } else {
      const after = await capture("measure-viewport");
      assert(after.documentWidth > width);
    }
    const id = fixture + "-" + width;
    const screenshot = await page.screenshot({ fullPage: true });
    await writeFile(resolve(output, id + ".png"), screenshot);
    const artifact = {
      synthetic: true,
      fixture,
      viewport: { width, height: 844 },
      url: origin + "/" + fixture,
      browser: browser.version(),
      trace,
      sourceHtmlDigest: createHash("sha256")
        .update(fixtures[fixture])
        .digest("hex"),
      screenshotHash: createHash("sha256").update(screenshot).digest("hex"),
      conformanceAssessed: false,
      semanticReview: "pending",
    };
    const bytes = JSON.stringify(artifact, null, 2) + "\n";
    await writeFile(resolve(output, id + ".json"), bytes);
    receipts.push({
      id,
      artifactHash: createHash("sha256").update(bytes).digest("hex"),
      steps: trace.length,
    });
    await page.close();
  }
  assert.equal(requests.filter((r) => r.method === "POST").length, 1);
  assert.equal(
    requests.find((r) => r.method === "POST").path,
    "/sandbox-booking",
  );
  await writeFile(
    resolve(output, "verification.json"),
    JSON.stringify(
      {
        passed: true,
        synthetic: true,
        loopbackOnly: true,
        requests,
        receipts,
        conformanceAssessed: false,
      },
      null,
      2,
    ) + "\n",
  );
  process.stdout.write(
    JSON.stringify({
      passed: true,
      cases: receipts.length,
      synthetic: true,
      conformanceAssessed: false,
    }) + "\n",
  );
} finally {
  await browser?.close();
  await new Promise((r) => server.close(r));
}
