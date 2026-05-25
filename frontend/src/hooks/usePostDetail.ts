import { useEffect, useReducer, useRef } from "react";

import { getErrorMessage } from "../lib/api";
import {
  deletePost,
  fetchPost,
  updatePost,
  updatePostStatus,
  type Post,
  type PostEditInput,
} from "../lib/posts";
import {
  initialPostDetailState,
  postDetailReducer,
} from "../state/post-detail.state";

type UsePostDetailOptions = {
  onPostDeleted: (postId: string) => void;
  onPostEdited: (post: Post) => void;
  onPostLoaded: (post: Post) => void;
  onPostPublished: (post: Post) => void;
};

export function usePostDetail({
  onPostDeleted,
  onPostEdited,
  onPostLoaded,
  onPostPublished,
}: UsePostDetailOptions) {
  const [state, dispatch] = useReducer(
    postDetailReducer,
    initialPostDetailState,
  );
  const postEditControllerRef = useRef<AbortController | null>(null);
  const postDeleteControllerRef = useRef<AbortController | null>(null);
  const postStatusControllerRef = useRef<AbortController | null>(null);
  const callbacksRef = useRef({
    onPostDeleted,
    onPostEdited,
    onPostLoaded,
    onPostPublished,
  });
  const {
    selectedPostId,
    selectedPost,
    postDetailReloadKey,
    postEditDraft,
    postEditSaving,
    postDeleting,
    postStatusUpdating,
  } = state;

  function abortPostDetailRequests() {
    postEditControllerRef.current?.abort();
    postEditControllerRef.current = null;
    postDeleteControllerRef.current?.abort();
    postDeleteControllerRef.current = null;
    postStatusControllerRef.current?.abort();
    postStatusControllerRef.current = null;
  }

  useEffect(() => {
    callbacksRef.current = {
      onPostDeleted,
      onPostEdited,
      onPostLoaded,
      onPostPublished,
    };
  }, [onPostDeleted, onPostEdited, onPostLoaded, onPostPublished]);

  useEffect(() => {
    return () => {
      postEditControllerRef.current?.abort();
      postDeleteControllerRef.current?.abort();
      postStatusControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (selectedPostId === null) {
      return;
    }

    const controller = new AbortController();

    void fetchPost(selectedPostId, controller.signal)
      .then((post) => {
        if (!controller.signal.aborted) {
          dispatch({ type: "POST_DETAIL_LOADED", post });
          callbacksRef.current.onPostLoaded(post);
        }
      })
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) {
          dispatch({
            type: "POST_DETAIL_FAILED",
            error: getErrorMessage(requestError, "Failed to load post details."),
          });
        }
      });

    return () => {
      controller.abort();
    };
  }, [postDetailReloadKey, selectedPostId]);

  function openPostDetail(post: Post) {
    abortPostDetailRequests();
    dispatch({ type: "OPEN_POST_DETAIL", post });
  }

  function retryPostDetail() {
    if (selectedPostId === null) {
      return;
    }

    dispatch({ type: "RETRY_POST_DETAIL" });
  }

  function closePostDetail() {
    abortPostDetailRequests();
    dispatch({ type: "CLOSE_POST_DETAIL" });
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

    dispatch({ type: "START_POST_EDIT" });
  }

  function updatePostEditField(field: keyof PostEditInput, value: string) {
    dispatch({ type: "UPDATE_POST_EDIT_FIELD", field, value });
  }

  function cancelPostEdit() {
    if (postEditSaving || postDeleting || postStatusUpdating) {
      return;
    }

    dispatch({ type: "CANCEL_POST_EDIT" });
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

    dispatch({ type: "START_POST_EDIT_SAVE" });

    const controller = new AbortController();
    postEditControllerRef.current = controller;

    void updatePost(selectedPost.id, postEditDraft, controller.signal)
      .then((post) => {
        if (!controller.signal.aborted) {
          dispatch({ type: "POST_EDIT_SAVED", post });
          callbacksRef.current.onPostEdited(post);
        }
      })
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) {
          dispatch({
            type: "POST_EDIT_FAILED",
            error: getErrorMessage(requestError, "Failed to update post."),
          });
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
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

    dispatch({ type: "REQUEST_POST_DELETE" });
  }

  function cancelPostDelete() {
    if (postDeleting || postStatusUpdating) {
      return;
    }

    dispatch({ type: "CANCEL_POST_DELETE" });
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

    dispatch({ type: "START_POST_DELETE" });

    const targetPostId = selectedPost.id;
    const controller = new AbortController();
    postDeleteControllerRef.current = controller;

    void deletePost(targetPostId, controller.signal)
      .then(() => {
        if (!controller.signal.aborted) {
          dispatch({ type: "POST_DELETE_SUCCEEDED" });
          callbacksRef.current.onPostDeleted(targetPostId);
        }
      })
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) {
          dispatch({
            type: "POST_DELETE_FAILED",
            error: getErrorMessage(requestError, "Failed to delete post."),
          });
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
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

    dispatch({ type: "START_POST_PUBLISH" });

    const controller = new AbortController();
    postStatusControllerRef.current = controller;

    void updatePostStatus(selectedPost.id, "published", controller.signal)
      .then((post) => {
        if (!controller.signal.aborted) {
          dispatch({ type: "POST_PUBLISHED", post });
          callbacksRef.current.onPostPublished(post);
        }
      })
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) {
          dispatch({
            type: "POST_PUBLISH_FAILED",
            error: getErrorMessage(requestError, "Failed to publish post."),
          });
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          postStatusControllerRef.current = null;
        }
      });
  }

  function syncSelectedPost(post: Post) {
    dispatch({ type: "SYNC_SELECTED_POST", post });
  }

  return {
    state,
    cancelPostDelete,
    cancelPostEdit,
    closePostDetail,
    confirmPostDelete,
    openPostDetail,
    publishPost,
    requestPostDelete,
    retryPostDetail,
    savePostEdit,
    startPostEdit,
    syncSelectedPost,
    updatePostEditField,
  };
}
