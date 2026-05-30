import React from 'react';
import type { STLAnalysisResults } from '../engine/stlChecker';
import { ShieldCheck, ShieldAlert, Cpu, Hammer, Info, Check, AlertTriangle, XCircle } from 'lucide-react';

interface CheckerPanelProps {
  results: STLAnalysisResults;
  materialType: 'gold-yellow' | 'gold-rose' | 'platinum' | 'ceramic-white' | 'ceramic-black' | 'frosted-glass';
}

export const CheckerPanel: React.FC<CheckerPanelProps> = ({
  results,
  materialType
}) => {
  const {
    volume,
    dimensions,
    triangleCount,
    materialsWeight,
    printabilityRating,
    diagnostics
  } = results;

  // Map printability rating to premium styling
  const getRatingBadge = () => {
    switch (printabilityRating) {
      case 'AAA':
        return (
          <span style={{ background: 'rgba(52, 199, 89, 0.15)', color: 'var(--color-success)', border: '1px solid rgba(52, 199, 89, 0.3)', padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <ShieldCheck size={14} /> AAA PRINTABLE
          </span>
        );
      case 'Good':
        return (
          <span style={{ background: 'rgba(52, 199, 89, 0.1)', color: 'var(--color-success)', border: '1px solid rgba(52, 199, 89, 0.2)', padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <ShieldCheck size={14} /> GOOD
          </span>
        );
      case 'Warning':
        return (
          <span style={{ background: 'rgba(255, 149, 0, 0.15)', color: 'var(--color-warning)', border: '1px solid rgba(255, 149, 0, 0.3)', padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <ShieldAlert size={14} /> PRINT WARNING
          </span>
        );
      case 'Critical':
      default:
        return (
          <span style={{ background: 'rgba(255, 59, 48, 0.15)', color: 'var(--color-danger)', border: '1px solid rgba(255, 59, 48, 0.3)', padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <ShieldAlert size={14} /> NON-PRINTABLE
          </span>
        );
    }
  };

  // Get active material weight
  const getActiveWeight = (): { weight: number; name: string } => {
    switch (materialType) {
      case 'gold-rose':
        return { weight: materialsWeight.gold18k, name: '18K Rose Gold' };
      case 'platinum':
        return { weight: materialsWeight.platinum, name: 'Platinum 950' };
      case 'ceramic-white':
      case 'ceramic-black':
        return { weight: materialsWeight.pla, name: 'Sintered Ceramic' };
      case 'frosted-glass':
        return { weight: materialsWeight.pla * 0.9, name: 'Silica Glass' };
      case 'gold-yellow':
      default:
        return { weight: materialsWeight.gold18k, name: '18K Yellow Gold' };
    }
  };

  const activeWeightDetails = getActiveWeight();

  return (
    <div className="sidebar-panel right" style={{ borderLeft: '1px solid var(--glass-border)', flexGrow: 1, maxHeight: 'calc(100vh - 350px)', borderTop: '1px solid var(--glass-border)' }}>
      <div className="panel-header">
        <h2 className="panel-title">
          <Cpu size={18} />
          STL Checker Engine
        </h2>
        {getRatingBadge()}
      </div>

      <div className="panel-content" style={{ padding: '20px' }}>
        {/* Core Stats Grid */}
        <div className="checker-grid">
          <div className="checker-stat">
            <span className="checker-stat-label">Bounding Envelope</span>
            <span className="checker-stat-value" style={{ fontSize: '0.9rem', color: '#fff' }}>
              {dimensions.width} x {dimensions.height} x {dimensions.depth} <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>mm</span>
            </span>
          </div>

          <div className="checker-stat">
            <span className="checker-stat-label">Volume displacement</span>
            <span className="checker-stat-value" style={{ color: 'var(--accent-gold)' }}>
              {volume.toFixed(1)} <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>mm³</span>
            </span>
          </div>

          <div className="checker-stat">
            <span className="checker-stat-label">Triangles / Facets</span>
            <span className="checker-stat-value" style={{ fontSize: '0.95rem' }}>
              {triangleCount.toLocaleString()}
            </span>
          </div>

          <div className="checker-stat">
            <span className="checker-stat-label">Active metal weight</span>
            <span className="checker-stat-value" style={{ color: 'var(--accent-gold)' }}>
              {activeWeightDetails.weight.toFixed(2)} <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>g</span>
            </span>
          </div>
        </div>

        {/* Detailed diagnostic logs list */}
        <div className="checker-diagnostics">
          <div className="diag-header">WATERTIGHTNESS & NORMAL VECTORS LOG</div>
          <div className="diag-list">
            {diagnostics.map((diag, index) => {
              const isErr = diag.includes('Open boundaries') || diag.includes('Scrambled normals') || diag.includes('Empty geometry');
              const isWarn = diag.includes('ultra-thin');
              let icon = <Check size={14} className="diag-icon success" />;
              
              if (isErr) {
                icon = <XCircle size={14} className="diag-icon danger" />;
              } else if (isWarn) {
                icon = <AlertTriangle size={14} className="diag-icon warning" />;
              }

              return (
                <div key={index} className="diag-item">
                  <div className="diag-icon">{icon}</div>
                  <span style={{ color: isErr ? 'var(--color-danger)' : isWarn ? 'var(--color-warning)' : 'var(--text-secondary)' }}>
                    {diag}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Luxury metal weight details */}
        <div className="control-group" style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '16px' }}>
          <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.5px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Hammer size={12} />
            Fine Jewelry Metal Weight Summary
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '0.75rem' }}>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '6px 10px', borderRadius: '4px', border: '1px solid var(--glass-border)' }}>
              <span style={{ color: 'var(--text-muted)' }}>Sterling Silver:</span> <strong style={{ color: '#fff' }}>{materialsWeight.silver.toFixed(2)}g</strong>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '6px 10px', borderRadius: '4px', border: '1px solid var(--glass-border)' }}>
              <span style={{ color: 'var(--text-muted)' }}>14K Yellow Gold:</span> <strong style={{ color: 'var(--accent-gold)' }}>{materialsWeight.gold14k.toFixed(2)}g</strong>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '6px 10px', borderRadius: '4px', border: '1px solid var(--glass-border)' }}>
              <span style={{ color: 'var(--text-muted)' }}>18K Yellow Gold:</span> <strong style={{ color: 'var(--accent-gold)' }}>{materialsWeight.gold18k.toFixed(2)}g</strong>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '6px 10px', borderRadius: '4px', border: '1px solid var(--glass-border)' }}>
              <span style={{ color: 'var(--text-muted)' }}>Platinum 950:</span> <strong style={{ color: '#e5e4e2' }}>{materialsWeight.platinum.toFixed(2)}g</strong>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '6px 10px', borderRadius: '4px', border: '1px solid var(--glass-border)' }}>
              <span style={{ color: 'var(--text-muted)' }}>PLA/Resin (FDM/SLA):</span> <strong style={{ color: 'var(--text-secondary)' }}>{materialsWeight.pla.toFixed(2)}g</strong>
            </div>
          </div>
        </div>

        {/* Upgradability notice */}
        <div className="checker-info">
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600, color: 'var(--accent-gold)', marginBottom: '4px' }}>
            <Info size={12} /> UPGRADABLE SHAPE DIAGNOSTICS
          </div>
          The STL checker module is completely modular. You can open <code>engine/stlChecker.ts</code> to implement custom thickness overlays, overhang detection (for support-free prints), or mesh voxelization calculations.
        </div>
      </div>
    </div>
  );
};
