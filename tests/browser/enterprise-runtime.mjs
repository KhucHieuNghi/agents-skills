import process from "node:process";
import { URL } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import console from "node:console";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "../../site/node_modules/@playwright/test/index.mjs";
import { startRuntimeFixture, digest } from "./enterprise-runtime-fixture.mjs";
import { authorizeAction } from "../../skills/content-search-audit/scripts/lib/authorization.mjs";
import { evaluateTrackingJourney } from "../../skills/content-search-audit/scripts/lib/tracking-evaluation.mjs";
import { evaluateConsentScenarios } from "../../skills/content-search-audit/scripts/lib/consent-scenarios.mjs";

const output = path.resolve(
  process.argv[2] ?? "build/enterprise-browser-runtime",
);
await fs.mkdir(output); // Never overwrite an earlier observation run.
const browser = await chromium.launch({ headless: true });
const results = [];
const definitions = [
  {
    id: "consent-storage-leak",
    query: "consent=storage-leak",
    steps: ["reject"],
    consent: "basic",
    expected: "fail",
  },
  {
    id: "consent-default-drift",
    query: "consent=default-drift",
    steps: ["accept", "revoke"],
    consent: "basic",
    expected: "fail",
  },
  {
    id: "spa-clean",
    query: "spa=clean",
    steps: ["navigate"],
    event: "page_view",
    expected: "pass",
  },
  {
    id: "spa-duplicate",
    query: "spa=duplicate",
    steps: ["navigate"],
    event: "page_view",
    expected: "fail",
  },
  {
    id: "lead-accepted",
    query: "submit=normal",
    steps: ["submit"],
    event: "lead",
    expected: "pass",
  },
  {
    id: "lead-rejected",
    query: "submit=reject",
    steps: ["submit"],
    event: "lead",
    expected: "fail",
  },
  {
    id: "retry-suppressed",
    query: "retry=normal",
    steps: ["purchase"],
    event: "purchase",
    dedup: true,
    expected: "pass",
  },
  {
    id: "retry-duplicate",
    query: "retry=duplicate",
    steps: ["purchase"],
    event: "purchase",
    dedup: true,
    expected: "fail",
  },
  {
    id: "refund-separate",
    query: "retry=normal",
    steps: ["purchase", "refund"],
    event: "purchase",
    dedup: true,
    expected: "pass",
  },
  {
    id: "consent-basic-reject",
    query: "consent=basic",
    steps: ["reject"],
    consent: "basic",
    expected: "pass",
  },
  {
    id: "consent-advanced-denied",
    query: "consent=advanced",
    steps: ["reject"],
    consent: "advanced",
    expected: "pass",
  },
  {
    id: "consent-denied-leak",
    query: "consent=leak",
    steps: ["reject"],
    consent: "advanced",
    expected: "fail",
  },
  {
    id: "consent-revoke",
    query: "consent=basic",
    steps: ["accept", "revoke"],
    consent: "basic",
    expected: "pass",
  },
];
try {
  for (const definition of definitions) {
    let captureOrder = 0;
    const fixture = await startRuntimeFixture((receipt) => {
      receipt.captureOrder = captureOrder++;
    });
    const context = await browser.newContext({
      serviceWorkers: "block",
      acceptDownloads: false,
    });
    const events = [],
      network = [],
      blocked = [],
      errors = [];
    const from = new Date().toISOString();
    const scope = {
      customerId: "synthetic-browser",
      entityId: "fixture",
      environment: "sandbox",
      journeyId: definition.event ?? "consent",
      scenarioId: definition.id,
      windowId: "capture",
    };
    const grant = {
      authorizationRef: "local-fixture",
      customerId: scope.customerId,
      environment: "sandbox",
      assetIds: ["fixture"],
      allowedActions: ["read", "submit-test"],
      identityId: "synthetic-user",
      grantedAt: from,
      expiresAt: new Date(Date.now() + 60000).toISOString(),
      revokedAt: null,
      sideEffectConstraints: { allowRealTransactions: false },
    };
    const authContext = {
      customerId: scope.customerId,
      environment: "sandbox",
      assetId: "fixture",
      identityId: "synthetic-user",
      operationMode: "audit",
      trustedAuthorizations: [grant],
    };
    try {
      await context.route("**/*", async (route) => {
        const url = new URL(route.request().url());
        if (url.origin !== fixture.origin) {
          blocked.push({ reason: "outside-fixture-origin" });
          await route.abort();
          return;
        }
        await route.continue();
      });
      await context.routeWebSocket("**/*", (socket) => socket.close());
      await context.exposeBinding("__fixtureObservation", (_, value) => {
        events.push({
          ...value,
          at: new Date().toISOString(),
          captureOrder: captureOrder++,
        });
      });
      await context.addInitScript(() => {
        const pending = [];
        const observe = (value) => {
          pending.push(window.__fixtureObservation(value));
        };
        window.__fixtureFlush = () => Promise.all(pending);
        const cookie = Object.getOwnPropertyDescriptor(
          window.Document.prototype,
          "cookie",
        );
        if (!cookie?.get || !cookie?.set)
          throw Error("Cookie observation unavailable");
        Object.defineProperty(window.Document.prototype, "cookie", {
          configurable: cookie.configurable,
          enumerable: cookie.enumerable,
          get() {
            observe({ kind: "storage", operation: "read" });
            return cookie.get.call(this);
          },
          set(value) {
            observe({
              kind: "storage",
              operation: /max-age=0/i.test(value) ? "delete" : "write",
            });
            cookie.set.call(this, value);
          },
        });
        for (const [method, operation] of [
          ["getItem", "read"],
          ["setItem", "write"],
          ["removeItem", "delete"],
          ["clear", "delete"],
        ]) {
          const original = window.Storage.prototype[method];
          window.Storage.prototype[method] = function (...args) {
            observe({ kind: "storage", operation });
            return original.apply(this, args);
          };
        }
        const values = [];
        values.push = function (...items) {
          for (const item of items)
            if (typeof item?.event === "string")
              observe({
                kind: "data-layer",
                event: item.event,
              });
          return Array.prototype.push.apply(this, items);
        };
        window.dataLayer = values;
        window.addEventListener("fixture-consent", (event) => {
          observe({
            kind: "state",
            transition: event.detail.transition,
            state: event.detail.state,
          });
        });
      });
      const page = await context.newPage();
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("response", (response) => {
        if (response.url() === fixture.origin + "/collect")
          network.push({
            status: response.status(),
            at: new Date().toISOString(),
          });
      });
      assert.equal(
        authorizeAction(
          grant,
          { kind: "read", realTransaction: false },
          authContext,
          new Date().toISOString(),
        ).allowed,
        true,
      );
      await page.goto(fixture.origin + "/?" + definition.query);
      // A read grant must never become authority to submit a test.
      const readOnly = { ...grant, allowedActions: ["read"] };
      assert.equal(
        authorizeAction(
          readOnly,
          { kind: "submit-test", realTransaction: false },
          { ...authContext, trustedAuthorizations: [readOnly] },
          new Date().toISOString(),
        ).allowed,
        false,
      );
      const initialReceipts = fixture.receipts.length;
      assert.equal(initialReceipts, 0);
      for (const step of definition.steps) {
        assert.equal(
          authorizeAction(
            grant,
            { kind: "submit-test", realTransaction: false },
            authContext,
            new Date().toISOString(),
          ).allowed,
          true,
        );
        await page.locator("#result").evaluate((node) => {
          node.textContent = "";
        });
        await page.locator("#" + step).click();
        await page.waitForFunction(
          (step) =>
            step === "purchase"
              ? window.document.querySelector("#result").textContent ===
                "retry-complete"
              : window.document.querySelector("#result").textContent !== "",
          step,
        );
        if (step === "purchase")
          await page.waitForFunction(() => window.dataLayer.length > 0);
      }
      // Drain binding callbacks and await both retry receipts before ending the finite fixture window.
      const expectedReceipts = definition.steps.reduce(
        (n, s) =>
          n +
          (s === "purchase"
            ? 2
            : s === "revoke" ||
                (s === "reject" && definition.consent === "basic")
              ? 0
              : 1),
        0,
      );

      for (
        let i = 0;
        i < 100 && fixture.receipts.length < expectedReceipts;
        i++
      )
        await delay(10);
      assert.equal(fixture.receipts.length, expectedReceipts);
      await page.evaluate(() => window.__fixtureFlush());
      const cookies = await context.cookies();
      assert.deepEqual(errors, []);
      assert.deepEqual(blocked, []);
      // Ensure the half-open window ends strictly after every recorded observation.
      const latest = Math.max(
        Date.now(),
        ...events.map((e) => Date.parse(e.at)),
        ...fixture.receipts.map((r) => Date.parse(r.observedAt)),
      );
      const to = new Date(latest + 1).toISOString(),
        assessmentAt = new Date(latest + 2).toISOString();
      const window = { from, to };
      const envelope = (sourceId, sourceKind, artifact) => ({
        sourceId,
        sourceKind,
        locator: "local synthetic browser fixture",
        capturedAt: assessmentAt,
        synthetic: true,
        artifactText: JSON.stringify(artifact),
        artifactHash: digest(JSON.stringify(artifact)),
      });
      let evaluation, inputs, contract, evaluationContext;
      if (!definition.consent) {
        const correlation = digest(definition.id);
        const layer = events
          .filter((e) => e.kind === "data-layer")
          .map((e, i) => ({
            observationId: "layer-" + i,
            stage: "data-layer",
            eventKey: "layer-" + i,
            correlationDigest: correlation,
            eventName: e.event,
            status: "emitted",
            observedAt: e.at,
          }));
        const backend = fixture.receipts.map((r, i) => ({
          observationId: "backend-" + i,
          stage: "business",
          eventKey: "backend-" + i,
          correlationDigest: correlation,
          eventName: r.event,
          status:
            r.disposition === "rejected"
              ? "rejected"
              : r.event === "refund"
                ? "refunded"
                : "accepted",
          observedAt: r.observedAt,
          delivery: {
            attemptDigest: digest(r.attempt),
            logicalEventDigest: digest(r.event + ":" + r.logical),
            disposition: r.disposition,
          },
        }));
        inputs = [
          envelope("browser", "browser-trace", {
            scope,
            clockId: "node-observation",
            coverage: [{ stage: "data-layer", ...window, complete: true }],
            records: layer,
          }),
          envelope("backend", "business-export", {
            scope,
            clockId: "node-backend",
            coverage: [{ stage: "business", ...window, complete: true }],
            records: backend,
          }),
        ];
        contract = {
          contractId: definition.id,
          owner: "fixture-test",
          scope,
          correlations: [correlation],
          minimumSampleSize: 1,
          providerLagSeconds: 0,
          expectations: [
            {
              stage: "data-layer",
              eventName: definition.event,
              acceptedStatuses: ["emitted"],
              forbiddenStatuses: [],
              minCount: 1,
              maxCount: 1,
            },
            {
              stage: "business",
              eventName: definition.event,
              acceptedStatuses: ["accepted"],
              forbiddenStatuses: ["rejected"],
              minCount: definition.dedup ? 2 : 1,
              maxCount: definition.dedup ? 2 : 1,
            },
          ],
          ...(definition.dedup
            ? {
                dedupRules: [
                  { id: "retry", stage: "business", minimumAttempts: 2 },
                ],
              }
            : {}),
        };
        evaluationContext = {
          ...scope,
          window,
          assessmentAt,
          maxAgeSeconds: 60,
        };
        evaluation = evaluateTrackingJourney(
          contract,
          inputs,
          evaluationContext,
        );
        assert.equal(evaluation.status, definition.expected);
        if (definition.id === "lead-rejected") {
          assert.equal(evaluation.checks[0].status, "pass");
          assert.equal(evaluation.checks[1].reason, "forbidden-status");
        }
        if (definition.id === "spa-duplicate") {
          assert.equal(evaluation.checks[0].reason, "count-out-of-range");
          assert.equal(evaluation.checks[1].status, "pass");
        }
        if (definition.dedup) {
          const dedup = evaluation.checks.find(
            (c) => c.checkKind === "dedup-retry",
          );
          assert.equal(
            dedup.reason,
            definition.id === "retry-duplicate"
              ? "duplicate-accepted-event"
              : "supplied-dedup-receipts-consistent",
          );
          assert.equal(evaluation.checks[0].status, "pass");
          assert.equal(evaluation.checks[1].status, "pass");
        }
        if (definition.id === "refund-separate")
          assert.equal(
            backend.filter((r) => r.status === "refunded").length,
            1,
          );
      } else {
        const consentScope = {
          customerId: scope.customerId,
          entityId: scope.entityId,
          environment: scope.environment,
        };
        const records = [
          ...events
            .filter((e) => e.kind === "state")
            .map((e) => ({
              kind: "state",
              transition: e.transition,
              state: { analytics_storage: e.state },
              at: e.at,
              captureOrder: e.captureOrder,
            })),
          ...events
            .filter((e) => e.kind === "storage")
            .map((e) => ({
              kind: "storage",
              category: "analytics_storage",
              operation: e.operation,
              at: e.at,
              captureOrder: e.captureOrder,
            })),
          ...fixture.receipts.map((r) => ({
            kind: "request",
            category: "analytics_storage",
            at: r.observedAt,
            captureOrder: r.captureOrder,
            cookieless: !r.cookiePresent,
            cookiesAttached: r.cookiePresent,
            identifiersPresent: false,
          })),
        ]
          .sort((a, b) => a.captureOrder - b.captureOrder)
          .map((record, i) => {
            const r = { ...record, id: "r-" + i, sequence: i };
            delete r.captureOrder;
            return r;
          });
        const kind = definition.steps.includes("revoke") ? "revoke" : "reject";
        contract = {
          policyId: definition.id,
          owner: "fixture-test",
          scope: consentScope,
          categories: ["analytics_storage"],
          deniedRules: {
            analytics_storage: {
              requests:
                definition.consent === "basic" ? "blocked" : "cookieless",
              storageRead: false,
              storageWrite: false,
              cookies: false,
              identifiers: false,
            },
          },
          scenarios: [
            {
              scenarioId: definition.id,
              kind,
              region: "synthetic",
              surface: "client",
              mode: definition.consent,
              window,
              transitions: [
                {
                  transition: "default",
                  state: { analytics_storage: "denied" },
                },
                ...definition.steps.map((transition) => ({
                  transition,
                  state: {
                    analytics_storage:
                      transition === "accept" ? "granted" : "denied",
                  },
                })),
              ],
            },
          ],
        };
        inputs = [
          envelope("browser", "browser-trace", {
            scope: consentScope,
            scenarioId: definition.id,
            region: "synthetic",
            surface: "client",
            mode: definition.consent,
            clockId: "node-observation",
            window,
            complete: true,
            records,
          }),
        ];
        evaluationContext = {
          ...consentScope,
          assessmentAt,
          maxAgeSeconds: 60,
        };
        evaluation = evaluateConsentScenarios(
          contract,
          inputs,
          evaluationContext,
        );
        assert.equal(evaluation.checks[0].status, definition.expected);
        assert.equal(evaluation.assessmentAccepted, false);
        const expectedViolations = {
          "consent-storage-leak": ["denied-storage"],
          "consent-default-drift": ["transition-mismatch"],
          "consent-denied-leak": [
            "denied-storage",
            "identified-denied-request",
          ],
        };
        assert.deepEqual(
          evaluation.checks[0].violations,
          expectedViolations[definition.id] ?? [],
        );
        assert.deepEqual(evaluation.checks[0].gaps, []);
        if (definition.id === "consent-revoke") assert.equal(cookies.length, 0);
      }
      const evidence = {
        definition,
        scope,
        window,
        events,
        network,
        backend: fixture.receipts,
        cookieCount: cookies.length,
        blocked,
        errors,
        contract,
        inputs,
        evaluationContext,
        evaluation,
        synthetic: true,
        limitations: [
          "Local synthetic application only; not a real provider or native-host behavioral trial.",
          "Consent records combine controlled fixture state, document.cookie/Storage API instrumentation and backend cookie inspection; not a general CMP collector.",
          "Finite fixture coverage does not prove arbitrary website or browser network completeness.",
        ],
      };
      const bytes = JSON.stringify(evidence, null, 2) + "\n";
      await fs.writeFile(path.join(output, definition.id + ".json"), bytes);
      results.push({
        id: definition.id,
        expected: definition.expected,
        actual: definition.consent
          ? evaluation.checks[0].status
          : evaluation.status,
        artifact: definition.id + ".json",
        sha256: digest(bytes),
      });
    } finally {
      await context.close();
      await fixture.close();
    }
  }
  const summary = {
    schemaVersion: 1,
    harnessDigests: Object.fromEntries(
      await Promise.all(
        ["enterprise-runtime.mjs", "enterprise-runtime-fixture.mjs"].map(
          async (name) => [
            name,
            digest(await fs.readFile(new URL(name, import.meta.url))),
          ],
        ),
      ),
    ),
    synthetic: true,
    browserVersion: browser.version(),
    cases: results,
    passed: results.length,
    nativeHostBehavioralTrial: false,
    productionAcceptance: false,
  };
  await fs.writeFile(
    path.join(output, "manifest.json"),
    JSON.stringify(summary, null, 2) + "\n",
  );
  console.log(JSON.stringify(summary));
} finally {
  await browser.close();
}
