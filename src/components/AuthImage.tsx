import { useState, useEffect, CSSProperties } from 'react';

interface AuthImageProps {
  src: string | null;
  token?: string;
  className?: string;
  style?: CSSProperties;
}

export default function AuthImage({ src, token, className, style }: AuthImageProps) {
  const [imgSrc, setImgSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!src) { setImgSrc(null); return; }
    let objectUrl: string | null = null;
    let cancelled = false;
    let done = false;

    const cleanup = () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };

    fetch(src, { headers: { 'Authorization': token || '' }, cache: 'force-cache' })
      .then(res => {
        if (cancelled || done) return null;
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.blob();
      })
      .then(blob => {
        if (!blob || cancelled || done) return;
        objectUrl = URL.createObjectURL(blob);
        done = true;
        setImgSrc(objectUrl);
      })
      .catch(() => {
        if (cancelled || done) return;
        // Fallback: fetch via Electron main process to bypass CORS restrictions
        if (!window.electronAPI?.fetchImage) return;
        window.electronAPI.fetchImage(src, token || undefined)
          .then(base64 => {
            if (cancelled || done || !base64) return;
            const ext = src.toLowerCase().match(/\.(png|gif|webp)$/)?.[1];
            const mime = ext ? `image/${ext}` : 'image/jpeg';
            const binary = atob(base64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            objectUrl = URL.createObjectURL(new Blob([bytes], { type: mime }));
            done = true;
            setImgSrc(objectUrl);
          })
          .catch(() => {});
      });

    return cleanup;
  }, [src, token]);

  if (!imgSrc) return <div className={className} style={{ background: 'var(--surface)', ...style }} />;
  return <div className={className} style={{ backgroundImage: `url(${imgSrc})`, ...style }}></div>;
}
