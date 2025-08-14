
import React from 'react';
import { BillettoEvent } from '../types';

interface EventListItemProps {
    event: BillettoEvent;
    isSelected: boolean;
    onSelect: () => void;
}

const EventListItem: React.FC<EventListItemProps> = ({ event, isSelected, onSelect }) => {
    
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-GB', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const stateColorMap: { [key: string]: string } = {
        published: 'bg-green-500/20 text-green-300 border border-green-500/30',
        completed: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
        cancelled: 'bg-red-500/20 text-red-300 border border-red-500/30',
        draft: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30',
        publishing: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
        default: 'bg-slate-600/50 text-slate-300 border border-slate-500/50'
    };

    const availabilityColorMap: { [key: string]: string } = {
        sold_out: 'text-red-400',
        low: 'text-orange-400',
        medium: 'text-yellow-400',
        high: 'text-green-400',
    };
    
    const availabilityTextMap: { [key: string]: string } = {
        sold_out: 'Sold Out',
        low: 'Low Tickets',
        medium: 'Tickets Available',
        high: 'High Availability',
    };

    const itemClasses = `
        block w-full p-4 rounded-lg text-left transition-all duration-200 cursor-pointer border
        ${isSelected 
            ? 'bg-slate-700/50 border-brand-primary shadow-lg' 
            : 'bg-slate-800/60 border-slate-700/50 hover:bg-slate-700/80 hover:border-slate-600'
        }
    `;

    const availabilityStatus = event.availability?.status;
    const availabilityColor = availabilityStatus ? availabilityColorMap[availabilityStatus] : '';
    const availabilityText = availabilityStatus ? availabilityTextMap[availabilityStatus] : '';

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect();
        }
    };

    return (
        <li>
            <div 
              onClick={onSelect} 
              className={itemClasses} 
              role="button" 
              aria-pressed={isSelected}
              tabIndex={0} 
              onKeyPress={handleKeyPress}
            >
                <div className="flex justify-between items-start mb-2">
                    <p className={`font-semibold text-base pr-2 ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                        {event.name}
                    </p>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium capitalize whitespace-nowrap ${stateColorMap[event.state] || stateColorMap.default}`}>
                        {(event.state || '').replace('_', ' ')}
                    </span>
                </div>

                {availabilityText && (
                    <p className={`text-xs font-medium mb-3 ${availabilityColor}`}>
                        {availabilityText}
                    </p>
                )}
                
                <div className="flex items-center text-xs text-slate-400">
                    <span>🗓️</span>
                    <span className="ml-1.5">{formatDate(event.starts_at)}</span>
                </div>
            </div>
        </li>
    )
};

export default EventListItem;
