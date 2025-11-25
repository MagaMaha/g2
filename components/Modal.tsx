import React, { FC } from 'react';

export const Modal: FC<{ children: React.ReactNode; onClose: () => void; title: string; size?: 'xlarge' | 'fullscreen' }> = ({ children, onClose, title, size }) => {
    const sizeClass = size ? `modal-size-${size}` : '';
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className={`modal-content ${sizeClass}`} onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{title}</h2>
                    <button className="modal-close-btn" onClick={onClose}>&times;</button>
                </div>
                <div className="modal-body">
                    {children}
                </div>
            </div>
        </div>
    );
};
