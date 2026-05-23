# Data Model

## Repository

Repository data comes from the GitHub API and is normalized for the frontend selection UI.

```ts
type RepositorySummary = {
  id: number;
  name: string;
  fullName: string;
  owner: string;
  private: boolean;
  defaultBranch: string;
  htmlUrl: string;
};
```

## Branch

```ts
type BranchSummary = {
  name: string;
  commitSha: string;
};
```

## Commit

This is the basic commit data needed for selection, storage, and blog draft generation. Draft generation supports up to 12 selected commits. During draft generation, the backend can enrich selected commits with non-persisted change context from GitHub commit details.

```ts
type CommitSummary = {
  sha: string;
  message: string;
  authorName: string;
  authorDate: string;
  htmlUrl: string;
};
```

## Commit Change Context

Commit change context is loaded by the backend during draft generation. It is used for the Gemini prompt, but the frontend commit list and saved post model can still use the base `CommitSummary` shape.

```ts
type CommitFileChange = {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  patchExcerpt?: string;
};
```

## Generated Draft

This is the draft returned by Gemini. Before saving, it can live as frontend editing state.

```ts
type GeneratedDraft = {
  title: string;
  summary: string;
  content: string;
};
```

## Post

This is the main MongoDB-backed model.

```ts
type PostStatus = "draft" | "published";

type Post = {
  id: string;
  title: string;
  summary: string;
  content: string;
  repository: {
    owner: string;
    name: string;
    fullName: string;
  };
  branch: string;
  commits: CommitSummary[];
  status: PostStatus;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
};
```

## Pagination

Paginated list responses include metadata so the frontend can render stable page controls without inferring totals from the current page.

```ts
type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
};
```

## Status Meaning

- `draft`: saved, but not shown in the published post view.
- `published`: visible in the service as a published blog post.

## Future Extensions

- Full diff storage and richer code-change summaries.
- Tags, categories, and thumbnails.
- User accounts and author data.
- Gemini request and response history.
