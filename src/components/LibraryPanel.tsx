import React, { useState } from 'react';
import { Search, Library, Plus, Code, Star } from 'lucide-react';
import type { RingParameters } from '../engine/proceduralRing';
import type { VaseParameters } from '../engine/proceduralVase';
import type { LampParameters } from '../engine/proceduralLamp';

interface LibraryItem {
  id: string;
  name: string;
  category: 'Jewelry' | 'Ornaments' | 'Lighting';
  modelType: 'ring' | 'vase' | 'lamp';
  author: string;
  rating: number;
  reviews: number;
  description: string;
  parameters: RingParameters | VaseParameters | LampParameters;
}

interface LibraryPanelProps {
  onLoadPreset: (modelType: 'ring' | 'vase' | 'lamp', params: any) => void;
  onLoadCustomGeometry: (customScript: string) => void;
}

const BUILT_IN_MODELS: LibraryItem[] = [
  // 1. Jewelry Preset Items
  {
    id: 'solitaire',
    name: 'Princess Solitaire Ring',
    category: 'Jewelry',
    modelType: 'ring',
    author: '3AID Studio',
    rating: 4.9,
    reviews: 142,
    description: 'Ultra-premium round brilliant solitaire diamond set in 4-claws on a high-polish comfortable 18K yellow gold band.',
    parameters: {
      innerDiameter: 16.5,
      thickness: 1.8,
      width: 2.8,
      bandShape: 'comfort',
      texture: 'polished',
      textureFrequency: 10,
      textureDepth: 0.2,
      hasGemstone: true,
      gemSize: 4.2,
      gemShape: 'brilliant',
      gemColor: 'diamond',
      prongCount: 4,
      printSafeEnabled: false
    } as RingParameters
  },
  {
    id: 'hammered_wavy',
    name: 'Hammered Wavy Band',
    category: 'Jewelry',
    modelType: 'ring',
    author: 'Elegance3D',
    rating: 4.8,
    reviews: 95,
    description: 'A flowing, sinusoidal wavy metallic band textured with organic 3D hammered facets that reflect light dynamically.',
    parameters: {
      innerDiameter: 18.0,
      thickness: 2.2,
      width: 4.5,
      bandShape: 'wavy',
      texture: 'hammered',
      textureFrequency: 14,
      textureDepth: 0.35,
      hasGemstone: false,
      gemSize: 3.0,
      gemShape: 'princess',
      gemColor: 'ruby',
      prongCount: 4,
      printSafeEnabled: false
    } as RingParameters
  },
  
  // 2. Ornaments/Vase Preset Items
  {
    id: 'wave_vase',
    name: 'Spiraled Fluted Wave Vase',
    category: 'Ornaments',
    modelType: 'vase',
    author: 'DesignDAO',
    rating: 4.8,
    reviews: 118,
    description: 'Bulbous fluid vase profile swept radially with vertical sinusoidal waves and a spiral helical twist, textured with ribbed folds.',
    parameters: {
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
    } as VaseParameters
  },
  {
    id: 'hammered_vase',
    name: 'Faceted Ceramic Bud Vase',
    category: 'Ornaments',
    modelType: 'vase',
    author: 'ClayForm3D',
    rating: 4.6,
    reviews: 57,
    description: 'Minimalist hourglass bud vase styled with heavy organic hammered metal/ceramic indents reflecting highlights.',
    parameters: {
      height: 100,
      baseRadius: 28,
      wallThickness: 2.0,
      bulbousAmplitude: 4,
      bulbousFrequency: 2,
      helicalTwist: 0.0,
      texture: 'hammered',
      textureFrequency: 12,
      textureDepth: 1.2,
      pattern: 'none',
      profileStyle: 'classic',
      textureScale: 1.0,
      printSafeEnabled: false
    } as VaseParameters
  },

  // 3. Lighting/Lamp Preset Items
  {
    id: 'origami_shade',
    name: 'Pleated Accordion Shade',
    category: 'Lighting',
    modelType: 'lamp',
    author: 'AuraLux',
    rating: 4.9,
    reviews: 83,
    description: ' Origami-pleated conical lamp shade with vertical cutout slots that project dramatic real-time shadows when lit.',
    parameters: {
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
    } as LampParameters
  }
];

const CUSTOM_SCRIPT_TEMPLATE = `// 3AID Parametric Sandbox Generator
// Returns a custom THREE.BufferGeometry
// Draw a Mathematical Wavy Mobius Ring Chassis!

const radialSegments = 160;
const tubularSegments = 30;
const radius = 10; // inner radius
const thickness = 2.0;

const vertices = [];
const indices = [];

// Parametric Mobius Sweep math
for (let j = 0; j <= radialSegments; j++) {
  const theta = (j / radialSegments) * Math.PI * 2;
  const cosTheta = Math.cos(theta);
  const sinTheta = Math.sin(theta);

  for (let i = 0; i <= tubularSegments; i++) {
    const v = (i / tubularSegments - 0.5) * thickness; // width sweep
    
    // Mobius twist angle
    const phi = theta / 2;
    const cosPhi = Math.cos(phi);
    const sinPhi = Math.sin(phi);

    // Toroidal Coordinates deforming with a Mobius twist
    const r = radius + v * cosPhi;
    const x = r * cosTheta;
    const y = r * sinTheta;
    const z = v * sinPhi + 1.2 * Math.sin(4 * theta); // Sine ripple

    vertices.push(x, y, z);
  }
}

// Generate watertight quad faces
const stride = tubularSegments + 1;
for (let j = 0; j < radialSegments; j++) {
  for (let i = 0; i < tubularSegments; i++) {
    const idx00 = j * stride + i;
    const idx10 = (j + 1) * stride + i;
    const idx01 = j * stride + (i + 1);
    const idx11 = (j + 1) * stride + (i + 1);

    indices.push(idx00, idx10, idx01);
    indices.push(idx10, idx11, idx01);
  }
}

// Build standard BufferGeometry
const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
geometry.setIndex(indices);
geometry.computeVertexNormals();

return geometry;`;

export const LibraryPanel: React.FC<LibraryPanelProps> = ({
  onLoadPreset,
  onLoadCustomGeometry
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeId, setActiveId] = useState('solitaire');
  const [customScript, setCustomScript] = useState(CUSTOM_SCRIPT_TEMPLATE);
  const [compileStatus, setCompileStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [compileError, setCompileError] = useState('');

  const filteredModels = BUILT_IN_MODELS.filter(model =>
    model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    model.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    model.author.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleLoadPresetItem = (item: LibraryItem) => {
    setActiveId(item.id);
    onLoadPreset(item.modelType, item.parameters);
  };

  const handleCompileCustomScript = () => {
    setCompileStatus('idle');
    setCompileError('');
    try {
      onLoadCustomGeometry(customScript);
      setCompileStatus('success');
      setActiveId('custom_sandbox');
    } catch (err: any) {
      console.error(err);
      setCompileStatus('error');
      setCompileError(err.message || 'Syntax error in parametric calculation.');
    }
  };

  return (
    <div className="sidebar-panel right">
      <div className="panel-header">
        <h2 className="panel-title">
          <Library size={18} />
          Procedural Library
        </h2>
      </div>

      <div className="panel-content">
        {/* Search Input */}
        <div className="library-search-container">
          <Search size={16} className="library-search-icon" />
          <input
            type="text"
            placeholder="Search Rings, Vases, Lamps..."
            className="library-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Model Catalog List divided by categories */}
        <div className="library-list">
          {filteredModels.map((item) => (
            <div
              key={item.id}
              className={`library-item ${activeId === item.id ? 'active' : ''}`}
              onClick={() => handleLoadPresetItem(item)}
            >
              <div className="lib-item-details">
                <span className="lib-item-name">{item.name}</span>
                <span className="lib-item-author" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--accent-gold)', padding: '1px 5px', borderRadius: '3px', fontSize: '0.65rem' }}>
                    {item.category}
                  </span>
                  By {item.author}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                <span className="lib-item-rating">
                  <Star size={12} fill="var(--accent-gold)" />
                  {item.rating.toFixed(1)}
                </span>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>({item.reviews})</span>
              </div>
            </div>
          ))}
          
          <div
            className={`library-item ${activeId === 'custom_sandbox' ? 'active' : ''}`}
            style={{ borderColor: 'rgba(163, 213, 255, 0.2)', background: 'rgba(163, 213, 255, 0.02)' }}
            onClick={() => setActiveId('custom_sandbox')}
          >
            <div className="lib-item-details">
              <span className="lib-item-name" style={{ color: '#a3d5ff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Code size={12} />
                Sandbox Procedural Script
              </span>
              <span className="lib-item-author">Custom math compiler</span>
            </div>
            <span style={{ fontSize: '0.7rem', color: '#a3d5ff', border: '1px solid rgba(163, 213, 255, 0.3)', padding: '2px 6px', borderRadius: '4px' }}>
              ACTIVE
            </span>
          </div>
        </div>

        {/* Sandbox JavaScript Code Editor */}
        <div className="sandbox-section">
          <h3 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--accent-gold)', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Code size={14} />
            JavaScript Equations Sandbox
          </h3>
          
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
            Write modular equations to construct custom, mathematically perfect 3D shapes. Standard Three.js variables (<code style={{color: '#a3d5ff'}}>THREE</code>) are fully accessible.
          </p>

          <textarea
            className="sandbox-code-area"
            value={customScript}
            onChange={(e) => setCustomScript(e.target.value)}
            spellCheck={false}
          />

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              className="btn btn-secondary"
              style={{ flexGrow: 1, borderColor: '#a3d5ff', color: '#a3d5ff', fontSize: '0.8rem', padding: '8px 12px' }}
              onClick={handleCompileCustomScript}
            >
              <Plus size={14} />
              Inject Sandbox Script
            </button>
          </div>

          {compileStatus === 'success' && (
            <div style={{ fontSize: '0.75rem', color: 'var(--color-success)', background: 'rgba(52, 199, 89, 0.1)', padding: '8px 12px', borderRadius: '6px', borderLeft: '3px solid var(--color-success)' }}>
              Procedural mesh successfully compiled and injected into Viewport!
            </div>
          )}

          {compileStatus === 'error' && (
            <div style={{ fontSize: '0.75rem', color: 'var(--color-danger)', background: 'rgba(255, 59, 48, 0.1)', padding: '8px 12px', borderRadius: '6px', borderLeft: '3px solid var(--color-danger)', wordBreak: 'break-word' }}>
              <strong>Compile Error:</strong> {compileError}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
