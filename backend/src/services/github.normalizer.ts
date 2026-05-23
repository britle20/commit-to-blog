export type GitHubRepository = {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  default_branch: string;
  html_url: string;
  owner: {
    login: string;
  };
};

export type GitHubBranch = {
  name: string;
  commit: {
    sha: string;
  };
};

export type GitHubCommit = {
  sha: string;
  html_url: string;
  commit: {
    message: string;
    author?: {
      name?: string;
      email?: string;
      date?: string;
    };
  };
  author?: {
    login?: string;
  };
};

export type GitHubCommitFile = {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
};

export type GitHubCommitDetail = GitHubCommit & {
  files?: GitHubCommitFile[];
};

export type RepositorySummary = {
  id: number;
  name: string;
  fullName: string;
  owner: string;
  private: boolean;
  defaultBranch: string;
  htmlUrl: string;
};

export type BranchSummary = {
  name: string;
  commitSha: string;
};

export type CommitSummary = {
  sha: string;
  message: string;
  authorName: string;
  authorDate: string;
  htmlUrl: string;
};

export function normalizeRepository(
  repository: GitHubRepository,
): RepositorySummary {
  return {
    id: repository.id,
    name: repository.name,
    fullName: repository.full_name,
    owner: repository.owner.login,
    private: repository.private,
    defaultBranch: repository.default_branch,
    htmlUrl: repository.html_url,
  };
}

export function normalizeBranch(branch: GitHubBranch): BranchSummary {
  return {
    name: branch.name,
    commitSha: branch.commit.sha,
  };
}

export function normalizeCommit(commit: GitHubCommit): CommitSummary {
  return {
    sha: commit.sha,
    message: commit.commit.message,
    authorName:
      commit.commit.author?.name ?? commit.author?.login ?? "Unknown author",
    authorDate:
      commit.commit.author?.date ?? new Date().toISOString(),
    htmlUrl: commit.html_url,
  };
}
