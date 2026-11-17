# Supplied routing dossier

All evidence is synthetic. The owner supplies these exports for an offline audit.
No network access is authorized. URLs identify fixtures; do not request them.
As of 2026-11-16, the approved public product guide is `/guide/current`.
The archived `/guide/2024` must remain accessible as a clearly labeled historical
document; it is not the preferred current guide. The owner wants Googlebot to
crawl the current guide. No Search Console or engine-selected canonical data is
available. HTTP responses below were captured by an ordinary browser user agent,
not Googlebot.

## A — robots.txt at https://routing.example.test/robots.txt

```text
User-agent: Googlebot
Disallow: /guide/current

User-agent: *
Allow: /
```

## B — current guide response

```http
HTTP/1.1 200 OK
Content-Type: text/html; charset=utf-8
```

```html
<html lang="en">
  <head>
    <title>Current product guide</title>
    <link rel="canonical" href="https://routing.example.test/guide/2024" />
  </head>
  <body>
    <h1>Current product guide</h1>
    <p>Current entitlement: 3 seats.</p>
  </body>
</html>
```

## C — sitemap export

```xml
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://routing.example.test/guide/current</loc></url>
</urlset>
```

## D — archive response and owner context

The archive returns HTTP 200 and visibly states “2024 archive — former entitlement:
2 seats.” Its self-canonical names `/guide/2024`. The archive statement is accurate
for its explicit historical scope. No current-guide redirect is present in the
supplied capture. The owner has not authorized deletion, redirects or config edits.
