import { ConvexReactClient } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

/**
 * Image / file upload flow for the BlockNote editor, backed by Convex File
 * Storage. BlockNote's `uploadFile` hook is `(file: File) => Promise<string>`
 * and must resolve to a publicly fetchable URL that the editor stores in the
 * block. The three-step Convex pattern is:
 *
 *   1. `files.generateUploadUrl()` — a short-lived, org-scoped signed POST URL.
 *   2. POST the raw `File` bytes to that URL → Convex returns a `storageId`.
 *   3. `files.getFileUrl({ storageId })` — a stable signed URL for the block.
 *
 * `generateUploadUrl` is authorized server-side (it derives the org from the
 * Clerk JWT), so the upload must run through an *authenticated* Convex client.
 * Inside the editor we therefore build the uploader from the context client via
 * {@link createUploadFile} (`useConvex()`), which already carries the caller's
 * auth token.
 */

/**
 * Upload a file to Convex storage and return its `_storage` id. This is the
 * shared first half of the flow, reused both for editor block uploads (which
 * then resolve a URL) and for page covers (which persist the `storageId`
 * directly on the document via `files.setCover`).
 *
 * @param client - An authenticated `ConvexReactClient` (e.g. from `useConvex()`).
 * @param file   - The file to upload.
 * @returns The new `_storage` id.
 */
export async function uploadToStorage(
  client: ConvexReactClient,
  file: File,
): Promise<Id<"_storage">> {
  // 1. Ask Convex for a one-time signed upload URL (org-scoped server-side).
  const postUrl = await client.mutation(api.files.generateUploadUrl, {});

  // 2. Upload the raw bytes. Convex returns the new `_storage` id as JSON.
  const result = await fetch(postUrl, {
    method: "POST",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });
  if (!result.ok) {
    throw new Error(`Upload Failed: ${result.status} ${result.statusText}`);
  }
  const { storageId } = (await result.json()) as { storageId: Id<"_storage"> };
  return storageId;
}

/**
 * Run the full Convex upload flow with an explicit (authenticated) client and
 * resolve to a fetchable URL (for BlockNote blocks).
 *
 * @param client - An authenticated `ConvexReactClient` (e.g. from `useConvex()`).
 * @param file   - The file to upload.
 * @returns A signed URL for the stored file.
 */
export async function uploadFileWith(
  client: ConvexReactClient,
  file: File,
): Promise<string> {
  const storageId = await uploadToStorage(client, file);
  const url = await client.query(api.files.getFileUrl, { storageId });
  if (!url) {
    throw new Error("Uploaded file URL cannot be resolved.");
  }
  return url;
}

/**
 * Build a BlockNote-compatible `uploadFile` callback bound to an authenticated
 * Convex client. Use inside a client component:
 *
 * ```tsx
 * const client = useConvex();
 * const uploadFile = useMemo(() => createUploadFile(client), [client]);
 * ```
 */
export function createUploadFile(
  client: ConvexReactClient,
): (file: File) => Promise<string> {
  return (file: File) => uploadFileWith(client, file);
}

/**
 * Lazily-constructed shared client used by the standalone {@link uploadFile}
 * export required by the integration contract. Prefer {@link createUploadFile}
 * with `useConvex()` inside components so uploads carry the active auth token;
 * this fallback exists so `uploadFile(file)` matches the contract signature.
 */
let sharedClient: ConvexReactClient | null = null;
function getSharedClient(): ConvexReactClient {
  if (!sharedClient) {
    const url = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!url) {
      throw new Error("NEXT_PUBLIC_CONVEX_URL is not set.");
    }
    sharedClient = new ConvexReactClient(url);
  }
  return sharedClient;
}

/**
 * Contract-required standalone uploader. Internally delegates to the shared
 * client. In practice the editor uses {@link createUploadFile} so the upload is
 * authenticated; this is the typed entry point named by the integration
 * contract.
 */
export async function uploadFile(file: File): Promise<string> {
  return uploadFileWith(getSharedClient(), file);
}
