import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Table as TableIcon, Plus, Trash2, Image as ImageIcon, 
  UploadCloud, X, Save, AlertTriangle, ChevronRight, 
  ChevronDown, Settings2, Grid, RefreshCw, Eraser, FileSpreadsheet
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
  const { data, updateNestedField } = useProtocol();
  const [colCount, setColCount] = useState(5);
  const [rowCount, setRowCount] = useState(5);
  const [showConfig, setShowConfig] = useState(false);

  const soa = data.soa_data || { table: { headers: [], rows: [] } };
  const rawTable = soa.table || { headers: [], rows: [] };
  
  const table = {
    headers: rawTable.headers || [],
    rows: Array.isArray(rawTable.rows) ? rawTable.rows : Object.entries(rawTable.rows || {}).map(([proc, checks]) => [proc, ...checks.map(c => c ? "X" : "")])
  };

  useEffect(() => {
    if (rawTable.rows && !Array.isArray(rawTable.rows)) {
        const newRows = Object.entries(rawTable.rows).map(([proc, checks]) => {
            return [proc, ...checks.map(c => c ? "X" : "")];
        });
        
        let newHeaders = rawTable.headers || [];
        if (newHeaders[0] !== "Procedure") {
             newHeaders = ["Procedure", ...newHeaders];
        }
        updateNestedField(['soa_data', 'table'], { headers: newHeaders, rows: newRows });
    }
  }, [rawTable.rows]);

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
    const name = prompt("Enter Column Header Name:", `Visit ${table.headers.length}`);
    if (name) {
      const newHeaders = [...table.headers, name];
      const newRows = table.rows.map(row => [...row, ""]);
      updateNestedField(['soa_data', 'table'], { headers: newHeaders, rows: newRows });
      toast.success('Column added');
    }
  };

  const addRow = () => {
    const newRow = new Array(table.headers.length).fill("");
    const newRows = [...table.rows, newRow];
    updateNestedField(['soa_data', 'table', 'rows'], newRows);
    toast.success('Row added');
  };

  const deleteColumn = (index) => {
    if (!window.confirm("Delete this column and all its data?")) return;
    const newHeaders = table.headers.filter((_, i) => i !== index);
    const newRows = table.rows.map(row => row.filter((_, i) => i !== index));
    updateNestedField(['soa_data', 'table'], { headers: newHeaders, rows: newRows });
  };

  const deleteRow = (index) => {
    if (!window.confirm("Delete this row?")) return;
    const newRows = table.rows.filter((_, i) => i !== index);
    updateNestedField(['soa_data', 'table', 'rows'], newRows);
  };

  const generateInitialTable = () => {
    if (table.rows.length > 0 && !window.confirm("Replace current table? Data will be lost.")) return;
    const headers = ["Procedure"];
    for(let i=1; i<colCount; i++) headers.push(`Visit ${i}`);
    const rows = [];
    for(let r=0; r<rowCount; r++) rows.push(new Array(colCount).fill(""));
    updateNestedField(['soa_data', 'table'], { headers, rows });
    setShowConfig(false);
    toast.success('Grid generated');
  };

  const applyTemplate = () => {
    if (table.rows.length > 0 && !window.confirm("Apply clinical template? This will replace your current table.")) return;
    const rows = DEFAULT_PROCEDURES.map(proc => {
       const row = new Array(DEFAULT_HEADERS.length).fill("");
       row[0] = proc;
       return row;
    });
    updateNestedField(['soa_data', 'table'], { headers: DEFAULT_HEADERS, rows });
    toast.success('Clinical template applied');
  };

  const clearTable = () => {
    if (window.confirm("Clear all rows and columns?")) {
      updateNestedField(['soa_data', 'table'], { headers: ["Procedure"], rows: [] });
    }
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '40px' }}>
      
      {/* 1. OPERATIONS HUB - Consolidated Controls */}
      <section className="card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
             <Settings2 size={18} color="var(--primary-lime)" />
             <h4 style={{ fontSize: '1rem', fontWeight: 800 }}>SoA Operations Hub</h4>
           </div>
           <div style={{ display: 'flex', gap: '12px' }}>
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
      <section className="card" style={{ padding: '24px', minHeight: '400px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <TableIcon size={18} color="var(--primary-lime)" />
          <h4 style={{ fontSize: '1rem', fontWeight: 800 }}>Schedule of Activities Grid</h4>
        </div>

        {table.rows.length > 0 ? (
          <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white' }}>
              <thead>
                <tr>
                  {table.headers.map((h, i) => (
                    <th key={i} style={{ padding: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-gray)', minWidth: i === 0 ? '220px' : '120px', position: 'sticky', top: 0, zIndex: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input 
                          type="text" value={h} 
                          onChange={e => handleHeaderChange(i, e.target.value)}
                          style={{ border: 'none', background: 'transparent', fontWeight: 800, fontSize: '0.7rem', width: '100%', outline: 'none', color: i === 0 ? 'var(--primary-lime)' : 'inherit' }}
                        />
                        <button onClick={() => deleteColumn(i)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#EF4444', opacity: 0.6 }} title="Delete Column">
                          <X size={14} />
                        </button>
                      </div>
                    </th>
                  ))}
                  <th style={{ width: '50px', background: 'var(--bg-gray)', border: '1px solid var(--border-color)' }}></th>
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row, rIdx) => (
                  <tr key={rIdx}>
                    {table.headers.map((_, cIdx) => (
                      <td key={cIdx} style={{ padding: '0', border: '1px solid var(--border-color)' }}>
                        <textarea 
                          value={row[cIdx] || ''}
                          onChange={e => handleCellChange(rIdx, cIdx, e.target.value)}
                          placeholder={cIdx === 0 ? "Enter activity..." : "X"}
                          style={{ width: '100%', border: 'none', background: 'transparent', resize: 'none', fontSize: '0.85rem', padding: '12px', outline: 'none', minHeight: '52px', fontWeight: cIdx === 0 ? 600 : 400, textAlign: cIdx === 0 ? 'left' : 'center' }}
                        />
                      </td>
                    ))}
                    <td style={{ textAlign: 'center', border: '1px solid var(--border-color)' }}>
                      <button onClick={() => deleteRow(rIdx)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#EF4444', opacity: 0.6 }} title="Delete Row">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-muted)', border: '2px dashed var(--border-color)', borderRadius: '16px' }}>
            <TableIcon size={48} style={{ marginBottom: '16px', opacity: 0.2 }} />
            <h5 style={{ fontWeight: 800, color: 'var(--text-main)', marginBottom: '8px' }}>Empty Schedule</h5>
            <p style={{ fontSize: '0.9rem', marginBottom: '24px', maxWidth: '300px', margin: '0 auto 24px' }}>Get started quickly by applying the clinical template or building a custom grid from the Hub above.</p>
            <button className="btn btn-primary" onClick={applyTemplate}><FileSpreadsheet size={16} /> Apply Clinical Template</button>
          </div>
        )}
      </section>

      {/* 3. FLOWCHART IMAGE SECTION */}
      <section className="card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <ImageIcon size={18} color="var(--primary-lime)" />
          <h4 style={{ fontSize: '1rem', fontWeight: 800 }}>3. SoA Flowchart / Visual Schema</h4>
        </div>

        {soa.image?.url ? (
          <div style={{ position: 'relative' }}>
            <div style={{ background: 'var(--bg-gray)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
              <img 
                src={`${API_BASE_URL}${soa.image.url}`} 
                style={{ width: '100%', maxHeight: '500px', objectFit: 'contain', borderRadius: '12px', marginBottom: '20px' }} 
                alt="SoA Flowchart"
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px' }}>
                <div className="form-group">
                  <label>Figure Caption</label>
                  <input type="text" className="form-input" value={soa.image.caption || ''} 
                    onChange={e => updateNestedField(['soa_data', 'image', 'caption'], e.target.value)} placeholder="Figure 1.1..." />
                </div>
                <div className="form-group">
                  <label>Description / Methodology Notes</label>
                  <input type="text" className="form-input" value={soa.image.description || ''} 
                    onChange={e => updateNestedField(['soa_data', 'image', 'description'], e.target.value)} placeholder="Study design details..." />
                </div>
              </div>
            </div>
            <button onClick={() => updateNestedField(['soa_data', 'image'], null)} title="Remove Image"
              style={{ position: 'absolute', top: '-10px', right: '-10px', background: '#EF4444', color: 'white', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 12px rgba(239,68,68,0.3)' }}>
              <X size={18} />
            </button>
          </div>
        ) : (
          <div style={{ border: '2px dashed var(--border-color)', borderRadius: '14px', padding: '48px', textAlign: 'center' }}>
            <UploadCloud size={48} color="var(--text-muted)" style={{ marginBottom: '16px', opacity: 0.3 }} />
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '20px' }}>Enhance your protocol with a visual study schema</p>
            <label className="btn btn-secondary" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <Plus size={16} /> Upload Schema Image
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileUpload} />
            </label>
          </div>
        )}
      </section>

    </div>
  );
};

export default ScheduleOfActivities;
