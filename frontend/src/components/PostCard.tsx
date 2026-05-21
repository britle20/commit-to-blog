import type { Post } from "../lib/posts";
import { formatDate } from "../lib/dates";

type PostCardProps = {
  post: Post;
  selected: boolean;
  onOpen: (post: Post) => void;
};

function getStatusClassName(status: Post["status"]) {
  return status === "published"
    ? "bg-status-success-subtle text-status-success-text"
    : "bg-status-warning-subtle text-status-warning-text";
}

export function PostCard({ post, selected, onOpen }: PostCardProps) {
  return (
    <article
      className={[
        "rounded-lg border bg-surface p-4 text-left shadow-elevated",
        selected ? "border-action-primary" : "border-default",
      ].join(" ")}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-primary">{post.title}</h3>
          <p className="mt-2 text-sm text-secondary">{post.summary}</p>
        </div>
        <span
          className={[
            "inline-flex shrink-0 items-center rounded-full px-2.5 py-1",
            "text-xs font-medium capitalize",
            getStatusClassName(post.status),
          ].join(" ")}
        >
          {post.status}
        </span>
      </div>

      <dl className="mt-4 grid gap-3 text-xs text-secondary sm:grid-cols-3">
        <div className="rounded-lg bg-surface-muted px-3 py-2">
          <dt className="text-muted">Repository</dt>
          <dd className="mt-1 truncate font-medium text-primary">
            {post.repository.fullName}
          </dd>
        </div>
        <div className="rounded-lg bg-surface-muted px-3 py-2">
          <dt className="text-muted">Branch</dt>
          <dd className="mt-1 truncate font-medium text-primary">
            {post.branch}
          </dd>
        </div>
        <div className="rounded-lg bg-surface-muted px-3 py-2">
          <dt className="text-muted">Updated</dt>
          <dd className="mt-1 font-medium text-primary">
            {formatDate(post.updatedAt)}
          </dd>
        </div>
      </dl>

      <button
        type="button"
        onClick={() => onOpen(post)}
        className="mt-4 inline-flex items-center justify-center rounded-md bg-action-secondary px-3 py-2 text-sm font-medium text-action-secondary-text hover:bg-action-secondary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
        View details
      </button>
    </article>
  );
}
