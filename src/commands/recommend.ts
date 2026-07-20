import {
  findProfilesForIntent,
  loadCatalog,
  type CatalogProfile,
  type CatalogSkill,
} from "../catalog.js";

export type RecommendOptions = {
  catalog?: string;
  intent: string;
  json?: boolean;
};

export async function runRecommend(options: RecommendOptions): Promise<void> {
  const profiles = findProfilesForIntent(
    await loadCatalog(options.catalog ?? "catalog.yaml"),
    options.intent,
  );
  const recommendation = {
    intent: options.intent,
    profiles: profiles.map(presentProfile),
  };
  console.log(
    options.json ? JSON.stringify(recommendation) : format(recommendation),
  );
}

function presentSuitability(
  value: Pick<
    CatalogSkill,
    "name" | "summary" | "suitableFor" | "notSuitableFor"
  >,
) {
  return {
    name: value.name,
    summary: value.summary,
    suitableFor: value.suitableFor,
    notSuitableFor: value.notSuitableFor,
  };
}

function presentProfile(profile: CatalogProfile) {
  return {
    ...presentSuitability(profile),
    skills: profile.skills.map(presentSuitability),
    ...(profile.designMd === undefined ? {} : { designMd: profile.designMd }),
  };
}

function format(recommendation: {
  intent: string;
  profiles: ReturnType<typeof presentProfile>[];
}): string {
  const headers = [
    "Profile",
    "Why choose it",
    "Suitable for",
    "Avoid",
    "Includes",
    "Design foundation",
  ];
  const rows = recommendation.profiles.map((profile) => [
    profile.name,
    profile.summary,
    list(profile.suitableFor),
    list(profile.notSuitableFor),
    profile.skills.map((skill) => skill.name).join(", "),
    profile.designMd === undefined
      ? "—"
      : `DESIGN.md: ${profile.designMd.slug}`,
  ]);
  const widths = headers.map((header, index) =>
    Math.max(header.length, ...rows.map((row) => row[index].length)),
  );
  const render = (row: string[]) =>
    row.map((value, index) => value.padEnd(widths[index])).join(" | ");
  const separator = widths.map((width) => "-".repeat(width)).join("-|-");

  return [
    `Intent: ${recommendation.intent}`,
    "",
    "Choose a profile to install:",
    render(headers),
    separator,
    ...rows.map(render),
    ...foundationInstructions(recommendation.profiles),
    "",
    "Install your choice:",
    "agent-skills apply-profile <profile> --target <targets> --scope project",
  ].join("\n");
}

function foundationInstructions(
  profiles: ReturnType<typeof presentProfile>[],
): string[] {
  const foundations = profiles.filter(
    (profile) => profile.designMd !== undefined,
  );
  if (foundations.length === 0) {
    return [];
  }
  return [
    "",
    "Design foundations (choose one only if it matches your brand):",
    ...foundations.map(
      (profile) =>
        `${profile.name}: ${profile.designMd?.summary} Run: npx getdesign@latest add ${profile.designMd?.slug}`,
    ),
  ];
}

function list(values: string[]): string {
  return values.length === 0 ? "—" : values.join(", ");
}
