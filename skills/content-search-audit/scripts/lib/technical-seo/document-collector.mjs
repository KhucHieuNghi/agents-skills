import { randomUUID } from "node:crypto";
import { projectCanonicalDocument } from "./document.mjs";
/** Chromium-only host helper. The caller owns navigation authority and response-instance binding. */
export async function projectRenderedCanonical(page, responseUrl) {
  const missing = (reason) => ({
    complete: false,
    targets: [],
    pending: [reason],
    documentUrl: null,
    baseUrl: null,
    html: null,
    observedAt: new Date().toISOString(),
    navigationBinding: null,
  });
  if (typeof responseUrl !== "string" || responseUrl.length > 8192)
    return missing("invalid-response-url");
  let session;
  try {
    session = await page.context().newCDPSession(page);
    const before = (await session.send("Page.getFrameTree")).frameTree.frame;
    const { executionContextId } = await session.send(
      "Page.createIsolatedWorld",
      {
        frameId: before.id,
        worldName: "nkskills-canonical-" + randomUUID(),
        grantUniveralAccess: false,
      },
    );
    const result = await session.send("Runtime.evaluate", {
      expression: `(${projectCanonicalDocument.toString()})(${JSON.stringify({ sourceHtml: null, responseUrl })})`,
      contextId: executionContextId,
      returnByValue: true,
      timeout: 5000,
    });
    const after = (await session.send("Page.getFrameTree")).frameTree.frame;
    if (
      before.id !== after.id ||
      before.loaderId !== after.loaderId ||
      before.url !== after.url ||
      before.urlFragment !== after.urlFragment
    )
      return missing("navigation-changed-during-capture");
    if (result.exceptionDetails || !result.result?.value)
      return missing("isolated-projection-unavailable");
    return {
      ...result.result.value,
      navigationBinding: {
        frameId: before.id,
        loaderId: before.loaderId,
        realm: "chromium-isolated-world",
      },
    };
  } catch {
    return missing("isolated-projection-unavailable");
  } finally {
    await session?.detach().catch(() => {});
  }
}
