import { useEffect, useState } from "react";

import {
  DRAFT_POSTS_PAGE_SIZE,
  PUBLISHED_POSTS_PAGE_SIZE,
} from "../constants/limits";
import { getErrorMessage } from "../lib/api";
import {
  fetchDraftPosts,
  fetchPublishedPosts,
  type PaginationMeta,
  type Post,
} from "../lib/posts";

type ReloadOptions = {
  resetPage?: boolean;
};

function createEmptyPagination(limit: number): PaginationMeta {
  return {
    page: 1,
    limit,
    total: 0,
    totalPages: 0,
    hasPreviousPage: false,
    hasNextPage: false,
  };
}

function upsertPost(posts: Post[], nextPost: Post) {
  return [nextPost, ...posts.filter((post) => post.id !== nextPost.id)];
}

function syncDraftPost(posts: Post[], nextPost: Post) {
  return nextPost.status === "draft"
    ? upsertPost(posts, nextPost)
    : posts.filter((post) => post.id !== nextPost.id);
}

function syncPublishedPost(posts: Post[], nextPost: Post) {
  return nextPost.status === "published"
    ? upsertPost(posts, nextPost)
    : posts.filter((post) => post.id !== nextPost.id);
}

export function usePostLists() {
  const [draftPosts, setDraftPosts] = useState<Post[]>([]);
  const [draftPostsPage, setDraftPostsPage] = useState(1);
  const [draftPostsPagination, setDraftPostsPagination] =
    useState<PaginationMeta>(() =>
      createEmptyPagination(DRAFT_POSTS_PAGE_SIZE),
    );
  const [draftPostsReloadKey, setDraftPostsReloadKey] = useState(0);
  const [publishedPosts, setPublishedPosts] = useState<Post[]>([]);
  const [publishedPostsPage, setPublishedPostsPage] = useState(1);
  const [publishedPostsPagination, setPublishedPostsPagination] =
    useState<PaginationMeta>(() =>
      createEmptyPagination(PUBLISHED_POSTS_PAGE_SIZE),
    );
  const [publishedPostsReloadKey, setPublishedPostsReloadKey] = useState(0);
  const [draftPostsLoading, setDraftPostsLoading] = useState(true);
  const [publishedPostsLoading, setPublishedPostsLoading] = useState(true);
  const [draftPostsError, setDraftPostsError] = useState<string | null>(null);
  const [publishedPostsError, setPublishedPostsError] = useState<string | null>(
    null,
  );

  useEffect(() => {
    const controller = new AbortController();

    void fetchDraftPosts(
      {
        page: draftPostsPage,
        limit: DRAFT_POSTS_PAGE_SIZE,
      },
      controller.signal,
    )
      .then(({ posts: items, pagination }) => {
        if (!controller.signal.aborted) {
          setDraftPosts(items);
          setDraftPostsPagination(pagination);
          if (pagination.page !== draftPostsPage) {
            setDraftPostsPage(pagination.page);
          }
        }
      })
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) {
          setDraftPostsError(
            getErrorMessage(requestError, "Failed to load saved posts."),
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setDraftPostsLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [draftPostsPage, draftPostsReloadKey]);

  useEffect(() => {
    const controller = new AbortController();

    void fetchPublishedPosts(
      {
        page: publishedPostsPage,
        limit: PUBLISHED_POSTS_PAGE_SIZE,
      },
      controller.signal,
    )
      .then(({ posts: items, pagination }) => {
        if (!controller.signal.aborted) {
          setPublishedPosts(items);
          setPublishedPostsPagination(pagination);
          if (pagination.page !== publishedPostsPage) {
            setPublishedPostsPage(pagination.page);
          }
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
  }, [publishedPostsPage, publishedPostsReloadKey]);

  function reloadDraftPosts({ resetPage = false }: ReloadOptions = {}) {
    setDraftPostsLoading(true);
    setDraftPostsError(null);

    if (resetPage) {
      setDraftPostsPage(1);
    }

    setDraftPostsReloadKey((currentKey) => currentKey + 1);
  }

  function reloadPublishedPosts({ resetPage = false }: ReloadOptions = {}) {
    setPublishedPostsLoading(true);
    setPublishedPostsError(null);

    if (resetPage) {
      setPublishedPostsPage(1);
    }

    setPublishedPostsReloadKey((currentKey) => currentKey + 1);
  }

  function requestDraftPostsPage(page: number) {
    setDraftPostsLoading(true);
    setDraftPostsError(null);
    setDraftPostsPage(page);
  }

  function requestPublishedPostsPage(page: number) {
    setPublishedPostsLoading(true);
    setPublishedPostsError(null);
    setPublishedPostsPage(page);
  }

  function syncPost(post: Post) {
    setDraftPosts((currentPosts) => syncDraftPost(currentPosts, post));
    setPublishedPosts((currentPosts) => syncPublishedPost(currentPosts, post));
  }

  function syncDeletedPost(postId: string) {
    setDraftPosts((currentPosts) =>
      currentPosts.filter((post) => post.id !== postId),
    );
    setPublishedPosts((currentPosts) =>
      currentPosts.filter((post) => post.id !== postId),
    );
  }

  function handleDraftSaved(post: Post) {
    syncPost(post);

    if (post.status === "draft") {
      reloadDraftPosts({ resetPage: true });
    }
  }

  function handlePostEdited(post: Post) {
    syncPost(post);

    if (post.status === "draft") {
      reloadDraftPosts({ resetPage: true });
    } else {
      reloadPublishedPosts({ resetPage: true });
    }
  }

  function handlePostDeleted(postId: string) {
    syncDeletedPost(postId);
    reloadDraftPosts();
    reloadPublishedPosts();
  }

  function handlePostPublished(post: Post) {
    syncPost(post);
    reloadDraftPosts();
    reloadPublishedPosts({ resetPage: true });
  }

  return {
    draftPosts,
    draftPostsPagination,
    draftPostsLoading,
    draftPostsError,
    publishedPosts,
    publishedPostsPagination,
    publishedPostsLoading,
    publishedPostsError,
    handleDraftSaved,
    handlePostDeleted,
    handlePostEdited,
    handlePostPublished,
    reloadDraftPosts,
    reloadPublishedPosts,
    requestDraftPostsPage,
    requestPublishedPostsPage,
    syncPost,
  };
}
