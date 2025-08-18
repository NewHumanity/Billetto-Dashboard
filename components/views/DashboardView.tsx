import React, { useContext } from 'react';
import Loader from '../Loader';
import ErrorMessage from '../ErrorMessage';
import RefreshBar from '../RefreshBar';
import EventListItem from '../EventListItem';
import Dashboard from '../Dashboard';
import { AppContext } from '../../contexts/AppContext';

const ATTENDEES_PER_PAGE = 100;

const DashboardView: React.FC = () => {
    const context = useContext(AppContext);

    if (!context) {
        throw new Error("DashboardView must be used within an AppContextProvider");
    }
    
    const {
        events, loadingEvents, eventsError, lastUpdatedEvents, fetchAndCacheEvents,
        filteredEventListItems, eventFilter, setEventFilter, selectedItem, setSelectedItem,
        finalEventDetails, loadingDetails, detailsError,
        eventDetailView, setEventDetailView, attendeePage, setAttendeePage,
        requestEventAttendeesSort, eventAttendeesSortConfig,
        requestTicketGroupsSort, ticketGroupsSortConfig,
        loadingAnalysis, triggerAnalysis,
        filterTicketGroupId, setFilterTicketGroupId,
        loadingProgress,
        availableQuestions,
        filterQuestionId, setFilterQuestionId,
        filterAnswerText, setFilterAnswerText,
        filteredAttendeesCount,
        theme,
        apiClient
    } = context;

    const filterOptions = ['published', 'draft', 'completed', 'canceled', 'all'];

    const renderEventContent = () => {
        if (loadingEvents && events.length === 0) {
          return <Loader />;
        }
        if (eventsError) {
          return <ErrorMessage message={eventsError} />;
        }
        if (!apiClient) {
          return (
            <div className="text-center p-8 bg-white dark:bg-slate-800 rounded-lg">
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">Welcome</h2>
              <p className="mt-2 text-slate-500 dark:text-slate-400">Please provide your API Key to view events.</p>
            </div>
          );
        }
        if (events.length === 0 && !loadingEvents) {
          return <ErrorMessage message="No events found for this account. Click 'Refresh Data' to try again." />;
        }
        if (filteredEventListItems.length === 0) {
          return <ErrorMessage message={`No ${eventFilter} events found. Try another filter.`} />;
        }
        return (
          <ul className="space-y-3">
            {filteredEventListItems.map(item => (
              <EventListItem
                key={item.id}
                item={item}
                isSelected={selectedItem?.id === item.id}
                onSelect={setSelectedItem}
              />
            ))}
          </ul>
        );
    };

    const renderDashboardContent = () => {
      if (!selectedItem) {
        return (
          <div className="flex items-center justify-center h-full rounded-xl bg-white/50 dark:bg-slate-800/50 border-2 border-dashed border-gray-300 dark:border-slate-700">
            <p className="text-slate-500 dark:text-slate-400">Select an event to view its statistics.</p>
          </div>
        );
      }
      if (detailsError) {
        return <ErrorMessage message={detailsError} />;
      }
      
      const isInitialLoad = loadingDetails && (!finalEventDetails || !finalEventDetails.allAttendees);
      if (isInitialLoad) {
        let message = "Fetching event data...";
        let overallProgress: number | undefined = undefined;

        if (loadingProgress?.message) {
            message = loadingProgress.message;
        }
        else if (typeof loadingProgress?.orders !== 'undefined' && typeof loadingProgress?.attendees !== 'undefined' && typeof loadingProgress?.ledger !== 'undefined') {
            const { orders, attendees, ledger } = loadingProgress;
            const fetchingContribution = ((orders + attendees + ledger) / 300) * 95;
            overallProgress = Math.floor(fetchingContribution);
            const fetchingComplete = orders === 100 && attendees === 100 && ledger === 100;

            if (fetchingComplete) {
                message = "Finalizing and caching data...";
                overallProgress = 99;
            } else {
                const messages = [];
                if (orders < 100) messages.push('orders');
                if (attendees < 100) messages.push('attendees');
                if (ledger < 100) messages.push('financials');
                if (messages.length > 0) message = `Fetching all ${messages.join(', ')}...`;
            }
        } else {
            message = "Preparing to fetch details...";
        }
        
        return <Loader message={message} progress={overallProgress} />;
      }
      
      if (finalEventDetails) {
        return (
            <Dashboard 
                details={finalEventDetails} 
                loading={loadingDetails}
                attendeePage={attendeePage} 
                onAttendeePageChange={setAttendeePage} 
                attendeesPerPage={ATTENDEES_PER_PAGE}
                activeSubView={eventDetailView}
                onSetSubView={setEventDetailView}
                requestAttendeeSort={requestEventAttendeesSort}
                attendeeSortConfig={eventAttendeesSortConfig}
                requestTicketGroupSort={requestTicketGroupsSort}
                ticketGroupSortConfig={ticketGroupsSortConfig}
                loadingAnalysis={loadingAnalysis}
                onTriggerAnalysis={triggerAnalysis}
                filterTicketGroupId={filterTicketGroupId}
                onFilterChange={setFilterTicketGroupId}
                availableQuestions={availableQuestions}
                filterQuestionId={filterQuestionId}
                onSetFilterQuestionId={setFilterQuestionId}
                filterAnswerText={filterAnswerText}
                onSetFilterAnswerText={setFilterAnswerText}
                filteredAttendeesCount={filteredAttendeesCount}
                theme={theme}
            />
        );
      }
      
      return <Loader message="Preparing dashboard..." />;
    };

    return (
        <div className="animate-fade-in">
            <RefreshBar lastUpdated={lastUpdatedEvents} loading={loadingEvents} onRefresh={fetchAndCacheEvents} viewName="events" />
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8">
                <div className="md:col-span-1 lg:col-span-1 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-lg h-fit">
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4 px-2">Your Events</h2>
                    <div className="flex flex-wrap gap-1 mb-4 bg-gray-100 dark:bg-slate-900/50 p-1 rounded-lg">
                        {filterOptions.map(filter => (
                            <button
                                key={filter}
                                onClick={() => setEventFilter(filter)}
                                className={`flex-grow text-center px-2 py-1.5 text-xs font-semibold rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/80 ${
                                    eventFilter === filter
                                        ? 'bg-brand-primary text-white shadow'
                                        : 'text-slate-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700'
                                }`}
                            >
                                <span className="capitalize">{filter}</span>
                            </button>
                        ))}
                    </div>
                    {renderEventContent()}
                </div>
                <div className="md:col-span-2 lg:col-span-3">
                    {renderDashboardContent()}
                </div>
            </div>
        </div>
    );
};

export default DashboardView;
