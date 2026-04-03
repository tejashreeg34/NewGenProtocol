import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Play, AlertCircle, CheckCircle2, ChevronRight, Activity, Search, ShieldAlert, Cpu, BarChart3, Settings, Info, CheckCircle } from 'lucide-react';
import { useProtocol } from '../../context/ProtocolContext';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE_URL = 'http://localhost:8000';

const QCReport = () => {
  const { data } = useProtocol();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  const runQC = async () => {
    setLoading(true);
    const toastId = toast.loading('Initiating deep protocol integrity scan...');
    try {
      const response = await axios.post(`${API_BASE_URL}/api/run-qc`, data);
      setReport(response.data);
      toast.success('Protocol integrity scan complete', { id: toastId });
    } catch (error) {
      console.error('QC error:', error);
      toast.error('Scan Engine Offline', { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fade-in" style={{ paddingBottom: '40px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '40px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ color: 'var(--primary-lime)', fontWeight: 800, fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase' }}>QUALITY ASSURANCE ECOSYSTEM</span>
            <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--border-color)' }}></div>
            <span style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.7rem' }}>HEURISTIC ENGINE v3.2</span>
          </div>
          <h2 style={{ fontSize: '2.4rem', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>Protocol Integrity Report</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem', marginTop: '4px' }}>Automated compliance verification against ICH-GCP and global regulatory standards.</p>
        </div>
        
        <motion.button 
          whileHover={{ scale: 1.02, boxShadow: '0 8px 24px rgba(50, 205, 50, 0.2)' }}
          whileTap={{ scale: 0.98 }}
          className="btn btn-primary" 
          onClick={runQC}
          disabled={loading}
          style={{ padding: '14px 28px', borderRadius: '16px', fontSize: '1rem' }}
        >
          {loading ? <Activity className="spin" size={20} /> : <Cpu size={20} />}
          <span style={{ marginLeft: '12px' }}>{loading ? 'Analyzing Architecture...' : 'Run Deep Scan'}</span>
        </motion.button>
      </div>

      {!report ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px' }}>
           <motion.div 
             initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
             className="card" 
             style={{ textAlign: 'center', padding: '80px', background: 'white', border: '1px dashed var(--border-color)', borderRadius: '32px' }}
           >
              <div style={{ width: '80px', height: '80px', background: 'var(--light-lime)', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--dark-lime)', margin: '0 auto 24px' }}>
                 <ShieldCheck size={40} />
              </div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '12px' }}>Protocol Scan Ready</h3>
              <p style={{ color: 'var(--text-muted)', maxWidth: '440px', margin: '0 auto', lineHeight: '1.6' }}>
                Initiate the scan to verify mandatory ICH-GCP fields, section cross-references, and clinical logic consistency across all 11 protocol tiers.
              </p>
           </motion.div>

           <div className="card" style={{ padding: '40px', background: 'var(--bg-gray)', border: 'none' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '24px' }}>Scanned Standards</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                 {[
                   { name: 'ICH E6 (R2) GCP', desc: 'Core clinical investigator standards' },
                   { name: 'FDA 21 CFR Part 11', desc: 'Electronic records & signatures' },
                   { name: 'ISO 14155:2020', desc: 'Medical device clinical investigations' },
                   { name: 'GDPR / HIPAA', desc: 'Data privacy & patient protection' }
                 ].map((std, i) => (
                   <div key={i} style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary-lime)' }}></div>
                      <div>
                         <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{std.name}</div>
                         <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{std.desc}</div>
                      </div>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
           
           {/* Top Score Banner */}
           <motion.div 
             initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
             className="card" 
             style={{ padding: '40px', display: 'flex', gap: '60px', alignItems: 'center', background: 'linear-gradient(135deg, white 0%, #f9fdf9 100%)', overflow: 'hidden', position: 'relative' }}
           >
              <div style={{ position: 'absolute', top: '-10%', right: '-5%', opacity: 0.05 }}>
                 <ShieldCheck size={200} />
              </div>

              <div style={{ position: 'relative', width: '160px', height: '160px', flexShrink: 0 }}>
                <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                  <circle cx="18" cy="18" r="16" fill="none" stroke="#E2E8F0" strokeWidth="2.5" />
                  <motion.circle 
                    cx="18" cy="18" r="16" fill="none" 
                    stroke="var(--primary-lime)" strokeWidth="2.5"
                    strokeDasharray="100"
                    initial={{ strokeDashoffset: 100 }}
                    animate={{ strokeDashoffset: 100 - report.score }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                  />
                </svg>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                  <div style={{ fontSize: '2.8rem', fontWeight: 900, letterSpacing: '-0.05em' }}>{report.score}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 800 }}>COMPLIANCE</div>
                </div>
              </div>

              <div style={{ flex: 1, position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                   <div style={{ background: report.score > 80 ? 'var(--light-lime)' : '#FEF2F2', padding: '6px 14px', borderRadius: '20px', color: report.score > 80 ? 'var(--dark-lime)' : '#DC2626', fontSize: '0.75rem', fontWeight: 800 }}>
                      SYSTEM STATUS: {report.score > 80 ? 'HEALTHY' : 'NEEDS ATTENTION'}
                   </div>
                </div>
                <h3 style={{ fontSize: '1.6rem', fontWeight: 900, marginBottom: '12px' }}>Integrity Assessment Complete</h3>
                <p style={{ fontSize: '1rem', color: 'var(--text-muted)', lineHeight: '1.6', maxWidth: '600px' }}>
                  {report.score > 80 
                    ? 'Structural analysis indicates high regulatory alignment. Automated cross-references match established templates.' 
                    : 'The extraction engine detected fundamental inconsistencies in trial parameters. Immediate remediation required before submission.'}
                </p>
              </div>
           </motion.div>

           {/* Issue Breakdown */}
           <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
              
              {/* Critical Issues */}
              <div className="card" style={{ padding: '32px', borderColor: '#FEE2E2' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                       <div style={{ background: '#FEE2E2', width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#DC2626' }}>
                          <ShieldAlert size={20} />
                       </div>
                       <h4 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Critical Discrepancies</h4>
                    </div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#DC2626' }}>{report.issues?.filter(i => i.type === 'critical').length || 0} Open</span>
                 </div>

                 <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <AnimatePresence>
                      {report.issues?.filter(i => i.type === 'critical').map((issue, idx) => (
                        <motion.div 
                          key={idx} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                          style={{ padding: '20px', borderRadius: '16px', background: '#FFF7F7', border: '1px solid #FEE2E2' }}
                        >
                           <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#991B1B', marginBottom: '4px' }}>{issue.title}</div>
                           <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', opacity: 0.8, lineHeight: '1.5' }}>{issue.description}</p>
                           <button style={{ marginTop: '14px', background: 'transparent', border: 'none', color: '#DC2626', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              Fix in Editor <ChevronRight size={14} />
                           </button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    {!report.issues?.some(i => i.type === 'critical') && (
                      <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                         No critical issues detected.
                      </div>
                    )}
                 </div>
              </div>

              {/* Suggestions */}
              <div className="card" style={{ padding: '32px', borderColor: 'var(--border-color)' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                       <div style={{ background: 'var(--bg-gray)', width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                          <BarChart3 size={20} />
                       </div>
                       <h4 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Optimization Insights</h4>
                    </div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)' }}>{report.issues?.filter(i => i.type !== 'critical').length || 0} Suggestions</span>
                 </div>

                 <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <AnimatePresence>
                      {report.issues?.filter(i => i.type !== 'critical').map((issue, idx) => (
                        <motion.div 
                          key={idx} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
                          style={{ padding: '20px', borderRadius: '16px', background: 'white', border: '1px solid var(--border-color)' }}
                        >
                           <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-main)', marginBottom: '4px' }}>{issue.title}</div>
                           <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>{issue.description}</p>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default QCReport;
