import { HttpError } from "../middleware/error.middleware.js";
import { MAX_SELECTED_COMMITS } from "../config/limits.js";
import { env } from "../config/env.js";
import type { CommitFileChange, CommitInput } from "../types/api.js";
import {
  normalizeBranch,
  normalizeCommit,
  normalizeRepository,
  type BranchSummary,
  type CommitSummary,
  type GitHubBranch,
  type GitHubCommit,
  type GitHubCommitDetail,
  type GitHubCommitFile,
  type GitHubRepository,
  type RepositorySummary,
} from "./github.normalizer.js";
type GitHubApiError = {
  message?: string;
};

const GITHUB_API_BASE_URL = "https://api.github.com";
const GITHUB_API_VERSION = "2022-11-28";
const MAX_FILES_PER_COMMIT = 8;
const MAX_PATCH_CHARS_PER_FILE = 1200;

const SOURCE_EXTENSIONS = new Set([
  ".c",
  ".cc",
  ".cpp",
  ".cs",
  ".css",
  ".go",
  ".h",
  ".hpp",
  ".html",
  ".java",
  ".js",
  ".jsx",
  ".json",
  ".kt",
  ".mjs",
  ".py",
  ".rb",
  ".rs",
  ".scss",
  ".sh",
  ".sql",
  ".swift",
  ".ts",
  ".tsx",
  ".vue",
  ".yaml",
  ".yml",
]);

const NOISY_PATH_PARTS = new Set([
  ".cache",
  "build",
  "coverage",
  "dist",
  "generated",
  "node_modules",
  "out",
  "target",
  "vendor",
]);

const ROLE_HINTS = [
  "api",
  "component",
  "config",
  "controller",
  "hook",
  "middleware",
  "model",
  "route",
  "schema",
  "service",
  "spec",
  "test",
  "validator",
];

const BINARY_EXTENSIONS = new Set([
  ".avif",
  ".gif",
  ".ico",
  ".jpeg",
  ".jpg",
  ".pdf",
  ".png",
  ".svg",
  ".webp",
  ".woff",
  ".woff2",
]);

function getExtension(filename: string) {
  const match = filename.toLowerCase().match(/\.[^.\\/]+$/);

  return match?.[0] ?? "";
}

function isLockfile(filename: string) {
  const basename = filename.toLowerCase().split("/").at(-1) ?? "";

  return (
    basename === "package-lock.json" ||
    basename === "pnpm-lock.yaml" ||
    basename === "yarn.lock" ||
    basename === "bun.lockb" ||
    basename === "composer.lock" ||
    basename === "gemfile.lock" ||
    basename === "poetry.lock" ||
    basename.endsWith(".lock")
  );
}

function hasNoisyPathPart(filename: string) {
  return filename
    .toLowerCase()
    .split("/")
    .some((part) => NOISY_PATH_PARTS.has(part));
}

function isBinaryFile(filename: string) {
  return BINARY_EXTENSIONS.has(getExtension(filename));
}

function shouldExcludeFile(file: GitHubCommitFile) {
  return (
    isLockfile(file.filename) ||
    hasNoisyPathPart(file.filename) ||
    isBinaryFile(file.filename)
  );
}

function scoreCommitFile(file: GitHubCommitFile) {
  const filename = file.filename.toLowerCase();
  const extension = getExtension(filename);
  const changeSize = file.additions + file.deletions;
  let score = 0;

  if (SOURCE_EXTENSIONS.has(extension)) {
    score += 30;
  }

  if (file.status === "added" || file.status === "removed") {
    score += 18;
  }

  if (ROLE_HINTS.some((hint) => filename.includes(hint))) {
    score += 14;
  }

  if (filename.includes("test") || filename.includes("spec")) {
    score += 10;
  }

  if (file.patch) {
    score += 8;
  }

  score += Math.min(changeSize, 120) / 10;

  if (changeSize > 500) {
    score -= 20;
  }

  return score;
}

function truncatePatch(patch: string) {
  if (patch.length <= MAX_PATCH_CHARS_PER_FILE) {
    return patch;
  }

  return `${patch.slice(0, MAX_PATCH_CHARS_PER_FILE).trimEnd()}\n... patch excerpt truncated ...`;
}

function toCommitFileChange(file: GitHubCommitFile): CommitFileChange {
  return {
    filename: file.filename,
    status: file.status,
    additions: file.additions,
    deletions: file.deletions,
    ...(file.patch ? { patchExcerpt: truncatePatch(file.patch) } : {}),
  };
}

function selectPromptFiles(files: GitHubCommitFile[] = []) {
  return files
    .filter((file) => !shouldExcludeFile(file))
    .sort((a, b) => scoreCommitFile(b) - scoreCommitFile(a))
    .slice(0, MAX_FILES_PER_COMMIT)
    .map(toCommitFileChange);
}

function createHeaders() {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${env.githubToken}`,
    "X-GitHub-Api-Version": GITHUB_API_VERSION,
  };
}

async function requestGitHub<T>(path: string, init?: RequestInit) {
  const response = await fetch(`${GITHUB_API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...createHeaders(),
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    let message = "GitHub API request failed";

    try {
      const body = (await response.json()) as GitHubApiError;
      if (typeof body.message === "string" && body.message.trim() !== "") {
        message = body.message;
      }
    } catch {
      // Keep the generic message if GitHub does not return JSON.
    }

    if (response.status === 403) {
      throw new HttpError(403, `GitHub API access denied: ${message}`);
    }

    if (response.status === 404) {
      throw new HttpError(404, `GitHub resource not found: ${message}`);
    }

    throw new HttpError(
      response.status >= 500 ? 502 : response.status,
      message,
    );
  }

  return response.json() as Promise<T>;
}

export async function listRepositories() {
  const repositories = await requestGitHub<GitHubRepository[]>(
    "/user/repos?per_page=100",
  );

  return {
    repositories: repositories.map(normalizeRepository),
  };
}

export async function listBranches(owner: string, repo: string) {
  const branches = await requestGitHub<GitHubBranch[]>(
    `/repos/${owner}/${repo}/branches?per_page=100`,
  );

  return {
    branches: branches.map(normalizeBranch),
  };
}

export async function listCommits(owner: string, repo: string, branch: string) {
  const commits = await requestGitHub<GitHubCommit[]>(
    `/repos/${owner}/${repo}/commits?sha=${encodeURIComponent(branch)}&per_page=100`,
  );

  return {
    commits: commits.map(normalizeCommit),
  };
}

async function getCommitFileChanges(owner: string, repo: string, sha: string) {
  const commit = await requestGitHub<GitHubCommitDetail>(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
      repo,
    )}/commits/${encodeURIComponent(sha)}`,
  );

  return selectPromptFiles(commit.files);
}

export async function enrichCommitsWithChangeContext(
  owner: string,
  repo: string,
  commits: CommitInput[],
) {
  const detailedCommits = await Promise.allSettled(
    commits.slice(0, MAX_SELECTED_COMMITS).map(async (commit) => ({
      ...commit,
      files: await getCommitFileChanges(owner, repo, commit.sha),
    })),
  );

  return commits.map((commit, index) => {
    if (index >= MAX_SELECTED_COMMITS) {
      return {
        ...commit,
        changeContextNote:
          "Detailed file changes were omitted because too many commits were selected.",
      };
    }

    const result = detailedCommits[index];

    if (result?.status === "fulfilled") {
      return result.value;
    }

    return {
      ...commit,
      changeContextNote: "Detailed file changes could not be loaded.",
    };
  });
}
