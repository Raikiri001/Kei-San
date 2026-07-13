import { useEffect, useState } from "react";
import { loadImage } from "@/utils/fileToDataUrl";

/** Decodes a dataUrl into an HTMLImageElement, re-loading whenever the dataUrl changes. Pass null/undefined to skip. */
export function useLoadedImage(dataUrl: string | null | undefined): HTMLImageElement | null {
  const [img, setImg] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!dataUrl) {
      setImg(null);
      return;
    }
    let cancelled = false;
    loadImage(dataUrl).then((loaded) => {
      if (!cancelled) setImg(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [dataUrl]);

  return img;
}
