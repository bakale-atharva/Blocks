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

  return <>PageChrome</>;
}
