
import React, { FC, useState, useRef, useEffect } from 'react';
import { DropdownOption, ExtendedDropdownOption, Tab, OptionManagerProps, UserProfile, UserRole } from '../types';
import { 
    SaveIcon, CancelIcon, ArrowUpIcon, ArrowDownIcon, EditIcon, TrashIcon, supabase
} from '../lib';

const UserRoleManager: FC = () => {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchUsers = async () => {
        if (!supabase) return;
        setLoading(true);
        // Fetch from the view we created in SQL
        const { data, error } = await supabase.from('user_profiles_view').select('*').order('email');
        
        if (error) {
            console.error('Error fetching users:', error);
            // Fallback: if view doesn't exist, just show empty list or error
            // alert('Could not load users. Please ensure the "user_profiles_view" SQL script has been run in Supabase.');
        } else {
            setUsers(data || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleRoleChange = (userId: string, newRole: UserRole) => {
        setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, role: newRole } : u));
    };

    const saveUserRole = async (user: UserProfile) => {
        if (!supabase) return;

        try {
            // STRATEGY: Update first. If no rows matched, then Insert.
            // This is more robust than checking for existence first, as it handles
            // concurrency and RLS visibility better.

            // 1. Try to Update existing role
            const { data, error: updateError } = await supabase
                .from('user_roles')
                .update({ role: user.role })
                .eq('user_id', user.user_id)
                .select('id');

            if (updateError) throw updateError;

            // 2. If no rows updated, Insert new role
            if (!data || data.length === 0) {
                 const { error: insertError } = await supabase
                .from('user_roles')
                .insert([{ user_id: user.user_id, role: user.role }]);
                if (insertError) throw insertError;
            }
            
            alert('Role saved successfully.');
        } catch (err: any) {
            console.error('Error saving user role:', err);
            
            let errorMessage = 'Unknown error';
            if (err && typeof err === 'object') {
                if ('message' in err) errorMessage = err.message;
                else if ('details' in err) errorMessage = err.details || JSON.stringify(err);
                else errorMessage = JSON.stringify(err);
            } else {
                errorMessage = String(err);
            }

            if (err?.code === '42501') {
                alert('Permission Denied: You do not have permission to update this role. Ensure you are listed as an Admin in the database.');
            } else if (err?.code === '23514') {
                // Check constraint violation
                alert("Database Limit: The 'dispatcher' role is not allowed by the database constraint.\n\nPlease run this SQL in the Supabase SQL Editor to fix it:\n\nALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;\nALTER TABLE user_roles ADD CONSTRAINT user_roles_role_check CHECK (role IN ('admin', 'editor', 'viewer', 'dispatcher'));");
            } else {
                alert(`Error saving role: ${errorMessage}`);
            }
        }
    };

    return (
        <div className="admin-section">
            <h3>User Management</h3>
            <div className="form-help-text" style={{ marginBottom: '16px', lineHeight: '1.5' }}>
                Assign roles to control access levels. <strong>Changes must be saved manually.</strong><br/>
                <strong>Admin:</strong> Full access to all data and settings.<br/>
                <strong>Editor:</strong> Can add/edit records but cannot delete.<br/>
                <strong>Dispatcher:</strong> Can view all fields, add/edit records, but cannot delete. "Opportunities" tab is hidden.<br/>
                <strong>Viewer:</strong> Read-only access. Sensitive financial data (Forecasts, Margins, Commissions) is hidden.
            </div>
            {loading ? (
                <p style={{ color: 'var(--subtle-text-color)', fontStyle: 'italic' }}>Loading users...</p>
            ) : (
                <ul className="options-list">
                    {users.map(user => (
                        <li key={user.id} className="option-item">
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontWeight: 500 }}>{user.email}</span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--subtle-text-color)' }}>ID: {user.id}</span>
                            </div>
                            <div className="option-actions">
                                <select 
                                    value={user.role} 
                                    onChange={(e) => handleRoleChange(user.user_id, e.target.value as UserRole)}
                                    style={{ 
                                        padding: '4px 8px', 
                                        borderRadius: '4px', 
                                        border: '1px solid var(--input-border-color)',
                                        fontSize: '0.85rem',
                                        width: '100px'
                                    }}
                                >
                                    <option value="admin">Admin</option>
                                    <option value="editor">Editor</option>
                                    <option value="dispatcher">Dispatcher</option>
                                    <option value="viewer">Viewer</option>
                                </select>
                                <button 
                                    className="save-name-btn" 
                                    onClick={() => saveUserRole(user)}
                                    title="Save Role"
                                    style={{ marginLeft: '4px', height: '28px', width: '28px' }}
                                >
                                    <SaveIcon />
                                </button>
                            </div>
                        </li>
                    ))}
                    {users.length === 0 && (
                        <li className="option-item" style={{ color: 'var(--subtle-text-color)' }}>No users found.</li>
                    )}
                </ul>
            )}
        </div>
    );
};

const OptionManager: FC<OptionManagerProps> = ({ title, tableName, options, onAddOption, onUpdateOption, onDeleteOption, onReorderOption }) => {
    const [newItem, setNewItem] = useState('');
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editingName, setEditingName] = useState('');
    const [editingIsSlotFiller, setEditingIsSlotFiller] = useState(false);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newItem.trim()) {
            await onAddOption(tableName, newItem.trim());
            setNewItem('');
        }
    };

    const handleDelete = async (id: number) => {
        if (window.confirm('Are you sure you want to delete this option? This action cannot be undone.')) {
            await onDeleteOption(tableName, id);
        }
    };
    
    const handleStartEdit = (option: ExtendedDropdownOption) => {
        setEditingId(option.id);
        setEditingName(option.name);
         if (tableName === 'driver_status_options') {
            setEditingIsSlotFiller(option.is_slot_filler || false);
        }
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditingName('');
        setEditingIsSlotFiller(false);
    };

    const handleSaveEdit = async () => {
        if (editingId && editingName.trim()) {
            const optionToUpdate = options.find(opt => opt.id === editingId);
            if(optionToUpdate) {
                const updatePayload: any = { ...optionToUpdate, name: editingName.trim() };
                if (tableName === 'driver_status_options') {
                    updatePayload.is_slot_filler = editingIsSlotFiller;
                }
                await onUpdateOption(tableName, updatePayload);
            }
        }
        handleCancelEdit();
    };
    
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSaveEdit();
        if (e.key === 'Escape') handleCancelEdit();
    };

    return (
        <div className="admin-section">
            <h3>{title}</h3>
            <ul className="options-list">
                {options.map((option, index) => (
                    <li key={option.id} className="option-item">
                        {editingId === option.id ? (
                            <>
                                {tableName === 'driver_status_options' && (
                                    <div className="option-item-checkbox">
                                        <input
                                            type="checkbox"
                                            checked={editingIsSlotFiller}
                                            onChange={(e) => setEditingIsSlotFiller(e.target.checked)}
                                            id={`slot-filler-${option.id}`}
                                        />
                                        <label htmlFor={`slot-filler-${option.id}`} title="Counts as a filled driver slot">Slot Filler</label>
                                    </div>
                                )}
                                <input
                                    type="text"
                                    value={editingName}
                                    onChange={(e) => setEditingName(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    className="option-name-input"
                                    autoFocus
                                />
                                <div className="option-actions">
                                    <button onClick={handleSaveEdit} className="save-name-btn" title="Save"><SaveIcon /></button>
                                    <button onClick={handleCancelEdit} className="cancel-name-btn" title="Cancel"><CancelIcon /></button>
                                </div>
                            </>
                        ) : (
                            <>
                                <span>{option.name}</span>
                                <div className="option-actions">
                                    <button className="reorder-btn" onClick={() => onReorderOption(tableName, options, index, 'up')} disabled={index === 0} title="Move Up">
                                        <ArrowUpIcon />
                                    </button>
                                    <button className="reorder-btn" onClick={() => onReorderOption(tableName, options, index, 'down')} disabled={index === options.length - 1} title="Move Down">
                                        <ArrowDownIcon />
                                    </button>
                                    <button className="edit-prospect-btn" onClick={() => handleStartEdit(option)} title="Edit"><EditIcon /></button>
                                    <button className="delete-option-btn" onClick={() => handleDelete(option.id)} aria-label={`Delete ${option.name}`} title="Delete">
                                        <TrashIcon />
                                    </button>
                                </div>
                            </>
                        )}
                    </li>
                ))}
            </ul>
            <form className="add-option-form" onSubmit={handleAdd}>
                <input
                    type="text"
                    value={newItem}
                    onChange={(e) => setNewItem(e.target.value)}
                    placeholder="Add new option..."
                />
                <button type="submit" className="form-btn save-btn">Add</button>
            </form>
        </div>
    );
};

const HelpContentManager: FC<{
    helpContent: Map<Tab, string>;
    onUpdate: (tab: Tab, content: string) => Promise<boolean>;
}> = ({ helpContent, onUpdate }) => {
    const TABS: { id: Tab, name: string }[] = [
        { id: 'dashboard', name: 'Dashboards - Sales' },
        { id: 'bod_report', name: 'Dashboards - Mgmt. Report' },
        { id: 'performance', name: 'Dashboards - Monthly Performance' },
        { id: 'recruiting', name: 'Dashboards - Recruiting' },
        { id: 'prospects', name: 'Opportunities' },
        { id: 'drivers', name: 'Drivers' },
        { id: 'documents', name: 'Documents' },
        { id: 'admin', name: 'Admin' },
    ];
    const [savingTab, setSavingTab] = useState<Tab | null>(null);
    const editorRefs = useRef<Map<Tab, HTMLDivElement | null>>(new Map());
    const savedSelections = useRef<Map<Tab, Range | null>>(new Map());
    
    useEffect(() => {
        TABS.forEach(({ id }) => {
            const editor = editorRefs.current.get(id);
            const content = helpContent.get(id) || '';
            if (editor && editor.innerHTML !== content) {
                editor.innerHTML = content;
            }
        });
    }, [helpContent]);

    const saveSelection = (tab: Tab) => {
        const selection = window.getSelection();
        const editor = editorRefs.current.get(tab);
        if (editor && selection && selection.rangeCount > 0 && editor.contains(selection.anchorNode)) {
            savedSelections.current.set(tab, selection.getRangeAt(0));
        } else {
            savedSelections.current.delete(tab);
        }
    };
    
    const restoreSelection = (tab: Tab) => {
        const editor = editorRefs.current.get(tab);
        editor?.focus();
        const range = savedSelections.current.get(tab);
        if (range) {
            const selection = window.getSelection();
            selection?.removeAllRanges();
            selection?.addRange(range);
        }
    };

    const applyCommand = (tab: Tab, command: string, value: string | null = null) => {
        restoreSelection(tab);
        document.execCommand(command, false, value);
        editorRefs.current.get(tab)?.focus();
    };

    const handleSimpleCommand = (e: React.MouseEvent, tab: Tab, command: string) => {
        e.preventDefault();
        applyCommand(tab, command);
    };
    
    const handleSave = async (tab: Tab) => {
        setSavingTab(tab);
        const editor = editorRefs.current.get(tab);
        if (editor) {
            await onUpdate(tab, editor.innerHTML);
        }
        setSavingTab(null);
    };

    return (
        <div className="admin-section">
            <h3>Help Content Management</h3>
            {TABS.map(({ id, name }) => (
                <div className="help-editor-field" key={id}>
                    <label>Help text for: <strong>{name}</strong></label>
                    <div className="rich-text-toolbar">
                        <button type="button" onMouseDown={(e) => handleSimpleCommand(e, id, 'bold')} title="Bold"><b>B</b></button>
                        <button type="button" onMouseDown={(e) => handleSimpleCommand(e, id, 'underline')} title="Underline"><u>U</u></button>
                        <select 
                            onChange={(e) => applyCommand(id, 'fontSize', e.target.value)} 
                            onMouseDown={() => saveSelection(id)}
                            title="Font Size" 
                            defaultValue="3"
                        >
                            <option value="1">Smallest</option>
                            <option value="2">Small</option>
                            <option value="3">Normal</option>
                            <option value="4">Medium</option>
                            <option value="5">Large</option>
                            <option value="6">Largest</option>
                        </select>
                        <label className="color-picker-label" title="Text Color">
                            <input 
                                type="color" 
                                onChange={(e) => applyCommand(id, 'foreColor', e.target.value)} 
                                onFocus={() => saveSelection(id)}
                                onBlur={() => restoreSelection(id)}
                            />
                        </label>
                    </div>
                    <div
                        ref={el => { editorRefs.current.set(id, el); }}
                        className="rich-text-editor"
                        contentEditable={true}
                        suppressContentEditableWarning={true}
                        dir="ltr"
                        onBlur={() => saveSelection(id)}
                        onMouseUp={() => saveSelection(id)}
                        onKeyUp={() => saveSelection(id)}
                    />
                    <div className="form-actions" style={{ paddingTop: '12px', marginTop: '0', borderTop: 'none' }}>
                         <button
                            onClick={() => handleSave(id)}
                            className="form-btn save-btn"
                            disabled={savingTab === id}
                        >
                            {savingTab === id ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
};

export const AdminView: FC<{
    statusOptions: DropdownOption[];
    contactViaOptions: DropdownOption[];
    documentTypes: DropdownOption[];
    sourceOptions: DropdownOption[];
    driverSourceOptions: any[];
    driverStatusOptions: any[];
    recruiterOptions: any[];
    reasonTerminatedOptions: DropdownOption[];
    reasonRejectedOptions: DropdownOption[];
    vehicleTypeOptions: DropdownOption[];
    routeEmailRecipients: DropdownOption[];
    onAddOption: OptionManagerProps['onAddOption'];
    onUpdateOption: OptionManagerProps['onUpdateOption'];
    onDeleteOption: OptionManagerProps['onDeleteOption'];
    onReorderOption: OptionManagerProps['onReorderOption'];
    isDocumentsFeatureEnabled: boolean;
    isSourceFeatureEnabled: boolean;
    isRoutesFeatureEnabled: boolean;
    isHelpFeatureEnabled: boolean;
    helpContent: Map<Tab, string>;
    onUpdateHelpContent: (tab: Tab, content: string) => Promise<boolean>;
}> = ({ 
    statusOptions, contactViaOptions, documentTypes, sourceOptions, driverSourceOptions, driverStatusOptions, recruiterOptions, 
    reasonTerminatedOptions, reasonRejectedOptions, vehicleTypeOptions, routeEmailRecipients,
    onAddOption, onUpdateOption, onDeleteOption, onReorderOption, 
    isDocumentsFeatureEnabled, isSourceFeatureEnabled, isRoutesFeatureEnabled, isHelpFeatureEnabled, helpContent, onUpdateHelpContent 
}) => {
    return (
        <div className="admin-view">
            <UserRoleManager />
            <OptionManager 
                title="Status Options" 
                tableName="status_options" 
                options={statusOptions} 
                onAddOption={onAddOption} 
                onUpdateOption={onUpdateOption}
                onDeleteOption={onDeleteOption} 
                onReorderOption={onReorderOption} 
            />
            <OptionManager 
                title="Contact Via Options" 
                tableName="contact_via_options" 
                options={contactViaOptions} 
                onAddOption={onAddOption}
                onUpdateOption={onUpdateOption} 
                onDeleteOption={onDeleteOption} 
                onReorderOption={onReorderOption} 
            />
            {isDocumentsFeatureEnabled && (
                <OptionManager 
                    title="Document Types" 
                    tableName="document_types" 
                    options={documentTypes} 
                    onAddOption={onAddOption}
                    onUpdateOption={onUpdateOption} 
                    onDeleteOption={onDeleteOption} 
                    onReorderOption={onReorderOption} 
                />
            )}
            {isSourceFeatureEnabled && (
                <OptionManager 
                    title="Source Options" 
                    tableName="source_options" 
                    options={sourceOptions} 
                    onAddOption={onAddOption}
                    onUpdateOption={onUpdateOption} 
                    onDeleteOption={onDeleteOption} 
                    onReorderOption={onReorderOption} 
                />
            )}
            {isRoutesFeatureEnabled && (
                <>
                    <OptionManager 
                        title="Driver Source Options" 
                        tableName="driver_source_options" 
                        options={driverSourceOptions} 
                        onAddOption={onAddOption}
                        onUpdateOption={onUpdateOption} 
                        onDeleteOption={onDeleteOption} 
                        onReorderOption={onReorderOption} 
                    />
                    <OptionManager 
                        title="Driver Status Options" 
                        tableName="driver_status_options" 
                        options={driverStatusOptions} 
                        onAddOption={onAddOption}
                        onUpdateOption={onUpdateOption} 
                        onDeleteOption={onDeleteOption} 
                        onReorderOption={onReorderOption} 
                    />
                    <OptionManager 
                        title="Recruiter Options" 
                        tableName="recruiter_options" 
                        options={recruiterOptions} 
                        onAddOption={onAddOption}
                        onUpdateOption={onUpdateOption} 
                        onDeleteOption={onDeleteOption} 
                        onReorderOption={onReorderOption} 
                    />
                    <OptionManager 
                        title="Reason Terminated Options" 
                        tableName="reason_terminated_options" 
                        options={reasonTerminatedOptions} 
                        onAddOption={onAddOption}
                        onUpdateOption={onUpdateOption} 
                        onDeleteOption={onDeleteOption} 
                        onReorderOption={onReorderOption} 
                    />
                    <OptionManager 
                        title="Reason Rejected Options" 
                        tableName="reason_rejected_options" 
                        options={reasonRejectedOptions} 
                        onAddOption={onAddOption}
                        onUpdateOption={onUpdateOption} 
                        onDeleteOption={onDeleteOption} 
                        onReorderOption={onReorderOption} 
                    />
                     <OptionManager 
                        title="Vehicle Type Options" 
                        tableName="vehicle_type_options" 
                        options={vehicleTypeOptions} 
                        onAddOption={onAddOption}
                        onUpdateOption={onUpdateOption} 
                        onDeleteOption={onDeleteOption} 
                        onReorderOption={onReorderOption} 
                    />
                     <OptionManager 
                        title="Route Email Recipients" 
                        tableName="route_email_recipients" 
                        options={routeEmailRecipients} 
                        onAddOption={onAddOption}
                        onUpdateOption={onUpdateOption} 
                        onDeleteOption={onDeleteOption} 
                        onReorderOption={onReorderOption} 
                    />
                </>
            )}
            {isHelpFeatureEnabled && (
                <HelpContentManager helpContent={helpContent} onUpdate={onUpdateHelpContent} />
            )}
        </div>
    );
};
