import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const siteRoot = fileURLToPath(new URL("../", import.meta.url));

describe("rendered brand shell", () => {
  it("makes the bilingual site navigable and branded without client JavaScript", () => {
    execFileSync("npm", ["run", "build"], { cwd: siteRoot, stdio: "pipe" });

    const english = readFileSync(
      new URL("../dist/en/index.html", import.meta.url),
      "utf8",
    );
    const vietnamese = readFileSync(
      new URL("../dist/vi/index.html", import.meta.url),
      "utf8",
    );

    expect(english).toMatch(/<html[^>]*lang="en"/);
    expect(vietnamese).toMatch(/<html[^>]*lang="vi"/);
    for (const html of [english, vietnamese]) {
      expect(html).toContain('href="#main-content"');
      expect(html).toContain('id="main-content"');
      expect(html).toContain("/brand/nkskills-mark.svg");
      expect(html).toContain('name="theme-color" content="#FFFFFF"');
    }
  });
});
