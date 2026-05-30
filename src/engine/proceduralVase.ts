import * as THREE from 'three';

export interface VaseParameters {
  height: number;           // 50 to 180 mm
  baseRadius: number;       // 15 to 60 mm
  wallThickness: number;    // 1.2 to 4.0 mm
  bulbousAmplitude: number; // 0 to 20 mm (sine flare)
  bulbousFrequency: number; // 1 to 8 (sine waves along height)
  helicalTwist: number;     // 0 to 6.28 rad (360 degrees twist)
  texture: 'polished' | 'hammered' | 'ribbed';
  textureFrequency: number; // 6 to 30
  textureDepth: number;     // 0 to 1.5 mm
  pattern: 'none' | 'slots' | 'perforated' | 'voronoi' | 'lattice' | 'spiral'; // New structural patterns!
  profileStyle: 'classic' | 'modern' | 'hourglass' | 'flared'; // New parametric shapes!
  textureScale: number; // New texture coordinate scaling factor!
  printSafeEnabled: boolean; // Closed-loop Print-Safe CAD optimization!
}

export function generateVaseGeometry(params: VaseParameters): THREE.BufferGeometry {
  const {
    height,
    baseRadius,
    wallThickness: rawWallThickness,
    bulbousAmplitude,
    bulbousFrequency,
    helicalTwist,
    texture,
    textureFrequency,
    textureDepth,
    pattern,
    profileStyle,
    textureScale,
    printSafeEnabled
  } = params;

  // Real-time wall thickness optimization
  const wallThickness = printSafeEnabled 
    ? Math.max(1.2, Math.round(rawWallThickness / 0.4) * 0.4) 
    : rawWallThickness;

  const radialSegments = 72; // highly subdivided to resolve voronoi curves
  const heightSegments = 80;
  
  const vertices: number[] = [];
  const indices: number[] = [];
  const uvs: number[] = [];
  const normals: number[] = [];

  // Helper for hammered texture
  const getHammeredNoise = (theta: number, y: number) => {
    const f = textureFrequency * textureScale;
    const val1 = Math.sin(theta * f) * Math.cos((y / height) * f * 2.5);
    const val2 = Math.sin(theta * f * 1.8 + 1.0) * Math.cos((y / height) * f * 1.5);
    return 0.6 * val1 + 0.4 * val2;
  };

  // 1. Precalculate optimized profile radii with slope limiting and brim flared foot stability
  const profileRadii: number[] = [];
  let prevR = baseRadius;

  if (printSafeEnabled && baseRadius / height < 0.25) {
    // Automatically widen initial base if it would easily tip over on build plate
    prevR = Math.max(baseRadius, height * 0.25);
  }

  for (let h = 0; h <= heightSegments; h++) {
    const v = h / heightSegments;
    let rVal = baseRadius;

    if (profileStyle === 'classic') {
      const wave = Math.sin(v * Math.PI * bulbousFrequency);
      const taper = 1.0 - 0.3 * Math.sin(v * Math.PI * 0.8) + 0.15 * Math.pow(v, 3);
      rVal = (baseRadius + bulbousAmplitude * wave) * taper;
    } else if (profileStyle === 'modern') {
      const taper = 1.0 - 0.4 * v + 0.3 * Math.pow(v, 4);
      rVal = baseRadius * taper;
    } else if (profileStyle === 'hourglass') {
      const pinch = 1.0 - 0.45 * Math.sin(v * Math.PI) + 0.25 * Math.pow(v, 3);
      rVal = baseRadius * pinch;
    } else if (profileStyle === 'flared') {
      const flare = 1.0 - 0.2 * Math.sin(v * Math.PI * 0.5) + 0.9 * Math.pow(v, 5);
      rVal = baseRadius * flare;
    }

    if (printSafeEnabled) {
      // closed-loop overhang slope limiting
      // step vertical size is height/heightSegments. We lock dRadius/dy <= 0.9 (approx 42 degrees overhang)
      const yStep = height / heightSegments;
      if (h > 0) {
        const rDiff = rVal - prevR;
        const maxDelta = yStep * 0.90; // perfectly safe FDM support-free limit
        if (rDiff > maxDelta) {
          rVal = prevR + maxDelta;
        } else if (rDiff < -maxDelta) {
          rVal = prevR - maxDelta;
        }
      }

      // closed-loop base stability brim pedestal
      const baseThresh = height * 0.25;
      if (baseRadius < baseThresh && v < 0.12) {
        const brimAmt = baseThresh - baseRadius;
        const blendFactor = Math.pow(1.0 - (v / 0.12), 2); // quadratic dropoff
        rVal += brimAmt * blendFactor;
      }
    }

    profileRadii.push(rVal);
    prevR = rVal;
  }

  // Helper to interpolate radii at any arbitrary height ratio
  const getInterpolatedRadius = (v: number): number => {
    const idxFloat = v * heightSegments;
    const idx0 = Math.max(0, Math.min(heightSegments, Math.floor(idxFloat)));
    const idx1 = Math.max(0, Math.min(heightSegments, Math.ceil(idxFloat)));
    const t = idxFloat - idx0;
    return (1 - t) * profileRadii[idx0] + t * profileRadii[idx1];
  };

  // 2. Mathematically evaluate if a grid coordinate (h, r) is a hole
  const checkHole = (h: number, r: number): boolean => {
    // Keep solid margins: base bottom (h < 4) and top rim (h > heightSegments - 4)
    if (h <= 4 || h >= heightSegments - 3) return false;

    const u = r / radialSegments;
    const v = h / heightSegments;

    if (pattern === 'slots') {
      // Scale slot count dynamically based on textureFrequency and textureScale
      const slotCount = Math.max(2, Math.round((textureFrequency * textureScale) / 2));
      const localU = (u * slotCount) % 1;
      return localU < 0.20; // 20% slot cutout width
    }

    if (pattern === 'perforated') {
      // Grid of circular holes scaled dynamically
      const freqU = Math.max(4, Math.round(textureFrequency * textureScale));
      const freqV = Math.max(3, Math.round(freqU * 0.8));
      const uc = Math.round(u * freqU) / freqU;
      const vc = Math.round(v * freqV) / freqV;
      
      // Cylindrical wrapping in U
      let diffU = Math.abs(u - uc);
      if (diffU > 0.5) diffU = 1.0 - diffU;
      const du = diffU * freqU;
      const dv = (v - vc) * freqV;
      
      return Math.sqrt(du*du + dv*dv) < 0.35; // Circular cutout
    }

    if (pattern === 'voronoi') {
      // Procedural organic cell strut networks scaled dynamically
      const cols = Math.max(2, Math.round((textureFrequency * textureScale) / 2.4));
      const rows = Math.max(3, Math.round(cols * 1.8));
      const cellCol = Math.floor(u * cols);
      const cellRow = Math.floor(v * rows);
      
      let minDist1 = 999;
      let minDist2 = 999;
      
      // Look at 3x3 surrounding sites to find nearest two
      for (let dc = -1; dc <= 1; dc++) {
        for (let dr = -1; dr <= 1; dr++) {
          const neighborCol = (cellCol + dc + cols) % cols;
          const neighborRow = cellRow + dr;
          if (neighborRow < 0 || neighborRow >= rows) continue;
          
          // Site coordinate shifted dynamically to create organic voronoi irregularity
          const siteU = (neighborCol + 0.5 + 0.3 * Math.sin(neighborCol * 2.3 + neighborRow * 1.7)) / cols;
          const siteV = (neighborRow + 0.5 + 0.3 * Math.cos(neighborCol * 1.2 + neighborRow * 2.9)) / rows;
          
          let diffU = Math.abs(u - siteU);
          if (diffU > 0.5) diffU = 1.0 - diffU;
          const diffV = v - siteV;
          
          const dist = Math.sqrt(diffU*diffU + diffV*diffV);
          
          if (dist < minDist1) {
            minDist2 = minDist1;
            minDist1 = dist;
          } else if (dist < minDist2) {
            minDist2 = dist;
          }
        }
      }
      
      // Strut thickness threshold scaled proportionally to maintain relative thickness
      const strutThreshold = 0.275 / cols;
      return (minDist2 - minDist1) > strutThreshold;
    }

    if (pattern === 'lattice') {
      // Diamond lattice cross-hatching pattern scaled dynamically
      const freqU = Math.max(4, Math.round(textureFrequency * textureScale));
      const freqV = Math.max(3, Math.round(freqU * 0.8));
      const val1 = Math.abs((u * freqU + v * freqV) % 1.0 - 0.5);
      const val2 = Math.abs((u * freqU - v * freqV) % 1.0 - 0.5);
      return val1 > 0.16 && val2 > 0.16; // diamond cutouts are holes, lines are solid metal struts
    }

    if (pattern === 'spiral') {
      // Helical spiral cutout ribbons wrapping around the vase scaled dynamically
      const spiralCount = Math.max(1, Math.round((textureFrequency * textureScale) / 3));
      const twistFactor = 1.2;
      const rawVal = (u * spiralCount - v * spiralCount * twistFactor) % 1.0;
      const val = (rawVal + 1.0) % 1.0;
      return val < 0.22; // 22% spiral cutout ribbon
    }

    return false; // Solid
  };

  const baseThickness = Math.max(1.5, wallThickness * 1.2);
  const stride = radialSegments + 1;

  // A. Generate Outer Wall (sweeping upwards)
  for (let h = 0; h <= heightSegments; h++) {
    const v = h / heightSegments;
    const y = v * height;
    const refRadius = profileRadii[h]; // Use our precalculated optimized profile array!
    const radiusOuter = refRadius + wallThickness / 2;
    const twist = helicalTwist * v;

    for (let r = 0; r <= radialSegments; r++) {
      const u = r / radialSegments;
      const theta = u * Math.PI * 2 + twist;

      let displacement = 0;
      if (y > height * 0.05 && y < height * 0.95) {
        if (texture === 'hammered') {
          displacement = getHammeredNoise(theta, y) * textureDepth;
        } else if (texture === 'ribbed') {
          displacement = Math.sin(theta * textureFrequency * textureScale) * textureDepth * 0.5;
        }
      }

      const rad = Math.max(2.0, radiusOuter + displacement);
      const x = rad * Math.cos(theta);
      const z = rad * Math.sin(theta);

      vertices.push(x, y, z);
      uvs.push(u, v);
      normals.push(Math.cos(theta), 0.0, Math.sin(theta));
    }
  }

  // B. Generate Inner Wall (sweeping upwards)
  const innerStartIdx = vertices.length / 3;

  for (let h = 0; h <= heightSegments; h++) {
    const v = h / heightSegments;
    const y = baseThickness + (height - baseThickness) * v; // from floor to rim
    const refRadius = getInterpolatedRadius(y / height); // Internally interpolate optimized profile!
    const radiusInner = Math.max(1.0, refRadius - wallThickness / 2);
    const twist = helicalTwist * v;

    for (let r = 0; r <= radialSegments; r++) {
      const u = r / radialSegments;
      const theta = u * Math.PI * 2 + twist;

      const x = radiusInner * Math.cos(theta);
      const z = radiusInner * Math.sin(theta);

      vertices.push(x, y, z);
      uvs.push(u, v);
      normals.push(-Math.cos(theta), 0.0, -Math.sin(theta));
    }
  }

  // C. Build Watertight Geometries using our cellular boundary-solving algorithm
  for (let h = 0; h < heightSegments; h++) {
    for (let r = 0; r < radialSegments; r++) {
      const nextR = r + 1;

      // Check hole states
      const currInHole = checkHole(h, r);
      const rightInHole = checkHole(h, nextR);
      const upInHole = checkHole(h + 1, r);

      // Vertices indices mapping
      const o00 = h * stride + r;
      const o10 = (h + 1) * stride + r;
      const o01 = h * stride + nextR;
      const o11 = (h + 1) * stride + nextR;

      const i00 = innerStartIdx + h * stride + r;
      const i10 = innerStartIdx + (h + 1) * stride + r;
      const i01 = innerStartIdx + h * stride + nextR;
      const i11 = innerStartIdx + (h + 1) * stride + nextR;

      // 1. If this quad is inside a hole, we skip the wall geometry
      if (currInHole) {
        // Bridge boundary if neighboring cell is solid!
        if (!rightInHole) {
          // Right edge of hole is solid, bridge it!
          indices.push(o01, i01, o11);
          indices.push(i01, i11, o11);
        }
        if (!upInHole) {
          // Top edge of hole is solid, bridge it!
          indices.push(o10, o11, i10);
          indices.push(i10, o11, i11);
        }
        continue;
      }

      // 2. Quad is solid metal. Generate standard walls
      // Outer wall (Wound CCW to point OUTWARDS!)
      indices.push(o00, o10, o01);
      indices.push(o10, o11, o01);

      // Inner wall (Wound CW to point INWARDS!)
      indices.push(i00, i01, i10);
      indices.push(i01, i11, i10);

      // 3. Bridge boundaries if solid neighbors a hole!
      if (rightInHole) {
        // Right cell is hole, bridge outer and inner walls along right edge (o01->o11 to i01->i11)
        indices.push(o01, o11, i01);
        indices.push(i01, o11, i11);
      }
      if (upInHole) {
        // Up cell is hole, bridge along top edge (o10->o11 to i10->i11)
        indices.push(o10, i10, o11);
        indices.push(i10, i11, o11);
      }
    }
  }

  // D. Bridge Top Rim Cap (only at solid segments)
  const outerTopOffset = heightSegments * stride;
  const innerTopOffset = innerStartIdx + heightSegments * stride;

  for (let r = 0; r < radialSegments; r++) {
    const nextR = r + 1;
    if (checkHole(heightSegments - 1, r) && checkHole(heightSegments - 1, nextR)) {
      continue;
    }

    const oTop0 = outerTopOffset + r;
    const oTop1 = outerTopOffset + nextR;
    const iTop0 = innerTopOffset + r;
    const iTop1 = innerTopOffset + nextR;

    // Rim faces
    indices.push(oTop0, oTop1, iTop0);
    indices.push(oTop1, iTop1, iTop0);
  }

  // E. Bridge Bottom solid Base cap (close bottom disc)
  const outerBottomOffset = 0;
  const innerBottomOffset = innerStartIdx;

  // Outer base center vertex
  const centerBottomIdx = vertices.length / 3;
  vertices.push(0, 0, 0);
  normals.push(0, -1, 0);
  uvs.push(0.5, 0.5);

  for (let r = 0; r < radialSegments; r++) {
    const o0 = outerBottomOffset + r;
    const o1 = outerBottomOffset + r + 1;
    indices.push(centerBottomIdx, o1, o0);
  }

  // Inner floor center vertex
  const centerInnerFloorIdx = vertices.length / 3;
  vertices.push(0, baseThickness, 0);
  normals.push(0, 1, 0);
  uvs.push(0.5, 0.5);

  for (let r = 0; r < radialSegments; r++) {
    const i0 = innerBottomOffset + r;
    const i1 = innerBottomOffset + r + 1;
    indices.push(centerInnerFloorIdx, i0, i1);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);

  geometry.computeVertexNormals();

  return geometry;
}
