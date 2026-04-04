import React from 'react';
import { AlertCircle, HelpCircle, Info, Trash2, X } from 'lucide-react';
import { useProtocol } from '../../context/ProtocolContext';

const GlobalModal = () => {
  const { modalConfig, closeModal, setModalInputValue, setModalPosition } = useProtocol();

  if (!modalConfig.isOpen) return null;

  const getIcon = () => {
    switch (modalConfig.icon) {
      case 'trash': return <Trash2 className="text-rose-500" size={28} />;
      case 'help': return <HelpCircle className="text-blue-500" size={28} />;
      case 'info': return <Info className="text-emerald-600" size={28} />;
      default: return <AlertCircle className="text-emerald-600" size={28} />;
    }
  };

  return (
    <div 
      className="global-modal-overlay" 
      onClick={closeModal}
      style={{ 
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
        zIndex: 99999, background: 'rgba(4, 47, 46, 0.45)', 
        backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px'
      }}
    >
      <div 
        className="global-modal-container" 
        onClick={e => e.stopPropagation()}
        style={{ 
          background: 'white', padding: '32px', borderRadius: '24px', 
          maxWidth: '460px', width: '100%', borderTop: '5px solid #10B981',
          boxShadow: '0 25px 60px -15px rgba(0,0,0,0.3)',
          animation: 'modalFadeIn 0.3s ease-out'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {getIcon()}
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>
              {modalConfig.title}
            </h3>
          </div>
          <button onClick={closeModal} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}>
            <X size={20} />
          </button>
        </div>

        <p style={{ color: '#4B5563', lineHeight: 1.6, fontSize: '1.05rem', marginBottom: '28px' }}>
          {modalConfig.message}
        </p>

        {modalConfig.type === 'input' && (
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em' }}>
              Subsection Title
            </label>
            <input 
              autoFocus
              className="soa-modal-input"
              value={modalConfig.inputValue}
              onChange={e => setModalInputValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && modalConfig.inputValue.trim()) {
                  modalConfig.onConfirm(modalConfig.inputValue, modalConfig.position);
                  closeModal();
                }
              }}
              placeholder="e.g. Exclusion Criteria"
              style={{ 
                width: '100%', padding: '14px 18px', borderRadius: '12px', 
                border: '2px solid #E2E8F0', background: '#F9FAFB', 
                fontWeight: 700, marginBottom: modalConfig.showPositionToggle ? '20px' : '0', 
                outline: 'none', fontSize: '1rem',
                transition: 'border-color 0.2s',
                fontFamily: 'Inter, sans-serif'
              }}
            />

            {modalConfig.showPositionToggle && (
              <div style={{ marginTop: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.05em' }}>
                  Position relative to "{modalConfig.relativeTo}"
                </label>
                <div style={{ display: 'flex', background: '#F1F5F9', padding: '4px', borderRadius: '12px', gap: '4px' }}>
                  <button 
                    onClick={() => setModalPosition('above')}
                    style={{ 
                      flex: 1, padding: '10px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                      fontSize: '0.85rem', fontWeight: 700, transition: 'all 0.2s',
                      background: modalConfig.position === 'above' ? 'white' : 'transparent',
                      color: modalConfig.position === 'above' ? '#064E3B' : '#64748B',
                      boxShadow: modalConfig.position === 'above' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none'
                    }}
                  >
                    Above
                  </button>
                  <button 
                    onClick={() => setModalPosition('below')}
                    style={{ 
                      flex: 1, padding: '10px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                      fontSize: '0.85rem', fontWeight: 700, transition: 'all 0.2s',
                      background: modalConfig.position === 'below' ? 'white' : 'transparent',
                      color: modalConfig.position === 'below' ? '#064E3B' : '#64748B',
                      boxShadow: modalConfig.position === 'below' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none'
                    }}
                  >
                    Below
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button 
            onClick={() => {
              modalConfig.onCancel();
              closeModal();
            }}
            style={{ padding: '12px 28px', borderRadius: '12px', background: '#F3F4F6', color: '#4B5563', fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: '0.95rem' }}
          >
            Cancel
          </button>
          <button 
            onClick={() => {
              modalConfig.onConfirm(modalConfig.inputValue, modalConfig.position);
              closeModal();
            }}
            style={{ 
              padding: '12px 28px', borderRadius: '12px', 
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', 
              color: 'white', fontWeight: 700, border: 'none', cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)', fontSize: '0.95rem'
            }}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default GlobalModal;
