import React, { useContext } from 'react';
import RefreshBar from '../RefreshBar';
import Loader from '../Loader';
import ErrorMessage from '../ErrorMessage';
import TargetGroupsTable from '../TargetGroupsTable';
import TargetGroupMembersTable from '../TargetGroupMembersTable';
import Pagination from '../Pagination';
import { AppContext } from '../../contexts/AppContext';
import { TargetGroup, SegmentRule } from '../../types';
import { ExportIcon } from '../icons';
import { exportToCsv } from '../../utils/export';

const TARGET_GROUPS_PER_PAGE = 100;
const MEMBERS_PER_PAGE = 100;

const RenderSegmentRules: React.FC<{ group: TargetGroup | undefined }> = ({ group }) => {
    if (!group || !group.segments || group.segments.length === 0) {
        return <p className="text-sm text-slate-500 dark:text-slate-400 italic">This group is manually managed or has no defined rules.</p>;
    }

    const renderRule = (rule: SegmentRule) => {
        return (
            <code className="text-xs text-slate-700 dark:text-slate-300 bg-gray-100 dark:bg-slate-700/50 px-2 py-1 rounded-md">
                <span className="text-purple-500 dark:text-purple-400">{rule.field}</span>
                <span className="text-cyan-500 dark:text-cyan-400 mx-1">{rule.operator}</span>
                <span className="text-amber-500 dark:text-amber-400">{Array.isArray(rule.value) ? `[${rule.value.join(', ')}]` : rule.value}</span>
            </code>
        );
    };

    return (
        <div className="space-y-3">
            {group.segments.map(segment => (
                <div key={segment.id} className="space-y-1">
                    {segment.rules.map((rule, index) => (
                        <div key={index} className="flex items-center gap-2">
                             {renderRule(rule)}
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
};

const TargetGroupsView: React.FC = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error("TargetGroupsView must be used within an AppContextProvider");

    const {
        sortedTargetGroups, loadingTargetGroups, targetGroupsError, lastUpdatedTargetGroups,
        fetchAndCacheTargetGroups, targetGroupsPagination, handleTargetGroupPageChange,
        requestTargetGroupSort, targetGroupSortConfig, selectedTargetGroupId, setSelectedTargetGroupId,
        sortedTargetGroupMembers, loadingMembers, membersError, membersPagination, handleMemberPageChange,
        requestMemberSort, memberSortConfig
    } = context;

    const selectedGroup = selectedTargetGroupId 
        ? sortedTargetGroups.find(g => g.id === selectedTargetGroupId) 
        : undefined;

    return (
        <div className="animate-fade-in">
            <RefreshBar lastUpdated={lastUpdatedTargetGroups} loading={loadingTargetGroups} onRefresh={() => fetchAndCacheTargetGroups(1)} viewName="target groups" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-xl shadow-lg">
                    <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
                        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Target Groups</h2>
                        <button
                            onClick={() => exportToCsv(sortedTargetGroups, `billetto_target_groups_page_${targetGroupsPagination.currentPage}_${new Date().toISOString().split('T')[0]}.csv`)}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600"
                        >
                            <ExportIcon />
                            <span>Export Page</span>
                        </button>
                    </div>
                    {loadingTargetGroups && sortedTargetGroups.length === 0 ? <Loader /> :
                     targetGroupsError ? <ErrorMessage message={targetGroupsError} /> :
                        <>
                            <TargetGroupsTable
                                groups={sortedTargetGroups}
                                onSelectGroup={setSelectedTargetGroupId}
                                selectedGroupId={selectedTargetGroupId}
                                requestSort={requestTargetGroupSort}
                                sortConfig={targetGroupSortConfig}
                            />
                            <Pagination
                                currentPage={targetGroupsPagination.currentPage}
                                totalItems={targetGroupsPagination.total}
                                itemsPerPage={TARGET_GROUPS_PER_PAGE}
                                onPageChange={handleTargetGroupPageChange}
                            />
                        </>
                    }
                </div>
                <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-xl shadow-lg flex flex-col">
                    <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
                        <h2 className="text-xl font-semibold text-slate-900 dark:text-white truncate" title={selectedGroup?.name || 'Group Members'}>
                            {selectedGroup
                                ? `Details for "${selectedGroup.name}"`
                                : 'Group Details'
                            }
                        </h2>
                        {selectedGroup && sortedTargetGroupMembers.length > 0 && (
                             <button
                                onClick={() => exportToCsv(sortedTargetGroupMembers, `billetto_group_${selectedGroup.name.replace(/ /g, '_')}_members_page_${membersPagination.currentPage}_${new Date().toISOString().split('T')[0]}.csv`)}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600"
                            >
                                <ExportIcon />
                                <span>Export Members</span>
                            </button>
                        )}
                    </div>
                    {
                     !selectedTargetGroupId ? <div className="flex items-center justify-center h-full"><p className="text-slate-500 dark:text-slate-400">Select a group to see its members and rules.</p></div> :
                        <>
                            <div className="mb-6 bg-gray-50 dark:bg-slate-900/50 p-4 rounded-lg">
                                <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-2">Defining Segments</h3>
                                <RenderSegmentRules group={selectedGroup} />
                            </div>

                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                                Members
                                {!loadingMembers && selectedGroup && (
                                    <span className="text-slate-500 dark:text-slate-400 font-normal ml-2">({(membersPagination.total || 0).toLocaleString()})</span>
                                )}
                            </h3>
                             {loadingMembers ? <Loader message="Loading members..." /> :
                             membersError ? <ErrorMessage message={membersError} /> :
                                <>
                                    <div className="flex-grow overflow-y-auto">
                                        <TargetGroupMembersTable 
                                            members={sortedTargetGroupMembers}
                                            requestSort={requestMemberSort}
                                            sortConfig={memberSortConfig}
                                        />
                                    </div>
                                    {membersPagination.total > MEMBERS_PER_PAGE &&
                                        <Pagination
                                            currentPage={membersPagination.currentPage}
                                            totalItems={membersPagination.total}
                                            itemsPerPage={MEMBERS_PER_PAGE}
                                            onPageChange={handleMemberPageChange}
                                        />
                                    }
                                </>
                             }
                        </>
                    }
                </div>
            </div>
        </div>
    );
};

export default TargetGroupsView;