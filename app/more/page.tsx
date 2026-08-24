"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Shell from "@/components/Shell";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";

export default function MorePage() {
  const router = useRouter();
  const { email } = useAuth();

  const link =
    "flex items-center justify-between rounded-xl bg-paper p-4 font-medium";

  return (
    <Shell title="More">
      <div className="space-y-2">
        <Link href="/kits" className={link}>
          Kits <span className="text-n400">›</span>
        </Link>
        <Link href="/people" className={link}>
          Crew <span className="text-n400">›</span>
        </Link>
        <Link href="/rentals" className={link}>
          Rentals <span className="text-n400">›</span>
        </Link>
      </div>
      <div className="mt-8 rounded-xl bg-paper p-4 text-center">
        <Image
          src="/brand/logo-lockup-dark.png"
          alt="Vision Maker Productions"
          width={180}
          height={40}
          className="mx-auto mb-2 h-8 w-auto"
        />
        <p className="mb-3 text-xs text-n500">Signed in as {email}</p>
        <button
          onClick={async () => {
            await supabase().auth.signOut();
            router.replace("/login");
          }}
          className="rounded-lg border border-n300 px-4 py-2 text-sm font-medium"
        >
          Sign Out
        </button>
      </div>
    </Shell>
  );
}
