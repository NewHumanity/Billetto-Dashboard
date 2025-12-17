
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import StatCard from '../../components/StatCard';

describe('StatCard', () => {
    it('renders title and value correctly', () => {
        render(
            <StatCard 
                title="Total Sales" 
                value="$5,000" 
                icon={<svg data-testid="icon" />} 
            />
        );

        expect(screen.getByText('Total Sales')).toBeInTheDocument();
        expect(screen.getByText('$5,000')).toBeInTheDocument();
        expect(screen.getByTestId('icon')).toBeInTheDocument();
    });

    it('handles click events when onClick is provided', () => {
        const handleClick = vi.fn();
        render(
            <StatCard 
                title="Click Me" 
                value="100" 
                icon={<svg />} 
                onClick={handleClick} 
            />
        );

        const button = screen.getByRole('button');
        fireEvent.click(button);
        expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('renders as a div when no onClick is provided', () => {
        render(
            <StatCard 
                title="Static" 
                value="100" 
                icon={<svg />} 
            />
        );

        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
});
