import "server-only";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type HomeFeature = { id: string; title: string; description: string; icon: string };
export type HomeContent = {
  hero: {
    eyebrow: string;
    title: string;
    description: string;
    primaryCta: string;
    secondaryCta: string;
  };
  features: HomeFeature[];
};
const file = path.resolve(process.cwd(), "data", "cms-home.json");
export async function readHomeContent(): Promise<HomeContent> {
  try {
    const value = JSON.parse(await readFile(file, "utf8")) as HomeContent;
    return value;
  } catch {
    await mkdir(path.dirname(file), { recursive: true });
    const value = JSON.parse(
      await readFile(file, "utf8").catch(() => "{}"),
    ) as Partial<HomeContent>;
    if (value.hero && value.features) return value as HomeContent;
    const fallback: HomeContent = {
      hero: {
        eyebrow: "VERIFIED MARKETPLACE PROFESSIONALS",
        title: "Find trusted professionals for work that matters.",
        description:
          "Post work, compare qualified professionals, and manage every project in one place.",
        primaryCta: "Browse professionals",
        secondaryCta: "Post a job",
      },
      features: [],
    };
    await writeFile(file, JSON.stringify(fallback, null, 2), "utf8");
    return fallback;
  }
}
export async function writeHomeContent(value: HomeContent) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(value, null, 2) + "\n", "utf8");
  return value;
}
