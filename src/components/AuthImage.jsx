import { useState, useEffect } from 'react';

export default function AuthImage({ src, token, className, style }) {
  const [imgSrc, setImgSrc] = useState(null);

  useEffect(() => {
    let objectUrl = null;
    fetch(src, { headers: { 'Authorization': token } })
      .then(res => {
        if (!res.ok) throw new Error('Bad image');
        return res.blob();
      })
      .then(blob => {
        objectUrl = URL.createObjectURL(blob);
        setImgSrc(objectUrl);
      })
      .catch(() => {});
      
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [src, token]);

  if (!imgSrc) return <div className={className} style={{ background: 'var(--surface)', ...style }}></div>;
  return <div className={className} style={{ backgroundImage: `url(${imgSrc})`, ...style }}></div>;
}
