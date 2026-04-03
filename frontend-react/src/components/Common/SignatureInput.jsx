import React, { useRef, useState, useEffect } from 'react';
import { UploadCloud, Eraser, PenTool } from 'lucide-react';

const SignatureInput = ({ value, onChange, label }) => {
  const [mode, setMode] = useState('draw'); // 'draw' or 'upload'
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    if (mode === 'draw' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
    }
  }, [mode]);

  const startDrawing = (e) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    onChange(canvas.toDataURL('image/png'));
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    onChange(null);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        onChange(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="form-group" style={{ marginBottom: 0 }}>
      {label && <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.65rem', letterSpacing: '0.05em', fontWeight: 800 }}>{label}</label>}
      <div style={{ 
        border: '1px solid var(--border-color)', 
        borderRadius: '20px', 
        padding: '20px', 
        background: 'var(--bg-gray)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button 
            type="button"
            className={`btn small ${mode === 'draw' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '7px 14px', borderRadius: '10px', fontSize: '0.75rem', flexShrink: 0 }}
            onClick={() => setMode('draw')}
          >
            <PenTool size={13} /> Draw
          </button>
          <button 
            type="button"
            className={`btn small ${mode === 'upload' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '7px 14px', borderRadius: '10px', fontSize: '0.75rem', flexShrink: 0 }}
            onClick={() => setMode('upload')}
          >
            <UploadCloud size={13} /> Upload
          </button>
          <button 
            type="button"
            className="btn small btn-secondary" 
            disabled={!value}
            style={{ 
                marginLeft: 'auto',
                color: value ? '#EF4444' : '#94A3B8', 
                padding: '7px 14px', 
                borderRadius: '10px', 
                fontSize: '0.75rem',
                opacity: value ? 1 : 0.4,
                cursor: value ? 'pointer' : 'not-allowed',
                flexShrink: 0
            }} 
            onClick={() => mode === 'draw' ? (clearCanvas()) : onChange(null)}
          >
            <Eraser size={13} /> Clear
          </button>
        </div>

        {mode === 'draw' ? (
          <canvas
            ref={canvasRef}
            width={500}
            height={140}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseOut={stopDrawing}
            style={{ 
              background: 'white', 
              borderRadius: '14px', 
              cursor: 'crosshair',
              width: '100%',
              height: '140px',
              border: '1px solid var(--border-color)',
              touchAction: 'none'
            }}
          />
        ) : (
          <div style={{ 
            height: '140px', 
            background: 'white', 
            borderRadius: '14px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            border: '1px solid var(--border-color)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {value ? (
              <img src={value} alt="Signature" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain', padding: '10px' }} />
            ) : (
              <label style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '20px', width: '100%' }}>
                <UploadCloud size={32} color="var(--text-muted)" style={{ opacity: 0.4 }} />
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Click to upload signature image (PNG/JPG)</span>
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileUpload} />
              </label>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SignatureInput;
