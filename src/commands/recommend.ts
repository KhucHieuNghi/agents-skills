import { loadCatalog, resolveIntent } from "../catalog.js";

export type RecommendOptions = { catalog: string; intent: string };

export async function runRecommend(options: RecommendOptions): Promise<void> {
  const profile = resolveIntent(
    await loadCatalog(options.catalog),
    options.intent,
  );
  console.log(
    JSON.stringify({
      profile: profile.name,
      skills: profile.skills.map((skill) => skill.name),
    }),
  );
}
