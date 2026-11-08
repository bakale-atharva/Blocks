"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useConvex } from "convex/react";
import { ImagePlus, Smile, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { errorMessage, uploadToStorage } from "@/lib/uploadFile";
import { useDebounced } from "@/lib/useDebounced";
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

/** Accepted cover types. The server enforces the same list (`convex/files.ts`). */
const COVER_ACCEPT = "image/png,image/jpeg,image/gif,image/webp,image/avif";

/** How long typing must pause before the title is saved. */
const TITLE_SAVE_DELAY_MS = 500;

/**
 * Page header: cover image, emoji icon, and the inline title, like Notion.
 *
 * - Title: an inline input, saved through `documents.rename` once typing
 *   pauses. The title lives on the `documents` row, so the sidebar and
 *   breadcrumbs update in real time.
 * - Icon: emoji picker, saved through `documents.setIcon`.
 * - Cover: uploaded to Convex storage, then `files.setCover` validates and
 *   saves it. `files.getCoverUrl` resolves it for display, only for the
 *   document's own org.
 *
 * When `readOnly` (the page is trashed), every control is disabled. The
 * server rejects those writes anyway.
 */
export default function PageChrome({
  doc,
  readOnly,
}: {
  doc: Doc<"documents">;
  readOnly: boolean;
}) {
  const convex = useConvex();
  const documentId = doc._id;

  const coverUrl = useQuery(
    api.files.getCoverUrl,
    doc.coverImage ? { id: documentId } : "skip",
  );

  const setIcon = useMutation(api.documents.setIcon);
  const setCover = useMutation(api.files.setCover);
  const removeCover = useMutation(api.files.removeCover);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [iconOpen, setIconOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handlePickEmoji = async (emoji: string | undefined) => {
    setIconOpen(false);
    try {
      await setIcon({ id: documentId, icon: emoji });
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't update the page icon."));
    }
  };

  const handleCoverSelected = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    // Reset the input so selecting the same file again re-triggers change.
    event.target.value = "";
    if (!file) return;

    setUploading(true);
    try {
      const storageId = await uploadToStorage(convex, documentId, file);
      await setCover({ id: documentId, storageId });
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't upload the cover image."));
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveCover = async () => {
    try {
      await removeCover({ id: documentId });
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't remove the cover."));
    }
  };

  const pickCover = () => fileInputRef.current?.click();

  return (
    <div className="w-full">
      {doc.coverImage ? (
        <div className="group relative h-40 w-full overflow-hidden rounded-md bg-muted md:h-56">
          {/* Convex storage serves dynamic signed URLs, so this is a plain
              <img> rather than next/image, which would need the Convex host
              in next.config remotePatterns. */}
          {coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : null}
          {!readOnly ? (
            <div className="absolute right-3 top-3 flex gap-2 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
              <Button
                size="sm"
                variant="secondary"
                disabled={uploading}
                onClick={pickCover}
              >
                {uploading ? "Uploading..." : "Change cover"}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={uploading}
                onClick={handleRemoveCover}
              >
                <Trash2 className="mr-1 h-3.5 w-3.5" />
                Remove
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="flex items-center gap-2 px-1 pt-4">
        <Popover open={iconOpen} onOpenChange={setIconOpen}>
          <PopoverTrigger
            disabled={readOnly}
            className="flex h-14 w-14 items-center justify-center rounded-md text-4xl transition hover:bg-muted disabled:pointer-events-none"
            aria-label="Choose page icon"
          >
            {doc.icon ?? <Smile className="h-7 w-7 text-muted-foreground" />}
          </PopoverTrigger>
          <PopoverContent className="w-72" align="start">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold">Pick an icon</span>
              {doc.icon ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs"
                  onClick={() => handlePickEmoji(undefined)}
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

        {!doc.coverImage && !readOnly ? (
          <Button
            size="sm"
            variant="ghost"
            className="text-muted-foreground"
            disabled={uploading}
            onClick={pickCover}
          >
            <ImagePlus className="mr-2 h-4 w-4" />
            {uploading ? "Uploading..." : "Add cover"}
          </Button>
        ) : null}
      </div>

      <TitleInput doc={doc} readOnly={readOnly} />

      <input
        ref={fileInputRef}
        type="file"
        accept={COVER_ACCEPT}
        className="hidden"
        onChange={handleCoverSelected}
      />
    </div>
  );
}

/**
 * The page title, edited in place.
 *
 * The draft is local while you type and saved once typing pauses. A rename
 * from someone else replaces the draft only while this input isn't focused,
 * so remote changes never overwrite what you're typing.
 */
function TitleInput({
  doc,
  readOnly,
}: {
  doc: Doc<"documents">;
  readOnly: boolean;
}) {
  const rename = useMutation(api.documents.rename);
  // `draft` is only used while focused; otherwise the input shows the
  // stored title, so remote renames appear without syncing state.
  const [draft, setDraft] = useState(doc.title);
  const [focused, setFocused] = useState(false);
  const debouncedDraft = useDebounced(draft, TITLE_SAVE_DELAY_MS);
  const lastSaved = useRef(doc.title);
  const cancelled = useRef(false);

  const save = (title: string) => {
    if (readOnly || title.trim() === lastSaved.current.trim()) return;
    lastSaved.current = title;
    // `rename` trims, caps, and maps an empty title to "Untitled".
    rename({ id: doc._id, title }).catch((error: unknown) => {
      toast.error(errorMessage(error, "Couldn't rename the page."));
    });
  };

  // Save once typing pauses.
  useEffect(() => {
    if (focused) save(debouncedDraft);
    // `save` is recreated each render; the debounced value is the trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedDraft]);

  return (
    <input
      aria-label="Page title"
      value={focused ? draft : doc.title}
      readOnly={readOnly}
      placeholder="Untitled"
      maxLength={200}
      onFocus={() => {
        cancelled.current = false;
        lastSaved.current = doc.title;
        setDraft(doc.title);
        setFocused(true);
      }}
      onBlur={() => {
        setFocused(false);
        if (!cancelled.current) save(draft);
      }}
      onChange={(event) => setDraft(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          event.currentTarget.blur();
        } else if (event.key === "Escape") {
          event.preventDefault();
          // Discard the draft. Anything already saved while typing stays.
          cancelled.current = true;
          event.currentTarget.blur();
        }
      }}
      className="mt-2 w-full bg-transparent px-1 text-4xl font-bold tracking-tight outline-none placeholder:text-muted-foreground/60 read-only:cursor-default"
    />
  );
}
