import type { PaginationMeta } from "../lib/posts";

type PaginationControlsProps = {
  pagination: PaginationMeta;
  loading: boolean;
  itemLabel: string;
  onPageChange: (page: number) => void;
};

export function PaginationControls({
  pagination,
  loading,
  itemLabel,
  onPageChange,
}: PaginationControlsProps) {
  if (pagination.total === 0) {
    return null;
  }

  const firstItem = (pagination.page - 1) * pagination.limit + 1;
  const lastItem = Math.min(pagination.page * pagination.limit, pagination.total);

  return (
    <div className="mt-6 flex flex-col gap-3 border-t border-default pt-4 text-sm text-secondary sm:flex-row sm:items-center sm:justify-between">
      <p>
        Showing {firstItem}-{lastItem} of {pagination.total} {itemLabel}
      </p>

      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={loading || !pagination.hasPreviousPage}
          onClick={() => onPageChange(pagination.page - 1)}
          className="rounded-md bg-action-secondary px-3 py-2 font-medium text-action-secondary-text hover:bg-action-secondary-hover disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          Previous
        </button>
        <span className="text-muted">
          Page {pagination.page}
          {pagination.totalPages > 0 ? ` of ${pagination.totalPages}` : ""}
        </span>
        <button
          type="button"
          disabled={loading || !pagination.hasNextPage}
          onClick={() => onPageChange(pagination.page + 1)}
          className="rounded-md bg-action-secondary px-3 py-2 font-medium text-action-secondary-text hover:bg-action-secondary-hover disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          Next
        </button>
      </div>
    </div>
  );
}
