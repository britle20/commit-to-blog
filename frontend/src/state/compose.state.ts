import { MAX_SELECTED_COMMITS } from "../constants/limits";
import type { GeneratedDraft } from "../lib/blog";
import type { BranchSummary, CommitSummary } from "../lib/github";
import type { Post } from "../lib/posts";

export type ComposeState = {
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

export type ComposeAction =
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

export const initialComposeState: ComposeState = {
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
  if (selectedCommitShas.includes(commitSha)) {
    return selectedCommitShas.filter((sha) => sha !== commitSha);
  }

  if (selectedCommitShas.length >= MAX_SELECTED_COMMITS) {
    return selectedCommitShas;
  }

  return [...selectedCommitShas, commitSha];
}

export function composeReducer(
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

    case "TOGGLE_COMMIT": {
      const selectedCommitShas = toggleCommitSha(
        state.selectedCommitShas,
        action.commitSha,
      );

      if (selectedCommitShas === state.selectedCommitShas) {
        return state;
      }

      return clearDraftFields({
        ...state,
        selectedCommitShas,
      });
    }

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
