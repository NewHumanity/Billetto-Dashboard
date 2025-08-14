
import React from 'react';
import { BillettoApiClient } from '../../services/billettoService';
import { useTargetGroups } from '../../hooks/useTargetGroups';
import RefreshBar from '../RefreshBar';
import Loader from '../Loader';
import ErrorMessage from '../ErrorMessage';
import TargetGroupsTable from '../TargetGroupsTable';
import TargetGroupMembersTable from '../TargetGroupMembersTable';
import Pagination from '../Pagination';

interface TargetGroupsViewProps {
    apiClient: BillettoApiClient | null;
}

const TARGET_GROUPS_PER_PAGE = 15;
const MEMBERS_PER_PAGE = 50;

const TargetGroupsView: React.FC<TargetGroupsViewProps> = ({ apiClient }) => {
    const {
        sortedTargetGroups, loadingTargetGroups, targetGroupsError, lastUpdatedTargetGroups,
        fetchAndCacheTargetGroups, targetGroupsPagination, handleTargetGroupPageChange,
        requestTargetGroupSort, targetGroupSortConfig, selectedTargetGroupId, setSelectedTargetGroupId,
        sortedTargetGroupMembers, loadingMembers, membersError, membersPagination, handleMemberPageChange,
        requestMemberSort, memberSortConfig
    } = useTargetGroups(apiClient);

    return (
        <div className="animate-fade-in">
            <RefreshBar lastUpdated={lastUpdatedTargetGroups} loading={loadingTargetGroups} onRefresh={() => fetchAndCacheTargetGroups(1)} viewName="target groups" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-slate-800 p-4 sm:p-6 rounded-xl shadow-lg">
                    <h2 className="text-xl font-semibold text-white mb-4">Target Groups</h2>
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
                <div className="bg-slate-800 p-4 sm:p-6 rounded-xl shadow-lg">
                    <h2 className="text-xl font-semibold text-white mb-4">Group Members</h2>
                    {loadingMembers ? <Loader message="Loading members..." /> :
                     membersError ? <ErrorMessage message={membersError} /> :
                     !selectedTargetGroupId ? <div className="flex items-center justify-center h-full"><p className="text-slate-400">Select a group to see its members.</p></div> :
                        <>
                            <TargetGroupMembersTable 
                                members={sortedTargetGroupMembers}
                                requestSort={requestMemberSort}
                                sortConfig={memberSortConfig}
                            />
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
                </div>
            </div>
        </div>
    );
};

export default TargetGroupsView;
