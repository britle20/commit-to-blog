import type { RequestHandler } from "express";

import {
  createPost,
  deletePost,
  getPostById,
  listPosts,
  updatePost,
  updatePostStatus,
} from "../services/post.service.js";
import {
  parseCreatePostInput,
  parseStatusQuery,
  parseUpdatePostInput,
  parseUpdateStatusInput,
} from "../validators/request.validator.js";

function readSingleString(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export const listPostsHandler: RequestHandler = async (req, res) => {
  const posts = await listPosts(parseStatusQuery(req.query.status));

  res.json({ posts });
};

export const getPostHandler: RequestHandler = async (req, res) => {
  const post = await getPostById(readSingleString(req.params.id) ?? "");

  res.json({ post });
};

export const createPostHandler: RequestHandler = async (req, res) => {
  const post = await createPost(parseCreatePostInput(req.body));

  res.status(201).json({ post });
};

export const updatePostHandler: RequestHandler = async (req, res) => {
  const post = await updatePost(
    readSingleString(req.params.id) ?? "",
    parseUpdatePostInput(req.body),
  );

  res.json({ post });
};

export const updatePostStatusHandler: RequestHandler = async (req, res) => {
  const post = await updatePostStatus(
    readSingleString(req.params.id) ?? "",
    parseUpdateStatusInput(req.body),
  );

  res.json({ post });
};

export const deletePostHandler: RequestHandler = async (req, res) => {
  await deletePost(readSingleString(req.params.id) ?? "");

  res.status(204).send();
};
