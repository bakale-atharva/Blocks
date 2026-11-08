import type { ConvexReactClient } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

/**
 * Upload flow for the BlockNote editor and page covers, backed by Convex File
 * Storage:
 *
 *   1. `files.generateUploadUrl({ id })`: a short-lived POST URL. The server
 *      checks that the caller's org owns the document and that it isn't
 *      trashed.
 *   2. POST the raw `File` bytes to that URL. Convex returns a `storageId`.
 *   3. `files.attachFile` (editor blocks) or `files.setCover` (covers)
 *      validates the MIME type and size on the server and deletes rejected
 *      blobs.
 *
 * Every step runs through the authenticated client from `useConvex()`, so it
 * carries the caller's Clerk token.
 */

/** Upload `file` for document `docId` and return its `_storage` id. */
export async function uploadToStorage(
  client: ConvexReactClient,
  docId: Id<"documents">,
  file: File,
): Promise<Id<"_storage">> {
  const postUrl = await client.mutation(api.files.generateUploadUrl, {
    id: docId,
  });

  const result = await fetch(postUrl, {
    method: "POST",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });
  if (!result.ok) {
    throw new Error(`Upload failed: ${result.status} ${result.statusText}`);
  }
  const { storageId } = (await result.json()) as { storageId: Id<"_storage"> };
  return storageId;
}

/**
 * A BlockNote `uploadFile` callback for document `docId`. It resolves to the
 * URL the block stores, after the server has validated the file.
 */
export function createUploadFile(
  client: ConvexReactClient,
  docId: Id<"documents">,
): (file: File) => Promise<string> {
  return async (file: File) => {
    const storageId = await uploadToStorage(client, docId, file);
    return await client.mutation(api.files.attachFile, {
      id: docId,
      storageId,
    });
  };
}

/** The user-facing message of a Convex error, or `fallback`. */
export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ConvexError && typeof error.data === "string"
    ? error.data
    : fallback;
}
