import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, FileText, CheckCircle2, XCircle, AlertCircle,
  Loader2, ChevronRight, FileCheck2, Table as TableIcon,
  Image as ImageIcon, Zap, ClipboardList, BarChart2,
  RefreshCw, ArrowRight, X
} from 'lucide-react';
import { useProtocol } from '../../context/ProtocolContext';
import toast from 'react-hot-toast';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

const PARSE_STEPS = [
  { id: 'upload',    label: 'Uploading document',                        icon: Upload },
  { id: 'structure', label: 'Extracting sections & subsections',         icon: FileText },
  { id: 'metadata',  label: 'Groq AI — reading metadata & cover page',   icon: Zap },
  { id: 'synopsis',  label: 'Groq AI — extracting synopsis & criteria',  icon: BarChart2 },
  { id: 'soa',       label: 'Groq AI — interpreting SoA table',          icon: TableIcon },
  { id: 'done',      label: 'Ready to apply to protocol',                icon: CheckCircle2 },
];

const FIELD_LABELS = {
  protocol_title:        { label: 'Protocol Title',         section: 'Title Page' },
  protocol_number:       { label: 'Protocol Number',        section: 'Title Page' },
  nct_number:            { label: 'NCT Number',             section: 'Title Page' },
  principal_investigator:{ label: 'Principal Investigator', section: 'Title Page' },
  sponsor:               { label: 'Sponsor',                section: 'Title Page' },
  funded_by:             { label: 'Funded By',              section: 'Title Page' },
  version_number:        { label: 'Version',                section: 'Title Page' },
};

export default function ImportDocument() {
  const { data: contextData, setData, setActiveTab } = useProtocol();

  const [dragOver, setDragOver]         = useState(false);
  const [file, setFile]                 = useState(null);
  const [status, setStatus]             = useState('idle'); // idle | parsing | preview | done
  const [currentStep, setCurrentStep]   = useState(-1);
  const [parsedResult, setParsedResult] = useState(null);
  const [error, setError]               = useState(null);

  const inputRef = useRef(null);

  // ── Drag & Drop ──
  const onDragOver = useCallback(e => { e.preventDefault(); setDragOver(true); }, []);
  const onDragLeave = useCallback(() => setDragOver(false), []);
  const onDrop = useCallback(e => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFileSelect(dropped);
  }, []);

  const handleFileSelect = (f) => {
    const ext = f.name.split('.').pop().toLowerCase();
    if (!['docx', 'doc', 'pdf'].includes(ext)) {
      toast.error('Only .docx, .doc, and .pdf files are supported');
      return;
    }
    setFile(f);
    setError(null);
    setParsedResult(null);
    setStatus('idle');
    setCurrentStep(-1);
  };

  // ── Upload & Parse ──
  const handleParse = async () => {
    if (!file) return;
    setStatus('parsing');
    setError(null);
    setCurrentStep(0);

    const stepDelay = ms => new Promise(r => setTimeout(r, ms));

    try {
      await stepDelay(400);  setCurrentStep(1);
      await stepDelay(500);  setCurrentStep(2);

      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post(`${API_BASE_URL}/api/parse-protocol-document`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000,
      });

      setCurrentStep(3);
      await stepDelay(600);
      setCurrentStep(4);
      await stepDelay(600);
      setCurrentStep(5);
      await stepDelay(300);

      setParsedResult(response.data);
      setStatus('preview');
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Parsing failed';
      setError(msg);
      setStatus('error');
    }
  };

  // ── Apply to Protocol ──
  const handleApply = () => {
    if (!parsedResult?.data) return;
    const parsed = parsedResult.data;

    setData(prev => ({
      ...prev,
      ...parsed,
      sections: {
        ...prev.sections,
        ...parsed.sections,
      },
    }));

    toast.success('Protocol populated from document');
    setActiveTab('title-page');
  };

  const reset = () => {
    setFile(null);
    setParsedResult(null);
    setStatus('idle');
    setCurrentStep(-1);
    setError(null);
  };

  return (
    <div className="fade-in" style={{ paddingBottom: '60px', maxWidth: '900px', margin: '0 auto' }}>

      {/* ── Page Header ── */}
      <div style={{ marginBottom: '40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span style={{ color: 'var(--primary-lime)', fontWeight: 800, fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
            AI-ASSISTED IMPORT
          </span>
          <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--border-color)' }} />
          <span style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.7rem' }}>DOCX · PDF</span>
        </div>
        <h2 style={{ fontSize: '2.2rem', fontWeight: 900, letterSpacing: '-0.02em', marginBottom: '6px' }}>
          Import Protocol Document
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          Upload an existing protocol document and we'll automatically extract and populate all fields — including the Schedule of Activities.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* ── Upload Zone ── */}
        <AnimatePresence mode="wait">
          {status !== 'preview' && (
            <motion.div
              key="upload-zone"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
            >
              <div
                className="card"
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onClick={() => !file && inputRef.current?.click()}
                style={{
                  padding: '56px 40px',
                  textAlign: 'center',
                  border: dragOver
                    ? '2px dashed var(--primary-lime)'
                    : file
                    ? '2px solid var(--primary-lime)'
                    : '2px dashed rgba(0,0,0,0.12)',
                  background: dragOver
                    ? 'rgba(50, 205, 50, 0.04)'
                    : file
                    ? 'rgba(50, 205, 50, 0.03)'
                    : 'white',
                  cursor: file ? 'default' : 'pointer',
                  transition: 'all 0.25s ease',
                  position: 'relative',
                }}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept=".docx,.doc,.pdf"
                  style={{ display: 'none' }}
                  onChange={e => e.target.files[0] && handleFileSelect(e.target.files[0])}
                />

                {!file ? (
                  <>
                    <motion.div
                      animate={{ y: dragOver ? -6 : 0 }}
                      style={{
                        width: '72px', height: '72px',
                        borderRadius: '20px',
                        background: 'var(--lime-gradient)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 20px',
                        boxShadow: '0 8px 24px rgba(50,205,50,0.25)',
                      }}
                    >
                      <Upload size={32} color="white" />
                    </motion.div>
                    <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '8px' }}>
                      {dragOver ? 'Drop to import' : 'Drop your protocol document here'}
                    </h3>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
                      or click to browse your files
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
                      {['DOCX', 'DOC', 'PDF'].map(fmt => (
                        <span key={fmt} style={{
                          padding: '6px 14px',
                          background: 'var(--bg-gray)',
                          borderRadius: '20px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          color: 'var(--text-muted)',
                        }}>{fmt}</span>
                      ))}
                    </div>
                  </>
                ) : (
                  <div>
                    <div style={{
                      width: '60px', height: '60px', borderRadius: '16px',
                      background: 'var(--light-lime)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      margin: '0 auto 16px',
                    }}>
                      <FileCheck2 size={28} color="var(--dark-lime)" />
                    </div>
                    <div style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '4px' }}>{file.name}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '20px' }}>
                      {(file.size / 1024).toFixed(1)} KB
                    </div>
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                      <button
                        className="btn btn-secondary"
                        onClick={e => { e.stopPropagation(); reset(); }}
                        style={{ fontSize: '0.85rem' }}
                      >
                        <X size={15} /> Remove
                      </button>
                      <button
                        className="btn btn-primary"
                        onClick={e => { e.stopPropagation(); handleParse(); }}
                        disabled={status === 'parsing'}
                        style={{ fontSize: '0.85rem', minWidth: '160px' }}
                      >
                        {status === 'parsing'
                          ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Parsing...</>
                          : <><Zap size={15} /> Parse Document</>
                        }
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Parsing Steps ── */}
              <AnimatePresence>
                {status === 'parsing' && (
                  <motion.div
                    className="card"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{ overflow: 'hidden', padding: '28px 32px' }}
                  >
                    <p style={{ fontWeight: 800, fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '20px' }}>
                      Parsing Progress
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {PARSE_STEPS.map((step, idx) => {
                        const done = currentStep > idx;
                        const active = currentStep === idx;
                        const Icon = step.icon;
                        return (
                          <motion.div
                            key={step.id}
                            initial={{ opacity: 0.3 }}
                            animate={{ opacity: done || active ? 1 : 0.35 }}
                            style={{ display: 'flex', alignItems: 'center', gap: '14px' }}
                          >
                            <div style={{
                              width: '32px', height: '32px', borderRadius: '10px', flexShrink: 0,
                              background: done ? 'var(--dark-lime)' : active ? 'var(--primary-lime)' : 'var(--bg-gray)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              transition: 'background 0.3s ease',
                            }}>
                              {active
                                ? <Loader2 size={14} color="white" style={{ animation: 'spin 1s linear infinite' }} />
                                : <Icon size={14} color={done || active ? 'white' : 'var(--text-muted)'} />
                              }
                            </div>
                            <span style={{
                              fontSize: '0.9rem', fontWeight: active ? 700 : 500,
                              color: done ? 'var(--dark-lime)' : active ? 'var(--text-main)' : 'var(--text-muted)',
                            }}>
                              {step.label}
                            </span>
                            {done && <CheckCircle2 size={14} color="var(--dark-lime)" style={{ marginLeft: 'auto' }} />}
                          </motion.div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Error State ── */}
              {status === 'error' && error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="card"
                  style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.2)', padding: '20px 24px' }}
                >
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <XCircle size={20} color="#EF4444" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <div style={{ fontWeight: 700, color: '#EF4444', marginBottom: '4px' }}>Parsing Failed</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{error}</div>
                    </div>
                    <button className="btn btn-secondary" onClick={reset} style={{ marginLeft: 'auto', fontSize: '0.8rem' }}>
                      <RefreshCw size={13} /> Try Again
                    </button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Preview Panel ── */}
        <AnimatePresence>
          {status === 'preview' && parsedResult && (
            <motion.div
              key="preview"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
            >
              {/* Stats bar */}
              <div className="card" style={{
                padding: '20px 28px',
                background: 'linear-gradient(135deg, #064E3B 0%, #065F46 100%)',
                border: 'none',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                  <div>
                    <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>
                      {parsedResult.filename}
                    </div>
                    <div style={{ color: 'white', fontSize: '1.2rem', fontWeight: 800 }}>
                      Document parsed successfully
                    </div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '6px', background: 'rgba(50,205,50,0.25)', borderRadius: '20px', padding: '3px 12px' }}>
                      <Zap size={11} color="var(--primary-lime)" />
                      <span style={{ color: 'var(--primary-lime)', fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.08em' }}>POWERED BY GROQ AI</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '24px' }}>
                    {[
                      { label: 'Fields',    value: parsedResult.stats?.fields_extracted ?? '—' },
                      { label: 'Sections',  value: parsedResult.stats?.sections_found ?? '—' },
                      { label: 'SoA Rows',  value: parsedResult.stats?.soa_rows ?? '—' },
                    ].map(s => (
                      <div key={s.label} style={{ textAlign: 'center' }}>
                        <div style={{ color: 'var(--primary-lime)', fontSize: '1.6rem', fontWeight: 900 }}>{s.value}</div>
                        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Extracted Fields Preview */}
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '16px 28px', background: 'var(--bg-gray)', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <ClipboardList size={18} color="var(--primary-lime)" />
                  <span style={{ fontWeight: 800, fontSize: '1rem' }}>Extracted Fields</span>
                  <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-muted)' }}>All fields will populate after you apply</span>
                </div>
                <div>
                  {Object.entries(FIELD_LABELS).map(([key, meta], idx) => {
                    const val = parsedResult.data?.[key];
                    const found = val && val.trim() !== '';
                    return (
                      <div key={key} style={{
                        display: 'flex', alignItems: 'center', gap: '16px',
                        padding: '14px 28px',
                        borderBottom: idx < Object.keys(FIELD_LABELS).length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none',
                        background: idx % 2 === 0 ? 'white' : '#FAFBFC',
                      }}>
                        <div style={{
                          width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
                          background: found ? 'var(--primary-lime)' : 'var(--border-color)',
                        }} />
                        <div style={{ width: '200px', flexShrink: 0 }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            {meta.label}
                          </div>
                        </div>
                        <div style={{ flex: 1, fontSize: '0.9rem', color: found ? 'var(--text-main)' : 'var(--text-muted)', fontStyle: found ? 'normal' : 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {found ? val : 'Not found in document'}
                        </div>
                        {found
                          ? <CheckCircle2 size={15} color="var(--dark-lime)" style={{ flexShrink: 0 }} />
                          : <AlertCircle size={15} color="var(--text-muted)" style={{ flexShrink: 0, opacity: 0.5 }} />
                        }
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* More extracted info */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                {/* Sections found */}
                <div className="card" style={{ padding: '20px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                    <FileText size={16} color="var(--primary-lime)" />
                    <span style={{ fontWeight: 800 }}>Protocol Sections</span>
                    <span style={{ marginLeft: 'auto', background: 'var(--light-lime)', color: 'var(--dark-lime)', borderRadius: '20px', padding: '2px 10px', fontSize: '0.75rem', fontWeight: 800 }}>
                      {Object.keys(parsedResult.data?.sections || {}).length} found
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {Object.entries(parsedResult.data?.sections || {}).slice(0, 8).map(([id, sec]) => (
                      <div key={id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--dark-lime)', background: 'var(--light-lime)', borderRadius: '6px', padding: '1px 7px', flexShrink: 0 }}>{id}</span>
                        <span style={{ fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>{sec.title}</span>
                      </div>
                    ))}
                    {Object.keys(parsedResult.data?.sections || {}).length > 8 && (
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        + {Object.keys(parsedResult.data.sections).length - 8} more
                      </div>
                    )}
                  </div>
                </div>

                {/* SoA summary */}
                <div className="card" style={{ padding: '20px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                    <TableIcon size={16} color="var(--primary-lime)" />
                    <span style={{ fontWeight: 800 }}>Schedule of Activities</span>
                  </div>
                  {parsedResult.stats?.soa_rows > 0 ? (
                    <>
                      <div style={{ display: 'flex', gap: '16px', marginBottom: '10px' }}>
                        <div style={{ textAlign: 'center', flex: 1 }}>
                          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--dark-lime)' }}>{parsedResult.stats.soa_rows}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Procedures</div>
                        </div>
                        <div style={{ textAlign: 'center', flex: 1 }}>
                          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--dark-lime)' }}>
                            {(parsedResult.data?.soa_data?.table?.headers?.length || 1) - 1}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Visits/Columns</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--dark-lime)', fontSize: '0.82rem', fontWeight: 600 }}>
                        <CheckCircle2 size={14} /> Grid table detected and imported
                      </div>
                    </>
                  ) : parsedResult.stats?.soa_image ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <ImageIcon size={20} color="var(--text-muted)" />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>SoA image detected</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Stored as image in SoA section</div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>
                      No SoA table detected in document
                    </div>
                  )}
                </div>
              </div>

              {/* Inclusion / Exclusion preview */}
              {(parsedResult.data?.synopsis_data?.inclusion?.points?.length > 0 ||
                parsedResult.data?.synopsis_data?.exclusion?.points?.length > 0) && (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={{ padding: '16px 28px', background: 'var(--bg-gray)', borderBottom: '1px solid var(--border-color)', fontWeight: 800, fontSize: '1rem' }}>
                    Eligibility Criteria
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0' }}>
                    {['inclusion', 'exclusion'].map(type => {
                      const items = parsedResult.data.synopsis_data[type]?.points || [];
                      return (
                        <div key={type} style={{ padding: '20px 24px', borderRight: type === 'inclusion' ? '1px solid var(--border-color)' : 'none' }}>
                          <div style={{ fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: type === 'inclusion' ? 'var(--dark-lime)' : '#EF4444', marginBottom: '12px' }}>
                            {type} criteria ({items.length})
                          </div>
                          {items.length > 0 ? items.slice(0, 5).map((pt, i) => (
                            <div key={i} style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '6px', display: 'flex', gap: '8px' }}>
                              <span style={{ flexShrink: 0, color: type === 'inclusion' ? 'var(--primary-lime)' : '#EF4444', fontWeight: 800 }}>•</span>
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pt}</span>
                            </div>
                          )) : (
                            <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.82rem' }}>Not found</div>
                          )}
                          {items.length > 5 && <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '4px' }}>+ {items.length - 5} more</div>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', padding: '8px 0' }}>
                <button className="btn btn-secondary" onClick={reset}>
                  <RefreshCw size={15} /> Import Different File
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleApply}
                  style={{ padding: '12px 28px', fontSize: '0.95rem' }}
                >
                  Apply to Protocol <ArrowRight size={16} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── How It Works ── */}
        {status === 'idle' && !file && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
            <div className="card" style={{ padding: '24px 28px', background: 'rgba(50,205,50,0.03)', border: '1px solid rgba(50,205,50,0.12)' }}>
              <div style={{ fontWeight: 800, fontSize: '0.8rem', color: 'var(--dark-lime)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '16px' }}>
                What gets extracted automatically
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                {[
                  { icon: ClipboardList, title: 'Title Page Fields', desc: 'Protocol title, number, NCT#, version, sponsor, PI' },
                  { icon: FileText, title: 'Synopsis & Criteria', desc: 'Objectives, endpoints, inclusion & exclusion criteria' },
                  { icon: TableIcon, title: 'Schedule of Activities', desc: 'Grid tables AND image-based SoA tables from document' },
                  { icon: BarChart2, title: 'Protocol Sections', desc: 'All numbered sections (1–11) with their full text content' },
                  { icon: CheckCircle2, title: 'Approval Details', desc: 'IMP, indication, clinical phase, IRB, sponsor address' },
                  { icon: Zap, title: 'Instant Population', desc: 'One click fills every tab — no manual re-entry required' },
                ].map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--light-lime)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon size={16} color="var(--dark-lime)" />
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '2px' }}>{item.title}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{item.desc}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
