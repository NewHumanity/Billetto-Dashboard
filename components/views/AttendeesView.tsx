

import React, { useContext } from 'react';
import RefreshBar from '../RefreshBar';
import Loader from '../Loader';
import ErrorMessage from '../ErrorMessage';
import AllAttendeesTable from '../AllAttendeesTable';
import Pagination from '../Pagination';
import { AppContext } from '../../contexts/AppContext';
import AttendeeDetailsView from '../modal_views/AttendeeDetailsView';
import { ExportIcon } from '../icons';
import { exportToCsv } from '../../utils/export';

const ALL_ATTENDEES_PER_PAGE = 100;

const AttendeesView: React.FC = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error("AttendeesView must be used within an AppContextProvider");

    const {
        attendees, loadingAllAttendees, isRefreshingAttendees, allAttendeesError, lastUpdatedAllAttendees, fullSortedAttendees,
        refreshAttendees, allAttendeesPagination, handleAllAttendeesPageChange,
        requestAllAttendeeSort, allAttendeeSortConfig,
        setModalView
    } = context;

    const handleSelectAttendee = (attendeeId: string) => {
        const attendee = attendees.find(a => a.id === attendeeId);
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
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-white">All Attendees</h2>
                    <button
                        onClick={() => exportToCsv(fullSortedAttendees || [], `billetto_all_attendees_${new Date().toISOString().split('T')[0]}.csv`)}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600"
                        disabled={!fullSortedAttendees || fullSortedAttendees.length === 0}
                    >
                        <ExportIcon />
                        <span>Export All</span>
                    </button>
                </div>
                 {loadingAllAttendees && attendees.length === 0 ? <Loader /> :
                 allAttendeesError ? <ErrorMessage message={allAttendeesError} /> :
                    <>
                        <AllAttendeesTable 
                            attendees={attendees} 
                            onSelectAttendee={handleSelectAttendee}
                            requestSort={requestAllAttendeeSort}
                            sortConfig={allAttendeeSortConfig}
                            currentPage={allAttendeesPagination.currentPage}
                            itemsPerPage={ALL_ATTENDEES_PER_PAGE}
                        />
                        <Pagination 
                            currentPage={allAttendeesPagination.currentPage}
                            totalItems={allAttendeesPagination.total}
                            itemsPerPage={ALL_ATTENDEES_PER_PAGE}
                            onPageChange={handleAllAttendeesPageChange}
                        />
                    </>
                }
            </div>
        </div>
    );
};

export default AttendeesView;