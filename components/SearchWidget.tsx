import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { SEARCH_ENGINES } from '../constants';

const ENGINES = SEARCH_ENGINES;

export const SearchWidget: React.FC = () => {
    const {
        searchSlashHotkeyEnabled,
        searchDefaultEngine,
        setSearchDefaultEngine,
        searchEnabledEngines
    } = useAppContext();
    const [query, setQuery] = useState('');
    
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const handleSlashHotkey = (e: KeyboardEvent) => {
            if (!searchSlashHotkeyEnabled) return;
            if (e.key !== '/') return;
            if (e.ctrlKey || e.metaKey || e.altKey) return;

            const target = e.target as HTMLElement | null;
            const tagName = target?.tagName?.toLowerCase();
            const isTypingTarget =
                tagName === 'input' ||
                tagName === 'textarea' ||
                target?.isContentEditable;

            if (isTypingTarget) return;

            e.preventDefault();
            inputRef.current?.focus();
        };

        window.addEventListener('keydown', handleSlashHotkey);
        return () => window.removeEventListener('keydown', handleSlashHotkey);
    }, [searchSlashHotkeyEnabled]);

    const enabledEngines = ENGINES.filter((engine) => searchEnabledEngines.includes(engine.id));
    const cycleEngines = enabledEngines.length ? enabledEngines : ENGINES;
    const currentEngine = cycleEngines.find((engine) => engine.id === searchDefaultEngine) || cycleEngines[0];

    const cycleEngine = () => {
        const currentIndex = cycleEngines.findIndex((engine) => engine.id === currentEngine.id);
        const nextIndex = (currentIndex + 1) % cycleEngines.length;
        setSearchDefaultEngine(cycleEngines[nextIndex].id);
        inputRef.current?.focus();
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;

        window.open(currentEngine.url + encodeURIComponent(query), '_blank', 'noopener,noreferrer');
        setQuery('');
        inputRef.current?.blur();
    };

    return (
        <div 
            className="h-full flex flex-col justify-center px-2 relative"
        >
            <form onSubmit={handleSearch} className="flex items-center gap-2 w-full z-20">
                <button 
                    type="button"
                    onClick={cycleEngine}
                    className="shrink-0 text-[var(--color-accent)] hover:text-[var(--color-fg)] font-bold font-mono transition-colors select-none"
                    title="Click to switch search engine"
                >
                    [{currentEngine.label}]
                </button>
                <div className="flex-1 relative group">
                     <span className="absolute left-0 top-1/2 -translate-y-1/2 text-[var(--color-muted)] font-bold pointer-events-none">
                        &gt;
                    </span>
                    <input 
                        ref={inputRef}
                        type="text" 
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="w-full bg-transparent border-none outline-none text-[var(--color-fg)] placeholder-[var(--color-muted)] font-mono pl-4 focus:placeholder-opacity-50 h-full py-1"
                        placeholder="search..."
                        autoComplete="off"
                    />
                </div>
                <button 
                    type="submit"
                    className="text-[var(--color-muted)] hover:text-[var(--color-fg)] text-xs font-mono"
                >
                    [ENTER]
                </button>
            </form>
        </div>
    );
};
