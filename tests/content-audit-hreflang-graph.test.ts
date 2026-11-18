import { expect, it } from "vitest";
// @ts-expect-error development ESM evaluator
import { evaluateHreflangGraph } from "../scripts/enterprise-technical-seo/hreflang-graph.mjs";
const a = "https://example.com/en";
const b = "https://example.de/de";
const assessmentAt = "2026-11-19T12:00:00Z";
function page(url: string, targets: string[], complete = true) {
  return {
    url,
    capturedAt: "2026-11-19T11:30:00Z",
    complete,
    alternates: targets.map((targetUrl, i) => ({
      language: i ? "de" : "en",
      targetUrl,
    })),
  };
}
function input() {
  return {
    assessmentAt,
    maxAgeSeconds: 3600,
    targetUrl: a,
    method: "html-source",
    pages: [page(a, [a, b]), page(b, [a, b])],
  };
}
function statuses(value = input()) {
  return evaluateHreflangGraph(value).checks.map(
    (c: { status: string }) => c.status,
  );
}
it("checks cross-domain reciprocal pairs without requiring x-default", () => {
  expect(statuses()).toEqual(["pass", "pass"]);
  expect(evaluateHreflangGraph(input()).languageValidity).toBe("pass");
  expect(evaluateHreflangGraph(input()).contentEquivalence).toBe("unknown");
});
it("missing targets stay unknown with a targeted data request", () => {
  const x = input();
  x.pages.pop();
  expect(statuses(x)).toEqual(["pass", "unknown"]);
  expect(evaluateHreflangGraph(x).dataRequests).toContainEqual({
    url: b,
    reason: "missing-target-capture",
  });
});
it("complete missing return link fails; incomplete missing return stays unknown", () => {
  const x = input();
  x.pages[1] = page(b, [b]);
  expect(statuses(x)).toEqual(["pass", "fail"]);
  x.pages[1].complete = false;
  expect(statuses(x)).toEqual(["pass", "unknown"]);
});
it("observed return links suffice even when target enumeration is partial", () => {
  const x = input();
  x.pages[1].complete = false;
  expect(statuses(x)).toEqual(["pass", "pass"]);
});
it("does not require an identical global clique", () => {
  const x = input();
  x.pages[1].alternates.push({
    language: "fr",
    targetUrl: "https://example.fr/fr",
  });
  expect(statuses(x)).toEqual(["pass", "pass"]);
});
it("requires complete root enumeration for a reciprocal pass", () => {
  const x = input();
  x.pages[0].complete = false;
  expect(statuses(x)).toEqual(["pass", "unknown"]);
});
it("absent declarations are unknown rather than a multilingual assumption", () => {
  const x = input();
  x.pages[0].alternates = [];
  expect(statuses(x)).toEqual(["unknown", "unknown"]);
});
it("missing self reference fails only for a complete nonempty set", () => {
  const x = input();
  x.pages[0] = page(a, [b]);
  expect(statuses(x)[0]).toBe("fail");
  x.pages[0].complete = false;
  expect(statuses(x)[0]).toBe("unknown");
});
it("expires target and root independently at the exclusive boundary", () => {
  const x = input();
  x.pages[1].capturedAt = "2026-11-19T11:00:00Z";
  expect(statuses(x)).toEqual(["pass", "unknown"]);
  x.pages[0].capturedAt = "2026-11-19T11:00:00Z";
  expect(statuses(x)).toEqual(["unknown", "unknown"]);
});
it("does not merge path case, slash or query order", () => {
  for (const url of [a + "/", "https://example.com/EN", a + "?a=1&b=2"]) {
    const x = input();
    x.pages[1] = page(b, [url, b]);
    expect(statuses(x)[1]).toBe("fail");
  }
});
it("missing root is unknown", () => {
  const x = input();
  x.pages.shift();
  expect(statuses(x)).toEqual(["unknown", "unknown"]);
});
it("rejects duplicate pages, mixed methods and invalid timestamps", () => {
  const x = input();
  x.pages.push(page(a, [a]));
  expect(() => statuses(x)).toThrow();
  expect(() =>
    evaluateHreflangGraph({ ...input(), method: "mixed" }),
  ).toThrow();
  expect(() =>
    evaluateHreflangGraph({ ...input(), assessmentAt: "2026-02-30T12:00:00Z" }),
  ).toThrow();
});
it("rejects future captures and invalid budgets", () => {
  const x = input();
  x.pages[1].capturedAt = "2026-11-19T12:00:01Z";
  expect(() => statuses(x)).toThrow();
  for (const maxAgeSeconds of [-1, NaN, Infinity, 0.5])
    expect(() =>
      evaluateHreflangGraph({ ...input(), maxAgeSeconds }),
    ).toThrow();
});
it("rejects unsafe targets and unrecognized fields without echoing values", () => {
  for (const targetUrl of [
    "/relative",
    a + "#fragment",
    "https://secret@example.com/",
    "javascript:alert(1)",
  ]) {
    const x = input();
    x.pages[0].alternates[0].targetUrl = targetUrl;
    expect(() => statuses(x)).toThrow();
  }
  expect(() =>
    evaluateHreflangGraph({ ...input(), credential: "secret" }),
  ).toThrow("Invalid graph fields");
});

it("requests intended alternates for self-only declarations without assuming multilingual need", () => {
  const x = input();
  x.pages = [page(a, [a])];
  expect(statuses(x)).toEqual(["pass", "unknown"]);
  expect(evaluateHreflangGraph(x).dataRequests).toContainEqual({
    url: a,
    reason: "alternate-urls-or-no-alternates-confirmation-required",
  });
});

it("separates invalid labels from valid graph topology", () => {
  const x = input();
  x.pages[0].alternates[0].language = "zz";
  expect(statuses(x)).toEqual(["pass", "pass"]);
  expect(evaluateHreflangGraph(x).languageValidity).toBe("fail");
});
it("detects conflicting targets for one case-insensitive label", () => {
  const x = input();
  x.pages[0].alternates[1].language = "EN";
  expect(evaluateHreflangGraph(x).languageMapping).toBe("fail");
});
it("allows duplicate same-target labels and many labels for one URL", () => {
  const x = input();
  x.pages[0].alternates.push(
    { language: "EN", targetUrl: a },
    { language: "en-US", targetUrl: a },
  );
  expect(evaluateHreflangGraph(x).languageMapping).toBe("pass");
});
it("does not pass language checks on expired or incomplete enumeration", () => {
  const x = input();
  x.pages[0].complete = false;
  expect(evaluateHreflangGraph(x).languageValidity).toBe("unknown");
  expect(evaluateHreflangGraph(x).languageMapping).toBe("unknown");
  x.pages[0].capturedAt = "2026-11-19T11:00:00Z";
  x.pages[0].alternates[0].language = "zz";
  expect(evaluateHreflangGraph(x).languageValidity).toBe("unknown");
});

it.each(["", "en_US"])(
  "assesses malformed bounded label %s rather than dropping the capture",
  (language) => {
    const x = input();
    x.pages[0].alternates[0].language = language;
    expect(evaluateHreflangGraph(x).languageValidity).toBe("fail");
  },
);
it("requests review for deprecated language subtags", () => {
  const x = input();
  x.pages[0].alternates[0].language = "iw";
  expect(evaluateHreflangGraph(x).dataRequests).toContainEqual({
    url: a,
    reason: "language-or-region-assignment-review-required",
  });
});
