# 06 AI Blog Draft Generation

## Goal

Generate a development blog draft from selected GitHub commits using Gemini from the backend.

## Implementation Context

- Backend Gemini service reads the Gemini API key defined in [docs/architecture.md](../architecture.md#environment-variables) from server configuration.
- The request uses selected repository, branch, and commit summaries.
- Draft generation accepts up to 12 selected commits.
- Before calling Gemini, the backend enriches selected commits with changed file summaries and bounded patch excerpts from the GitHub commit detail API.
- File change context is selected with general heuristics based on file type, file role, status, and patch size. It should exclude obvious generated, dependency, lockfile, and binary noise.
- The response maps to title, summary, and content.
- The generated draft is shown in the editor before it is saved as a post.

## References

- System flow: [docs/architecture.md](../architecture.md#main-flow)
- API route: [docs/api-design.md](../api-design.md#blog-draft-api)
- Data shapes: [Generated Draft](../data-model.md#generated-draft), [Commit](../data-model.md#commit)
- Backend service role: [docs/backend-design.md](../backend-design.md#service-responsibilities)
- Task order: [docs/plan.md](../plan.md#6-ai-blog-draft-generation)
- Verification: [Backend Checks](../testing.md#backend-checks), [Frontend Checks](../testing.md#frontend-checks)

## Acceptance Notes

- Gemini key is never exposed to the frontend.
- Generated drafts receive actual code-change context when GitHub commit detail data is available.
- Patch context is bounded so generation requests do not include unbounded diffs.
- Requests with more than 12 selected commits return a validation error.
- Generation failures return a user-readable error.
- The editor remains editable after draft generation.
