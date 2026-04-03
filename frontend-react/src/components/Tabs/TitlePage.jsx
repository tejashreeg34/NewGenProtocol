import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Save, List, Info, Calendar, FileType, User, Hash, Globe, Activity, History, CheckCircle2 } from 'lucide-react';
import { useProtocol } from '../../context/ProtocolContext';
import toast from 'react-hot-toast';

const TitlePage = () => {
  const { data, updateField } = useProtocol();

  const handleSave = () => {
    toast.dismiss();
    toast.success('Foundational metadata synchronized.', { icon: '🏛️' });
  };

  const inputFields = [
    { id: 'protocol_title', label: 'FULL PROTOCOL TITLE', icon: FileText, placeholder: 'Enter complete clinical trial title...', full: true },
    { id: 'protocol_number', label: 'PROTOCOL IDENTIFIER', icon: List, placeholder: 'e.g. CLIN-2024-X' },
    { id: 'nct_number', label: 'NCT / CLINICALTRIALS.GOV ID', icon: Info, placeholder: 'NCT00000000' },
    { id: 'principal_investigator', label: 'LEAD MEDICAL OFFICER (PI)', icon: User, placeholder: 'Principal Investigator Name' },
    { id: 'sponsor', label: 'SPONSORING ENTITY', icon: Globe, placeholder: 'Organization Name' },
    { id: 'funded_by', label: 'FUNDING AGENCY / GRANT', icon: Hash, placeholder: 'Government or Private Grant' },
    { id: 'version_number', label: 'DOCUMENT VERSION', icon: Activity, placeholder: 'e.g. v1.0 Final' },
    { id: 'protocol_date', label: 'AUTHORIZATION DATE', icon: Calendar, type: 'date' },
  ];

  return (
    <div className="fade-in" style={{ paddingBottom: '40px' }}>
      {/* Header Area */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px', gap: '32px' }}>
        <div style={{ flex: '0 0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ color: 'var(--primary-lime)', fontWeight: 800, fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase' }}>FOUNDATIONAL METADATA</span>
            <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--border-color)' }}></div>
            <span style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.7rem' }}>CORE IDENTITY</span>
          </div>
          <h2 style={{ fontSize: '2.4rem', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>Title Page Details</h2>
        </div>

        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', marginTop: '12px' }}>
          <div className="hover-trigger" style={{ cursor: 'help', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '12px', background: 'var(--bg-gray)', border: '1px solid var(--border-color)', opacity: 0.8 }}>
             <CheckCircle2 size={16} color="var(--primary-lime)" />
             <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Compliance Ready</span>
             <div className="hover-content" style={{ display: 'none', position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', background: 'var(--text-main)', color: 'white', padding: '12px 18px', borderRadius: '12px', fontSize: '0.8rem', width: '320px', zIndex: 100, marginTop: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.2)', lineHeight: '1.5' }}>
                <div style={{ position: 'absolute', top: '-6px', left: '50%', transform: 'translateX(-50%)', borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderBottom: '6px solid var(--text-main)' }}></div>
                Protocol identifiers are mapped to ICH-E6 (R2) & GCP standards for automated structural verification.
             </div>
          </div>
          <style>{`
            .hover-trigger:hover { opacity: 1 !important; border-color: var(--primary-lime) !important; background: var(--white) !important; }
            .hover-trigger:hover .hover-content { display: block !important; }
          `}</style>
        </div>

        <motion.button 
          whileHover={{ scale: 1.02, boxShadow: '0 8px 24px rgba(50, 205, 50, 0.2)' }}
          whileTap={{ scale: 0.98 }}
          className="btn btn-primary" 
          onClick={handleSave}
          style={{ padding: '14px 28px', borderRadius: '16px', fontSize: '1rem', flexShrink: 0 }}
        >
          <Save size={20} />
          <span style={{ marginLeft: '12px' }}>Save Progress</span>
        </motion.button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        
        {/* Main Form Card (Expanded Horizontally) */}
        <div className="card" style={{ padding: '48px', marginBottom: 0, width: '100%', maxWidth: '100%' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '32px' }}>
            {inputFields.map((field, idx) => (
              <motion.div 
                key={field.id} 
                className="form-group"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                style={{ gridColumn: field.full ? 'span 3' : 'auto' }}
              >
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.65rem', letterSpacing: '0.05em' }}>
                  <field.icon size={13} style={{ color: 'var(--primary-lime)' }} />
                  {field.label}
                </label>
                <input 
                  type={field.type || 'text'}
                  className="form-input" 
                  placeholder={field.placeholder}
                  value={data[field.id] || ''} 
                  onChange={(e) => updateField(field.id, e.target.value)}
                  style={{ 
                    fontSize: field.full ? '1.15rem' : '0.95rem', 
                    fontWeight: field.full ? 800 : 500,
                    background: 'var(--white)',
                    border: '1px solid var(--border-color)',
                    padding: '16px 24px',
                    borderRadius: '16px'
                  }}
                />
              </motion.div>
            ))}
          </div>
        </div>

        {/* Version History (Moved below the main section) */}
        <div className="card" style={{ padding: '32px', background: 'white', border: '1px solid var(--border-color)', marginBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
             <History size={20} style={{ color: 'var(--primary-lime)' }} />
             <h4 style={{ fontSize: '1rem', fontWeight: 800 }}>Document Version History</h4>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 20px', background: 'var(--bg-gray)', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>v1.0 (Current)</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                   <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary-lime)' }}></div>
                   <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Active Draft</span>
                </div>
             </div>
             <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 20px', borderRadius: '16px', border: '1px solid var(--border-color)', opacity: 0.5 }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>v0.9</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Archived (2024-11-20)</span>
             </div>
             <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 20px', borderRadius: '16px', border: '1px solid var(--border-color)', opacity: 0.5 }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>v0.8</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Archived (2024-11-05)</span>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default TitlePage;
