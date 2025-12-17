
import React from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { EventReportDocument } from './reports/EventReportDocument';
import { EventDetails } from '../types';
import { TeacherIcon } from './icons';

interface ReportButtonProps {
    details: EventDetails;
    eventName: string;
}

const ReportButton: React.FC<ReportButtonProps> = ({ details, eventName }) => {
    return (
        <PDFDownloadLink
            document={<EventReportDocument details={details} />}
            fileName={`${(eventName || 'event').replace(/[^a-z0-9]/gi, '_').toLowerCase()}_report.pdf`}
            className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-800 focus:ring-indigo-500"
        >
            {({ loading }) => (
                <>
                    {loading ? <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent" /> : <TeacherIcon className="h-5 w-5" />}
                    <span>{loading ? 'Generating...' : 'Report'}</span>
                </>
            )}
        </PDFDownloadLink>
    );
};

export default ReportButton;
