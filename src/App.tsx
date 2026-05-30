import React, { useState, useCallback, useEffect } from 'react';
import * as THREE from 'three';
import { Viewport3D } from './components/Viewport3D';
import { ControlsPanel } from './components/ControlsPanel';
import { LibraryPanel } from './components/LibraryPanel';
import { CheckerPanel } from './components/CheckerPanel';
import type { RingParameters } from './engine/proceduralRing';
import type { VaseParameters } from './engine/proceduralVase';
import type { LampParameters } from './engine/proceduralLamp';
import { analyzeGeometry } from './engine/stlChecker';
import type { STLAnalysisResults } from './engine/stlChecker';
import { exportToBinarySTL } from './engine/stlExporter';
import { Download, Layers } from 'lucide-react';

const App: React.FC = () => {
  // 1. Configurator Active Category State
  const [activeModel, setActiveModel] = useState<'ring' | 'vase' | 'lamp'>('ring');
  const [clippingEnabled, setClippingEnabled] = useState(false);

  // 2. Specialized Parametric Model States
  // A. Jewelry Ring
  const [parameters, setParameters] = useState<RingParameters>({
    innerDiameter: 16.5,
    thickness: 1.8,
    width: 3.2,
    bandShape: 'comfort',
    texture: 'polished',
    textureFrequency: 10,
    textureDepth: 0.2,
    hasGemstone: true,
    gemSize: 4.0,
    gemShape: 'brilliant',
    gemColor: 'diamond',
    prongCount: 4,
    printSafeEnabled: false
  });

  // B. Wave Vase
  const [vaseParameters, setVaseParameters] = useState<VaseParameters>({
    height: 120,
    baseRadius: 32,
    wallThickness: 1.6,
    bulbousAmplitude: 7,
    bulbousFrequency: 3,
    helicalTwist: 1.25,
    texture: 'ribbed',
    textureFrequency: 18,
    textureDepth: 0.8,
    pattern: 'none',
    profileStyle: 'classic',
    textureScale: 1.0,
    printSafeEnabled: false
  });

  // C. Pleated Lamp Shade
  const [lampParameters, setLampParameters] = useState<LampParameters>({
    height: 110,
    topRadius: 18,
    bottomRadius: 48,
    wallThickness: 1.5,
    profileStyle: 'flared',
    pleatCount: 20,
    pleatDepth: 4.0,
    slotCount: 8,
    slotWidthAngle: 0.12,
    printSafeEnabled: false
  });

  // D. Luxury material theme
  const [materialType, setMaterialType] = useState<
    'gold-yellow' | 'gold-rose' | 'platinum' | 'ceramic-white' | 'ceramic-black' | 'frosted-glass'
  >('gold-yellow');

  // Custom compiled geometry from Javascript Equations Sandbox
  const [customGeometry, setCustomGeometry] = useState<THREE.BufferGeometry | null>(null);

  // Active compiled buffer geometry for real-time STL checks & exports
  const [activeGeometry, setActiveGeometry] = useState<THREE.BufferGeometry | null>(null);

  // STL Checker Diagnostics States
  const [stlResults, setStlResults] = useState<STLAnalysisResults>({
    isWatertight: false,
    boundaryEdgesCount: 0,
    nonManifoldEdgesCount: 0,
    volume: 0,
    surfaceArea: 0,
    dimensions: { width: 0, height: 0, depth: 0 },
    vertexCount: 0,
    triangleCount: 0,
    materialsWeight: { pla: 0, silver: 0, gold14k: 0, gold18k: 0, platinum: 0 },
    printabilityRating: 'Critical',
    diagnostics: ['Analyzing workspace...'],
    overhangAreaPercent: 0,
    requiresSupports: false
  });

  // 3. Mesh Analysis Trigger (Optimized with a clean 120ms Debounce loop)
  // Ensures silky-smooth 60 FPS slider dragging by deferring CPU-heavy STL edge mapping
  const handleGeometryChange = useCallback((geometry: THREE.BufferGeometry) => {
    setActiveGeometry(geometry);
  }, []);

  useEffect(() => {
    if (!activeGeometry) return;

    const timer = setTimeout(() => {
      const analysis = analyzeGeometry(activeGeometry);
      setStlResults(analysis);
    }, 120);

    return () => clearTimeout(timer);
  }, [activeGeometry]);

  // 4. Custom Sandbox Mesh Evaluator
  const handleLoadCustomGeometry = (scriptText: string) => {
    try {
      const compileFn = new Function('THREE', scriptText);
      const compiledGeo = compileFn(THREE);

      if (compiledGeo && compiledGeo.isBufferGeometry) {
        setCustomGeometry(compiledGeo);
        // Force Category to Ring to stand as simple base coordinate mapping
        setActiveModel('ring');
        setParameters((prev) => ({
          ...prev,
          hasGemstone: false
        }));
      } else {
        throw new Error('Script compiled, but did not return a valid THREE.BufferGeometry instance.');
      }
    } catch (err: any) {
      throw new Error(err.message || 'Procedural compiling failed. Please check mathematical formulas.');
    }
  };

  // Resets sandbox geometry if user switches presets
  const handleLoadPreset = (modelType: 'ring' | 'vase' | 'lamp', presetParams: any) => {
    setCustomGeometry(null);
    setActiveModel(modelType);
    
    if (modelType === 'ring') {
      setParameters(presetParams);
    } else if (modelType === 'vase') {
      setVaseParameters(presetParams);
    } else if (modelType === 'lamp') {
      setLampParameters(presetParams);
    }
  };

  // 5. Binary STL Export Trigger
  const handleDownloadSTL = () => {
    if (!activeGeometry) return;
    
    const blob = exportToBinarySTL([activeGeometry]);
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    
    // Luxury branding file name
    const stylePrefix = customGeometry ? 'custom_sandbox' : activeModel;
    link.download = `3AID_parametric_${stylePrefix}_design.stl`;
    
    document.body.appendChild(link);
    link.click();
    
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="app-container">
      {/* 3AID Luxury Header */}
      <header className="app-header">
        <div className="brand-section">
          <div className="brand-logo">3AID</div>
          <div className="brand-tagline">AAA Parametric 3D Design Portal</div>
        </div>

        <div className="header-actions">
          {/* Real-time printability badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', background: 'rgba(255,255,255,0.02)', padding: '6px 14px', borderRadius: '20px', border: '1px solid var(--glass-border)' }}>
            <Layers size={14} style={{ color: 'var(--accent-gold)' }} />
            <span>Chassis Quality:</span>
            <strong style={{ 
              color: stlResults.printabilityRating === 'AAA' || stlResults.printabilityRating === 'Good' 
                ? 'var(--color-success)' 
                : stlResults.printabilityRating === 'Warning' 
                ? 'var(--color-warning)' 
                : 'var(--color-danger)'
            }}>
              {stlResults.printabilityRating === 'AAA' ? 'AAA (Watertight)' : stlResults.printabilityRating}
            </strong>
          </div>

          <button className="btn btn-primary" onClick={handleDownloadSTL} disabled={!activeGeometry}>
            <Download size={16} />
            Export STL Chassis
          </button>
        </div>
      </header>

      {/* Main Grid Viewport & Sidebar panels */}
      <main className="main-workspace">
        {/* Left Side Configurator controls */}
        <ControlsPanel
          parameters={parameters}
          onChange={(newParams) => {
            setCustomGeometry(null);
            setParameters(newParams);
          }}
          materialType={materialType}
          onMaterialChange={setMaterialType}
          activeModel={activeModel}
          vaseParameters={vaseParameters}
          onVaseChange={(params) => {
            setCustomGeometry(null);
            setVaseParameters(params);
          }}
          lampParameters={lampParameters}
          onLampChange={(params) => {
            setCustomGeometry(null);
            setLampParameters(params);
          }}
          clippingEnabled={clippingEnabled}
          onClippingToggle={setClippingEnabled}
        />

        {/* Center Canvas 3D Area */}
        <Viewport3D
          parameters={parameters}
          materialType={materialType}
          onGeometryChange={handleGeometryChange}
          customGeometry={customGeometry}
          activeModel={activeModel}
          vaseParameters={vaseParameters}
          lampParameters={lampParameters}
          clippingEnabled={clippingEnabled}
        />

        {/* Right Columns: Top is Library list, Bottom is STL Diagnostics checks */}
        <div className="sidebar-panel right" style={{ borderLeft: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ height: '52%', overflowY: 'auto' }}>
            <LibraryPanel
              onLoadPreset={handleLoadPreset}
              onLoadCustomGeometry={handleLoadCustomGeometry}
            />
          </div>
          <div style={{ height: '48%', display: 'flex', flexDirection: 'column' }}>
            <CheckerPanel results={stlResults} materialType={materialType} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
