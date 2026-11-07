import { Suspense } from "react";
import { SignIn } from "@clerk/nextjs";

import { Skeleton } from "@/components/ui/skeleton";

// <SignIn> reads the URL (usePathname) at runtime. Under Cache Components that
// must stream in behind a Suspense boundary so the page shell can prerender.
export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Suspense fallback={<Skeleton className="h-96 w-full max-w-sm" />}>
        <SignIn />
      </Suspense>
    </div>
  );
}
