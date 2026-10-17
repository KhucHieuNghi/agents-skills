export type Locale = "en" | "vi";
export type PageKind = "home" | "solution" | "codex-guide" | "claude-guide";

const pathByKind: Record<PageKind, Record<Locale, string>> = {
  home: { en: "/en/", vi: "/vi/" },
  solution: {
    en: "/en/solutions/codebase-onboarding/",
    vi: "/vi/solutions/codebase-onboarding/",
  },
  "codex-guide": { en: "/en/guides/codex/", vi: "/vi/guides/codex/" },
  "claude-guide": {
    en: "/en/guides/claude-code/",
    vi: "/vi/guides/claude-code/",
  },
};

export function routePair(kind: PageKind): Record<Locale, string> {
  return pathByKind[kind];
}

export function seoLinks(
  kind: PageKind,
  locale: Locale,
  mode: string | undefined,
  origin: string | undefined,
): {
  canonical: string;
  alternates: Record<Locale | "x-default", string>;
} | null {
  if (mode !== "production") return null;
  if (!origin)
    throw new Error("SITE_ORIGIN is required for a production build");

  const site = new URL(origin);
  if (site.protocol !== "https:")
    throw new Error("Production SITE_ORIGIN must use HTTPS");
  if (site.pathname !== "/" || site.search || site.hash) {
    throw new Error("Production SITE_ORIGIN must be a bare origin");
  }

  const paths = routePair(kind);
  const cleanOrigin = site.origin;
  return {
    canonical: cleanOrigin + paths[locale],
    alternates: {
      en: cleanOrigin + paths.en,
      vi: cleanOrigin + paths.vi,
      "x-default": cleanOrigin + paths.en,
    },
  };
}
