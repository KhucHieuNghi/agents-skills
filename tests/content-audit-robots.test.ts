import { expect, it } from "vitest";
import {
  parseRobots,
  evaluateRobots,
  robotsAccess,
} from "../skills/content-search-audit/scripts/lib/robots.mjs";
it("merges exact agent groups and selects them instead of wildcard groups", () => {
  const parsed = parseRobots(
    "User-agent: *\nDisallow: /\nUser-agent: nkskillscontentaudit\nDisallow: /private\nUser-agent: NKSkillsContentAudit\nAllow: /private/public\n",
  );
  expect(evaluateRobots(parsed, "https://example.com/open").allowed).toBe(true);
  expect(evaluateRobots(parsed, "https://example.com/private").allowed).toBe(
    false,
  );
  expect(
    evaluateRobots(parsed, "https://example.com/private/public").allowed,
  ).toBe(true);
  expect(
    evaluateRobots(parsed, "https://example.com/open", "OtherBot").allowed,
  ).toBe(false);
});
it("matches case-sensitive paths, wildcard/end anchors and allow ties", () => {
  const parsed = parseRobots(
    "User-agent: *\nDisallow: /*.pdf$\nDisallow: /private\nAllow: /private\nDisallow: /Case\n",
  );
  expect(evaluateRobots(parsed, "https://example.com/a.pdf").allowed).toBe(
    false,
  );
  expect(
    evaluateRobots(parsed, "https://example.com/a.pdf?download=1").allowed,
  ).toBe(true);
  expect(evaluateRobots(parsed, "https://example.com/private").allowed).toBe(
    true,
  );
  expect(evaluateRobots(parsed, "https://example.com/case").allowed).toBe(true);
  expect(evaluateRobots(parsed, "https://example.com/Case").allowed).toBe(
    false,
  );
});
it("normalizes UTF-8 and unreserved escapes without conflating encoded separators", () => {
  const parsed = parseRobots(
    "User-agent: *\nDisallow: /café\nDisallow: /%7Euser\nDisallow: /a%2Fb\n",
  );
  expect(evaluateRobots(parsed, "https://example.com/caf%C3%A9").allowed).toBe(
    false,
  );
  expect(evaluateRobots(parsed, "https://example.com/~user").allowed).toBe(
    false,
  );
  expect(evaluateRobots(parsed, "https://example.com/a%2fb").allowed).toBe(
    false,
  );
  expect(evaluateRobots(parsed, "https://example.com/a/b").allowed).toBe(true);
});
it("retains sitemap declarations and parsing diagnostics without promoting them to crawl permission", () => {
  const parsed = parseRobots(
    "\uFEFFUser-agent: *\r\nDisallow:\r\nSitemap: https://elsewhere.example/map.xml\r\nCrawl-delay: 3\r\nDisallow: invalid\r\nUnknown: ignored\r\n",
  );
  expect(parsed.sitemaps).toEqual(["https://elsewhere.example/map.xml"]);
  expect(parsed.diagnostics.length).toBeGreaterThan(0);
  expect(
    evaluateRobots(parsed, "https://example.com/open").crawlDelaySeconds,
  ).toBe(3);
  expect(evaluateRobots(parsed, "https://example.com/open").allowed).toBe(
    false,
  );
  expect(evaluateRobots(parsed, "https://example.com/robots.txt").allowed).toBe(
    true,
  );
});
it("fails closed on unreachable, auth, rate-limited, malformed and oversized robots responses", () => {
  const url = "https://example.com/page";
  for (const status of [401, 403, 429, 500, 503, 302])
    expect(robotsAccess({ status, body: "" }, url).allowed).toBe(false);
  for (const status of [404, 410])
    expect(robotsAccess({ status, body: "" }, url).allowed).toBe(true);
  expect(robotsAccess({ error: "timeout" }, url).allowed).toBe(false);
  expect(
    robotsAccess({ status: 200, body: "<html>Access denied</html>" }, url)
      .allowed,
  ).toBe(false);
  expect(() => parseRobots("x".repeat(512001))).toThrow(/size/i);
  expect(
    robotsAccess(
      { status: 200, body: "User-agent: *\nDisallow: /private" },
      url,
    ).allowed,
  ).toBe(true);
});
it("distinguishes literal encoded wildcard characters from matching operators", () => {
  const parsed = parseRobots(
    "User-agent: *\nDisallow: /file%2A\nDisallow: /price%24$\n",
  );
  expect(evaluateRobots(parsed, "https://example.com/file*").allowed).toBe(
    false,
  );
  expect(evaluateRobots(parsed, "https://example.com/file-other").allowed).toBe(
    true,
  );
  expect(evaluateRobots(parsed, "https://example.com/price$").allowed).toBe(
    false,
  );
  expect(evaluateRobots(parsed, "https://example.com/price$more").allowed).toBe(
    true,
  );
});
it("preserves empty named groups, adjacent agents and unsupported extension boundaries", () => {
  const parsed = parseRobots(
    "User-agent: *\nDisallow: /\nUser-agent: FirstBot\nSitemap: https://example.com/map.xml\nUser-agent: SecondBot\nDisallow: /shared\nUser-agent: NKSkillsContentAudit\n",
  );
  expect(
    evaluateRobots(parsed, "https://example.com/shared", "FirstBot").allowed,
  ).toBe(false);
  expect(
    evaluateRobots(parsed, "https://example.com/shared", "SecondBot").allowed,
  ).toBe(false);
  expect(evaluateRobots(parsed, "https://example.com/shared").allowed).toBe(
    true,
  );
  expect(
    evaluateRobots(parseRobots("# no restrictions\n"), "https://example.com/")
      .allowed,
  ).toBe(true);
});
it("blocks malformed applicable rules while ignoring malformed rules in a different valid agent group", () => {
  const parsed = parseRobots(
    "User-agent: OtherBot\nDisallow: /bad%xx\nUser-agent: NKSkillsContentAudit\nDisallow: /private\n",
  );
  expect(evaluateRobots(parsed, "https://example.com/open").allowed).toBe(true);
  expect(
    evaluateRobots(parsed, "https://example.com/open", "OtherBot").allowed,
  ).toBe(false);
  expect(
    robotsAccess({ status: 206, body: "User-agent: *" }, "https://example.com/")
      .allowed,
  ).toBe(false);
});
