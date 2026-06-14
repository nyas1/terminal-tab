declare const browser: any;
declare const chrome: any;

interface CacheEntry {
  base64: string;
  fetchedAt: number;
}

const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

const getStorage = () => {
  if (typeof browser !== 'undefined' && browser.storage?.local) {
    return browser.storage.local;
  }
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    return chrome.storage.local;
  }
  return null;
};

const getCacheEntry = async (domain: string): Promise<CacheEntry | null> => {
  const key = `fav_${domain}`;
  const storage = getStorage();
  if (storage) {
    return new Promise((resolve) => {
      storage.get(key, (items: any) => {
        resolve((items[key] as CacheEntry) || null);
      });
    });
  }
  try {
    const val = localStorage.getItem(key);
    return val ? (JSON.parse(val) as CacheEntry) : null;
  } catch {
    return null;
  }
};

const setCacheEntry = async (domain: string, entry: CacheEntry): Promise<void> => {
  const key = `fav_${domain}`;
  const storage = getStorage();
  if (storage) {
    return new Promise((resolve) => {
      storage.set({ [key]: entry }, () => resolve());
    });
  }
  try {
    localStorage.setItem(key, JSON.stringify(entry));
  } catch (err) {
    console.error('localStorage write failed:', err);
  }
};

const PALETTE = [
  '#2b3a4a', // Slate Blue
  '#1b4332', // Forest Green
  '#5c3d2e', // Warm Amber
  '#4a2840', // Deep Purple
  '#5e1c1c', // Rust Red
  '#104c64', // Ocean Teal
  '#2a2b2d', // Charcoal
  '#6b4423'  // Bronze
];

const getDeterministicColor = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % PALETTE.length;
  return PALETTE[index];
};

export const getLetterAvatar = (domain: string): string => {
  const host = domain.trim().toLowerCase();
  const cleanHost = host.startsWith('www.') ? host.slice(4) : host;
  const letter = (cleanHost.charAt(0) || '?').toUpperCase();

  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.fillStyle = getDeterministicColor(cleanHost);
  ctx.fillRect(0, 0, 64, 64);

  ctx.font = 'bold 36px "Courier New", Courier, monospace';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(letter, 32, 32);

  return canvas.toDataURL('image/png');
};

const resizeFaviconBlob = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 64;
          canvas.height = 64;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, 64, 64);
            resolve(canvas.toDataURL('image/png'));
          } else {
            resolve(dataUrl);
          }
        } catch {
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    };
    reader.onerror = () => reject(new Error('reader-error'));
    reader.readAsDataURL(blob);
  });

const fetchChain = async (domain: string): Promise<string | null> => {
  const urls = [
    `https://favicone.com/${domain}?s=64`,
    `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
    `https://${domain}/favicon.ico`
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url, { mode: 'cors', cache: 'force-cache' });
      if (!res.ok) continue;

      const blob = await res.blob();
      if (!blob || blob.size < 100) continue;

      const dataUrl = await resizeFaviconBlob(blob);
      if (dataUrl.startsWith('data:')) {
        return dataUrl;
      }
    } catch {
      // Try next
    }
  }
  return null;
};

export const getFavicon = async (domain: string): Promise<string | null> => {
  const host = domain.trim().toLowerCase();
  if (!host) return null;

  const entry = await getCacheEntry(host);
  const now = Date.now();

  if (entry) {
    const isExpired = now - entry.fetchedAt > CACHE_TTL_MS;
    if (isExpired) {
      void fetchChain(host).then(async (newBase64) => {
        await setCacheEntry(host, {
          base64: newBase64 || '',
          fetchedAt: Date.now()
        });
      });
    }
    return entry.base64 || `https://favicone.com/${host}?s=64`;
  }

  void fetchChain(host).then(async (newBase64) => {
    await setCacheEntry(host, {
      base64: newBase64 || '',
      fetchedAt: Date.now()
    });
  });

  return `https://favicone.com/${host}?s=64`;
};

export const renderShortcut = (domain: string, imgElement: HTMLImageElement): void => {
  const host = domain.trim().toLowerCase();
  if (!host) return;

  imgElement.setAttribute('data-favicon-domain', host);

  const avatar = getLetterAvatar(host);
  imgElement.src = avatar;

  void getFavicon(host).then((faviconBase64) => {
    if (faviconBase64 && imgElement.getAttribute('data-favicon-domain') === host) {
      imgElement.src = faviconBase64;
    }
  });
};

export const clearFaviconCache = async (): Promise<void> => {
  const storage = getStorage();
  if (storage) {
    return new Promise((resolve) => {
      storage.get(null, (items: any) => {
        const keysToRemove = Object.keys(items).filter((k) => k.startsWith('fav_'));
        if (keysToRemove.length > 0) {
          storage.remove(keysToRemove, () => resolve());
        } else {
          resolve();
        }
      });
    });
  }
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('fav_')) {
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) {
      localStorage.removeItem(key);
    }
  } catch {}
};
