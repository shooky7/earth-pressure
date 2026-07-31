import React, { useState, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, AreaChart, Area, ReferenceLine
} from 'recharts';
import {
  rankineActive, rankinePassive, coulombActive, coulombPassive,
  atRestK, computePressureProfile, computeResultant, recommendTheory
} from './calculations';
import './App.css';

const DEFAULT = {
  gamma: 18,
  gammaSat: 20,
  height: 6,
  phi: 30,
  cohesion: 0,
  surcharge: 0,
  waterTable: '',
  delta: 15,
  beta: 0,
  theta: 90,
  OCR: 1,
  theory: 'rankine',
};

function MetricCard({ label, value, unit, color, sub }) {
  return (
    <div className="metric-card">
      <span className="metric-label">{label}</span>
      <span className="metric-value" style={{ color }}>
        {value}
        {unit && <span className="metric-unit"> {unit}</span>}
      </span>
      {sub && <span className="metric-sub">{sub}</span>}
    </div>
  );
}

function InputRow({ label, name, value, onChange, min, max, step, unit, hint }) {
  return (
    <div className="input-row">
      <div className="input-label-wrap">
        <label htmlFor={name}>{label}</label>
        {unit && <span className="input-unit">{unit}</span>}
      </div>
      <input
        id={name}
        type="number"
        name={name}
        value={value}
        onChange={onChange}
        min={min}
        max={max}
        step={step || 0.1}
      />
      {hint && <span className="input-hint">{hint}</span>}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p className="tooltip-depth">Depth: {label} m</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: {p.value?.toFixed(2)} kPa
        </p>
      ))}
    </div>
  );
};

export default function App() {
  const [params, setParams] = useState(DEFAULT);
  const [results, setResults] = useState(null);
  const [activeTab, setActiveTab] = useState('inputs');

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setParams(prev => ({ ...prev, [name]: value === '' ? '' : value }));
  }, []);

  const calculate = useCallback(() => {
    const p = {
      gamma: parseFloat(params.gamma),
      gammaSat: parseFloat(params.gammaSat),
      height: parseFloat(params.height),
      phi: parseFloat(params.phi),
      cohesion: parseFloat(params.cohesion) || 0,
      surcharge: parseFloat(params.surcharge) || 0,
      waterTable: params.waterTable !== '' ? parseFloat(params.waterTable) : null,
      delta: parseFloat(params.delta) || 0,
      beta: parseFloat(params.beta) || 0,
      theta: parseFloat(params.theta) || 90,
      OCR: parseFloat(params.OCR) || 1,
      theory: params.theory,
    };

    const Ka_rank = rankineActive(p.phi);
    const Kp_rank = rankinePassive(p.phi);
    const Ka_coul = coulombActive(p.phi, p.delta, p.beta, p.theta);
    const Kp_coul = coulombPassive(p.phi, p.delta, p.beta, p.theta);
    const K0 = atRestK(p.phi, p.OCR);

    const profile = computePressureProfile(p);
    const activeResultant = computeResultant(profile, 'active');
    const passiveResultant = computeResultant(profile, 'passive');
    const atrestResultant = computeResultant(profile, 'atrest');

    const recommendation = recommendTheory(p);

    // Tension crack depth (cohesive soils)
    const tensionCrack = p.cohesion > 0
      ? parseFloat((2 * p.cohesion / (p.gamma * Math.sqrt(Ka_rank))).toFixed(2))
      : null;

    setResults({
      Ka_rank, Kp_rank, Ka_coul, Kp_coul, K0,
      profile, activeResultant, passiveResultant, atrestResultant,
      recommendation, tensionCrack, params: p,
    });
    setActiveTab('results');
  }, [params]);

  const reset = () => { setParams(DEFAULT); setResults(null); setActiveTab('inputs'); };

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <div className="header-brand">
            <div className="brand-icon">⚙</div>
            <div>
              <h1>Earth Pressure Calculator</h1>
              <p>Rankine · Coulomb · At-Rest</p>
            </div>
          </div>
          <div className="header-badges">
            <span className="badge">Geotechnical</span>
            <span className="badge accent">v1.0</span>
          </div>
        </div>
      </header>

      <div className="container">
        <div className="tabs">
          {['inputs', 'results', 'guide'].map(tab => (
            <button
              key={tab}
              className={`tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'inputs' && '📐 '}
              {tab === 'results' && '📊 '}
              {tab === 'guide' && '📖 '}
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* ── INPUTS TAB ── */}
        {activeTab === 'inputs' && (
          <div className="tab-content">
            <div className="inputs-grid">

              {/* Soil Properties */}
              <div className="card">
                <h2 className="card-title">🪨 Soil Properties</h2>
                <InputRow label="Unit Weight (γ)" name="gamma" value={params.gamma}
                  onChange={handleChange} min={10} max={25} unit="kN/m³"
                  hint="Typical: 16–21 kN/m³" />
                <InputRow label="Saturated Unit Weight (γsat)" name="gammaSat" value={params.gammaSat}
                  onChange={handleChange} min={10} max={25} unit="kN/m³"
                  hint="Used below water table" />
                <InputRow label="Friction Angle (φ)" name="phi" value={params.phi}
                  onChange={handleChange} min={0} max={50} unit="°"
                  hint="Sand: 28–38°, Clay: 15–28°" />
                <InputRow label="Cohesion (c)" name="cohesion" value={params.cohesion}
                  onChange={handleChange} min={0} max={200} unit="kPa"
                  hint="0 for purely granular soils" />
                <InputRow label="OCR (for K₀)" name="OCR" value={params.OCR}
                  onChange={handleChange} min={1} max={20} step={0.5}
                  hint="Over-consolidation ratio (NC soil = 1)" />
              </div>

              {/* Wall & Loading */}
              <div className="card">
                <h2 className="card-title">🧱 Wall & Loading</h2>
                <InputRow label="Wall Height (H)" name="height" value={params.height}
                  onChange={handleChange} min={0.5} max={30} unit="m" />
                <InputRow label="Surcharge (q)" name="surcharge" value={params.surcharge}
                  onChange={handleChange} min={0} max={500} unit="kPa"
                  hint="Uniform load on backfill surface" />
                <InputRow label="Water Table Depth" name="waterTable" value={params.waterTable}
                  onChange={handleChange} min={0} max={params.height} unit="m"
                  hint="Leave empty if no water table" />
                <InputRow label="Wall Friction (δ)" name="delta" value={params.delta}
                  onChange={handleChange} min={0} max={35} unit="°"
                  hint="Typically δ = ⅔φ; 0 for Rankine" />
                <InputRow label="Backfill Slope (β)" name="beta" value={params.beta}
                  onChange={handleChange} min={-20} max={35} unit="°"
                  hint="+ = rising slope behind wall" />
                <InputRow label="Wall Inclination (θ)" name="theta" value={params.theta}
                  onChange={handleChange} min={60} max={120} unit="°"
                  hint="90° = vertical wall" />
              </div>

              {/* Theory Selection */}
              <div className="card theory-card">
                <h2 className="card-title">🔬 Theory Selection</h2>
                <div className="theory-grid">
                  {[
                    { id: 'rankine', label: 'Rankine', desc: 'Smooth vertical wall, horizontal fill. No wall friction.' },
                    { id: 'coulomb', label: 'Coulomb', desc: 'Inclined wall, wall friction, sloped backfill.' },
                    { id: 'atrest', label: 'At-Rest (K₀)', desc: 'No lateral movement. Rigid walls, basement walls.' },
                    { id: 'both', label: 'Compare Both', desc: 'Show Rankine and Coulomb side by side.' },
                  ].map(t => (
                    <label key={t.id} className={`theory-option ${params.theory === t.id ? 'selected' : ''}`}>
                      <input type="radio" name="theory" value={t.id}
                        checked={params.theory === t.id} onChange={handleChange} />
                      <span className="theory-label">{t.label}</span>
                      <span className="theory-desc">{t.desc}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="actions">
              <button className="btn-primary" onClick={calculate}>Calculate →</button>
              <button className="btn-ghost" onClick={reset}>Reset</button>
            </div>
          </div>
        )}

        {/* ── RESULTS TAB ── */}
        {activeTab === 'results' && !results && (
          <div className="empty-state">
            <div className="empty-icon">📐</div>
            <p>Enter your parameters and click <strong>Calculate</strong> to see results.</p>
            <button className="btn-primary" onClick={() => setActiveTab('inputs')}>Go to Inputs</button>
          </div>
        )}

        {activeTab === 'results' && results && (
          <div className="results-content">

            {/* Recommendation Banner */}
            <div className={`recommendation-banner ${results.recommendation.recommended}`}>
              <div className="rec-icon">💡</div>
              <div>
                <strong>Recommended: {results.recommendation.recommended.charAt(0).toUpperCase() + results.recommendation.recommended.slice(1)} Theory</strong>
                <ul className="rec-reasons">
                  {results.recommendation.reasons.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </div>
            </div>

            {/* Pressure Coefficients */}
            <h3 className="section-title">Pressure Coefficients</h3>
            <div className="metrics-grid">
              <MetricCard label="Ka (Rankine Active)" value={results.Ka_rank.toFixed(4)}
                color="#3b82f6" sub="Smooth vertical wall" />
              <MetricCard label="Kp (Rankine Passive)" value={results.Kp_rank.toFixed(4)}
                color="#10b981" sub="Smooth vertical wall" />
              {results.Ka_coul && (
                <MetricCard label="Ka (Coulomb Active)" value={results.Ka_coul.toFixed(4)}
                  color="#8b5cf6" sub="With wall friction" />
              )}
              {results.Kp_coul && (
                <MetricCard label="Kp (Coulomb Passive)" value={results.Kp_coul.toFixed(4)}
                  color="#06b6d4" sub="With wall friction" />
              )}
              <MetricCard label="K₀ (At-Rest)" value={results.K0.toFixed(4)}
                color="#f59e0b" sub={`OCR = ${results.params.OCR}`} />
            </div>

            {/* Resultant Forces */}
            <h3 className="section-title">Resultant Forces</h3>
            <div className="metrics-grid">
              <MetricCard label="Active Resultant (Pa)" value={results.activeResultant.force}
                unit="kN/m" color="#3b82f6"
                sub={`Acts at ${results.activeResultant.pointOfAction} m from top`} />
              {results.passiveResultant.force > 0 && (
                <MetricCard label="Passive Resultant (Pp)" value={results.passiveResultant.force}
                  unit="kN/m" color="#10b981"
                  sub={`Acts at ${results.passiveResultant.pointOfAction} m from top`} />
              )}
              {results.atrestResultant.force > 0 && (
                <MetricCard label="At-Rest Resultant (P₀)" value={results.atrestResultant.force}
                  unit="kN/m" color="#f59e0b"
                  sub={`Acts at ${results.atrestResultant.pointOfAction} m from top`} />
              )}
              {results.tensionCrack && (
                <MetricCard label="Tension Crack Depth" value={results.tensionCrack}
                  unit="m" color="#ef4444"
                  sub="Cohesive soil — ignore active pressure in this zone" />
              )}
            </div>

            {/* Pressure Distribution Chart */}
            <h3 className="section-title">Pressure Distribution with Depth</h3>
            <div className="chart-card">
              <ResponsiveContainer width="100%" height={380}>
                <LineChart
                  data={results.profile}
                  margin={{ top: 10, right: 30, left: 10, bottom: 20 }}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a3d52" />
                  <XAxis
                    type="number"
                    label={{ value: 'Lateral Pressure (kPa)', position: 'insideBottom', offset: -10, fill: '#94a3b8', fontSize: 12 }}
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                  />
                  <YAxis
                    dataKey="depth"
                    type="number"
                    reversed
                    label={{ value: 'Depth (m)', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 12 }}
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12, paddingTop: 12 }} />
                  <Line dataKey="active" name="Active Pressure" stroke="#3b82f6" strokeWidth={2} dot={false} />
                  <Line dataKey="passive" name="Passive Pressure" stroke="#10b981" strokeWidth={2} dot={false} />
                  <Line dataKey="atrest" name="At-Rest Pressure" stroke="#f59e0b" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                  {results.params.waterTable !== null && (
                    <Line dataKey="porewater" name="Pore Water Pressure" stroke="#06b6d4" strokeWidth={1.5} dot={false} strokeDasharray="3 3" />
                  )}
                  {results.tensionCrack && (
                    <ReferenceLine x={0} stroke="#ef4444" label={{ value: `Tension crack: ${results.tensionCrack}m`, fill: '#ef4444', fontSize: 10 }} />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Vertical Stress Chart */}
            <h3 className="section-title">Vertical Stress Distribution</h3>
            <div className="chart-card">
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart
                  data={results.profile}
                  layout="vertical"
                  margin={{ top: 10, right: 30, left: 10, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a3d52" />
                  <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }}
                    label={{ value: 'Vertical Stress (kPa)', position: 'insideBottom', offset: -10, fill: '#94a3b8', fontSize: 12 }} />
                  <YAxis dataKey="depth" type="number" reversed tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area dataKey="sigmaV" name="Vertical Stress" stroke="#8b5cf6" fill="rgba(139,92,246,0.15)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Data Table */}
            <h3 className="section-title">Pressure Table</h3>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Depth (m)</th>
                    <th>σ'v (kPa)</th>
                    <th>Active (kPa)</th>
                    <th>Passive (kPa)</th>
                    <th>At-Rest (kPa)</th>
                    {results.params.waterTable !== null && <th>Pore u (kPa)</th>}
                  </tr>
                </thead>
                <tbody>
                  {results.profile.filter((_, i) => i % 2 === 0).map((row, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'row-even' : ''}>
                      <td>{row.depth.toFixed(1)}</td>
                      <td>{row.sigmaV.toFixed(1)}</td>
                      <td className="val-active">{row.active.toFixed(1)}</td>
                      <td className="val-passive">{row.passive?.toFixed(1) ?? '—'}</td>
                      <td className="val-atrest">{row.atrest?.toFixed(1) ?? '—'}</td>
                      {results.params.waterTable !== null && <td className="val-water">{row.porewater.toFixed(1)}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="actions" style={{ marginTop: '2rem' }}>
              <button className="btn-primary" onClick={() => setActiveTab('inputs')}>← Modify Inputs</button>
              <button className="btn-ghost" onClick={() => window.print()}>Print / Export</button>
            </div>
          </div>
        )}

        {/* ── GUIDE TAB ── */}
        {activeTab === 'guide' && (
          <div className="guide-content">
            <div className="guide-grid">
              {[
                {
                  title: '📐 Rankine Theory',
                  color: '#3b82f6',
                  content: [
                    'Assumes smooth (frictionless) vertical wall',
                    'Horizontal backfill only (β = 0°)',
                    'Ka = tan²(45° − φ/2)',
                    'Kp = tan²(45° + φ/2)',
                    'Conservative — gives larger active pressure',
                    'Best for: preliminary design, smooth sheet piles',
                  ]
                },
                {
                  title: '⚙ Coulomb Theory',
                  color: '#8b5cf6',
                  content: [
                    'Accounts for wall friction (δ), slope (β), inclination (θ)',
                    'Uses wedge failure mechanism',
                    'Typically δ = ⅔φ for rough concrete walls',
                    'More accurate for practical wall conditions',
                    'Passive Kp can be overestimated — use with caution',
                    'Best for: gravity walls, rough retaining walls',
                  ]
                },
                {
                  title: '🔒 At-Rest (K₀)',
                  color: '#f59e0b',
                  content: [
                    "Jaky's formula: K₀ = (1 − sin φ) × OCR^sin φ",
                    'Used when wall cannot deflect (rigid)',
                    'K₀ > Ka always (no stress relief)',
                    'OCR > 1 increases K₀ significantly',
                    'Best for: basement walls, bridge abutments',
                    'Typical values: 0.4–0.6 for NC sands',
                  ]
                },
                {
                  title: '💧 Water Pressure',
                  color: '#06b6d4',
                  content: [
                    'Pore water pressure u = γw × hw',
                    'γw = 9.81 kN/m³',
                    'Use submerged unit weight γ\' = γsat − γw below table',
                    'Pore pressure added to lateral earth pressure',
                    'Water table is often the dominant design load',
                    'Always consider drainage provisions',
                  ]
                },
              ].map((card, i) => (
                <div key={i} className="guide-card" style={{ borderTop: `3px solid ${card.color}` }}>
                  <h3 style={{ color: card.color }}>{card.title}</h3>
                  <ul>
                    {card.content.map((line, j) => <li key={j}>{line}</li>)}
                  </ul>
                </div>
              ))}
            </div>

            <div className="formula-box">
              <h3>Key Formulas</h3>
              <div className="formula-grid">
                <div className="formula">
                  <span className="formula-name">Rankine Ka</span>
                  <code>Ka = tan²(45° − φ/2)</code>
                </div>
                <div className="formula">
                  <span className="formula-name">Rankine Kp</span>
                  <code>Kp = tan²(45° + φ/2)</code>
                </div>
                <div className="formula">
                  <span className="formula-name">Active Pressure</span>
                  <code>σh = Ka·σv − 2c√Ka</code>
                </div>
                <div className="formula">
                  <span className="formula-name">Passive Pressure</span>
                  <code>σh = Kp·σv + 2c√Kp</code>
                </div>
                <div className="formula">
                  <span className="formula-name">Jaky K₀</span>
                  <code>K₀ = (1−sinφ)·OCR^sinφ</code>
                </div>
                <div className="formula">
                  <span className="formula-name">Tension Crack</span>
                  <code>zc = 2c / (γ√Ka)</code>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <footer className="footer">
        <p>Earth Pressure Calculator · Built for AWS Weekend Challenge · Geotechnical Engineering</p>
        <p>Results are for preliminary design only. Always verify with a licensed geotechnical engineer.</p>
      </footer>
    </div>
  );
}
