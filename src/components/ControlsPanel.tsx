import React from 'react';
import type { RingParameters } from '../engine/proceduralRing';
import type { VaseParameters } from '../engine/proceduralVase';
import type { LampParameters } from '../engine/proceduralLamp';
import { Sliders, Gem, Palette } from 'lucide-react';

interface ControlsPanelProps {
  parameters: RingParameters;
  onChange: (newParams: RingParameters) => void;
  materialType: 'gold-yellow' | 'gold-rose' | 'platinum' | 'ceramic-white' | 'ceramic-black' | 'frosted-glass';
  onMaterialChange: (type: 'gold-yellow' | 'gold-rose' | 'platinum' | 'ceramic-white' | 'ceramic-black' | 'frosted-glass') => void;
  activeModel: 'ring' | 'vase' | 'lamp';
  vaseParameters: VaseParameters;
  onVaseChange: (params: VaseParameters) => void;
  lampParameters: LampParameters;
  onLampChange: (params: LampParameters) => void;
  clippingEnabled: boolean;
  onClippingToggle: (val: boolean) => void;
}

export const ControlsPanel: React.FC<ControlsPanelProps> = ({
  parameters,
  onChange,
  materialType,
  onMaterialChange,
  activeModel,
  vaseParameters,
  onVaseChange,
  lampParameters,
  onLampChange,
  clippingEnabled,
  onClippingToggle
}) => {

  const materialsList: { id: typeof materialType; name: string; class: string }[] = [
    { id: 'gold-yellow', name: 'Yellow Gold 18K', class: 'material-gold-yellow' },
    { id: 'gold-rose', name: 'Rose Gold 18K', class: 'material-gold-rose' },
    { id: 'platinum', name: 'Platinum 950', class: 'material-platinum' },
    { id: 'ceramic-white', name: 'White Ceramic', class: 'material-ceramic-white' },
    { id: 'ceramic-black', name: 'Black Ceramic', class: 'material-ceramic-black' },
    { id: 'frosted-glass', name: 'Frosted Glass', class: 'material-frosted-glass' }
  ];

  const updateRingParam = <K extends keyof RingParameters>(key: K, value: RingParameters[K]) => {
    onChange({ ...parameters, [key]: value });
  };

  const updateVaseParam = <K extends keyof VaseParameters>(key: K, value: VaseParameters[K]) => {
    onVaseChange({ ...vaseParameters, [key]: value });
  };

  const updateLampParam = <K extends keyof LampParameters>(key: K, value: LampParameters[K]) => {
    onLampChange({ ...lampParameters, [key]: value });
  };

  // Render Material Section (shared across all models)
  const renderMaterialGrid = () => (
    <div className="control-group" style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '20px' }}>
      <h3 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--accent-gold)', letterSpacing: '0.5px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Palette size={14} />
        3. PBR Studio Material
      </h3>
      
      {/* 📐 CAD Cross-section clipping toggle */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', background: 'rgba(255, 255, 255, 0.02)', padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--glass-border)' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500 }}>
          📐 Cross-Section Slice
        </span>
        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={clippingEnabled}
            onChange={(e) => onClippingToggle(e.target.checked)}
            style={{ cursor: 'pointer', accentColor: 'var(--accent-gold)' }}
          />
          <span style={{ fontSize: '0.75rem', marginLeft: '6px', color: 'var(--text-primary)', fontWeight: 600 }}>Show Wall Width</span>
        </label>
      </div>
      <div className="material-grid">
        {materialsList.map((mat) => (
          <button
            key={mat.id}
            className={`material-btn ${materialType === mat.id ? 'active' : ''}`}
            onClick={() => onMaterialChange(mat.id)}
          >
            <div className={`material-sphere ${mat.class}`} />
            <span className="material-name">{mat.name}</span>
          </button>
        ))}
      </div>
    </div>
  );

  // 1. Render Jewelry Ring Controls
  const renderRingControls = () => (
    <>
      {/* Section 1: Dimensions */}
      <div className="control-group">
        <h3 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--accent-gold)', letterSpacing: '0.5px', marginBottom: '8px' }}>
          1. Dimensions
        </h3>
        
        <div className="control-group">
          <div className="control-label">
            <span>Inner Size (Diameter)</span>
            <span className="control-value">{parameters.innerDiameter.toFixed(1)} mm</span>
          </div>
          <input
            type="range"
            min="13.0"
            max="24.0"
            step="0.1"
            value={parameters.innerDiameter}
            onChange={(e) => updateRingParam('innerDiameter', parseFloat(e.target.value))}
          />
        </div>

        <div className="control-group">
          <div className="control-label">
            <span>Band Width (Height)</span>
            <span className="control-value">{parameters.width.toFixed(1)} mm</span>
          </div>
          <input
            type="range"
            min="1.5"
            max="12.0"
            step="0.1"
            value={parameters.width}
            onChange={(e) => updateRingParam('width', parseFloat(e.target.value))}
          />
        </div>

        <div className="control-group">
          <div className="control-label">
            <span>Wall Thickness</span>
            <span className="control-value">{parameters.thickness.toFixed(2)} mm</span>
          </div>
          <input
            type="range"
            min="1.0"
            max="3.5"
            step="0.05"
            value={parameters.thickness}
            onChange={(e) => updateRingParam('thickness', parseFloat(e.target.value))}
          />
        </div>
      </div>

      {/* Section 2: Band Profiling & Finishing */}
      <div className="control-group" style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '20px' }}>
        <h3 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--accent-gold)', letterSpacing: '0.5px', marginBottom: '8px' }}>
          2. Contour & Finishing
        </h3>

        <div className="control-group">
          <span className="control-label">Cross-section Profile</span>
          <select
            className="premium-select"
            value={parameters.bandShape}
            onChange={(e) => updateRingParam('bandShape', e.target.value as any)}
          >
            <option value="domed">Domed Profile (Classic Rounded)</option>
            <option value="flat">Flat Profile (Modern Sleek)</option>
            <option value="comfort">Comfort-Fit (Soft Rounded Inner)</option>
            <option value="wavy">Wavy Wave Profile (Sine Flow)</option>
            <option value="faceted">Faceted Geometry (Low-Poly AAA)</option>
          </select>
        </div>

        <div className="control-group">
          <span className="control-label">Surface Texture</span>
          <select
            className="premium-select"
            value={parameters.texture}
            onChange={(e) => updateRingParam('texture', e.target.value as any)}
          >
            <option value="polished">High-Gloss Polished</option>
            <option value="hammered">Hammered Metal (Organic Divots)</option>
            <option value="ribbed">Ribbed Ridges (Linear Flares)</option>
            <option value="grooved">Center Groove Channel</option>
          </select>
        </div>

        {parameters.texture !== 'polished' && (
          <>
            <div className="control-group">
              <div className="control-label">
                <span>Texture Frequency</span>
                <span className="control-value">{parameters.textureFrequency}</span>
              </div>
              <input
                type="range"
                min="2"
                max="24"
                step="1"
                value={parameters.textureFrequency}
                onChange={(e) => updateRingParam('textureFrequency', parseInt(e.target.value))}
              />
            </div>

            <div className="control-group">
              <div className="control-label">
                <span>Texture Depth (3D Displacement)</span>
                <span className="control-value">{parameters.textureDepth.toFixed(2)} mm</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.80"
                step="0.05"
                value={parameters.textureDepth}
                onChange={(e) => updateRingParam('textureDepth', parseFloat(e.target.value))}
              />
            </div>
          </>
        )}
      </div>

      {renderMaterialGrid()}

      {/* Section 4: Gemstones Config */}
      <div className="control-group" style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h3 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--accent-gold)', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Gem size={14} />
            4. Gemstone Setting
          </h3>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={parameters.hasGemstone}
              onChange={(e) => updateRingParam('hasGemstone', e.target.checked)}
              style={{ cursor: 'pointer', accentColor: 'var(--accent-gold)' }}
            />
            <span style={{ fontSize: '0.8rem', marginLeft: '6px', color: 'var(--text-secondary)' }}>Solitaire Mount</span>
          </label>
        </div>

        {parameters.hasGemstone && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="control-group">
              <div className="control-label">
                <span>Gemstone Dimension</span>
                <span className="control-value">{parameters.gemSize.toFixed(1)} mm</span>
              </div>
              <input
                type="range"
                min="2.0"
                max="7.0"
                step="0.2"
                value={parameters.gemSize}
                onChange={(e) => updateRingParam('gemSize', parseFloat(e.target.value))}
              />
            </div>

            <div className="control-group">
              <span className="control-label">Facet Cut Style</span>
              <select
                className="premium-select"
                value={parameters.gemShape}
                onChange={(e) => updateRingParam('gemShape', e.target.value as any)}
              >
                <option value="brilliant">Round Brilliant Cut (Faceted)</option>
                <option value="princess">Princess Cushion Cut (Square Pyramidal)</option>
                <option value="emerald">Octagonal Step Cut</option>
              </select>
            </div>

            <div className="control-group">
              <span className="control-label">Mineral Type & Color</span>
              <select
                className="premium-select"
                value={parameters.gemColor}
                onChange={(e) => updateRingParam('gemColor', e.target.value as any)}
              >
                <option value="diamond">Brilliant D-Color Diamond</option>
                <option value="ruby">Pigeon Blood Ruby (Corundum)</option>
                <option value="sapphire">Royal Blue Sapphire (Corundum)</option>
                <option value="emerald">Vibrant Green Emerald (Beryl)</option>
                <option value="amethyst">Deep Purple Amethyst (Quartz)</option>
              </select>
            </div>

            <div className="control-group">
              <span className="control-label">Prong Setting Type</span>
              <select
                className="premium-select"
                value={parameters.prongCount}
                onChange={(e) => updateRingParam('prongCount', parseInt(e.target.value) as any)}
              >
                <option value={4}>4-Claw Prong Mount</option>
                <option value={6}>6-Claw Crown Prong Mount</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </>
  );

  // 2. Render Parametric Vase Controls
  const renderVaseControls = () => (
    <>
      <div className="control-group">
        <h3 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--accent-gold)', letterSpacing: '0.5px', marginBottom: '8px' }}>
          1. Shell Dimensions
        </h3>
        
        <div className="control-group">
          <div className="control-label">
            <span>Vase Height</span>
            <span className="control-value">{vaseParameters.height} mm</span>
          </div>
          <input
            type="range"
            min="60"
            max="160"
            step="1"
            value={vaseParameters.height}
            onChange={(e) => updateVaseParam('height', parseInt(e.target.value))}
          />
        </div>

        <div className="control-group">
          <div className="control-label">
            <span>Base Radius</span>
            <span className="control-value">{vaseParameters.baseRadius} mm</span>
          </div>
          <input
            type="range"
            min="20"
            max="55"
            step="1"
            value={vaseParameters.baseRadius}
            onChange={(e) => updateVaseParam('baseRadius', parseInt(e.target.value))}
          />
        </div>

        <div className="control-group">
          <div className="control-label">
            <span>Wall Thickness</span>
            <span className="control-value">{vaseParameters.wallThickness.toFixed(1)} mm</span>
          </div>
          <input
            type="range"
            min="1.2"
            max="3.5"
            step="0.1"
            value={vaseParameters.wallThickness}
            onChange={(e) => updateVaseParam('wallThickness', parseFloat(e.target.value))}
          />
        </div>
      </div>

      <div className="control-group" style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '20px' }}>
        <h3 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--accent-gold)', letterSpacing: '0.5px', marginBottom: '8px' }}>
          2. Silhouette & Folds
        </h3>

        <div className="control-group">
          <span className="control-label">Vase Profile Shape</span>
          <select
            className="premium-select"
            value={vaseParameters.profileStyle}
            onChange={(e) => updateVaseParam('profileStyle', e.target.value as any)}
          >
            <option value="classic">Classic Fluted Profile (Bulbous Waves)</option>
            <option value="modern">Modern Geometric Profile (Linear Taper)</option>
            <option value="hourglass">Hourglass Profile (Narrow Pinch Waist)</option>
            <option value="flared">Dramatic Flared Profile (Trumpet Sweep)</option>
          </select>
        </div>

        {vaseParameters.profileStyle === 'classic' && (
          <>
            <div className="control-group">
              <div className="control-label">
                <span>Sine Wave Amplitude</span>
                <span className="control-value">{vaseParameters.bulbousAmplitude} mm</span>
              </div>
              <input
                type="range"
                min="0"
                max="16"
                step="1"
                value={vaseParameters.bulbousAmplitude}
                onChange={(e) => updateVaseParam('bulbousAmplitude', parseInt(e.target.value))}
              />
            </div>

            <div className="control-group">
              <div className="control-label">
                <span>Profile Ripple Frequency</span>
                <span className="control-value">{vaseParameters.bulbousFrequency}</span>
              </div>
              <input
                type="range"
                min="1"
                max="6"
                step="1"
                value={vaseParameters.bulbousFrequency}
                onChange={(e) => updateVaseParam('bulbousFrequency', parseInt(e.target.value))}
              />
            </div>
          </>
        )}

        <div className="control-group">
          <div className="control-label">
            <span>Helical Spiral Twist</span>
            <span className="control-value">{Math.round((vaseParameters.helicalTwist * 180) / Math.PI)}°</span>
          </div>
          <input
            type="range"
            min="0"
            max="6.28"
            step="0.05"
            value={vaseParameters.helicalTwist}
            onChange={(e) => updateVaseParam('helicalTwist', parseFloat(e.target.value))}
          />
        </div>
      </div>

      <div className="control-group" style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '20px' }}>
        <span className="control-label">Vase Texture</span>
        <select
          className="premium-select"
          value={vaseParameters.texture}
          onChange={(e) => updateVaseParam('texture', e.target.value as any)}
        >
          <option value="polished">High-Gloss Polished</option>
          <option value="hammered">Hammered Facets</option>
          <option value="ribbed">Ribbed Folds</option>
        </select>
      </div>

      <div className="control-group" style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '20px' }}>
        <span className="control-label">Structural Pattern</span>
        <select
          className="premium-select"
          value={vaseParameters.pattern}
          onChange={(e) => updateVaseParam('pattern', e.target.value as any)}
        >
          <option value="none">Solid Wall (No cutouts)</option>
          <option value="slots">Vertical Cutout Slots</option>
          <option value="perforated">Circular Grid Perforations</option>
          <option value="voronoi">Organic Voronoi Web Struts</option>
          <option value="lattice">Diamond Lattice Grid</option>
          <option value="spiral">Helical Spiral Bands</option>
        </select>
      </div>

      {(vaseParameters.texture !== 'polished' || vaseParameters.pattern !== 'none') && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
          <div className="control-group">
            <div className="control-label">
              <span>
                {vaseParameters.pattern !== 'none'
                  ? vaseParameters.texture !== 'polished'
                    ? 'Pattern & Texture Frequency'
                    : 'Pattern Frequency'
                  : 'Texture Frequency'}
              </span>
              <span className="control-value">{vaseParameters.textureFrequency}</span>
            </div>
            <input
              type="range"
              min="8"
              max="28"
              step="1"
              value={vaseParameters.textureFrequency}
              onChange={(e) => updateVaseParam('textureFrequency', parseInt(e.target.value))}
            />
          </div>

          <div className="control-group">
            <div className="control-label">
              <span>
                {vaseParameters.pattern !== 'none'
                  ? vaseParameters.texture !== 'polished'
                    ? 'Pattern & Texture Scale'
                    : 'Pattern Scale'
                  : 'Texture Scale Factor'}
              </span>
              <span className="control-value">{vaseParameters.textureScale.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.5"
              step="0.1"
              value={vaseParameters.textureScale}
              onChange={(e) => updateVaseParam('textureScale', parseFloat(e.target.value))}
            />
          </div>

          {vaseParameters.texture !== 'polished' && (
            <div className="control-group">
              <div className="control-label">
                <span>Texture Depth</span>
                <span className="control-value">{vaseParameters.textureDepth.toFixed(2)} mm</span>
              </div>
              <input
                type="range"
                min="0.10"
                max="1.50"
                step="0.05"
                value={vaseParameters.textureDepth}
                onChange={(e) => updateVaseParam('textureDepth', parseFloat(e.target.value))}
              />
            </div>
          )}
        </div>
      )}

      {renderMaterialGrid()}
    </>
  );

  // 3. Render Parametric Lamp Shade Controls
  const renderLampControls = () => (
    <>
      <div className="control-group">
        <h3 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--accent-gold)', letterSpacing: '0.5px', marginBottom: '8px' }}>
          1. Shade Dimensions
        </h3>
        
        <div className="control-group">
          <div className="control-label">
            <span>Shade Height</span>
            <span className="control-value">{lampParameters.height} mm</span>
          </div>
          <input
            type="range"
            min="70"
            max="180"
            step="1"
            value={lampParameters.height}
            onChange={(e) => updateLampParam('height', parseInt(e.target.value))}
          />
        </div>

        <div className="control-group">
          <div className="control-label">
            <span>Top Radius (Crown)</span>
            <span className="control-value">{lampParameters.topRadius} mm</span>
          </div>
          <input
            type="range"
            min="12"
            max="45"
            step="1"
            value={lampParameters.topRadius}
            onChange={(e) => updateLampParam('topRadius', parseInt(e.target.value))}
          />
        </div>

        <div className="control-group">
          <div className="control-label">
            <span>Bottom Radius (Rim)</span>
            <span className="control-value">{lampParameters.bottomRadius} mm</span>
          </div>
          <input
            type="range"
            min="25"
            max="75"
            step="1"
            value={lampParameters.bottomRadius}
            onChange={(e) => updateLampParam('bottomRadius', parseInt(e.target.value))}
          />
        </div>
      </div>

      <div className="control-group" style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '20px' }}>
        <h3 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--accent-gold)', letterSpacing: '0.5px', marginBottom: '8px' }}>
          2. Pleated Folding
        </h3>

        <div className="control-group">
          <span className="control-label">Shade Profile Contour</span>
          <select
            className="premium-select"
            value={lampParameters.profileStyle}
            onChange={(e) => updateLampParam('profileStyle', e.target.value as any)}
          >
            <option value="straight">Straight Conical Shade</option>
            <option value="flared">Bell Flared Shade</option>
            <option value="hourglass">Hourglass Waist Shade</option>
          </select>
        </div>

        <div className="control-group">
          <div className="control-label">
            <span>Accordion Pleat Count</span>
            <span className="control-value">{lampParameters.pleatCount} folds</span>
          </div>
          <input
            type="range"
            min="8"
            max="36"
            step="1"
            value={lampParameters.pleatCount}
            onChange={(e) => updateLampParam('pleatCount', parseInt(e.target.value))}
          />
        </div>

        <div className="control-group">
          <div className="control-label">
            <span>Pleat Depth</span>
            <span className="control-value">{lampParameters.pleatDepth.toFixed(1)} mm</span>
          </div>
          <input
            type="range"
            min="0"
            max="7.0"
            step="0.2"
            value={lampParameters.pleatDepth}
            onChange={(e) => updateLampParam('pleatDepth', parseFloat(e.target.value))}
          />
        </div>
      </div>

      <div className="control-group" style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '20px' }}>
        <h3 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--accent-gold)', letterSpacing: '0.5px', marginBottom: '8px' }}>
          3. Geometric Cutouts (Holes)
        </h3>

        <div className="control-group">
          <div className="control-label">
            <span>Ventilation Slot Count</span>
            <span className="control-value">{lampParameters.slotCount} slots</span>
          </div>
          <input
            type="range"
            min="0"
            max="12"
            step="1"
            value={lampParameters.slotCount}
            onChange={(e) => updateLampParam('slotCount', parseInt(e.target.value))}
          />
        </div>

        {lampParameters.slotCount > 0 && (
          <div className="control-group">
            <div className="control-label">
              <span>Cutout Width (Angle)</span>
              <span className="control-value">{(lampParameters.slotWidthAngle).toFixed(2)} rad</span>
            </div>
            <input
              type="range"
              min="0.04"
              max="0.28"
              step="0.01"
              value={lampParameters.slotWidthAngle}
              onChange={(e) => updateLampParam('slotWidthAngle', parseFloat(e.target.value))}
            />
          </div>
        )}
      </div>

      {renderMaterialGrid()}
    </>
  );

  return (
    <div className="sidebar-panel">
      <div className="panel-header">
        <h2 className="panel-title">
          <Sliders size={18} />
          Parametric Configurator
        </h2>
      </div>

      <div className="panel-content">
        {/* Closed-loop Print-Safe CAD Optimizer Toggle */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.12) 0%, rgba(184, 134, 11, 0.02) 100%)',
          padding: '12px 14px',
          borderRadius: '8px',
          border: '1px solid rgba(212, 175, 55, 0.35)',
          marginBottom: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--accent-gold)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', letterSpacing: '0.5px' }}>
              ⚡ PRINT-SAFE CAD OPTIMIZER
            </span>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={
                  activeModel === 'ring' ? parameters.printSafeEnabled :
                  activeModel === 'vase' ? vaseParameters.printSafeEnabled :
                  lampParameters.printSafeEnabled
                }
                onChange={(e) => {
                  const val = e.target.checked;
                  if (activeModel === 'ring') {
                    updateRingParam('printSafeEnabled', val);
                  } else if (activeModel === 'vase') {
                    updateVaseParam('printSafeEnabled', val);
                  } else {
                    updateLampParam('printSafeEnabled', val);
                  }
                }}
                style={{ cursor: 'pointer', accentColor: 'var(--accent-gold)' }}
              />
              <span style={{ fontSize: '0.75rem', marginLeft: '6px', color: '#fff', fontWeight: 600 }}>Active</span>
            </label>
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: '1.3' }}>
            Closed-loop solver: Mathematically limits overhang slopes to &le; 45°, widens base stability, and clamps wall thicknesses to printer nozzle multiples.
          </span>
        </div>

        {activeModel === 'ring' && renderRingControls()}
        {activeModel === 'vase' && renderVaseControls()}
        {activeModel === 'lamp' && renderLampControls()}
      </div>
    </div>
  );
};
