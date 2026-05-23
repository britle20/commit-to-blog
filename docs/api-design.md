# API Design

## Common Rules

- All API routes use the `/api` prefix.
- GitHub and Gemini secrets are used only on the server.
- Responses are returned as JSON.
- Error responses include at least `message`.
- Shared request and response shapes are defined in [docs/data-model.md](data-model.md).

```ts
type ApiError = {
  message: string;
  details?: unknown;
};
```

## Health API

### `GET /api/health`

Returns basic server availability.

```ts
type HealthResponse = {
  status: "ok";
};
```

## GitHub API Proxy

### `GET /api/github/repos`

Returns repositories accessible with the configured GitHub token.

```ts
type ReposResponse = {
  repositories: RepositorySummary[];
};
```

### `GET /api/github/repos/:owner/:repo/branches`

Returns branches for the selected repository.

```ts
type BranchesResponse = {
  branches: BranchSummary[];
};
```

### `GET /api/github/repos/:owner/:repo/commits?branch=main`

Returns commits for the selected branch.

```ts
type CommitsResponse = {
  commits: CommitSummary[];
};
```

## Blog Draft API

### `POST /api/blogs/generate`

Generates a blog draft from the selected repository, branch, and commits.
The server may enrich selected commits with bounded GitHub commit detail context before calling Gemini. The client still sends only the selected commit summaries.
The request supports up to 12 selected commits.

```ts
type GenerateBlogRequest = {
  repository: {
    owner: string;
    name: string;
    fullName: string;
  };
  branch: string;
  commits: CommitSummary[];
};

type GenerateBlogResponse = {
  draft: GeneratedDraft;
};
```

## Post API

### `GET /api/posts`

Returns saved posts. The endpoint supports server-side `status=draft` or `status=published` query filtering and paginates results with `page` and `limit`.

The published post view should call `GET /api/posts?status=published&page=1&limit=5` instead of fetching all posts and filtering on the client. Draft lists should use `status=draft`.

Pagination rules:

- `page` defaults to `1`.
- `limit` defaults to `10`.
- `limit` must be between `1` and `50`.
- Results are sorted by latest update first.

```ts
type PostStatusFilter = "draft" | "published";

type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
};

type PostsResponse = {
  posts: Post[];
  pagination: PaginationMeta;
};
```

### `GET /api/posts/:id`

Returns one post.

```ts
type PostResponse = {
  post: Post;
};
```

### `POST /api/posts`

Saves an edited draft. The default status is `draft`.
The request uses the same 12-commit selection limit as draft generation.

```ts
type CreatePostRequest = {
  title: string;
  summary: string;
  content: string;
  repository: Post["repository"];
  branch: string;
  commits: CommitSummary[];
};
```

### `PATCH /api/posts/:id`

Updates the title, summary, or content of a saved post.

```ts
type UpdatePostRequest = {
  title?: string;
  summary?: string;
  content?: string;
};
```

### `PATCH /api/posts/:id/status`

Changes a post status to `draft` or `published`. When changing to `published`, the server records `publishedAt`.

```ts
type UpdatePostStatusRequest = {
  status: "draft" | "published";
};
```

### `DELETE /api/posts/:id`

Deletes a saved post.

## Error Handling

- Missing configuration returns a clear configuration error at startup or request time.
- GitHub and Gemini failures are reported as external API failures.
- A missing post id returns `404`.
- An unknown route returns `404` with a JSON error response.
- An invalid post `status` filter returns `400`.
- Invalid post list pagination query values return `400`.
- Invalid request bodies return `400`.
- Unexpected server errors return `500` with a generic message.
