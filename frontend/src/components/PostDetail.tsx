import { formatDate } from "../lib/dates";
import type { Post, PostEditInput } from "../lib/posts";

type PostDetailProps = {
  post: Post | null;
  loading: boolean;
  error: string | null;
  editDraft: PostEditInput | null;
  saving: boolean;
  saveError: string | null;
  onStartEdit: () => void;
  onEditChange: (field: keyof PostEditInput, value: string) => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onRetry: () => void;
  onClose: () => void;
};

function getStatusClassName(status: Post["status"]) {
  return status === "published"
    ? "bg-status-success-subtle text-status-success-text"
    : "bg-status-warning-subtle text-status-warning-text";
}

function FieldLabel({
  htmlFor,
  children,
}: {
  htmlFor: string;
  children: string;
}) {
  return (
    <label htmlFor={htmlFor} className="text-sm font-medium text-primary">
      {children}
    </label>
  );
}

export function PostDetail({
  post,
  loading,
  error,
  editDraft,
  saving,
  saveError,
  onStartEdit,
  onEditChange,
  onCancelEdit,
  onSaveEdit,
  onRetry,
  onClose,
}: PostDetailProps) {
  const isEditing = post !== null && editDraft !== null;
  const canSaveEdit =
    editDraft !== null &&
    editDraft.title.trim() !== "" &&
    editDraft.summary.trim() !== "" &&
    editDraft.content.trim() !== "";

  return (
    <section className="rounded-lg border border-default bg-surface shadow-elevated">
      <div className="flex flex-col gap-4 border-b border-default px-6 py-5 text-left md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-muted">
            Post detail
          </p>
          <h2 className="mt-2 text-xl font-semibold">
            {post ? post.title : "Select a saved post"}
          </h2>
          <p className="mt-2 text-sm text-secondary">
            Review the saved content, metadata, and source commits.
          </p>
        </div>

        {post ? (
          <div className="flex shrink-0 flex-wrap gap-2">
            {!isEditing ? (
              <button
                type="button"
                disabled={loading || saving}
                onClick={onStartEdit}
                className="inline-flex items-center justify-center rounded-md bg-action-primary px-3 py-2 text-sm font-medium text-action-primary-text hover:bg-action-primary-hover disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                Edit
              </button>
            ) : null}
            <button
              type="button"
              disabled={saving}
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-md bg-action-secondary px-3 py-2 text-sm font-medium text-action-secondary-text hover:bg-action-secondary-hover disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              Close
            </button>
          </div>
        ) : null}
      </div>

      <div className="p-6 text-left">
        {loading && post === null ? (
          <p
            role="status"
            aria-live="polite"
            className="text-sm text-secondary"
          >
            Loading post details...
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
        ) : post === null ? (
          <p className="text-sm text-secondary">
            Choose a saved post from the list to open its detail view.
          </p>
        ) : isEditing ? (
          <form
            className="grid gap-5"
            onSubmit={(event) => {
              event.preventDefault();
              onSaveEdit();
            }}
          >
            {loading ? (
              <p
                role="status"
                aria-live="polite"
                className="rounded-lg bg-surface-muted px-4 py-3 text-sm text-secondary"
              >
                Refreshing post details...
              </p>
            ) : null}

            <div className="grid gap-2">
              <FieldLabel htmlFor="saved-post-title">Title</FieldLabel>
              <input
                id="saved-post-title"
                name="title"
                type="text"
                value={editDraft.title}
                disabled={saving}
                onChange={(event) =>
                  onEditChange("title", event.currentTarget.value)
                }
                className="min-h-11 rounded-md border border-default bg-surface px-3 py-2 text-sm text-primary shadow-none outline-none transition placeholder:text-muted disabled:cursor-not-allowed disabled:opacity-60 focus:border-focus focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              />
            </div>

            <div className="grid gap-2">
              <FieldLabel htmlFor="saved-post-summary">Summary</FieldLabel>
              <textarea
                id="saved-post-summary"
                name="summary"
                value={editDraft.summary}
                disabled={saving}
                rows={4}
                onChange={(event) =>
                  onEditChange("summary", event.currentTarget.value)
                }
                className="min-h-28 resize-y rounded-md border border-default bg-surface px-3 py-2 text-sm text-primary shadow-none outline-none transition placeholder:text-muted disabled:cursor-not-allowed disabled:opacity-60 focus:border-focus focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              />
            </div>

            <div className="grid gap-2">
              <FieldLabel htmlFor="saved-post-content">Content</FieldLabel>
              <textarea
                id="saved-post-content"
                name="content"
                value={editDraft.content}
                disabled={saving}
                rows={14}
                onChange={(event) =>
                  onEditChange("content", event.currentTarget.value)
                }
                className="min-h-80 resize-y rounded-md border border-default bg-surface px-3 py-2 font-mono text-sm text-primary shadow-none outline-none transition placeholder:text-muted disabled:cursor-not-allowed disabled:opacity-60 focus:border-focus focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              />
            </div>

            <div className="flex flex-col gap-3 rounded-lg border border-muted bg-surface-muted px-4 py-3 md:flex-row md:items-center md:justify-between">
              <div className="text-sm">
                {saveError ? (
                  <p role="alert" className="text-status-danger-text">
                    {saveError}
                  </p>
                ) : saving ? (
                  <p
                    role="status"
                    aria-live="polite"
                    className="text-secondary"
                  >
                    Saving changes...
                  </p>
                ) : (
                  <p className="text-secondary">
                    Update the saved title, summary, or content.
                  </p>
                )}
              </div>

              <div className="flex shrink-0 flex-wrap gap-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={onCancelEdit}
                  className="inline-flex items-center justify-center rounded-md bg-action-secondary px-3 py-2 text-sm font-medium text-action-secondary-text hover:bg-action-secondary-hover disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!canSaveEdit || saving}
                  className="inline-flex items-center justify-center rounded-md bg-action-primary px-4 py-2 text-sm font-medium text-action-primary-text hover:bg-action-primary-hover disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                >
                  {saving ? "Saving..." : "Save changes"}
                </button>
              </div>
            </div>
          </form>
        ) : (
          <div className="grid gap-5">
            {loading ? (
              <p
                role="status"
                aria-live="polite"
                className="rounded-lg bg-surface-muted px-4 py-3 text-sm text-secondary"
              >
                Refreshing post details...
              </p>
            ) : null}

            <div className="flex flex-wrap items-center gap-2">
              <span
                className={[
                  "inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize",
                  getStatusClassName(post.status),
                ].join(" ")}
              >
                {post.status}
              </span>
              <span className="rounded-full bg-surface-muted px-2.5 py-1 text-xs font-medium text-muted">
                {post.repository.fullName}
              </span>
              <span className="rounded-full bg-surface-muted px-2.5 py-1 text-xs font-medium text-muted">
                {post.branch}
              </span>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-primary">
                {post.title}
              </h3>
              <p className="mt-2 text-sm text-secondary">{post.summary}</p>
            </div>

            <dl className="grid gap-3 text-xs text-secondary md:grid-cols-2">
              <div className="rounded-lg bg-surface-muted px-3 py-2">
                <dt className="text-muted">Created</dt>
                <dd className="mt-1 font-medium text-primary">
                  {formatDate(post.createdAt)}
                </dd>
              </div>
              <div className="rounded-lg bg-surface-muted px-3 py-2">
                <dt className="text-muted">Updated</dt>
                <dd className="mt-1 font-medium text-primary">
                  {formatDate(post.updatedAt)}
                </dd>
              </div>
              {post.publishedAt ? (
                <div className="rounded-lg bg-surface-muted px-3 py-2">
                  <dt className="text-muted">Published</dt>
                  <dd className="mt-1 font-medium text-primary">
                    {formatDate(post.publishedAt)}
                  </dd>
                </div>
              ) : null}
              <div className="rounded-lg bg-surface-muted px-3 py-2">
                <dt className="text-muted">Source commits</dt>
                <dd className="mt-1 font-medium text-primary">
                  {post.commits.length}
                </dd>
              </div>
            </dl>

            <article className="whitespace-pre-wrap rounded-lg border border-muted bg-surface px-4 py-3 text-sm leading-6 text-primary">
              {post.content}
            </article>

            <div>
              <h3 className="text-sm font-semibold text-primary">
                Source commits
              </h3>
              <div className="mt-3 grid gap-2">
                {post.commits.map((commit) => (
                  <a
                    key={commit.sha}
                    href={commit.htmlUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-lg border border-default bg-surface px-3 py-2 text-sm hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                  >
                    <span className="block truncate font-medium text-primary">
                      {commit.message}
                    </span>
                    <span className="mt-1 block text-xs text-muted">
                      {commit.authorName} / {formatDate(commit.authorDate)} /{" "}
                      {commit.sha.slice(0, 7)}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
