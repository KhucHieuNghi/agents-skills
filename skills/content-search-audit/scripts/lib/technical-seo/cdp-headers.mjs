import { Buffer } from "node:buffer";
import { parseCanonicalLinkHeaders } from "./link-header.mjs";
/** Chromium CDP joins repeated field values with LF. Raw HTTP fields use the strict parser directly. */
export function parseCanonicalCdpHeaders(headers, responseUrl) {
  if (
    !headers ||
    typeof headers !== "object" ||
    Array.isArray(headers) ||
    ![Object.prototype, null].includes(Object.getPrototypeOf(headers)) ||
    Object.keys(headers).length > 1000 ||
    Object.values(headers).some((value) => typeof value !== "string") ||
    Buffer.byteLength(JSON.stringify(headers)) > 65536
  )
    throw new Error("Invalid CDP response headers");
  const values = Object.entries(headers)
    .filter(([name]) => name.toLowerCase() === "link")
    .flatMap(([, value]) => value.split("\n"));
  return parseCanonicalLinkHeaders(values, responseUrl);
}
