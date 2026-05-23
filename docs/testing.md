# Testing

## Documentation Checks

- Confirm that the planned MVP features are reflected consistently across the design docs.
- Confirm that `docs/features/*.md` link back to the relevant top-level source-of-truth docs instead of duplicating API contracts or data models.
- Confirm that project plan, data structure, component structure, state flow, and verification approach are documented.
- If design changes during implementation, update the related docs before or in the same commit.

## Backend Checks

- Missing environment variables produce clear errors.
- Unknown API routes return `404` with a JSON error response.
- Invalid JSON request bodies return `400` with a JSON error response.
- `GET /api/health` returns `{ status: "ok" }`.
- `GET /api/github/repos` returns repositories.
- `GET /api/github/repos/:owner/:repo/branches` returns branches.
- `GET /api/github/repos/:owner/:repo/commits?branch=...` returns commits.
- `POST /api/blogs/generate` returns a draft from selected commits.
- `POST /api/blogs/generate` includes bounded changed-file context in the Gemini prompt when GitHub commit details are available.
- Blog draft generation and post creation reject requests with more than 12 commits.
- Post create, list, detail, update, status update, and delete work correctly.
- Post status filtering returns only posts with the requested status.
- Post list pagination returns bounded results with pagination metadata.
- Invalid post list `page` or `limit` query values return `400`.

## Frontend Checks

- Branch and commit UI is not active before repository selection.
- Branch list updates after repository selection.
- Commit list updates after branch selection.
- Commit selection is limited to 12 selected commits.
- AI draft generation works after commit selection.
- The generated draft is editable.
- Saved posts appear in the list.
- A `published` post appears in the published post view.
- Published post view fetches posts through the server-side status filter and pagination contract defined in [docs/api-design.md](api-design.md).
- Published and draft post lists show pagination controls when more pages exist.
- App components use semantic Tailwind token utilities instead of raw primitive color utilities where possible.

## Manual Completion Checklist

- GitHub token and Gemini API key are not included in the frontend bundle.
- `.env` files are not included in commits.
- Saved posts are loaded from MongoDB after server restart.
- The service provides internal publishing only, with no external blog upload.
- Main failure cases show user-readable error messages.
- The UI keeps primitive token usage inside token/theme definition files unless a direct primitive is intentionally justified.
