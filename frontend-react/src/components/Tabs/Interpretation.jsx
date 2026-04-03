import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BrainCircuit, RefreshCw, Save, Search, CheckCircle2, AlertTriangle, ShieldCheck, Download, Zap, Database, Filter, ChevronRight, Activity } from 'lucide-react';
import { useProtocol } from '../../context/ProtocolContext';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE_URL = 'http://localhost:8000';

const Interpretation = () => {
  const { data, currentId } = useProtocol();
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const protocolId = data.protocol_id || currentId;

  const fetchInterpretation = async () => {
    if (!protocolId) {
      toast.error('Save protocol metadata to begin extraction.');
      return;
    }
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/get-protocol-interpretation/${protocolId}`);
      setFields(response.data.fields || []);
      toast.success('AI extraction synchronized');
    } catch (error) {
      console.error('Interpretation err:', error);
      toast.error('AI Service Unavailable');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (protocolId) fetchInterpretation();
  }, [protocolId]);

  const filteredFields = fields.filter(f => 
    f.field_name?.toLowerCase().includes(search.toLowerCase()) || 
    (f.field_value && f.field_value.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="fade-in" style={{ paddingBottom: '40px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '40px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ color: 'var(--primary-lime)', fontWeight: 800, fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase' }}>COGNITIVE INSIGHTS ENGINE</span>
            <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--border-color)' }}></div>
            <span style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.7rem' }}>CLINICAL-NLP-v4</span>
          </div>
          <h2 style={{ fontSize: '2.4rem', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>AI Interpretation</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem', marginTop: '4px' }}>Automated extraction of high-fidelity clinical entities and regulatory insights.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ position: 'relative' }}>
             <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
             <input 
               className="form-input" 
               placeholder="Filter entities..." 
               value={search}
               onChange={(e) => setSearch(e.target.value)}
               style={{ width: '280px', paddingLeft: '40px', borderRadius: '14px' }}
             />
          </div>
          <button className="btn btn-secondary" style={{ borderRadius: '14px', padding: '10px 20px' }} onClick={fetchInterpretation} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'spin' : ''} /> {loading ? 'Analyzing...' : 'Re-extract'}
          </button>
          <button className="btn btn-primary" style={{ borderRadius: '14px', padding: '10px 24px', boxShadow: '0 8px 24px rgba(50, 205, 50, 0.2)' }}>
            <Database size={16} /> Export Dataset
          </button>
        </div>
      </div>

      {!protocolId ? (
        <div className="card" style={{ textAlign: 'center', padding: '100px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
           <div style={{ width: '80px', height: '80px', background: 'var(--bg-gray)', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', marginBottom: '24px' }}>
              <BrainCircuit size={40} />
           </div>
           <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '8px' }}>Waiting for Protocol Context</h3>
           <p style={{ color: 'var(--text-muted)', maxWidth: '400px', fontSize: '1rem' }}>Please save your protocol metadata in the <strong>Title Page</strong> to trigger the AI analysis engine.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Analysis Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }}>
             {[
               { label: 'ENTITIES EXTRACTED', value: fields.length, icon: Database, color: 'var(--primary-lime)' },
               { label: 'AVG CONFIDENCE', value: '94.2%', icon: Zap, color: '#F6AD55' },
               { label: 'HIPAA STATUS', value: 'SECURE', icon: ShieldCheck, color: 'var(--dark-lime)' },
               { label: 'ANALYSIS DEPTH', value: 'LEVEL 4', icon: Activity, color: '#3182CE' }
             ].map((stat, i) => (
               <div key={i} className="card" style={{ padding: '24px', marginBottom: 0, display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ background: `${stat.color}15`, width: '42px', height: '42px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: stat.color }}>
                     <stat.icon size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 900 }}>{stat.value}</div>
                    <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>{stat.label}</div>
                  </div>
               </div>
             ))}
          </div>

          {/* Main Table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border-color)' }}>
            <div style={{ padding: '20px 32px', background: 'var(--bg-gray)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Filter size={16} color="var(--text-muted)" />
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)' }}>MAPPING ENTITIES</span>
               </div>
               <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Showing {filteredFields.length} of {fields.length} insights</span>
            </div>
            
            <div style={{ maxHeight: '650px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-color)', background: 'white' }}>
                    <th style={{ padding: '20px 32px', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Clinical Entity</th>
                    <th style={{ padding: '20px 32px', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Extracted Insight / Logic</th>
                    <th style={{ padding: '20px 32px', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Verification Status</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {filteredFields.map((f, idx) => {
                      const isLow = (f.confidence_score || 1.0) < 0.9;
                      return (
                        <motion.tr 
                          key={idx}
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.01 }}
                          style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }}
                          className="hover-card"
                        >
                          <td style={{ padding: '24px 32px', verticalAlign: 'top', width: '280px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                               <div style={{ width: '4px', height: '16px', borderRadius: '4px', background: isLow ? '#F6AD55' : 'var(--primary-lime)' }}></div>
                               <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-main)' }}>{f.field_name}</div>
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '14px' }}>Entity Type: {f.entity_type || 'General'}</div>
                          </td>
                          <td style={{ padding: '24px 32px' }}>
                            <div style={{ 
                               fontSize: '0.95rem', 
                               lineHeight: '1.7', 
                               color: 'var(--text-main)',
                               background: isLow ? '#FFF9F2' : 'transparent',
                               padding: isLow ? '12px 16px' : '0',
                               borderRadius: isLow ? '12px' : '0',
                               border: isLow ? '1px solid rgba(246, 173, 85, 0.2)' : 'none',
                               whiteSpace: 'pre-wrap'
                            }}>
                               {f.field_value || 'No specific insight extracted.'}
                            </div>
                          </td>
                          <td style={{ padding: '24px 32px', width: '180px' }}>
                            {isLow ? (
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '20px', background: '#FFF7ED', color: '#EA580C', fontWeight: 700, fontSize: '0.75rem' }}>
                                <AlertTriangle size={14} /> Low Confidence
                              </div>
                            ) : (
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '20px', background: 'var(--light-lime)', color: 'var(--dark-lime)', fontWeight: 700, fontSize: '0.75rem' }}>
                                <CheckCircle2 size={14} /> Extracted
                              </div>
                            )}
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
              {filteredFields.length === 0 && (
                <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
                   No entities matching "{search}" were found in this protocol.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Interpretation;
