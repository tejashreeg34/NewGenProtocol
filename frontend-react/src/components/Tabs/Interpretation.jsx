import React, { useMemo, useRef } from 'react';
import { useProtocol } from '../../context/ProtocolContext';
import { Database, FileText, Table as TableIcon, LayoutList, Image as ImageIcon, Download, FileType, Printer } from 'lucide-react';
import { motion } from 'framer-motion';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { saveAs } from 'file-saver';
import toast from 'react-hot-toast';

// ─────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────
const Interpretation = () => {
  const { data } = useProtocol();
  const contentRef = useRef(null);

  // 1. Manually construct required fields from Context Data
  const customFields = useMemo(() => {
    const list = [
      { field_name: 'Protocol Title', field_value: data.protocol_title },
      { field_name: 'Protocol Number', field_value: data.protocol_number },
      { field_name: 'Protocol Name', field_value: data.approval_data?.details?.protocol_name || data.protocol_title },
      { field_name: 'Phase', field_value: data.approval_data?.details?.clinical_phase || data.synopsis_data?.overview?.clinical_phase },
      { field_name: 'Number of Patients', field_value: data.synopsis_data?.num_patients || data.synopsis_data?.patients },
      { field_name: 'Study Endpoints - Primary', field_value: data.synopsis_data?.endpoints?.primary?.join('\n') },
      { field_name: 'Study Endpoints - Secondary', field_value: data.synopsis_data?.endpoints?.secondary?.join('\n') },
      { field_name: 'Inclusion Criteria', field_value: data.synopsis_data?.inclusion?.points?.join('\n') || data.synopsis_data?.inclusion?.text },
      { field_name: 'Exclusion Criteria', field_value: data.synopsis_data?.exclusion?.points?.join('\n') || data.synopsis_data?.exclusion?.text },
    ];
    
    // Abbreviations extraction (if entered in CustomTabulation of 10.15)
    const abbrevTable = data.sections?.['10']?.subsections?.[14]?.customTable;
    let abbrevText = '';
    if (abbrevTable && abbrevTable.rows?.length > 0) {
      abbrevText = abbrevTable.rows.map(r => `${r[0]}: ${r[1]}`).filter(x => x && x.trim() !== ': ').join('\n');
    }
    list.push({ field_name: 'Abbreviations', field_value: abbrevText });

    return list;
  }, [data]);

  // 2. Schedule of Activities — handle both array and object row formats
  const soaTable = useMemo(() => {
    const rawTable = data.soa_data?.table;
    if (!rawTable) return null;

    let headers = rawTable.headers || [];
    let rows = [];

    if (Array.isArray(rawTable.rows)) {
      rows = rawTable.rows;
    } else if (rawTable.rows && typeof rawTable.rows === 'object') {
      rows = Object.entries(rawTable.rows).map(([proc, checks]) => [proc, ...checks.map(c => c ? '1' : '0')]);
      if (headers.length > 0 && headers[0] !== 'Procedure') {
        headers = ['Procedure', ...headers];
      }
    }

    // Filter out completely empty rows
    const filteredRows = rows.filter(row => {
      const name = row[0];
      const hasAnyCheck = row.slice(1).some(v => v === '1' || v === 'X' || v === 'x' || v === true);
      return (name && name.trim() !== '') || hasAnyCheck;
    });

    if (headers.length === 0 || filteredRows.length === 0) return null;

    return { headers, rows: filteredRows };
  }, [data.soa_data]);

  // 3. Extract Tables (Images with Captions AND Custom Tabulations)
  const extractedTables = useMemo(() => {
    const tables = [];
    
    const imgRegex = /<img\s+src="([^"]+)"\s+alt="([^"]+)"/g;
    const parseContent = (html, sectionTitle) => {
      if (!html) return;
      let match;
      while ((match = imgRegex.exec(html)) !== null) {
        if (match[2] && match[2].trim() !== '') {
          tables.push({ type: 'image', url: match[1], caption: match[2], sectionTitle });
        }
      }
    };

    Object.keys(data.sections || {}).forEach(secId => {
      const sec = data.sections[secId];
      if (sec.main) parseContent(sec.main, sec.title);
      
      if (sec.subsections) {
        sec.subsections.forEach(sub => {
          if (sub.content) parseContent(sub.content, `${sec.title} > ${sub.title}`);
          
          if (sub.customTable) {
             tables.push({
                type: 'table',
                caption: `${sec.title} > ${sub.title} Table`,
                sectionTitle: `${sec.title} > ${sub.title}`,
                headers: sub.customTable.headers,
                rows: sub.customTable.rows
             });
          }
        });
      }
    });

    return tables;
  }, [data.sections]);

  // ── PDF Generation ──
  const generatePDF = () => {
    const toastId = toast.loading('Generating PDF...');
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 16;
      const contentWidth = pageWidth - margin * 2;
      let y = 20;

      const checkPage = (needed) => {
        if (y + needed > doc.internal.pageSize.getHeight() - 20) {
          doc.addPage();
          y = 20;
        }
      };

      // ── Title ──
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.setTextColor(30, 86, 50);
      doc.text('Final Interpretation Report', margin, y);
      y += 10;
      doc.setDrawColor(50, 205, 50);
      doc.setLineWidth(0.8);
      doc.line(margin, y, pageWidth - margin, y);
      y += 10;

      // ── Protocol Fields ──
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 30, 30);
      doc.text('Protocol Fields', margin, y);
      y += 8;

      const fieldRows = customFields.map(f => {
        let val = f.field_value || 'Not entered';
        // Truncate very long values for table cell
        if (val.length > 300) val = val.substring(0, 300) + '...';
        return [f.field_name, val];
      });

      autoTable(doc, {
        startY: y,
        head: [['Field', 'Value']],
        body: fieldRows,
        margin: { left: margin, right: margin },
        styles: { fontSize: 9, cellPadding: 4, overflow: 'linebreak', lineColor: [220, 220, 220], lineWidth: 0.3 },
        headStyles: { fillColor: [30, 86, 50], textColor: 255, fontStyle: 'bold', fontSize: 9 },
        columnStyles: { 0: { cellWidth: 50, fontStyle: 'bold' }, 1: { cellWidth: contentWidth - 50 } },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        didParseCell: (hookData) => {
          // Render bullet points for multi-line values
          if (hookData.column.index === 1 && hookData.cell.raw && hookData.cell.raw.includes('\n')) {
            const lines = hookData.cell.raw.split('\n').filter(l => l.trim());
            hookData.cell.text = lines.map((l, i) => `• ${l.trim()}`);
          }
        }
      });

      y = doc.lastAutoTable.finalY + 12;

      // ── SoA Table ──
      if (soaTable) {
        checkPage(40);
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 30, 30);
        doc.text('Schedule of Activities', margin, y);
        y += 8;

        const soaHead = soaTable.headers.map(h => h || '');
        const soaBody = soaTable.rows.map(row => {
          return soaHead.map((_, cIdx) => {
            const val = row[cIdx] || '';
            if (cIdx === 0) return val;
            return (val === '1' || val === 'X' || val === 'x' || val === true) ? '✓' : '—';
          });
        });

        autoTable(doc, {
          startY: y,
          head: [soaHead],
          body: soaBody,
          margin: { left: margin, right: margin },
          styles: { fontSize: 7, cellPadding: 2.5, halign: 'center', overflow: 'linebreak', lineColor: [220, 220, 220], lineWidth: 0.3 },
          headStyles: { fillColor: [30, 86, 50], textColor: 255, fontStyle: 'bold', fontSize: 7 },
          columnStyles: { 0: { halign: 'left', cellWidth: 40, fontStyle: 'bold' } },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          didParseCell: (hookData) => {
            if (hookData.section === 'body' && hookData.column.index > 0) {
              if (hookData.cell.raw === '✓') {
                hookData.cell.styles.textColor = [34, 197, 94];
                hookData.cell.styles.fontStyle = 'bold';
              } else {
                hookData.cell.styles.textColor = [180, 180, 180];
              }
            }
          }
        });
        y = doc.lastAutoTable.finalY + 12;
      }

      // ── Extracted Custom Tables ──
      const tableTables = extractedTables.filter(t => t.type === 'table');
      if (tableTables.length > 0) {
        tableTables.forEach(tbl => {
          checkPage(30);
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(30, 30, 30);
          doc.text(tbl.caption || 'Custom Table', margin, y);
          y += 6;

          autoTable(doc, {
            startY: y,
            head: [tbl.headers],
            body: tbl.rows,
            margin: { left: margin, right: margin },
            styles: { fontSize: 8, cellPadding: 3, overflow: 'linebreak', lineColor: [220, 220, 220], lineWidth: 0.3 },
            headStyles: { fillColor: [49, 130, 206], textColor: 255, fontStyle: 'bold', fontSize: 8 },
            alternateRowStyles: { fillColor: [248, 250, 252] },
          });
          y = doc.lastAutoTable.finalY + 10;
        });
      }

      // ── Footer ──
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 8, { align: 'center' });
        doc.text('GenProtocol — Final Interpretation', margin, doc.internal.pageSize.getHeight() - 8);
      }

      doc.save('Interpretation_Report.pdf');
      toast.success('PDF downloaded successfully', { id: toastId });
    } catch (err) {
      console.error('PDF generation error:', err);
      toast.error('Failed to generate PDF', { id: toastId });
    }
  };

  // ── Word (DOCX as HTML) Generation ──
  const generateWord = () => {
    const toastId = toast.loading('Generating Word document...');
    try {
      let html = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
        <head><meta charset="utf-8"><title>Interpretation Report</title>
        <style>
          body { font-family: Calibri, Arial, sans-serif; color: #1a1a1a; margin: 40px; line-height: 1.6; }
          h1 { color: #1E5632; font-size: 24pt; border-bottom: 3px solid #32CD32; padding-bottom: 8px; margin-bottom: 20px; }
          h2 { color: #1E5632; font-size: 16pt; margin-top: 28px; margin-bottom: 12px; border-bottom: 1px solid #E2E8F0; padding-bottom: 6px; }
          h3 { color: #333; font-size: 13pt; margin-top: 20px; margin-bottom: 8px; }
          table { border-collapse: collapse; width: 100%; margin: 10px 0 20px 0; font-size: 10pt; }
          th { background-color: #1E5632; color: white; padding: 8px 10px; text-align: left; font-weight: bold; border: 1px solid #ccc; }
          td { padding: 6px 10px; border: 1px solid #ddd; vertical-align: top; }
          tr:nth-child(even) td { background-color: #F8FAFC; }
          .field-name { font-weight: bold; width: 200px; background-color: #F1F5F9; color: #475569; text-transform: uppercase; font-size: 9pt; letter-spacing: 0.5px; }
          .check { color: #22C55E; font-weight: bold; text-align: center; }
          .dash { color: #CBD5E1; text-align: center; }
          ul { margin: 4px 0; padding-left: 20px; }
          li { margin-bottom: 3px; }
          .footer { font-size: 8pt; color: #999; margin-top: 40px; border-top: 1px solid #E2E8F0; padding-top: 8px; text-align: center; }
        </style></head><body>`;

      html += '<h1>Final Interpretation Report</h1>';

      // Protocol Fields
      html += '<h2>Protocol Fields</h2>';
      html += '<table>';
      html += '<tr><th>Field</th><th>Value</th></tr>';
      customFields.forEach(f => {
        let val = f.field_value || '<em style="color:#94A3B8">Not entered</em>';
        // Convert newline-separated values to bullet list
        if (val.includes('\n')) {
          const points = val.split('\n').filter(l => l.trim());
          val = '<ul>' + points.map(p => `<li>${p.trim()}</li>`).join('') + '</ul>';
        }
        html += `<tr><td class="field-name">${f.field_name}</td><td>${val}</td></tr>`;
      });
      html += '</table>';

      // SoA Table
      if (soaTable) {
        html += '<h2>Schedule of Activities</h2>';
        html += '<table>';
        html += '<tr>';
        soaTable.headers.forEach(h => { html += `<th>${h || ''}</th>`; });
        html += '</tr>';
        soaTable.rows.forEach(row => {
          html += '<tr>';
          soaTable.headers.forEach((_, cIdx) => {
            const val = row[cIdx] || '';
            if (cIdx === 0) {
              html += `<td style="font-weight:bold">${val}</td>`;
            } else {
              const isChecked = val === '1' || val === 'X' || val === 'x' || val === true;
              html += `<td class="${isChecked ? 'check' : 'dash'}">${isChecked ? '✓' : '—'}</td>`;
            }
          });
          html += '</tr>';
        });
        html += '</table>';
      }

      // Extracted Custom Tables
      const tableTables = extractedTables.filter(t => t.type === 'table');
      if (tableTables.length > 0) {
        html += '<h2>Detected Tables & Attachments</h2>';
        tableTables.forEach(tbl => {
          html += `<h3>${tbl.caption || 'Custom Table'}</h3>`;
          html += '<table>';
          html += '<tr>' + tbl.headers.map(h => `<th>${h}</th>`).join('') + '</tr>';
          tbl.rows.forEach(row => {
            html += '<tr>' + row.map(cell => `<td>${cell || ''}</td>`).join('') + '</tr>';
          });
          html += '</table>';
        });
      }

      html += '<div class="footer">Generated by GenProtocol — Final Interpretation Report</div>';
      html += '</body></html>';

      const blob = new Blob(['\ufeff' + html], { type: 'application/msword' });
      saveAs(blob, 'Interpretation_Report.doc');
      toast.success('Word document downloaded successfully', { id: toastId });
    } catch (err) {
      console.error('Word generation error:', err);
      toast.error('Failed to generate Word document', { id: toastId });
    }
  };

  return (
    <div className="fade-in" style={{ paddingBottom: '40px', maxWidth: '1000px', margin: '0 auto' }} ref={contentRef}>
      
      {/* Header */}
      <div style={{ marginBottom: '40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span style={{ color: 'var(--primary-lime)', fontWeight: 800, fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase' }}>EXTRACTED DATA</span>
        </div>
        <h2 style={{ fontSize: '2.4rem', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>Final Interpretation</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '1rem', marginTop: '4px' }}>A consolidated view of all critical fields, generated tables, and attached references.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

        {/* 1. Protocol Standard Fields */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border-color)' }}>
          <div style={{ padding: '20px 32px', background: 'var(--bg-gray)', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '12px' }}>
             <LayoutList size={20} color="var(--primary-lime)" />
             <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)' }}>Protocol Fields</h3>
          </div>
          <div style={{ padding: '0' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {customFields.length === 0 ? (
                  <tr>
                    <td style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>No standard fields populated yet.</td>
                  </tr>
                ) : customFields.map((f, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                    <td style={{ padding: '20px 32px', width: '30%', verticalAlign: 'top', background: '#F8FAFC', borderRight: '1px solid rgba(0,0,0,0.05)' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{f.field_name}</span>
                    </td>
                    <td style={{ padding: '20px 32px', verticalAlign: 'top' }}>
                      <div style={{ fontSize: '1rem', color: 'var(--text-main)', lineHeight: '1.6' }}>
                        {f.field_value ? (
                          f.field_value.includes('\n') ? (
                            <ul style={{ margin: 0, paddingLeft: '20px' }}>
                              {f.field_value.split('\n').filter(l => l.trim()).map((line, i) => (
                                <li key={i} style={{ marginBottom: '4px' }}>{line.trim()}</li>
                              ))}
                            </ul>
                          ) : (
                            <span style={{ whiteSpace: 'pre-wrap' }}>{f.field_value}</span>
                          )
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.85rem' }}>No data entered yet.</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 2. Schedule of Activities Table */}
        {soaTable && (
          <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border-color)' }}>
            <div style={{ padding: '20px 32px', background: 'var(--bg-gray)', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '12px' }}>
               <TableIcon size={20} color="#3182CE" />
               <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)' }}>Schedule of Activities</h3>
               <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#3182CE', background: '#EBF8FF', padding: '3px 10px', borderRadius: '8px', fontWeight: 700 }}>
                 {soaTable.rows.length} procedures × {Math.max(0, soaTable.headers.length - 1)} visits
               </span>
            </div>
            <div style={{ padding: '24px 32px', overflowX: 'auto' }}>
              <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                <thead>
                  <tr>
                    {soaTable.headers.map((h, i) => (
                      <th key={i} style={{
                        padding: '10px 12px',
                        background: i === 0 ? '#F8FAFC' : '#EBF8FF',
                        border: '1px solid var(--border-color)',
                        textAlign: i === 0 ? 'left' : 'center',
                        minWidth: i === 0 ? '200px' : '80px',
                        fontSize: i === 0 ? '0.85rem' : '0.78rem',
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                        color: i === 0 ? 'var(--text-main)' : '#2B6CB0',
                      }}>
                        {i === 0 ? (h || 'Assessment / Procedure') : h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {soaTable.rows.map((row, rIdx) => {
                    const rowName = row[0] || '';
                    return (
                      <tr key={rIdx} style={{ background: rIdx % 2 === 0 ? 'white' : '#FAFAFA' }}>
                        {soaTable.headers.map((_, cIdx) => {
                          if (cIdx === 0) {
                            return (
                              <td key={cIdx} style={{
                                padding: '10px 12px',
                                border: '1px solid var(--border-color)',
                                fontSize: '0.88rem',
                                fontWeight: 600,
                                color: 'var(--text-main)'
                              }}>
                                {row[cIdx] || ''}
                              </td>
                            );
                          }
                          const val = row[cIdx] || '';
                          const isChecked = val === '1' || val === 'X' || val === 'x' || val === true;
                          return (
                            <td key={cIdx} style={{
                              padding: '10px 12px',
                              border: '1px solid var(--border-color)',
                              textAlign: 'center',
                              fontWeight: 'bold',
                              fontSize: '1rem',
                              color: isChecked ? '#22C55E' : 'transparent',
                              background: isChecked ? '#F0FDF4' : 'inherit',
                            }}>
                              {isChecked ? '✓' : '—'}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. Uploaded Images & Custom Tables */}
        {extractedTables.length > 0 && (
          <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border-color)' }}>
            <div style={{ padding: '20px 32px', background: 'var(--bg-gray)', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '12px' }}>
               <ImageIcon size={20} color="#F6AD55" />
               <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)' }}>Detected Tables & Attachments</h3>
            </div>
            <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '40px' }}>
              {extractedTables.map((tbl, idx) => (
                <div key={idx} style={{ background: 'white', border: '1px solid var(--border-color)', borderRadius: '16px', overflow: 'hidden' }}>
                  <div style={{ padding: '16px 24px', background: 'var(--bg-gray)', borderBottom: '1px solid var(--border-color)' }}>
                    <h4 style={{ margin: 0, fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)' }}>{tbl.caption}</h4>
                    {tbl.sectionTitle && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Section: {tbl.sectionTitle}</div>}
                  </div>
                  <div style={{ padding: '24px', overflowX: 'auto' }}>
                    {tbl.type === 'image' ? (
                       <div style={{ textAlign: 'center' }}>
                         <img src={tbl.url} alt={tbl.caption} style={{ maxWidth: '100%', maxHeight: '500px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} />
                       </div>
                    ) : (
                       <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                         <thead>
                           <tr>
                             {tbl.headers.map((h, hIdx) => (
                               <th key={hIdx} style={{ padding: '12px', background: '#F8FAFC', border: '1px solid var(--border-color)', textAlign: 'left', fontSize: '0.85rem' }}>{h}</th>
                             ))}
                           </tr>
                         </thead>
                         <tbody>
                           {tbl.rows.map((rowItems, rIdx) => (
                             <tr key={rIdx}>
                               {rowItems.map((cell, cIdx) => (
                                 <td key={cIdx} style={{ padding: '12px', border: '1px solid var(--border-color)', fontSize: '0.9rem' }}>{cell}</td>
                               ))}
                             </tr>
                           ))}
                         </tbody>
                       </table>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Generate PDF / Word Buttons ── */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          style={{ 
            background: 'linear-gradient(135deg, #064E3B 0%, #065F46 100%)', 
            borderRadius: '24px', 
            padding: '40px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            gap: '32px',
            flexWrap: 'wrap',
            boxShadow: '0 12px 40px rgba(6, 78, 59, 0.25)'
          }}
        >
          <div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '6px' }}>
              EXPORT INTERPRETATION
            </div>
            <h3 style={{ color: 'white', fontSize: '1.4rem', fontWeight: 900, marginBottom: '6px' }}>
              Download Report
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.9rem', maxWidth: '440px', lineHeight: 1.5 }}>
              Export the interpretation data with properly formatted tables, bullet points, and aligned content.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <motion.button
              whileHover={{ scale: 1.04, boxShadow: '0 8px 24px rgba(239, 68, 68, 0.3)' }}
              whileTap={{ scale: 0.96 }}
              onClick={generatePDF}
              style={{
                background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '16px',
                padding: '16px 32px',
                fontSize: '1rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                boxShadow: '0 4px 16px rgba(185, 28, 28, 0.3)',
                transition: 'all 0.2s ease'
              }}
            >
              <Download size={20} />
              Generate PDF
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.04, boxShadow: '0 8px 24px rgba(37, 99, 235, 0.3)' }}
              whileTap={{ scale: 0.96 }}
              onClick={generateWord}
              style={{
                background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '16px',
                padding: '16px 32px',
                fontSize: '1rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                boxShadow: '0 4px 16px rgba(29, 78, 216, 0.3)',
                transition: 'all 0.2s ease'
              }}
            >
              <FileType size={20} />
              Generate Word
            </motion.button>
          </div>
        </motion.div>
        
      </div>
    </div>
  );
};

export default Interpretation;
