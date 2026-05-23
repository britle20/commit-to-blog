# 09 Saved and Published Post Views

## Goal

Show saved posts, support post management actions, and display internally published posts.

## Implementation Context

- Published posts are the first screen users see when opening the app.
- Draft posts appear on a separate draft list screen as cards with title, summary, repository, branch, status, and date.
- Users can open draft details, edit, delete, and change status.
- Delete requires confirmation.
- Publishing is an internal state change, not an external blog upload.
- Published posts are fetched through the server-side status filter and pagination contract defined in [docs/api-design.md](../api-design.md#post-api).
- Draft posts use the same paginated list contract with the `draft` status filter.

## References

- Publishing scope: [docs/plan.md](../plan.md#mvp-scope)
- Post status model: [docs/data-model.md](../data-model.md#status-meaning)
- API contract: [docs/api-design.md](../api-design.md#post-api)
- Frontend screens: [Draft Post List](../frontend-design.md#draft-post-list), [Published Post List](../frontend-design.md#published-post-list)
- Task order: [docs/plan.md](../plan.md#9-saved-and-published-post-views)
- Verification: [Backend Checks](../testing.md#backend-checks), [Frontend Checks](../testing.md#frontend-checks)

## Acceptance Notes

- The published post list is reachable without entering the post creation flow.
- New post creation and draft management are separate screens.
- Draft posts do not appear in the published post view.
- Published and draft post lists do not fetch or render the full collection at once.
- Pagination controls allow moving between available post pages.
- Invalid post status filters return `400`.
- Invalid post list pagination query values return `400`.
- External blog platform publishing stays out of MVP scope.
