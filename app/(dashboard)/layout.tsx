import type { ReactNode } from "react";

import AppSidebar from "@/components/sidebar/AppSidebar";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex h-screen w-full overflow-hidden">
      <AppSidebar />

      <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
