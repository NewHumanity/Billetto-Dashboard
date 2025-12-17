import React, { useRef } from 'react';
import { Attendee, SortConfig } from '../types';
import { useVirtualizer } from '@tanstack/react-virtual';

interface AllAttendeesTableProps {
  attendees: Attendee[];
  onSelectAttendee: (attendeeId: string) => void;
  requestSort: (key: keyof Attendee | string) => void;
  sortConfig: SortConfig<Attendee> | null;
}

const SortIndicator = ({ direction }: { direction?: 'ascending' | 'descending' }) => {
    const iconClass = "h-4 w-4 transition-opacity";
    if (!direction) {
        return <svg xmlns="http://www.w3.org/2000/svg" className={`${iconClass} text-slate-500 opacity-50 group-hover:opacity-100`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4" /></svg>;
    }
    if (direction === 'ascending') {
        return <svg xmlns="http://www.w3.org/2000/svg" className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>;
    }
    return <svg xmlns="http://www.w3.org/2000/svg" className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>;
};

const AllAttendeesTable: React.FC<AllAttendeesTableProps> = ({ attendees, onSelectAttendee, requestSort, sortConfig }) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: attendees.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60, // Estimated row height
    overscan: 10,
  });
    
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const statusColorMap: { [key: string]: string } = {
    sold: 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400',
    refunded: 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400',
    cancelled: 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400',
    reserved: 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400',
    manually_generated: 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400',
    default: 'bg-slate-100 dark:bg-slate-500/20 text-slate-600 dark:text-slate-400'
  };
  
  const SortableHeader: React.FC<{ title: string, sortKey: keyof Attendee | string }> = ({ title, sortKey }) => {
    const isSorted = sortConfig?.key === sortKey;
    return (
        <th scope="col" className="py-3.5 px-4 text-left text-sm font-semibold text-slate-900 dark:text-white">
            <button onClick={() => requestSort(sortKey)} className="flex items-center gap-2 group">
                {title}
                <SortIndicator direction={isSorted ? sortConfig?.direction : undefined} />
            </button>
        </th>
    );
  };


  if (attendees.length === 0) {
    return <p className="text-slate-500 dark:text-slate-400 text-center py-8">No attendees found for this account.</p>;
  }

  const virtualItems = rowVirtualizer.getVirtualItems();
  const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
  const paddingBottom = virtualItems.length > 0 ? rowVirtualizer.getTotalSize() - virtualItems[virtualItems.length - 1].end : 0;

  return (
    <div ref={parentRef} className="overflow-y-auto max-h-[70vh] border border-gray-200 dark:border-slate-700 rounded-lg">
      <table className="min-w-full responsive-table">
        <thead className="bg-gray-50 dark:bg-slate-900/80 sticky top-0 z-10 shadow-sm">
          <tr>
            <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-slate-900 dark:text-white w-16">#</th>
            <SortableHeader title="Name" sortKey="name" />
            <SortableHeader title="Email" sortKey="email" />
            <SortableHeader title="Event" sortKey="event.name" />
            <SortableHeader title="Status" sortKey="state" />
            <SortableHeader title="Date" sortKey="created_at" />
          </tr>
        </thead>
        <tbody className="divide-y md:divide-y-0 divide-gray-200 dark:divide-slate-700 bg-white dark:bg-slate-800/50">
          {paddingTop > 0 && (
            <tr>
              <td style={{ height: `${paddingTop}px` }} />
            </tr>
          )}
          {virtualItems.map((virtualRow) => {
            const attendee = attendees[virtualRow.index];
            return (
              <tr 
                key={attendee.id} 
                className="md:hover:bg-gray-100 dark:md:hover:bg-slate-700/50 transition-colors duration-200 cursor-pointer"
                onClick={() => onSelectAttendee(attendee.id)}
                tabIndex={0}
                onKeyPress={(e) => (e.key === 'Enter' || e.key === ' ') && onSelectAttendee(attendee.id)}
                aria-label={`View details for attendee ${attendee.name}`}
              >
                <td data-label="#" className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-slate-500 dark:text-slate-400">
                  {virtualRow.index + 1}
                </td>
                <td data-label="Name" className="whitespace-nowrap py-4 px-4 text-sm font-medium text-slate-900 dark:text-white">{attendee.name}</td>
                <td data-label="Email" className="whitespace-nowrap py-4 px-4 text-sm text-slate-600 dark:text-slate-300">{attendee.email}</td>
                <td data-label="Event" className="whitespace-nowrap py-4 px-4 text-sm text-slate-600 dark:text-slate-300 truncate max-w-xs">{(attendee.event && typeof attendee.event === 'object') ? attendee.event.name : 'N/A'}</td>
                <td data-label="Status" className="whitespace-nowrap py-4 px-4 text-sm text-slate-600 dark:text-slate-300">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${statusColorMap[attendee.state] || statusColorMap.default}`}>
                      {(attendee.state || '').replace(/_/g, ' ')}
                  </span>
                </td>
                <td data-label="Date" className="whitespace-nowrap py-4 px-4 text-sm text-slate-600 dark:text-slate-300">{formatDate(attendee.created_at)}</td>
              </tr>
            );
          })}
          {paddingBottom > 0 && (
            <tr>
              <td style={{ height: `${paddingBottom}px` }} />
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default AllAttendeesTable;