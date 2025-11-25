
import React, { FC, useState, useMemo, useEffect } from 'react';
import { 
    Prospect, Contact, Document, ContactChange, ProspectRoute, DropdownOption, ProspectFormData, UserRole
} from '../types';
import { 
    formatCurrency, formatDate, safeGetDealValue, getStatusColor, TrashIcon, EditIcon, 
    NotesIcon, DocumentIcon, ChangeHistoryIcon, TruckIcon
} from '../lib';

const ContactGrid: FC<{ contact: Contact }> = ({ contact }) => {
    const grossMarginAmount = contact.forecast * (contact.gross_margin / 100);
    const finalGrossMarginAmount = contact.final_gross_margin != null 
        ? safeGetDealValue(contact) * (contact.final_gross_margin / 100) 
        : null;
    
    let balanceOfYear: number | undefined = undefined;
    if (contact.expected_closing && new Date(contact.expected_closing + 'T00:00:00').getFullYear() === new Date().getFullYear()) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const endOfYear = new Date(today.getFullYear(), 11, 31);

        if (today <= endOfYear) {
            const timeDiff = endOfYear.getTime() - today.getTime();
            const daysRemaining = Math.round(timeDiff / (1000 * 60 * 60 * 24)) + 1;
            const dealValue = safeGetDealValue(contact);
            balanceOfYear = (dealValue / 365) * daysRemaining;
        } else {
            balanceOfYear = 0;
        }
    }

    const quoteDueStyle = contact.date_quote_submitted ? { color: '#28a745', fontWeight: 600 } : {};
    const estStartStyle = contact.actual_start_date ? { color: '#28a745', fontWeight: 600 } : {};
    const expCloseStyle = contact.actual_close_date ? { color: '#28a745', fontWeight: 600 } : {};

    return (
        <div className="summary-grid">
            <div className="grid-item">
                <span className="grid-label">As of</span>
                <span className="grid-value">{formatDate(contact.contact_date)}</span>
            </div>
            <div className="grid-item">
                <span className="grid-label">Contact Name</span>
                <span className="grid-value">{contact.contact_name}</span>
            </div>
            <div className="grid-item">
                <span className="grid-label">Status</span>
                <span className="grid-value"><span className="status-badge" style={{ backgroundColor: getStatusColor(contact.status) }}>{contact.status}</span></span>
            </div>
            <div className="grid-item">
                <span className="grid-label">{contact.date_quote_submitted ? 'Quote Submitted' : 'Quote Due'}</span>
                <span className="grid-value" style={quoteDueStyle}>
                    {contact.date_quote_submitted
                        ? formatDate(contact.date_quote_submitted)
                        : formatDate(contact.quote_due_date)}
                </span>
            </div>
            <div className="grid-item">
                <span className="grid-label">{contact.actual_close_date ? 'Actual Close' : 'Exp. Closing'}</span>
                <span className="grid-value" style={expCloseStyle}>
                    {formatDate(contact.actual_close_date || contact.expected_closing)}
                </span>
            </div>
            <div className="grid-item">
                <span className="grid-label">{contact.actual_start_date ? 'Actual Start' : 'Est. Start'}</span>
                <span className="grid-value" style={estStartStyle}>
                    {formatDate(contact.actual_start_date || contact.start_date)}
                </span>
            </div>
            <div className="grid-item">
                <span className="grid-label">Probability</span>
                <span className="grid-value percentage">{contact.probability}</span>
            </div>
            <div className="grid-item">
                <span className="grid-label">Forecast</span>
                <span className="grid-value">{formatCurrency(contact.forecast)}</span>
            </div>
            <div className="grid-item grid-item--compound">
                <div className="compound-item">
                    <span className="grid-label">GM%</span>
                    <span className="grid-value percentage">{contact.gross_margin}</span>
                </div>
                <div className="compound-item">
                    <span className="grid-label">GM$</span>
                    <span className="grid-value">{formatCurrency(grossMarginAmount)}</span>
                </div>
            </div>
            {contact.actual != null && (
                <div className="grid-item">
                    <span className="grid-label">Final Forecast</span>
                    <span className="grid-value grid-value--highlight">{formatCurrency(contact.actual)}</span>
                </div>
            )}
             {contact.final_gross_margin != null && (
                 <div className="grid-item grid-item--compound">
                    <div className="compound-item">
                        <span className="grid-label">Final GM%</span>
                        <span className="grid-value percentage grid-value--highlight">{contact.final_gross_margin}</span>
                    </div>
                    <div className="compound-item">
                        <span className="grid-label">Final GM$</span>
                        <span className="grid-value grid-value--highlight">{formatCurrency(finalGrossMarginAmount)}</span>
                    </div>
                </div>
            )}
            <div className="grid-item">
                <span className="grid-label">Bal of Year</span>
                <span className="grid-value grid-value--highlight">{formatCurrency(balanceOfYear)}</span>
            </div>
        </div>
    );
};

const ProspectCard: FC<{ 
    prospect: Prospect; 
    contacts: Contact[];
    documents: Document[];
    hasChangeHistory: boolean;
    isRoutesFeatureEnabled: boolean;
    userRole: UserRole | null;
    onEditContact: (contact: Contact) => void;
    onAddNewContact: (prospectId: number) => void;
    onDeleteProspect: (prospectId: number) => void;
    onDeleteContact: (contactId: number) => void;
    onEditProspect: (prospect: Prospect) => void;
    onNavigateToDocuments: (prospectName: string) => void;
    onShowNotes: (prospect: Prospect) => void;
    onShowChangeHistory: (prospect: Prospect) => void;
    onManageRoutes: (prospect: Prospect) => void;
}> = ({ prospect, contacts, documents, hasChangeHistory, isRoutesFeatureEnabled, userRole, onEditContact, onAddNewContact, onDeleteProspect, onDeleteContact, onEditProspect, onNavigateToDocuments, onShowNotes, onShowChangeHistory, onManageRoutes }) => {
    const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);

    const sortedContacts = useMemo(() => {
        return [...contacts].sort((a, b) => {
            const dateA = a.contact_date ? new Date(a.contact_date).getTime() : 0;
            const dateB = b.contact_date ? new Date(b.contact_date).getTime() : 0;
            return dateB - dateA;
        });
    }, [contacts]);

    const hasNotes = useMemo(() => contacts.some(c => c.notes && c.notes.trim() !== ''), [contacts]);
    const hasDocuments = useMemo(() => documents.some(d => d.prospect_id === prospect.id), [documents, prospect.id]);

    const latestContact = sortedContacts[0];
    const historicalContacts = sortedContacts;

    const isAdmin = userRole === 'admin';
    const isViewer = userRole === 'viewer';

    return (
        <div className="prospect-card">
            <div 
                className="prospect-summary-card" 
                onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
            >
                <div className="summary-header">
                    <div className="prospect-summary-name">
                        <div className="prospect-name-container">
                            <h2>{prospect.name}</h2>
                            {hasChangeHistory && (
                                <button
                                    className="icon-link-btn"
                                    title="View Change History"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onShowChangeHistory(prospect);
                                    }}
                                >
                                    <ChangeHistoryIcon />
                                </button>
                            )}
                            {hasNotes && (
                                 <button
                                    className="icon-link-btn"
                                    title="View Notes Summary"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onShowNotes(prospect);
                                    }}
                                >
                                    <NotesIcon />
                                </button>
                            )}
                            {hasDocuments && (
                                <button
                                    className="icon-link-btn"
                                    title="View Documents"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onNavigateToDocuments(prospect.name);
                                    }}
                                >
                                    <DocumentIcon />
                                </button>
                            )}
                            {isRoutesFeatureEnabled && (
                                <button
                                    className="icon-link-btn" // Reused class for consistency
                                    title="Manage Routes"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onManageRoutes(prospect);
                                    }}
                                >
                                    <TruckIcon />
                                </button>
                            )}
                        </div>
                        {prospect.contact_name && (
                            <div style={{ color: 'var(--subtle-text-color)', fontSize: '0.9rem', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span>{prospect.contact_name}</span>
                                {prospect.email && (
                                    <>
                                        <span>·</span>
                                        <a href={`mailto:${prospect.email}`} onClick={e => e.stopPropagation()} style={{color: 'var(--primary-color)', textDecoration: 'none', fontWeight: 500}}>
                                            {prospect.email}
                                        </a>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="summary-actions" onClick={(e) => e.stopPropagation()}>
                        {!isViewer && <button className="add-contact-btn" onClick={() => onAddNewContact(prospect.id)}>+ New Interaction</button>}
                        <button className="edit-prospect-btn" onClick={() => onEditProspect(prospect)} title={isViewer ? "View Opportunity Details" : "Edit Opportunity Details"}>
                            <EditIcon />
                        </button>
                        {isAdmin && (
                            <button className="delete-prospect-btn" onClick={() => onDeleteProspect(prospect.id)} aria-label={`Delete opportunity ${prospect.name}`} title="Delete Opportunity">
                                <TrashIcon />
                            </button>
                        )}
                    </div>
                </div>

                {latestContact ? (
                    <ContactGrid contact={latestContact} />
                ) : (
                    <div className="no-contacts-message">
                        <p>No contacts have been added for this opportunity yet.</p>
                    </div>
                )}
            </div>
            
            <div className={`contact-history ${isHistoryExpanded ? 'expanded' : ''}`}>
                <ul className="contact-history-list">
                    {historicalContacts.map(contact => {
                        const isLatest = latestContact && contact.id === latestContact.id;
                        return (
                            <li key={contact.id} className={`historical-contact ${!isLatest ? 'read-only' : ''}`}>
                               <div 
                                    className="historical-contact-info" 
                                    onClick={() => onEditContact(contact)}
                                    title="Click to view/edit interaction details"
                                >
                                   <ContactGrid contact={contact} />
                               </div>
                               {isAdmin && (
                                   <button 
                                        className="delete-contact-btn" 
                                        onClick={(e) => { e.stopPropagation(); onDeleteContact(contact.id); }} 
                                        aria-label={`Delete contact on ${formatDate(contact.contact_date)}`} 
                                        title="Delete Contact"
                                    >
                                        <TrashIcon />
                                    </button>
                               )}
                            </li>
                        );
                    })}
                </ul>
            </div>
        </div>
    );
};

export const ProspectsView: FC<{
    prospects: Prospect[], 
    contacts: Contact[],
    documents: Document[],
    contactChanges: ContactChange[],
    prospectRoutes: ProspectRoute[],
    statusOptions: DropdownOption[],
    isRoutesFeatureEnabled: boolean,
    userRole: UserRole | null,
    onEditContact: (contact: Contact) => void;
    onAddNewContact: (prospectId: number) => void;
    onAddNewProspect: () => void;
    onDeleteProspect: (prospectId: number) => void;
    onDeleteContact: (contactId: number) => void;
    onEditProspect: (prospect: Prospect) => void;
    onNavigateToDocuments: (prospectName: string) => void;
    onShowNotes: (prospect: Prospect) => void;
    onShowChangeHistory: (prospect: Prospect) => void;
    onManageRoutes: (prospect: Prospect) => void;
}> = ({prospects, contacts, documents, contactChanges, prospectRoutes, statusOptions, isRoutesFeatureEnabled, userRole, onEditContact, onAddNewContact, onAddNewProspect, onDeleteProspect, onDeleteContact, onEditProspect, onNavigateToDocuments, onShowNotes, onShowChangeHistory, onManageRoutes}) => {
    const [statusFilter, setStatusFilter] = useState('All');
    const [completedFilter, setCompletedFilter] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState('contact_date_desc');
    
    const handleClearFilters = () => {
        setSearchTerm('');
        setStatusFilter('All');
        setCompletedFilter('All');
        setSortConfig('contact_date_desc');
    };

    const prospectWithContacts = useMemo(() => {
        const changesByProspect = new Map<number, boolean>();
        contactChanges.forEach(c => changesByProspect.set(c.prospect_id, true));

        return prospects.map(p => ({
            prospect: p,
            contacts: contacts
                .filter(c => c.prospect_id === p.id)
                .sort((a, b) => {
                    const dateA = a.contact_date ? new Date(a.contact_date).getTime() : 0;
                    const dateB = b.contact_date ? new Date(b.contact_date).getTime() : 0;
                    return dateB - dateA;
                }),
            hasChangeHistory: changesByProspect.has(p.id),
        }));
    }, [prospects, contacts, contactChanges]);

    const sortedAndFilteredProspects = useMemo(() => {
        const lowerCaseSearchTerm = searchTerm.toLowerCase();

        const filtered = prospectWithContacts
            .filter(({ contacts }) => {
                if (contacts.length === 0) {
                    return statusFilter === 'All' && completedFilter === 'All';
                }
                const latestContact = contacts[0];
                const statusMatch = statusFilter === 'All' || latestContact.status === statusFilter;
                const completedMatch = completedFilter === 'All' || latestContact.completed.toString() === completedFilter;
                return statusMatch && completedMatch;
            })
            .filter(({ prospect, contacts }) => {
                if (!lowerCaseSearchTerm) {
                    return true;
                }
                const prospectNameMatch = (prospect.name || '').toLowerCase().includes(lowerCaseSearchTerm);
                const contactMatch = contacts.some(c =>
                    (c.contact_name || '').toLowerCase().includes(lowerCaseSearchTerm) ||
                    (c.notes && c.notes.toLowerCase().includes(lowerCaseSearchTerm))
                );
                return prospectNameMatch || contactMatch;
            });

        // Apply sorting
        filtered.sort((a, b) => {
            const parts = sortConfig.split('_');
            const direction = parts.pop();
            const key = parts.join('_');
            const dir = direction === 'desc' ? -1 : 1;
    
            if (key === 'name') {
                return (a.prospect.name || '').localeCompare(b.prospect.name || '') * dir;
            }
    
            const latestContactA = a.contacts[0];
            const latestContactB = b.contacts[0];
            
            if (!latestContactA) return 1;
            if (!latestContactB) return -1;
    
            switch (key) {
                case 'contact_date':
                    const dateA = latestContactA.contact_date ? new Date(latestContactA.contact_date).getTime() : 0;
                    const dateB = latestContactB.contact_date ? new Date(latestContactB.contact_date).getTime() : 0;
                    return (dateA - dateB) * dir;
                case 'expected_closing':
                    const closingA = latestContactA.expected_closing ? new Date(latestContactA.expected_closing).getTime() : 0;
                    const closingB = latestContactB.expected_closing ? new Date(latestContactB.expected_closing).getTime() : 0;
                    return (closingA - closingB) * dir;
                case 'forecast':
                    return (latestContactA.forecast - latestContactB.forecast) * dir;
                case 'status':
                    return (latestContactA.status || '').localeCompare(latestContactB.status || '') * dir;
                default:
                    return 0;
            }
        });

        return filtered;
    }, [prospectWithContacts, statusFilter, completedFilter, searchTerm, sortConfig]);

    const handleExportCSV = () => {
        if (sortedAndFilteredProspects.length === 0) {
            alert("No data to export.");
            return;
        }

        const headers = [
            "Opportunity Name", "Status", "Contact Name", "Contact Date",
            "Forecast", "Final Forecast", "Exp. Closing", "Actual Close Date",
            "Quote Due Date", "Est. Start", "Actual Start", "Probability", "GM%", "Final GM%", "GM$",
            "Bal of Year", "Notes"
        ];

        const escapeCSV = (value: any) => {
            if (value == null) return '';
            const str = String(value);
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        };
        
        const rows = sortedAndFilteredProspects.map(({ prospect, contacts }) => {
            const latestContact = contacts[0];
            if (!latestContact) {
                return [escapeCSV(prospect.name), ...Array(headers.length - 1).fill('')];
            }
            
            const grossMarginAmount = latestContact.forecast * (latestContact.gross_margin / 100);

            let balanceOfYear = 'N/A';
            if (latestContact.expected_closing && new Date(latestContact.expected_closing + 'T00:00:00').getFullYear() === new Date().getFullYear()) {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const endOfYear = new Date(today.getFullYear(), 11, 31);
                if (today <= endOfYear) {
                    const timeDiff = endOfYear.getTime() - today.getTime();
                    const daysRemaining = Math.round(timeDiff / (1000 * 60 * 60 * 24)) + 1;
                    const dealValue = safeGetDealValue(latestContact);
                    balanceOfYear = String(Math.round((dealValue / 365) * daysRemaining));
                } else {
                    balanceOfYear = '0';
                }
            }

            return [
                escapeCSV(prospect.name),
                escapeCSV(latestContact.status),
                escapeCSV(latestContact.contact_name),
                escapeCSV(latestContact.contact_date),
                escapeCSV(latestContact.forecast),
                escapeCSV(latestContact.actual),
                escapeCSV(latestContact.expected_closing),
                escapeCSV(latestContact.actual_close_date),
                escapeCSV(latestContact.quote_due_date),
                escapeCSV(latestContact.start_date),
                escapeCSV(latestContact.actual_start_date),
                escapeCSV(latestContact.probability),
                escapeCSV(latestContact.gross_margin),
                escapeCSV(latestContact.final_gross_margin),
                escapeCSV(Math.round(grossMarginAmount)),
                escapeCSV(balanceOfYear),
                escapeCSV(latestContact.notes),
            ];
        });

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", "opportunities_export.csv");
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    return (
        <div>
            <div className="controls-container">
                <div className="filters">
                     <input
                        type="text"
                        placeholder="Search opportunities..."
                        className="search-input"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                    <label>Sort by:</label>
                    <select value={sortConfig} onChange={e => setSortConfig(e.target.value)}>
                        <option value="contact_date_desc">Last Interaction (Newest)</option>
                        <option value="contact_date_asc">Last Interaction (Oldest)</option>
                        <option value="expected_closing_asc">Closing Date (Soonest)</option>
                        <option value="expected_closing_desc">Closing Date (Latest)</option>
                        <option value="forecast_desc">Forecast (High-Low)</option>
                        <option value="forecast_asc">Forecast (Low-High)</option>
                        <option value="name_asc">Name (A-Z)</option>
                        <option value="name_desc">Name (Z-A)</option>
                        <option value="status_asc">Status (A-Z)</option>
                        <option value="status_desc">Status (Z-A)</option>
                    </select>
                    <label>Filter by:</label>
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                        <option value="All">All Statuses</option>
                        {statusOptions.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                    </select>
                    <select value={completedFilter} onChange={e => setCompletedFilter(e.target.value)}>
                        <option value="All">All Completion</option>
                        <option value="true">Completed</option>
                        <option value="false">In Progress</option>
                    </select>
                    <button className="clear-filters-btn" onClick={handleClearFilters}>Clear Filters</button>
                </div>
                 <div className="main-actions">
                    <button className="export-btn" onClick={handleExportCSV}>Export to CSV</button>
                    {userRole !== 'viewer' && <button className="add-prospect-btn" onClick={onAddNewProspect}>Add New Opportunity</button>}
                </div>
            </div>
            
            {sortedAndFilteredProspects.length > 0 ? (
                <div className="prospect-list">
                    {sortedAndFilteredProspects.map(({ prospect, contacts, hasChangeHistory }) => (
                        <ProspectCard 
                            key={prospect.id} 
                            prospect={prospect} 
                            contacts={contacts}
                            documents={documents}
                            hasChangeHistory={hasChangeHistory}
                            isRoutesFeatureEnabled={isRoutesFeatureEnabled}
                            userRole={userRole}
                            onEditContact={onEditContact}
                            onAddNewContact={onAddNewContact}
                            onDeleteProspect={onDeleteProspect}
                            onDeleteContact={onDeleteContact}
                            onEditProspect={onEditProspect}
                            onNavigateToDocuments={onNavigateToDocuments}
                            onShowNotes={onShowNotes}
                            onShowChangeHistory={onShowChangeHistory}
                            onManageRoutes={onManageRoutes}
                        />
                    ))}
                </div>
            ) : (
                <div className="empty-state">
                    <h3>No opportunities found.</h3>
                    <p>Click 'Add New Opportunity' to get started or adjust your filters.</p>
                </div>
            )}
        </div>
    );
};

export const ContactForm: FC<{ 
    contact: Contact | Omit<Contact, 'id' | 'created_at'>; 
    onSave: (updatedContact: Contact | Omit<Contact, 'id' | 'created_at'>) => void; 
    onCancel: () => void; 
    statusOptions: DropdownOption[];
    contactViaOptions: DropdownOption[];
    sourceOptions: DropdownOption[];
    isSourceFeatureEnabled: boolean;
    readOnly?: boolean;
    userRole?: UserRole | null;
}> = ({ contact, onSave, onCancel, statusOptions, contactViaOptions, sourceOptions, isSourceFeatureEnabled, readOnly, userRole }) => {
    const [formData, setFormData] = useState<any>(contact);
    const isViewer = userRole === 'viewer';

    useEffect(() => {
        setFormData(contact);
    }, [contact]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        if (readOnly) return;
        const { name, value, type } = e.target;
        
        let processedValue: any = value;

        if (type === 'number') {
            const num = parseFloat(value);
            if (name === 'actual' || name === 'final_gross_margin') {
                processedValue = (value === '' || isNaN(num)) ? null : num;
            } else {
                processedValue = (value === '' || isNaN(num)) ? 0 : num;
            }
        } else if (type === 'date') {
            processedValue = value === '' ? null : value;
        } else if ((e.target as HTMLInputElement).type === 'checkbox') {
            processedValue = (e.target as HTMLInputElement).checked;
        }

        if (name === 'status') {
            if (value === 'Won' || value === 'Lost') {
                setFormData((prev: any) => ({
                    ...prev,
                    status: value,
                    completed: true,
                }));
            } else {
                setFormData((prev: any) => ({
                    ...prev,
                    status: value,
                    completed: false,
                }));
            }
        } else {
            setFormData((prev: any) => ({ ...prev, [name]: processedValue }));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!readOnly) onSave(formData);
    };

    return (
        <form className="contact-form" onSubmit={handleSubmit}>
             <div className="form-columns">
                <div className="form-column-main">
                    <div className="form-grid">
                        {/* Row 1 */}
                        <div className="form-field">
                            <label>Contact Date <span className="required-asterisk">*</span></label>
                            <input type="date" name="contact_date" value={formData.contact_date || ''} onChange={handleChange} required disabled={readOnly} />
                        </div>
                        <div className="form-field">
                            <label>Contact Name <span className="required-asterisk">*</span></label>
                            <input type="text" name="contact_name" value={formData.contact_name || ''} onChange={handleChange} required disabled={readOnly} />
                        </div>

                        {/* Row 2 */}
                        <div className="form-field">
                            <label>Status</label>
                            <select name="status" value={formData.status || ''} onChange={handleChange} disabled={readOnly}>
                                {statusOptions.map(o => <option key={o.id} value={o.name}>{o.name}</option>)}
                            </select>
                        </div>
                        <div className="form-field">
                            <label>Contact Via</label>
                            <select name="contact_via" value={formData.contact_via || ''} onChange={handleChange} disabled={readOnly}>
                                <option value="">Select...</option>
                                {contactViaOptions.map(o => <option key={o.id} value={o.name}>{o.name}</option>)}
                            </select>
                        </div>

                        {/* Row 3 */}
                         {isSourceFeatureEnabled && (
                             <div className="form-field">
                                <label>Source</label>
                                <select name="source" value={formData.source || ''} onChange={handleChange} disabled={readOnly}>
                                    <option value="">Select...</option>
                                    {sourceOptions.map(o => <option key={o.id} value={o.name}>{o.name}</option>)}
                                </select>
                            </div>
                        )}
                        <div className="form-field">
                             {/* Spacer if source is disabled, or just auto-flow */}
                        </div>

                        {/* Financials Section - Hidden for Viewers */}
                        {!isViewer && (
                            <>
                                <div className="form-section-title" style={{ gridColumn: '1 / -1' }}>Forecast & Probability</div>
                                
                                <div className="form-field">
                                    <label>Forecast $</label>
                                    <input type="number" name="forecast" value={formData.forecast || ''} onChange={handleChange} disabled={readOnly} />
                                </div>
                                <div className="form-field">
                                    <label>Probability %</label>
                                    <input type="number" name="probability" value={formData.probability || ''} onChange={handleChange} disabled={readOnly} />
                                </div>
                                <div className="form-field">
                                    <label>Gross Margin %</label>
                                    <input type="number" name="gross_margin" value={formData.gross_margin || ''} onChange={handleChange} disabled={readOnly} />
                                </div>
                            </>
                        )}
                        
                        <div className="form-field">
                            <label>Expected Closing</label>
                            <input type="date" name="expected_closing" value={formData.expected_closing || ''} onChange={handleChange} disabled={readOnly} />
                        </div>

                        <div className="form-section-title" style={{ gridColumn: '1 / -1' }}>Dates</div>
                        <div className="form-field">
                            <label>Quote Due Date</label>
                            <input type="date" name="quote_due_date" value={formData.quote_due_date || ''} onChange={handleChange} disabled={readOnly} />
                        </div>
                        <div className="form-field">
                            <label>Quote Submitted</label>
                            <input type="date" name="date_quote_submitted" value={formData.date_quote_submitted || ''} onChange={handleChange} disabled={readOnly} />
                        </div>
                        <div className="form-field">
                            <label>Est. Start Date</label>
                            <input type="date" name="start_date" value={formData.start_date || ''} onChange={handleChange} disabled={readOnly} />
                        </div>
                    </div>
                </div>

                <div className="form-column-side">
                    <div className="form-field">
                        <label>Notes</label>
                        <textarea 
                            name="notes" 
                            value={formData.notes || ''} 
                            onChange={handleChange} 
                            style={{ height: '150px', minHeight: '150px', resize: 'vertical' }}
                            disabled={readOnly}
                        ></textarea>
                    </div>

                    {/* Moved Actuals here to save vertical space in main column */}
                    <div>
                        <div className="form-section-title">Actuals (Upon Win)</div>
                        <div className="form-grid" style={{ gridTemplateColumns: '1fr', gap: '16px' }}>
                             {!isViewer && (
                                 <>
                                     <div className="form-field">
                                        <label>Actual Revenue $</label>
                                        <input type="number" name="actual" value={formData.actual || ''} onChange={handleChange} disabled={readOnly} />
                                    </div>
                                    <div className="form-field">
                                        <label>Final GM %</label>
                                        <input type="number" name="final_gross_margin" value={formData.final_gross_margin || ''} onChange={handleChange} disabled={readOnly} />
                                    </div>
                                </>
                            )}
                            <div className="form-field">
                                <label>Actual Close Date</label>
                                <input type="date" name="actual_close_date" value={formData.actual_close_date || ''} onChange={handleChange} disabled={readOnly} />
                            </div>
                            <div className="form-field">
                                <label>Actual Start Date</label>
                                <input type="date" name="actual_start_date" value={formData.actual_start_date || ''} onChange={handleChange} disabled={readOnly} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="form-actions">
                <button type="button" className="form-btn cancel-btn" onClick={onCancel}>Cancel</button>
                {!readOnly && <button type="submit" className="form-btn save-btn">Save Interaction</button>}
            </div>
        </form>
    );
};

export const ProspectForm: FC<{
    prospectToEdit?: Prospect;
    onSave: (data: ProspectFormData) => void;
    onCancel: () => void;
    readOnly?: boolean;
}> = ({ prospectToEdit, onSave, onCancel, readOnly }) => {
    const [formData, setFormData] = useState<ProspectFormData>({
        id: prospectToEdit?.id,
        name: prospectToEdit?.name || '',
        contact_name: prospectToEdit?.contact_name || '',
        address: prospectToEdit?.address || '',
        city: prospectToEdit?.city || '',
        state: prospectToEdit?.state || '',
        zip_code: prospectToEdit?.zip_code || '',
        phone_number: prospectToEdit?.phone_number || '',
        email: prospectToEdit?.email || '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (readOnly) return;
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (readOnly) return;
        if (!formData.name.trim()) {
            alert('Opportunity Name is required');
            return;
        }
        onSave(formData);
    };

    return (
        <form className="contact-form" onSubmit={handleSubmit}>
            <div className="form-grid">
                 <div className="form-field" style={{ gridColumn: '1 / -1' }}>
                    <label>Opportunity Name <span className="required-asterisk">*</span></label>
                    <input type="text" name="name" value={formData.name} onChange={handleChange} required autoFocus disabled={readOnly} />
                </div>
                <div className="form-field">
                    <label>Contact Name</label>
                    <input type="text" name="contact_name" value={formData.contact_name} onChange={handleChange} disabled={readOnly} />
                </div>
                <div className="form-field">
                    <label>Phone</label>
                    <input type="tel" name="phone_number" value={formData.phone_number} onChange={handleChange} disabled={readOnly} />
                </div>
                <div className="form-field" style={{ gridColumn: '1 / -1' }}>
                    <label>Email</label>
                    <input type="email" name="email" value={formData.email} onChange={handleChange} disabled={readOnly} />
                </div>
                
                <div className="form-section-title" style={{ gridColumn: '1 / -1', marginTop: '12px' }}>Address</div>
                <div className="form-field" style={{ gridColumn: '1 / -1' }}>
                    <label>Street Address</label>
                    <input type="text" name="address" value={formData.address} onChange={handleChange} disabled={readOnly} />
                </div>
                <div className="form-field">
                    <label>City</label>
                    <input type="text" name="city" value={formData.city} onChange={handleChange} disabled={readOnly} />
                </div>
                <div className="form-field" style={{ gridColumn: '1 / 2' }}>
                    <label>State</label>
                    <input type="text" name="state" value={formData.state} onChange={handleChange} disabled={readOnly} />
                </div>
                <div className="form-field" style={{ gridColumn: '2 / 3' }}>
                    <label>Zip Code</label>
                    <input type="text" name="zip_code" value={formData.zip_code} onChange={handleChange} disabled={readOnly} />
                </div>
            </div>
            <div className="form-actions">
                <button type="button" className="form-btn cancel-btn" onClick={onCancel}>Cancel</button>
                {!readOnly && <button type="submit" className="form-btn save-btn">{prospectToEdit ? 'Update Opportunity' : 'Create Opportunity'}</button>}
            </div>
        </form>
    );
};
