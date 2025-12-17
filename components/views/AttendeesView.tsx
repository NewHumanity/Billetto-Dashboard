import React, { useContext, useState, useMemo } from 'react';
import RefreshBar from '../RefreshBar';
import Loader from '../Loader';
import ErrorMessage from '../ErrorMessage';
import AllAttendeesTable from '../AllAttendeesTable';
import { AppContext } from '../../contexts/AppContext';
import AttendeeDetailsView from '../modal_views/AttendeeDetailsView';
import { ExportIcon, SearchIcon } from '../icons';
import { exportToCsv } from '../../utils/export';
import { TableSkeleton } from '../Skeleton';

const AttendeesView: React.FC = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error("AttendeesView must be used within an AppContextProvider");

    const {
        loadingAllAttendees, isRefreshingAttendees, allAttendeesError, lastUpdatedAllAttendees, fullSortedAttendees,
        refreshAttendees,
        requestAllAttendeeSort, allAttendeeSortConfig,
        setModalView
    } = context;
    
    const [searchQuery, setSearchQuery] = useState('');

    const searchedAttendees = useMemo(() => {
        if (!searchQuery) {
            return fullSortedAttendees || [];
        }
        const lowerCaseQuery = searchQuery.toLowerCase();
        return (fullSortedAttendees || []).filter(attendee =>
            attendee.name.toLowerCase().includes(lowerCaseQuery) ||
            attendee.email.toLowerCase().includes(lowerCaseQuery)
        );
    }, [fullSortedAttendees, searchQuery]);

    const handleSelectAttendee = (attendeeId: string) => {
        const attendee = fullSortedAttendees.find(a => a.id === attendeeId);
        setModalView({
            title: attendee ? attendee.name : "Attendee Details",
            content: (props) => <AttendeeDetailsView {...props} attendeeId={attendeeId} />
        });
    };

    return (
        <div className="animate-fade-in">
            <RefreshBar lastUpdated={lastUpdatedAllAttendees} loading={loadingAllAttendees} isRefreshing={isRefreshingAttendees} onRefresh={refreshAttendees} viewName="attendees" />
            <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-xl shadow-lg">
                <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
                    <div className="flex items-center gap-2">
                        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">All Attendees</h2>
                        {!loadingAllAttendees && (
                            <span className="text-sm font-medium text-slate-500 dark:text-slate-400 bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                                {searchedAttendees.length.toLocaleString()}
                            </span>
                        )}
                    </div>
                    <button
                        onClick={() => exportToCsv(fullSortedAttendees || [], `billetto_all_attendees_${new Date().toISOString().split('T')[0]}.csv`)}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600"
                        disabled={!fullSortedAttendees || fullSortedAttendees.length === 0}
                    >
                        <ExportIcon />
                        <span>Export All</span>
                    </button>
                </div>

                <div className="relative mb-4">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                        <SearchIcon />
                    </span>
                    <input
                        type="search"
                        placeholder="Search all attendees by name or email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white dark:bg-slate-700/50 border border-gray-300 dark:border-slate-600 rounded-lg py-2 pl-10 pr-4 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    />
                </div>

                 {loadingAllAttendees && fullSortedAttendees.length === 0 ? <TableSkeleton /> :
                 allAttendeesError ? <ErrorMessage message={allAttendeesError} /> :
                    <AllAttendeesTable 
                        attendees={searchedAttendees} 
                        onSelectAttendee={handleSelectAttendee}
                        requestSort={requestAllAttendeeSort}
                        sortConfig={allAttendeeSortConfig}
                    />
                }
            </div>
        </div>
    );
};

export default AttendeesView;