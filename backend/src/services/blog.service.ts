import type { GenerateDraftInput } from "../types/api.js";
import { generateBlogDraft as generateGeminiBlogDraft } from "./gemini.service.js";
import { enrichCommitsWithChangeContext } from "./github.service.js";

export async function generateBlogDraft(input: GenerateDraftInput) {
  const commits = await enrichCommitsWithChangeContext(
    input.repository.owner,
    input.repository.name,
    input.commits,
  );

  return generateGeminiBlogDraft({
    ...input,
    commits,
  });
}
