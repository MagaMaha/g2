

import React, { FC, useState, useMemo, useEffect } from 'react';
import { 
    Prospect, Contact, ProspectRoute, ProspectRouteDriver, 
    DriverSourceOption, RecruiterOption,
    DriverStatusOption, DropdownOption, ManagedRoute, SavePayload, UserRole
} from '../types';
import { 
    formatDate, getTempId, TrashIcon, EditIcon, formatCurrency, safeParseFloat, getStatusColor, DocumentIcon
} from '../lib';
import { Modal } from './Modal';


export const RoutesCardView: FC<{
    routes: ProspectRoute[];
    prospects: Prospect[];
    contacts: Contact[];
    drivers: ProspectRouteDriver[];
    statusOptions: DropdownOption[];
    onNavigateToRoute: (routeId: number) => void;
    onNavigateToDocuments: (prospectName: string) => void;
}> = ({ routes, prospects, contacts, drivers, statusOptions, onNavigateToRoute, onNavigateToDocuments }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [prospectFilter, setProspectFilter] = useState('All');
    const [statusFilter, setStatusFilter] = useState('All');
    
    // Helper to get prospect info
    const getProspectInfo = (prospectId: number) => {
        const prospect = prospects.find(p => p.id === prospectId);
        if (!prospect) return { name: 'Unknown Opportunity', status: 'Unknown' };
        
        // Find latest contact for status
        const prospectContacts = contacts
            .filter(c => c.prospect_id === prospectId)
            .sort((a, b) => {
                const dateA = new Date(a.contact_date || '1970-01-01').getTime();
                const dateB = new Date(b.contact_date || '1970-01-01').getTime();
                return dateB - dateA;
            });
            
        const status = prospectContacts.length > 0 ? prospectContacts[0].status : 'New';
        return { name: prospect.name, status };
    };

    const allRouteCards = useMemo(() => {
        return routes.filter(r => r.route_id_name !== 'Unassigned').map(route => {
            const { name: prospectName, status } = getProspectInfo(route.prospect_id);
            const routeDrivers = drivers.filter(d => 
                d.prospect_route_id === route.id && 
                !['Terminated', 'Rejected'].includes(d.status)
            );
            
            const filled = routeDrivers.length;
            const open = Math.max(0, route.drivers_needed - filled);
            
            // Date logic
            let dateLabel = 'Expected Start Date';
            let dateValue = route.date_assigned;

            // Check if there is a 'filled' date which acts as actual start
            if (route.date_filled) {
                dateLabel = 'Start Date';
                dateValue = route.date_filled;
            }

            return {
                id: route.id,
                prospectName,
                routeName: route.route_id_name,
                status,
                driversNeeded: route.drivers_needed,
                filled,
                open,
                dateLabel,
                dateValue: dateValue ? formatDate(dateValue) : 'N/A'
            };
        }).sort((a, b) => a.prospectName.localeCompare(b.prospectName));
    }, [routes, prospects, contacts, drivers]);

    const filteredRouteCards = useMemo(() => {
        return allRouteCards.filter(card => {
            const matchesSearch = !searchTerm || 
                card.prospectName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                card.routeName.toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesProspect = prospectFilter === 'All' || card.prospectName === prospectFilter;
            const matchesStatus = statusFilter === 'All' || card.status === statusFilter;

            return matchesSearch && matchesProspect && matchesStatus;
        });
    }, [allRouteCards, searchTerm, prospectFilter, statusFilter]);

    // Unique options for dropdowns
    const uniqueProspects = useMemo(() => Array.from(new Set(allRouteCards.map(c => c.prospectName))).sort(), [allRouteCards]);

    return (
        <div>
            <div className="controls-container">
                <div className="filters">
                    <input 
                        type="text" 
                        placeholder="Search routes..." 
                        className="search-input"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                    <label>Opportunity:</label>
                    <select value={prospectFilter} onChange={e => setProspectFilter(e.target.value)}>
                        <option value="All">All Opportunities</option>
                        {uniqueProspects.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <label>Status:</label>
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                        <option value="All">All Statuses</option>
                        {statusOptions.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                    </select>
                    <button className="clear-filters-btn" onClick={() => { setSearchTerm(''); setProspectFilter('All'); setStatusFilter('All'); }}>Clear Filters</button>
                </div>
            </div>

            <div className="routes-grid">
                {filteredRouteCards.map(card => (
                    <div key={card.id} className="route-card" onClick={() => onNavigateToRoute(card.id)}>
                        <div className="route-card-header">
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div className="route-card-title">{card.prospectName}</div>
                                    <button 
                                        className="icon-link-btn" 
                                        onClick={(e) => { e.stopPropagation(); onNavigateToDocuments(card.prospectName); }}
                                        title="View Documents"
                                    >
                                        <DocumentIcon />
                                    </button>
                                </div>
                                <div className="route-card-subtitle">{card.routeName}</div>
                            </div>
                            <span className="status-badge" style={{ backgroundColor: getStatusColor(card.status) }}>
                                {card.status}
                            </span>
                        </div>
                        
                        <div className="route-card-stats">
                            <div className="route-stat">
                                <span className="route-stat-value">{card.driversNeeded}</span>
                                <span className="route-stat-label">Needed</span>
                            </div>
                            <div className="route-stat">
                                <span className="route-stat-value" style={{color: 'var(--success-color)'}}>{card.filled}</span>
                                <span className="route-stat-label">Filled</span>
                            </div>
                            <div className="route-stat">
                                <span className="route-stat-value" style={{color: card.open > 0 ? 'var(--danger-color)' : 'var(--subtle-text-color)'}}>{card.open}</span>
                                <span className="route-stat-label">Open</span>
                            </div>
                        </div>
                        
                        <div className="route-card-footer">
                            <div>
                                <span className="route-date-label">{card.dateLabel}:</span>
                                <span>{card.dateValue}</span>
                            </div>
                        </div>
                    </div>
                ))}
                {filteredRouteCards.length === 0 && (
                    <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
                        <h3>No Routes Found</h3>
                        <p>{allRouteCards.length === 0 ? "Add routes within an Opportunity to see them here." : "No routes match your filters."}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export const DriversView: FC<{
    drivers: ProspectRouteDriver[];
    routes: ProspectRoute[];
    prospects: Prospect[];
    contacts: Contact[];
    sourceOptions: DriverSourceOption[];
    statusOptions: DriverStatusOption[];
    recruiterOptions: RecruiterOption[];
    unassignedRouteId: number | null;
    onSaveDriver: (driver: Partial<ProspectRouteDriver>) => Promise<void>;
    onDeleteDriver: (id: number) => Promise<void>;
    reasonTerminatedOptions: DropdownOption[];
    reasonRejectedOptions: DropdownOption[];
    vehicleTypeOptions: DropdownOption[];
    emailRecipients: DropdownOption[];
    onEditDriver: (driver: Partial<ProspectRouteDriver>) => void;
    userRole: UserRole | null;
}> = ({ drivers, routes, prospects, statusOptions, unassignedRouteId, onDeleteDriver, onEditDriver, userRole }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [hideInactive, setHideInactive] = useState(false); // State for filtering inactive
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' } | null>({ key: 'created_at', direction: 'descending' });

    // Helper to get route name
    const getRouteName = (routeId: number | null) => {
        if (!routeId) return 'Unassigned';
        if (unassignedRouteId && routeId === unassignedRouteId) return 'Unassigned';
        const route = routes.find(r => r.id === routeId);
        if (!route) return 'Unknown';
        const prospect = prospects.find(p => p.id === route.prospect_id);
        return `${prospect?.name || 'Unknown Opportunity'} - ${route.route_id_name}`;
    };

    const getDriverStatusColor = (status: string) => {
        switch (status) {
            case 'Assigned': return '#6D28D9'; // Purple
            case 'Compliant': 
            case 'Onboarded': return '#10B981'; // Green
            case 'Recruiting': 
            case 'Verifications': return '#3B82F6'; // Blue
            case 'Rejected': 
            case 'Terminated': return '#EF4444'; // Red
            case 'Unassigned': return '#F59E0B'; // Orange/Yellow
            default: return '#6c757d'; // Grey
        }
    };

    const filteredDrivers = useMemo(() => {
        let filtered = drivers.filter(d => {
            const matchesSearch = !searchTerm || 
                (d.driver_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (d.city || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (d.state || '').toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesStatus = statusFilter === 'All' || d.status === statusFilter;
            
            // Filter out Rejected and Terminated if hideInactive is true
            const matchesInactiveFilter = hideInactive ? !['Rejected', 'Terminated'].includes(d.status) : true;

            return matchesSearch && matchesStatus && matchesInactiveFilter;
        });

        if (sortConfig) {
            filtered.sort((a, b) => {
                const { key, direction } = sortConfig;
                let aVal: any = (a as any)[key];
                let bVal: any = (b as any)[key];
                const dir = direction === 'ascending' ? 1 : -1;

                if (key === 'route') {
                    aVal = getRouteName(a.prospect_route_id);
                    bVal = getRouteName(b.prospect_route_id);
                }

                if (aVal == null) return 1;
                if (bVal == null) return -1;
                if (aVal < bVal) return -1 * dir;
                if (aVal > bVal) return 1 * dir;
                return 0;
            });
        }
        return filtered;
    }, [drivers, searchTerm, statusFilter, hideInactive, sortConfig, routes, prospects, unassignedRouteId]);

    const requestSort = (key: string) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIndicator = (key: string) => {
        if (!sortConfig || sortConfig.key !== key) return null;
        return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
    };

    const isAdmin = userRole === 'admin';
    const isViewer = userRole === 'viewer';

    return (
        <div>
            <div className="controls-container">
                <div className="filters">
                    <input
                        type="text"
                        placeholder="Search drivers..."
                        className="search-input"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                        <option value="All">All Statuses</option>
                        {statusOptions.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                    </select>
                    <button 
                        className="clear-filters-btn" 
                        onClick={() => setHideInactive(!hideInactive)}
                        style={{ 
                            backgroundColor: hideInactive ? 'var(--primary-color)' : '#f0f0f0',
                            color: hideInactive ? 'white' : 'var(--text-color)',
                            borderColor: hideInactive ? 'var(--primary-color)' : 'var(--border-color)'
                        }}
                    >
                        {hideInactive ? 'Show All Drivers' : 'Hide Rejected/Terminated'}
                    </button>
                    <button className="clear-filters-btn" onClick={() => { setSearchTerm(''); setStatusFilter('All'); setHideInactive(false); }}>Clear Filters</button>
                </div>
                {!isViewer && <button className="add-prospect-btn" onClick={() => onEditDriver({ status: 'Recruiting' })}>+ Add Driver</button>}
            </div>
            <div className="table-container">
                <table className="documents-table">
                    <thead>
                        <tr>
                            <th onClick={() => requestSort('driver_name')}>Name{getSortIndicator('driver_name')}</th>
                            <th onClick={() => requestSort('city')}>Location{getSortIndicator('city')}</th>
                            <th onClick={() => requestSort('status')}>Status{getSortIndicator('status')}</th>
                            <th onClick={() => requestSort('route')}>Assigned Route{getSortIndicator('route')}</th>
                            <th onClick={() => requestSort('date_added')}>Date Added{getSortIndicator('date_added')}</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredDrivers.length > 0 ? (
                            filteredDrivers.map(driver => (
                                <tr key={driver.id}>
                                    <td>
                                        <button className="link-style-button" onClick={() => onEditDriver(driver)}>
                                            {driver.driver_name}
                                        </button>
                                    </td>
                                    <td>{[driver.city, driver.state].filter(Boolean).join(', ') || '-'}</td>
                                    <td>
                                        <span 
                                            className="status-badge" 
                                            style={{ backgroundColor: getDriverStatusColor(driver.status) }}
                                        >
                                            {driver.status}
                                        </span>
                                    </td>
                                    <td>{getRouteName(driver.prospect_route_id)}</td>
                                    <td>{formatDate(driver.date_added)}</td>
                                    <td>
                                        <div className="table-actions">
                                            <button className="edit-doc-btn" onClick={() => onEditDriver(driver)} title={isViewer ? "View" : "Edit"}><EditIcon /></button>
                                            {isAdmin && <button className="delete-option-btn" onClick={() => onDeleteDriver(driver.id)} title="Delete"><TrashIcon /></button>}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan={6} style={{ textAlign: 'center' }}>No drivers found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export const DriverForm: FC<{
    driver: Partial<ProspectRouteDriver>;
    title: string;
    onSave: (driver: Partial<ProspectRouteDriver>) => void;
    onCancel: () => void;
    sourceOptions: DriverSourceOption[];
    statusOptions: DriverStatusOption[];
    recruiterOptions: RecruiterOption[];
    reasonTerminatedOptions: DropdownOption[];
    reasonRejectedOptions: DropdownOption[];
    vehicleTypeOptions: DropdownOption[];
    routes: ProspectRoute[];
    prospects: Prospect[];
    unassignedRouteId: number | null;
    emailRecipients: DropdownOption[];
    readOnly?: boolean;
}> = ({ driver: initialDriver, title, onSave, onCancel, sourceOptions, statusOptions, recruiterOptions, reasonTerminatedOptions, reasonRejectedOptions, vehicleTypeOptions, routes, prospects, unassignedRouteId, emailRecipients, readOnly }) => {
    const [driver, setDriver] = useState(initialDriver);
    const [emailRecipient, setEmailRecipient] = useState('');

    useEffect(() => {
        setDriver({
            ...initialDriver,
            paperwork_in: initialDriver.paperwork_in ?? 'No',
            drug_bg_check: initialDriver.drug_bg_check ?? 'No'
        });
    }, [initialDriver]);

    const routeOptions = useMemo(() => {
        const prospectMap = new Map(prospects.map(p => [p.id, p.name]));
        return routes
            .filter(r => r.id !== unassignedRouteId) // Exclude the special 'Unassigned' route
            .map(r => ({
                id: r.id,
                name: `${prospectMap.get(r.prospect_id) || 'Unknown Opportunity'} - ${r.route_id_name}`
            }))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [routes, prospects, unassignedRouteId]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        if (readOnly) return;
        const { name, value } = e.target;
        
        // Generalize the null conversion for all optional fields.
        const processedValue = value === '' ? null : value;

        setDriver(prev => {
            const newState = { ...prev, [name]: processedValue };
            
            // 1. Compliance Logic (Auto-update Status)
            // This must run BEFORE status history logic to capture the auto-change
            if (name === 'paperwork_in' || name === 'drug_bg_check') {
                const currentPaperwork = name === 'paperwork_in' ? processedValue : (prev.paperwork_in || 'No');
                const currentDrugBg = name === 'drug_bg_check' ? processedValue : (prev.drug_bg_check || 'No');
    
                if (currentPaperwork === 'Yes' && currentDrugBg === 'Yes') {
                     if (prev.status !== 'Assigned') {
                        newState.status = 'Compliant';
                     }
                } else {
                    if (prev.status !== 'Assigned') {
                        newState.status = 'Verifications';
                    }
                }
            }

            // 2. Clean up Reason fields if Status is no longer relevant
            if (newState.status !== 'Terminated') {
                newState.reason_terminated = null;
            }
            if (newState.status !== 'Rejected') {
                newState.reason_rejected = null;
            }

            // 3. Status Change History Logic
            // Compare the NEW intended status against the ORIGINAL database status (initialDriver.status)
            const currentStatus = newState.status;
            const originalStatus = initialDriver.status;

            if (currentStatus !== originalStatus) {
                 // Show the status we are changing FROM (the original status)
                 newState.status_changed_from = originalStatus || 'Recruiting'; 
                 // Show the status we are changing TO
                 newState.status_changed_to = currentStatus;
                 
                 // Use local date for immediate display
                 const d = new Date();
                 const offset = d.getTimezoneOffset() * 60000;
                 newState.status_change_date = new Date(d.getTime() - offset).toISOString().split('T')[0];
            } else {
                // If status matches original (e.g. user changed it then changed it back), restore original history
                newState.status_changed_from = initialDriver.status_changed_from;
                newState.status_changed_to = initialDriver.status_changed_to;
                newState.status_change_date = initialDriver.status_change_date;
            }

            return newState;
        });
    };

    const handleEmailDriver = () => {
        if (!emailRecipient) return;
        
        const subject = `CALL NOW! Driver Details: ${driver.driver_name || 'New Driver'}`;
        const body = `
Driver Name: ${driver.driver_name || 'N/A'}
Phone: ${driver.phone_number || 'N/A'}
Email: ${driver.email || 'N/A'}
Status: ${driver.status || 'N/A'}
Source: ${driver.source || 'N/A'}
Address: ${[driver.address, driver.city, driver.state, driver.zipcode].filter(Boolean).join(', ') || 'N/A'}
Vehicle Type: ${driver.vehicle_type || 'N/A'}
Assigned Route: ${routeOptions.find(r => r.id === driver.prospect_route_id)?.name || 'Unassigned'}
Notes: ${driver.notes || ''}
        `.trim();
        
        window.location.href = `mailto:${emailRecipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!readOnly) onSave(driver);
    };
    
    // Ensure current status is visible in dropdown even if archived/missing from options
    const effectiveStatusOptions = useMemo(() => {
        if (driver.status && !statusOptions.some(o => o.name === driver.status)) {
             return [...statusOptions, { id: -1, name: driver.status, sort_order: 0, is_slot_filler: false }];
        }
        return statusOptions;
    }, [driver.status, statusOptions]);

    return (
        <form className="driver-form" onSubmit={handleSubmit}>
            <h3 className="form-section-title" style={{ gridColumn: '1 / -1' }}>{title}</h3>
            
            {/* 1. Date Added */}
            <div className="form-field" style={{ gridColumn: '1 / 3' }}>
                <label>Date Added</label>
                <input type="date" name="date_added" value={driver.date_added || ''} onChange={handleChange} disabled={readOnly} />
            </div>
            
            {/* 2. Driver # */}
            <div className="form-field" style={{ gridColumn: '3 / 5' }}>
                <label>Driver #</label>
                <input type="text" name="driver_number" value={driver.driver_number || ''} onChange={handleChange} disabled={readOnly} />
            </div>
            
            {/* 3. Driver Name */}
            <div className="form-field" style={{ gridColumn: '5 / 9' }}>
                <label>Driver Name</label>
                <input type="text" name="driver_name" value={driver.driver_name || ''} onChange={handleChange} required disabled={readOnly} />
            </div>

            {/* 4. Street Address */}
            <div className="form-field" style={{ gridColumn: '1 / 4' }}>
                <label>Street Address</label>
                <input type="text" name="address" value={driver.address || ''} onChange={handleChange} disabled={readOnly} />
            </div>
            
            {/* 5. City */}
            <div className="form-field" style={{ gridColumn: '4 / 6' }}>
                <label>City</label>
                <input type="text" name="city" value={driver.city || ''} onChange={handleChange} disabled={readOnly} />
            </div>
            
            {/* 6. State */}
            <div className="form-field" style={{ gridColumn: '6 / 7' }}>
                <label>State</label>
                <input type="text" name="state" value={driver.state || ''} onChange={handleChange} disabled={readOnly} />
            </div>
            
            {/* 7. Zip Code */}
            <div className="form-field" style={{ gridColumn: '7 / 9' }}>
                <label>Zip Code</label>
                <input type="text" name="zipcode" value={driver.zipcode || ''} onChange={handleChange} disabled={readOnly} />
            </div>

            {/* 8. Phone */}
            <div className="form-field" style={{ gridColumn: '1 / 3' }}>
                <label>Phone</label>
                <input type="tel" name="phone_number" value={driver.phone_number || ''} onChange={handleChange} disabled={readOnly} />
            </div>
            
            {/* 9. Email */}
            <div className="form-field" style={{ gridColumn: '3 / 6' }}>
                <label>Email</label>
                <input type="email" name="email" value={driver.email || ''} onChange={handleChange} disabled={readOnly} />
            </div>
            
            {/* 10. Vehicle Type */}
            <div className="form-field" style={{ gridColumn: '6 / 9' }}>
                <label>Vehicle Type</label>
                <select name="vehicle_type" value={driver.vehicle_type || ''} onChange={handleChange} disabled={readOnly}>
                    <option value="">Select...</option>
                    {vehicleTypeOptions.map(o => <option key={o.id} value={o.name}>{o.name}</option>)}
                </select>
            </div>

            {/* 11. Source */}
            <div className="form-field" style={{ gridColumn: '1 / 4' }}>
                <label>Source</label>
                <select name="source" value={driver.source || ''} onChange={handleChange} disabled={readOnly}>
                    <option value="" disabled>Select...</option>
                    {sourceOptions.map(o => <option key={o.id} value={o.name}>{o.name}</option>)}
                </select>
            </div>
            
            {/* 12. Recruited By */}
            <div className="form-field" style={{ gridColumn: '4 / 9' }}>
                <label>Recruited By</label>
                <select name="recruited_by" value={driver.recruited_by || ''} onChange={handleChange} disabled={readOnly}>
                    <option value="">Select...</option>
                    {recruiterOptions.map(o => <option key={o.id} value={o.name}>{o.name}</option>)}
                </select>
            </div>

            {/* 13. Divider */}
            <hr style={{ gridColumn: '1 / -1', border: 'none', borderTop: '1px solid var(--border-color)', margin: '12px 0' }} />

            {/* 14. Status */}
            <div className="form-field" style={{ gridColumn: '1 / 3' }}>
                <label>Status</label>
                <select name="status" value={driver.status || ''} onChange={handleChange} required disabled={readOnly}>
                    <option value="" disabled>Select...</option>
                    {effectiveStatusOptions.map(o => <option key={o.id} value={o.name}>{o.name}</option>)}
                </select>
            </div>

            {/* 15. Drug/Background */}
            <div className="form-field" style={{ gridColumn: '3 / 6' }}>
                <label>Drug/Background</label>
                <select 
                    name="drug_bg_check" 
                    value={driver.drug_bg_check || 'No'} 
                    onChange={handleChange}
                    disabled={readOnly}
                    style={{ 
                        color: (driver.drug_bg_check || 'No') === 'Yes' ? 'var(--success-color)' : 'var(--danger-color)',
                        fontWeight: '600'
                    }}
                >
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                </select>
            </div>
            
            {/* 16. Paperwork In */}
            <div className="form-field" style={{ gridColumn: '6 / 9' }}>
                <label>Paperwork In</label>
                <select 
                    name="paperwork_in" 
                    value={driver.paperwork_in || 'No'} 
                    onChange={handleChange}
                    disabled={readOnly}
                    style={{ 
                        color: (driver.paperwork_in || 'No') === 'Yes' ? 'var(--success-color)' : 'var(--danger-color)',
                        fontWeight: '600'
                    }}
                >
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                </select>
            </div>

            {/* 17. Status Changed From */}
            <div className="form-field" style={{ gridColumn: '1 / 4' }}>
                <label>Status Changed From</label>
                <input type="text" value={driver.status_changed_from || ''} readOnly style={{ backgroundColor: '#f3f4f6', color: '#6b7280' }} placeholder="-" />
            </div>
            
            {/* 18. Status Changed To */}
            <div className="form-field" style={{ gridColumn: '4 / 7' }}>
                <label>Status Changed To</label>
                <input type="text" value={driver.status_changed_to || ''} readOnly style={{ backgroundColor: '#f3f4f6', color: '#6b7280' }} placeholder="-" />
            </div>
            
            {/* 19. Date Changed */}
            <div className="form-field" style={{ gridColumn: '7 / 9' }}>
                <label>Date Changed</label>
                <input type="date" value={driver.status_change_date || ''} readOnly style={{ backgroundColor: '#f3f4f6', color: '#6b7280' }} />
            </div>

            {/* 20. Reason Rejected (Conditional) */}
            {driver.status === 'Rejected' && (
                <div className="form-field" style={{ gridColumn: '1 / 9' }}>
                    <label>Reason Rejected</label>
                    <select name="reason_rejected" value={driver.reason_rejected || ''} onChange={handleChange} disabled={readOnly}>
                        <option value="">Select...</option>
                        {reasonRejectedOptions.map(o => <option key={o.id} value={o.name}>{o.name}</option>)}
                    </select>
                </div>
            )}
            
            {/* 21. Reason Terminated (Conditional) */}
            {driver.status === 'Terminated' && (
                <div className="form-field" style={{ gridColumn: '1 / 5' }}>
                    <label>Reason Terminated</label>
                    <select name="reason_terminated" value={driver.reason_terminated || ''} onChange={handleChange} disabled={readOnly}>
                        <option value="">Select...</option>
                        {reasonTerminatedOptions.map(o => <option key={o.id} value={o.name}>{o.name}</option>)}
                    </select>
                </div>
            )}

            {/* 22. Date Terminated */}
            <div className="form-field" style={{ gridColumn: '1 / 3' }}>
                <label>Date Terminated</label>
                <input type="date" name="date_terminated" value={driver.date_terminated || ''} onChange={handleChange} disabled={readOnly} />
            </div>

            {/* 23. Date Paperwork */}
            <div className="form-field" style={{ gridColumn: '3 / 5' }}>
                <label>Date Paperwork</label>
                <input type="date" name="date_hired" value={driver.date_hired || ''} onChange={handleChange} disabled={readOnly} />
            </div>

            {/* 24. Date Onboarded */}
            <div className="form-field" style={{ gridColumn: '5 / 7' }}>
                <label>Date Onboarded</label>
                <input type="date" name="date_onboarded" value={driver.date_onboarded || ''} onChange={handleChange} disabled={readOnly} />
            </div>

            {/* 25. Assign to Route */}
            <div className="form-field" style={{ gridColumn: '7 / 9' }}>
                <label>Assign to Route</label>
                <select name="prospect_route_id" value={driver.prospect_route_id || ''} onChange={handleChange} disabled={readOnly}>
                    {unassignedRouteId && <option value={unassignedRouteId}>Unassigned</option>}
                    {routeOptions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
            </div>

            {/* 26. Email Driver Details */}
             <div style={{ gridColumn: '1 / -1', padding: '12px', border: '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: '#F9FAFB', marginTop: '8px' }}>
                <h4 style={{ fontSize: '0.9rem', marginBottom: '12px', color: 'var(--text-color)' }}>Email Driver Details</h4>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <select 
                        value={emailRecipient} 
                        onChange={e => setEmailRecipient(e.target.value)} 
                        style={{ flexGrow: 1 }}
                    >
                        <option value="">Select Recipient...</option>
                        {emailRecipients.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                    </select>
                    <button 
                        type="button"
                        className="form-btn" 
                        style={{ backgroundColor: 'var(--secondary-color)', color: 'white', flexShrink: 0 }} 
                        onClick={handleEmailDriver}
                        disabled={!emailRecipient}
                    >
                        Send Email
                    </button>
                </div>
            </div>

            {/* 27. Notes */}
            <div className="form-field" style={{ gridColumn: '1 / -1' }}>
                <label>Notes</label>
                <textarea 
                    name="notes" 
                    value={driver.notes || ''} 
                    onChange={handleChange} 
                    style={{ height: '80px', resize: 'vertical' }} 
                    disabled={readOnly}
                ></textarea>
            </div>

            <div className="form-actions" style={{ gridColumn: '1 / -1' }}>
                <button type="button" className="form-btn cancel-btn" onClick={onCancel}>Cancel</button>
                {!readOnly && <button type="submit" className="form-btn save-btn">Save Driver</button>}
            </div>
        </form>
    );
};

export const DriverSelectorModal: FC<{
    drivers: ProspectRouteDriver[];
    routes?: ProspectRoute[];
    prospects?: Prospect[];
    unassignedRouteId?: number | null;
    onSelectDriver: (driverId: number) => void;
    onCancel: () => void;
}> = ({ drivers, routes, prospects, unassignedRouteId, onSelectDriver, onCancel }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' } | null>({ key: 'driver_name', direction: 'ascending' });

    const getAssignmentLabel = (driver: ProspectRouteDriver) => {
        if (!driver.prospect_route_id || (unassignedRouteId && driver.prospect_route_id === unassignedRouteId)) {
            return 'Unassigned';
        }
        if (routes && prospects) {
            const route = routes.find(r => r.id === driver.prospect_route_id);
            if (route) {
                const prospect = prospects.find(p => p.id === route.prospect_id);
                return `${prospect?.name || 'Unknown'} - ${route.route_id_name}`;
            }
        }
        return 'Unknown Route';
    };

    const filteredAndSortedDrivers = useMemo(() => {
        const lowerCaseSearch = searchTerm.toLowerCase();
        let filtered = drivers.filter(d => 
            !lowerCaseSearch || (d.driver_name || '').toLowerCase().includes(lowerCaseSearch) ||
            (d.city || '').toLowerCase().includes(lowerCaseSearch) ||
            (d.state || '').toLowerCase().includes(lowerCaseSearch)
        );

        if (sortConfig) {
            filtered.sort((a, b) => {
                const key = sortConfig.key;
                const direction = sortConfig.direction === 'ascending' ? 1 : -1;
                
                let aVal: any;
                let bVal: any;

                if (key === 'assignment') {
                    aVal = getAssignmentLabel(a);
                    bVal = getAssignmentLabel(b);
                } else {
                    aVal = a[key as keyof ProspectRouteDriver];
                    bVal = b[key as keyof ProspectRouteDriver];
                }

                if (aVal === null || aVal === undefined) return 1;
                if (bVal === null || bVal === undefined) return -1;
                if (typeof aVal === 'string' && typeof bVal === 'string') {
                    return aVal.localeCompare(bVal) * direction;
                }
                if (aVal < bVal) return -1 * direction;
                if (aVal > bVal) return 1 * direction;
                return 0;
            });
        }

        return filtered;
    }, [drivers, searchTerm, sortConfig, routes, prospects, unassignedRouteId]);

    const requestSort = (key: string) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIndicator = (key: string) => {
        if (!sortConfig || sortConfig.key !== key) return null;
        return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
    };

    return (
        <div className="driver-selector-modal-content">
            <div className="filters" style={{ padding: '0 0 16px 0', borderBottom: '1px solid var(--border-color)', marginBottom: '16px' }}>
                <input
                    type="text"
                    placeholder="Search all drivers..."
                    className="search-input"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    style={{width: '100%'}}
                />
            </div>
            <div className="table-container">
                <table className="documents-table">
                    <thead>
                        <tr>
                            <th onClick={() => requestSort('driver_name')}>Driver Name{getSortIndicator('driver_name')}</th>
                            <th onClick={() => requestSort('city')}>City/State{getSortIndicator('city')}</th>
                            <th onClick={() => requestSort('status')}>Status{getSortIndicator('status')}</th>
                            <th onClick={() => requestSort('assignment')}>Current Assignment{getSortIndicator('assignment')}</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredAndSortedDrivers.length > 0 ? (
                            filteredAndSortedDrivers.map(driver => (
                                <tr key={driver.id}>
                                    <td>{driver.driver_name}</td>
                                    <td>{[driver.city, driver.state].filter(Boolean).join(', ') || 'N/A'}</td>
                                    <td>{driver.status}</td>
                                    <td>{getAssignmentLabel(driver)}</td>
                                    <td>
                                        <button className="form-btn save-btn" style={{padding: '6px 12px'}} onClick={() => onSelectDriver(driver.id)}>
                                            Assign
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan={5} style={{ textAlign: 'center' }}>No available drivers found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export const RoutesManager: FC<{
    prospect: Prospect;
    routes: ProspectRoute[];
    drivers: ProspectRouteDriver[];
    statusOptions: DriverStatusOption[];
    onSaveRoutes: (payload: Pick<SavePayload, 'routeUpdates' | 'routeCreates' | 'routeDeletes'>) => Promise<boolean>;
    onUnassignDriver: (driverId: number) => Promise<void>;
    onOpenDriverForm: (driver: Partial<ProspectRouteDriver>) => void;
    onOpenDriverSelector: (routeId: number) => void;
    onCancel: () => void;
    vehicleTypeOptions: DropdownOption[];
    emailRecipients: DropdownOption[];
    initialRouteId?: number | null;
    readOnly?: boolean;
    userRole?: UserRole | null;
}> = ({ prospect, routes, drivers, statusOptions, onSaveRoutes, onUnassignDriver, onOpenDriverForm, onOpenDriverSelector, onCancel, vehicleTypeOptions, emailRecipients, initialRouteId, readOnly, userRole }) => {
    const [managedRoutes, setManagedRoutes] = useState<ManagedRoute[]>([]);
    const [selectedRouteId, setSelectedRouteId] = useState<number | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [emailRecipient, setEmailRecipient] = useState('');
    const isViewer = userRole === 'viewer';
    const isAdmin = userRole === 'admin';

    useEffect(() => {
        const initialManagedRoutes: ManagedRoute[] = JSON.parse(JSON.stringify(routes)).map((r: ProspectRoute) => ({
            ...r,
            drivers: JSON.parse(JSON.stringify(drivers.filter(d => d.prospect_route_id === r.id)))
        }));
        setManagedRoutes(initialManagedRoutes);

        if (initialRouteId && initialManagedRoutes.some(r => r.id === initialRouteId)) {
            setSelectedRouteId(initialRouteId);
        } else if (!selectedRouteId && initialManagedRoutes.length > 0) {
            setSelectedRouteId(initialManagedRoutes[0].id);
        } else if (selectedRouteId && !initialManagedRoutes.some(r => r.id === selectedRouteId)) {
            setSelectedRouteId(initialManagedRoutes[0]?.id || null);
        }
    }, [routes, drivers, initialRouteId]);
    
    const selectedRoute = useMemo(() => {
        return managedRoutes.find(r => r.id === selectedRouteId);
    }, [selectedRouteId, managedRoutes]);

    const handleRouteInputChange = (routeId: number, field: keyof ManagedRoute, value: any) => {
        if (readOnly) return;
        setManagedRoutes(prev => prev.map(r => {
            if (r.id === routeId) {
                const updatedRoute = { ...r };
                if (['drivers_needed', 'distance', 'price', 'commission'].includes(field)) {
                    const numValue = parseFloat(String(value));
                    (updatedRoute as any)[field] = isNaN(numValue) ? null : numValue;
                } else if (field === 'date_assigned' || field === 'date_filled') {
                    (updatedRoute as any)[field] = value === '' ? null : value;
                } else {
                    (updatedRoute as any)[field] = value;
                }
                return updatedRoute;
            }
            return r;
        }));
    };

    const handleAddRoute = () => {
        if (readOnly) return;
        const tempId = getTempId();
        const newRoute: ManagedRoute = {
            id: tempId,
            prospect_id: prospect.id,
            route_id_name: `New Route ${managedRoutes.length + 1}`,
            drivers_needed: 0,
            date_assigned: null,
            date_filled: null,
            created_at: new Date().toISOString(),
            drivers: [],
            city: null,
            state: null,
            distance: null,
            price: null,
            commission: null,
            pct_commission: null,
            vehicle_type: null,
            start_time: null,
            end_time: null,
        };
        setManagedRoutes(prev => [...prev, newRoute]);
        setSelectedRouteId(tempId);
    };

    const handleDeleteRoute = (routeId: number) => {
        if (readOnly) return;
        if (window.confirm('Are you sure you want to remove this route? Any assigned drivers will become unassigned.')) {
            setManagedRoutes(prev => prev.filter(r => r.id !== routeId));
        }
    };

    const handleSave = async () => {
        if (readOnly) return;
        setIsSaving(true);
        try {
            // Explicitly type the Set as number to avoid 'unknown' inference errors
            const originalRouteIds = new Set<number>(routes.map((r: ProspectRoute) => r.id));
            const currentRouteIds = new Set<number>();
            
            const payload: Pick<SavePayload, 'routeCreates' | 'routeUpdates' | 'routeDeletes'> = {
                routeCreates: [], routeUpdates: [], routeDeletes: [],
            };
            
            const unassignedDriverPromises: Promise<void>[] = [];

            managedRoutes.forEach(route => {
                const { drivers: nestedDrivers, ...routeData } = route;
                if (route.id > 0) {
                    currentRouteIds.add(route.id);
                    payload.routeUpdates.push(routeData);
                } else {
                    payload.routeCreates.push(routeData);
                }
            });
            
            payload.routeDeletes = [...originalRouteIds].filter(id => !currentRouteIds.has(id));

            const routesToDelete = routes.filter(r => payload.routeDeletes.includes(r.id));
            routesToDelete.forEach(r => {
                const driversOnRoute = drivers.filter(d => d.prospect_route_id === r.id);
                driversOnRoute.forEach(d => unassignedDriverPromises.push(onUnassignDriver(d.id)));
            });

            await Promise.all(unassignedDriverPromises);
            const success = await onSaveRoutes(payload);
            
            if (success) {
                onCancel();
            }
        } catch (error) {
            console.error("Error saving routes:", error);
            alert("An unexpected error occurred while saving.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleConfirmUnassign = (e: React.MouseEvent, driverId: number | undefined) => {
        e.stopPropagation(); // CRITICAL: Stop the event from bubbling up to the row or other listeners
        e.preventDefault(); // Prevent accidental form submits
        if (readOnly) return;

        if (!driverId) {
            alert("Cannot unassign: Driver ID is missing or invalid.");
            return;
        }

        // Optimistically update UI immediately
        setManagedRoutes(currentRoutes => 
            currentRoutes.map(route => {
                if (route.drivers.some(d => d.id === driverId)) {
                     return {
                         ...route,
                         drivers: route.drivers.filter(d => d.id !== driverId)
                     };
                }
                return route;
            })
        );
        
        // Perform actual API update in background
        onUnassignDriver(driverId).catch(err => {
            alert("Failed to unassign driver on server. Please refresh.");
            console.error(err);
        });
    };

    const handleEmailRoute = () => {
        if (!selectedRoute || !emailRecipient) return;
        
        const subject = `Route Details: ${prospect.name} - ${selectedRoute.route_id_name}`;
        const body = `
Route Name: ${selectedRoute.route_id_name}
Opportunity: ${prospect.name}
Location: ${[selectedRoute.city, selectedRoute.state].filter(Boolean).join(', ') || 'N/A'}
Drivers Needed: ${selectedRoute.drivers_needed}
Vehicle Type: ${selectedRoute.vehicle_type || 'N/A'}
Distance: ${selectedRoute.distance || '0'} miles
Price: $${selectedRoute.price || '0'}
Commission: $${selectedRoute.commission || '0'}
Working Hours: ${selectedRoute.start_time || ''} - ${selectedRoute.end_time || ''}
Date Assigned: ${selectedRoute.date_assigned || 'N/A'}
        `.trim();
        
        window.location.href = `mailto:${emailRecipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    };

    let daysToFill: number | string = '-';
    if (selectedRoute?.date_assigned && selectedRoute?.date_filled) {
        const start = new Date(selectedRoute.date_assigned).getTime();
        const end = new Date(selectedRoute.date_filled).getTime();
        if (!isNaN(start) && !isNaN(end) && end >= start) {
            daysToFill = Math.round((end - start) / (1000 * 60 * 60 * 24));
        }
    }

    const pctCommission = (selectedRoute && selectedRoute.price && selectedRoute.commission) 
        ? (Number(selectedRoute.commission) / Number(selectedRoute.price)) * 100 
        : null;
    
    return (
        <div className="routes-manager">
            <div className="routes-manager-container">
                <div className="routes-list-pane">
                    <h3>Routes</h3>
                    <div className="routes-list">
                        {managedRoutes.map(route => (
                            <button 
                                key={route.id} 
                                className={`route-list-item ${selectedRouteId === route.id ? 'active' : ''}`}
                                onClick={() => setSelectedRouteId(route.id)}
                            >
                                <span className="route-list-item-name">{route.route_id_name || <em>(Untitled Route)</em>}</span>
                                <span className="route-list-item-badge">{route.drivers.length} / {route.drivers_needed} drivers</span>
                            </button>
                        ))}
                    </div>
                    {!readOnly && <button className="add-route-btn" onClick={handleAddRoute}>+ Add Route</button>}
                </div>

                <div className="routes-detail-pane">
                    {selectedRoute ? (
                        <>
                            <div className="route-detail-header">
                                <h3>Route Details</h3>
                                {!readOnly && isAdmin && (
                                    <button 
                                        className="delete-option-btn" 
                                        onClick={() => handleDeleteRoute(selectedRoute.id)} 
                                        title="Delete Route"
                                    >
                                        <TrashIcon />
                                    </button>
                                )}
                            </div>
                            <div className="route-detail-form">
                                <div className="form-field" style={{ gridColumn: '1 / span 3' }}>
                                    <label>Route ID Name</label>
                                    <input type="text" value={selectedRoute.route_id_name} onChange={(e) => handleRouteInputChange(selectedRoute.id, 'route_id_name', e.target.value)} disabled={readOnly} />
                                </div>
                                <div className="form-field">
                                    <label>Drivers Needed</label>
                                    <input type="number" min="0" value={selectedRoute.drivers_needed} onChange={(e) => handleRouteInputChange(selectedRoute.id, 'drivers_needed', e.target.value)} disabled={readOnly} />
                                </div>

                                <div className="form-field">
                                    <label>City</label>
                                    <input type="text" value={selectedRoute.city || ''} onChange={(e) => handleRouteInputChange(selectedRoute.id, 'city', e.target.value)} disabled={readOnly} />
                                </div>
                                <div className="form-field">
                                    <label>State</label>
                                    <input type="text" value={selectedRoute.state || ''} onChange={(e) => handleRouteInputChange(selectedRoute.id, 'state', e.target.value)} disabled={readOnly} />
                                </div>
                                <div className="form-field">
                                    <label>Distance</label>
                                    <input type="number" min="0" value={selectedRoute.distance || ''} onChange={(e) => handleRouteInputChange(selectedRoute.id, 'distance', e.target.value)} disabled={readOnly} />
                                </div>
                                <div className="form-field">
                                    <label>Vehicle</label>
                                    <select 
                                        value={selectedRoute.vehicle_type || ''} 
                                        onChange={(e) => handleRouteInputChange(selectedRoute.id, 'vehicle_type', e.target.value)}
                                        disabled={readOnly}
                                    >
                                        <option value="">Select...</option>
                                        {vehicleTypeOptions.map(o => (
                                            <option key={o.id} value={o.name}>{o.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {!isViewer && (
                                    <>
                                        <div className="form-field">
                                            <label>Price</label>
                                            <input type="number" min="0" step="0.01" value={selectedRoute.price || ''} onChange={(e) => handleRouteInputChange(selectedRoute.id, 'price', e.target.value)} disabled={readOnly} />
                                        </div>
                                        
                                        <div className="form-field">
                                            <label>Commission</label>
                                            <input type="number" min="0" step="0.01" value={selectedRoute.commission || ''} onChange={(e) => handleRouteInputChange(selectedRoute.id, 'commission', e.target.value)} disabled={readOnly} />
                                        </div>
                                        <div className="form-field">
                                            <label>% Commission</label>
                                            <span className="calculated-days-value">{pctCommission != null ? `${pctCommission.toFixed(2)}%` : '-'}</span>
                                        </div>
                                    </>
                                )}
                                <div className="form-field">
                                    <label>Date Assigned</label>
                                    <input type="date" value={selectedRoute.date_assigned || ''} onChange={(e) => handleRouteInputChange(selectedRoute.id, 'date_assigned', e.target.value)} disabled={readOnly} />
                                </div>
                                
                                <div className="form-field">
                                    <label>Date Filled</label>
                                    <input type="date" value={selectedRoute.date_filled || ''} onChange={(e) => handleRouteInputChange(selectedRoute.id, 'date_filled', e.target.value)} disabled={readOnly} />
                                </div>
                                <div className="form-field">
                                    <label>From</label>
                                    <input type="time" value={selectedRoute.start_time || ''} onChange={(e) => handleRouteInputChange(selectedRoute.id, 'start_time', e.target.value)} disabled={readOnly} />
                                </div>
                                <div className="form-field">
                                    <label>To</label>
                                    <input type="time" value={selectedRoute.end_time || ''} onChange={(e) => handleRouteInputChange(selectedRoute.id, 'end_time', e.target.value)} disabled={readOnly} />
                                </div>
                                <div className="form-field">
                                    <label>Days to Fill</label>
                                    <span className="calculated-days-value">{daysToFill}</span>
                                </div>
                            </div>
                            
                            <div style={{ padding: '16px', border: '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: '#F9FAFB' }}>
                                <h4 style={{ fontSize: '0.9rem', marginBottom: '12px', color: 'var(--text-color)' }}>Email Route Details</h4>
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <select 
                                        value={emailRecipient} 
                                        onChange={e => setEmailRecipient(e.target.value)} 
                                        style={{ flexGrow: 1 }}
                                    >
                                        <option value="">Select Recipient...</option>
                                        {emailRecipients.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                                    </select>
                                    <button 
                                        type="button"
                                        className="form-btn" 
                                        style={{ backgroundColor: 'var(--secondary-color)', color: 'white', flexShrink: 0 }} 
                                        onClick={handleEmailRoute}
                                        disabled={!emailRecipient}
                                    >
                                        Send Email
                                    </button>
                                </div>
                            </div>
                            
                            <div className="route-drivers-section">
                                <h3>Assigned Drivers ({selectedRoute.drivers.length})</h3>
                                <div className="table-container">
                                    <table className="documents-table">
                                        <thead>
                                            <tr>
                                                <th>Driver Name</th>
                                                <th>City/State</th>
                                                <th>Status</th>
                                                <th>Date Onboarded</th>
                                                <th>Date Terminated</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedRoute.drivers.map(driver => (
                                                <tr key={driver.id}>
                                                    <td className="driver-name-cell">
                                                        <button className="link-style-button" onClick={() => onOpenDriverForm(driver)}>
                                                            {driver.driver_name || '-'}
                                                        </button>
                                                    </td>
                                                    <td>{[driver.city, driver.state].filter(Boolean).join(', ') || '-'}</td>
                                                    <td>{driver.status || '-'}</td>
                                                    <td>{formatDate(driver.date_onboarded)}</td>
                                                    <td>{formatDate(driver.date_terminated)}</td>
                                                    <td>
                                                        <div className="table-actions">
                                                            {!readOnly && (
                                                                <button type="button" className="unassign-btn" onClick={(e) => handleConfirmUnassign(e, driver.id)}>
                                                                    Unassign
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                            {selectedRoute.drivers.length === 0 && (
                                                <tr><td colSpan={6} style={{ textAlign: 'center' }}>No drivers assigned to this route.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                {!readOnly && (
                                    <div className="assign-driver-control">
                                        <button
                                            className="add-route-btn"
                                            onClick={() => { if (selectedRoute) onOpenDriverSelector(selectedRoute.id); }}
                                            disabled={!selectedRoute || selectedRoute.id < 0}
                                            title={!selectedRoute || selectedRoute.id < 0 ? "Save the new route first to assign drivers" : "Assign an available driver"}
                                        >
                                            + Assign Driver
                                        </button>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="empty-state">
                            <h3>No Route Selected</h3>
                            <p>Select a route from the list on the left, or add a new one.</p>
                        </div>
                    )}
                </div>
            </div>
            <div className="form-actions">
                <button type="button" className="form-btn cancel-btn" onClick={onCancel}>Close</button>
                {!readOnly && (
                    <button type="button" className="form-btn save-btn" onClick={handleSave} disabled={isSaving}>
                        {isSaving ? 'Saving...' : 'Save All Route Changes'}
                    </button>
                )}
            </div>
        </div>
    );
};