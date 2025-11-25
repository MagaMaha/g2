import React, { FC } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Contact } from './types';

// --- SUPABASE SETUP ---
const supabaseUrl = "https://bhydxfyqbfpxdcqbrnhb.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJoeWR4ZnlxYmZweGRjcWJybmhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwMzIyNTksImV4cCI6MjA3MzYwODI1OX0.QqGi0pKmKEJbHPDzcu4M43nfrOMcaBbxj9lhyxc79LM";

export const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// --- HELPER FUNCTIONS & ICONS ---
export const formatCurrency = (amount?: number | string | null) => {
    if (amount == null || amount === '') return 'N/A';
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return isNaN(num) ? 'N/A' : `$${Math.round(num).toLocaleString()}`;
};

export const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString + 'T00:00:00').toLocaleDateString();
};

export const safeParseFloat = (val: any): number => {
    if (val === null || val === undefined || val === '') return 0;
    // Sanitize string to remove currency symbols and commas before parsing
    const sanitizedString = String(val).replace(/[^0-9.-]+/g, "");
    if (sanitizedString === '') return 0;
    const num = parseFloat(sanitizedString);
    return isNaN(num) ? 0 : num;
};

// Helper to safely parse deal values which might be strings or numbers from the database
export const safeGetDealValue = (contact: Contact | undefined | null): number => {
    if (!contact) return 0;

    const parse = (val: any): number | null => {
        if (val === null || val === undefined || val === '') return null;
        // Sanitize string to remove currency symbols and commas before parsing
        const sanitizedString = String(val).replace(/[^0-9.-]+/g, "");
        if (sanitizedString === '') return null; // Treat empty string after sanitize as null
        const num = parseFloat(sanitizedString);
        return isNaN(num) ? null : num;
    };
    
    const actual = parse(contact.actual);
    const forecast = parse(contact.forecast);
    
    // Use actual if it's a valid number (including 0), otherwise use forecast.
    // If forecast is also invalid, return 0.
    return actual ?? forecast ?? 0;
};

export const getMarginPct = (contact: Contact | undefined | null): number => {
    if (!contact) return 0;
    // Use final_gross_margin if it's a valid number, otherwise use gross_margin.
    const margin = contact.final_gross_margin ?? contact.gross_margin;
    return safeParseFloat(margin);
};


export const getStatusColor = (status: string) => ({
    'Won': '#28a745', 'Lost': '#dc3545', 'Negotiation': '#ffc107',
    'Proposal': '#17a2b8', 'Discovery': '#6c757d', 'On Hold': '#fd7e14',
}[status] || '#6c757d');

export const NotesIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
);

export const TrashIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
);

export const EditIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
);

export const SaveIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
);

export const CancelIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
);

export const DocumentIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
);

export const ChangeHistoryIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 4v6h6"/><path d="M23 20v-6h-6"/><path d="M20.49 9A9 9 0 0 0 12 5C8.49 5 5.25 6.74 3.34 9.51L1 10"/><path d="M3.51 15A9 9 0 0 0 12 19c3.51 0 6.75-1.74 8.66-4.49l2.34-1.51"/></svg>
);

export const TruckIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="3" width="15" height="13"></rect>
        <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
        <circle cx="5.5" cy="18.5" r="2.5"></circle>
        <circle cx="18.5" cy="18.5" r="2.5"></circle>
    </svg>
);

export const ArrowUpIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>
);

export const ArrowDownIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>
);

export const ChevronDownIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
);

export const HelpIcon = ({ onClick }: { onClick: () => void; }) => (
    <button onClick={onClick} className="help-icon-btn" title="Help">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
    </button>
);

let tempIdCounter = -1;
export const getTempId = () => tempIdCounter--;

export const StatCard: FC<{ title: string; value: string; }> = ({ title, value }) => (
    <div className="stat-card">
        <h4 className="stat-title">{title}</h4>
        <p className="stat-value">{value}</p>
    </div>
);
