import { formatDate } from "../lib/dates";
import type { PaginationMeta, Post } from "../lib/posts";
import { PaginationControls } from "./PaginationControls";

type PublishedPostListProps = {
  posts: Post[];
  pagination: PaginationMeta;
  loading: boolean;
  error: string | null;
  onPageChange: (page: number) => void;
  onRetry: () => void;
};

export function PublishedPostList({
  posts,
  pagination,
  loading,
  error,
  onPageChange,
  onRetry,
}: PublishedPostListProps) {
  return (
    <section className="rounded-lg border border-default bg-surface shadow-elevated">
      <div className="flex flex-col gap-4 border-b border-default px-6 py-5 text-left md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-muted">
            Published posts
          </p>
          <h2 className="mt-2 text-xl font-semibold">Read published posts</h2>
          <p className="mt-2 text-sm text-secondary">
            Published posts are shown here as readable blog entries inside this
            service.
          </p>
        </div>

        <button
          type="button"
          disabled={loading}
          onClick={onRetry}
          className="inline-flex shrink-0 items-center justify-center rounded-md bg-action-secondary px-3 py-2 text-sm font-medium text-action-secondary-text hover:bg-action-secondary-hover disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          Refresh
        </button>
      </div>

      <div className="p-6 text-left">
        {loading ? (
          <p
            role="status"
            aria-live="polite"
            className="text-sm text-secondary"
          >
            Loading published posts...
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
        ) : posts.length === 0 ? (
          <p className="text-sm text-secondary">
            No published posts yet. Publish a saved draft to show it here.
          </p>
        ) : (
          <>
            <div className="grid gap-6">
              {posts.map((post) => (
                <article
                  key={post.id}
                  className="rounded-lg border border-default bg-surface px-5 py-4"
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                    <span className="rounded-full bg-status-success-subtle px-2.5 py-1 font-medium text-status-success-text">
                      Published
                    </span>
                    <span className="rounded-full bg-surface-muted px-2.5 py-1 font-medium">
                      {post.repository.fullName}
                    </span>
                    <span className="rounded-full bg-surface-muted px-2.5 py-1 font-medium">
                      {post.branch}
                    </span>
                    <span className="rounded-full bg-surface-muted px-2.5 py-1 font-medium">
                      {formatDate(post.publishedAt ?? post.updatedAt)}
                    </span>
                  </div>

                  <h3 className="mt-4 text-2xl font-semibold text-primary">
                    {post.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-secondary">
                    {post.summary}
                  </p>
                  <div className="mt-5 whitespace-pre-wrap text-sm leading-7 text-primary">
                    {post.content}
                  </div>
                </article>
              ))}
            </div>

            <PaginationControls
              pagination={pagination}
              loading={loading}
              itemLabel="published posts"
              onPageChange={onPageChange}
            />
          </>
        )}
      </div>
    </section>
  );
}
