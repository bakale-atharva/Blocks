"use client";

import { useMutation, useQuery } from "convex/react";
import { useParams, useRouter } from "next/navigation";
import { FileText, Folder, Star } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Sidebar "Favorites" section: lists the org's starred documents and lets the
 * user navigate to or un-star each one. Hidden entirely when there are no
 * favorites so it doesn't clutter the sidebar.
 */
export default function FavoritesSection() {
  const router = useRouter();
  const params = useParams<{ id?: string }>();
  const favorites = useQuery(api.documents.listFavorites, {});
  const toggleFavorite = useMutation(api.documents.toggleFavorite);

  return <div>FavoritesSection</div>;
}
