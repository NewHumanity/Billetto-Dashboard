import React, { useState, useEffect, useRef, useContext } from 'react';
import { useSearch, SearchResult, SearchResultGroup } from '../hooks/useSearch';
import { AppContext } from '../contexts/AppContext';
import { SearchIcon, SearchLargeIcon, CalendarIcon, TicketIcon, UserIcon, CampaignIcon, TargetGroupIcon } from './icons';

interface GlobalSearchProps {
    onClose: () => void;
}

const typeIconMap: { [key: string]: React.ReactNode } = {
    'Event': <CalendarIcon />,
    'Order': <TicketIcon />,
    'Attendee': <UserIcon />,
    'Campaign': <CampaignIcon />,
    'Target Group': <TargetGroupIcon />,
};

const GlobalSearch: React.FC<GlobalSearchProps> = ({ onClose }) => {
    const [query, setQuery] = useState('');
    const [activeIndex, setActiveIndex] = useState(0);
    const searchResults = useSearch(query);
    const inputRef = useRef<HTMLInputElement>(null);
    const context = useContext(AppContext);

    useEffect(() => {
        inputRef.current?.focus();
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, []);
    
    // Flatten results for keyboard navigation
    const flatResults = React.useMemo(() => searchResults.flatMap(g => g.results), [searchResults]);

    useEffect(() => {
        setActiveIndex(0);
    }, [query]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex(prev => (prev + 1) % flatResults.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex(prev => (prev - 1 + flatResults.length) % flatResults.length);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const selectedItem = flatResults[activeIndex];
            if (selectedItem) {
                handleSelect(selectedItem);
            }
        }
    };

    const handleSelect = (item: SearchResult) => {
        if (item.type === 'Action') {
            item.action();
        } else if (context) {
            switch (item.type) {
                case 'Event':
                    context.navigateTo('dashboard', item.id);
                    break;
                case 'Order':
                    context.navigateTo('orders', item.id);
                    break;
                case 'Attendee':
                    context.navigateTo('attendees', item.id);
                    break;
                case 'Campaign':
                    context.navigateTo('campaigns', item.id);
                    break;
                case 'Target Group':
                    context.navigateTo('targetGroups', item.id);
                    break;
            }
        }
    };

    const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div onClick={handleBackdropClick} className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center pt-12 md:pt-24 p-4 z-50 animate-fade-in">
            <div className="w-full max-w-2xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-gray-200 dark:border-slate-700 rounded-2xl shadow-2xl h-fit max-h-[70vh] flex flex-col" onKeyDown={handleKeyDown}>
                <div className="flex items-center gap-4 p-4 border-b border-gray-200 dark:border-slate-700/50">
                    <div className="text-slate-400">
                        <SearchIcon />
                    </div>
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Search for events, orders, attendees..."
                        className="w-full bg-transparent text-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
                    />
                </div>
                
                <div className="overflow-y-auto">
                    {query && searchResults.length > 0 ? (
                        searchResults.map(group => (
                            <div key={group.label} className="p-2">
                                <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase px-3 pt-2 pb-1">{group.label}</h3>
                                <ul>
                                    {group.results.map(item => {
                                        const currentIndex = flatResults.findIndex(r => r.id === item.id);
                                        const isAction = item.type === 'Action';
                                        
                                        return (
                                            <li key={item.id}>
                                                <button
                                                    onClick={() => handleSelect(item)}
                                                    className={`w-full flex items-center gap-4 text-left p-3 rounded-lg transition-colors ${activeIndex === currentIndex ? 'bg-brand-primary/20 text-brand-primary' : 'hover:bg-gray-100 dark:hover:bg-slate-700/50'}`}
                                                >
                                                    <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center text-slate-500 dark:text-slate-400">
                                                        {isAction ? (
                                                            item.isLoading ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-400"></div> : <SearchIcon/>
                                                        ) : typeIconMap[item.type]}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-slate-800 dark:text-white font-semibold truncate">{item.title}</p>
                                                        {item.subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{item.subtitle}</p>}
                                                    </div>
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        ))
                    ) : (
                        <div className="text-center p-16 text-slate-500 dark:text-slate-400">
                            <div className="flex justify-center mb-4"><SearchLargeIcon /></div>
                            <p>{query ? 'No results found.' : 'Find anything in your Billetto account.'}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GlobalSearch;