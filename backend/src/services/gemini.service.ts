import { env } from "../config/env.js";
import { HttpError } from "../middleware/error.middleware.js";
import type {
  CommitInput,
  GeneratedDraft,
  GenerateDraftInput,
} from "../types/api.js";

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  error?: {
    message?: string;
  };
};

const GEMINI_API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const GEMINI_MODEL = "gemini-2.5-flash";

function buildCommitContext(commits: CommitInput[]) {
  if (commits.length === 0) {
    return ["Commits:", "- No commits were selected."].join("\n");
  }

  return [
    "Commits:",
    ...commits.map((commit, index) => {
      const lines = [
        `${index + 1}. sha: ${commit.sha}`,
        `   message: ${commit.message}`,
        `   author: ${commit.authorName}`,
        `   date: ${commit.authorDate}`,
        `   url: ${commit.htmlUrl}`,
      ];

      return lines.join("\n");
    }),
  ].join("\n");
}

export function buildPrompt({ repository, branch, commits }: GenerateDraftInput) {
  return [
    "You are writing a development blog draft from GitHub repository activity.",
    "Return valid JSON only with title, summary, and content fields.",
    "Use only the provided repository, branch, and commit context.",
    "Write a specific, technical draft that explains what changed and why it matters.",
    "Keep the summary concise and the content readable for a development blog audience.",
    "Repository context:",
    `- owner: ${repository.owner}`,
    `- name: ${repository.name}`,
    `- full name: ${repository.fullName}`,
    "Branch context:",
    `- name: ${branch}`,
    buildCommitContext(commits),
    "Title guidance: concise and specific.",
    "Summary guidance: one short paragraph.",
    "Content guidance: explain the feature work, implementation steps, and noteworthy details in a blog-friendly structure.",
  ].join("\n");
}

function extractDraftText(response: GeminiResponse) {
  const text = response.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("")
    .trim();

  return text ?? "";
}

function parseStrictJson(text: string) {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new HttpError(502, "Gemini returned an invalid draft response");
  }
}

function parseDraft(text: string): GeneratedDraft {
  const parsed = parseStrictJson(text);

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    typeof (parsed as Partial<GeneratedDraft>).title !== "string" ||
    typeof (parsed as Partial<GeneratedDraft>).summary !== "string" ||
    typeof (parsed as Partial<GeneratedDraft>).content !== "string"
  ) {
    throw new HttpError(502, "Gemini returned an invalid draft response");
  }

  return {
    title: (parsed as GeneratedDraft).title,
    summary: (parsed as GeneratedDraft).summary,
    content: (parsed as GeneratedDraft).content,
  };
}

export async function generateBlogDraft(input: GenerateDraftInput) {
  let response: Response;

  try {
    response = await fetch(
      `${GEMINI_API_BASE_URL}/models/${GEMINI_MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "x-goog-api-key": env.geminiApiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: buildPrompt(input),
                },
              ],
            },
          ],
          generationConfig: {
            response_mime_type: "application/json",
            response_schema: {
              type: "OBJECT",
              properties: {
                title: {
                  type: "STRING",
                  description: "The title of the development blog draft.",
                },
                summary: {
                  type: "STRING",
                  description: "A concise summary of the development blog draft.",
                },
                content: {
                  type: "STRING",
                  description: "The body content of the development blog draft.",
                },
              },
              required: ["title", "summary", "content"],
            },
          },
        }),
      },
    );
  } catch {
    throw new HttpError(502, "Gemini request failed");
  }

  if (!response.ok) {
    let message = "Gemini request failed";

    try {
      const body = (await response.json()) as GeminiResponse;
      if (typeof body.error?.message === "string" && body.error.message.trim() !== "") {
        message = body.error.message;
      }
    } catch {
      // Keep the generic message if Gemini does not return JSON.
    }

    throw new HttpError(
      response.status >= 500 ? 502 : response.status,
      response.status === 401 || response.status === 403
        ? `Gemini API access denied: ${message}`
        : message,
    );
  }

  let body: GeminiResponse;

  try {
    body = (await response.json()) as GeminiResponse;
  } catch {
    throw new HttpError(502, "Gemini returned an invalid draft response");
  }

  const draftText = extractDraftText(body);

  if (!draftText) {
    throw new HttpError(502, "Gemini returned an empty draft response");
  }

  return parseDraft(draftText);
}
