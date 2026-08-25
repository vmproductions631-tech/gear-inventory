"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

/**
 * Camera QR scanner. Calls onCode with the decoded text (deduplicated so one
 * physical scan fires once). QR codes encode the item URL; we extract the
 * short code from a /i/<code> path, or pass raw text through.
 */
export default function Scanner({
  onCode,
  paused = false,
}: {
  onCode: (code: string) => void;
  paused?: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const lastRef = useRef<{ text: string; at: number }>({ text: "", at: 0 });
  // The camera callback below is registered once and lives for the life of the
  // scanner, so it reads the latest props through refs rather than being torn
  // down and rebuilt on every prop change. Writing a ref during render is not
  // safe under concurrent rendering, so the sync happens after commit.
  const onCodeRef = useRef(onCode);
  const pausedRef = useRef(paused);

  useEffect(() => {
    onCodeRef.current = onCode;
  }, [onCode]);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    const id = "qr-scanner-region";
    const scanner = new Html5Qrcode(id);
    let stopped = false;

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 8, qrbox: { width: 220, height: 220 } },
        (text) => {
          if (pausedRef.current) return;
          const now = Date.now();
          if (
            text === lastRef.current.text &&
            now - lastRef.current.at < 2500
          ) {
            return;
          }
          lastRef.current = { text, at: now };
          const m = text.match(/\/i\/([A-Za-z0-9]+)\s*$/);
          onCodeRef.current(m ? m[1] : text.trim());
        },
        () => {}
      )
      .catch((e) => {
        setError(
          e instanceof Error ? e.message : "Camera unavailable — check permissions."
        );
      });

    return () => {
      if (!stopped) {
        stopped = true;
        scanner
          .stop()
          .then(() => scanner.clear())
          .catch(() => {});
      }
    };
  }, []);

  return (
    <div>
      <div id="qr-scanner-region" className="overflow-hidden rounded-xl" />
      {error && (
        <p className="mt-2 rounded-lg bg-error/10 p-3 text-sm text-error">
          {error}
        </p>
      )}
    </div>
  );
}
