"use client";

import { useRouter } from "next/navigation";
import Shell from "@/components/Shell";
import Scanner from "@/components/Scanner";

export default function ScanPage() {
  const router = useRouter();
  return (
    <Shell title="Scan Gear">
      <p className="mb-3 text-sm text-n500">
        Point the camera at a gear label. The item opens automatically.
      </p>
      <Scanner onCode={(code) => router.push(`/i/${code}`)} />
    </Shell>
  );
}
