# Project Plan

## Goal

Build an MVP that lets a user select a GitHub repository, branch, and commits, generate a development blog draft with Gemini, edit it, save it to MongoDB, and publish it inside this service.

## Development Order

### 1. Project Foundation

- [x] Initialize `frontend/` as a Vite + React + TypeScript app.
- [x] Initialize `backend/` as an Express + TypeScript app.
- [x] Add baseline scripts for development, build, and type checking.
- [x] Add `.env.example` files without real secrets.

### 2. Frontend Styling Foundation

Related feature doc: [02 Frontend Styling Foundation](features/02-frontend-styling-foundation.md)

- [x] Add Tailwind CSS to the frontend build setup.
- [x] Define primitive CSS tokens for raw color, spacing, radius, shadow, and typography values.
- [x] Define semantic CSS tokens for app surfaces, text, borders, actions, and status states.
- [x] Map semantic CSS tokens into Tailwind utilities.
- [x] Add shared base styles that use semantic tokens.

### 3. Backend Configuration and Server Setup

- [x] Load environment variables with `dotenv`.
- [x] Configure `cors` using the client origin environment variable defined in [docs/architecture.md](architecture.md).
- [x] Add a health check endpoint for basic server verification.
- [x] Add centralized error handling middleware.
- [x] Validate required environment variables before using external services.

### 4. MongoDB Persistence

Related feature doc: [04 MongoDB Persistence](features/04-mongodb-persistence.md)

- [x] Configure the MongoDB connection through the database URI environment variable defined in [docs/architecture.md](architecture.md).
- [x] Create the Post model with `draft` and `published` statuses.
- [x] Implement post create, list, detail, update, status update, and delete operations.
- [x] Verify saved posts persist after server restart.

### 5. GitHub Repository Data Flow

Related feature doc: [05 GitHub Repository Data Flow](features/05-github-repository-data-flow.md)

- [x] Add a backend GitHub API client that uses server-side token configuration.
- [x] Implement repository list retrieval.
- [x] Implement branch list retrieval for a selected repository.
- [x] Implement commit list retrieval for a selected branch.
- [x] Normalize GitHub responses into the frontend-facing data shapes in [docs/data-model.md](data-model.md).
- [x] Return clear errors when GitHub API requests fail.

### 6. AI Blog Draft Generation

Related feature doc: [06 AI Blog Draft Generation](features/06-ai-blog-draft-generation.md)

- [x] Add a backend Gemini client that uses server-side API key configuration.
- [x] Build a prompt from the selected repository, branch, and commits.
- [x] Generate a draft with title, summary, and content.
- [x] Map the generation result to the `GeneratedDraft` response shape.
- [x] Return a user-readable error if Gemini generation fails.

### 7. Frontend Selection Workflow

Related feature doc: [07 Frontend Selection Workflow](features/07-frontend-selection-workflow.md)

- [x] Build repository selection UI.
- [x] Build branch selection UI that depends on the selected repository.
- [x] Build commit selection UI that depends on the selected branch.
- [x] Clear downstream selections when repository or branch changes.
- [x] Disable unavailable controls until their required previous selection exists.
- [x] Show loading and error states for each API request.

### 8. Draft Editing and Saving

Related feature doc: [08 Draft Editing and Saving](features/08-draft-editing-and-saving.md)

- [x] Display the generated draft in an editable form.
- [x] Allow editing title, summary, and content.
- [x] Save edited content as a `draft` post.
- [x] Support updating an existing saved post.
- [x] Prevent duplicate save or generate requests while a request is in progress.

### 9. Saved and Published Post Views

Related feature doc: [09 Saved and Published Post Views](features/09-saved-and-published-post-views.md)

- [x] Show saved posts as cards with title, summary, repository, branch, status, and date.
- [x] Add post detail view.
- [x] Add edit flow for saved posts.
- [x] Add delete flow with confirmation.
- [ ] Add status change from `draft` to `published`.
- [ ] Show `published` posts in the service as readable blog posts.

### 10. Verification and Documentation Updates

- [ ] Check that GitHub and Gemini secrets are never exposed to frontend code.
- [ ] Check that app components use semantic styling tokens instead of raw primitive tokens where possible.
- [ ] Check the core API routes manually.
- [ ] Check the main frontend workflow from repository selection to published post display.
- [ ] Add PR or submission notes that summarize the AI workflow used during development.

## MVP Scope

Included:

- GitHub repository list retrieval.
- Branch list retrieval for a repository.
- Commit list retrieval for a branch.
- Blog draft generation from selected commits.
- Draft editing and MongoDB persistence.
- Saved post list, detail, edit, delete, and status change.
- Displaying `published` posts inside this frontend.

Excluded:

- GitHub OAuth login.
- External blog platform publishing.
- Multi-user accounts or permissions.
- Real-time collaborative editing.

## Completion Criteria

- The user can select repository, branch, and commits in order.
- The server does not expose GitHub or Gemini secrets to the frontend.
- The user can edit and save an AI-generated draft.
- Saved posts can be reloaded from MongoDB after refresh or server restart.
- A published post can be viewed as a blog post inside this frontend.
