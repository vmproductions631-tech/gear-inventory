"use client";

import { useEffect, useState } from "react";
import { signPhoto } from "@/lib/photos";

/**
 * Renders a photo from a private-bucket storage path. The signed URL is
 * fetched on mount and expires, so it is never persisted anywhere.
 *
 * While signing, and if signing fails, the placeholder renders instead — a
 * photo that will not load must never leave a broken image or a gap.
 */
export default function Photo({
  path,
  alt,
  className,
  placeholder,
}: {
  path: string | null;
  alt: string;
  className: string;
  placeholder: React.ReactNode;
}) {
  // Keyed by path so a stale URL is never shown against a new photo, and so
  // clearing the path needs no synchronous state reset inside the effect.
  const [resolved, setResolved] = useState<{ path: string; url: string } | null>(
    null
  );

  useEffect(() => {
    if (!path) return;
    let live = true;
    signPhoto(path).then((url) => {
      if (live && url) setResolved({ path, url });
    });
    return () => {
      live = false;
    };
  }, [path]);

  const url = resolved && resolved.path === path ? resolved.url : null;

  if (!path || !url) return <>{placeholder}</>;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={alt} className={className} />
  );
}
