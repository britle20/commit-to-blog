import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";

import { getErrorMessage } from "../lib/api";
import { generateBlogDraft, type GeneratedDraft } from "../lib/blog";
import {
  fetchBranches,
  fetchCommits,
  fetchRepositories,
  type BranchSummary,
  type CommitSummary,
  type RepositorySummary,
} from "../lib/github";
import {
  createDraftPost,
  updatePost,
  type Post,
} from "../lib/posts";
import {
  composeReducer,
  initialComposeState,
} from "../state/compose.state";

type UseComposeFlowOptions = {
  onDraftSaved: (post: Post) => void;
};

export function useComposeFlow({ onDraftSaved }: UseComposeFlowOptions) {
  const [repositories, setRepositories] = useState<RepositorySummary[]>([]);
  const [repositoriesReloadKey, setRepositoriesReloadKey] = useState(0);
  const [repositoriesLoading, setRepositoriesLoading] = useState(true);
  const [repositoriesError, setRepositoriesError] = useState<string | null>(
    null,
  );
  const [state, dispatch] = useReducer(composeReducer, initialComposeState);
  const draftControllerRef = useRef<AbortController | null>(null);
  const saveControllerRef = useRef<AbortController | null>(null);
  const {
    selectedRepositoryId,
    selectedBranchName,
    commits,
    selectedCommitShas,
    generatedDraft,
    savedDraft,
    draftLoading,
    saveLoading,
    branchLoading,
    commitLoading,
  } = state;

  const abortDraftRequests = useCallback(() => {
    draftControllerRef.current?.abort();
    saveControllerRef.current?.abort();
    draftControllerRef.current = null;
    saveControllerRef.current = null;
  }, []);

  const clearDraftState = useCallback(() => {
    abortDraftRequests();
    dispatch({ type: "CLEAR_DRAFT" });
  }, [abortDraftRequests]);

  useEffect(() => {
    return () => {
      draftControllerRef.current?.abort();
      saveControllerRef.current?.abort();
    };
  }, []);

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
        dispatch({
          type: "REPOSITORIES_LOADED",
          repositoryId: nextRepository?.id ?? null,
        });
      })
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) {
          setRepositoriesError(
            getErrorMessage(requestError, "Failed to load repositories."),
          );
          setRepositories([]);
          abortDraftRequests();
          dispatch({ type: "REPOSITORIES_FAILED" });
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setRepositoriesLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [abortDraftRequests, repositoriesReloadKey]);

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
        dispatch({
          type: "BRANCHES_LOADED",
          branches: items,
          defaultBranchName: selectedRepository.defaultBranch,
        });
      })
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) {
          abortDraftRequests();
          dispatch({
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

        dispatch({ type: "COMMITS_LOADED", commits: items });
      })
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) {
          abortDraftRequests();
          dispatch({
            type: "COMMITS_FAILED",
            error: getErrorMessage(requestError, "Failed to load commits."),
          });
        }
      });

    return () => {
      controller.abort();
    };
  }, [abortDraftRequests, commitLoading, selectedBranchName, selectedRepository]);

  function retryRepositories() {
    setRepositoriesLoading(true);
    setRepositoriesError(null);
    clearDraftState();
    setRepositoriesReloadKey((currentKey) => currentKey + 1);
  }

  function selectRepository(repository: RepositorySummary) {
    abortDraftRequests();
    dispatch({
      type: "SELECT_REPOSITORY",
      repositoryId: repository.id,
    });
  }

  function selectBranch(branch: BranchSummary) {
    abortDraftRequests();
    dispatch({
      type: "SELECT_BRANCH",
      branchName: branch.name,
    });
  }

  function retryBranches() {
    if (selectedRepository === null) {
      return;
    }

    abortDraftRequests();
    dispatch({ type: "RETRY_BRANCHES" });
  }

  function toggleCommit(commit: CommitSummary) {
    abortDraftRequests();
    dispatch({ type: "TOGGLE_COMMIT", commitSha: commit.sha });
  }

  function retryCommits() {
    if (selectedRepository === null || selectedBranchName === null) {
      return;
    }

    abortDraftRequests();
    dispatch({ type: "RETRY_COMMITS" });
  }

  function updateDraftField(field: keyof GeneratedDraft, value: string) {
    dispatch({ type: "UPDATE_DRAFT_FIELD", field, value });
  }

  function generateDraft() {
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

    dispatch({ type: "START_DRAFT_GENERATION" });

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
          dispatch({ type: "DRAFT_GENERATED", draft });
        }
      })
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) {
          dispatch({
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

  function saveDraft() {
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

    dispatch({ type: "START_SAVE_DRAFT" });

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
          dispatch({ type: "DRAFT_SAVED", post });
          onDraftSaved(post);
        }
      })
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) {
          dispatch({
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

  function syncPostEdit(post: Post) {
    dispatch({ type: "SYNC_POST_EDIT", post });
  }

  function syncSavedDraft(post: Post) {
    dispatch({ type: "SYNC_SAVED_DRAFT", post });
  }

  function syncDeletedPost(postId: string) {
    dispatch({ type: "SYNC_DELETED_POST", postId });
  }

  return {
    state,
    repositories,
    repositoriesLoading,
    repositoriesError,
    selectedRepository,
    selectedCommits,
    generateDraft,
    retryBranches,
    retryCommits,
    retryRepositories,
    saveDraft,
    selectBranch,
    selectRepository,
    syncDeletedPost,
    syncPostEdit,
    syncSavedDraft,
    toggleCommit,
    updateDraftField,
  };
}
