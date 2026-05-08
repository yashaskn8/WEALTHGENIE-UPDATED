import React from 'react';
import { motion } from 'framer-motion';
import { Compass, ShieldCheck, Target, Calculator, PieChart, Activity } from 'lucide-react';

const HelpTourScreen = () => {
  const guides = [
    {
      icon: PieChart, color: '#0ea5e9',
      title: 'Strategy Dashboard',
      desc: 'The core control center. Utilizes a multi-layered allocation engine to map your specific age and risk appetite to a mathematically optimal basket of assets, actively computing 15-year projections based on expected returns.'
    },
    {
      icon: Calculator, color: '#10b981',
      title: 'Post-Tax Analysis & Tax Optimizer',
      desc: "These modules don't just look at nominal returns. They calculate exact Indian IT slabs (Old vs New Regime) and deduct STCG/LTCG mathematically so you can visualize the *real* spending power of your investments."
    },
    {
      icon: Activity, color: '#f59e0b',
      title: 'Rebalancer & SIP Step-Up',
      desc: 'Markets drift. The Rebalancer allows you to drag sliders to adjust risk vectors manually, calculating immediate shifts to your projections. The SIP Planner models how aggressively increasing your monthly contribution changes your outcome.'
    },
    {
      icon: Target, color: '#8b5cf6',
      title: 'Health Score & Goals',
      desc: 'A psychometric-style evaluation of your financial resilience. Tracks emergency funds, debt-to-income limits, and maps your raw assets against massive lifetime expenses like Retirement or property acquisition.'
    },
    {
      icon: ShieldCheck, color: '#f43f5e',
      title: 'AI Genie Assistant',
      desc: 'Accessible via the glowing orb in the bottom right. Our generative AI is fully context-aware of your uploaded profile and can answer immediate analytical queries about your specific strategy.'
    }
  ];

  return (
    <div style={{ padding: '40px 32px', maxWidth: 900, margin: '0 auto', color: '#fff', position: 'relative' }}>
      {/* Header */}
      <motion.div 
        style={{ marginBottom: 48, textAlign: 'center' }}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div style={{ 
          fontSize: '0.6rem', fontWeight: 800, letterSpacing: '3px', 
          textTransform: 'uppercase', color: '#38bdf8', marginBottom: 12, opacity: 0.85 
        }}>
          PLATFORM DOCUMENTATION
        </div>
        <h1 className="page-title" style={{ fontSize: '2.4rem', marginBottom: 8, justifyContent: 'center' }}>
          Platform{' '}
          <span style={{
            background: 'linear-gradient(135deg, #38bdf8, #8b5cf6)',
            WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent'
          }}>Guide</span>
        </h1>
        <p className="page-subtitle" style={{ fontSize: '0.95rem', maxWidth: 600, margin: '0 auto' }}>
          Master the WealthGenie Advisor Portal. Here is a breakdown of the deep-analytics engines available in your sidebar.
        </p>
      </motion.div>

      {/* Guide Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {guides.map((g, i) => {
          const IconComp = g.icon;
          return (
            <motion.div 
              key={i}
              initial={{ opacity: 0, x: -20 }} 
              whileInView={{ opacity: 1, x: 0 }} 
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              style={{ 
                display: 'flex', gap: 20, padding: '24px 28px', 
                background: 'linear-gradient(165deg, rgba(18, 27, 46, 0.65), rgba(8, 13, 28, 0.8))',
                backdropFilter: 'blur(40px)',
                border: '1px solid rgba(255,255,255,0.06)', 
                borderTop: '1px solid rgba(255,255,255,0.09)',
                borderRadius: 18, alignItems: 'center',
                boxShadow: '0 8px 24px -6px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)',
                transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
                cursor: 'default'
              }}
              whileHover={{ 
                x: 4, borderColor: 'rgba(255,255,255,0.12)',
                boxShadow: '0 12px 32px -6px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.06)'
              }}
            >
              <div style={{ 
                background: `linear-gradient(135deg, ${g.color}15, ${g.color}08)`,
                border: `1px solid ${g.color}25`,
                width: 56, height: 56, minWidth: 56,
                borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 0 20px ${g.color}10`
              }}>
                <IconComp size={24} color={g.color} />
              </div>
              <div>
                <h3 style={{ 
                  fontSize: '1.05rem', marginBottom: 6, color: '#f1f5f9', fontWeight: 700,
                  letterSpacing: '-0.2px'
                }}>{g.title}</h3>
                <p style={{ 
                  color: '#94a3b8', margin: 0, lineHeight: 1.65, fontSize: '0.88rem',
                  fontFamily: "'Inter', sans-serif"
                }}>{g.desc}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Footer CTA */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        style={{ 
          marginTop: 48, padding: 36, 
          background: 'linear-gradient(165deg, rgba(18, 27, 46, 0.65), rgba(8, 13, 28, 0.8))',
          backdropFilter: 'blur(40px)',
          border: '1px solid rgba(255,255,255,0.06)', borderTop: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 20, textAlign: 'center',
          boxShadow: '0 16px 40px -10px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)'
        }}
      >
        <div style={{
          display: 'inline-flex', width: 52, height: 52, borderRadius: 16,
          background: 'rgba(148, 163, 184, 0.06)', border: '1px solid rgba(148, 163, 184, 0.12)',
          alignItems: 'center', justifyContent: 'center', marginBottom: 16
        }}>
          <Compass size={24} color="#94a3b8" />
        </div>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: 8, color: '#f1f5f9' }}>
          Need Human Support?
        </h3>
        <p style={{ color: '#94a3b8', fontSize: '0.88rem', marginBottom: 24, maxWidth: 450, margin: '0 auto 20px' }}>
          While the algorithm calculates optimal paths, execution sometimes requires a human touch.
        </p>
        <button style={{
          padding: '12px 36px', 
          background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
          border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12,
          color: '#fff', fontWeight: 700, fontSize: '0.85rem',
          letterSpacing: '1px', textTransform: 'uppercase', cursor: 'pointer',
          boxShadow: '0 8px 24px rgba(14,165,233,0.3), inset 0 1px 0 rgba(255,255,255,0.15)',
          transition: 'all 0.3s ease', fontFamily: 'inherit'
        }}>
          Contact Wealth Manager
        </button>
      </motion.div>
    </div>
  );
};

export default HelpTourScreen;
