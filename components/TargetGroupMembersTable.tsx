
import React from 'react';
import { TargetGroupMember, SortConfig } from '../types';

interface TargetGroupMembersTableProps {
  members: TargetGroupMember[];
  requestSort: (key: keyof TargetGroupMember) => void;
  sortConfig: SortConfig<TargetGroupMember> | null;
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

const TargetGroupMembersTable: React.FC<TargetGroupMembersTableProps> = ({ members, requestSort, sortConfig }) => {

  const SortableHeader: React.FC<{ title: string, sortKey: keyof TargetGroupMember }> = ({ title, sortKey }) => {
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

  if (members.length === 0) {
    return <p className="text-slate-400 text-center py-12">This target group has no members.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full responsive-table">
        <thead className="bg-slate-900/80 sticky top-0">
          <tr>
            <SortableHeader title="Name" sortKey="name" />
            <SortableHeader title="Email" sortKey="email" />
          </tr>
        </thead>
        <tbody className="divide-y md:divide-y-0 divide-slate-700 bg-slate-800/50">
          {members.map((member) => (
            <tr key={member.id} className="md:hover:bg-slate-700/50 transition-colors">
              <td data-label="Name" className="whitespace-nowrap py-4 px-4 text-sm font-medium text-white">{member.name}</td>
              <td data-label="Email" className="whitespace-nowrap py-4 px-4 text-sm text-slate-300">{member.email}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TargetGroupMembersTable;
