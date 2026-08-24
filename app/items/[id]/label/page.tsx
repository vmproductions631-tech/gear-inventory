"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useParams } from "next/navigation";
import QRCode from "qrcode";
import Shell from "@/components/Shell";
import { itemUrl } from "@/lib/actions";
import { supabase } from "@/lib/supabase";
import type { Item } from "@/lib/types";

/**
 * Printable label: QR + one-color logo mark + item name, sized for small
 * thermal labels (~50 × 30 mm). Also offers the raw QR PNG for use inside
 * the label printer's own app.
 */
export default function LabelPage() {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<Item | null>(null);
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    supabase()
      .from("items")
      .select("*")
      .eq("id", id)
      .maybeSingle()
      .then(async ({ data }) => {
        if (!data) return;
        setItem(data as Item);
        const url = itemUrl((data as Item).short_code);
        const dataUrl = await QRCode.toDataURL(url, {
          errorCorrectionLevel: "M",
          margin: 1,
          width: 480,
          color: { dark: "#000000", light: "#ffffff" },
        });
        setQr(dataUrl);
      });
  }, [id]);

  if (!item) {
    return (
      <Shell title="Label" back={`/items/${id}`}>
        <p className="p-6 text-center text-n500">Loading…</p>
      </Shell>
    );
  }

  return (
    <Shell title="QR Label" back={`/items/${id}`}>
      <div
        className="label-card mx-auto flex w-[50mm] items-center gap-[2mm] rounded border border-n300 bg-white p-[2mm]"
        style={{ height: "30mm" }}
      >
        {qr && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={qr}
            alt={`QR ${item.short_code}`}
            className="h-[26mm] w-[26mm] shrink-0"
          />
        )}
        <div className="flex min-w-0 flex-1 flex-col items-start justify-between self-stretch py-[1mm]">
          <Image
            src="/brand/logo-icon-black.png"
            alt="Vision Maker Productions"
            width={40}
            height={40}
            className="h-[8mm] w-auto"
          />
          <p
            className="w-full text-[7pt] font-semibold leading-tight text-black"
            style={{ wordBreak: "break-word" }}
          >
            {item.name}
          </p>
          <p className="font-mono text-[5.5pt] text-black">{item.short_code}</p>
        </div>
      </div>

      <div className="no-print mt-6 space-y-2">
        <button
          onClick={() => window.print()}
          className="w-full rounded-lg bg-gold py-3 font-semibold text-ink"
        >
          Print Label
        </button>
        {qr && (
          <a
            href={qr}
            download={`vmp-${item.short_code}.png`}
            className="block w-full rounded-lg border border-n300 bg-paper py-3 text-center text-sm font-medium"
          >
            Download QR image (for label printer app)
          </a>
        )}
        <p className="text-center text-xs text-n400">
          Encodes {itemUrl(item.short_code)}
        </p>
      </div>
    </Shell>
  );
}
