interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
  PRODUCTION_ORIGIN: string;
}

function withHeaders(response: Response, preview: boolean): Response {
  const headers = new Headers(response.headers);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("X-Frame-Options", "DENY");
  headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'",
  );
  if (preview) headers.set("X-Robots-Tag", "noindex, nofollow");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const preview = url.origin !== env.PRODUCTION_ORIGIN;
    if (url.pathname === "/") {
      return withHeaders(Response.redirect(new URL("/en/", url), 308), preview);
    }
    const response = await env.ASSETS.fetch(request);
    return withHeaders(response, preview);
  },
};
