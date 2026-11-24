import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { publicUrlLabel } from "./inventory.mjs";

const search = "get_search_console_performance";
const analytics = "get_google_analytics_organic_overview";
const crawl = "get_audit_pages";
const tools = new Set([search, analytics, crawl]);
const digest = (value) => createHash("sha256").update(value).digest("hex");
const identifier = (value) =>
  typeof value === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(value);

function publicUrl(input) {
  if (typeof input !== "string" || input.length > 8192) return null;
  try {
    const url = new URL(input);
    return ["https:", "http:"].includes(url.protocol) &&
      !url.username &&
      !url.password &&
      !url.hash
      ? url
      : null;
  } catch {
    return null;
  }
}

function projectHost(domain) {
  if (typeof domain !== "string") return null;
  const url = publicUrl(domain.includes("://") ? domain : `https://${domain}`);
  return url?.pathname === "/" && !url.search && !url.port
    ? url.hostname
    : null;
}

/** Pure planner. Input project inventory must be read in the active host session. */
export function planOpenSeoReads({ target, projects, projectId }) {
  const url = publicUrl(target);
  if (
    !url ||
    !Array.isArray(projects) ||
    projects.length > 5000 ||
    (projectId !== undefined && !identifier(projectId))
  )
    throw new Error("Invalid OpenSEO target or project inventory");
  const eligible = projects.filter(
    (project) =>
      identifier(project?.id) && projectHost(project.domain) === url.hostname,
  );
  if (projectId !== undefined && !eligible.some(({ id }) => id === projectId))
    return { status: "project-mismatch", fallback: "public-url" };
  if (!eligible.length)
    return { status: "project-not-found", fallback: "public-url" };
  if (projectId === undefined && eligible.length !== 1)
    return {
      status: "project-choice-required",
      matchingProjectIds: eligible.map(({ id }) => id),
      fallback: "public-url",
    };
  return {
    status: "ready",
    projectId: projectId ?? eligible[0].id,
    readTools: [...tools],
    fallback: "public-url",
    performsNetworkRequests: false,
  };
}

function assertWindow(start, end, capturedAt) {
  const day = (value) => {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
      return false;
    const timestamp = Date.parse(value);
    return (
      Number.isFinite(timestamp) &&
      new Date(timestamp).toISOString().slice(0, 10) === value
    );
  };
  if (!day(start) || !day(end) || start > end || end >= capturedAt.slice(0, 10))
    throw new Error("Invalid OpenSEO reporting window");
}
const only = (value, fields) =>
  Object.keys(value).every((key) => fields.includes(key));
const validCount = (value) => Number.isFinite(value) && value >= 0;
function propertyIncludes(property, url) {
  if (typeof property !== "string") return false;
  if (property.startsWith("sc-domain:")) {
    const host = property.slice(10);
    return (
      Boolean(host) &&
      (url.hostname === host || url.hostname.endsWith(`.${host}`))
    );
  }
  const prefix = publicUrl(property);
  return Boolean(
    prefix &&
    !prefix.search &&
    prefix.origin === url.origin &&
    prefix.pathname.endsWith("/") &&
    url.pathname.startsWith(prefix.pathname),
  );
}

function searchRows(input, receipt, response, approved) {
  const { request, capturedAt } = receipt;
  assertWindow(request.startDate, request.endDate, capturedAt);
  if (
    !only(request, [
      "projectId",
      "startDate",
      "endDate",
      "type",
      "dataState",
      "dimensions",
      "rowLimit",
    ]) ||
    (request.rowLimit !== undefined &&
      (!Number.isSafeInteger(request.rowLimit) ||
        request.rowLimit < 1 ||
        request.rowLimit > 1000))
  )
    throw new Error(
      "OpenSEO Search Console read requires an unfiltered first page",
    );
  if (
    request.type !== "web" ||
    request.dataState !== "final" ||
    JSON.stringify(request.dimensions) !== '["page"]' ||
    JSON.stringify(response.dimensions) !== '["page"]' ||
    response.startDate !== request.startDate ||
    response.endDate !== request.endDate ||
    typeof response.hasMore !== "boolean" ||
    !Array.isArray(response.rows)
  )
    throw new Error("Invalid OpenSEO Search Console response scope");
  if (
    response.siteUrl !== input.searchConsoleProperty ||
    !propertyIncludes(response.siteUrl, publicUrl(input.target))
  )
    throw new Error("OpenSEO Search Console property mismatch");
  const rows = [];
  const seen = new Set();
  if (response.rows.length > (request.rowLimit ?? 1000))
    throw new Error("OpenSEO Search Console page limit exceeded");
  for (const row of response.rows) {
    const url = publicUrl(row?.keys?.[0]);
    if (
      !url ||
      row.keys.length !== 1 ||
      !propertyIncludes(response.siteUrl, url) ||
      !validCount(row.clicks) ||
      !validCount(row.impressions) ||
      !validCount(row.ctr) ||
      row.ctr > 1 ||
      !validCount(row.position) ||
      row.clicks > row.impressions ||
      seen.has(url.href)
    )
      throw new Error("Invalid OpenSEO Search Console page row");
    seen.add(url.href);
    if (approved.has(url.href))
      rows.push([
        publicUrlLabel(url.href),
        row.clicks,
        row.impressions,
        `${Number((row.ctr * 100).toFixed(2))}%`,
        row.position,
      ]);
  }
  return {
    label: "OpenSEO · Search Console",
    status: rows.length ? (response.hasMore ? "partial" : "data") : "no-rows",
    scope: `${request.startDate} — ${request.endDate} (Pacific Time)`,
    headers: ["URL", "Clicks", "Impressions", "CTR", "Average position"],
    rows,
    omitted: response.rows.length - rows.length,
    more: response.hasMore,
    opportunity: rows
      .filter(
        (row) => row[1] === 0 && row[2] >= 50 && row[4] >= 4 && row[4] <= 20,
      )
      .sort((a, b) => b[2] - a[2])[0],
  };
}

function analyticsRows(input, receipt, response) {
  const { request, capturedAt } = receipt;
  assertWindow(request.startDate, request.endDate, capturedAt);
  const returnedProperty = String(response.source?.propertyId ?? "").replace(
    /^properties\//,
    "",
  );
  if (
    !/^properties\/\d+$/.test(input.analyticsProperty ?? "") ||
    returnedProperty !== input.analyticsProperty.slice(11) ||
    response.source?.provider !== "google_analytics"
  )
    throw new Error("OpenSEO GA4 property mismatch");
  if (
    response.request?.resolvedDateRange?.startDate !== request.startDate ||
    response.request?.resolvedDateRange?.endDate !== request.endDate ||
    response.request?.channel !== "organic_search" ||
    typeof response.reportMetadata?.hasLimitedData !== "boolean" ||
    typeof response.request.propertyTimeZone !== "string" ||
    !/^[A-Za-z0-9_+/-]{1,80}$/.test(response.request.propertyTimeZone)
  )
    throw new Error("Invalid OpenSEO GA4 response scope");
  const rows = [];
  for (const metric of [
    "sessions",
    "activeUsers",
    "keyEvents",
    "transactions",
  ]) {
    const value = response.current?.[metric];
    if (value === undefined || value === null) continue;
    if (!validCount(value)) throw new Error("Invalid OpenSEO GA4 metric");
    rows.push([metric, value]);
  }
  return {
    label: "OpenSEO · GA4 organic",
    status: rows.length
      ? response.reportMetadata.hasLimitedData
        ? "partial"
        : "data"
      : "no-rows",
    scope: `${request.startDate} — ${request.endDate} (${response.request.propertyTimeZone}; property aggregate)`,
    headers: ["Metric", "Value"],
    rows,
  };
}

function crawlRows(receipt, response, approved) {
  const { request } = receipt;
  if (!only(request, ["projectId", "auditId", "page", "limit"]))
    throw new Error("OpenSEO saved crawl evidence requires an unfiltered page");
  if (
    !identifier(request.auditId) ||
    !Number.isSafeInteger(request.page) ||
    request.page < 1 ||
    response.page !== request.page ||
    !Number.isSafeInteger(request.limit) ||
    request.limit < 1 ||
    request.limit > 100 ||
    !Array.isArray(response.pages) ||
    response.pages.length > request.limit ||
    !Number.isSafeInteger(response.total) ||
    response.total < response.pages.length ||
    (response.auditId !== undefined && response.auditId !== request.auditId)
  )
    throw new Error("Invalid OpenSEO saved crawl response scope");
  const rows = [];
  for (const row of response.pages) {
    const url = publicUrl(row?.url);
    if (!url) throw new Error("Invalid OpenSEO saved crawl page URL");
    if (!approved.has(url.href)) continue;
    const status = row.statusCode;
    if (
      status !== undefined &&
      status !== null &&
      (!Number.isSafeInteger(status) || status < 100 || status > 599)
    )
      throw new Error("Invalid OpenSEO saved crawl HTTP status");
    const fetchClass = ["ok", "blocked", "rate_limited", "error"].includes(
      row.fetchClass,
    )
      ? row.fetchClass
      : "unknown";
    rows.push([publicUrlLabel(url.href), status ?? "unknown", fetchClass]);
  }
  const more = response.total > response.pages.length;
  return {
    label: "OpenSEO · saved crawl",
    status: rows.length ? (more ? "partial" : "data") : "no-rows",
    scope: `Audit ${request.auditId}, page ${response.page}`,
    headers: ["URL", "Reported HTTP status", "Fetch outcome"],
    rows,
    omitted: response.pages.length - rows.length,
    more,
  };
}

function unavailable(response, tool) {
  const code = String(
    response.error?.code ?? response.reason ?? "",
  ).toLowerCase();
  const status =
    response.connectionRequired || /not.connected|disconnected/.test(code)
      ? "disconnected"
      : /quota|rate.limit/.test(code)
        ? "quota-limited"
        : /expired|unauthenticated/.test(code)
          ? "authentication-expired"
          : /permission|forbidden/.test(code)
            ? "permission-denied"
            : "unavailable";
  return { label: tool, status };
}

/** Supplies a connected pilot report projection without issuing provider calls. */
export function prepareOpenSeoReport(input, { reportTime, targets, locale }) {
  if (input === undefined) return { documents: {}, sections: [] };
  if (
    !input ||
    input.schemaVersion !== 1 ||
    !["codex", "claude-code"].includes(input.host) ||
    !input.project ||
    typeof input.synthetic !== "boolean" ||
    !Array.isArray(input.receipts) ||
    input.receipts.length < 1 ||
    input.receipts.length > 12 ||
    Buffer.byteLength(JSON.stringify(input)) > 2 * 1024 * 1024
  )
    throw new Error("Invalid OpenSEO receipt bundle");
  const approved = new Set(
    targets.map((target) => publicUrl(target)?.href).filter(Boolean),
  );
  const target = publicUrl(input.target);
  if (!target || !approved.has(target.href))
    throw new Error("OpenSEO target is outside the declared audit inventory");
  const plan = planOpenSeoReads({
    target: input.target,
    projects: [input.project],
    projectId: input.project.id,
  });
  if (plan.status !== "ready")
    throw new Error("OpenSEO project does not match audit target");
  const seen = new Set();
  const sections = [
    {
      title:
        locale === "vi"
          ? "Dữ liệu bổ sung từ OpenSEO"
          : "OpenSEO connected evidence",
      text:
        (input.synthetic
          ? locale === "vi"
            ? "Dữ liệu mẫu tổng hợp. "
            : "Synthetic fixture data. "
          : "") +
        (locale === "vi"
          ? "Các kết quả do host chuyển tiếp, có phạm vi riêng. Chưa xác thực nguồn API gốc. Chỉ số chưa có dữ liệu không được tính là 0."
          : "Host-supplied connector results have their own scope. Original provider authenticity is unverified. Missing data is not zero."),
    },
  ];
  for (const receipt of input.receipts) {
    const { tool, capturedAt, request, responseText, responseHash } =
      receipt ?? {};
    if (!tools.has(tool) || !request || request.projectId !== plan.projectId)
      throw new Error("Invalid OpenSEO project or read operation");
    if (
      typeof capturedAt !== "string" ||
      !Number.isFinite(Date.parse(capturedAt)) ||
      new Date(capturedAt).toISOString() !== capturedAt ||
      Date.parse(capturedAt) > Date.parse(reportTime)
    )
      throw new Error("Invalid OpenSEO capture time");
    if (
      typeof responseText !== "string" ||
      digest(responseText) !== responseHash
    )
      throw new Error("OpenSEO response hash mismatch");
    const response = JSON.parse(responseText);
    if (
      !response ||
      typeof response !== "object" ||
      Array.isArray(response) ||
      (response.meta?.projectId !== undefined &&
        response.meta.projectId !== plan.projectId)
    )
      throw new Error("OpenSEO response project mismatch");
    const key = JSON.stringify([
      tool,
      request.startDate,
      request.endDate,
      request.startRow,
      request.auditId,
      request.page,
    ]);
    if (seen.has(key)) throw new Error("Duplicate OpenSEO read receipt");
    seen.add(key);
    const result =
      response.ok === false ||
      response.status === "error" ||
      response.connectionRequired ||
      response.error
        ? unavailable(response, tool)
        : tool === search && response.ok === true
          ? searchRows(input, receipt, response, approved)
          : tool === analytics && response.status === "ok"
            ? analyticsRows(input, receipt, response)
            : tool === crawl
              ? crawlRows(receipt, response, approved)
              : unavailable(response, tool);
    const tail = result.more
      ? locale === "vi"
        ? " Còn dữ liệu ngoài phần đã đọc."
        : " More data remains outside this read."
      : "";
    const opportunity = result.opportunity;
    const suggestion = opportunity
      ? locale === "vi"
        ? ` Đề xuất kiểm tra tiêu đề và đoạn mô tả của ${opportunity[0]}. Trang có ${opportunity[2]} lượt hiển thị và 0 lượt nhấp trong kỳ này. Đối chiếu truy vấn trước khi sửa.`
        : ` Review the title and snippet for ${opportunity[0]}. This page recorded ${opportunity[2]} impressions and 0 clicks in the supplied window. Verify the queries before changing it.`
      : "";
    sections.push({
      title: result.label,
      text: `${result.status}${result.scope ? ` · ${result.scope}` : ""} · ${capturedAt} · SHA-256 ${responseHash}.${tail}${result.omitted ? ` ${result.omitted} rows outside the audit inventory.` : ""}${suggestion}`,
      ...(result.rows?.length
        ? { headers: result.headers, rows: result.rows }
        : {}),
    });
  }
  return {
    sections,
    documents: {
      "openseo-evidence.json":
        JSON.stringify(
          {
            ...input,
            kind: "supplied-openseo-tool-receipts",
            providerAuthenticated: false,
          },
          null,
          2,
        ) + "\n",
    },
  };
}
