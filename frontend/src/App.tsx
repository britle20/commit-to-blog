import { useState } from "react";

import { BranchSelector } from "./components/BranchSelector";
import { CommitList } from "./components/CommitList";
import { DraftEditor } from "./components/DraftEditor";
import { PostDetail } from "./components/PostDetail";
import { PostList } from "./components/PostList";
import { PublishedPostList } from "./components/PublishedPostList";
import { RepositorySelector } from "./components/RepositorySelector";
import { useComposeFlow } from "./hooks/useComposeFlow";
import { usePostDetail } from "./hooks/usePostDetail";
import { usePostLists } from "./hooks/usePostLists";

type AppView = "published" | "compose" | "drafts";

const pageCopy = {
  published: {
    title: "Published posts",
    description:
      "Read posts that have already been published inside this service.",
  },
  compose: {
    title: "Write a new post",
    description:
      "Select a repository, branch, and commits, then generate and save a draft.",
  },
  drafts: {
    title: "Draft posts",
    description:
      "Open a saved draft to edit it, delete it, or publish it inside this service.",
  },
} satisfies Record<AppView, { title: string; description: string }>;

const navItems: Array<{ view: AppView; label: string }> = [
  { view: "published", label: "Published" },
  { view: "compose", label: "New post" },
  { view: "drafts", label: "Drafts" },
];

function App() {
  const [activeView, setActiveView] = useState<AppView>("published");
  const postLists = usePostLists();
  const compose = useComposeFlow({
    onDraftSaved: postLists.handleDraftSaved,
  });
  const postDetail = usePostDetail({
    onPostLoaded: postLists.syncPost,
    onPostEdited: (post) => {
      postLists.handlePostEdited(post);
      compose.syncPostEdit(post);
    },
    onPostDeleted: (postId) => {
      postLists.handlePostDeleted(postId);
      compose.syncDeletedPost(postId);
    },
    onPostPublished: (post) => {
      postLists.handlePostPublished(post);
      compose.syncSavedDraft(post);
      setActiveView("published");
    },
  });
  const {
    selectedRepositoryId,
    branches,
    selectedBranchName,
    commits,
    selectedCommitShas,
    generatedDraft,
    savedDraft,
    hasUnsavedDraftChanges,
    branchLoading,
    commitLoading,
    draftLoading,
    saveLoading,
    branchError,
    commitError,
    draftError,
    saveError,
  } = compose.state;
  const {
    selectedPostId,
    selectedPost,
    postEditDraft,
    postDeleteConfirming,
    postDetailLoading,
    postEditSaving,
    postDeleting,
    postStatusUpdating,
    postDetailError,
    postEditError,
    postDeleteError,
    postStatusError,
  } = postDetail.state;

  return (
    <main className="min-h-screen bg-background text-primary">
      <div className="mx-auto flex min-h-screen w-full max-w-[92rem] flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
        <header className="rounded-lg border border-default bg-surface px-6 py-5 text-left shadow-elevated">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-wide text-muted">
                Commit to Blog
              </p>
              <h1 className="mt-2 text-2xl font-semibold">
                {pageCopy[activeView].title}
              </h1>
              <p className="mt-3 max-w-3xl text-sm text-secondary">
                {pageCopy[activeView].description}
              </p>
            </div>

            <nav
              aria-label="Primary"
              className="flex shrink-0 flex-wrap gap-2 rounded-lg bg-surface-muted p-1"
            >
              {navItems.map((item) => {
                const selected = activeView === item.view;

                return (
                  <button
                    key={item.view}
                    type="button"
                    aria-current={selected ? "page" : undefined}
                    onClick={() => setActiveView(item.view)}
                    className={[
                      "rounded-md px-3 py-2 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
                      selected
                        ? "bg-action-primary text-action-primary-text"
                        : "text-action-secondary-text hover:bg-action-secondary-hover",
                    ].join(" ")}
                  >
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </header>

        {activeView === "published" ? (
          <PublishedPostList
            posts={postLists.publishedPosts}
            pagination={postLists.publishedPostsPagination}
            loading={postLists.publishedPostsLoading}
            error={postLists.publishedPostsError}
            onPageChange={postLists.requestPublishedPostsPage}
            onRetry={() => postLists.reloadPublishedPosts()}
          />
        ) : null}

        {activeView === "compose" ? (
          <>
            <div className="grid min-w-0 gap-6 lg:grid-cols-3">
              <RepositorySelector
                repositories={compose.repositories}
                selectedRepositoryId={selectedRepositoryId}
                loading={compose.repositoriesLoading}
                error={compose.repositoriesError}
                onSelect={compose.selectRepository}
                onRetry={compose.retryRepositories}
              />

              <BranchSelector
                repository={compose.selectedRepository}
                branches={branches}
                selectedBranchName={selectedBranchName}
                loading={branchLoading}
                error={branchError}
                disabled={compose.selectedRepository === null}
                onSelect={compose.selectBranch}
                onRetry={compose.retryBranches}
              />

              <CommitList
                repository={compose.selectedRepository}
                branchName={selectedBranchName}
                commits={commits}
                selectedCommitShas={selectedCommitShas}
                loading={commitLoading}
                error={commitError}
                disabled={
                  compose.selectedRepository === null ||
                  selectedBranchName === null
                }
                onToggle={compose.toggleCommit}
                onRetry={compose.retryCommits}
              />
            </div>

            <DraftEditor
              draft={generatedDraft}
              repository={compose.selectedRepository}
              branchName={selectedBranchName}
              selectedCommits={compose.selectedCommits}
              loading={draftLoading}
              error={draftError}
              savedDraft={savedDraft}
              hasUnsavedChanges={hasUnsavedDraftChanges}
              saving={saveLoading}
              saveError={saveError}
              onGenerate={compose.generateDraft}
              onDraftChange={compose.updateDraftField}
              onSave={compose.saveDraft}
            />
          </>
        ) : null}

        {activeView === "drafts" ? (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <PostList
              posts={postLists.draftPosts}
              pagination={postLists.draftPostsPagination}
              selectedPostId={selectedPostId}
              loading={postLists.draftPostsLoading}
              error={postLists.draftPostsError}
              eyebrow="Draft posts"
              title="Edit saved drafts"
              description="Draft posts can be opened for editing, deletion, or publishing."
              emptyMessage="No draft posts yet. Create a new post and save it as a draft."
              onOpenPost={(post) => {
                postDetail.openPostDetail(post);
                setActiveView("drafts");
              }}
              onPageChange={postLists.requestDraftPostsPage}
              onRetry={() => postLists.reloadDraftPosts()}
            />

            <PostDetail
              post={selectedPost}
              loading={postDetailLoading}
              error={postDetailError}
              editDraft={postEditDraft}
              saving={postEditSaving}
              saveError={postEditError}
              deleteConfirming={postDeleteConfirming}
              deleting={postDeleting}
              deleteError={postDeleteError}
              statusUpdating={postStatusUpdating}
              statusError={postStatusError}
              onStartEdit={postDetail.startPostEdit}
              onEditChange={postDetail.updatePostEditField}
              onCancelEdit={postDetail.cancelPostEdit}
              onSaveEdit={postDetail.savePostEdit}
              onRequestDelete={postDetail.requestPostDelete}
              onCancelDelete={postDetail.cancelPostDelete}
              onConfirmDelete={postDetail.confirmPostDelete}
              onPublish={postDetail.publishPost}
              onRetry={postDetail.retryPostDetail}
              onClose={postDetail.closePostDetail}
            />
          </div>
        ) : null}
      </div>
    </main>
  );
}

export default App;
