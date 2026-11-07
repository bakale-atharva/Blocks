"use client";

import { useRef, useState } from "react";
import { useMutation, useQuery, useConvex } from "convex/react";
import { ImagePlus, Smile, X } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { uploadToStorage } from "@/lib/uploadFile";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

/**
 * Curated emoji palette for the page-icon picker. Kept inline (rather than
 * pulling in a heavy emoji-picker dependency) so the editor chrome stays
 * lightweight; covers the common Notion-style document icons.
 */
const EMOJI_CHOICES = [
  "📄",
  "📝",
  "📌",
  "📒",
  "📚",
  "📖",
  "🗂️",
  "🗃️",
  "✅",
  "⭐",
  "🔥",
  "💡",
  "🎯",
  "🚀",
  "🧠",
  "🛠️",
  "📊",
  "📈",
  "💰",
  "🧾",
  "🗓️",
  "⏰",
  "🔖",
  "🏷️",
  "❤️",
  "🎉",
  "🌱",
  "🌍",
  "☕",
  "🍿",
  "🎨",
  "🎵",
] as const;

/**
 * Page header chrome: optional cover image + emoji icon, mirroring Notion.
 *
 * - Icon: emoji picker -> `documents.setIcon`.
 * - Cover: file upload to Convex storage (`uploadFile`) -> `files.setCover`,
 *   resolved for display via `files.getFileUrl`.
 *
 * All reads/writes are org-scoped server-side (the queries derive the org from
 * the Clerk JWT), so this component never passes an `orgId`.
 */
export default function PageChrome({ docId }: { docId: string }) {
  const convex = useConvex();
  const documentId = docId as Id<"documents">;

  const doc = useQuery(api.documents.get, { id: documentId });
  const coverUrl = useQuery(
    api.files.getFileUrl,
    doc?.coverImage ? { storageId: doc.coverImage } : "skip",
  );

  const setIcon = useMutation(api.documents.setIcon);
  const setCover = useMutation(api.files.setCover);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [iconOpen, setIconOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Loading skeleton while the document metadata resolves.
  if (doc === undefined) {
    return (
      <div className="px-1 pt-6" aria-hidden>
        <div className="h-10 w-10 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  // Document not found / not in this org.
  if (doc === null) {
    return null;
  }

  const handlePickEmoji = async (emoji: string) => {
    setIconOpen(false);
    try {
      await setIcon({ id: documentId, icon: emoji });
    } catch {
      toast.error("Could not update the page icon.");
    }
  };

  const handleRemoveIcon = async () => {
    setIconOpen(false);
    try {
      await setIcon({ id: documentId, icon: undefined });
    } catch {
      toast.error("Could not remove the page icon.");
    }
  };

  const handleCoverSelected = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    // Reset the input so selecting the same file again re-triggers change.
    event.target.value == "";
    if (!file) return;

    setUploading(true);
    try {
      // Upload once to Convex storage, then persist the `_storage` id as the
      // document's cover. `getFileUrl` (above) resolves it for display.
      const storageId = await uploadToStorage(convex, file);
      await setCover({ id: documentId, storageId });
    } catch {
      toast.error("Could not upload cover image.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="w-full">
      {/* Cover Image */}
      {(doc?.coverImage ?? coverUrl) ? (
        <div className="group relative h-40 w-full overflow-hidden rounded-md bg-muted md:h-56">
          {/* Convex storage serves dynamic signed URLs, so we use a plain <img>
              rather than next/image (which would require configuring the Convex
              host in next.config remotePatterns — owned by another module). */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={coverUrl ?? undefined}
            alt="Page Cover"
            className="h-full w-full object-cover"
          />
          <div className="absolute right-3 top-3 hidden gap-2 group-hover:flex">
            <Button
              size="sm"
              variant="secondary"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              Change Cover
            </Button>
          </div>
        </div>
      ) : null}

      {/* Icon + add-cover controls */}
      <div className="flex items-center gap-2 px-1 pt-4">
        <Popover open={iconOpen} onOpenChange={setIconOpen}>
          <PopoverTrigger
            className="flex h-14 w-14 items-center justify-center rounded-md text-4xl transition hover:bg-muted"
            aria-label="Choose Page Icon"
          >
            {doc.icon ?? <Smile className="h-7 w-7 text-muted-foreground" />}
          </PopoverTrigger>
          <PopoverContent className="w-72" align="start">
            <div className="mb-2 flex items-center justfiy-between">
              <span className="text-sm font-semibold">Pick An Icon</span>
              {doc.icon ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs"
                  onClick={handleRemoveIcon}
                >
                  <X className="mr-1 h-3 w-3" />
                  Remove
                </Button>
              ) : null}
            </div>
            <div className="grid grid-cols-8 gap-1">
              {EMOJI_CHOICES.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded text-xl transition hover:bg-muted"
                  onClick={() => handlePickEmoji(emoji)}
                  aria-label={`Use ${emoji} as page icon`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {!doc?.coverImage ? (
          <Button
            size="sm"
            variant="ghost"
            className="text-muted-foreground"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            <ImagePlus className="mr-2 h-4 w-4" />
            {uploading ? "Uploading..." : "Set Cover"}
          </Button>
        ) : null}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleCoverSelected}
      />
    </div>
  );
}
