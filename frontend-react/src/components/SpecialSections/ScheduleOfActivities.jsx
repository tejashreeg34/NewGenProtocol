import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Table as TableIcon, Plus, Trash2, Image as ImageIcon, 
  UploadCloud, X, Save, AlertTriangle, ChevronRight, 
  ChevronDown, Settings2, Grid, RefreshCw, Eraser, FileSpreadsheet,
  AlertCircle
} from 'lucide-react';
import { useProtocol } from '../../context/ProtocolContext';
import toast from 'react-hot-toast';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

const DEFAULT_HEADERS = [
  "Procedure", "Screening", "Enrollment/Baseline", 
  "Visit 1", "Visit 2", "Visit 3", "Visit 4", 
  "Visit 5", "Visit 6", "Visit 7", "Visit 8", 
  "Visit 9", "Visit 10", "Visit 11", "Visit 12", 
  "Final Visit"
];

const DEFAULT_PROCEDURES = [
  "Informed consent", "Demographics", "Medical history", 
  "Randomization", "Administer study intervention", 
  "Concomitant medication review", "Physical exam", 
  "Vital signs", "Height", "Weight", "Performance status", 
  "Hematology", "Serum chemistry", "Pregnancy test", "EKG", 
  "Adverse event review", "Radiologic/Imaging", 
  "Other assessments", "Complete CRFs"
];

const ScheduleOfActivities = () => {
  const { data, updateNestedField, openModal } = useProtocol();
  const [colCount, setColCount] = useState(5);
  const [rowCount, setRowCount] = useState(5);
  const [showConfig, setShowConfig] = useState(false);

  const soa = data.soa_data || { table: { headers: [], rows: [] } };
  const rawTable = soa.table || { headers: [], rows: [] };
  
  const table = {
    headers: rawTable.headers || [],
    rows: Array.isArray(rawTable.rows) ? rawTable.rows : Object.entries(rawTable.rows || {}).map(([proc, checks]) => [proc, ...checks.map(c => c ? "X" : "")])
  };

  // Whether this table was populated from PDF extraction (has real visit names, not blank
  const isExtractedFromPDF = table.headers.length > 1 && table.rows.length > 0 &&
    table.headers.slice(1).some(h => h && h.trim() !== '' && !h.match(/^Visit\s*\d+$/i));

  useEffect(() => {
    if (rawTable.rows && !Array.isArray(rawTable.rows)) {
        const newRows = Object.entries(rawTable.rows).map(([proc, checks]) => [proc, ...checks.map(c => c ? "X" : "")]);
        let newHeaders = rawTable.headers || [];
        if (newHeaders[0] !== "Procedure") newHeaders = ["Procedure", ...newHeaders];
        updateNestedField(['soa_data', 'table'], { headers: newHeaders, rows: newRows });
    }
  }, [rawTable.rows]);

  const getNextVisitName = () => {
    let maxVisitNum = 0;
    table.headers.forEach(h => {
      const match = h.match(/Visit\s*(\d+)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxVisitNum) maxVisitNum = num;
      }
    });
    return `Visit ${maxVisitNum + 1}`;
  };

  const handleHeaderChange = (index, value) => {
    const newHeaders = [...table.headers];
    newHeaders[index] = value;
    updateNestedField(['soa_data', 'table', 'headers'], newHeaders);
  };

  const handleCellChange = (rowIndex, colIndex, value) => {
    const newRows = JSON.parse(JSON.stringify(table.rows));
    if (!newRows[rowIndex]) newRows[rowIndex] = [];
    newRows[rowIndex][colIndex] = value;
    updateNestedField(['soa_data', 'table', 'rows'], newRows);
  };

  const addColumn = () => {
    const newHeaders = [...table.headers, ""];
    const newRows = table.rows.map(row => [...row, "0"]);
    updateNestedField(['soa_data', 'table'], { headers: newHeaders, rows: newRows });
    toast.success('Column added');
  };

  const insertColumnAfter = (index) => {
    const newHeaders = [...table.headers];
    newHeaders.splice(index + 1, 0, "");
    const newRows = table.rows.map(row => {
      const nr = [...row];
      nr.splice(index + 1, 0, "0"); 
      return nr;
    });
    updateNestedField(['soa_data', 'table'], { headers: newHeaders, rows: newRows });
    toast.success('Column added');
  };

  const addRow = () => {
    const newRow = new Array(table.headers.length).fill("0");
    newRow[0] = ""; 
    const newRows = [...table.rows, newRow];
    updateNestedField(['soa_data', 'table', 'rows'], newRows);
    toast.success('Row added');
  };

  const insertRowAfter = (index) => {
    const newRow = new Array(table.headers.length).fill("0");
    newRow[0] = "";
    const newRows = [...table.rows];
    newRows.splice(index + 1, 0, newRow);
    updateNestedField(['soa_data', 'table', 'rows'], newRows);
    toast.success('Row added');
  };

  const deleteColumn = (index) => {
    if (index === 0) return;
    openModal({
      title: 'Delete Column?',
      message: `Are you sure you want to delete "${table.headers[index] || 'this column'}"? All visit data in this column will be lost.`,
      icon: 'trash',
      onConfirm: () => {
        const newHeaders = table.headers.filter((_, i) => i !== index);
        const newRows = table.rows.map(row => row.filter((_, i) => i !== index));
        updateNestedField(['soa_data', 'table'], { headers: newHeaders, rows: newRows });
        toast.success('Column deleted');
      }
    });
  };

  const deleteRow = (index) => {
    openModal({
      title: 'Delete Row?',
      message: `Are you sure you want to delete "${table.rows[index][0] || 'this row'}"? This action cannot be undone.`,
      icon: 'trash',
      onConfirm: () => {
        const newRows = table.rows.filter((_, i) => i !== index);
        updateNestedField(['soa_data', 'table', 'rows'], newRows);
        toast.success('Row deleted');
      }
    });
  };

  const generateInitialTable = () => {
    const headers = ["Procedure"];
    for(let i=1; i<colCount; i++) headers.push(`Visit ${i}`);
    const rows = [];
    for(let r=0; r<rowCount; r++) rows.push(new Array(colCount).fill("0"));
    updateNestedField(['soa_data', 'table'], { headers, rows });
    setShowConfig(false);
    toast.success('Grid generated');
  };

  const applyTemplate = () => {
    const rows = DEFAULT_PROCEDURES.map(proc => {
       const row = new Array(DEFAULT_HEADERS.length).fill("0");
       row[0] = proc;
       return row;
    });
    updateNestedField(['soa_data', 'table'], { headers: DEFAULT_HEADERS, rows });
    toast.success('Clinical template applied');
  };

  const clearTable = () => {
    openModal({
      title: 'Clear Table?',
      message: 'Are you sure you want to clear all rows and columns? This action is irreversible.',
      icon: 'trash',
      onConfirm: () => {
        updateNestedField(['soa_data', 'table'], { headers: ["Procedure"], rows: [] });
        toast.success('Table cleared');
      }
    });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/upload-image`, formData);
      updateNestedField(['soa_data', 'image'], { url: response.data.url, caption: '', description: '' });
      toast.success('SoA image uploaded');
    } catch (error) {
      toast.error('Upload failed');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '40px', position: 'relative' }}>
      
      {/* 1. OPERATIONS HUB - Consolidated Controls */}
      <section className="card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
             <Settings2 size={18} color="var(--primary-lime)" />
             <h4 style={{ fontSize: '1rem', fontWeight: 800 }}>SoA Operations Hub</h4>
           </div>
           <div style={{ display: 'flex', gap: '12px' }}>
             <label className="btn btn-secondary small" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
               <ImageIcon size={14} /> Upload Image
               <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileUpload} />
             </label>
             <button className="btn btn-secondary small" onClick={applyTemplate} title="Apply Standard Clinical Template">
               <FileSpreadsheet size={14} /> Use Template
             </button>
             <button className="btn btn-secondary small" onClick={() => setShowConfig(!showConfig)}>
               <Grid size={14} /> Custom Grid
             </button>
             <button className="btn btn-secondary small" onClick={clearTable} style={{ color: '#EF4444' }}>
               <Eraser size={14} /> Clear
             </button>
           </div>
        </div>

        <AnimatePresence>
          {showConfig && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} 
              style={{ overflow: 'hidden', background: 'var(--bg-gray)', borderRadius: '12px', marginBottom: '24px', border: '1px solid var(--border-color)' }}>
              <div style={{ padding: '20px' }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 800, marginBottom: '16px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Build Custom Grid</p>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Columns</label>
                    <input type="number" className="form-input" value={colCount} onChange={e => setColCount(Math.max(1, parseInt(e.target.value)))} style={{ width: '80px' }} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Rows</label>
                    <input type="number" className="form-input" value={rowCount} onChange={e => setRowCount(Math.max(1, parseInt(e.target.value)))} style={{ width: '80px' }} />
                  </div>
                  <button className="btn btn-primary" onClick={generateInitialTable}>Generate</button>
                  <button className="btn btn-secondary" onClick={() => setShowConfig(false)}>Cancel</button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
           <button className="btn btn-secondary" style={{ flex: 1, minWidth: '140px' }} onClick={addRow}><Plus size={16} /> Add Activity Row</button>
           <button className="btn btn-secondary" style={{ flex: 1, minWidth: '140px' }} onClick={addColumn}><Plus size={16} /> Add Visit Column</button>
        </div>
      </section>

      {/* 2. DYNAMIC GRID */}
      {(table.rows.length > 0 || soa.image?.url) && (
        <section className="card" style={{ padding: '24px', minHeight: '400px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <TableIcon size={18} color="var(--primary-lime)" />
            <h4 style={{ fontSize: '1rem', fontWeight: 800 }}>Schedule of Activities (SoA)</h4>
            {isExtractedFromPDF && (
              <span style={{
                marginLeft: 'auto',
                fontSize: '0.72rem',
                fontWeight: 700,
                background: 'var(--light-lime)',
                color: 'var(--dark-lime)',
                padding: '4px 12px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                Extracted from PDF
              </span>
            )}
          </div>

          {soa.image?.url && (
            <div style={{ position: 'relative', marginBottom: '24px' }}>
              <div style={{ background: 'var(--bg-gray)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                <img 
                  src={`${API_BASE_URL}${soa.image.url}`} 
                  style={{ width: '100%', maxHeight: '500px', objectFit: 'contain', borderRadius: '12px', marginBottom: '20px' }} 
                  alt="SoA Table"
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px' }}>
                  <div className="form-group">
                    <label>Figure Caption</label>
                    <input type="text" className="form-input" value={soa.image.caption || ''} 
                      onChange={e => updateNestedField(['soa_data', 'image', 'caption'], e.target.value)} placeholder="Figure 1.1..." />
                  </div>
                  <div className="form-group">
                    <label>Description</label>
                    <input type="text" className="form-input" value={soa.image.description || ''} 
                      onChange={e => updateNestedField(['soa_data', 'image', 'description'], e.target.value)} placeholder="Notes..." />
                  </div>
                </div>
              </div>
              <button onClick={() => updateNestedField(['soa_data', 'image'], null)} title="Remove Image"
                style={{ position: 'absolute', top: '-10px', right: '-10px', background: '#EF4444', color: 'white', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 12px rgba(239,68,68,0.3)' }}>
                <X size={18} />
              </button>
            </div>
          )}

          {table.rows.length > 0 && (
            <div 
              className={`soa-table-container ${table.headers.length > 1 ? 'scrolled-x' : ''}`}
            >
              <table className="soa-table">
                <thead>
                  <tr>
                    {/* Standardized 'ACTIONS' Header - Exactly like others */}
                    <th style={{ width: '100px', minWidth: '100px' }}>
                      <div className="soa-header-content">
                        <div style={{ 
                          textAlign: 'center', 
                          fontSize: '0.9rem', 
                          fontWeight: 700, 
                          color: 'var(--text-color)',
                          width: '100%',
                          textTransform: 'uppercase',
                          opacity: 0.9
                        }}>
                          Actions
                        </div>
                        <div className="soa-header-actions" style={{ visibility: 'hidden' }}>
                          <Plus size={10} />
                        </div>
                      </div>
                    </th>

                    {table.headers.map((h, i) => (
                      <th key={i} style={{ 
                        minWidth: i === 0 ? '360px' : '150px'
                      }}>
                        <div className="soa-header-content">
                          <input 
                            className="soa-header-input"
                            type="text" value={h} 
                            onChange={e => handleHeaderChange(i, e.target.value)}
                            style={{ 
                              textAlign: 'center', 
                              fontSize: '1rem',
                              fontWeight: 700,
                              color: 'var(--text-color)',
                              width: '100%',
                              background: 'transparent',
                              border: 'none',
                              padding: '4px 0'
                            }}
                            placeholder={i === 0 ? "e.g. Activity Group" : `e.g. ${getNextVisitName()}`}
                          />
                          <div className="soa-header-actions">
                            <button className="soa-action-btn add" onClick={() => insertColumnAfter(i)} title="Insert After">
                              <Plus size={10} />
                            </button>
                            {i > 0 && (
                              <button className="soa-action-btn delete" onClick={() => deleteColumn(i)} title="Delete Column">
                                <Trash2 size={10} />
                              </button>
                            )}
                          </div>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {table.rows.map((row, rIdx) => (
                    <tr key={rIdx}>
                      {/* Row Actions Cell */}
                      <td>
                        <div className="soa-action-cell">
                          <button className="soa-action-btn add" onClick={() => insertRowAfter(rIdx)} title="Insert Below">
                            <Plus size={12} />
                          </button>
                          <button className="soa-action-btn delete" onClick={() => deleteRow(rIdx)} title="Delete Row">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>

                      {table.headers.map((_, cIdx) => (
                        <td key={cIdx}>
                          {cIdx === 0 ? (
                            <input 
                              className="soa-cell-input"
                              value={row[cIdx] || ''}
                              onChange={e => handleCellChange(rIdx, cIdx, e.target.value)}
                              placeholder="e.g. Informed Consent"
                              style={{ width: '100%', border: 'none', background: 'transparent' }}
                            />
                          ) : (
                            <div className="soa-toggle-cell">
                              <button 
                                className={`soa-toggle-btn ${row[cIdx] === '1' ? 'active' : ''}`}
                                onClick={() => handleCellChange(rIdx, cIdx, row[cIdx] === '1' ? '0' : '1')}
                              >
                                <div className="soa-toggle-inner" />
                              </button>
                            </div>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

    </div>
  );
};

export default ScheduleOfActivities;
