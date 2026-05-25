import type { Post, PostEditInput } from "../lib/posts";

export type PostDetailState = {
  selectedPostId: string | null;
  selectedPost: Post | null;
  postDetailReloadKey: number;
  postEditDraft: PostEditInput | null;
  postDeleteConfirming: boolean;
  postDetailLoading: boolean;
  postEditSaving: boolean;
  postDeleting: boolean;
  postStatusUpdating: boolean;
  postDetailError: string | null;
  postEditError: string | null;
  postDeleteError: string | null;
  postStatusError: string | null;
};

export type PostDetailAction =
  | { type: "OPEN_POST_DETAIL"; post: Post }
  | { type: "RETRY_POST_DETAIL" }
  | { type: "CLOSE_POST_DETAIL" }
  | { type: "POST_DETAIL_LOADED"; post: Post }
  | { type: "POST_DETAIL_FAILED"; error: string }
  | { type: "SYNC_SELECTED_POST"; post: Post }
  | { type: "SYNC_POST_LIST"; posts: Post[] }
  | { type: "START_POST_EDIT" }
  | { type: "UPDATE_POST_EDIT_FIELD"; field: keyof PostEditInput; value: string }
  | { type: "CANCEL_POST_EDIT" }
  | { type: "START_POST_EDIT_SAVE" }
  | { type: "POST_EDIT_SAVED"; post: Post }
  | { type: "POST_EDIT_FAILED"; error: string }
  | { type: "REQUEST_POST_DELETE" }
  | { type: "CANCEL_POST_DELETE" }
  | { type: "START_POST_DELETE" }
  | { type: "POST_DELETE_SUCCEEDED" }
  | { type: "POST_DELETE_FAILED"; error: string }
  | { type: "START_POST_PUBLISH" }
  | { type: "POST_PUBLISHED"; post: Post }
  | { type: "POST_PUBLISH_FAILED"; error: string };

export const initialPostDetailState: PostDetailState = {
  selectedPostId: null,
  selectedPost: null,
  postDetailReloadKey: 0,
  postEditDraft: null,
  postDeleteConfirming: false,
  postDetailLoading: false,
  postEditSaving: false,
  postDeleting: false,
  postStatusUpdating: false,
  postDetailError: null,
  postEditError: null,
  postDeleteError: null,
  postStatusError: null,
};

function clearPostDetailFields(state: PostDetailState): PostDetailState {
  return {
    ...state,
    selectedPostId: null,
    selectedPost: null,
    postDetailLoading: false,
    postDetailError: null,
    postEditDraft: null,
    postEditSaving: false,
    postEditError: null,
    postDeleteConfirming: false,
    postDeleting: false,
    postDeleteError: null,
    postStatusUpdating: false,
    postStatusError: null,
  };
}

export function postDetailReducer(
  state: PostDetailState,
  action: PostDetailAction,
): PostDetailState {
  switch (action.type) {
    case "OPEN_POST_DETAIL":
      return {
        ...state,
        selectedPostId: action.post.id,
        selectedPost: action.post,
        postDetailLoading: true,
        postDetailError: null,
        postEditDraft: null,
        postEditSaving: false,
        postEditError: null,
        postDeleteConfirming: false,
        postDeleting: false,
        postDeleteError: null,
        postStatusUpdating: false,
        postStatusError: null,
        postDetailReloadKey: state.postDetailReloadKey + 1,
      };

    case "RETRY_POST_DETAIL":
      return {
        ...state,
        postDetailLoading: true,
        postDetailError: null,
        postDetailReloadKey: state.postDetailReloadKey + 1,
      };

    case "CLOSE_POST_DETAIL":
      return clearPostDetailFields(state);

    case "POST_DETAIL_LOADED":
      return {
        ...state,
        selectedPost: action.post,
        postDetailLoading: false,
        postDetailError: null,
      };

    case "POST_DETAIL_FAILED":
      return {
        ...state,
        postDetailLoading: false,
        postDetailError: action.error,
      };

    case "SYNC_SELECTED_POST":
      return {
        ...state,
        selectedPost:
          state.selectedPost?.id === action.post.id ? action.post : state.selectedPost,
      };

    case "SYNC_POST_LIST":
      return {
        ...state,
        selectedPost:
          state.selectedPost === null
            ? state.selectedPost
            : action.posts.find((post) => post.id === state.selectedPost?.id) ??
              state.selectedPost,
      };

    case "START_POST_EDIT":
      if (state.selectedPost === null) {
        return state;
      }

      return {
        ...state,
        postEditDraft: {
          title: state.selectedPost.title,
          summary: state.selectedPost.summary,
          content: state.selectedPost.content,
        },
        postEditError: null,
        postDeleteConfirming: false,
        postDeleteError: null,
        postStatusError: null,
      };

    case "UPDATE_POST_EDIT_FIELD":
      return {
        ...state,
        postEditDraft:
          state.postEditDraft === null
            ? state.postEditDraft
            : {
                ...state.postEditDraft,
                [action.field]: action.value,
              },
        postEditError: null,
      };

    case "CANCEL_POST_EDIT":
      return {
        ...state,
        postEditDraft: null,
        postEditError: null,
      };

    case "START_POST_EDIT_SAVE":
      return {
        ...state,
        postEditSaving: true,
        postEditError: null,
      };

    case "POST_EDIT_SAVED":
      return {
        ...state,
        selectedPost: action.post,
        postDetailError: null,
        postEditDraft: null,
        postEditSaving: false,
        postEditError: null,
      };

    case "POST_EDIT_FAILED":
      return {
        ...state,
        postEditSaving: false,
        postEditError: action.error,
      };

    case "REQUEST_POST_DELETE":
      return {
        ...state,
        postEditDraft: null,
        postEditError: null,
        postDeleteConfirming: true,
        postDeleteError: null,
        postStatusError: null,
      };

    case "CANCEL_POST_DELETE":
      return {
        ...state,
        postDeleteConfirming: false,
        postDeleteError: null,
      };

    case "START_POST_DELETE":
      return {
        ...state,
        postDeleting: true,
        postDeleteError: null,
      };

    case "POST_DELETE_SUCCEEDED":
      return clearPostDetailFields(state);

    case "POST_DELETE_FAILED":
      return {
        ...state,
        postDeleting: false,
        postDeleteError: action.error,
      };

    case "START_POST_PUBLISH":
      return {
        ...state,
        postStatusUpdating: true,
        postStatusError: null,
        postEditDraft: null,
        postEditError: null,
        postDeleteConfirming: false,
        postDeleteError: null,
      };

    case "POST_PUBLISHED":
      return {
        ...state,
        selectedPost: action.post,
        postDetailError: null,
        postStatusUpdating: false,
        postStatusError: null,
      };

    case "POST_PUBLISH_FAILED":
      return {
        ...state,
        postStatusUpdating: false,
        postStatusError: action.error,
      };

    default:
      return state;
  }
}
