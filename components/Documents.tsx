
import React, { FC, useState, useMemo, useEffect } from 'react';
import { Document, Prospect, DropdownOption, DocumentFormData, UserRole } from '../types';
import { TrashIcon, EditIcon, DocumentIcon } from '../lib';
import { supabase } from '../lib';

export const DocumentsView: FC<{
    documents: Document[];
    prospects: Prospect[];
    documentTypes: DropdownOption[];
    searchTerm: string;
    onSearchChange: (value: string) => void;
    onClearSearch: () => void;
    showBackButton: boolean;
    onReturnToProspects: () => void;
    onDeleteDocument: (doc: Document) => void;
    onEditDocument: (doc: Document) => void;
    onUploadDocument: () => void;
    userRole: UserRole | null;
}> = ({ documents, prospects, documentTypes, searchTerm, onSearchChange, onClearSearch, showBackButton, onReturnToProspects, onDeleteDocument, onEditDocument, onUploadDocument, userRole }) => {
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' } | null>({ key: 'created_at', direction: 'descending' });

    const prospectMap = useMemo(() => new Map(prospects.map(p => [p.id, p.name])), [prospects]);
    const docTypeMap = useMemo(() => new Map(documentTypes.map(d => [d.id, d.name])), [documentTypes]);

    const documentsWithDetails = useMemo(() => {
        return documents.map(doc => ({
            ...doc,
            prospectName: prospectMap.get(doc.prospect_id) || 'Unknown Opportunity',
            documentTypeName: docTypeMap.get(doc.document_type_id) || 'Unknown Type',
        }));
    }, [documents, prospectMap, docTypeMap]);
    
    const filteredAndSortedDocuments = useMemo(() => {
        let filtered = documentsWithDetails.filter(doc =>
            doc.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            doc.prospectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            doc.file_name.toLowerCase().includes(searchTerm.toLowerCase())
        );

        if (sortConfig !== null) {
            filtered.sort((a, b) => {
                const aVal = a[sortConfig.key as keyof typeof a];
                const bVal = b[sortConfig.key as keyof typeof b];

                if (aVal < bVal) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return filtered;
    }, [documentsWithDetails, searchTerm, sortConfig]);

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
    
     const getFileUrl = (storagePath: string) => {
        if (!supabase) return '#';
        const { data } = supabase.storage.from('documents').getPublicUrl(storagePath);
        return data.publicUrl;
    };

    const isAdmin = userRole === 'admin';
    const isViewer = userRole === 'viewer';

    return (
         <div>
            <div className="controls-container">
                <div className="filters">
                    {showBackButton && (
                        <button className="back-to-prospects-btn" onClick={onReturnToProspects}>
                            ← Back to Opportunities
                        </button>
                    )}
                    <input
                        type="text"
                        placeholder="Search documents..."
                        className="search-input"
                        value={searchTerm}
                        onChange={e => onSearchChange(e.target.value)}
                    />
                    <button className="clear-filters-btn" onClick={onClearSearch}>Clear Search</button>
                </div>
                 {!isViewer && <button className="add-prospect-btn" onClick={onUploadDocument}>Upload Document</button>}
            </div>
             <div className="table-container">
                 <table className="documents-table">
                     <thead>
                         <tr>
                             <th onClick={() => requestSort('prospectName')}>Opportunity{getSortIndicator('prospectName')}</th>
                             <th onClick={() => requestSort('documentTypeName')}>Type{getSortIndicator('documentTypeName')}</th>
                             <th style={{ width: '30%', minWidth: '250px' }} onClick={() => requestSort('description')}>Description{getSortIndicator('description')}</th>
                             <th style={{ width: '25%', minWidth: '200px' }} onClick={() => requestSort('notes')}>Notes{getSortIndicator('notes')}</th>
                             <th onClick={() => requestSort('created_at')}>Upload Date{getSortIndicator('created_at')}</th>
                             <th style={{ width: '60px', textAlign: 'center' }} onClick={() => requestSort('file_name')}>File{getSortIndicator('file_name')}</th>
                             <th>Actions</th>
                         </tr>
                     </thead>
                     <tbody>
                         {filteredAndSortedDocuments.length > 0 ? (
                            filteredAndSortedDocuments.map(doc => (
                                <tr key={doc.id}>
                                    <td>{doc.prospectName}</td>
                                    <td>{doc.documentTypeName}</td>
                                    <td><a href={getFileUrl(doc.storage_path)} target="_blank" rel="noopener noreferrer">{doc.description}</a></td>
                                    <td>{doc.notes}</td>
                                    <td>{new Date(doc.created_at).toLocaleDateString()}</td>
                                    <td style={{ textAlign: 'center' }}>
                                        <span 
                                            title={doc.file_name} 
                                            style={{ cursor: 'help', color: 'var(--subtle-text-color)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                                        >
                                            <DocumentIcon />
                                        </span>
                                    </td>
                                    <td>
                                        <div className="table-actions">
                                            <button className="edit-doc-btn" onClick={() => onEditDocument(doc)} title={isViewer ? "View Details" : "Edit Document"}><EditIcon /></button>
                                            {isAdmin && <button className="delete-option-btn" onClick={() => onDeleteDocument(doc)} title="Delete Document"><TrashIcon /></button>}
                                        </div>
                                    </td>
                                </tr>
                            ))
                         ) : (
                            <tr>
                                <td colSpan={7} style={{ textAlign: 'center' }}>No documents found.</td>
                            </tr>
                         )}
                     </tbody>
                 </table>
             </div>
         </div>
    );
};

export const DocumentForm: FC<{
    prospects: Prospect[];
    documentTypes: DropdownOption[];
    documentToEdit?: Document | null;
    onSave: (formData: DocumentFormData, file: File | null) => void;
    onCancel: () => void;
    readOnly?: boolean;
}> = ({ prospects, documentTypes, documentToEdit, onSave, onCancel, readOnly }) => {
    const [formData, setFormData] = useState<DocumentFormData>({
        prospect_id: '',
        document_type_id: '',
        description: '',
        notes: '',
    });
    const [file, setFile] = useState<File | null>(null);

    useEffect(() => {
        if (documentToEdit) {
            setFormData({
                prospect_id: documentToEdit.prospect_id.toString(),
                document_type_id: documentToEdit.document_type_id.toString(),
                description: documentToEdit.description,
                notes: documentToEdit.notes || '',
            });
        }
    }, [documentToEdit]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        if (readOnly) return;
        const { name, value } = e.target;
        setFormData(prev => ({...prev, [name]: value }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (readOnly) return;
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (readOnly) return;
        if (!documentToEdit && !file) {
            alert('Please select a file to upload.');
            return;
        }
        if (!formData.prospect_id || !formData.document_type_id || !formData.description) {
            alert('Please fill out all required fields.');
            return;
        }
        onSave(formData, file);
    };
    
    const isEditMode = !!documentToEdit;

    return (
        <form onSubmit={handleSubmit} className="document-form">
            <div className="form-grid">
                <div className="form-field">
                    <label>Opportunity <span className="required-asterisk">*</span></label>
                    <select name="prospect_id" value={formData.prospect_id} onChange={handleChange} required disabled={readOnly}>
                        <option value="">Select an Opportunity</option>
                        {prospects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>
                <div className="form-field">
                    <label>Document Type <span className="required-asterisk">*</span></label>
                    <select name="document_type_id" value={formData.document_type_id} onChange={handleChange} required disabled={readOnly}>
                        <option value="">Select a Type</option>
                        {documentTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                </div>
                <div className="form-field" style={{ gridColumn: '1 / -1' }}>
                    <label>Brief Description (Link Text) <span className="required-asterisk">*</span></label>
                    <input type="text" name="description" value={formData.description} onChange={handleChange} required disabled={readOnly} />
                </div>
                 <div className="form-field" style={{ gridColumn: '1 / -1' }}>
                    <label>Notes</label>
                    <input type="text" name="notes" value={formData.notes} onChange={handleChange} disabled={readOnly} />
                </div>
                 <div className="form-field" style={{ gridColumn: '1 / -1' }}>
                    <label>{isEditMode ? 'Replace File (Optional)' : <>File <span className="required-asterisk">*</span></>}</label>
                    <input type="file" onChange={handleFileChange} required={!isEditMode} disabled={readOnly} />
                    {isEditMode && <p className="form-help-text">Current file: {documentToEdit.file_name}</p>}
                </div>
            </div>
            <div className="form-actions">
                <button type="button" className="form-btn cancel-btn" onClick={onCancel}>Cancel</button>
                {!readOnly && <button type="submit" className="form-btn save-btn">{isEditMode ? 'Update' : 'Upload'}</button>}
            </div>
        </form>
    );
};
