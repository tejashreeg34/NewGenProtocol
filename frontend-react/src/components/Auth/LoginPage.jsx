import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Lock, ArrowRight, ShieldCheck } from 'lucide-react';
import { useProtocol } from '../../context/ProtocolContext';
import { toast } from 'react-hot-toast';

const LoginPage = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useProtocol();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!username || !password) return;
        
        setIsLoading(true);
        try {
            await login(username, password);
        } catch (err) {
            toast.error('Connection failed');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{
            height: '100vh',
            width: '100vw',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: `
                radial-gradient(at 0% 0%, rgba(50, 205, 50, 0.1) 0, transparent 40%),
                radial-gradient(at 100% 0%, rgba(30, 132, 73, 0.08) 0, transparent 40%),
                radial-gradient(at 50% 50%, rgba(50, 205, 50, 0.05) 0, transparent 50%),
                #E9EDEC
            `,
            fontFamily: 'Inter, sans-serif',
            overflow: 'hidden',
            position: 'relative'
        }}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                style={{
                    width: '100%',
                    maxWidth: '420px',
                    padding: '48px',
                    borderRadius: '24px',
                    background: 'white',
                    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.6)',
                    zIndex: 1,
                    position: 'relative'
                }}
            >
                {/* Logo / Header */}
                <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 }}
                        style={{
                            width: '56px',
                            height: '56px',
                            background: 'linear-gradient(135deg, #32CD32 0%, #1E8449 100%)',
                            borderRadius: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 20px',
                            boxShadow: '0 8px 16px rgba(50, 205, 50, 0.2)',
                            color: 'white'
                        }}
                    >
                        <ShieldCheck size={28} />
                    </motion.div>
                    <motion.h1 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        style={{ 
                            color: '#1D1D1F', 
                            fontSize: '1.85rem', 
                            fontWeight: 800, 
                            marginBottom: '6px', 
                            letterSpacing: '-0.02em' ,
                            fontFamily: 'Outfit, sans-serif'
                        }}
                    >
                        NewGen Protocol
                    </motion.h1>
                    <motion.p 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        style={{ color: '#64748B', fontSize: '0.9rem', fontWeight: 500 }}
                    >
                        Clinical Intelligence Platform
                    </motion.p>
                </div>

                {/* Login Form */}
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ position: 'relative' }}>
                        <label style={{ 
                            display: 'block', 
                            fontSize: '0.75rem', 
                            fontWeight: 700, 
                            color: '#64748B', 
                            textTransform: 'uppercase', 
                            marginBottom: '8px', 
                            letterSpacing: '0.05em', 
                            marginLeft: '4px' 
                        }}>
                            Username
                        </label>
                        <div style={{ position: 'relative' }}>
                            <User 
                                size={18} 
                                style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} 
                            />
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Clinical ID"
                                style={{
                                    width: '100%',
                                    padding: '12px 12px 12px 42px',
                                    borderRadius: '10px',
                                    border: '1px solid rgba(0, 0, 0, 0.1)',
                                    background: '#F9FAFB',
                                    color: '#1D1D1F',
                                    fontSize: '0.95rem',
                                    fontWeight: 500,
                                    outline: 'none',
                                    transition: 'all 0.2s',
                                    boxSizing: 'border-box'
                                }}
                                onFocus={(e) => {
                                    e.target.style.borderColor = '#32CD32';
                                    e.target.style.background = 'white';
                                    e.target.style.boxShadow = '0 0 0 4px rgba(50, 205, 50, 0.1)';
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = 'rgba(0, 0, 0, 0.1)';
                                    e.target.style.background = '#F9FAFB';
                                    e.target.style.boxShadow = 'none';
                                }}
                            />
                        </div>
                    </div>

                    <div style={{ position: 'relative' }}>
                        <label style={{ 
                            display: 'block', 
                            fontSize: '0.75rem', 
                            fontWeight: 700, 
                            color: '#64748B', 
                            textTransform: 'uppercase', 
                            marginBottom: '8px', 
                            letterSpacing: '0.05em', 
                            marginLeft: '4px' 
                        }}>
                            Password
                        </label>
                        <div style={{ position: 'relative' }}>
                            <Lock 
                                size={18} 
                                style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} 
                            />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                style={{
                                    width: '100%',
                                    padding: '12px 12px 12px 42px',
                                    borderRadius: '10px',
                                    border: '1px solid rgba(0, 0, 0, 0.1)',
                                    background: '#F9FAFB',
                                    color: '#1D1D1F',
                                    fontSize: '0.95rem',
                                    fontWeight: 500,
                                    outline: 'none',
                                    transition: 'all 0.2s',
                                    boxSizing: 'border-box'
                                }}
                                onFocus={(e) => {
                                    e.target.style.borderColor = '#32CD32';
                                    e.target.style.background = 'white';
                                    e.target.style.boxShadow = '0 0 0 4px rgba(50, 205, 50, 0.1)';
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = 'rgba(0, 0, 0, 0.1)';
                                    e.target.style.background = '#F9FAFB';
                                    e.target.style.boxShadow = 'none';
                                }}
                            />
                        </div>
                    </div>

                    <motion.button
                        whileHover={{ scale: 1.01, boxShadow: '0 8px 20px rgba(50, 205, 50, 0.25)' }}
                        whileTap={{ scale: 0.98 }}
                        disabled={isLoading}
                        style={{
                            marginTop: '12px',
                            padding: '14px',
                            borderRadius: '10px',
                            background: 'linear-gradient(135deg, #32CD32 0%, #1E8449 100%)',
                            color: 'white',
                            fontSize: '0.95rem',
                            fontWeight: 700,
                            border: 'none',
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px',
                            boxShadow: '0 4px 12px rgba(50, 205, 50, 0.2)',
                            transition: 'all 0.2s',
                            opacity: isLoading ? 0.7 : 1
                        }}
                    >
                        {isLoading ? 'Verifying...' : (
                            <>
                                Sign In <ArrowRight size={18} />
                            </>
                        )}
                    </motion.button>
                </form>

                <div style={{ marginTop: '32px', textAlign: 'center' }}>
                    <p style={{ color: '#94A3B8', fontSize: '0.8rem', fontWeight: 500 }}>
                        Clinical Site Authorization Required
                    </p>
                </div>
            </motion.div>

            {/* Version Badge */}
            <div style={{
                position: 'absolute',
                bottom: '24px',
                right: '24px',
                color: 'rgba(0, 0, 0, 0.2)',
                fontSize: '0.7rem',
                fontWeight: 700,
                letterSpacing: '0.05em'
            }}>
                V1.0.0-PRO
            </div>
        </div>
    );
};

export default LoginPage;
