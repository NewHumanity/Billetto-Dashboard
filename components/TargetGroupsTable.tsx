
import React from 'react';
import { TargetGroup, SortConfig } from '../types';

interface TargetGroupsTableProps {
  groups: TargetGroup[];
  onSelectGroup: (groupId: string) => void;
  selectedGroupId: string | null;
  requestSort: (key: keyof TargetGroup | string) => void;
  sortConfig: SortConfig<TargetGroup> | null;
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

const TargetGroupsTable: React.FC<TargetGroupsTableProps> = ({ groups, onSelectGroup, selectedGroupId, requestSort, sortConfig }) => {

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent, groupId: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelectGroup(groupId);
    }
  };
  
  const SortableHeader: React.FC<{ title: string, sortKey: keyof TargetGroup }> = ({ title, sortKey }) => {
    const isSorted = sortConfig?.key === sortKey;
    return (
        <th scope="col" className="py-3.5 px-4 text-left text-sm font-semibold text-white">
            <button onClick={() => requestSort(sortKey)} className="flex items-center gap-2 group">
                {title}
                <SortIndicator direction={isSorted ? sortConfig?.direction : undefined} />
            </button>
        </th>
    );
  };

  if (groups.length === 0) {
    return <p className="text-slate-400 text-center py-8">No target groups found.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-700">
        <thead className="bg-slate-900/80 sticky top-0">
          <tr>
            <SortableHeader title="Name" sortKey="name" />
            <SortableHeader title="Members" sortKey="members_count" />
            <SortableHeader title="Created" sortKey="created_at" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700 bg-slate-800/50">
          {groups.map((group) => (
            <tr
              key={group.id}
              onClick={() => onSelectGroup(group.id)}
              onKeyPress={(e) => handleKeyPress(e, group.id)}
              tabIndex={0}
              role="button"
              aria-pressed={selectedGroupId === group.id}
              className={`transition-colors duration-200 cursor-pointer ${
                selectedGroupId === group.id
                  ? 'bg-brand-primary/20'
                  : 'hover:bg-slate-700/50'
              }`}
            >
              <td className={`whitespace-nowrap py-4 px-4 text-sm font-semibold ${selectedGroupId === group.id ? 'text-brand-primary' : 'text-white'}`}>
                {group.name}
              </td>
              <td className="whitespace-nowrap py-4 px-4 text-sm text-slate-300">{(group.members_count || 0).toLocaleString()}</td>
              <td className="whitespace-nowrap py-4 px-4 text-sm text-slate-300">{formatDate(group.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TargetGroupsTable;
