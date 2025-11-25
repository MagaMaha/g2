

import React, { useState, useEffect, useCallback } from 'react';
import { supabase, HelpIcon, getTempId, TruckIcon } from './lib';
import { Session } from '@supabase/supabase-js';
import { Auth } from './components/Auth';
import {
    Prospect, Contact, Document, ProspectRoute, ProspectRouteDriver,
    ContactChange, DropdownOption, ExtendedDropdownOption, Tab,
    ModalState, ProspectFormData, ManagedRoute, SavePayload, DocumentFormData,
    DriverSourceOption, DriverStatusOption, RecruiterOption, OptionManagerProps, UserRole
} from './types';
import { DashboardView, MgmtReportView, RecruitingDashboardView, MonthlyPerformanceView } from './components/DashboardViews';
import { ProspectsView, ProspectForm, ContactForm } from './components/Prospects';
import { DriversView, RoutesManager, DriverSelectorModal, DriverForm, RoutesCardView } from './components/Drivers';
import { DocumentsView, DocumentForm } from './components/Documents';
import { AdminView } from './components/AdminView';
import { Modal } from './components/Modal';

const DASHBOARD_TABS: Tab[] = ['dashboard', 'bod_report', 'performance', 'recruiting'];

export const App = () => {
    // --- AUTH STATE ---
    const [session, setSession] = useState<Session | null>(null);
    const [userRole, setUserRole] = useState<UserRole | null>(null);
    const [loading, setLoading] = useState(true);

    // --- STATE ---
    const [activeTab, setActiveTab] = useState<Tab>('dashboard');
    const [prospects, setProspects] = useState<Prospect[]>([]);
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [documents, setDocuments] = useState<Document[]>([]);
    const [prospectRoutes, setProspectRoutes] = useState<ProspectRoute[]>([]);
    const [prospectRouteDrivers, setProspectRouteDrivers] = useState<ProspectRouteDriver[]>([]);
    const [contactChanges, setContactChanges] = useState<ContactChange[]>([]);
    const [helpContent, setHelpContent] = useState<Map<Tab, string>>(new Map());

    // Options
    const [statusOptions, setStatusOptions] = useState<DropdownOption[]>([]);
    const [contactViaOptions, setContactViaOptions] = useState<DropdownOption[]>([]);
    const [documentTypes, setDocumentTypes] = useState<DropdownOption[]>([]);
    const [sourceOptions, setSourceOptions] = useState<DropdownOption[]>([]);
    const [driverSourceOptions, setDriverSourceOptions] = useState<ExtendedDropdownOption[]>([]);
    const [driverStatusOptions, setDriverStatusOptions] = useState<DriverStatusOption[]>([]);
    const [recruiterOptions, setRecruiterOptions] = useState<DropdownOption[]>([]);
    const [reasonTerminatedOptions, setReasonTerminatedOptions] = useState<DropdownOption[]>([]);
    const [reasonRejectedOptions, setReasonRejectedOptions] = useState<DropdownOption[]>([]);
    const [vehicleTypeOptions, setVehicleTypeOptions] = useState<DropdownOption[]>([]);
    const [routeEmailRecipients, setRouteEmailRecipients] = useState<DropdownOption[]>([]);

    // UI State
    const [docSearchTerm, setDocSearchTerm] = useState('');
    const [modalState, setModalState] = useState<ModalState>({ mode: null });
    const [showRoutesManager, setShowRoutesManager] = useState(false);
    const [manageRoutesProspect, setManageRoutesProspect] = useState<Prospect | null>(null);
    const [isDriverSelectorOpen, setIsDriverSelectorOpen] = useState(false);
    const [driverSelectorRouteId, setDriverSelectorRouteId] = useState<number | null>(null);
    const [driverToEdit, setDriverToEdit] = useState<Partial<ProspectRouteDriver> | null>(null);
    const [showDocumentModal, setShowDocumentModal] = useState(false);
    const [documentToEdit, setDocumentToEdit] = useState<Document | null>(null);
    const [showHelp, setShowHelp] = useState(false);
    const [notesModalData, setNotesModalData] = useState<{ title: string; content: React.ReactNode } | null>(null);
    const [preselectedRouteId, setPreselectedRouteId] = useState<number | null>(null);

    const isDashboardActive = DASHBOARD_TABS.includes(activeTab);

    // --- AUTH & DATA FETCHING ---
    useEffect(() => {
        if (!supabase) {
            setLoading(false);
            return;
        }

        // Check for Auth Redirect hash
        const hash = window.location.hash;
        const isAuthRedirect = hash && (hash.includes('access_token') || hash.includes('error_description'));

        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            // If not waiting for a redirect to resolve, stop loading
            if (!isAuthRedirect) {
                 setLoading(false);
            }
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((event, session) => {
            setSession(session);
            setLoading(false);
            
            // Clean up hash after successful login
            if (event === 'SIGNED_IN' && window.location.hash.includes('access_token')) {
                 window.history.replaceState(null, '', window.location.pathname + window.location.search);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const refreshData = useCallback(async () => {
        if (!supabase || !session) return;

        // 1. Fetch User Role
        const { data: roleData } = await supabase
            .from('user_roles')
            .select('*')
            .eq('user_id', session.user.id)
            .maybeSingle();
        
        let effectiveRole = roleData?.role as UserRole || 'viewer';

        // EMERGENCY OVERRIDE for Owner to prevent lockout
        // We keep this purely for UI access, but we no longer attempt to write to the DB here
        // to avoid RLS errors.
        const isOwner = session.user.email === 'rodgerbloch@me.com';
        
        if (isOwner) {
             effectiveRole = 'admin';
        }
        
        setUserRole(effectiveRole);

        // 2. Fetch App Data
        const [
            p, c, d, pr, prd, cc,
            so, cvo, dt, sOpt, dso, dstat, ro, rto, rro, vto, rer, hc
        ] = await Promise.all([
            supabase.from('prospects').select('*').order('name'),
            supabase.from('contacts').select('*').order('contact_date', { ascending: false }),
            supabase.from('documents').select('*').order('created_at', { ascending: false }),
            supabase.from('prospect_routes').select('*'),
            supabase.from('prospect_route_drivers').select('*'),
            supabase.from('contact_changes').select('*').order('created_at', { ascending: false }),
            supabase.from('status_options').select('*').order('sort_order'),
            supabase.from('contact_via_options').select('*').order('sort_order'),
            supabase.from('document_types').select('*').order('sort_order'),
            supabase.from('source_options').select('*').order('sort_order'),
            supabase.from('driver_source_options').select('*').order('sort_order'),
            supabase.from('driver_status_options').select('*').order('sort_order'),
            supabase.from('recruiter_options').select('*').order('sort_order'),
            supabase.from('reason_terminated_options').select('*').order('sort_order'),
            supabase.from('reason_rejected_options').select('*').order('sort_order'),
            supabase.from('vehicle_type_options').select('*').order('sort_order'),
            supabase.from('route_email_recipients').select('*').order('sort_order'),
            supabase.from('help_content').select('*')
        ]);

        if (p.data) setProspects(p.data);
        if (c.data) setContacts(c.data);
        if (d.data) setDocuments(d.data);
        if (pr.data) setProspectRoutes(pr.data);
        if (prd.data) setProspectRouteDrivers(prd.data);
        if (cc.data) setContactChanges(cc.data);

        if (so.data) setStatusOptions(so.data);
        if (cvo.data) setContactViaOptions(cvo.data);
        if (dt.data) setDocumentTypes(dt.data);
        if (sOpt.data) setSourceOptions(sOpt.data);
        if (dso.data) setDriverSourceOptions(dso.data);
        if (dstat.data) setDriverStatusOptions(dstat.data as DriverStatusOption[]);
        if (ro.data) setRecruiterOptions(ro.data);
        if (rto.data) setReasonTerminatedOptions(rto.data);
        if (rro.data) setReasonRejectedOptions(rro.data);
        if (vto.data) setVehicleTypeOptions(vto.data);
        if (rer.data) setRouteEmailRecipients(rer.data);

        if (hc.data) {
            const map = new Map<Tab, string>();
            // Use page_id based on user feedback
            hc.data.forEach((item: any) => map.set(item.page_id, item.content));
            setHelpContent(map);
        }
    }, [session]);

    useEffect(() => {
        if (session) {
            refreshData();
        }
    }, [refreshData, session]);


    // --- HANDLERS: PROSPECTS & CONTACTS ---
    const handleSaveProspect = async (data: ProspectFormData) => {
        if (!supabase || userRole === 'viewer') return;
        
        // Extract ID separately so we don't pass it in the payload for insert/update body if not needed
        const { id, ...rest } = data;
        
        // Sanitize: Convert empty strings to null for optional fields
        const payload = {
            name: rest.name,
            contact_name: rest.contact_name || null,
            address: rest.address || null,
            city: rest.city || null,
            state: rest.state || null,
            zip_code: rest.zip_code || null,
            phone_number: rest.phone_number || null,
            email: rest.email || null,
        };

        try {
            if (id) {
                const { error } = await supabase.from('prospects').update(payload).eq('id', id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('prospects').insert([payload]);
                if (error) throw error;
            }
            setModalState({ mode: null });
            await refreshData();
        } catch (error: any) {
            console.error('Save error:', error);
            alert('Error saving opportunity: ' + (error.message || JSON.stringify(error)));
        }
    };

    const handleDeleteProspect = async (id: number) => {
        if (!supabase || userRole !== 'admin' || !window.confirm('Are you sure? This will delete all contacts and data for this opportunity.')) return;
        const { error } = await supabase.from('prospects').delete().eq('id', id);
        if (error) alert('Error deleting: ' + error.message);
        else refreshData();
    };

    const handleSaveContact = async (contact: Contact | Omit<Contact, 'id' | 'created_at'>) => {
        if (!supabase || userRole === 'viewer') return;

        // Sanitize payload
        const { ...cleanContact } = contact as any;
        if (cleanContact.id) delete cleanContact.id; // Don't send ID in update body
        delete cleanContact.created_at; // Don't send system fields

        // Ensure numeric fields are null if empty
        if (cleanContact.actual === '') cleanContact.actual = null;
        if (cleanContact.final_gross_margin === '') cleanContact.final_gross_margin = null;

        try {
            if ('id' in contact && contact.id) {
                const { error } = await supabase.from('contacts').update(cleanContact).eq('id', contact.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('contacts').insert([cleanContact]);
                if (error) throw error;
            }
            setModalState({ mode: null });
            await refreshData();
        } catch (error: any) {
            console.error('Save contact error:', error);
            alert('Error saving contact: ' + (error.message || JSON.stringify(error)));
        }
    };

    const handleDeleteContact = async (id: number) => {
        if (!supabase || userRole !== 'admin' || !window.confirm('Delete this contact?')) return;
        const { error } = await supabase.from('contacts').delete().eq('id', id);
        if (error) alert('Error deleting contact: ' + error.message);
        else refreshData();
    };

    // --- HANDLERS: DOCUMENTS ---
    const handleSaveDocument = async (formData: DocumentFormData, file: File | null) => {
        if (!supabase || userRole === 'viewer') return;
        
        let storagePath = '';
        let fileName = '';

        if (file) {
            const fileExt = file.name.split('.').pop();
            fileName = file.name;
            const filePath = `${Math.random()}.${fileExt}`;
            const { error: uploadError } = await supabase.storage.from('documents').upload(filePath, file);
            if (uploadError) {
                alert('Error uploading file: ' + uploadError.message);
                return;
            }
            storagePath = filePath;
        }

        const payload: any = {
            prospect_id: parseInt(formData.prospect_id),
            document_type_id: parseInt(formData.document_type_id),
            description: formData.description,
            notes: formData.notes,
        };

        if (storagePath) {
            payload.storage_path = storagePath;
            payload.file_name = fileName;
        }

        if (documentToEdit) {
            const { error } = await supabase.from('documents').update(payload).eq('id', documentToEdit.id);
            if (error) alert('Error updating document: ' + error.message);
        } else {
            if (!storagePath) {
                 alert('File is required for new documents.');
                 return;
            }
            const { error } = await supabase.from('documents').insert([payload]);
            if (error) alert('Error creating document: ' + error.message);
        }
        setShowDocumentModal(false);
        setDocumentToEdit(null);
        refreshData();
    };

    const handleDeleteDocument = async (doc: Document) => {
        if (!supabase || userRole !== 'admin' || !window.confirm('Delete this document?')) return;
        const { error } = await supabase.from('documents').delete().eq('id', doc.id);
        if (error) alert('Error deleting document record: ' + error.message);
        else refreshData();
    };

    // --- HANDLERS: DRIVERS & ROUTES ---
    const handleSaveDriver = async (driver: Partial<ProspectRouteDriver>) => {
        if (!supabase || userRole === 'viewer') return;
        
        // 1. Prepare Payload
        const { id, created_at, routeInfo, ...basePayload } = driver as any;
        
        // 2. Sanitize payload
        const payload: any = {};
        Object.keys(basePayload).forEach(key => {
            let val = basePayload[key];
            
            // Ensure foreign keys are numbers or null
            if (key === 'prospect_route_id') {
                 if (val === '' || val === null || val === undefined) {
                     val = null;
                 } else {
                     const num = parseInt(String(val));
                     val = isNaN(num) ? null : num;
                 }
            }
            
            // Remove objects (except valid nulls)
            if (val && typeof val === 'object' && key !== 'status_change_date') { 
                console.warn(`Warning: Object found in payload key '${key}'. Converting to string.`);
                val = String(val);
            }

            payload[key] = val === undefined ? null : val;
        });

        // 3. Calculate Metrics (Days to Fill & Retention)
        if (payload.date_onboarded) {
            const onboardedTime = new Date(payload.date_onboarded).getTime();
            
            // Retention
            const endTime = payload.date_terminated 
                ? new Date(payload.date_terminated).getTime() 
                : new Date().getTime();
            
            if (!isNaN(onboardedTime) && !isNaN(endTime)) {
                const retentionDays = Math.round((endTime - onboardedTime) / (1000 * 60 * 60 * 24));
                payload.retention = retentionDays > 0 ? retentionDays : 0;
            } else {
                payload.retention = null;
            }

            // Days to Fill
            // UPDATED LOGIC: Date Onboarded - Date Added
            if (payload.date_added) {
                const addedTime = new Date(payload.date_added).getTime();
                 if (!isNaN(onboardedTime) && !isNaN(addedTime)) {
                    const fillDays = Math.round((onboardedTime - addedTime) / (1000 * 60 * 60 * 24));
                    payload.days_to_fill = fillDays > 0 ? fillDays : 0;
                 }
            }
        } else {
            payload.days_to_fill = null;
            payload.retention = null;
        }

        // 4. Execute Save
        try {
            if (id && id > 0) {
                const { error } = await supabase.from('prospect_route_drivers').update(payload).eq('id', id);
                if (error) throw error;
            } else {
                 const { error } = await supabase.from('prospect_route_drivers').insert([payload]);
                 if (error) throw error;
            }
            refreshData();
        } catch (error: any) {
            // Specific check for generated column error
            if (error.code === '428C9') {
                throw new Error("Database Error: Columns 'days_to_fill' or 'retention' are set to READ-ONLY. Please run the SQL script to DROP and RE-ADD these columns as standard numeric columns.");
            }
            throw error;
        }
    };

    const handleDeleteDriver = async (id: number) => {
        if (!supabase || userRole !== 'admin' || !window.confirm('Delete this driver?')) return;
        const { error } = await supabase.from('prospect_route_drivers').delete().eq('id', id);
        if (error) alert('Error deleting driver: ' + error.message);
        else refreshData();
    };

    const handleSaveRoutes = async (payload: Pick<SavePayload, 'routeUpdates' | 'routeCreates' | 'routeDeletes'>): Promise<boolean> => {
        if (!supabase || userRole === 'viewer') return false;
        
        try {
            // Helper to sanitize route object for DB
            const prepareRouteForDb = (r: any) => {
                const { 
                    id, 
                    drivers, 
                    created_at, 
                    pct_commission, // Remove derived/frontend-only fields
                    ...dbFields 
                } = r;

                const sanitized = { ...dbFields };
                if (sanitized.date_assigned === '') sanitized.date_assigned = null;
                if (sanitized.date_filled === '') sanitized.date_filled = null;
                // Ensure numbers are null if empty string
                if (sanitized.distance === '') sanitized.distance = null;
                if (sanitized.price === '') sanitized.price = null;
                if (sanitized.commission === '') sanitized.commission = null;
                
                return sanitized;
            };

            // Creates
            if (payload.routeCreates.length > 0) {
                const creates = payload.routeCreates.map(r => prepareRouteForDb(r));
                const { error } = await supabase.from('prospect_routes').insert(creates);
                if (error) throw error;
            }
            
            // Updates
            for (const route of payload.routeUpdates) {
                 if (route.id && route.id > 0) {
                     const cleanRoute = prepareRouteForDb(route);
                     const { error } = await supabase.from('prospect_routes').update(cleanRoute).eq('id', route.id);
                     if (error) throw error;
                 }
            }
            
            // Deletes
            if (payload.routeDeletes.length > 0) {
                const { error } = await supabase.from('prospect_routes').delete().in('id', payload.routeDeletes);
                if (error) throw error;
            }
            
            refreshData();
            return true;
        } catch (err: any) {
            alert('Error saving routes: ' + err.message);
            return false;
        }
    };

    const handleUnassignDriver = async (driverId: number) => {
        if (!supabase || userRole === 'viewer') return;
        // We assume 'Onboarded' is the correct status for unassigned drivers unless specified otherwise
        const unassignedRouteId = prospectRoutes.find(r => r.route_id_name === 'Unassigned')?.id || null;
        const { error } = await supabase.from('prospect_route_drivers')
            .update({ prospect_route_id: unassignedRouteId, status: 'Onboarded' })
            .eq('id', driverId);
        
        if (error) alert('Error unassigning driver: ' + error.message);
        else refreshData();
    };
    
    const handleAssignDriverToRoute = async (driverId: number) => {
        if (!supabase || !driverSelectorRouteId || userRole === 'viewer') return;
        const { error } = await supabase.from('prospect_route_drivers')
            .update({ prospect_route_id: driverSelectorRouteId, status: 'Assigned' })
            .eq('id', driverId);
        
        if (error) alert('Error assigning driver: ' + error.message);
        else {
            setIsDriverSelectorOpen(false);
            refreshData();
        }
    };

    const handleNavigateToRoute = (routeId: number) => {
        const route = prospectRoutes.find(r => r.id === routeId);
        if (route) {
            const prospect = prospects.find(p => p.id === route.prospect_id);
            if (prospect) {
                setManageRoutesProspect(prospect);
                setPreselectedRouteId(routeId);
                setShowRoutesManager(true);
                // We keep the 'routes' tab active if we were there, but RoutesManager is a modal, so it overlays everything.
                // If coming from another tab, this logic might need adjustment, but since we are clicking FROM the Routes tab, it's fine.
            }
        }
    };

    // --- HANDLERS: ADMIN & OPTIONS ---
    const handleOptionOperation = async (
        tableName: OptionManagerProps['tableName'], 
        operation: 'insert' | 'update' | 'delete' | 'reorder', 
        payload: any
    ) => {
        if (!supabase || userRole !== 'admin') return;
        
        if (operation === 'insert') {
            // Get max sort order
            const { data } = await supabase.from(tableName).select('sort_order').order('sort_order', { ascending: false }).limit(1);
            const nextOrder = (data && data[0]) ? data[0].sort_order + 1 : 1;
            await supabase.from(tableName).insert([{ name: payload, sort_order: nextOrder }]);
        } else if (operation === 'update') {
            await supabase.from(tableName).update(payload).eq('id', payload.id);
        } else if (operation === 'delete') {
            await supabase.from(tableName).delete().eq('id', payload);
        } else if (operation === 'reorder') {
             // Payload is expected to be the full array in new order
             const updates = payload.map((opt: any, index: number) => ({
                 id: opt.id,
                 name: opt.name,
                 sort_order: index + 1,
                 ...(tableName === 'driver_status_options' ? { is_slot_filler: opt.is_slot_filler } : {})
             }));
             
             // Supabase doesn't have a bulk update that's easy for different values, so we loop (for small lists this is fine)
             for (const update of updates) {
                 await supabase.from(tableName).update(update).eq('id', update.id);
             }
        }
        refreshData();
    };

    const handleUpdateHelpContent = async (tab: Tab, content: string) => {
        if (!supabase || userRole !== 'admin') return false;
        
        try {
            // STRATEGY: Update first. If no rows matched, then Insert.
            // This bypasses issues where SELECT might be restricted or return nothing,
            // avoiding unnecessary INSERT calls that trigger RLS errors.
            
            const { data, error: updateError } = await supabase
                .from('help_content')
                .update({ content })
                .eq('page_id', tab)
                .select('id'); // Select ID to check if a row was actually touched

            if (updateError) throw updateError;

            // If data is empty or null, no row existed to update -> Insert
            if (!data || data.length === 0) {
                 const { error: insertError } = await supabase
                    .from('help_content')
                    .insert([{ page_id: tab, content }]);
                 
                 if (insertError) throw insertError;
            }

            refreshData();
            return true;
        } catch (err: any) {
            console.error('Help save error:', err);
            // Better error message
            let msg = err.message || 'Unknown error';
            if (err.code === '42501') msg += ' (Permission Denied)';
            alert(`Failed to save help: ${msg}`);
            return false;
        }
    };

    // --- DERIVED STATE ---
    const unassignedRouteId = prospectRoutes.find(r => r.route_id_name === 'Unassigned')?.id || null;

    // Determine which form to show in main modal
    const renderModalContent = () => {
        const isViewer = userRole === 'viewer';
        
        // Case 1: Editing existing Prospect
        if (modalState.prospectId && !modalState.contact && modalState.mode === 'edit') {
            return (
                <ProspectForm 
                    prospectToEdit={prospects.find(p => p.id === modalState.prospectId)}
                    onSave={handleSaveProspect}
                    onCancel={() => setModalState({ mode: null })}
                    readOnly={isViewer}
                />
            );
        }
        
        // Case 2: Adding/Editing Contact (requires a prospectId)
        if (modalState.prospectId || modalState.contact) {
             return (
                <ContactForm 
                    contact={
                        modalState.contact || 
                        {
                            prospect_id: modalState.prospectId!, 
                            contact_name: prospects.find(p => p.id === modalState.prospectId)?.contact_name || '', 
                            contact_date: new Date().toISOString().split('T')[0],
                            status: 'Discovery',
                            completed: false,
                            probability: 0,
                            gross_margin: 0,
                            forecast: 0,
                            source: '',
                            contact_via: '',
                            notes: ''
                        } as any
                    } 
                    onSave={handleSaveContact}
                    onCancel={() => setModalState({ mode: null })}
                    statusOptions={statusOptions}
                    contactViaOptions={contactViaOptions}
                    sourceOptions={sourceOptions}
                    isSourceFeatureEnabled={true}
                    readOnly={isViewer}
                    userRole={userRole}
                />
            );
        }

        // Case 3: Adding New Prospect (Default fallback)
        return (
            <ProspectForm 
                onSave={handleSaveProspect}
                onCancel={() => setModalState({ mode: null })}
                readOnly={isViewer}
            />
        );
    };

    if (loading) {
        return (
            <div className="loading-overlay">
                <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px'}}>
                    <div className="loading-spinner"></div>
                    <p style={{color: 'var(--subtle-text-color)'}}>Loading...</p>
                </div>
            </div>
        );
    }

    if (!session) {
        return <Auth />;
    }

    return (
        <div className="app-container">
            <header className="top-nav">
                <div className="header-left" style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                    <TruckIcon />
                    <h1>Routes & Drivers</h1>
                </div>
                <nav className="nav-tabs">
                    <button 
                        className={isDashboardActive ? 'active' : ''} 
                        onClick={() => { if(!isDashboardActive) setActiveTab('dashboard'); }}
                    >
                        Dashboards
                    </button>
                    {userRole !== 'dispatcher' && (
                        <button className={activeTab === 'prospects' ? 'active' : ''} onClick={() => setActiveTab('prospects')}>Opportunities</button>
                    )}
                    <button className={activeTab === 'routes' ? 'active' : ''} onClick={() => setActiveTab('routes')}>Routes</button>
                    <button className={activeTab === 'drivers' ? 'active' : ''} onClick={() => setActiveTab('drivers')}>Drivers</button>
                    <button className={activeTab === 'documents' ? 'active' : ''} onClick={() => { setActiveTab('documents'); setDocSearchTerm(''); }}>Documents</button>
                    {userRole === 'admin' && (
                        <button className={activeTab === 'admin' ? 'active' : ''} onClick={() => setActiveTab('admin')}>Admin</button>
                    )}
                </nav>
                <div className="header-actions">
                    <div className="user-role-badge" style={{ marginRight: '16px', fontSize: '0.8rem', padding: '4px 8px', borderRadius: '4px', backgroundColor: '#e9ecef', color: '#495057' }}>
                        {session.user.email} ({userRole})
                    </div>
                    <button className="logout-btn" onClick={() => supabase?.auth.signOut()}>Sign Out</button>
                    <HelpIcon onClick={() => setShowHelp(true)} />
                </div>
            </header>

            <main className="app-content">
                {isDashboardActive && (
                    <div className="sub-nav-wrapper">
                        <nav className="nav-tabs" style={{marginBottom: 0}}>
                            <button className={activeTab === 'dashboard' ? 'active' : ''} onClick={() => setActiveTab('dashboard')}>Sales</button>
                            <button className={activeTab === 'bod_report' ? 'active' : ''} onClick={() => setActiveTab('bod_report')}>Mgmt. Report</button>
                            <button className={activeTab === 'performance' ? 'active' : ''} onClick={() => setActiveTab('performance')}>Monthly Performance</button>
                            <button className={activeTab === 'recruiting' ? 'active' : ''} onClick={() => setActiveTab('recruiting')}>Recruiting</button>
                        </nav>
                    </div>
                )}

                {activeTab === 'dashboard' && (
                    <DashboardView prospects={prospects} contacts={contacts} statusOptions={statusOptions} />
                )}
                {activeTab === 'bod_report' && (
                    <MgmtReportView prospects={prospects} contacts={contacts} />
                )}
                {activeTab === 'performance' && (
                    <MonthlyPerformanceView prospects={prospects} contacts={contacts} />
                )}
                {activeTab === 'recruiting' && (
                    <RecruitingDashboardView 
                        drivers={prospectRouteDrivers} 
                        routes={prospectRoutes} 
                        prospects={prospects}
                        unassignedRouteId={unassignedRouteId}
                        statusOptions={driverStatusOptions}
                        sourceOptions={driverSourceOptions}
                        onNavigateToRoute={handleNavigateToRoute}
                    />
                )}
                {activeTab === 'prospects' && (
                    <ProspectsView 
                        prospects={prospects} 
                        contacts={contacts} 
                        documents={documents}
                        contactChanges={contactChanges}
                        prospectRoutes={prospectRoutes}
                        statusOptions={statusOptions}
                        isRoutesFeatureEnabled={true}
                        userRole={userRole}
                        onEditContact={(c) => setModalState({ mode: 'edit', contact: c, prospectId: c.prospect_id })}
                        onAddNewContact={(pid) => setModalState({ mode: 'new', prospectId: pid })}
                        onAddNewProspect={() => setModalState({ mode: 'new' })}
                        onDeleteProspect={handleDeleteProspect}
                        onDeleteContact={handleDeleteContact}
                        onEditProspect={(p) => setModalState({ mode: 'edit', prospectId: p.id })}
                        onNavigateToDocuments={(name) => { setActiveTab('documents'); setDocSearchTerm(name); }}
                        onShowNotes={(p) => {
                            const notes = contacts.filter(c => c.prospect_id === p.id && c.notes).map(c => `${c.contact_date} (${c.contact_name}): ${c.notes}`).join('\n\n');
                            setNotesModalData({ title: `Notes: ${p.name}`, content: <div style={{whiteSpace: 'pre-wrap'}}>{notes}</div> });
                        }}
                        onShowChangeHistory={(p) => {
                             // Simple history view logic
                             const changes = contactChanges.filter(c => c.prospect_id === p.id);
                             setNotesModalData({ 
                                 title: `Change History: ${p.name}`, 
                                 content: (
                                     <ul className="change-history-list">
                                         {changes.map(c => (
                                             <li key={c.id} className="modal-list-entry">
                                                 <div className="modal-list-meta"><strong>{new Date(c.created_at).toLocaleDateString()}</strong></div>
                                                 <div className="modal-list-description">
                                                    {c.field_name} changed from <span style={{color: 'var(--danger-color)'}}>"{c.old_value}"</span> to <span style={{color: 'var(--success-color)'}}>"{c.new_value}"</span>
                                                 </div>
                                             </li>
                                         ))}
                                         {changes.length === 0 && <li>No changes recorded.</li>}
                                     </ul>
                                 )
                             });
                        }}
                        onManageRoutes={(p) => { setManageRoutesProspect(p); setShowRoutesManager(true); }}
                    />
                )}
                {activeTab === 'routes' && (
                    <RoutesCardView 
                        routes={prospectRoutes} 
                        prospects={prospects} 
                        contacts={contacts}
                        drivers={prospectRouteDrivers} 
                        statusOptions={statusOptions}
                        onNavigateToRoute={handleNavigateToRoute}
                        onNavigateToDocuments={(name) => { setActiveTab('documents'); setDocSearchTerm(name); }}
                    />
                )}
                {activeTab === 'drivers' && (
                    <DriversView 
                        drivers={prospectRouteDrivers}
                        routes={prospectRoutes}
                        prospects={prospects}
                        contacts={contacts}
                        sourceOptions={driverSourceOptions}
                        statusOptions={driverStatusOptions}
                        recruiterOptions={recruiterOptions}
                        unassignedRouteId={unassignedRouteId}
                        onSaveDriver={handleSaveDriver}
                        onDeleteDriver={handleDeleteDriver}
                        reasonTerminatedOptions={reasonTerminatedOptions}
                        reasonRejectedOptions={reasonRejectedOptions}
                        vehicleTypeOptions={vehicleTypeOptions}
                        emailRecipients={routeEmailRecipients}
                        onEditDriver={(d) => setDriverToEdit(d)}
                        userRole={userRole}
                    />
                )}
                {activeTab === 'documents' && (
                    <DocumentsView 
                        documents={documents}
                        prospects={prospects}
                        documentTypes={documentTypes}
                        searchTerm={docSearchTerm}
                        onSearchChange={setDocSearchTerm}
                        onClearSearch={() => setDocSearchTerm('')}
                        showBackButton={false}
                        onReturnToProspects={() => setActiveTab('prospects')}
                        onDeleteDocument={handleDeleteDocument}
                        onEditDocument={(doc) => { setDocumentToEdit(doc); setShowDocumentModal(true); }}
                        onUploadDocument={() => { setDocumentToEdit(null); setShowDocumentModal(true); }}
                        userRole={userRole}
                    />
                )}
                {activeTab === 'admin' && userRole === 'admin' && (
                    <AdminView 
                        statusOptions={statusOptions}
                        contactViaOptions={contactViaOptions}
                        documentTypes={documentTypes}
                        sourceOptions={sourceOptions}
                        driverSourceOptions={driverSourceOptions}
                        driverStatusOptions={driverStatusOptions}
                        recruiterOptions={recruiterOptions}
                        reasonTerminatedOptions={reasonTerminatedOptions}
                        reasonRejectedOptions={reasonRejectedOptions}
                        vehicleTypeOptions={vehicleTypeOptions}
                        routeEmailRecipients={routeEmailRecipients}
                        onAddOption={(table, name) => handleOptionOperation(table, 'insert', name)}
                        onUpdateOption={(table, pl) => handleOptionOperation(table, 'update', pl)}
                        onDeleteOption={(table, id) => handleOptionOperation(table, 'delete', id)}
                        onReorderOption={async (table, opts, index, direction) => {
                            const newOpts = [...opts];
                            if (direction === 'up' && index > 0) {
                                [newOpts[index], newOpts[index - 1]] = [newOpts[index - 1], newOpts[index]];
                            } else if (direction === 'down' && index < newOpts.length - 1) {
                                [newOpts[index], newOpts[index + 1]] = [newOpts[index + 1], newOpts[index]];
                            }
                            await handleOptionOperation(table, 'reorder', newOpts);
                        }}
                        isDocumentsFeatureEnabled={true}
                        isSourceFeatureEnabled={true}
                        isRoutesFeatureEnabled={true}
                        isHelpFeatureEnabled={true}
                        helpContent={helpContent}
                        onUpdateHelpContent={handleUpdateHelpContent}
                    />
                )}
            </main>

            {/* MODALS */}
            
            {/* Prospect/Contact Modal */}
            {modalState.mode && (
                <Modal 
                    onClose={() => setModalState({ mode: null })} 
                    title={
                        modalState.prospectId && !modalState.contact 
                        ? (modalState.mode === 'new' ? 'New Interaction' : 'Edit Opportunity') 
                        : modalState.contact 
                            ? 'Edit Interaction' 
                            : 'New Opportunity'
                    }
                >
                    {renderModalContent()}
                </Modal>
            )}

            {/* Routes Manager Modal */}
            {showRoutesManager && manageRoutesProspect && (
                <Modal onClose={() => { setShowRoutesManager(false); setPreselectedRouteId(null); }} title={`Manage Routes: ${manageRoutesProspect.name}`} size="fullscreen">
                    <RoutesManager 
                        prospect={manageRoutesProspect}
                        routes={prospectRoutes.filter(r => r.prospect_id === manageRoutesProspect.id)}
                        drivers={prospectRouteDrivers} // Pass all, internal filtering handles logic
                        statusOptions={driverStatusOptions}
                        onSaveRoutes={handleSaveRoutes}
                        onUnassignDriver={handleUnassignDriver}
                        onOpenDriverForm={(driver) => setDriverToEdit(driver)}
                        onOpenDriverSelector={(routeId) => { setDriverSelectorRouteId(routeId); setIsDriverSelectorOpen(true); }}
                        onCancel={() => { setShowRoutesManager(false); setPreselectedRouteId(null); }}
                        vehicleTypeOptions={vehicleTypeOptions}
                        emailRecipients={routeEmailRecipients}
                        initialRouteId={preselectedRouteId}
                        readOnly={userRole === 'viewer'}
                        userRole={userRole}
                    />
                </Modal>
            )}

            {/* Edit Driver Modal (from Routes Manager) */}
            {driverToEdit && (
                <Modal onClose={() => setDriverToEdit(null)} title={`Edit Driver: ${driverToEdit.driver_name}`} size="xlarge">
                    <DriverForm
                        driver={driverToEdit}
                        title={`Edit Driver: ${driverToEdit.driver_name}`}
                        onSave={async (d) => {
                            try {
                                await handleSaveDriver(d);
                                setDriverToEdit(null);
                            } catch (e: any) {
                                let msg = "Unknown error";
                                if (e instanceof Error) msg = e.message;
                                else if (e && typeof e === 'object') {
                                     // Try to extract message from Supabase error object
                                     if ('message' in e && typeof e.message === 'string') msg = e.message;
                                     else if ('details' in e && typeof e.details === 'string') msg = e.details;
                                     else msg = JSON.stringify(e);
                                } else {
                                     msg = String(e);
                                }
                                alert(`Save failed: ${msg}`);
                            }
                        }}
                        onCancel={() => setDriverToEdit(null)}
                        sourceOptions={driverSourceOptions}
                        statusOptions={driverStatusOptions}
                        recruiterOptions={recruiterOptions}
                        reasonTerminatedOptions={reasonTerminatedOptions}
                        reasonRejectedOptions={reasonRejectedOptions}
                        vehicleTypeOptions={vehicleTypeOptions}
                        routes={prospectRoutes}
                        prospects={prospects}
                        unassignedRouteId={unassignedRouteId}
                        emailRecipients={routeEmailRecipients}
                        readOnly={userRole === 'viewer'}
                    />
                </Modal>
            )}

            {/* Driver Selector Modal (Nested) */}
            {isDriverSelectorOpen && (
                <Modal onClose={() => setIsDriverSelectorOpen(false)} title="Assign Driver" size="xlarge">
                    <DriverSelectorModal 
                        drivers={prospectRouteDrivers.filter(d => d.status === 'Recruiting' || d.status === 'Verifications' || d.status === 'Compliant' || (d.status === 'Assigned' && d.prospect_route_id === unassignedRouteId) || d.status === 'Unassigned' || d.status === 'Onboarded')}
                        routes={prospectRoutes}
                        prospects={prospects}
                        unassignedRouteId={unassignedRouteId}
                        onSelectDriver={handleAssignDriverToRoute}
                        onCancel={() => setIsDriverSelectorOpen(false)}
                    />
                </Modal>
            )}

            {/* Document Modal */}
            {showDocumentModal && (
                <Modal onClose={() => setShowDocumentModal(false)} title={documentToEdit ? 'Edit Document' : 'Upload Document'}>
                    <DocumentForm 
                        prospects={prospects}
                        documentTypes={documentTypes}
                        documentToEdit={documentToEdit}
                        onSave={handleSaveDocument}
                        onCancel={() => setShowDocumentModal(false)}
                        readOnly={userRole === 'viewer'}
                    />
                </Modal>
            )}

            {/* Generic Info/Notes Modal */}
            {notesModalData && (
                <Modal onClose={() => setNotesModalData(null)} title={notesModalData.title}>
                    <div className="notes-content">
                        {notesModalData.content}
                    </div>
                    <div className="modal-footer" style={{marginTop: '20px', textAlign: 'right'}}>
                        <button className="form-btn cancel-btn" onClick={() => setNotesModalData(null)}>Close</button>
                    </div>
                </Modal>
            )}
            
            {/* Help Modal */}
            {showHelp && (
                <Modal onClose={() => setShowHelp(false)} title={`Help: ${activeTab.replace('_', ' ').toUpperCase()}`} size="xlarge">
                    <div 
                        className="help-content-display"
                        dangerouslySetInnerHTML={{ __html: helpContent.get(activeTab) || '<p>No help content available for this section.</p>' }}
                    />
                </Modal>
            )}
        </div>
    );
};