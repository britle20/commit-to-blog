import type { RepositorySummary } from "../lib/github";

type RepositorySelectorProps = {
  repositories: RepositorySummary[];
  selectedRepositoryId: number | null;
  loading: boolean;
  error: string | null;
  onSelect: (repository: RepositorySummary) => void;
  onRetry: () => void;
};

function RepositoryCard({
  repository,
  selected,
  onSelect,
}: {
  repository: RepositorySummary;
  selected: boolean;
  onSelect: (repository: RepositorySummary) => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onSelect(repository)}
      className={[
        "flex min-w-0 w-full flex-col gap-3 rounded-lg border p-4 text-left transition",
        "bg-surface text-primary border-default",
        selected
          ? "border-action-primary shadow-elevated"
          : "hover:bg-surface-muted hover:border-border-strong",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
      ].join(" ")}
    >
      <div className="flex min-w-0 items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold">{repository.name}</h3>
          <p className="mt-1 truncate text-sm text-secondary">
            {repository.fullName}
          </p>
        </div>
        <span
          className={[
            "shrink-0 rounded-full px-2.5 py-1 text-xs font-medium",
            repository.private
              ? "bg-status-warning-subtle text-status-warning-text"
              : "bg-status-success-subtle text-status-success-text",
          ].join(" ")}
        >
          {repository.private ? "Private" : "Public"}
        </span>
      </div>

      <div className="flex min-w-0 flex-wrap gap-2 text-xs text-muted">
        <span className="max-w-full truncate rounded-full bg-surface-muted px-2.5 py-1">
          Owner: {repository.owner}
        </span>
        <span className="max-w-full truncate rounded-full bg-surface-muted px-2.5 py-1">
          Default branch: {repository.defaultBranch}
        </span>
      </div>
    </button>
  );
}

export function RepositorySelector({
  repositories,
  selectedRepositoryId,
  loading,
  error,
  onSelect,
  onRetry,
}: RepositorySelectorProps) {
  return (
    <section className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-default bg-surface shadow-elevated lg:h-[calc(100svh-7rem)] lg:min-h-[30rem] lg:max-h-[80rem]">
      <div className="border-b border-default px-6 py-5 text-left">
        <p className="text-sm font-medium uppercase tracking-wide text-muted">
          Step 1
        </p>
        <h2 className="mt-2 text-xl font-semibold">Choose a repository</h2>
        <p className="mt-2 text-sm text-secondary">
          Select a GitHub repository to continue with branch and commit
          selection.
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-6 text-left">
        {loading ? (
          <p
            role="status"
            aria-live="polite"
            className="text-sm text-secondary"
          >
            Loading repositories...
          </p>
        ) : error ? (
          <div
            role="alert"
            className="flex items-start justify-between gap-4 rounded-lg border border-status-danger-subtle bg-status-danger-subtle px-4 py-3"
          >
            <p className="text-sm text-status-danger-text">{error}</p>
            <button
              type="button"
              onClick={onRetry}
              className="rounded-md bg-action-secondary px-3 py-2 text-sm font-medium text-action-secondary-text hover:bg-action-secondary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              Retry
            </button>
          </div>
        ) : repositories.length === 0 ? (
          <p className="text-sm text-secondary">
            No repositories are available from the configured GitHub token.
          </p>
        ) : (
          <div className="grid gap-3">
            {repositories.map((repository) => (
              <RepositoryCard
                key={repository.id}
                repository={repository}
                selected={selectedRepositoryId === repository.id}
                onSelect={onSelect}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
