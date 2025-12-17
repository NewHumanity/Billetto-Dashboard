
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Pagination from '../../components/Pagination';

describe('Pagination', () => {
    it('renders correct range info', () => {
        render(
            <Pagination 
                currentPage={1} 
                totalItems={55} 
                itemsPerPage={10} 
                onPageChange={() => {}} 
            />
        );

        // Should show "Showing 1 to 10 of 55 results"
        expect(screen.getByText('Showing')).toBeInTheDocument();
        expect(screen.getByText('1')).toBeInTheDocument();
        expect(screen.getByText('10')).toBeInTheDocument();
        expect(screen.getByText('55')).toBeInTheDocument();
    });

    it('renders correct range info on last page', () => {
        render(
            <Pagination 
                currentPage={6} 
                totalItems={55} 
                itemsPerPage={10} 
                onPageChange={() => {}} 
            />
        );

        // Should show "Showing 51 to 55 of 55 results"
        expect(screen.getByText('51')).toBeInTheDocument();
        expect(screen.getByText('55')).toBeInTheDocument();
    });

    it('calls onPageChange with correct values', () => {
        const handlePageChange = vi.fn();
        render(
            <Pagination 
                currentPage={2} 
                totalItems={50} 
                itemsPerPage={10} 
                onPageChange={handlePageChange} 
            />
        );

        const prevButton = screen.getByText('Previous');
        const nextButton = screen.getByText('Next');

        fireEvent.click(prevButton);
        expect(handlePageChange).toHaveBeenCalledWith(1);

        fireEvent.click(nextButton);
        expect(handlePageChange).toHaveBeenCalledWith(3);
    });

    it('disables Previous button on first page', () => {
        render(
            <Pagination 
                currentPage={1} 
                totalItems={50} 
                itemsPerPage={10} 
                onPageChange={() => {}} 
            />
        );
        expect(screen.getByText('Previous')).toBeDisabled();
        expect(screen.getByText('Next')).not.toBeDisabled();
    });

    it('disables Next button on last page', () => {
        render(
            <Pagination 
                currentPage={5} 
                totalItems={50} 
                itemsPerPage={10} 
                onPageChange={() => {}} 
            />
        );
        expect(screen.getByText('Next')).toBeDisabled();
        expect(screen.getByText('Previous')).not.toBeDisabled();
    });

    it('returns null if only 1 page', () => {
        const { container } = render(
            <Pagination 
                currentPage={1} 
                totalItems={5} 
                itemsPerPage={10} 
                onPageChange={() => {}} 
            />
        );
        expect(container).toBeEmptyDOMElement();
    });
});
