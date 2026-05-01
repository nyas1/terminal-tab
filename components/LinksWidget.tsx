import React from 'react';
import { LinkGroup } from '../types';
import { sanitizeUrl } from '../utils/urlUtils';

interface LinksWidgetProps {
    groups: LinkGroup[];
    openInNewTab?: boolean;
    showFavicons?: boolean;
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

const getSafeOverrideFaviconUrl = (rawUrl?: string): string | null => {
    if (!rawUrl || !rawUrl.trim()) return null;
    const safeUrl = sanitizeUrl(rawUrl.trim());
    if (!safeUrl || safeUrl === 'about:blank') return null;
    return safeUrl;
};

const ShortcutLink: React.FC<{ label: string; url: string; openInNewTab: boolean; showFavicons: boolean; faviconOverride?: string }> = ({ label, url, openInNewTab, showFavicons, faviconOverride }) => {
    const [iconHidden, setIconHidden] = React.useState(false);
    const faviconUrl = getSafeOverrideFaviconUrl(faviconOverride) || getFaviconUrl(url);

    React.useEffect(() => {
        setIconHidden(false);
    }, [faviconUrl, showFavicons]);

    return (
        <a
            href={sanitizeUrl(url)}
            target={openInNewTab ? "_blank" : "_self"}
            rel="noopener noreferrer"
            className="text-[var(--color-muted)] hover:text-[var(--color-fg)] hover:text-shadow-glow transition-all duration-[20ms] text-sm truncate block"
            title={url}
        >
            <span className="inline-flex items-center gap-2">
                {showFavicons && !iconHidden && faviconUrl ? (
                    <img
                        src={faviconUrl}
                        alt=""
                        width={14}
                        height={14}
                        className="inline-block opacity-80"
                        onError={() => setIconHidden(true)}
                    />
                ) : (
                    <span className="inline-block w-[14px] text-center opacity-50">&gt;</span>
                )}
                <span className="truncate">{label}</span>
            </span>
        </a>
    );
};

export const LinksWidget: React.FC<LinksWidgetProps> = ({ groups, openInNewTab = true, showFavicons = true }) => {
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
                            showFavicons={showFavicons}
                            faviconOverride={link.favicon}
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