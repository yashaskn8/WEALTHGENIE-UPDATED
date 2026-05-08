import React from 'react';
import { motion } from 'framer-motion';
import { Lightbulb, TrendingUp, AlertTriangle, BarChart3, Newspaper } from 'lucide-react';

const InsightsScreen = ({ profile, recommendations }) => {
  const isHighRisk = profile?.risk_appetite === 'High';
  const horizon = profile?.investment_horizon || 15;

  const cards = [
    {
      icon: TrendingUp,
      iconColor: '#f43f5e',
      iconBg: 'rgba(244, 63, 94, 0.08)',
      iconBorder: 'rgba(244, 63, 94, 0.15)',
      title: 'Macro Equity Valuation',
      body: `Broad market indices are pushing historically high P/E ratios. For your ${horizon}-year horizon, our models suggest maintaining SIP discipline during near-term volatility rather than attempting to time macro entry points.${isHighRisk ? " As a high-risk investor, your allocation captures this upside but remains exposed to 15-20% drawdown risks." : ""}`,
      delay: 0.1
    },
    {
      icon: BarChart3,
      iconColor: '#2dd4bf',
      iconBg: 'rgba(45, 212, 191, 0.08)',
      iconBorder: 'rgba(45, 212, 191, 0.15)',
      title: 'Yield Curve Dynamics',
      body: 'With the RBI signaling potential rate shifts, locking in long-duration fixed income yields now provides a strong counter-balance to your equity exposure. Your debt allocation has been weighted towards sovereign and high-grade corporate bonds to optimize post-tax risk-adjusted returns.',
      delay: 0.2
    },
    {
      icon: Newspaper,
      iconColor: '#fbbf24',
      iconBg: 'rgba(251, 191, 36, 0.08)',
      iconBorder: 'rgba(251, 191, 36, 0.15)',
      title: 'Regulatory Alpha',
      body: 'We\'ve detected structural shifts in domestic taxation. Ensure you\'ve reviewed the "Tax Optimizer" tab. Funneling your mandatory fixed-income savings through EPF/PPF rather than taxable FDs structurally improves your compounding rate by approximately 1.8% annualized.',
      delay: 0.3
    },
    {
      icon: AlertTriangle,
      iconColor: '#94a3b8',
      iconBg: 'rgba(148, 163, 184, 0.06)',
      iconBorder: 'rgba(148, 163, 184, 0.12)',
      title: 'Portfolio Concentration',
      body: `Your current portfolio engine is diversified across ${recommendations?.length || 0} discrete asset configurations. However, keep an eye on overlapping sectoral allocations if you add thematic mutual funds manually.`,
      delay: 0.4
    }
  ];

  return (
    <div style={{ padding: '40px 32px', maxWidth: 1200, margin: '0 auto', color: '#fff', position: 'relative' }}>
      {/* Header */}
      <motion.div 
        style={{ marginBottom: 48 }}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div style={{ 
          fontSize: '0.6rem', fontWeight: 800, letterSpacing: '3px', 
          textTransform: 'uppercase', color: '#fbbf24', marginBottom: 12, opacity: 0.85 
        }}>
          AI-POWERED ANALYSIS
        </div>
        <h1 className="page-title" style={{ fontSize: '2.2rem', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{
            display: 'inline-flex', width: 36, height: 36,
            background: 'linear-gradient(135deg, rgba(251,191,36,0.15), rgba(251,191,36,0.05))',
            border: '1px solid rgba(251,191,36,0.2)', borderRadius: 10,
            alignItems: 'center', justifyContent: 'center'
          }}>
            <Lightbulb size={18} color="#fbbf24" />
          </span>
          Genie AI{' '}
          <span style={{
            background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
            WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent'
          }}>Insights</span>
        </h1>
        <p className="page-subtitle" style={{ fontSize: '0.95rem', maxWidth: 600 }}>
          Algorithmic market observations mapped to your {horizon}-year trajectory.
        </p>
      </motion.div>

      {/* Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 20 }}>
        {cards.map((card, i) => {
          const IconComp = card.icon;
          return (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: card.delay }}
              style={{ 
                background: 'linear-gradient(165deg, rgba(18, 27, 46, 0.72), rgba(8, 13, 28, 0.88))',
                backdropFilter: 'blur(48px) saturate(180%)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderTop: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 20, padding: 28,
                boxShadow: '0 16px 40px -10px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)',
                transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
                cursor: 'default', position: 'relative', overflow: 'hidden'
              }}
              whileHover={{ 
                y: -4, 
                borderColor: 'rgba(255,255,255,0.12)',
                boxShadow: '0 24px 56px -14px rgba(0,0,0,0.65), inset 0 1px 1px rgba(255,255,255,0.08)'
              }}
            >
              {/* Top accent line */}
              <div style={{
                position: 'absolute', top: 0, left: '10%', width: '80%', height: 1,
                background: `linear-gradient(90deg, transparent, ${card.iconColor}30, transparent)`,
                opacity: 0.6
              }} />
              
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
                <div style={{ 
                  background: card.iconBg, border: `1px solid ${card.iconBorder}`,
                  padding: 10, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: `0 0 20px ${card.iconColor}15`
                }}>
                  <IconComp color={card.iconColor} size={20} />
                </div>
                <h3 style={{ 
                  fontSize: '1.05rem', margin: 0, fontWeight: 700, color: '#f1f5f9',
                  letterSpacing: '-0.2px'
                }}>{card.title}</h3>
              </div>
              <p style={{ 
                color: '#94a3b8', lineHeight: 1.7, fontSize: '0.88rem', margin: 0,
                fontFamily: "'Inter', sans-serif"
              }}>
                {card.body}
              </p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default InsightsScreen;
