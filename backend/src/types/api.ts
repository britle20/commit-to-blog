export type RepositoryInput = {
  owner: string;
  name: string;
  fullName: string;
};

export type CommitInput = {
  sha: string;
  message: string;
  authorName: string;
  authorDate: string;
  htmlUrl: string;
  files?: CommitFileChange[];
  changeContextNote?: string;
};

export type CommitFileChange = {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  patchExcerpt?: string;
};

export type PostStatus = "draft" | "published";

export type PostListQuery = {
  status?: PostStatus;
  page: number;
  limit: number;
};

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
};

export type GeneratedDraft = {
  title: string;
  summary: string;
  content: string;
};

export type GenerateDraftInput = {
  repository: RepositoryInput;
  branch: string;
  commits: CommitInput[];
};

export type CreatePostInput = {
  title: string;
  summary: string;
  content: string;
  repository: RepositoryInput;
  branch: string;
  commits: CommitInput[];
};

export type UpdatePostInput = {
  title?: string;
  summary?: string;
  content?: string;
};
