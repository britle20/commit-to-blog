import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

import { CommitList } from "./components/CommitList";
import { DraftEditor } from "./components/DraftEditor";
import { BranchSelector } from "./components/BranchSelector";
import { PostDetail } from "./components/PostDetail";
import { PostList } from "./components/PostList";
import { RepositorySelector } from "./components/RepositorySelector";
import { getErrorMessage } from "./lib/api";
import { generateBlogDraft, type GeneratedDraft } from "./lib/blog";
import {
  createDraftPost,
  deletePost,
  fetchPost,
  fetchPosts,
  updatePost,
  type Post,
  type PostEditInput,
} from "./lib/posts";
import {
  fetchBranches,
  fetchCommits,
  fetchRepositories,
  type BranchSummary,
  type CommitSummary,
  type RepositorySummary,
} from "./lib/github";

function clearBranchState(
  setBranches: Dispatch<SetStateAction<BranchSummary[]>>,
  setSelectedBranchName: Dispatch<SetStateAction<string | null>>,
  setBranchError: Dispatch<SetStateAction<string | null>>,
  setBranchLoading: Dispatch<SetStateAction<boolean>>,
) {
  setBranches([]);
  setSelectedBranchName(null);
  setBranchError(null);
  setBranchLoading(false);
}

function clearCommitState(
  setCommits: Dispatch<SetStateAction<CommitSummary[]>>,
  setSelectedCommitShas: Dispatch<SetStateAction<string[]>>,
  setCommitError: Dispatch<SetStateAction<string | null>>,
  setCommitLoading: Dispatch<SetStateAction<boolean>>,
) {
  setCommits([]);
  setSelectedCommitShas([]);
  setCommitError(null);
  setCommitLoading(false);
}

function upsertPost(posts: Post[], nextPost: Post) {
  return [nextPost, ...posts.filter((post) => post.id !== nextPost.id)];
}

function App() {
  const [repositories, setRepositories] = useState<RepositorySummary[]>([]);
  const [selectedRepositoryId, setSelectedRepositoryId] = useState<number | null>(
    null,
  );
  const [branches, setBranches] = useState<BranchSummary[]>([]);
  const [selectedBranchName, setSelectedBranchName] = useState<string | null>(
    null,
  );
  const [commits, setCommits] = useState<CommitSummary[]>([]);
  const [selectedCommitShas, setSelectedCommitShas] = useState<string[]>([]);
  const [generatedDraft, setGeneratedDraft] = useState<GeneratedDraft | null>(
    null,
  );
  const [savedDraft, setSavedDraft] = useState<Post | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [postsReloadKey, setPostsReloadKey] = useState(0);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [postDetailReloadKey, setPostDetailReloadKey] = useState(0);
  const [postEditDraft, setPostEditDraft] = useState<PostEditInput | null>(
    null,
  );
  const [postDeleteConfirming, setPostDeleteConfirming] = useState(false);
  const [hasUnsavedDraftChanges, setHasUnsavedDraftChanges] = useState(false);
  const [loading, setLoading] = useState(true);
  const [branchLoading, setBranchLoading] = useState(false);
  const [commitLoading, setCommitLoading] = useState(false);
  const [draftLoading, setDraftLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [postsLoading, setPostsLoading] = useState(true);
  const [postDetailLoading, setPostDetailLoading] = useState(false);
  const [postEditSaving, setPostEditSaving] = useState(false);
  const [postDeleting, setPostDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [branchError, setBranchError] = useState<string | null>(null);
  const [commitError, setCommitError] = useState<string | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [postsError, setPostsError] = useState<string | null>(null);
  const [postDetailError, setPostDetailError] = useState<string | null>(null);
  const [postEditError, setPostEditError] = useState<string | null>(null);
  const [postDeleteError, setPostDeleteError] = useState<string | null>(null);
  const draftControllerRef = useRef<AbortController | null>(null);
  const saveControllerRef = useRef<AbortController | null>(null);
  const postEditControllerRef = useRef<AbortController | null>(null);
  const postDeleteControllerRef = useRef<AbortController | null>(null);

  const clearDraftState = useCallback(() => {
    draftControllerRef.current?.abort();
    saveControllerRef.current?.abort();
    draftControllerRef.current = null;
    saveControllerRef.current = null;
    setGeneratedDraft(null);
    setSavedDraft(null);
    setHasUnsavedDraftChanges(false);
    setDraftError(null);
    setSaveError(null);
    setDraftLoading(false);
    setSaveLoading(false);
  }, []);

  useEffect(() => {
    return () => {
      draftControllerRef.current?.abort();
      saveControllerRef.current?.abort();
      postEditControllerRef.current?.abort();
      postDeleteControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    void fetchPosts(controller.signal)
      .then((items) => {
        if (!controller.signal.aborted) {
          setPosts(items);
          setSelectedPost((currentPost) => {
            if (currentPost === null) {
              return currentPost;
            }

            return (
              items.find((post) => post.id === currentPost.id) ?? currentPost
            );
          });
        }
      })
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) {
          setPostsError(
            getErrorMessage(requestError, "Failed to load saved posts."),
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setPostsLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [postsReloadKey]);

  useEffect(() => {
    if (selectedPostId === null) {
      return;
    }

    const controller = new AbortController();

    void fetchPost(selectedPostId, controller.signal)
      .then((post) => {
        if (!controller.signal.aborted) {
          setSelectedPost(post);
          setPosts((currentPosts) => upsertPost(currentPosts, post));
          setPostDetailError(null);
        }
      })
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) {
          setPostDetailError(
            getErrorMessage(requestError, "Failed to load post details."),
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setPostDetailLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [postDetailReloadKey, selectedPostId]);

  useEffect(() => {
    const controller = new AbortController();

    void fetchRepositories(controller.signal)
      .then((items) => {
        if (controller.signal.aborted) {
          return;
        }

        setRepositories(items);
        const nextRepository = items[0] ?? null;

        setSelectedRepositoryId(nextRepository?.id ?? null);
        clearCommitState(
          setCommits,
          setSelectedCommitShas,
          setCommitError,
          setCommitLoading,
        );
        clearDraftState();

        if (nextRepository !== null) {
          clearBranchState(
            setBranches,
            setSelectedBranchName,
            setBranchError,
            setBranchLoading,
          );
          setBranchLoading(true);
        }
      })
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) {
          setError(
            getErrorMessage(requestError, "Failed to load repositories."),
          );
          setRepositories([]);
          setSelectedRepositoryId(null);
          clearBranchState(
            setBranches,
            setSelectedBranchName,
            setBranchError,
            setBranchLoading,
          );
          clearCommitState(
            setCommits,
            setSelectedCommitShas,
            setCommitError,
            setCommitLoading,
          );
          clearDraftState();
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [clearDraftState]);

  const selectedRepository = useMemo(
    () =>
      repositories.find((repository) => repository.id === selectedRepositoryId) ??
      null,
    [repositories, selectedRepositoryId],
  );

  const selectedBranch = useMemo(
    () =>
      branches.find((branch) => branch.name === selectedBranchName) ?? null,
    [branches, selectedBranchName],
  );

  const selectedCommits = useMemo(
    () => commits.filter((commit) => selectedCommitShas.includes(commit.sha)),
    [commits, selectedCommitShas],
  );

  function toggleCommit(commit: CommitSummary) {
    clearDraftState();
    setSelectedCommitShas((currentSelection) =>
      currentSelection.includes(commit.sha)
        ? currentSelection.filter((sha) => sha !== commit.sha)
        : [...currentSelection, commit.sha],
    );
  }

  function updateDraftField(field: keyof GeneratedDraft, value: string) {
    setGeneratedDraft((currentDraft) =>
      currentDraft === null
        ? currentDraft
        : {
            ...currentDraft,
            [field]: value,
          },
    );
    setHasUnsavedDraftChanges(true);
    setSaveError(null);
  }

  useEffect(() => {
    if (selectedRepository === null || !branchLoading) {
      return;
    }

    const controller = new AbortController();

    void fetchBranches(
      selectedRepository.owner,
      selectedRepository.name,
      controller.signal,
    )
      .then((items) => {
        if (controller.signal.aborted) {
          return;
        }

        setBranches(items);
        setBranchError(null);
        setSelectedBranchName((currentSelection) => {
          const nextBranchName = items.some(
            (branch) => branch.name === selectedRepository.defaultBranch,
          )
            ? selectedRepository.defaultBranch
            : items[0]?.name ?? null;

          if (
            currentSelection !== null &&
            items.some((item) => item.name === currentSelection)
          ) {
            return currentSelection;
          }

          return nextBranchName;
        });
        clearCommitState(
          setCommits,
          setSelectedCommitShas,
          setCommitError,
          setCommitLoading,
        );
        clearDraftState();
        setCommitLoading(items.length > 0);
      })
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) {
          setBranchError(
            getErrorMessage(requestError, "Failed to load branches."),
          );
          setBranches([]);
          setSelectedBranchName(null);
          clearCommitState(
            setCommits,
            setSelectedCommitShas,
            setCommitError,
            setCommitLoading,
          );
          clearDraftState();
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setBranchLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [branchLoading, clearDraftState, selectedRepository]);

  useEffect(() => {
    if (
      selectedRepository === null ||
      selectedBranchName === null ||
      !commitLoading
    ) {
      return;
    }

    const controller = new AbortController();

    void fetchCommits(
      selectedRepository.owner,
      selectedRepository.name,
      selectedBranchName,
      controller.signal,
    )
      .then((items) => {
        if (controller.signal.aborted) {
          return;
        }

        setCommits(items);
        setCommitError(null);
      })
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) {
          setCommitError(
            getErrorMessage(requestError, "Failed to load commits."),
          );
          setCommits([]);
          setSelectedCommitShas([]);
          clearDraftState();
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setCommitLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [clearDraftState, commitLoading, selectedBranchName, selectedRepository]);

  function handleGenerateDraft() {
    if (
      selectedRepository === null ||
      selectedBranchName === null ||
      selectedCommits.length === 0 ||
      draftLoading ||
      saveLoading ||
      draftControllerRef.current !== null ||
      saveControllerRef.current !== null
    ) {
      return;
    }

    setDraftLoading(true);
    setDraftError(null);
    setGeneratedDraft(null);
    setSavedDraft(null);
    setHasUnsavedDraftChanges(false);
    setSaveError(null);

    const controller = new AbortController();
    draftControllerRef.current = controller;

    void generateBlogDraft(
      {
        repository: {
          owner: selectedRepository.owner,
          name: selectedRepository.name,
          fullName: selectedRepository.fullName,
        },
        branch: selectedBranchName,
        commits: selectedCommits,
      },
      controller.signal,
    )
      .then((draft) => {
        if (!controller.signal.aborted) {
          setGeneratedDraft(draft);
          setSavedDraft(null);
          setHasUnsavedDraftChanges(true);
          setSaveError(null);
        }
      })
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) {
          setDraftError(
            getErrorMessage(requestError, "Failed to generate draft."),
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setDraftLoading(false);
          draftControllerRef.current = null;
        }
      });
  }

  function handleSaveDraft() {
    if (
      selectedRepository === null ||
      selectedBranchName === null ||
      selectedCommits.length === 0 ||
      generatedDraft === null ||
      draftLoading ||
      saveLoading ||
      draftControllerRef.current !== null ||
      saveControllerRef.current !== null
    ) {
      return;
    }

    setSaveLoading(true);
    setSaveError(null);

    const controller = new AbortController();
    saveControllerRef.current = controller;
    const targetDraftId = savedDraft?.id ?? null;

    const saveRequest =
      targetDraftId === null
        ? createDraftPost(
            {
              title: generatedDraft.title,
              summary: generatedDraft.summary,
              content: generatedDraft.content,
              repository: {
                owner: selectedRepository.owner,
                name: selectedRepository.name,
                fullName: selectedRepository.fullName,
              },
              branch: selectedBranchName,
              commits: selectedCommits,
            },
            controller.signal,
          )
        : updatePost(
            targetDraftId,
            {
              title: generatedDraft.title,
              summary: generatedDraft.summary,
              content: generatedDraft.content,
            },
            controller.signal,
          );

    void saveRequest
      .then((post) => {
        if (!controller.signal.aborted) {
          setSavedDraft(post);
          setGeneratedDraft({
            title: post.title,
            summary: post.summary,
            content: post.content,
          });
          setPosts((currentPosts) => upsertPost(currentPosts, post));
          setSelectedPost((currentPost) =>
            currentPost?.id === post.id ? post : currentPost,
          );
          setPostsError(null);
          setHasUnsavedDraftChanges(false);
        }
      })
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) {
          setSaveError(
            getErrorMessage(
              requestError,
              targetDraftId === null
                ? "Failed to save draft."
                : "Failed to update draft.",
            ),
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setSaveLoading(false);
          saveControllerRef.current = null;
        }
      });
  }

  function openPostDetail(post: Post) {
    postEditControllerRef.current?.abort();
    postEditControllerRef.current = null;
    postDeleteControllerRef.current?.abort();
    postDeleteControllerRef.current = null;
    setSelectedPostId(post.id);
    setSelectedPost(post);
    setPostDetailLoading(true);
    setPostDetailError(null);
    setPostEditDraft(null);
    setPostEditSaving(false);
    setPostEditError(null);
    setPostDeleteConfirming(false);
    setPostDeleting(false);
    setPostDeleteError(null);
    setPostDetailReloadKey((currentKey) => currentKey + 1);
  }

  function retryPostDetail() {
    if (selectedPostId === null) {
      return;
    }

    setPostDetailLoading(true);
    setPostDetailError(null);
    setPostDetailReloadKey((currentKey) => currentKey + 1);
  }

  function closePostDetail() {
    postEditControllerRef.current?.abort();
    postEditControllerRef.current = null;
    postDeleteControllerRef.current?.abort();
    postDeleteControllerRef.current = null;
    setSelectedPostId(null);
    setSelectedPost(null);
    setPostDetailLoading(false);
    setPostDetailError(null);
    setPostEditDraft(null);
    setPostEditSaving(false);
    setPostEditError(null);
    setPostDeleteConfirming(false);
    setPostDeleting(false);
    setPostDeleteError(null);
  }

  function startPostEdit() {
    if (selectedPost === null || postEditSaving || postDeleting) {
      return;
    }

    setPostEditDraft({
      title: selectedPost.title,
      summary: selectedPost.summary,
      content: selectedPost.content,
    });
    setPostEditError(null);
    setPostDeleteConfirming(false);
    setPostDeleteError(null);
  }

  function updatePostEditField(field: keyof PostEditInput, value: string) {
    setPostEditDraft((currentDraft) =>
      currentDraft === null
        ? currentDraft
        : {
            ...currentDraft,
            [field]: value,
          },
    );
    setPostEditError(null);
  }

  function cancelPostEdit() {
    if (postEditSaving || postDeleting) {
      return;
    }

    setPostEditDraft(null);
    setPostEditError(null);
  }

  function savePostEdit() {
    if (
      selectedPost === null ||
      postEditDraft === null ||
      postEditSaving ||
      postDeleting ||
      postEditDraft.title.trim() === "" ||
      postEditDraft.summary.trim() === "" ||
      postEditDraft.content.trim() === ""
    ) {
      return;
    }

    setPostEditSaving(true);
    setPostEditError(null);

    const controller = new AbortController();
    postEditControllerRef.current = controller;

    void updatePost(selectedPost.id, postEditDraft, controller.signal)
      .then((post) => {
        if (!controller.signal.aborted) {
          setSelectedPost(post);
          setPosts((currentPosts) => upsertPost(currentPosts, post));
          setSavedDraft((currentDraft) =>
            currentDraft?.id === post.id ? post : currentDraft,
          );
          setPostDetailError(null);

          if (savedDraft?.id === post.id && !hasUnsavedDraftChanges) {
            setGeneratedDraft({
              title: post.title,
              summary: post.summary,
              content: post.content,
            });
          }

          setPostEditDraft(null);
          setPostEditError(null);
        }
      })
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) {
          setPostEditError(
            getErrorMessage(requestError, "Failed to update post."),
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setPostEditSaving(false);
          postEditControllerRef.current = null;
        }
      });
  }

  function requestPostDelete() {
    if (selectedPost === null || postEditSaving || postDeleting) {
      return;
    }

    setPostEditDraft(null);
    setPostEditError(null);
    setPostDeleteConfirming(true);
    setPostDeleteError(null);
  }

  function cancelPostDelete() {
    if (postDeleting) {
      return;
    }

    setPostDeleteConfirming(false);
    setPostDeleteError(null);
  }

  function confirmPostDelete() {
    if (selectedPost === null || postDeleting || postEditSaving) {
      return;
    }

    setPostDeleting(true);
    setPostDeleteError(null);

    const targetPostId = selectedPost.id;
    const deletedCurrentDraft = savedDraft?.id === targetPostId;
    const controller = new AbortController();
    postDeleteControllerRef.current = controller;

    void deletePost(targetPostId, controller.signal)
      .then(() => {
        if (!controller.signal.aborted) {
          setPosts((currentPosts) =>
            currentPosts.filter((post) => post.id !== targetPostId),
          );
          setSelectedPostId(null);
          setSelectedPost(null);
          setPostDetailLoading(false);
          setPostDetailError(null);
          setPostEditDraft(null);
          setPostEditSaving(false);
          setPostEditError(null);
          setPostDeleteConfirming(false);
          setPostDeleteError(null);

          setSavedDraft((currentDraft) =>
            currentDraft?.id === targetPostId ? null : currentDraft,
          );

          if (deletedCurrentDraft && generatedDraft !== null) {
            setHasUnsavedDraftChanges(true);
          }
        }
      })
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) {
          setPostDeleteError(
            getErrorMessage(requestError, "Failed to delete post."),
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setPostDeleting(false);
          postDeleteControllerRef.current = null;
        }
      });
  }

  return (
    <main className="min-h-screen bg-background text-primary">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-6 md:py-8">
        <header className="rounded-lg border border-default bg-surface px-6 py-5 text-left shadow-elevated">
          <p className="text-sm font-medium uppercase tracking-wide text-muted">
            Commit to Blog
          </p>
          <h1 className="mt-2 text-2xl font-semibold">
            Select a repository to start a blog draft
          </h1>
          <p className="mt-3 max-w-3xl text-sm text-secondary">
            Choose the GitHub repository that contains the work you want to turn
            into a development blog post. Branch and commit selection comes next.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
          <RepositorySelector
            repositories={repositories}
            selectedRepositoryId={selectedRepositoryId}
            loading={loading}
            error={error}
            onSelect={(repository) => {
              setSelectedRepositoryId(repository.id);
              clearBranchState(
                setBranches,
                setSelectedBranchName,
                setBranchError,
                setBranchLoading,
              );
              clearCommitState(
                setCommits,
                setSelectedCommitShas,
                setCommitError,
                setCommitLoading,
              );
              clearDraftState();
              setBranchLoading(true);
            }}
            onRetry={() => {
              setLoading(true);
              setError(null);
              clearDraftState();

              void fetchRepositories()
                .then((items) => {
                  setRepositories(items);
                  const nextRepository = items[0] ?? null;

                  setSelectedRepositoryId(nextRepository?.id ?? null);
                  clearCommitState(
                    setCommits,
                    setSelectedCommitShas,
                    setCommitError,
                    setCommitLoading,
                  );
                  clearDraftState();

                  if (nextRepository !== null) {
                    clearBranchState(
                      setBranches,
                      setSelectedBranchName,
                      setBranchError,
                      setBranchLoading,
                    );
                    setBranchLoading(true);
                  } else {
                    clearBranchState(
                      setBranches,
                      setSelectedBranchName,
                      setBranchError,
                      setBranchLoading,
                    );
                  }
                })
                .catch((requestError: unknown) => {
                  setError(
                    getErrorMessage(
                      requestError,
                      "Failed to load repositories.",
                    ),
                  );
                  setRepositories([]);
                  setSelectedRepositoryId(null);
                  clearBranchState(
                    setBranches,
                    setSelectedBranchName,
                    setBranchError,
                    setBranchLoading,
                  );
                  clearCommitState(
                    setCommits,
                    setSelectedCommitShas,
                    setCommitError,
                    setCommitLoading,
                  );
                  clearDraftState();
                })
                .finally(() => {
                  setLoading(false);
                });
            }}
          />

          <div className="flex flex-col gap-6">
            <aside className="rounded-lg border border-default bg-surface p-6 text-left shadow-elevated">
              <p className="text-sm font-medium uppercase tracking-wide text-muted">
                Current selection
              </p>

              {selectedRepository ? (
                <div className="mt-4 space-y-4">
                  <div>
                    <h2 className="text-xl font-semibold">
                      {selectedRepository.name}
                    </h2>
                    <p className="mt-1 text-sm text-secondary">
                      {selectedRepository.fullName}
                    </p>
                  </div>

                  <dl className="grid gap-3 text-sm">
                    <div className="rounded-lg bg-surface-muted px-4 py-3">
                      <dt className="text-muted">Owner</dt>
                      <dd className="mt-1 text-primary">
                        {selectedRepository.owner}
                      </dd>
                    </div>
                    <div className="rounded-lg bg-surface-muted px-4 py-3">
                      <dt className="text-muted">Default branch</dt>
                      <dd className="mt-1 text-primary">
                        {selectedRepository.defaultBranch}
                      </dd>
                    </div>
                    <div className="rounded-lg bg-surface-muted px-4 py-3">
                      <dt className="text-muted">Visibility</dt>
                      <dd className="mt-1 text-primary">
                        {selectedRepository.private ? "Private" : "Public"}
                      </dd>
                    </div>
                    <div className="rounded-lg bg-surface-muted px-4 py-3">
                      <dt className="text-muted">Selected branch</dt>
                      <dd className="mt-1 text-primary">
                        {selectedBranch?.name ?? "None"}
                      </dd>
                    </div>
                    <div className="rounded-lg bg-surface-muted px-4 py-3">
                      <dt className="text-muted">Selected commits</dt>
                      <dd className="mt-1 text-primary">
                        {selectedCommitShas.length}
                      </dd>
                    </div>
                  </dl>

                  <a
                    href={selectedRepository.htmlUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex rounded-md bg-action-secondary px-3 py-2 text-sm font-medium text-action-secondary-text hover:bg-action-secondary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                  >
                    Open on GitHub
                  </a>
                </div>
              ) : (
                <p className="mt-4 text-sm text-secondary">
                  Select a repository to see its details here.
                </p>
              )}

              <div className="mt-6 rounded-lg border border-border-muted bg-surface-muted px-4 py-3 text-sm text-secondary">
                Branch and commit selection will unlock after a repository is chosen.
              </div>
            </aside>

            <BranchSelector
              repository={selectedRepository}
              branches={branches}
              selectedBranchName={selectedBranchName}
              loading={branchLoading}
              error={branchError}
              disabled={selectedRepository === null}
              onSelect={(branch) => {
                setSelectedBranchName(branch.name);
                clearCommitState(
                  setCommits,
                  setSelectedCommitShas,
                  setCommitError,
                  setCommitLoading,
                );
                clearDraftState();
                setCommitLoading(true);
              }}
              onRetry={() => {
                if (selectedRepository === null) {
                  return;
                }

                setBranchLoading(true);
                setBranchError(null);
                clearCommitState(
                  setCommits,
                  setSelectedCommitShas,
                  setCommitError,
                  setCommitLoading,
                );
                clearDraftState();
              }}
            />

            <CommitList
              repository={selectedRepository}
              branchName={selectedBranchName}
              commits={commits}
              selectedCommitShas={selectedCommitShas}
              loading={commitLoading}
              error={commitError}
              disabled={selectedRepository === null || selectedBranchName === null}
              onToggle={toggleCommit}
              onRetry={() => {
                if (selectedRepository === null || selectedBranchName === null) {
                  return;
                }

                setCommitLoading(true);
                setCommitError(null);
                clearDraftState();
              }}
            />
          </div>
        </div>

        <DraftEditor
          draft={generatedDraft}
          repository={selectedRepository}
          branchName={selectedBranchName}
          selectedCommits={selectedCommits}
          loading={draftLoading}
          error={draftError}
          savedDraft={savedDraft}
          hasUnsavedChanges={hasUnsavedDraftChanges}
          saving={saveLoading}
          saveError={saveError}
          onGenerate={handleGenerateDraft}
          onDraftChange={updateDraftField}
          onSave={handleSaveDraft}
        />

        <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <PostList
            posts={posts}
            selectedPostId={selectedPostId}
            loading={postsLoading}
            error={postsError}
            onOpenPost={openPostDetail}
            onRetry={() => {
              setPostsLoading(true);
              setPostsError(null);
              setPostsReloadKey((currentKey) => currentKey + 1);
            }}
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
            onStartEdit={startPostEdit}
            onEditChange={updatePostEditField}
            onCancelEdit={cancelPostEdit}
            onSaveEdit={savePostEdit}
            onRequestDelete={requestPostDelete}
            onCancelDelete={cancelPostDelete}
            onConfirmDelete={confirmPostDelete}
            onRetry={retryPostDetail}
            onClose={closePostDetail}
          />
        </div>
      </div>
    </main>
  );
}

export default App;
