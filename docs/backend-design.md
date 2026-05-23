# Backend Design

## Technical Baseline

- Express + TypeScript.
- Load environment variables with `dotenv`.
- Allow the frontend origin with `cors`.
- Store posts in MongoDB.

## Directory Structure

```text
backend/
  src/
    app.ts
    server.ts
    config/
      env.ts
      database.ts
      limits.ts
    routes/
      github.routes.ts
      blog.routes.ts
      post.routes.ts
    controllers/
      github.controller.ts
      blog.controller.ts
      post.controller.ts
    services/
      blog.service.ts
      github.service.ts
      gemini.service.ts
      post.service.ts
    types/
      api.ts
    validators/
      request.validator.ts
    models/
      post.model.ts
    middleware/
      error.middleware.ts
```

## Route Responsibilities

- `github.routes.ts`: repository, branch, and commit lookup endpoints.
- `blog.routes.ts`: AI blog draft generation endpoint.
- `post.routes.ts`: post CRUD and publish status endpoints.

## Validation Responsibilities

- Controllers validate and parse request bodies, query values, and route parameters before calling services.
- Post list controllers validate `status`, `page`, and `limit` query values before calling services.
- Shared request validation lives in `validators/` so API input shapes do not drift across blog generation and post persistence flows.
- Shared backend request and response DTO types live in `types/`.
- Services should receive typed application inputs and focus on external API calls, database access, and business behavior.

## Service Responsibilities

- `blog.service.ts`
  - Orchestrates selected commit enrichment and Gemini draft generation.
- `github.service.ts`
  - Encapsulates GitHub API requests.
  - Reads the token only from environment variables.
  - Loads selected commit file changes for draft generation context.
- `gemini.service.ts`
  - Converts commit data into a blog draft generation prompt.
  - Reads the Gemini API key only from environment variables.
  - Uses bounded commit and patch context limits from backend configuration.
- `post.service.ts`
  - Handles MongoDB post create, read, update, delete, and status changes.
  - Applies server-side post list filtering and pagination.

## Environment Validation

Validate the environment variables defined in `docs/architecture.md` before using the related feature. Add new environment variables to `docs/architecture.md` first so the architecture document stays the source of truth.

If a mock service becomes necessary during development, ask the user first and update the docs.

## Error Handling

- Controllers return expected failures as HTTP status codes with JSON messages.
- Unknown errors are handled by shared error middleware.
- External API failures are distinguishable from internal server failures.
- Responses and logs do not include secrets.
