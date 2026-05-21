import type { Post } from "../lib/posts";

type PostCardProps = {
  post: Post;
};

const dateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
});

function formatPostDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return dateFormatter.format(date);
}

function getStatusClassName(status: Post["status"]) {
  return status === "published"
    ? "bg-status-success-subtle text-status-success-text"
    : "bg-status-warning-subtle text-status-warning-text";
}

export function PostCard({ post }: PostCardProps) {
  return (
    <article className="rounded-lg border border-default bg-surface p-4 text-left shadow-elevated">
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
            {formatPostDate(post.updatedAt)}
          </dd>
        </div>
      </dl>
    </article>
  );
}
