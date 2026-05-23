import type { CommitSummary, RepositorySummary } from "../lib/github";
import { MAX_SELECTED_COMMITS } from "../constants/limits";

type CommitListProps = {
  repository: RepositorySummary | null;
  branchName: string | null;
  commits: CommitSummary[];
  selectedCommitShas: string[];
  loading: boolean;
  error: string | null;
  disabled: boolean;
  onToggle: (commit: CommitSummary) => void;
  onRetry: () => void;
};

function CommitRow({
  commit,
  selected,
  disabled,
  onToggle,
}: {
  commit: CommitSummary;
  selected: boolean;
  disabled: boolean;
  onToggle: (commit: CommitSummary) => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={() => onToggle(commit)}
      className={[
        "flex min-w-0 w-full flex-col gap-2 rounded-lg border p-4 text-left transition",
        "bg-surface text-primary border-default",
        selected
          ? "border-action-primary shadow-elevated"
          : "hover:bg-surface-muted hover:border-border-strong",
        "disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-surface",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
      ].join(" ")}
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold">{commit.message}</h3>
          <p className="mt-1 truncate text-xs text-secondary">
            {commit.authorName} · {commit.authorDate}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-surface-muted px-2.5 py-1 text-xs font-medium text-muted">
          {commit.sha.slice(0, 7)}
        </span>
      </div>
      <p className="min-w-0 max-w-full truncate text-xs text-muted">
        {commit.htmlUrl}
      </p>
    </button>
  );
}

export function CommitList({
  repository,
  branchName,
  commits,
  selectedCommitShas,
  loading,
  error,
  disabled,
  onToggle,
  onRetry,
}: CommitListProps) {
  const selectionLimitReached =
    selectedCommitShas.length >= MAX_SELECTED_COMMITS;

  return (
    <section
      aria-disabled={disabled}
      className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-default bg-surface shadow-elevated lg:h-[calc(100svh-7rem)] lg:min-h-[30rem] lg:max-h-[80rem]"
    >
      <div className="border-b border-default px-6 py-5 text-left">
        <p className="text-sm font-medium uppercase tracking-wide text-muted">
          Step 3
        </p>
        <h2 className="mt-2 text-xl font-semibold">Choose commits</h2>
        <p className="mt-2 text-sm text-secondary">
          Commits load after a branch is selected.
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-6 text-left">
        {repository === null ? (
          <button
            type="button"
            disabled
            className="flex min-w-0 w-full cursor-not-allowed rounded-lg border border-default bg-surface-muted p-4 text-left text-sm text-muted opacity-70"
          >
            Select a repository first to load commits.
          </button>
        ) : branchName === null ? (
          <button
            type="button"
            disabled
            className="flex min-w-0 w-full cursor-not-allowed rounded-lg border border-default bg-surface-muted p-4 text-left text-sm text-muted opacity-70"
          >
            Select a branch first to load commits.
          </button>
        ) : loading ? (
          <p
            role="status"
            aria-live="polite"
            className="text-sm text-secondary"
          >
            Loading commits...
          </p>
        ) : error ? (
          <div
            role="alert"
            className="flex items-start justify-between gap-4 rounded-lg border border-status-danger-subtle bg-status-danger-subtle px-4 py-3"
          >
            <p className="text-sm text-status-danger-text">{error}</p>
            <button
              type="button"
              disabled={disabled}
              onClick={onRetry}
              className="rounded-md bg-action-secondary px-3 py-2 text-sm font-medium text-action-secondary-text hover:bg-action-secondary-hover disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              Retry
            </button>
          </div>
        ) : commits.length === 0 ? (
          <p className="text-sm text-secondary">
            No commits were returned for {branchName}.
          </p>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 rounded-lg bg-surface-muted px-4 py-3 text-sm">
              <span className="text-secondary">
                {selectedCommitShas.length}/{MAX_SELECTED_COMMITS} selected
              </span>
              <button
                type="button"
                disabled={disabled}
                onClick={onRetry}
                className="rounded-md bg-action-secondary px-3 py-2 text-xs font-medium text-action-secondary-text hover:bg-action-secondary-hover disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                Refresh
              </button>
            </div>

            <div className="grid gap-3">
              {commits.map((commit) => {
                const selected = selectedCommitShas.includes(commit.sha);

                return (
                  <CommitRow
                    key={commit.sha}
                    commit={commit}
                    selected={selected}
                    disabled={disabled || (selectionLimitReached && !selected)}
                    onToggle={onToggle}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
