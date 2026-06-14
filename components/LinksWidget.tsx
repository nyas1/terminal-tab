import React from 'react';
import { LinkGroup } from '../types';
import { sanitizeUrl } from '../utils/urlUtils';
import { useAppContext } from '../contexts/AppContext';
import { getFavicon, getLetterAvatar } from '../utils/faviconCache';

interface LinksWidgetProps {
    groups: LinkGroup[];
    openInNewTab?: boolean;
    linkIconMode?: 'favicon' | 'arrow' | 'hide';
}

const getFaviconUrl = (rawUrl: string): string | null => {
    const safeUrl = sanitizeUrl(rawUrl);
    if (!safeUrl || safeUrl === 'about:blank') return null;
    if (safeUrl.startsWith('mailto:')) return null;

    try {
        const parsed = new URL(safeUrl, window.location.origin);
        if (!parsed.hostname) return null;
        return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(parsed.hostname)}&sz=32`;
    } catch {
        return null;
    }
};

const getHostname = (rawUrl: string): string | null => {
    const safeUrl = sanitizeUrl(rawUrl);
    if (!safeUrl || safeUrl === 'about:blank' || safeUrl.startsWith('mailto:')) return null;
    try {
        const parsed = new URL(safeUrl, window.location.origin);
        return parsed.hostname ? parsed.hostname.toLowerCase() : null;
    } catch {
        return null;
    }
};

const getSafeOverrideFaviconUrl = (rawUrl?: string): string | null => {
    if (!rawUrl || !rawUrl.trim()) return null;
    const safeUrl = sanitizeUrl(rawUrl.trim());
    if (!safeUrl || safeUrl === 'about:blank') return null;
    return safeUrl;
};

const ShortcutLink: React.FC<{ label: string; url: string; openInNewTab: boolean; linkIconMode: 'favicon' | 'arrow' | 'hide'; faviconOverride?: string; refreshNonce: number }> = ({ label, url, openInNewTab, linkIconMode, faviconOverride, refreshNonce }) => {
    const [iconHidden, setIconHidden] = React.useState(false);
    const faviconUrl = getSafeOverrideFaviconUrl(faviconOverride) || getFaviconUrl(url);
    const hostname = getHostname(url);
    const usingOverride = Boolean(getSafeOverrideFaviconUrl(faviconOverride));

    const [resolvedFavicon, setResolvedFavicon] = React.useState<string | null>(() => {
        if (linkIconMode === 'hide' || linkIconMode === 'arrow' || !faviconUrl) return null;
        if (usingOverride || !hostname) return faviconUrl;
        return getLetterAvatar(hostname);
    });

    React.useEffect(() => {
        setIconHidden(false);
    }, [faviconUrl, linkIconMode, refreshNonce]);

    React.useEffect(() => {
        let cancelled = false;
        const run = async () => {
            if (linkIconMode === 'hide' || !faviconUrl) {
                setResolvedFavicon(null);
                return;
            }
            if (linkIconMode === 'arrow') {
                setResolvedFavicon(null);
                return;
            }
            if (usingOverride || !hostname) {
                setResolvedFavicon(faviconUrl);
                return;
            }

            try {
                const cached = await getFavicon(hostname);
                if (cached && !cancelled) {
                    setResolvedFavicon(cached);
                }
            } catch {
                // Keep the letter avatar on error
            }
        };
        void run();
        return () => {
            cancelled = true;
        };
    }, [faviconUrl, hostname, linkIconMode, usingOverride, refreshNonce]);

    return (
        <a
            href={sanitizeUrl(url)}
            target={openInNewTab ? "_blank" : "_self"}
            rel="noopener noreferrer"
            className="text-[var(--color-muted)] hover:text-[var(--color-fg)] hover:text-shadow-glow transition-all duration-[20ms] text-sm truncate block"
            title={url}
        >
            <span className="inline-flex items-center gap-2">
                {linkIconMode === 'favicon' && !iconHidden && resolvedFavicon ? (
                    <img
                        src={resolvedFavicon}
                        alt=""
                        width={14}
                        height={14}
                        className="inline-block opacity-80"
                        onError={() => {
                            const avatar = hostname ? getLetterAvatar(hostname) : null;
                            if (resolvedFavicon !== avatar && avatar) {
                                setResolvedFavicon(avatar);
                            } else {
                                setIconHidden(true);
                            }
                        }}
                    />
                ) : linkIconMode === 'hide' ? null : (
                    <span className="inline-block w-[14px] text-center opacity-50">&gt;</span>
                )}
                <span className="truncate">{label}</span>
            </span>
        </a>
    );
};

export const LinksWidget: React.FC<LinksWidgetProps> = ({ groups, openInNewTab = true, linkIconMode = 'favicon' }) => {
    const { faviconRefreshNonce } = useAppContext();
    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 h-full overflow-y-auto custom-scrollbar pr-2">
            {groups.map((group) => (
                <div key={group.category} className="flex flex-col gap-2 min-w-0">
                    <h4 className="text-[var(--color-muted)] text-xs font-bold uppercase mb-1 tracking-wider border-b border-[var(--color-border)] pb-1 w-max">
                        {group.category}
                    </h4>
                    {group.links.length === 0 && (
                        <span className="text-[var(--color-muted)] text-xs italic opacity-50">empty</span>
                    )}
                    {group.links.map(link => (
                        <ShortcutLink
                            key={`${link.label}-${link.url}`}
                            label={link.label}
                            url={link.url}
                            openInNewTab={openInNewTab}
                            linkIconMode={linkIconMode}
                            faviconOverride={link.favicon}
                            refreshNonce={faviconRefreshNonce}
                        />
                    ))}
                </div>
            ))}
            {groups.length === 0 && (
                <div className="col-span-full flex items-center justify-center text-[var(--color-muted)]">
                    No shortcuts configured. Open settings (top right) to add some.
                </div>
            )}
        </div>
    );
};
