import { expect, it } from "vitest";
// @ts-expect-error development ESM evaluator
import { classifyHreflangLanguage } from "../scripts/enterprise-technical-seo/hreflang-language.mjs";
it.each([
  "en",
  "vi-VN",
  "de-BE",
  "zh-Hant",
  "zh-Hans-US",
  "EN-gb",
  "x-default",
  "be",
])("accepts registered supported form %s", (code) => {
  expect(classifyHreflangLanguage(code).status).toBe("pass");
});
it.each([
  "en-UK",
  "en-EU",
  "en-UN",
  "es-419",
  "eng",
  "zz",
  "en_Us",
  "",
  " en",
  "en-US ",
  "en-US-Hans",
  "en-XX",
  "zh-Abcd",
])("rejects unsupported form %s", (code) => {
  expect(classifyHreflangLanguage(code).status).toBe("fail");
});
it.each(["iw", "in-ID", "en-SU", "en-AC", "en-ZZ", "en-CQ"])(
  "retains registry ambiguity %s",
  (code) => {
    expect(classifyHreflangLanguage(code).status).toBe("unknown");
  },
);
it("never infers actual content language and canonicalizes case only", () => {
  expect(classifyHreflangLanguage("EN-us")).toMatchObject({
    normalized: "en-US",
    contentLanguage: "unknown",
  });
  expect(classifyHreflangLanguage("X-DEFAULT").normalized).toBe("x-default");
});
it("bounds untrusted inputs and does not echo invalid data", () => {
  for (const value of [null, {}, 42, "secret".repeat(100)]) {
    expect(classifyHreflangLanguage(value)).toMatchObject({
      status: "fail",
      normalized: null,
    });
    expect(JSON.stringify(classifyHreflangLanguage(value))).not.toContain(
      "secret",
    );
  }
});
