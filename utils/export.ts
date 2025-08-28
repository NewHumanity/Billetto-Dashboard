/**
 * Flattens a nested object into a single-level object with dot notation keys.
 * Handles arrays by creating separate rows for each item.
 * @param obj The object to flatten.
 * @param prefix The current path prefix for keys.
 * @returns An array of flattened objects, one for each item in any top-level array.
 */
const flattenObject = (obj: any, prefix = ''): any[] => {
    if (obj === null || typeof obj !== 'object') {
        return [{ [prefix || 'value']: obj }];
    }

    // Special handling for arrays at any level
    if (Array.isArray(obj)) {
        if (obj.length === 0) {
            return [{ [prefix]: '[]' }];
        }
        // If it's an array of primitives, join them.
        if (obj.every(item => typeof item !== 'object')) {
            return [{ [prefix]: obj.join(', ') }];
        }
        // If it's an array of objects, we need to handle this differently, but for now, we'll stringify.
        // The main function will handle top-level arrays by creating rows.
        return [{ [prefix]: JSON.stringify(obj) }];
    }

    const result: any = {};
    Object.keys(obj).forEach(key => {
        const newPrefix = prefix ? `${prefix}.${key}` : key;
        const value = obj[key];

        if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
            const flattened = flattenObject(value, newPrefix)[0];
            Object.assign(result, flattened);
        } else if (Array.isArray(value)) {
            // Stringify nested arrays for simplicity in a flat structure
             result[newPrefix] = value.map(item => (typeof item === 'object' && item !== null) ? JSON.stringify(item) : item).join('; ');
        }
        else {
            result[newPrefix] = value;
        }
    });
    return [result];
};


/**
 * Converts an array of objects to a CSV string and triggers a download.
 * @param data An array of objects to export.
 * @param filename The name of the file to download.
 */
export const exportToCsv = (data: any[], filename: string) => {
    if (!data || data.length === 0) {
        console.warn('Export to CSV called with no data.');
        return;
    }

    const flattenedData = data.map(row => flattenObject(row)[0]);

    // Dynamically create headers from all keys in the flattened data
    const headerSet = new Set<string>();
    flattenedData.forEach(row => {
        Object.keys(row).forEach(key => headerSet.add(key));
    });
    const headers = Array.from(headerSet);

    // Function to safely escape data for CSV
    const escapeCsvCell = (cell: any): string => {
        if (cell === null || cell === undefined) {
            return '';
        }
        const cellString = String(cell);
        // If the cell contains a comma, double quote, or newline, wrap it in double quotes
        if (/[",\n\r]/.test(cellString)) {
            return `"${cellString.replace(/"/g, '""')}"`;
        }
        return cellString;
    };

    const csvRows = [
        headers.join(','), // Header row
        ...flattenedData.map(row => 
            headers.map(header => escapeCsvCell(row[header])).join(',')
        )
    ];

    const csvString = csvRows.join('\n');
    
    // Add BOM for Excel compatibility with UTF-8
    const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
