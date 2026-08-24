"use client";

import { useEffect, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";

const NAV = [
  { href: "/", label: "Home", icon: "⌂" },
  { href: "/items", label: "Items", icon: "▤" },
  { href: "/scan", label: "Scan", icon: "▣" },
  { href: "/loadouts", label: "Load-outs", icon: "▥" },
  { href: "/more", label: "More", icon: "⋯" },
];

export default function Shell({
  title,
  children,
  back,
}: {
  title?: string;
  children: ReactNode;
  back?: string;
}) {
  const { session, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !session) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [loading, session, router, pathname]);

  if (loading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink">
        <Image
          src="/brand/logo-stacked-light.png"
          alt="Vision Maker Productions"
          width={160}
          height={120}
          priority
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col pb-20">
      <header className="no-print sticky top-0 z-20 flex items-center gap-3 bg-ink px-4 py-3 text-paper">
        {back ? (
          <Link href={back} className="text-xl leading-none" aria-label="Back">
            ‹
          </Link>
        ) : (
          <Image
            src="/brand/logo-icon.png"
            alt=""
            width={26}
            height={26}
            priority
          />
        )}
        <h1 className="text-lg leading-tight">{title ?? "VMP Gear"}</h1>
      </header>
      <main className="flex-1 px-4 py-4">{children}</main>
      <nav className="no-print fixed inset-x-0 bottom-0 z-20 border-t border-n200 bg-paper">
        <div className="mx-auto flex max-w-lg items-stretch justify-between">
          {NAV.map((n) => {
            const active =
              n.href === "/" ? pathname === "/" : pathname.startsWith(n.href);
            const isScan = n.href === "/scan";
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] ${
                  isScan
                    ? "font-semibold text-gold-deep"
                    : active
                      ? "font-semibold text-ink"
                      : "text-n500"
                }`}
              >
                <span
                  className={`text-lg leading-none ${
                    isScan
                      ? "flex h-8 w-8 items-center justify-center rounded-full bg-gold text-ink"
                      : ""
                  }`}
                >
                  {n.icon}
                </span>
                {n.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
