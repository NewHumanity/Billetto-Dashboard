
import React from 'react';
import { BillettoApiClient } from '../../services/billettoService';
import { useAttendees } from '../../hooks/useAttendees';
import RefreshBar from '../RefreshBar';
import Loader from '../Loader';
import ErrorMessage from '../ErrorMessage';
import AllAttendeesTable from '../AllAttendeesTable';
import Pagination from '../Pagination';
import AttendeeDetailsModal from '../AttendeeDetailsModal';

interface AttendeesViewProps {
    apiClient: BillettoApiClient | null;
}

const ALL_ATTENDEES_PER_PAGE = 100;

const AttendeesView: React.FC<AttendeesViewProps> = ({ apiClient }) => {
    const {
        sortedAllAttendees, loadingAllAttendees, allAttendeesError, lastUpdatedAllAttendees,
        fetchAndCacheAllAttendees, allAttendeesPagination, handleAllAttendeesPageChange,
        requestAllAttendeeSort, allAttendeeSortConfig,
        selectedAttendeeId, setSelectedAttendeeId, attendeeDetails, loadingAttendeeDetails, attendeeDetailsError
    } = useAttendees(apiClient);

    return (
        <div className="animate-fade-in">
            <RefreshBar lastUpdated={lastUpdatedAllAttendees} loading={loadingAllAttendees} onRefresh={() => fetchAndCacheAllAttendees(1)} viewName="attendees" />
            <div className="bg-slate-800 p-4 sm:p-6 rounded-xl shadow-lg">
                <h2 className="text-xl font-semibold text-white mb-4">All Attendees</h2>
                 {loadingAllAttendees && sortedAllAttendees.length === 0 ? <Loader /> :
                 allAttendeesError ? <ErrorMessage message={allAttendeesError} /> :
                    <>
                        <AllAttendeesTable 
                            attendees={sortedAllAttendees} 
                            onSelectAttendee={setSelectedAttendeeId}
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
            {selectedAttendeeId && (
                <AttendeeDetailsModal 
                    attendee={attendeeDetails}
                    loading={loadingAttendeeDetails}
                    error={attendeeDetailsError}
                    onClose={() => setSelectedAttendeeId(null)}
                />
            )}
        </div>
    );
};

export default AttendeesView;