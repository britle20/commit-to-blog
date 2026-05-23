import { readApiError } from "./api";
import type { CommitSummary, RepositorySummary } from "./github";

type PostRepository = Pick<RepositorySummary, "owner" | "name" | "fullName">;

export type PostStatus = "draft" | "published";

export type Post = {
  id: string;
  title: string;
  summary: string;
  content: string;
  repository: PostRepository;
  branch: string;
  commits: CommitSummary[];
  status: PostStatus;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
};

export type PostEditInput = Pick<Post, "title" | "summary" | "content">;

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
};

export type PostListResult = {
  posts: Post[];
  pagination: PaginationMeta;
};

type PostListOptions = {
  page?: number;
  limit?: number;
};

type CreatePostInput = {
  title: string;
  summary: string;
  content: string;
  repository: PostRepository;
  branch: string;
  commits: CommitSummary[];
};

type CreatePostResponse = {
  post: Post;
};

type PostResponse = {
  post: Post;
};

type UpdatePostInput = Partial<PostEditInput>;

type UpdatePostResponse = {
  post: Post;
};

type UpdatePostStatusResponse = {
  post: Post;
};

type ListPostsResponse = {
  posts: Post[];
  pagination: PaginationMeta;
};

async function fetchPostList(
  status: PostStatus | undefined,
  options: PostListOptions,
  signal?: AbortSignal,
): Promise<PostListResult> {
  const searchParams = new URLSearchParams();

  if (status !== undefined) {
    searchParams.set("status", status);
  }

  if (options.page !== undefined) {
    searchParams.set("page", String(options.page));
  }

  if (options.limit !== undefined) {
    searchParams.set("limit", String(options.limit));
  }

  const queryString = searchParams.toString();
  const response = await fetch(
    queryString === "" ? "/api/posts" : `/api/posts?${queryString}`,
    { signal },
  );

  if (!response.ok) {
    throw new Error(await readApiError(response, "Failed to load posts."));
  }

  const body = (await response.json()) as ListPostsResponse;

  return {
    posts: body.posts,
    pagination: body.pagination,
  };
}

export async function fetchPosts(
  options: PostListOptions = {},
  signal?: AbortSignal,
) {
  return fetchPostList(undefined, options, signal);
}

export async function fetchDraftPosts(
  options: PostListOptions = {},
  signal?: AbortSignal,
) {
  return fetchPostList("draft", options, signal);
}

export async function fetchPublishedPosts(
  options: PostListOptions = {},
  signal?: AbortSignal,
) {
  return fetchPostList("published", options, signal);
}

export async function fetchPost(postId: string, signal?: AbortSignal) {
  const response = await fetch(`/api/posts/${encodeURIComponent(postId)}`, {
    signal,
  });

  if (!response.ok) {
    throw new Error(await readApiError(response, "Failed to load post."));
  }

  const body = (await response.json()) as PostResponse;

  return body.post;
}

export async function createDraftPost(
  input: CreatePostInput,
  signal?: AbortSignal,
) {
  const response = await fetch("/api/posts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
    signal,
  });

  if (!response.ok) {
    throw new Error(await readApiError(response, "Failed to save draft."));
  }

  const body = (await response.json()) as CreatePostResponse;

  return body.post;
}

export async function updatePost(
  postId: string,
  input: UpdatePostInput,
  signal?: AbortSignal,
) {
  const response = await fetch(`/api/posts/${encodeURIComponent(postId)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
    signal,
  });

  if (!response.ok) {
    throw new Error(await readApiError(response, "Failed to update post."));
  }

  const body = (await response.json()) as UpdatePostResponse;

  return body.post;
}

export async function deletePost(postId: string, signal?: AbortSignal) {
  const response = await fetch(`/api/posts/${encodeURIComponent(postId)}`, {
    method: "DELETE",
    signal,
  });

  if (!response.ok) {
    throw new Error(await readApiError(response, "Failed to delete post."));
  }
}

export async function updatePostStatus(
  postId: string,
  status: PostStatus,
  signal?: AbortSignal,
) {
  const response = await fetch(
    `/api/posts/${encodeURIComponent(postId)}/status`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
      signal,
    },
  );

  if (!response.ok) {
    throw new Error(
      await readApiError(response, "Failed to update post status."),
    );
  }

  const body = (await response.json()) as UpdatePostStatusResponse;

  return body.post;
}
