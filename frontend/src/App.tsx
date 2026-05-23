import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";

import { CommitList } from "./components/CommitList";
import { DraftEditor } from "./components/DraftEditor";
import { BranchSelector } from "./components/BranchSelector";
import { PostDetail } from "./components/PostDetail";
import { PostList } from "./components/PostList";
import { PublishedPostList } from "./components/PublishedPostList";
import { RepositorySelector } from "./components/RepositorySelector";
import { getErrorMessage } from "./lib/api";
import { generateBlogDraft, type GeneratedDraft } from "./lib/blog";
import {
  createDraftPost,
  deletePost,
  fetchPost,
  fetchPosts,
  fetchPublishedPosts,
  updatePost,
  updatePostStatus,
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

function upsertPost(posts: Post[], nextPost: Post) {
  return [nextPost, ...posts.filter((post) => post.id !== nextPost.id)];
}

function syncPublishedPost(posts: Post[], nextPost: Post) {
  return nextPost.status === "published"
    ? upsertPost(posts, nextPost)
    : posts.filter((post) => post.id !== nextPost.id);
}

type AppView = "published" | "compose" | "drafts";

type ComposeState = {
  selectedRepositoryId: number | null;
  branches: BranchSummary[];
  selectedBranchName: string | null;
  commits: CommitSummary[];
  selectedCommitShas: string[];
  generatedDraft: GeneratedDraft | null;
  savedDraft: Post | null;
  hasUnsavedDraftChanges: boolean;
  branchLoading: boolean;
  commitLoading: boolean;
  draftLoading: boolean;
  saveLoading: boolean;
  branchError: string | null;
  commitError: string | null;
  draftError: string | null;
  saveError: string | null;
};

type ComposeAction =
  | { type: "REPOSITORIES_LOADED"; repositoryId: number | null }
  | { type: "REPOSITORIES_FAILED" }
  | { type: "SELECT_REPOSITORY"; repositoryId: number }
  | {
      type: "BRANCHES_LOADED";
      branches: BranchSummary[];
      defaultBranchName: string;
    }
  | { type: "BRANCHES_FAILED"; error: string }
  | { type: "SELECT_BRANCH"; branchName: string }
  | { type: "RETRY_BRANCHES" }
  | { type: "COMMITS_LOADED"; commits: CommitSummary[] }
  | { type: "COMMITS_FAILED"; error: string }
  | { type: "RETRY_COMMITS" }
  | { type: "TOGGLE_COMMIT"; commitSha: string }
  | { type: "CLEAR_DRAFT" }
  | { type: "START_DRAFT_GENERATION" }
  | { type: "DRAFT_GENERATED"; draft: GeneratedDraft }
  | { type: "DRAFT_GENERATION_FAILED"; error: string }
  | { type: "UPDATE_DRAFT_FIELD"; field: keyof GeneratedDraft; value: string }
  | { type: "START_SAVE_DRAFT" }
  | { type: "DRAFT_SAVED"; post: Post }
  | { type: "SAVE_DRAFT_FAILED"; error: string }
  | { type: "SYNC_POST_EDIT"; post: Post }
  | { type: "SYNC_SAVED_DRAFT"; post: Post }
  | { type: "SYNC_DELETED_POST"; postId: string };

const initialComposeState: ComposeState = {
  selectedRepositoryId: null,
  branches: [],
  selectedBranchName: null,
  commits: [],
  selectedCommitShas: [],
  generatedDraft: null,
  savedDraft: null,
  hasUnsavedDraftChanges: false,
  branchLoading: false,
  commitLoading: false,
  draftLoading: false,
  saveLoading: false,
  branchError: null,
  commitError: null,
  draftError: null,
  saveError: null,
};

function clearDraftFields(state: ComposeState): ComposeState {
  return {
    ...state,
    generatedDraft: null,
    savedDraft: null,
    hasUnsavedDraftChanges: false,
    draftError: null,
    saveError: null,
    draftLoading: false,
    saveLoading: false,
  };
}

function toggleCommitSha(selectedCommitShas: string[], commitSha: string) {
  return selectedCommitShas.includes(commitSha)
    ? selectedCommitShas.filter((sha) => sha !== commitSha)
    : [...selectedCommitShas, commitSha];
}

function composeReducer(
  state: ComposeState,
  action: ComposeAction,
): ComposeState {
  switch (action.type) {
    case "REPOSITORIES_LOADED":
      return clearDraftFields({
        ...state,
        selectedRepositoryId: action.repositoryId,
        branches: [],
        selectedBranchName: null,
        commits: [],
        selectedCommitShas: [],
        branchError: null,
        commitError: null,
        branchLoading: action.repositoryId !== null,
        commitLoading: false,
      });

    case "REPOSITORIES_FAILED":
      return clearDraftFields({
        ...state,
        selectedRepositoryId: null,
        branches: [],
        selectedBranchName: null,
        commits: [],
        selectedCommitShas: [],
        branchError: null,
        commitError: null,
        branchLoading: false,
        commitLoading: false,
      });

    case "SELECT_REPOSITORY":
      return clearDraftFields({
        ...state,
        selectedRepositoryId: action.repositoryId,
        branches: [],
        selectedBranchName: null,
        commits: [],
        selectedCommitShas: [],
        branchError: null,
        commitError: null,
        branchLoading: true,
        commitLoading: false,
      });

    case "BRANCHES_LOADED": {
      const nextBranchName = action.branches.some(
        (branch) => branch.name === action.defaultBranchName,
      )
        ? action.defaultBranchName
        : action.branches[0]?.name ?? null;
      const selectedBranchName =
        state.selectedBranchName !== null &&
        action.branches.some((branch) => branch.name === state.selectedBranchName)
          ? state.selectedBranchName
          : nextBranchName;

      return clearDraftFields({
        ...state,
        branches: action.branches,
        selectedBranchName,
        commits: [],
        selectedCommitShas: [],
        branchError: null,
        commitError: null,
        branchLoading: false,
        commitLoading: action.branches.length > 0,
      });
    }

    case "BRANCHES_FAILED":
      return clearDraftFields({
        ...state,
        branches: [],
        selectedBranchName: null,
        commits: [],
        selectedCommitShas: [],
        branchError: action.error,
        commitError: null,
        branchLoading: false,
        commitLoading: false,
      });

    case "SELECT_BRANCH":
      return clearDraftFields({
        ...state,
        selectedBranchName: action.branchName,
        commits: [],
        selectedCommitShas: [],
        commitError: null,
        commitLoading: true,
      });

    case "RETRY_BRANCHES":
      return clearDraftFields({
        ...state,
        commits: [],
        selectedCommitShas: [],
        branchError: null,
        commitError: null,
        branchLoading: true,
        commitLoading: false,
      });

    case "COMMITS_LOADED":
      return {
        ...state,
        commits: action.commits,
        commitError: null,
        commitLoading: false,
      };

    case "COMMITS_FAILED":
      return clearDraftFields({
        ...state,
        commits: [],
        selectedCommitShas: [],
        commitError: action.error,
        commitLoading: false,
      });

    case "RETRY_COMMITS":
      return clearDraftFields({
        ...state,
        commitError: null,
        commitLoading: true,
      });

    case "TOGGLE_COMMIT":
      return clearDraftFields({
        ...state,
        selectedCommitShas: toggleCommitSha(
          state.selectedCommitShas,
          action.commitSha,
        ),
      });

    case "CLEAR_DRAFT":
      return clearDraftFields(state);

    case "START_DRAFT_GENERATION":
      return {
        ...state,
        draftLoading: true,
        draftError: null,
        generatedDraft: null,
        savedDraft: null,
        hasUnsavedDraftChanges: false,
        saveError: null,
      };

    case "DRAFT_GENERATED":
      return {
        ...state,
        generatedDraft: action.draft,
        savedDraft: null,
        hasUnsavedDraftChanges: true,
        draftLoading: false,
        saveError: null,
      };

    case "DRAFT_GENERATION_FAILED":
      return {
        ...state,
        draftError: action.error,
        draftLoading: false,
      };

    case "UPDATE_DRAFT_FIELD":
      return {
        ...state,
        generatedDraft:
          state.generatedDraft === null
            ? state.generatedDraft
            : {
                ...state.generatedDraft,
                [action.field]: action.value,
              },
        hasUnsavedDraftChanges: true,
        saveError: null,
      };

    case "START_SAVE_DRAFT":
      return {
        ...state,
        saveLoading: true,
        saveError: null,
      };

    case "DRAFT_SAVED":
      return {
        ...state,
        savedDraft: action.post,
        generatedDraft: {
          title: action.post.title,
          summary: action.post.summary,
          content: action.post.content,
        },
        hasUnsavedDraftChanges: false,
        saveLoading: false,
      };

    case "SAVE_DRAFT_FAILED":
      return {
        ...state,
        saveError: action.error,
        saveLoading: false,
      };

    case "SYNC_POST_EDIT": {
      const matchesSavedDraft = state.savedDraft?.id === action.post.id;

      return {
        ...state,
        savedDraft: matchesSavedDraft ? action.post : state.savedDraft,
        generatedDraft:
          matchesSavedDraft && !state.hasUnsavedDraftChanges
            ? {
                title: action.post.title,
                summary: action.post.summary,
                content: action.post.content,
              }
            : state.generatedDraft,
      };
    }

    case "SYNC_SAVED_DRAFT":
      return {
        ...state,
        savedDraft:
          state.savedDraft?.id === action.post.id ? action.post : state.savedDraft,
      };

    case "SYNC_DELETED_POST": {
      const deletedSavedDraft = state.savedDraft?.id === action.postId;

      return {
        ...state,
        savedDraft: deletedSavedDraft ? null : state.savedDraft,
        hasUnsavedDraftChanges:
          deletedSavedDraft && state.generatedDraft !== null
            ? true
            : state.hasUnsavedDraftChanges,
      };
    }

    default:
      return state;
  }
}

function App() {
  const [activeView, setActiveView] = useState<AppView>("published");
  const [repositories, setRepositories] = useState<RepositorySummary[]>([]);
  const [composeState, composeDispatch] = useReducer(
    composeReducer,
    initialComposeState,
  );
  const [posts, setPosts] = useState<Post[]>([]);
  const [postsReloadKey, setPostsReloadKey] = useState(0);
  const [publishedPosts, setPublishedPosts] = useState<Post[]>([]);
  const [publishedPostsReloadKey, setPublishedPostsReloadKey] = useState(0);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [postDetailReloadKey, setPostDetailReloadKey] = useState(0);
  const [postEditDraft, setPostEditDraft] = useState<PostEditInput | null>(
    null,
  );
  const [postDeleteConfirming, setPostDeleteConfirming] = useState(false);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(true);
  const [publishedPostsLoading, setPublishedPostsLoading] = useState(true);
  const [postDetailLoading, setPostDetailLoading] = useState(false);
  const [postEditSaving, setPostEditSaving] = useState(false);
  const [postDeleting, setPostDeleting] = useState(false);
  const [postStatusUpdating, setPostStatusUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [postsError, setPostsError] = useState<string | null>(null);
  const [publishedPostsError, setPublishedPostsError] = useState<string | null>(
    null,
  );
  const [postDetailError, setPostDetailError] = useState<string | null>(null);
  const [postEditError, setPostEditError] = useState<string | null>(null);
  const [postDeleteError, setPostDeleteError] = useState<string | null>(null);
  const [postStatusError, setPostStatusError] = useState<string | null>(null);
  const draftControllerRef = useRef<AbortController | null>(null);
  const saveControllerRef = useRef<AbortController | null>(null);
  const postEditControllerRef = useRef<AbortController | null>(null);
  const postDeleteControllerRef = useRef<AbortController | null>(null);
  const postStatusControllerRef = useRef<AbortController | null>(null);
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
  } = composeState;

  const abortDraftRequests = useCallback(() => {
    draftControllerRef.current?.abort();
    saveControllerRef.current?.abort();
    draftControllerRef.current = null;
    saveControllerRef.current = null;
  }, []);

  const clearDraftState = useCallback(() => {
    abortDraftRequests();
    composeDispatch({ type: "CLEAR_DRAFT" });
  }, [abortDraftRequests]);

  useEffect(() => {
    return () => {
      draftControllerRef.current?.abort();
      saveControllerRef.current?.abort();
      postEditControllerRef.current?.abort();
      postDeleteControllerRef.current?.abort();
      postStatusControllerRef.current?.abort();
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
    const controller = new AbortController();

    void fetchPublishedPosts(controller.signal)
      .then((items) => {
        if (!controller.signal.aborted) {
          setPublishedPosts(items);
        }
      })
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) {
          setPublishedPostsError(
            getErrorMessage(requestError, "Failed to load published posts."),
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setPublishedPostsLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [publishedPostsReloadKey]);

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
          setPublishedPosts((currentPosts) =>
            syncPublishedPost(currentPosts, post),
          );
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

        abortDraftRequests();
        composeDispatch({
          type: "REPOSITORIES_LOADED",
          repositoryId: nextRepository?.id ?? null,
        });
      })
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) {
          setError(
            getErrorMessage(requestError, "Failed to load repositories."),
          );
          setRepositories([]);
          abortDraftRequests();
          composeDispatch({ type: "REPOSITORIES_FAILED" });
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
  }, [abortDraftRequests]);

  const selectedRepository = useMemo(
    () =>
      repositories.find((repository) => repository.id === selectedRepositoryId) ??
      null,
    [repositories, selectedRepositoryId],
  );

  const selectedCommits = useMemo(
    () => commits.filter((commit) => selectedCommitShas.includes(commit.sha)),
    [commits, selectedCommitShas],
  );

  const draftPosts = useMemo(
    () => posts.filter((post) => post.status === "draft"),
    [posts],
  );

  function toggleCommit(commit: CommitSummary) {
    abortDraftRequests();
    composeDispatch({ type: "TOGGLE_COMMIT", commitSha: commit.sha });
  }

  function updateDraftField(field: keyof GeneratedDraft, value: string) {
    composeDispatch({ type: "UPDATE_DRAFT_FIELD", field, value });
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

        abortDraftRequests();
        composeDispatch({
          type: "BRANCHES_LOADED",
          branches: items,
          defaultBranchName: selectedRepository.defaultBranch,
        });
      })
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) {
          abortDraftRequests();
          composeDispatch({
            type: "BRANCHES_FAILED",
            error: getErrorMessage(requestError, "Failed to load branches."),
          });
        }
      });

    return () => {
      controller.abort();
    };
  }, [abortDraftRequests, branchLoading, selectedRepository]);

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

        composeDispatch({ type: "COMMITS_LOADED", commits: items });
      })
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) {
          abortDraftRequests();
          composeDispatch({
            type: "COMMITS_FAILED",
            error: getErrorMessage(requestError, "Failed to load commits."),
          });
        }
      });

    return () => {
      controller.abort();
    };
  }, [abortDraftRequests, commitLoading, selectedBranchName, selectedRepository]);

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

    composeDispatch({ type: "START_DRAFT_GENERATION" });

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
          composeDispatch({ type: "DRAFT_GENERATED", draft });
        }
      })
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) {
          composeDispatch({
            type: "DRAFT_GENERATION_FAILED",
            error: getErrorMessage(requestError, "Failed to generate draft."),
          });
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
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

    composeDispatch({ type: "START_SAVE_DRAFT" });

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
          composeDispatch({ type: "DRAFT_SAVED", post });
          setPosts((currentPosts) => upsertPost(currentPosts, post));
          setPublishedPosts((currentPosts) =>
            syncPublishedPost(currentPosts, post),
          );
          setSelectedPost((currentPost) =>
            currentPost?.id === post.id ? post : currentPost,
          );
          setPostsError(null);
        }
      })
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) {
          composeDispatch({
            type: "SAVE_DRAFT_FAILED",
            error: getErrorMessage(
              requestError,
              targetDraftId === null
                ? "Failed to save draft."
                : "Failed to update draft.",
            ),
          });
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          saveControllerRef.current = null;
        }
      });
  }

  function openPostDetail(post: Post) {
    postEditControllerRef.current?.abort();
    postEditControllerRef.current = null;
    postDeleteControllerRef.current?.abort();
    postDeleteControllerRef.current = null;
    postStatusControllerRef.current?.abort();
    postStatusControllerRef.current = null;
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
    setPostStatusUpdating(false);
    setPostStatusError(null);
    setPostDetailReloadKey((currentKey) => currentKey + 1);
    setActiveView("drafts");
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
    postStatusControllerRef.current?.abort();
    postStatusControllerRef.current = null;
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
    setPostStatusUpdating(false);
    setPostStatusError(null);
  }

  function startPostEdit() {
    if (
      selectedPost === null ||
      postEditSaving ||
      postDeleting ||
      postStatusUpdating
    ) {
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
    setPostStatusError(null);
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
    if (postEditSaving || postDeleting || postStatusUpdating) {
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
      postStatusUpdating ||
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
          setPublishedPosts((currentPosts) =>
            syncPublishedPost(currentPosts, post),
          );
          composeDispatch({ type: "SYNC_POST_EDIT", post });
          setPostDetailError(null);

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
    if (
      selectedPost === null ||
      postEditSaving ||
      postDeleting ||
      postStatusUpdating
    ) {
      return;
    }

    setPostEditDraft(null);
    setPostEditError(null);
    setPostDeleteConfirming(true);
    setPostDeleteError(null);
    setPostStatusError(null);
  }

  function cancelPostDelete() {
    if (postDeleting || postStatusUpdating) {
      return;
    }

    setPostDeleteConfirming(false);
    setPostDeleteError(null);
  }

  function confirmPostDelete() {
    if (
      selectedPost === null ||
      postDeleting ||
      postEditSaving ||
      postStatusUpdating
    ) {
      return;
    }

    setPostDeleting(true);
    setPostDeleteError(null);

    const targetPostId = selectedPost.id;
    const controller = new AbortController();
    postDeleteControllerRef.current = controller;

    void deletePost(targetPostId, controller.signal)
      .then(() => {
        if (!controller.signal.aborted) {
          setPosts((currentPosts) =>
            currentPosts.filter((post) => post.id !== targetPostId),
          );
          setPublishedPosts((currentPosts) =>
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
          setPostStatusUpdating(false);
          setPostStatusError(null);

          composeDispatch({ type: "SYNC_DELETED_POST", postId: targetPostId });
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

  function publishPost() {
    if (
      selectedPost === null ||
      selectedPost.status === "published" ||
      postEditSaving ||
      postDeleting ||
      postStatusUpdating
    ) {
      return;
    }

    setPostStatusUpdating(true);
    setPostStatusError(null);
    setPostEditDraft(null);
    setPostEditError(null);
    setPostDeleteConfirming(false);
    setPostDeleteError(null);

    const controller = new AbortController();
    postStatusControllerRef.current = controller;

    void updatePostStatus(selectedPost.id, "published", controller.signal)
      .then((post) => {
        if (!controller.signal.aborted) {
          setSelectedPost(post);
          setPosts((currentPosts) => upsertPost(currentPosts, post));
          setPublishedPosts((currentPosts) => upsertPost(currentPosts, post));
          setActiveView("published");
          setPublishedPostsError(null);
          composeDispatch({ type: "SYNC_SAVED_DRAFT", post });
          setPostDetailError(null);
          setPostStatusError(null);
        }
      })
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) {
          setPostStatusError(
            getErrorMessage(requestError, "Failed to publish post."),
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setPostStatusUpdating(false);
          postStatusControllerRef.current = null;
        }
      });
  }

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
            posts={publishedPosts}
            loading={publishedPostsLoading}
            error={publishedPostsError}
            onRetry={() => {
              setPublishedPostsLoading(true);
              setPublishedPostsError(null);
              setPublishedPostsReloadKey((currentKey) => currentKey + 1);
            }}
          />
        ) : null}

        {activeView === "compose" ? (
          <>
            <div className="grid min-w-0 gap-6 lg:grid-cols-3">
              <RepositorySelector
                repositories={repositories}
                selectedRepositoryId={selectedRepositoryId}
                loading={loading}
                error={error}
                onSelect={(repository) => {
                  abortDraftRequests();
                  composeDispatch({
                    type: "SELECT_REPOSITORY",
                    repositoryId: repository.id,
                  });
                }}
                onRetry={() => {
                  setLoading(true);
                  setError(null);
                  clearDraftState();

                  void fetchRepositories()
                    .then((items) => {
                      setRepositories(items);
                      const nextRepository = items[0] ?? null;

                      abortDraftRequests();
                      composeDispatch({
                        type: "REPOSITORIES_LOADED",
                        repositoryId: nextRepository?.id ?? null,
                      });
                    })
                    .catch((requestError: unknown) => {
                      setError(
                        getErrorMessage(
                          requestError,
                          "Failed to load repositories.",
                        ),
                      );
                      setRepositories([]);
                      abortDraftRequests();
                      composeDispatch({ type: "REPOSITORIES_FAILED" });
                    })
                    .finally(() => {
                      setLoading(false);
                    });
                }}
              />

              <BranchSelector
                repository={selectedRepository}
                branches={branches}
                selectedBranchName={selectedBranchName}
                loading={branchLoading}
                error={branchError}
                disabled={selectedRepository === null}
                onSelect={(branch) => {
                  abortDraftRequests();
                  composeDispatch({
                    type: "SELECT_BRANCH",
                    branchName: branch.name,
                  });
                }}
                onRetry={() => {
                  if (selectedRepository === null) {
                    return;
                  }

                  abortDraftRequests();
                  composeDispatch({ type: "RETRY_BRANCHES" });
                }}
              />

              <CommitList
                repository={selectedRepository}
                branchName={selectedBranchName}
                commits={commits}
                selectedCommitShas={selectedCommitShas}
                loading={commitLoading}
                error={commitError}
                disabled={
                  selectedRepository === null || selectedBranchName === null
                }
                onToggle={toggleCommit}
                onRetry={() => {
                  if (
                    selectedRepository === null ||
                    selectedBranchName === null
                  ) {
                    return;
                  }

                  abortDraftRequests();
                  composeDispatch({ type: "RETRY_COMMITS" });
                }}
              />
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
          </>
        ) : null}

        {activeView === "drafts" ? (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <PostList
              posts={draftPosts}
              selectedPostId={selectedPostId}
              loading={postsLoading}
              error={postsError}
              eyebrow="Draft posts"
              title="Edit saved drafts"
              description="Draft posts can be opened for editing, deletion, or publishing."
              emptyMessage="No draft posts yet. Create a new post and save it as a draft."
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
              statusUpdating={postStatusUpdating}
              statusError={postStatusError}
              onStartEdit={startPostEdit}
              onEditChange={updatePostEditField}
              onCancelEdit={cancelPostEdit}
              onSaveEdit={savePostEdit}
              onRequestDelete={requestPostDelete}
              onCancelDelete={cancelPostDelete}
              onConfirmDelete={confirmPostDelete}
              onPublish={publishPost}
              onRetry={retryPostDetail}
              onClose={closePostDetail}
            />
          </div>
        ) : null}
      </div>
    </main>
  );
}

export default App;
