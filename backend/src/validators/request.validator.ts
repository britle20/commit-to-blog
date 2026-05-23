import { HttpError } from "../middleware/error.middleware.js";
import { MAX_SELECTED_COMMITS } from "../config/limits.js";
import type {
  CommitInput,
  CreatePostInput,
  GenerateDraftInput,
  PostStatus,
  RepositoryInput,
  UpdatePostInput,
} from "../types/api.js";

function ensureString(value: unknown, fieldName: string) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new HttpError(400, "Invalid request body", {
      field: fieldName,
    });
  }

  return value;
}

function ensureRepository(value: unknown) {
  if (typeof value !== "object" || value === null) {
    throw new HttpError(400, "Invalid request body", {
      field: "repository",
    });
  }

  const repository = value as Partial<RepositoryInput>;

  return {
    owner: ensureString(repository.owner, "repository.owner"),
    name: ensureString(repository.name, "repository.name"),
    fullName: ensureString(repository.fullName, "repository.fullName"),
  };
}

function ensureCommits(value: unknown) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new HttpError(400, "Invalid request body", {
      field: "commits",
    });
  }

  if (value.length > MAX_SELECTED_COMMITS) {
    throw new HttpError(400, "Invalid request body", {
      field: "commits",
      maxItems: MAX_SELECTED_COMMITS,
    });
  }

  return value.map((commit, index) => {
    if (typeof commit !== "object" || commit === null) {
      throw new HttpError(400, "Invalid request body", {
        field: `commits[${index}]`,
      });
    }

    const input = commit as Partial<CommitInput>;

    return {
      sha: ensureString(input.sha, `commits[${index}].sha`),
      message: ensureString(input.message, `commits[${index}].message`),
      authorName: ensureString(
        input.authorName,
        `commits[${index}].authorName`,
      ),
      authorDate: ensureString(
        input.authorDate,
        `commits[${index}].authorDate`,
      ),
      htmlUrl: ensureString(input.htmlUrl, `commits[${index}].htmlUrl`),
    };
  });
}

function ensureRequestBody(body: unknown) {
  if (typeof body !== "object" || body === null) {
    throw new HttpError(400, "Invalid request body");
  }

  return body as Record<string, unknown>;
}

function ensurePostStatus(value: unknown, message: string) {
  if (value !== "draft" && value !== "published") {
    throw new HttpError(400, message, {
      field: "status",
    });
  }

  return value as PostStatus;
}

export function parseGenerateDraftInput(body: unknown): GenerateDraftInput {
  const input = ensureRequestBody(body);

  return {
    repository: ensureRepository(input.repository),
    branch: ensureString(input.branch, "branch"),
    commits: ensureCommits(input.commits),
  };
}

export function parseCreatePostInput(body: unknown): CreatePostInput {
  const input = ensureRequestBody(body);

  return {
    title: ensureString(input.title, "title"),
    summary: ensureString(input.summary, "summary"),
    content: ensureString(input.content, "content"),
    repository: ensureRepository(input.repository),
    branch: ensureString(input.branch, "branch"),
    commits: ensureCommits(input.commits),
  };
}

export function parseUpdatePostInput(body: unknown): UpdatePostInput {
  const input = ensureRequestBody(body);
  const update: UpdatePostInput = {};

  if (input.title !== undefined) {
    update.title = ensureString(input.title, "title");
  }

  if (input.summary !== undefined) {
    update.summary = ensureString(input.summary, "summary");
  }

  if (input.content !== undefined) {
    update.content = ensureString(input.content, "content");
  }

  if (Object.keys(update).length === 0) {
    throw new HttpError(400, "Invalid request body");
  }

  return update;
}

export function parseStatusQuery(status: unknown) {
  if (status === undefined) {
    return undefined;
  }

  if (status !== "draft" && status !== "published") {
    throw new HttpError(400, "Invalid post status filter");
  }

  return status as PostStatus;
}

export function parseUpdateStatusInput(body: unknown) {
  const input = ensureRequestBody(body);

  return ensurePostStatus(input.status, "Invalid request body");
}
