import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileSpreadsheet, Plus, Trash2, Save, Target, ListChecks, Users, FileText, Info, Clock, Activity, Users2, ShieldAlert, Award, MapPin, Calendar, ImagePlus, TableProperties, X } from 'lucide-react';
import { useProtocol } from '../../context/ProtocolContext';
import toast from 'react-hot-toast';

const Synopsis = () => {
  const { data, updateNestedField } = useProtocol();
  const synopsis = data.synopsis_data || {};
  
  const [tableModal, setTableModal] = React.useState({ open: false, rows: 3, cols: 3 });

  const handleFieldChange = (path, value) => {
    updateNestedField(['synopsis_data', ...path], value);
  };

  const addBullet = (category, type) => {
    const list = [...(synopsis[category]?.[type] || [])];
    list.push("");
    handleFieldChange([category, type], list);
  };

  const updateBullet = (category, type, index, value) => {
    const list = [...synopsis[category][type]];
    list[index] = value;
    handleFieldChange([category, type], list);
  };

  const removeBullet = (category, type, index) => {
    const list = synopsis[category][type].filter((_, i) => i !== index);
    handleFieldChange([category, type], list);
  };

  const addPoint = (type) => {
    const list = [...(synopsis[type]?.points || [])];
    list.push("");
    handleFieldChange([type, 'points'], list);
  };

  const updatePoint = (type, index, value) => {
    const list = [...synopsis[type].points];
    list[index] = value;
    handleFieldChange([type, 'points'], list);
  };

  const removePoint = (type, index) => {
    const list = synopsis[type].points.filter((_, i) => i !== index);
    handleFieldChange([type, 'points'], list);
  };

  const confirmAddTable = () => {
    const list = [...(synopsis.tables || [])];
    const r = Math.max(1, parseInt(tableModal.rows) || 1);
    const c = Math.max(1, parseInt(tableModal.cols) || 1);
    
    list.push({ 
      title: 'New Custom Table', 
      headers: Array.from({ length: c }, (_, i) => `Column ${i+1}`), 
      rows: Array.from({ length: r }, () => new Array(c).fill(''))
    });
    handleFieldChange(['tables'], list);
    setTableModal({ open: false, rows: 3, cols: 3 });
  };

  const removeTable = (index) => {
    const list = synopsis.tables.filter((_, i) => i !== index);
    handleFieldChange(['tables'], list);
  };

  const updateTableData = (tableIndex, field, value) => {
    const list = [...synopsis.tables];
    list[tableIndex] = { ...list[tableIndex], [field]: value };
    handleFieldChange(['tables'], list);
  };

  const addTableRow = (tableIndex) => {
    const list = [...synopsis.tables];
    const newTable = { ...list[tableIndex] };
    newTable.rows = [...newTable.rows, new Array(newTable.headers.length).fill('')];
    list[tableIndex] = newTable;
    handleFieldChange(['tables'], list);
  };

  const removeTableRow = (tableIndex, rowIndex) => {
    const list = [...synopsis.tables];
    const newTable = { ...list[tableIndex] };
    newTable.rows = [...newTable.rows];
    newTable.rows.splice(rowIndex, 1);
    
    if (newTable.rows.length === 0 || newTable.headers.length === 0) {
      list.splice(tableIndex, 1);
    } else {
      list[tableIndex] = newTable;
    }
    handleFieldChange(['tables'], list);
  };

  const removeTableCol = (tableIndex, colIndex) => {
    const list = [...synopsis.tables];
    const newTable = { ...list[tableIndex] };
    newTable.headers = [...newTable.headers];
    newTable.headers.splice(colIndex, 1);
    newTable.rows = newTable.rows.map(r => [...r]);
    newTable.rows.forEach(r => r.splice(colIndex, 1));

    if (newTable.headers.length === 0 || newTable.rows.length === 0) {
      list.splice(tableIndex, 1);
    } else {
      list[tableIndex] = newTable;
    }
    handleFieldChange(['tables'], list);
  };

  const updateTableCell = (tableIndex, rowIndex, colIndex, value) => {
    const list = [...synopsis.tables];
    const newTable = { ...list[tableIndex] };
    newTable.rows = [...newTable.rows];
    newTable.rows[rowIndex] = [...newTable.rows[rowIndex]];
    newTable.rows[rowIndex][colIndex] = value;
    list[tableIndex] = newTable;
    handleFieldChange(['tables'], list);
  };

  return (
    <div className="fade-in" style={{ paddingBottom: '60px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '40px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ color: 'var(--primary-lime)', fontWeight: 800, fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase' }}>EXECUTIVE PROTOCOL SUMMARY</span>
            <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--border-color)' }}></div>
            <span style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.7rem' }}>CLINICAL OVERVIEW</span>
          </div>
          <h2 style={{ fontSize: '2.4rem', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>Patient Synopsis</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem', marginTop: '4px' }}>Consolidated clinical framework for trial execution and regulatory review.</p>
        </div>
        <button className="btn btn-primary" style={{ padding: '12px 28px', borderRadius: '16px', boxShadow: '0 8px 24px rgba(50, 205, 50, 0.2)' }} onClick={() => toast.success('Synopsis data synchronized')}>
          <Save size={18} /> Save Synopsis
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        
        {/* Trial Overview Section */}
        <div className="card" style={{ padding: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '32px' }}>
             <div style={{ background: 'var(--light-lime)', width: '48px', height: '48px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--dark-lime)' }}>
                <FileText size={24} />
             </div>
             <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Trial Overview</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Foundational identity and scheduling parameters.</p>
             </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
            <div className="form-group" style={{ gridColumn: 'span 3' }}>
              <label>TITLE OF TRIAL</label>
              <textarea 
                className="form-input" 
                rows={2}
                value={synopsis.overview?.title || ''} 
                onChange={(e) => handleFieldChange(['overview', 'title'], e.target.value)}
                placeholder="Complete clinical trial title..."
              />
            </div>
            <div className="form-group">
              <label>COORDINATING INVESTIGATOR</label>
              <div style={{ position: 'relative' }}>
                <Users size={16} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input className="form-input" style={{ paddingLeft: '44px' }} value={synopsis.overview?.coordinating_investigator || ''} onChange={(e) => handleFieldChange(['overview', 'coordinating_investigator'], e.target.value)} placeholder="Lead PI Name" />
              </div>
            </div>
            <div className="form-group">
              <label>EXPERT COMMITTEE</label>
              <div style={{ position: 'relative' }}>
                <Award size={16} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input className="form-input" style={{ paddingLeft: '44px' }} value={synopsis.overview?.expert_committee || ''} onChange={(e) => handleFieldChange(['overview', 'expert_committee'], e.target.value)} placeholder="e.g. DMC, SRC" />
              </div>
            </div>
            <div className="form-group" style={{ gridColumn: 'span 3' }}>
              <label>INVESTIGATORS</label>
              <textarea 
                className="form-input" 
                rows={2} 
                value={synopsis.overview?.investigators || ''} 
                onChange={(e) => handleFieldChange(['overview', 'investigators'], e.target.value)} 
                placeholder="List of participating investigators..." 
              />
            </div>
            <div className="form-group">
              <label>TRIAL SITES</label>
              <div style={{ position: 'relative' }}>
                <MapPin size={16} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input className="form-input" style={{ paddingLeft: '44px' }} value={synopsis.overview?.trial_sites || ''} onChange={(e) => handleFieldChange(['overview', 'trial_sites'], e.target.value)} placeholder="Global sites count/locations" />
              </div>
            </div>
            <div className="form-group">
              <label>PLANNED TRIAL PERIOD</label>
              <div style={{ position: 'relative' }}>
                <Clock size={16} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input className="form-input" style={{ paddingLeft: '44px' }} value={synopsis.overview?.planned_period || ''} onChange={(e) => handleFieldChange(['overview', 'planned_period'], e.target.value)} placeholder="e.g. Q4 2024 - Q4 2026" />
              </div>
            </div>
            <div className="form-group">
              <label>FIRST PATIENT FIRST VISIT (FPFV)</label>
              <div style={{ position: 'relative' }}>
                <Calendar size={16} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input className="form-input" style={{ paddingLeft: '44px' }} value={synopsis.overview?.fpfv || ''} onChange={(e) => handleFieldChange(['overview', 'fpfv'], e.target.value)} placeholder="Target Date" />
              </div>
            </div>
            <div className="form-group">
              <label>LAST PATIENT LAST VISIT (LPLV)</label>
              <div style={{ position: 'relative' }}>
                <Calendar size={16} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input className="form-input" style={{ paddingLeft: '44px' }} value={synopsis.overview?.lplv || ''} onChange={(e) => handleFieldChange(['overview', 'lplv'], e.target.value)} placeholder="Target Date" />
              </div>
            </div>
            <div className="form-group">
              <label>CLINICAL PHASE</label>
              <div style={{ position: 'relative' }}>
                <Activity size={16} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <select className="form-input" style={{ paddingLeft: '44px' }} value={synopsis.overview?.clinical_phase || ''} onChange={(e) => handleFieldChange(['overview', 'clinical_phase'], e.target.value)}>
                  <option value="">Select Phase</option>
                  <option value="Phase I">Phase I</option>
                  <option value="Phase II">Phase II</option>
                  <option value="Phase III">Phase III</option>
                  <option value="Phase IV">Phase IV</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Objectives Section */}
        <div className="card" style={{ padding: '40px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
               <div style={{ background: 'var(--light-lime)', width: '48px', height: '48px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--dark-lime)' }}>
                  <Target size={24} />
               </div>
               <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Trial Objectives</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Defined clinical goals categorized by priority.</p>
               </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {['primary', 'secondary', 'exploratory'].map((type) => (
              <div key={type} style={{ border: '1px solid var(--border-color)', borderRadius: '20px', padding: '24px', background: 'var(--bg-gray)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h4 style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--dark-lime)', letterSpacing: '0.05em' }}>{type} OBJECTIVES</h4>
                  <button className="btn btn-secondary small" onClick={() => addBullet('objectives', type)}>
                    <Plus size={14} /> Add Objective
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {(synopsis.objectives?.[type] || []).map((bullet, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '12px' }}>
                      <textarea 
                        className="form-input"
                        rows={1}
                        style={{ background: 'white', flex: 1 }}
                        value={bullet}
                        onChange={(e) => updateBullet('objectives', type, idx, e.target.value)}
                        placeholder={`Enter ${type} objective...`}
                      />
                      <button onClick={() => removeBullet('objectives', type, idx)} style={{ background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '8px' }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  {(!synopsis.objectives?.[type] || synopsis.objectives[type].length === 0) && (
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '8px' }}>No {type} objectives defined.</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Endpoints Section */}
        <div className="card" style={{ padding: '40px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
               <div style={{ background: 'var(--light-lime)', width: '48px', height: '48px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--dark-lime)' }}>
                  <ListChecks size={24} />
               </div>
               <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Trial Endpoints</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Specific measurements used to evaluate the objectives.</p>
               </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {['primary', 'secondary', 'exploratory'].map((type) => (
              <div key={type} style={{ border: '1px solid var(--border-color)', borderRadius: '20px', padding: '24px', background: 'var(--bg-gray)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h4 style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--dark-lime)', letterSpacing: '0.05em' }}>{type} ENDPOINTS</h4>
                  <button className="btn btn-secondary small" onClick={() => addBullet('endpoints', type)}>
                    <Plus size={14} /> Add Endpoint
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {(synopsis.endpoints?.[type] || []).map((bullet, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '12px' }}>
                      <textarea 
                        className="form-input"
                        rows={1}
                        style={{ background: 'white', flex: 1 }}
                        value={bullet}
                        onChange={(e) => updateBullet('endpoints', type, idx, e.target.value)}
                        placeholder={`Enter ${type} endpoint...`}
                      />
                      <button onClick={() => removeBullet('endpoints', type, idx)} style={{ background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '8px' }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  {(!synopsis.endpoints?.[type] || synopsis.endpoints[type].length === 0) && (
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '8px' }}>No {type} endpoints defined.</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Study Flowchart Section */}
        <div className="card" style={{ padding: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
             <div style={{ background: 'var(--light-lime)', width: '48px', height: '48px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--dark-lime)' }}>
                <ImagePlus size={24} />
             </div>
             <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Study Flowchart Section</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Visual representation of trial procedures and schedule.</p>
             </div>
          </div>
          <div style={{ padding: '32px', border: '2px dashed var(--border-color)', borderRadius: '20px', textAlign: 'center', background: 'var(--bg-gray)' }}>
            {synopsis.flowchart ? (
               <div style={{ position: 'relative', display: 'inline-block' }}>
                 <img src={synopsis.flowchart} alt="Flowchart" style={{ maxWidth: '100%', maxHeight: '400px', borderRadius: '12px' }} />
                 <button className="btn-icon" onClick={() => handleFieldChange(['flowchart'], null)} style={{ position: 'absolute', top: '12px', right: '12px', background: 'white', color: '#EF4444' }}>
                   <Trash2 size={16} />
                 </button>
               </div>
            ) : (
               <label style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', gap: '12px' }}>
                 <div className="btn btn-secondary" style={{ padding: '12px 24px', borderRadius: '12px', fontWeight: 700, pointerEvents: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
                   <Plus size={18} /> Add Flowchart
                 </div>
                 <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Upload PNG, JPG, or PDF</span>
                 <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => {
                   if(e.target.files[0]) {
                     const reader = new FileReader();
                     reader.onload = (event) => handleFieldChange(['flowchart'], event.target.result);
                     reader.readAsDataURL(e.target.files[0]);
                     toast.success('Flowchart added successfully');
                   }
                 }} />
               </label>
            )}
          </div>
        </div>

        {/* Number of Patients Section */}
        <div className="card" style={{ padding: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
             <div style={{ background: 'var(--light-lime)', width: '48px', height: '48px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--dark-lime)' }}>
                <Users size={24} />
             </div>
             <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Number of Patients</h3>
             </div>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
             <label>Planned Number of Patients</label>
             <input 
               className="form-input" 
               style={{ maxWidth: '600px', fontSize: '1.05rem', fontWeight: 600 }}
               value={synopsis.patients || ''} 
               onChange={(e) => handleFieldChange(['patients'], e.target.value)}
               placeholder="e.g. 150 subjects"
             />
          </div>
        </div>

        {/* Inclusion/Exclusion Points (Keep previous but enhanced) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
           {/* Inclusion */}
           <div className="card" style={{ padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                 <div style={{ background: 'var(--light-lime)', width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--dark-lime)' }}>
                    <Award size={20} />
                 </div>
                 <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Inclusion Criteria</h3>
              </div>
              <button className="btn btn-secondary" style={{ padding: '8px 12px', borderRadius: '10px' }} onClick={() => addPoint('inclusion')}>
                <Plus size={16} /> Add Point
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <textarea 
                className="form-input mb-3" 
                rows={2} 
                value={synopsis.inclusion?.text || ''} 
                onChange={(e) => handleFieldChange(['inclusion', 'text'], e.target.value)}
                placeholder="General inclusion statement..."
              />
              <AnimatePresence>
                {(synopsis.inclusion?.points || []).map((p, idx) => (
                  <motion.div key={idx} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} style={{ display: 'flex', gap: '12px' }}>
                    <textarea 
                      className="form-input" 
                      rows={1} 
                      value={p} 
                      onChange={(e) => updatePoint('inclusion', idx, e.target.value)}
                      style={{ background: 'var(--bg-gray)', fontSize: '0.9rem' }}
                      placeholder="Criteria point..."
                    />
                    <button className="btn-icon" onClick={() => removePoint('inclusion', idx)} style={{ color: '#EF4444' }}><Trash2 size={16} /></button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Exclusion */}
          <div className="card" style={{ padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                 <div style={{ background: '#FFF5F5', width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#E53E3E' }}>
                    <ShieldAlert size={20} />
                 </div>
                 <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Exclusion Criteria</h3>
              </div>
              <button className="btn btn-secondary" style={{ padding: '8px 12px', borderRadius: '10px' }} onClick={() => addPoint('exclusion')}>
                <Plus size={16} /> Add Point
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <textarea 
                className="form-input mb-3" 
                rows={2} 
                value={synopsis.exclusion?.text || ''} 
                onChange={(e) => handleFieldChange(['exclusion', 'text'], e.target.value)}
                placeholder="General exclusion statement..."
              />
              <AnimatePresence>
                {(synopsis.exclusion?.points || []).map((p, idx) => (
                  <motion.div key={idx} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} style={{ display: 'flex', gap: '12px' }}>
                    <textarea 
                      className="form-input" 
                      rows={1} 
                      value={p} 
                      onChange={(e) => updatePoint('exclusion', idx, e.target.value)}
                      style={{ background: 'var(--bg-gray)', fontSize: '0.9rem' }}
                      placeholder="Criteria point..."
                    />
                    <button className="btn-icon" onClick={() => removePoint('exclusion', idx)} style={{ color: '#EF4444' }}><Trash2 size={16} /></button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Study Team Section */}
        <div className="card" style={{ padding: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '32px' }}>
             <div style={{ background: 'var(--light-lime)', width: '48px', height: '48px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--dark-lime)' }}>
                <Users2 size={24} />
             </div>
             <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Study Team Overview</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Scope and responsibilities of the trial leadership.</p>
             </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
            <div className="form-group">
              <label>INVESTIGATOR DESCRIPTION</label>
              <textarea 
                className="form-input" 
                rows={3} 
                value={synopsis.team?.investigator_desc || ''} 
                onChange={(e) => handleFieldChange(['team', 'investigator_desc'], e.target.value)}
                placeholder="Roles and site investigator profiles..."
              />
            </div>
            <div className="form-group">
              <label>STUDY COORDINATOR DESCRIPTION</label>
              <textarea 
                className="form-input" 
                rows={3} 
                value={synopsis.team?.coordinator_desc || ''} 
                onChange={(e) => handleFieldChange(['team', 'coordinator_desc'], e.target.value)}
                placeholder="Site coordination and monitoring strategy..."
              />
            </div>
          </div>
        </div>

        {/* Statistical Methods Section */}
        <div className="card" style={{ padding: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '32px' }}>
             <div style={{ background: 'var(--light-lime)', width: '48px', height: '48px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--dark-lime)' }}>
                <Activity size={24} />
             </div>
             <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Statistical Methods</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Analysis populations, sample size justification, and primary methods.</p>
             </div>
          </div>

          <textarea 
            className="form-input" 
            rows={5} 
            value={synopsis.statistical_methods || ''} 
            onChange={(e) => handleFieldChange(['statistical_methods'], e.target.value)}
            placeholder="Analytical framework and hypothesis testing..."
            style={{ padding: '24px', lineHeight: '1.7' }}
          />
        </div>

        {/* Custom Tables Section */}
        <div className="card" style={{ padding: '40px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ background: 'var(--light-lime)', width: '48px', height: '48px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--dark-lime)' }}>
                   <FileSpreadsheet size={24} />
                </div>
                <div>
                   <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Custom Data Tables</h3>
                   <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Structured data views for synopsis-specific parameters.</p>
                </div>
             </div>
             <button className="btn btn-secondary" style={{ borderRadius: '12px', padding: '10px 20px' }} onClick={() => setTableModal({ open: true, rows: 3, cols: 3 })}>
               <TableProperties size={18} /> Add Table
             </button>
          </div>

          <AnimatePresence>
            {tableModal.open && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{ overflow: 'hidden', marginBottom: '24px' }}
              >
                <div style={{ padding: '24px', background: 'white', borderRadius: '16px', border: '1px solid var(--primary-lime)', boxShadow: '0 8px 24px rgba(50,205,50,0.1)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h4 style={{ fontWeight: 800, color: 'var(--text-main)' }}>Configure New Table</h4>
                    <button onClick={() => setTableModal({ ...tableModal, open: false })} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
                  </div>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Rows</label>
                      <input type="number" min="1" max="50" className="form-input" style={{ width: '100px' }} value={tableModal.rows} onChange={(e) => setTableModal({ ...tableModal, rows: e.target.value })} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Columns</label>
                      <input type="number" min="1" max="10" className="form-input" style={{ width: '100px' }} value={tableModal.cols} onChange={(e) => setTableModal({ ...tableModal, cols: e.target.value })} />
                    </div>
                    <button className="btn btn-primary" style={{ padding: '14px 24px' }} onClick={confirmAddTable}>Generate</button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {(synopsis.tables || []).map((table, tIdx) => (
              <div key={tIdx} style={{ padding: '28px', borderRadius: '24px', border: '1px solid var(--border-color)', background: 'var(--bg-gray)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                  <input 
                    style={{ background: 'transparent', border: 'none', borderBottom: '1px solid var(--border-color)', fontSize: '1.2rem', fontWeight: 800, padding: '4px 0', width: '100%', maxWidth: '400px', color: 'var(--text-main)' }}
                    value={table.title}
                    onChange={(e) => updateTableData(tIdx, 'title', e.target.value)}
                  />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn btn-secondary small" onClick={() => addTableRow(tIdx)}><Plus size={14} /> Add Row</button>
                    <button onClick={() => removeTable(tIdx)} style={{ background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer' }}><Trash2 size={18} /></button>
                  </div>
                </div>
                <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white' }}>
                    <thead>
                      <tr>
                        {table.headers.map((h, hIdx) => (
                           <th key={hIdx} style={{ padding: '12px', borderBottom: '2px solid var(--border-color)', borderRight: '1px solid rgba(0,0,0,0.05)', background: '#F8FAFC', position: 'relative', minWidth: '150px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input 
                                  style={{ border: 'none', width: '100%', fontWeight: 700, textAlign: 'left', fontSize: '0.85rem', background: 'transparent', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                                  value={h}
                                  onChange={(e) => {
                                    const headers = [...table.headers];
                                    headers[hIdx] = e.target.value;
                                    updateTableData(tIdx, 'headers', headers);
                                  }}
                                />
                                <button title="Delete Column" onClick={() => removeTableCol(tIdx, hIdx)} style={{ background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer', opacity: 0.5 }}>
                                  <X size={14} />
                                </button>
                              </div>
                           </th>
                        ))}
                        <th style={{ width: '40px', background: '#F8FAFC', borderBottom: '2px solid var(--border-color)' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {table.rows.map((row, rIdx) => (
                        <tr key={rIdx} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                          {row.map((cell, cIdx) => (
                            <td key={cIdx} style={{ padding: '0', borderRight: '1px solid rgba(0,0,0,0.05)', background: 'white' }}>
                              <input 
                                style={{ border: 'none', width: '100%', fontSize: '0.95rem', padding: '16px', color: 'var(--text-main)', outline: 'none' }}
                                value={cell}
                                onChange={(e) => updateTableCell(tIdx, rIdx, cIdx, e.target.value)}
                                placeholder="Enter value..."
                                onFocus={(e) => e.target.style.background = 'rgba(50,205,50,0.03)'}
                                onBlur={(e) => e.target.style.background = 'transparent'}
                              />
                            </td>
                          ))}
                          <td style={{ textAlign: 'center', background: 'white' }}>
                            <button title="Delete Row" onClick={() => removeTableRow(tIdx, rIdx)} style={{ background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer', opacity: 0.6, padding: '8px' }}>
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
            {(!synopsis.tables || synopsis.tables.length === 0) && (
              <div style={{ textAlign: 'center', padding: '60px', background: 'var(--bg-gray)', borderRadius: '24px', border: '1px dashed var(--border-color)', color: 'var(--text-muted)' }}>
                 No custom tables added to the synopsis.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Synopsis;
