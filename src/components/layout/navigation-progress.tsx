"use client";

import { usePathname } from "next/navigation";
import { startTransition, useEffect, useRef, useState } from "react";

export function NavigationProgress() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const prevPathname = useRef(pathname);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

  // Start progress bar immediately on internal link click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const link = (e.target as HTMLElement).closest("a");
      if (!link || !link.href) return;

      try {
        const url = new URL(link.href, window.location.origin);
        // Only trigger for internal navigation to different pages
        if (
          url.origin === window.location.origin &&
          url.pathname !== window.location.pathname
        ) {
          setLoading(true);
          // Safety timeout — hide after 5s max
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          timeoutRef.current = setTimeout(() => setLoading(false), 5000);
        }
      } catch {
        // Invalid URL, ignore
      }
    }

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);

  // When pathname changes, navigation is complete
  useEffect(() => {
    if (pathname !== prevPathname.current) {
      prevPathname.current = pathname;
      startTransition(() => {
        setLoading(false);
      });
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    }
  }, [pathname]);

  if (!loading) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-[3px] pointer-events-none">
      <div
        className="h-full bg-brand rounded-r-full"
        style={{
          animation: "nav-progress 2s ease-out forwards",
        }}
      />
    </div>
  );
}
