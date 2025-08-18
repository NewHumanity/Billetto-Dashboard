

import React, { useState, useEffect } from 'react';
import { BillettoEvent, EventListItemType } from '../types';
import { CalendarIcon, CurrencyIcon, TicketIcon } from './icons';
import { ChevronDownIcon } from './icons/ChevronDownIcon';

interface EventListItemProps {
    item: EventListItemType;
    isSelected: boolean;
    onSelect: (item: EventListItemType) => void;
}

const stateColorMap: { [key: string]: string } = {
    published: 'bg-green-100 dark:bg-green-500/20 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-500/30',
    completed: 'bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30',
    cancelled: 'bg-red-100 dark:bg-red-500/20 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-500/30',
    draft: 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-800 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-500/30',
    publishing: 'bg-purple-100 dark:bg-purple-500/20 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30',
    default: 'bg-slate-200 dark:bg-slate-600/50 text-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-500/50'
};

const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
};

const SingleEventRow: React.FC<{ event: BillettoEvent, isSelected: boolean, onSelect: () => void, isChild?: boolean }> = ({ event, isSelected, onSelect, isChild = false }) => {
    
    const itemClasses = `
        block w-full p-3 text-left transition-all duration-200 cursor-pointer
        ${isChild ? 'rounded-md' : 'rounded-lg'}
        ${isSelected 
            ? 'bg-brand-primary/10 dark:bg-slate-700/80 ring-2 ring-brand-primary' 
            : 'hover:bg-gray-100 dark:hover:bg-slate-700/50'
        }
    `;
    
    return (
        <div onClick={onSelect} className={itemClasses} role="button" aria-pressed={isSelected} tabIndex={0} onKeyPress={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect()}>
            <div className="flex justify-between items-start">
                <p className={`font-semibold pr-2 ${isSelected ? 'text-brand-primary dark:text-white' : 'text-slate-800 dark:text-slate-200'} ${isChild ? 'text-sm' : 'text-base'}`}>
                    {event.name}
                </p>
                <span className={`flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium capitalize whitespace-nowrap ${stateColorMap[event.state] || stateColorMap.default}`}>
                    {(event.state || '').replace('_', ' ')}
                </span>
            </div>
            <div className="mt-2 flex justify-between items-center text-sm text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-1.5">
                    <CalendarIcon className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                    <span>{formatDate(event.starts_at)}</span>
                </div>
                <div className="flex items-center gap-1.5 font-medium">
                    <CurrencyIcon className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                    <span>
                        {event.currency}
                    </span>
                </div>
            </div>
        </div>
    );
};


const EventListItem: React.FC<EventListItemProps> = ({ item, isSelected, onSelect }) => {
    const isGroup = 'isGroup' in item && item.children.length > 0;
    const [isExpanded, setIsExpanded] = useState(false);

    useEffect(() => {
        if (isSelected && isGroup) {
            setIsExpanded(true);
        }
    }, [isSelected, isGroup]);

    const handleKeyPress = (e: React.KeyboardEvent, eventItem: EventListItemType) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect(eventItem);
        }
    };

    if (!isGroup) {
        return (
            <li>
                <SingleEventRow event={item} isSelected={isSelected} onSelect={() => onSelect(item)} />
            </li>
        )
    }

    const group = item;
    const groupIsSelected = isSelected && !group.children.some(c => c.id === (isSelected && (item as any).id));

    const itemClasses = `
        block w-full p-4 rounded-lg text-left transition-all duration-200 cursor-pointer border
        ${groupIsSelected
            ? 'bg-brand-primary/10 dark:bg-slate-700/50 border-brand-primary shadow-lg' 
            : 'bg-white dark:bg-slate-800/60 border-transparent dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/80 hover:border-slate-200 dark:hover:border-slate-600'
        }
    `;

    return (
        <li className="bg-white dark:bg-slate-800/60 rounded-lg border border-gray-200 dark:border-slate-700/50">
             <div 
              onClick={() => onSelect(group)} 
              className={itemClasses} 
              role="button" 
              aria-pressed={groupIsSelected}
              tabIndex={0} 
              onKeyPress={(e) => handleKeyPress(e, group)}
            >
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                         <button 
                            onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }} 
                            className="p-1 rounded-full text-slate-500 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-600/50"
                            aria-expanded={isExpanded}
                            aria-label={isExpanded ? "Collapse event series" : "Expand event series"}
                        >
                            <ChevronDownIcon className={`w-5 h-5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>
                        <p className={`font-semibold text-base ${groupIsSelected ? 'text-brand-primary dark:text-white' : 'text-slate-800 dark:text-slate-200'}`}>
                            {group.name}
                        </p>
                    </div>
                    <span className={`flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium capitalize whitespace-nowrap bg-purple-100 dark:bg-purple-500/20 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30`}>
                        Series ({group.children.length})
                    </span>
                </div>
                <div className="mt-3 flex justify-between items-center text-sm text-slate-500 dark:text-slate-400 pl-9">
                    <div className="flex items-center gap-1.5">
                        <CalendarIcon className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                        <span>{group.children.length > 0 ? `${formatDate(group.children[group.children.length - 1].starts_at)} - ${formatDate(group.children[0].starts_at)}` : 'No events'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 font-medium">
                        <CurrencyIcon className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                        <span>
                            {group.currency}
                        </span>
                    </div>
                </div>
            </div>
            {isExpanded && (
                <ul className="p-2 space-y-1">
                    {group.children.map(child => (
                        <li key={child.id}>
                            <SingleEventRow 
                                event={child} 
                                isSelected={(isSelected && (item as any).id === child.id)}
                                onSelect={() => onSelect(child)} 
                                isChild 
                            />
                        </li>
                    ))}
                </ul>
            )}
        </li>
    )
};

export default EventListItem;