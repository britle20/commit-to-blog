import type { BranchSummary, RepositorySummary } from "../lib/github";

type BranchSelectorProps = {
  repository: RepositorySummary | null;
  branches: BranchSummary[];
  selectedBranchName: string | null;
  loading: boolean;
  error: string | null;
  disabled: boolean;
  onSelect: (branch: BranchSummary) => void;
  onRetry: () => void;
};

function BranchCard({
  branch,
  selected,
  disabled,
  onSelect,
}: {
  branch: BranchSummary;
  selected: boolean;
  disabled: boolean;
  onSelect: (branch: BranchSummary) => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={() => onSelect(branch)}
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
      <div className="flex min-w-0 items-center justify-between gap-3">
        <h3 className="min-w-0 truncate text-base font-semibold">
          {branch.name}
        </h3>
        <span className="rounded-full bg-surface-muted px-2.5 py-1 text-xs font-medium text-muted">
          {branch.commitSha.slice(0, 7)}
        </span>
      </div>
    </button>
  );
}

export function BranchSelector({
  repository,
  branches,
  selectedBranchName,
  loading,
  error,
  disabled,
  onSelect,
  onRetry,
}: BranchSelectorProps) {
  return (
    <section
      aria-disabled={disabled}
      className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-default bg-surface shadow-elevated lg:h-[calc(100svh-7rem)] lg:min-h-[30rem] lg:max-h-[80rem]"
    >
      <div className="border-b border-default px-6 py-5 text-left">
        <p className="text-sm font-medium uppercase tracking-wide text-muted">
          Step 2
        </p>
        <h2 className="mt-2 text-xl font-semibold">Choose a branch</h2>
        <p className="mt-2 text-sm text-secondary">
          Branches load after a repository is selected.
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-6 text-left">
        {repository === null ? (
          <button
            type="button"
            disabled
            className="flex min-w-0 w-full cursor-not-allowed rounded-lg border border-default bg-surface-muted p-4 text-left text-sm text-muted opacity-70"
          >
            Select a repository first to load branches.
          </button>
        ) : loading ? (
          <p
            role="status"
            aria-live="polite"
            className="text-sm text-secondary"
          >
            Loading branches...
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
        ) : branches.length === 0 ? (
          <p className="text-sm text-secondary">
            No branches are available for {repository.fullName}.
          </p>
        ) : (
          <div className="grid gap-3">
            {branches.map((branch) => (
              <BranchCard
                key={branch.name}
                branch={branch}
                selected={selectedBranchName === branch.name}
                disabled={disabled}
                onSelect={onSelect}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
