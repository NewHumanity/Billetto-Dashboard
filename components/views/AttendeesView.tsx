import React, { useContext } from 'react';
import RefreshBar from '../RefreshBar';
import Loader from '../Loader';
import ErrorMessage from '../ErrorMessage';
import AllAttendeesTable from '../AllAttendeesTable';
import Pagination from '../Pagination';
import { AppContext } from '../../contexts/AppContext';

const ALL_ATTENDEES_PER_PAGE = 100;

const AttendeesView: React.FC = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error("AttendeesView must be used within an AppContextProvider");

    const {
        sortedAllAttendees, loadingAllAttendees, allAttendeesError, lastUpdatedAllAttendees,
        fetchAndCacheAllAttendees, allAttendeesPagination, handleAllAttendeesPageChange,
        requestAllAttendeeSort, allAttendeeSortConfig,
        setAttendeeDetailsModalId
    } = context;

    return (
        <div className="animate-fade-in">
            <RefreshBar lastUpdated={lastUpdatedAllAttendees} loading={loadingAllAttendees} onRefresh={() => fetchAndCacheAllAttendees(1)} viewName="attendees" />
            <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-xl shadow-lg">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">All Attendees</h2>
                 {loadingAllAttendees && sortedAllAttendees.length === 0 ? <Loader /> :
                 allAttendeesError ? <ErrorMessage message={allAttendeesError} /> :
                    <>
                        <AllAttendeesTable 
                            attendees={sortedAllAttendees} 
                            onSelectAttendee={setAttendeeDetailsModalId}
                            requestSort={requestAllAttendeeSort}
                            sortConfig={allAttendeeSortConfig} 
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
            {/* The AttendeeDetailsModal is now rendered globally in App.tsx */}
        </div>
    );
};

export default AttendeesView;