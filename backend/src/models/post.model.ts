import mongoose, { Schema, model, type InferSchemaType } from "mongoose";

import type { PostStatus } from "../types/api.js";

const commitSummarySchema = new Schema(
  {
    sha: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    authorName: {
      type: String,
      required: true,
    },
    authorDate: {
      type: String,
      required: true,
    },
    htmlUrl: {
      type: String,
      required: true,
    },
  },
  { _id: false },
);

const repositorySchema = new Schema(
  {
    owner: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    fullName: {
      type: String,
      required: true,
    },
  },
  { _id: false },
);

const postSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
    },
    summary: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    repository: {
      type: repositorySchema,
      required: true,
    },
    branch: {
      type: String,
      required: true,
    },
    commits: {
      type: [commitSummarySchema],
      required: true,
    },
    status: {
      type: String,
      enum: ["draft", "published"],
      required: true,
      default: "draft",
    },
    publishedAt: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
);

export type PostDocument = InferSchemaType<typeof postSchema>;
export type { PostStatus };

export const PostModel =
  mongoose.models.Post ?? model("Post", postSchema);
