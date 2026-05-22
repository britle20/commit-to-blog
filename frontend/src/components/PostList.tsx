import type { Post } from "../lib/posts";
import { PostCard } from "./PostCard";

type PostListProps = {
  posts: Post[];
  selectedPostId: string | null;
  loading: boolean;
  error: string | null;
  eyebrow?: string;
  title?: string;
  description?: string;
  emptyMessage?: string;
  onOpenPost: (post: Post) => void;
  onRetry: () => void;
};

export function PostList({
  posts,
  selectedPostId,
  loading,
  error,
  eyebrow = "Saved posts",
  title = "Review saved drafts",
  description = "Drafts and published posts saved in this service are listed here.",
  emptyMessage = "No saved posts yet. Save a generated draft to add it here.",
  onOpenPost,
  onRetry,
}: PostListProps) {
  return (
    <section className="rounded-lg border border-default bg-surface shadow-elevated">
      <div className="flex flex-col gap-4 border-b border-default px-6 py-5 text-left md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-muted">
            {eyebrow}
          </p>
          <h2 className="mt-2 text-xl font-semibold">{title}</h2>
          <p className="mt-2 text-sm text-secondary">{description}</p>
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
            Loading saved posts...
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
          <p className="text-sm text-secondary">{emptyMessage}</p>
        ) : (
          <div className="grid gap-3">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                selected={selectedPostId === post.id}
                onOpen={onOpenPost}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
