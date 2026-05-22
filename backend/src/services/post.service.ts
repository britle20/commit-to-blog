import { isValidObjectId } from "mongoose";

import { HttpError } from "../middleware/error.middleware.js";
import { PostModel, type PostStatus } from "../models/post.model.js";

type PostRepositoryInput = {
  owner: string;
  name: string;
  fullName: string;
};

type PostCommitInput = {
  sha: string;
  message: string;
  authorName: string;
  authorDate: string;
  htmlUrl: string;
};

type PostResponse = {
  id: string;
  title: string;
  summary: string;
  content: string;
  repository: PostRepositoryInput;
  branch: string;
  commits: PostCommitInput[];
  status: PostStatus;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
};

type CreatePostInput = {
  title: string;
  summary: string;
  content: string;
  repository: PostRepositoryInput;
  branch: string;
  commits: PostCommitInput[];
};

type UpdatePostInput = {
  title?: string;
  summary?: string;
  content?: string;
};

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

  const repository = value as Partial<PostRepositoryInput>;

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

  return value.map((commit, index) => {
    if (typeof commit !== "object" || commit === null) {
      throw new HttpError(400, "Invalid request body", {
        field: `commits[${index}]`,
      });
    }

    const input = commit as Partial<PostCommitInput>;

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

function normalizePost(document: {
  _id: { toString(): string };
  title: string;
  summary: string;
  content: string;
  repository: PostRepositoryInput;
  branch: string;
  commits: PostCommitInput[];
  status: PostStatus;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: string;
}): PostResponse {
  return {
    id: document._id.toString(),
    title: document.title,
    summary: document.summary,
    content: document.content,
    repository: document.repository,
    branch: document.branch,
    commits: document.commits,
    status: document.status,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
    ...(document.publishedAt ? { publishedAt: document.publishedAt } : {}),
  };
}

function ensurePostId(postId: string) {
  if (!isValidObjectId(postId)) {
    throw new HttpError(404, "Post not found");
  }
}

function parseStatusFilter(status: unknown) {
  if (status === undefined) {
    return undefined;
  }

  if (status !== "draft" && status !== "published") {
    throw new HttpError(400, "Invalid post status filter");
  }

  return status as PostStatus;
}

export function parseCreatePostInput(body: unknown): CreatePostInput {
  if (typeof body !== "object" || body === null) {
    throw new HttpError(400, "Invalid request body");
  }

  return {
    title: ensureString((body as { title?: unknown }).title, "title"),
    summary: ensureString((body as { summary?: unknown }).summary, "summary"),
    content: ensureString((body as { content?: unknown }).content, "content"),
    repository: ensureRepository(
      (body as { repository?: unknown }).repository,
    ),
    branch: ensureString((body as { branch?: unknown }).branch, "branch"),
    commits: ensureCommits((body as { commits?: unknown }).commits),
  };
}

export function parseUpdatePostInput(body: unknown): UpdatePostInput {
  if (typeof body !== "object" || body === null) {
    throw new HttpError(400, "Invalid request body");
  }

  const input = body as UpdatePostInput;
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
  return parseStatusFilter(status);
}

export function parseUpdateStatusInput(body: unknown) {
  if (typeof body !== "object" || body === null) {
    throw new HttpError(400, "Invalid request body");
  }

  const status = (body as { status?: unknown }).status;
  if (status !== "draft" && status !== "published") {
    throw new HttpError(400, "Invalid request body", {
      field: "status",
    });
  }

  return status as PostStatus;
}

export async function listPosts(status?: PostStatus) {
  const posts = await PostModel.find(
    status === undefined ? {} : { status },
  ).sort({
    updatedAt: -1,
  });

  return posts.map((post) => normalizePost(post.toObject()));
}

export async function getPostById(postId: string) {
  ensurePostId(postId);

  const post = await PostModel.findById(postId);

  if (post === null) {
    throw new HttpError(404, "Post not found");
  }

  return normalizePost(post.toObject());
}

export async function createPost(input: CreatePostInput) {
  const post = await PostModel.create({
    ...input,
    status: "draft",
  });

  return normalizePost(post.toObject());
}

export async function updatePost(postId: string, input: UpdatePostInput) {
  ensurePostId(postId);

  const post = await PostModel.findByIdAndUpdate(postId, input, {
    returnDocument: "after",
    runValidators: true,
  });

  if (post === null) {
    throw new HttpError(404, "Post not found");
  }

  return normalizePost(post.toObject());
}

export async function updatePostStatus(postId: string, status: PostStatus) {
  ensurePostId(postId);

  const post = await PostModel.findByIdAndUpdate(
    postId,
    {
      $set: {
        status,
        ...(status === "published"
          ? { publishedAt: new Date().toISOString() }
          : {}),
      },
      ...(status === "draft" ? { $unset: { publishedAt: "" } } : {}),
    },
    {
      returnDocument: "after",
      runValidators: true,
    },
  );

  if (post === null) {
    throw new HttpError(404, "Post not found");
  }

  return normalizePost(post.toObject());
}

export async function deletePost(postId: string) {
  ensurePostId(postId);

  const post = await PostModel.findByIdAndDelete(postId);

  if (post === null) {
    throw new HttpError(404, "Post not found");
  }
}
