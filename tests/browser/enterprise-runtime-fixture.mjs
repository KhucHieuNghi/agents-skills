import { URL } from "node:url";
import http from "node:http";
import { createHash } from "node:crypto";

export const digest = (value) =>
  createHash("sha256").update(value).digest("hex");

/** Controlled synthetic backend. No provider credentials or production service calls. */
export async function startRuntimeFixture(onReceipt = () => {}) {
  const receipts = [];
  const seen = new Set();
  const server = http.createServer(async (request, response) => {
    const url = new URL(request.url, "http://fixture.invalid");
    if (request.method === "GET" && url.pathname === "/") {
      response.setHeader("content-type", "text/html; charset=utf-8");
      response.end(page);
      return;
    }
    if (request.method === "POST" && url.pathname === "/collect") {
      let body = "";
      for await (const chunk of request) {
        body += chunk;
        if (body.length > 4096) {
          response.writeHead(413).end();
          return;
        }
      }
      try {
        const input = JSON.parse(body);
        if (
          !["purchase", "refund", "lead", "page_view", "consent_ping"].includes(
            input.event,
          ) ||
          typeof input.attempt !== "string" ||
          typeof input.logical !== "string" ||
          !["normal", "duplicate", "reject"].includes(input.behavior)
        )
          throw Error("Invalid fixture request");
        const key = input.event + ":" + input.logical;
        const disposition =
          input.behavior === "reject"
            ? "rejected"
            : seen.has(key) && input.behavior !== "duplicate"
              ? "duplicate-suppressed"
              : "accepted";
        if (disposition === "accepted") seen.add(key);
        receipts.push({
          event: input.event,
          attempt: input.attempt,
          logical: input.logical,
          disposition,
          cookiePresent: Boolean(request.headers.cookie),
          observedAt: new Date().toISOString(),
        });
        onReceipt(receipts.at(-1));
        response.setHeader("content-type", "application/json");
        response.writeHead(disposition === "rejected" ? 422 : 200);
        response.end(JSON.stringify({ disposition }));
      } catch {
        response.writeHead(400).end();
      }
      return;
    }
    response.writeHead(404).end();
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const origin = "http://127.0.0.1:" + server.address().port;
  return {
    origin,
    receipts,
    async close() {
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
    },
  };
}

const page = `<!doctype html><html lang="en"><meta charset="utf-8"><title>Synthetic runtime fixture</title>
<body><button id="navigate">Navigate SPA</button><button id="submit">Submit test lead</button>
<button id="purchase">Purchase retry</button><button id="refund">Refund</button>
<button id="accept">Accept</button><button id="reject">Reject</button><button id="revoke">Revoke</button>
<output id="result"></output>
<script>
const q = new URLSearchParams(location.search);
window.dataLayer = window.dataLayer || [];
let attempt = 0;
let consent = q.get("consent")==="default-drift"?"granted":"denied";
const emit = event => window.dataLayer.push({event});
const state = transition => window.dispatchEvent(new CustomEvent("fixture-consent", {detail:{transition,state:consent}}));
const send = async (event,logical,behavior="normal") => {
 const response = await fetch("/collect",{method:"POST",headers:{"content-type":"application/json"},
 body:JSON.stringify({event,logical,attempt:String(++attempt),behavior})});
 const receipt = await response.json();
 document.querySelector("#result").textContent=receipt.disposition;
 return receipt;
};
state("default");
document.querySelector("#navigate").onclick=async()=>{
 history.pushState({}, "", "/?route=next");
 emit("page_view"); if(q.get("spa")==="duplicate") emit("page_view");
 await send("page_view","next");
};
document.querySelector("#submit").onclick=async()=>{
 emit("lead");
 await send("lead","lead-1",q.get("submit")==="reject"?"reject":"normal");
};
document.querySelector("#purchase").onclick=async()=>{
 emit("purchase");
 await send("purchase","order-1");
 await send("purchase","order-1",q.get("retry")==="duplicate"?"duplicate":"normal");
 document.querySelector("#result").textContent="retry-complete";
};
document.querySelector("#refund").onclick=async()=>{emit("refund");await send("refund","refund-1");};
document.querySelector("#accept").onclick=async()=>{
 consent="granted"; state("accept"); document.cookie="fixture_analytics=1; SameSite=Lax; Path=/";
 await send("consent_ping","accept");
};
document.querySelector("#reject").onclick=async()=>{
 consent="denied"; state("reject");
 if(q.get("consent")==="storage-leak"){
  document.cookie="fixture_analytics=1; SameSite=Lax; Path=/";
  document.cookie="fixture_analytics=; Max-Age=0; Path=/";
  localStorage.setItem("fixture_analytics","1");localStorage.removeItem("fixture_analytics");
 }
 if(q.get("consent")==="advanced"||q.get("consent")==="leak") {
  if(q.get("consent")==="leak")document.cookie="fixture_analytics=1; SameSite=Lax; Path=/";
  await send("consent_ping","reject");
 } else document.querySelector("#result").textContent="blocked";
};
document.querySelector("#revoke").onclick=async()=>{
 consent="denied"; state("revoke");document.cookie="fixture_analytics=; Max-Age=0; Path=/";
 document.querySelector("#result").textContent="revoked";
};
</script></body></html>`;
