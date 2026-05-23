import { isValidObjectId } from "mongoose";

import { HttpError } from "../middleware/error.middleware.js";
import { PostModel } from "../models/post.model.js";
import type {
  CommitInput,
  CreatePostInput,
  PostStatus,
  RepositoryInput,
  UpdatePostInput,
} from "../types/api.js";

type PostResponse = {
  id: string;
  title: string;
  summary: string;
  content: string;
  repository: RepositoryInput;
  branch: string;
  commits: CommitInput[];
  status: PostStatus;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
};

function normalizePost(document: {
  _id: { toString(): string };
  title: string;
  summary: string;
  content: string;
  repository: RepositoryInput;
  branch: string;
  commits: CommitInput[];
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
