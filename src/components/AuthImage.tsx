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
    fetch(src, { headers: { 'Authorization': token || '' } })
      .then(res => {
        if (!res.ok) throw new Error('Bad image');
        return res.blob();
      })
      .then(blob => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setImgSrc(objectUrl);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src, token]);

  if (!imgSrc) return <div className={className} style={{ background: 'var(--surface)', ...style }}></div>;
  return <div className={className} style={{ backgroundImage: `url(${imgSrc})`, ...style }}></div>;
}
