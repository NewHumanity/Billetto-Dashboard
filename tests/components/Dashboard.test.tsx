import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Dashboard from '../../components/Dashboard';
import { EventDetails } from '../../types';

// Mock child components to simplify testing
vi.mock('../../components/SalesVelocityChart', () => ({ default: () => <div data-testid="sales-velocity">Sales Velocity Chart</div> }));
vi.mock('../../components/SalesChannelChart', () => ({ default: () => <div data-testid="sales-channel">Sales Channel Chart</div> }));
vi.mock('../../components/RevenueAttributionChart', () => ({ default: () => <div data-testid="revenue-attr">Revenue Chart</div> }));
vi.mock('../../components/TicketTypesTable', () => ({ default: () => <div data-testid="ticket-types">Ticket Types</div> }));
vi.mock('../../components/EventsTable', () => ({ default: () => <div data-testid="attendees-table">Attendees Table</div> }));

describe('Dashboard Component', () => {
    const mockDetails: EventDetails = {
        event: { id: '1', name: 'Test Event', starts_at: '2024-01-01', state: 'published', currency: 'EUR' } as any,
        attendees: [],
        ticketGroups: [],
        stats: { totalTicketsSold: 100, netRevenue: 5000, currency: 'EUR', newsletterOptInRate: 10 },
        financialSummary: { netRevenue: 5000, billettoFees: -500, netPayout: 4500, totalRefunded: 0, totalChargebacks: 0 },
        salesVelocity: [{ date: '2024-01-01', tickets: 10 }],
        salesByChannel: [{ name: 'Online', count: 10 }],
        revenueBySource: [{ name: 'Direct', revenue: 5000 }],
        bookingQuestionsLoaded: false
    };

    const defaultProps = {
        details: mockDetails,
        loading: false,
        isRefreshing: false,
        attendeePage: 1,
        attendeesPerPage: 10,
        onAttendeePageChange: vi.fn(),
        activeSubView: 'overview' as const,
        onSetSubView: vi.fn(),
        requestAttendeeSort: vi.fn(),
        attendeeSortConfig: null,
        requestTicketGroupSort: vi.fn(),
        ticketGroupSortConfig: null,
        loadingAnalysis: false,
        onTriggerAnalysis: vi.fn(),
        filterTicketGroupId: 'all',
        onFilterChange: vi.fn(),
        availableQuestions: [],
        filterQuestionId: '',
        onSetFilterQuestionId: vi.fn(),
        filterAnswerText: '',
        onSetFilterAnswerText: vi.fn(),
        filteredAttendees: [],
        filteredAttendeesCount: 0,
        theme: 'light' as const,
    };

    it('renders overview tab by default', () => {
        render(<Dashboard {...defaultProps} />);
        
        expect(screen.getByText('Test Event')).toBeInTheDocument();
        expect(screen.getByText('Gross Revenue')).toBeInTheDocument();
        // Check for mocked charts
        expect(screen.getByTestId('sales-velocity')).toBeInTheDocument();
    });

    it('switches to attendees view when tab clicked', () => {
        const onSetSubView = vi.fn();
        render(<Dashboard {...defaultProps} onSetSubView={onSetSubView} />);

        const attendeesTab = screen.getByRole('tab', { name: /Attendees/i });
        fireEvent.click(attendeesTab);

        expect(onSetSubView).toHaveBeenCalledWith('attendees');
    });

    it('displays attendees table when activeSubView is attendees', () => {
        render(<Dashboard {...defaultProps} activeSubView="attendees" />);
        expect(screen.getByTestId('attendees-table')).toBeInTheDocument();
    });

    it('shows refresh indicator when isRefreshing is true', () => {
        render(<Dashboard {...defaultProps} isRefreshing={true} />);
        expect(screen.getByText(/Refreshing data in the background/i)).toBeInTheDocument();
    });
    
    it('handles copy ID interaction', async () => {
        Object.assign(navigator, { clipboard: { writeText: vi.fn() } });
        render(<Dashboard {...defaultProps} />);
        
        const copyButton = screen.getByTitle('Copy Event ID');
        fireEvent.click(copyButton);
        
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('1');
        await waitFor(() => expect(screen.getByText('Copied!')).toBeInTheDocument());
    });
});