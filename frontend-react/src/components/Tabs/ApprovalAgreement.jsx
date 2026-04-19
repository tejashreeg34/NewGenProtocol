import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckSquare, Plus, Trash2, Save, Building, FileSignature, ShieldCheck } from 'lucide-react';
import { useProtocol } from '../../context/ProtocolContext';
import toast from 'react-hot-toast';
import SignatureInput from '../Common/SignatureInput';

const SectionHeader = ({ icon: Icon, title, subtitle, action }) => (
  <div className="section-header-row">
    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
      <div className="section-icon">
        <Icon size={22} />
      </div>
      <div>
        <h3 className="section-title">{title}</h3>
        {subtitle && <p className="section-subtitle">{subtitle}</p>}
      </div>
    </div>
    {action}
  </div>
);

const RepresentativeCard = ({ rep, idx, type, onRepChange, onRemove }) => (
  <motion.div
    key={idx}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    className="rep-card"
  >
    <button
      onClick={() => onRemove(type, idx)}
      className="rep-remove-btn"
      title="Remove"
    >
      <Trash2 size={16} />
    </button>

    <div className="rep-card-inner">
      {/* Left: Metadata */}
      <div className="rep-meta">
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>DESCRIPTION / ROLE</label>
          <textarea
            className="form-input"
            rows={2}
            style={{ background: 'white' }}
            value={rep.description || ''}
            onChange={(e) => onRepChange(type, idx, 'description', e.target.value)}
            placeholder="Role or authorization context..."
          />
        </div>
        <div className="rep-name-grid">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>NAME</label>
            <input
              className="form-input"
              style={{ background: 'white' }}
              value={rep.name}
              onChange={(e) => onRepChange(type, idx, 'name', e.target.value)}
              placeholder="Full Name"
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>TITLE</label>
            <input
              className="form-input"
              style={{ background: 'white' }}
              value={rep.title}
              onChange={(e) => onRepChange(type, idx, 'title', e.target.value)}
              placeholder="Title / Designation"
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>DATE</label>
            <input
              type="date"
              className="form-input"
              style={{ background: 'white' }}
              value={rep.date}
              onChange={(e) => onRepChange(type, idx, 'date', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Right: Signature */}
      <div className="rep-sig">
        <SignatureInput
          label="SIGNATURE"
          value={rep.signature}
          onChange={(sig) => onRepChange(type, idx, 'signature', sig)}
        />
      </div>
    </div>
  </motion.div>
);

const ApprovalAgreement = () => {
  const { data, updateNestedField } = useProtocol();
  const approval = data.approval_data || {};

  const handleDetailChange = (field, value) => {
    updateNestedField(['approval_data', 'details', field], value);
  };

  const addAmendment = () => {
    const list = [...(approval.amendments || [])];
    list.push({ document: '', date: '' });
    updateNestedField(['approval_data', 'amendments'], list);
  };

  const updateAmendment = (index, field, value) => {
    const list = [...(approval.amendments || [])];
    list[index][field] = value;
    updateNestedField(['approval_data', 'amendments'], list);
  };

  const removeAmendment = (index) => {
    const list = (approval.amendments || []).filter((_, i) => i !== index);
    updateNestedField(['approval_data', 'amendments'], list);
  };

  const addRep = (type) => {
    const list = [...(approval[type] || [])];
    list.push({ name: '', title: '', date: '', signature: null, description: '' });
    updateNestedField(['approval_data', type], list);
  };

  const handleRepChange = (type, index, field, value) => {
    const list = [...approval[type]];
    list[index][field] = value;
    updateNestedField(['approval_data', type], list);
  };

  const removeRep = (type, index) => {
    const list = approval[type].filter((_, i) => i !== index);
    updateNestedField(['approval_data', type], list);
  };

  return (
    <div className="fade-in approval-page">
      {/* ── Page Header ── */}
      <div className="approval-page-header">
        <div>
          <div className="approval-badge-row">
            <span className="badge-lime">ADMINISTRATIVE DATA</span>
            <div className="badge-dot" />
            <span className="badge-muted">CONFIDENTIAL</span>
          </div>
          <h2 className="page-title">Protocol Approval &amp; Agreement</h2>
          <p className="page-subtitle">
            Formal clinical trial authorization and investigator stewardship tracking.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>

        {/* ── Protocol Details ── */}
        <div className="card approval-card">
          <SectionHeader
            icon={Building}
            title="Protocol Details"
            subtitle="Core identity and sponsorship information for this protocol."
          />

          <div className="protocol-details-grid">
            <div className="form-group pd-name">
              <label>PROTOCOL NAME</label>
              <input
                className="form-input"
                value={approval.details?.protocol_name || ''}
                onChange={(e) => handleDetailChange('protocol_name', e.target.value)}
                placeholder="Enter complete trial title..."
              />
            </div>
            <div className="form-group pd-number">
              <label>PROTOCOL NUMBER</label>
              <input
                className="form-input"
                style={{ color: 'var(--dark-lime)' }}
                value={approval.details?.protocol_number || ''}
                onChange={(e) => handleDetailChange('protocol_number', e.target.value)}
                placeholder="e.g. CLIN-2024-001"
              />
            </div>

            <div className="form-group pd-imp">
              <label>IMP</label>
              <input className="form-input" value={approval.details?.imp || ''} onChange={(e) => handleDetailChange('imp', e.target.value)} placeholder="Investigational Product (e.g. AG-101)" />
            </div>
            <div className="form-group pd-indication">
              <label>INDICATION</label>
              <input className="form-input" value={approval.details?.indication || ''} onChange={(e) => handleDetailChange('indication', e.target.value)} placeholder="Target disease..." />
            </div>
            <div className="form-group pd-phase">
              <label>CLINICAL PHASE</label>
              <select className="form-input" value={approval.details?.clinical_phase || ''} onChange={(e) => handleDetailChange('clinical_phase', e.target.value)}>
                <option value="">Select Phase</option>
                <option value="Phase I">Phase I</option>
                <option value="Phase II">Phase II</option>
                <option value="Phase III">Phase III</option>
                <option value="Phase IV">Phase IV</option>
              </select>
            </div>

            <div className="form-group pd-full">
              <label>INVESTIGATORS</label>
              <textarea className="form-input" rows={2} value={approval.details?.investigators || ''} onChange={(e) => handleDetailChange('investigators', e.target.value)} placeholder="List of participating investigators..." />
            </div>

            <div className="form-group pd-coord">
              <label>COORDINATING INVESTIGATOR</label>
              <input className="form-input" value={approval.details?.coordinating_investigator || ''} onChange={(e) => handleDetailChange('coordinating_investigator', e.target.value)} placeholder="Name of coordinating PI..." />
            </div>
            <div className="form-group pd-committee">
              <label>EXPERT COMMITTEE</label>
              <input className="form-input" value={approval.details?.expert_committee || ''} onChange={(e) => handleDetailChange('expert_committee', e.target.value)} placeholder="e.g. DMC, SRC..." />
            </div>

            <div className="form-group pd-full">
              <label>SPONSOR NAME &amp; ADDRESS</label>
              <textarea className="form-input" rows={2} value={approval.details?.sponsor_name_address || ''} onChange={(e) => handleDetailChange('sponsor_name_address', e.target.value)} placeholder="Legal name and headquarters address..." />
            </div>
            <div className="form-group pd-full">
              <label>GCP STATEMENT</label>
              <textarea className="form-input" rows={2} value={approval.details?.gcp_statement || ''} onChange={(e) => handleDetailChange('gcp_statement', e.target.value)} placeholder="Good Clinical Practice compliance statement..." />
            </div>
            <div className="form-group pd-full">
              <label>APPROVAL STATEMENT</label>
              <textarea className="form-input" rows={2} value={approval.details?.approval_statement || ''} onChange={(e) => handleDetailChange('approval_statement', e.target.value)} placeholder="Standard approval language..." />
            </div>
          </div>
        </div>

        {/* ── Sponsor Representation ── */}
        <div className="card approval-card">
          <SectionHeader
            icon={ShieldCheck}
            title="Sponsor Representation"
            subtitle="Authorized signatories for the sponsoring entity."
            action={
              <button className="btn btn-secondary rep-add-btn" onClick={() => addRep('sponsor_reps')}>
                <Plus size={16} /> Add Sponsor Rep
              </button>
            }
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <AnimatePresence>
              {(approval.sponsor_reps || []).map((rep, idx) => (
                <RepresentativeCard
                  key={idx}
                  rep={rep}
                  idx={idx}
                  type="sponsor_reps"
                  onRepChange={handleRepChange}
                  onRemove={removeRep}
                />
              ))}
            </AnimatePresence>
            {(approval.sponsor_reps || []).length === 0 && (
              <div className="empty-state">
                <ShieldCheck size={32} style={{ opacity: 0.3, marginBottom: '8px' }} />
                <span>No sponsor representatives added yet.</span>
              </div>
            )}
          </div>
        </div>

        {/* ── CRO Representative ── */}
        <div className="card approval-card">
          <SectionHeader
            icon={Building}
            title="CRO Representative"
            subtitle="Signatories from the Clinical Research Organization."
            action={
              <button className="btn btn-secondary rep-add-btn" onClick={() => addRep('cro_reps')}>
                <Plus size={16} /> Add CRO Rep
              </button>
            }
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <AnimatePresence>
              {(approval.cro_reps || []).map((rep, idx) => (
                <RepresentativeCard
                  key={idx}
                  rep={rep}
                  idx={idx}
                  type="cro_reps"
                  onRepChange={handleRepChange}
                  onRemove={removeRep}
                />
              ))}
            </AnimatePresence>
            {(approval.cro_reps || []).length === 0 && (
              <div className="empty-state">
                <Building size={32} style={{ opacity: 0.3, marginBottom: '8px' }} />
                <span>No CRO representatives added yet.</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Investigator Agreement ── */}
        <div className="card approval-card">
          <SectionHeader
            icon={FileSignature}
            title="Investigator Agreement"
            subtitle="Stewardship declaration to be signed by the Principal Investigator."
          />
          <div className="inv-agreement-body">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>AGREEMENT DESCRIPTION</label>
              <textarea
                className="form-input"
                rows={4}
                style={{ background: 'white', lineHeight: '1.8', borderLeft: '4px solid var(--primary-lime)', paddingLeft: '20px' }}
                value={
                  approval.investigator_agreement?.description ||
                  'I agree to conduct this study in full accordance with the protocol and all applicable clinical trial regulations, including the ICH Harmonized Tripartite Guideline for Good Clinical Practice (GCP).'
                }
                onChange={(e) =>
                  updateNestedField(['approval_data', 'investigator_agreement', 'description'], e.target.value)
                }
              />
            </div>

            <div className="inv-agreement-fields">
              {/* Left column: fields */}
              <div className="inv-fields-grid">
                <div className="form-group">
                  <label>INVESTIGATOR NAME</label>
                  <input className="form-input" style={{ background: 'white' }} value={approval.investigator_agreement?.name || ''} onChange={(e) => updateNestedField(['approval_data', 'investigator_agreement', 'name'], e.target.value)} placeholder="Full name" />
                </div>
                <div className="form-group">
                  <label>INVESTIGATOR TITLE</label>
                  <input className="form-input" style={{ background: 'white' }} value={approval.investigator_agreement?.title || ''} onChange={(e) => updateNestedField(['approval_data', 'investigator_agreement', 'title'], e.target.value)} placeholder="Title / Designation" />
                </div>
                <div className="form-group inv-full">
                  <label>FACILITY LOCATION</label>
                  <input className="form-input" style={{ background: 'white' }} value={approval.investigator_agreement?.facility || ''} onChange={(e) => updateNestedField(['approval_data', 'investigator_agreement', 'facility'], e.target.value)} placeholder="Hospital / Research Facility name" />
                </div>
                <div className="form-group">
                  <label>CITY</label>
                  <input className="form-input" style={{ background: 'white' }} value={approval.investigator_agreement?.city || ''} onChange={(e) => updateNestedField(['approval_data', 'investigator_agreement', 'city'], e.target.value)} placeholder="City" />
                </div>
                <div className="form-group">
                  <label>STATE</label>
                  <input className="form-input" style={{ background: 'white' }} value={approval.investigator_agreement?.state || ''} onChange={(e) => updateNestedField(['approval_data', 'investigator_agreement', 'state'], e.target.value)} placeholder="State / Province" />
                </div>
                <div className="form-group">
                  <label>DATE</label>
                  <input type="date" className="form-input" style={{ background: 'white' }} value={approval.investigator_agreement?.date || ''} onChange={(e) => updateNestedField(['approval_data', 'investigator_agreement', 'date'], e.target.value)} />
                </div>
              </div>

              {/* Right column: Signature */}
              <div className="inv-sig-col">
                <SignatureInput
                  label="INVESTIGATOR SIGNATURE"
                  value={approval.investigator_agreement?.signature}
                  onChange={(sig) => updateNestedField(['approval_data', 'investigator_agreement', 'signature'], sig)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Protocol Versions & Amendments ── */}
        <div className="card approval-card">
          <SectionHeader
            icon={CheckSquare}
            title="Protocol Version &amp; Amendments"
            subtitle="Tracking of protocol modifications."
            action={
              <button className="btn btn-secondary rep-add-btn" onClick={addAmendment}>
                <Plus size={16} /> Add Amendment
              </button>
            }
          />
          <div style={{ overflowX: 'auto' }}>
            {(approval.amendments || []).length > 0 ? (
              <table className="amendments-table">
                <thead>
                  <tr>
                    <th>Document</th>
                    <th>Date of Issue</th>
                    <th style={{ width: '80px', textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(approval.amendments || []).map((am, idx) => (
                    <tr key={idx}>
                      <td>
                        <input className="form-input" value={am.document} onChange={(e) => updateAmendment(idx, 'document', e.target.value)} placeholder="e.g. Amendment 01" />
                      </td>
                      <td>
                        <input type="date" className="form-input" value={am.date} onChange={(e) => updateAmendment(idx, 'date', e.target.value)} />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button onClick={() => removeAmendment(idx)} className="trash-btn"><Trash2 size={17} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty-state">
                <CheckSquare size={32} style={{ opacity: 0.3, marginBottom: '8px' }} />
                <span>No amendments logged yet.</span>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default ApprovalAgreement;
