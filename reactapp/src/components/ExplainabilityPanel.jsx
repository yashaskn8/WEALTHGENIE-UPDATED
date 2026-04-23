import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';

const FEATURE_COLORS = {
  positive: '#10b981',
  negative: '#f43f5e',
};

const ExplainabilityPanel = ({ explanation, instrumentName }) => {
  if (!explanation || !explanation.feature_contributions) return null;

  const chartData = explanation.feature_contributions.map(c => ({
    name: c.display_name,
    value: c.shap_value,
    magnitude: c.magnitude,
    direction: c.direction,
    rawValue: c.raw_value,
  }));

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div style={{
        background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(6, 182, 212, 0.3)',
        borderRadius: 12, padding: '12px 16px', color: '#e2e8f0', fontSize: '0.85rem',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>{d.name}</div>
        <div>Your {d.name.toLowerCase()} <span style={{ color: d.direction === 'increased' ? '#10b981' : '#f43f5e', fontWeight: 600 }}>{d.direction}</span> the recommendation score by <strong>{d.magnitude}</strong></div>
      </div>
    );
  };

  return (
    <div style={{
      marginTop: 24, padding: 24,
      background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.08), rgba(6, 182, 212, 0.08))',
      border: '1px solid rgba(139, 92, 246, 0.2)',
      borderRadius: 20, position: 'relative', overflow: 'hidden',
    }}>
      {/* Decorative glow */}
      <div style={{
        position: 'absolute', top: -30, left: -30, width: 120, height: 120,
        background: 'radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 70%)',
        filter: 'blur(25px)', pointerEvents: 'none',
      }} />

      <h3 style={{
        fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginBottom: 4,
        position: 'relative', display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{
          display: 'inline-flex', width: 28, height: 28, borderRadius: 8,
          background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
          alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem',
        }}>🧠</span>
        Why WealthGenie recommended {instrumentName || 'this instrument'}
      </h3>
      <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: 20, position: 'relative' }}>
        {explanation.top_reason}
      </p>

      <div style={{ width: '100%', height: 180 }}>
        <ResponsiveContainer>
          <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
            <XAxis type="number" domain={['dataMin', 'dataMax']} tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: '#334155' }} />
            <YAxis type="category" dataKey="name" tick={{ fill: '#e2e8f0', fontSize: 13, fontWeight: 500 }} width={90} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
            <ReferenceLine x={0} stroke="#475569" strokeWidth={1} />
            <Bar dataKey="value" radius={[0, 6, 6, 0]} animationDuration={800} animationBegin={200}>
              {chartData.map((entry, index) => (
                <Cell key={index} fill={entry.value >= 0 ? FEATURE_COLORS.positive : FEATURE_COLORS.negative} fillOpacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{
        marginTop: 12, display: 'flex', gap: 16, fontSize: '0.75rem', color: '#64748b',
        position: 'relative',
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: FEATURE_COLORS.positive }} /> Positive influence
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: FEATURE_COLORS.negative }} /> Negative influence
        </span>
        <span style={{ marginLeft: 'auto' }}>Confidence: {Math.round((explanation.confidence || 0) * 100)}%</span>
      </div>
    </div>
  );
};

export default ExplainabilityPanel;
