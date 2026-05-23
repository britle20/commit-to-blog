import type { RequestHandler } from "express";

import { generateBlogDraft } from "../services/gemini.service.js";
import type { GeneratedDraft } from "../types/api.js";
import { parseGenerateDraftInput } from "../validators/request.validator.js";

type GenerateBlogResponse = {
  draft: GeneratedDraft;
};

export const generateBlogDraftHandler: RequestHandler = async (req, res) => {
  const draft = await generateBlogDraft(parseGenerateDraftInput(req.body));
  const response: GenerateBlogResponse = {
    draft: {
      title: draft.title,
      summary: draft.summary,
      content: draft.content,
    },
  };

  res.json(response);
};
