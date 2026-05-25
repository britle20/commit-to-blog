# Frontend Design

## Technical Baseline

- Vite + React + TypeScript.
- Tailwind CSS for styling.
- API calls use only the Express server `/api` endpoints.
- Secrets are not stored in frontend code.

## Styling and Token Strategy

The frontend uses a two-layer CSS token system:

- Primitive tokens define raw design values, such as color scales, spacing steps, radius values, shadows, and typography sizes.
- Semantic tokens map those raw values to product meaning, such as `background`, `surface`, `text-primary`, `text-muted`, `border-default`, `action-primary`, `action-danger`, `status-success`, and `status-warning`.

Application components should use semantic tokens whenever possible. Primitive tokens should be used mainly inside the token definition layer, Tailwind theme mapping, or rare low-level styling primitives.

Suggested token layers:

```text
primitive tokens
  -> semantic tokens
    -> Tailwind utilities
      -> React components
```

Example usage direction:

- Prefer `bg-surface`, `text-primary`, `text-muted`, `border-default`, and `bg-action-primary`.
- Avoid direct component usage such as `bg-slate-50`, `text-zinc-700`, or `border-gray-200` unless there is a specific reason.
- Keep status styles semantic, such as `text-status-success` or `bg-status-warning-subtle`.
- Add new primitive values only when semantic tokens cannot be composed from existing values.

## Screens

### Published Post List

- This is the first screen users see when opening the app.
- Shows `published` posts as readable blog posts inside this service.
- Fetches published posts through the server-side status filter and pagination contract defined in [docs/api-design.md](api-design.md).
- Shows a bounded page of published posts and page controls when more posts exist.
- Provides navigation to the new post creation flow and draft post list.

### New Post Creation

- Fetch and select a GitHub repository.
- Fetch branches for the selected repository.
- Show commits for the selected branch and allow multiple commit selection.
- Show repository, branch, and commit selection as three equal-width columns on desktop.
- Keep each selection column at a stable desktop height and scroll within the column when there are many items.
- Allow selecting up to 12 commits for draft generation.
- Request AI draft generation from the selected commits.
- Show generated title, summary, and content in the editor.

### Editor

- Edit title, summary, and content.
- Save creates or updates a MongoDB-backed post.
- Publish changes the post status to `published`.

### Draft Post List

- Shows saved `draft` posts as cards.
- Each card shows title, summary, repository, branch tag, status, and date.
- Fetches drafts through the server-side status filter and pagination contract.
- The user can open a draft detail page.

### Draft Detail

- Shows the selected draft content, metadata, and source commits.
- The user can edit, delete, or publish the draft.
- Publishing changes the post status to `published` and makes it visible in the published post list.

## State Flow

```text
published post list
  -> new post creation
    -> select repository
    -> select branch
    -> select commits
    -> generate AI draft
    -> edit generated draft
    -> save as draft
  -> draft post list
    -> draft detail
    -> edit draft
    -> change to published
    -> display in published post list
```

## Components

- `RepositorySelector`: repository fetching and selection.
- `BranchSelector`: branch fetching and selection.
- `CommitList`: commit list and multi-select behavior.
- `DraftEditor`: title, summary, and content editing.
- `PostCard`: saved post card.
- `PostList`: draft post list.
- `PostDetail`: draft detail, edit, delete, and publish actions.
- `PaginationControls`: previous and next controls for paginated post lists.
- `PublishedPostList`: first-screen published post list.

## State and Hooks Organization

- Feature state types and reducers live in `frontend/src/state/`.
- Feature side effects, request handlers, and mutation handlers live in `frontend/src/hooks/`.
- `App.tsx` should focus on page-level navigation and composing feature hooks with presentational components.
- Compose flow state is managed by `compose.state.ts` and `useComposeFlow.ts`.
- Draft and published post list pagination is managed by `usePostLists.ts`.
- Post detail edit, delete, and publish state is managed by `post-detail.state.ts` and `usePostDetail.ts`.

## Interaction Rules

- Branch and commit controls are disabled until a repository is selected.
- Commit selection and generated drafts are cleared when the branch changes.
- Duplicate requests are blocked while AI draft generation is in progress.
- Save, publish, and delete failures show user-readable error messages.
- Delete uses a confirmation step.
