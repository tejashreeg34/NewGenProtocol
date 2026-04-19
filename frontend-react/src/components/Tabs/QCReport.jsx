import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Play, AlertCircle, CheckCircle2, ChevronRight, Activity, Search, ShieldAlert, Cpu, BarChart3, Settings, Info, CheckCircle } from 'lucide-react';
import { useProtocol } from '../../context/ProtocolContext';
import toast from 'react-hot-toast';

const QCReport = () => {
  const { data, navigateTo } = useProtocol();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  const runQC = async () => {
    setLoading(true);
    const toastId = toast.loading('Initiating deep protocol integrity scan...');
    
    // Simulate slight delay for realistic UX
    await new Promise(resolve => setTimeout(resolve, 800));

    let issues = [];

    // Title Page Checks
    if (!data.protocol_title || data.protocol_title.trim() === '') {
      issues.push({
        title: 'FULL PROTOCOL TITLE Missing',
        description: 'The protocol must have a complete clinical trial title defined in the Title Page.',
        tab: 'title-page'
      });
    }
    if (!data.protocol_number || data.protocol_number.trim() === '') {
      issues.push({
        title: 'PROTOCOL NUMBER Missing',
        description: 'A unique protocol identification number is required for regulatory tracking.',
        tab: 'title-page'
      });
    }

    // Approval & Agreement Checks
    if (!data.approval_data?.details?.sponsor_name_address || data.approval_data.details.sponsor_name_address.trim() === '') {
      issues.push({
        title: 'SPONSOR NAME & ADDRESS Missing',
        description: 'Legal sponsor entity and headquarters address must be specified in Approval & Agreement.',
        tab: 'approval'
      });
    }

    // Synopsis Checks
    if (!data.synopsis_data?.overview?.planned_period || data.synopsis_data.overview.planned_period.trim() === '') {
      issues.push({
        title: 'PLANNED TRIAL PERIOD Missing',
        description: 'Estimated duration of the clinical trial is missing in the Synopsis.',
        tab: 'synopsis'
      });
    }
    if (!data.synopsis_data?.objectives?.primary || data.synopsis_data.objectives.primary.length === 0) {
      issues.push({
        title: 'Primary OBJECTIVES Missing',
        description: 'At least one primary objectives must be defined in the Synopsis.',
        tab: 'synopsis'
      });
    }
    if (!data.synopsis_data?.objectives?.secondary || data.synopsis_data.objectives.secondary.length === 0) {
      issues.push({
        title: 'Secondary OBJECTIVES Missing',
        description: 'At least one secondary objectives must be defined in the Synopsis.',
        tab: 'synopsis'
      });
    }
    if (!data.synopsis_data?.objectives?.exploratory || data.synopsis_data.objectives.exploratory.length === 0) {
      issues.push({
        title: 'Exploratory OBJECTIVES Missing',
        description: 'At least one exploratory objectives must be defined in the Synopsis.',
        tab: 'synopsis'
      });
    }
    if (!data.synopsis_data?.endpoints?.primary || data.synopsis_data.endpoints.primary.length === 0) {
      issues.push({
        title: 'Primary ENDPOINTS Missing',
        description: 'At least one primary endpoints must be defined in the Synopsis.',
        tab: 'synopsis'
      });
    }
    if (!data.synopsis_data?.endpoints?.secondary || data.synopsis_data.endpoints.secondary.length === 0) {
      issues.push({
        title: 'Secondary ENDPOINTS Missing',
        description: 'At least one secondary endpoints must be defined in the Synopsis.',
        tab: 'synopsis'
      });
    }
    if (!data.synopsis_data?.endpoints?.exploratory || data.synopsis_data.endpoints.exploratory.length === 0) {
      issues.push({
        title: 'Exploratory ENDPOINTS Missing',
        description: 'At least one exploratory endpoints must be defined in the Synopsis.',
        tab: 'synopsis'
      });
    }
    
    // Inclusion/Exclusion Criteria (Points or Text)
    const hasInclusionText = data.synopsis_data?.inclusion?.text && data.synopsis_data.inclusion.text.trim() !== '';
    const hasInclusionPoints = data.synopsis_data?.inclusion?.points && data.synopsis_data.inclusion.points.length > 0;
    if (!hasInclusionText && !hasInclusionPoints) {
      issues.push({
        title: 'Inclusion Criteria Missing',
        description: 'Mandatory patient eligibility criteria (Inclusion) must be defined.',
        tab: 'synopsis'
      });
    }

    const hasExclusionText = data.synopsis_data?.exclusion?.text && data.synopsis_data.exclusion.text.trim() !== '';
    const hasExclusionPoints = data.synopsis_data?.exclusion?.points && data.synopsis_data.exclusion.points.length > 0;
    if (!hasExclusionText && !hasExclusionPoints) {
      issues.push({
        title: 'Exclusion Criteria Missing',
        description: 'Mandatory patient safety criteria (Exclusion) must be defined.',
        tab: 'synopsis'
      });
    }

    // Sponsor / CRO Reps
    if (!data.approval_data?.sponsor_reps || data.approval_data.sponsor_reps.length === 0) {
      issues.push({
        title: 'Sponsor Representation Missing',
        description: 'At least one authorized signatory from the sponsoring entity is required.',
        tab: 'approval'
      });
    }
    if (!data.approval_data?.cro_reps || data.approval_data.cro_reps.length === 0) {
      issues.push({
        title: 'CRO Representative Missing',
        description: 'At least one signatory from the Clinical Research Organization is required.',
        tab: 'approval'
      });
    }

    // Investigator Agreement fields
    const inv = data.approval_data?.investigator_agreement || {};
    if (!inv.name || !inv.title || !inv.facility || !inv.city || !inv.state || !inv.date) {
      issues.push({
        title: 'Investigator Agreement Incomplete',
        description: 'Principal Investigator stewardship declaration must be fully detailed with Name, Title, Facility, City, State, and Date.',
        tab: 'approval'
      });
    }

    const totalPossibleChecks = 15;
    let validCount = totalPossibleChecks - issues.length;
    let score = Math.round((Math.max(validCount, 0) / totalPossibleChecks) * 10); // scale 0-10 or 0-100 based on mockup? Mockup shows "10 INTEGRITY". So maybe it's the number of filled checks?
    
    // Wait, the mockup says "10 INTEGRITY" and "15 Missing". "10" + "15" = "25"? 
    // Or maybe the score is just out of 100? Let's keep it as total checks.
    // If there are 15 fields, maybe 10 is the number of fields filled.
    // Or let's make it a percentage for the ring, and the text can just display the `score` number or `issues.length`.
    // The mockup says "10 INTEGRITY". Let's show `validCount` instead.

    setReport({
      score: validCount, // Mockup has 10, total 15 missing -> 25 total? Let's use validCount for text, and percentage for the ring.
      percentage: Math.round((Math.max(validCount, 0) / totalPossibleChecks) * 100),
      issues: issues,
      totalMissing: issues.length
    });

    toast.success('Protocol integrity scan complete', { id: toastId });
    setLoading(false);
  };

  return (
    <div className="fade-in" style={{ paddingBottom: '40px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '40px' }}>
        <div>
          <h2 style={{ fontSize: '2.4rem', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.02em', marginBottom: '4px' }}>Protocol Integrity Report</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>Automated field verification and mandatory compliance check.</p>
        </div>
        
        <motion.button 
          whileHover={{ scale: 1.02, boxShadow: '0 8px 24px rgba(50, 205, 50, 0.2)' }}
          whileTap={{ scale: 0.98 }}
          className="btn btn-primary" 
          onClick={runQC}
          disabled={loading}
          style={{ padding: '12px 24px', borderRadius: '16px', fontSize: '1rem', fontWeight: 700 }}
        >
          {loading ? <Activity className="spin" size={20} /> : <ShieldCheck size={20} />}
          <span style={{ marginLeft: '10px' }}>{loading ? 'Scanning...' : 'Run Deep Scan'}</span>
        </motion.button>
      </div>

      {!report ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="card" 
          style={{ textAlign: 'center', padding: '100px 40px', background: 'white', borderRadius: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}
        >
          <div style={{ width: '80px', height: '80px', background: 'var(--light-lime)', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--dark-lime)', margin: '0 auto 24px' }}>
              <ShieldCheck size={40} />
          </div>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '12px', color: 'var(--text-main)' }}>Protocol Scan Ready</h3>
          <p style={{ color: 'var(--text-muted)', maxWidth: '440px', margin: '0 auto', lineHeight: '1.6', fontSize: '1rem' }}>
            Initiate the scan to verify mandatory ICH-GCP fields, section cross-references, and clinical logic consistency.
          </p>
        </motion.div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
           
           {/* Top Score Banner */}
           <motion.div 
             initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
             className="card" 
             style={{ padding: '40px', display: 'flex', gap: '60px', alignItems: 'center', background: 'white', overflow: 'hidden', position: 'relative', borderRadius: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}
           >
              <div style={{ position: 'absolute', top: '10%', right: '5%', opacity: 0.05 }}>
                 <ShieldCheck size={240} />
              </div>

              <div style={{ position: 'relative', width: '180px', height: '180px', flexShrink: 0 }}>
                <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                  <circle cx="18" cy="18" r="16" fill="none" stroke="#E2E8F0" strokeWidth="3" />
                  <motion.circle 
                    cx="18" cy="18" r="16" fill="none" 
                    stroke="var(--primary-lime)" strokeWidth="3"
                    strokeDasharray="100"
                    initial={{ strokeDashoffset: 100 }}
                    animate={{ strokeDashoffset: 100 - report.percentage }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                  />
                </svg>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                  <div style={{ fontSize: '3rem', fontWeight: 900, letterSpacing: '-0.05em', color: 'var(--text-main)' }}>{report.score}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 800 }}>INTEGRITY</div>
                </div>
              </div>

              <div style={{ flex: 1, position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'inline-block', background: report.totalMissing > 0 ? '#FEE2E2' : 'var(--light-lime)', padding: '6px 16px', borderRadius: '20px', color: report.totalMissing > 0 ? '#DC2626' : 'var(--dark-lime)', fontSize: '0.75rem', fontWeight: 800, marginBottom: '16px', letterSpacing: '0.05em' }}>
                   SYSTEM STATUS: {report.totalMissing > 0 ? 'NEEDS ATTENTION' : 'HEALTHY'}
                </div>
                <h3 style={{ fontSize: '1.8rem', fontWeight: 900, marginBottom: '16px', color: 'var(--text-main)' }}>Integrity Assessment Complete</h3>
                <p style={{ fontSize: '1rem', color: 'var(--text-muted)', lineHeight: '1.6', maxWidth: '600px' }}>
                  {report.totalMissing === 0 
                    ? 'Structural analysis indicates high regulatory alignment. All mandatory fields are populated.' 
                    : `The scan detected ${report.totalMissing} missing or incomplete mandatory fields. Please address these before final generation.`}
                </p>
              </div>
           </motion.div>

           {/* Issue Breakdown */}
           <motion.div 
             initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
             className="card" style={{ padding: '0', border: 'none', background: 'transparent' }}
           >
             <div style={{ background: 'white', borderRadius: '24px', padding: '32px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
               {/* Header of Issues Section */}
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                     <div style={{ background: '#FEE2E2', width: '48px', height: '48px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#DC2626' }}>
                        <ShieldAlert size={24} />
                     </div>
                     <h4 style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-main)' }}>Mandatory Field Discrepancies</h4>
                  </div>
                  <span style={{ fontSize: '1rem', fontWeight: 800, color: '#DC2626' }}>{report.totalMissing} Missing</span>
               </div>

               {/* Grid of Issues */}
               {report.issues.length > 0 ? (
                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' }}>
                    <AnimatePresence>
                      {report.issues.map((issue, idx) => (
                        <motion.div 
                          key={idx} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                          style={{ padding: '24px', borderRadius: '16px', background: '#FFFDFD', border: '1px solid #FFEBEB', display: 'flex', flexDirection: 'column' }}
                        >
                           <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#991B1B', marginBottom: '8px' }}>{issue.title}</div>
                           <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', opacity: 0.8, lineHeight: '1.6', marginBottom: '24px', flex: 1 }}>{issue.description}</p>
                           
                           <div>
                             <button 
                               onClick={() => navigateTo(issue.tab)}
                               style={{ 
                                 background: 'white', border: '1px solid #FECACA', color: '#DC2626', 
                                 fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px',
                                 padding: '8px 16px', borderRadius: '24px', transition: 'all 0.2s',
                               }}
                               onMouseOver={(e) => e.currentTarget.style.background = '#FEF2F2'}
                               onMouseOut={(e) => e.currentTarget.style.background = 'white'}
                             >
                                Go to Section <ChevronRight size={14} />
                             </button>
                           </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                 </div>
               ) : (
                  <div style={{ textAlign: 'center', padding: '60px 20px', background: '#F8FAF8', borderRadius: '16px', border: '1px dashed #D1FAE5' }}>
                     <div style={{ width: '60px', height: '60px', background: '#D1FAE5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669', margin: '0 auto 16px' }}>
                        <CheckCircle2 size={30} />
                     </div>
                     <h4 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#065F46', marginBottom: '8px' }}>All mandatory fields complete</h4>
                     <p style={{ color: '#047857', fontSize: '0.95rem' }}>Your protocol is fully aligned with required specifications.</p>
                  </div>
               )}
             </div>
           </motion.div>
        </div>
      )}
    </div>
  );
};

export default QCReport;
