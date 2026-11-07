import { Suspense } from "react";
import { SignUp } from "@clerk/nextjs";

import { Skeleton } from "@/components/ui/skeleton";

// <SignUp> reads the URL (usePathname) at runtime. Under Cache Components that
// must stream in behind a Suspense boundary so the page shell can prerender.
export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Suspense fallback={<Skeleton className="h-96 w-full max-w-sm" />}>
        <SignUp />
      </Suspense>
    </div>
  );
}
