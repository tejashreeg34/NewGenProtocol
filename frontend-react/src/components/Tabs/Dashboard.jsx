import React from 'react';
import { motion } from 'framer-motion';
import { Activity, Layout, Users, ShieldAlert, BarChart3, TrendingUp, Clock, Info, CheckCircle2, AlertTriangle, FileText, Globe, Target, Brain, ShieldCheck, PieChart, Timer } from 'lucide-react';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend, 
  ArcElement,
  PointElement,
  LineElement,
  Filler
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, 
  ArcElement, PointElement, LineElement, Filler
);

const Dashboard = () => {
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#FFFFFF',
        titleColor: '#1D1D1F',
        bodyColor: '#64748B',
        borderColor: 'rgba(0,0,0,0.08)',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 12,
        displayColors: false,
        bodyFont: { family: 'Inter', size: 12 },
        titleFont: { family: 'Outfit', size: 13, weight: 'bold' }
      }
    },
    scales: {
      y: { grid: { display: false }, ticks: { display: false }, border: { display: false } },
      x: { grid: { display: false }, border: { display: false }, ticks: { font: { family: 'Inter', size: 10 }, color: '#94A3B8' } }
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } }
  };

  return (
    <motion.div className="fade-in" variants={containerVariants} initial="hidden" animate="show" style={{ paddingBottom: '60px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '40px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ color: 'var(--primary-lime)', fontWeight: 800, fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase' }}>PROTOCOL INTELLIGENCE</span>
            <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--border-color)' }}></div>
            <span style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.7rem' }}>SaaS-GRADE ANALYTICS</span>
          </div>
          <h2 style={{ fontSize: '2.4rem', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>Intelligence Dashboard</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem', marginTop: '4px' }}>Automated clinical design assessment and regulatory alignment metrics.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-secondary" style={{ padding: '10px 20px', borderRadius: '14px', background: 'white' }}>
            <Activity size={16} /> <span style={{ marginLeft: '8px' }}>Refresh Engine</span>
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
        
        {/* Section 1: Live Status */}
        <motion.div variants={itemVariants} className="card" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
             <div style={{ background: 'var(--light-lime)', width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--dark-lime)' }}>
                <TrendingUp size={20} />
             </div>
             <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>Live Protocol Status</h3>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>COMPLETION PROGRESS</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary-lime)' }}>72%</span>
                </div>
                <div style={{ height: '8px', background: 'var(--bg-gray)', borderRadius: '4px', overflow: 'hidden' }}>
                    <motion.div initial={{ width: 0 }} animate={{ width: '72%' }} style={{ height: '100%', background: 'var(--primary-lime)' }} />
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ padding: '12px', background: 'var(--bg-gray)', borderRadius: '12px' }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>QC SCORE</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 900 }}>91.4%</div>
                </div>
                <div style={{ padding: '12px', background: 'var(--bg-gray)', borderRadius: '12px' }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>SECTIONS</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 900 }}>8 / 11</div>
                </div>
                <div style={{ padding: '12px', background: 'var(--bg-gray)', borderRadius: '12px' }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>WORD COUNT</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 900 }}>14,204</div>
                </div>
                <div style={{ padding: '12px', background: 'var(--bg-gray)', borderRadius: '12px' }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>ENTITIES</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 900 }}>248</div>
                </div>
            </div>
          </div>
        </motion.div>

        {/* Section 2: Design Intelligence */}
        <motion.div variants={itemVariants} className="card" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
             <div style={{ background: '#F5F3FF', width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7C3AED' }}>
                <Brain size={20} />
             </div>
             <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>Design Intelligence</h3>
          </div>

          <div style={{ textAlign: 'center', padding: '20px', background: 'var(--bg-gray)', borderRadius: '20px', border: '1px solid var(--border-color)' }}>
             <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '4px' }}>COMPLEXITY SCORE</div>
             <div style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--text-main)' }}>74</div>
             <div style={{ display: 'inline-block', marginTop: '8px', padding: '4px 12px', background: 'var(--light-lime)', color: 'var(--dark-lime)', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 800 }}>MODERATE DESIGN</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
             {[
               { label: 'Study Arms', value: '3 Active', icon: Target },
               { label: 'Dosage Levels', value: '5 Tiers', icon: Activity },
               { label: 'Timeline Events', value: '42 Points', icon: Timer }
             ].map((item, i) => (
               <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < 2 ? '1px solid var(--border-color)' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                    <item.icon size={14} /> {item.label}
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800 }}>{item.value}</div>
               </div>
             ))}
          </div>
        </motion.div>

        {/* Section 5: Quality Assurance */}
        <motion.div variants={itemVariants} className="card" style={{ padding: '32px', background: 'var(--lime-gradient)', border: 'none', display: 'flex', flexDirection: 'column' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', color: 'white' }}>
             <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'white' }}>Safety Monitor</h3>
             <ShieldCheck size={18} />
           </div>
           
           <div style={{ flex: 1, minHeight: '140px' }}>
              <Line data={{
                labels: ['M1', 'M2', 'M3', 'M4', 'M5'],
                datasets: [{
                  data: [12, 19, 14, 22, 18],
                  borderColor: 'white',
                  borderWidth: 2,
                  fill: true,
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  tension: 0.4,
                  pointRadius: 0
                }]
              }} options={{ ...chartOptions, scales: { x: { display: false }, y: { display: false } } }} />
           </div>

           <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '20px' }}>
              <div style={{ padding: '12px', background: 'rgba(255,255,255,0.12)', borderRadius: '12px', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                 <AlertTriangle size={16} color="white" />
                 <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'white' }}>3 High-Risk Interactions</span>
              </div>
              <div style={{ padding: '12px', background: 'rgba(255,255,255,0.12)', borderRadius: '12px', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                 <CheckCircle2 size={16} color="white" />
                 <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'white' }}>SAE Reporting Compliant</span>
              </div>
           </div>
        </motion.div>

        {/* Section 3: Population & Criteria */}
        <motion.div variants={itemVariants} className="card" style={{ padding: '32px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>Population & Criteria</h3>
            <Users size={18} color="var(--primary-lime)" />
          </div>
          <div style={{ flex: 1, minHeight: '200px' }}>
            <Bar data={{
              labels: ['Inclusion', 'Exclusion', 'Withdrawal', 'Total'],
              datasets: [{
                data: [12, 18, 5, 35],
                backgroundColor: ['var(--primary-lime)', 'var(--dark-lime)', 'var(--bg-gray)', '#1D1D1F'],
                borderRadius: 10,
                barThickness: 32
              }]
            }} options={chartOptions} />
          </div>
        </motion.div>

        {/* Section 4: Demographics (Gender & Age) */}
        <motion.div variants={itemVariants} className="card" style={{ padding: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
             <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>Demographics Distribution</h3>
             <PieChart size={18} color="var(--primary-lime)" />
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'center' }}>
            <div style={{ position: 'relative', width: '120px', height: '120px', margin: '0 auto' }}>
                <Doughnut data={{
                  labels: ['F', 'M'],
                  datasets: [{
                    data: [52, 48],
                    backgroundColor: ['var(--dark-lime)', 'var(--primary-lime)'],
                    borderWidth: 0,
                    cutout: '75%'
                  }]
                }} options={{ plugins: { legend: { display: false } }, maintainAspectRatio: false }} />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800 }}>GENDER</div>
            </div>
            
            <div style={{ position: 'relative', width: '120px', height: '120px', margin: '0 auto' }}>
                <Doughnut data={{
                  labels: ['Adult', 'Elderly', 'Ped.'],
                  datasets: [{
                    data: [65, 30, 5],
                    backgroundColor: ['#1D1D1F', 'var(--dark-lime)', 'var(--bg-gray)'],
                    borderWidth: 0,
                    cutout: '75%'
                  }]
                }} options={{ plugins: { legend: { display: false } }, maintainAspectRatio: false }} />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800 }}>AGE</div>
            </div>
          </div>

          <div style={{ marginTop: '32px', display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center' }}>
             {[
               { label: '52% Female', color: 'var(--dark-lime)' },
               { label: '65% Adult', color: '#1D1D1F' },
               { label: '30% Elderly', color: 'var(--dark-lime)' }
             ].map((tag, i) => (
               <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.65rem', fontWeight: 700, padding: '4px 10px', background: 'var(--bg-gray)', borderRadius: '20px' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: tag.color }} />
                  {tag.label}
               </div>
             ))}
          </div>
        </motion.div>

        {/* Section 6: Endpoint Distribution (Moved to make room) */}
        <motion.div variants={itemVariants} className="card" style={{ padding: '32px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>Endpoint Analysis</h3>
            <Target size={18} color="var(--primary-lime)" />
          </div>
          <div style={{ flex: 1, minHeight: '180px' }}>
            <Bar data={{
              labels: ['Primary', 'Sec.', 'Exp.'],
              datasets: [{
                data: [1, 4, 3],
                backgroundColor: 'var(--primary-lime)',
                borderRadius: 8,
                barThickness: 40
              }]
            }} options={chartOptions} />
          </div>
          <div style={{ marginTop: '20px', padding: '12px', background: 'var(--bg-gray)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
             <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
               Highest density in <strong>Safety Endpoints</strong> (v2.4.0 scan).
             </p>
          </div>
        </motion.div>

      </div>
      
      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.5); opacity: 0.5; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </motion.div>
  );
};

export default Dashboard;
