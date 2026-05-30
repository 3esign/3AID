import * as THREE from 'three';

export interface LampParameters {
  height: number;           // 60 to 200 mm
  topRadius: number;        // 10 to 50 mm
  bottomRadius: number;     // 20 to 80 mm
  wallThickness: number;    // 1.2 to 3.5 mm
  profileStyle: 'straight' | 'flared' | 'hourglass';
  pleatCount: number;       // 8 to 40 (accordion pleat wrinkles)
  pleatDepth: number;       // 0 to 8 mm
  slotCount: number;        // 0 to 12 (number of vertical cutout holes)
  slotWidthAngle: number;   // 0 to 0.3 rad (width of the cutouts)
  printSafeEnabled: boolean; // Closed-loop Print-Safe CAD optimization!
}

export function generateLampGeometry(params: LampParameters): THREE.BufferGeometry {
  const {
    height,
    topRadius,
    bottomRadius,
    wallThickness: rawWallThickness,
    profileStyle,
    pleatCount,
    pleatDepth,
    slotCount,
    slotWidthAngle,
    printSafeEnabled
  } = params;

  // Real-time wall thickness optimization
  const wallThickness = printSafeEnabled 
    ? Math.max(1.2, Math.round(rawWallThickness / 0.4) * 0.4) 
    : rawWallThickness;

  const radialSegments = 72; // highly subdivided to resolve pleats
  const heightSegments = 30;

  const vertices: number[] = [];
  const indices: number[] = [];
  const uvs: number[] = [];
  const normals: number[] = [];

  // Precalculate optimized profile radii with slope limiting
  const profileRadii: number[] = [];
  let prevR = bottomRadius;

  for (let h = 0; h <= heightSegments; h++) {
    const v = h / heightSegments;
    let rVal = bottomRadius + (topRadius - bottomRadius) * v;

    if (profileStyle === 'flared') {
      rVal = bottomRadius + (topRadius - bottomRadius) * Math.pow(v, 2.5);
    } else if (profileStyle === 'hourglass') {
      const wave = 0.5 - 0.5 * Math.cos(v * Math.PI);
      rVal = bottomRadius + (topRadius - bottomRadius) * wave;
    }

    if (printSafeEnabled) {
      // closed-loop overhang slope limiting
      const yStep = height / heightSegments;
      if (h > 0) {
        const rDiff = rVal - prevR;
        const maxDelta = yStep * 0.90; // perfectly safe support-free 45-degree slope
        if (rDiff > maxDelta) {
          rVal = prevR + maxDelta;
        } else if (rDiff < -maxDelta) {
          rVal = prevR - maxDelta;
        }
      }
    }

    profileRadii.push(rVal);
    prevR = rVal;
  }

  // A column r is inside a slot if the angle theta lies within any slot window
  const isInsideSlot = (theta: number): boolean => {
    if (slotCount === 0 || slotWidthAngle <= 0.01) return false;
    
    const segmentAngle = (Math.PI * 2) / slotCount;
    const localAngle = theta % segmentAngle;
    
    // Check if within slot window centered at the segment midpoint
    const center = segmentAngle / 2;
    return Math.abs(localAngle - center) < slotWidthAngle / 2;
  };
  
  const stride = radialSegments + 1;
  const innerStartIdx = (heightSegments + 1) * stride;

  // A. Generate Grid Vertices
  for (let h = 0; h <= heightSegments; h++) {
    const v = h / heightSegments;
    const y = v * height;
    const refRadius = profileRadii[h]; // Use our precalculated optimized profile array!

    for (let r = 0; r <= radialSegments; r++) {
      const u = r / radialSegments;
      const theta = u * Math.PI * 2;

      // Apply Pleated Wrinkles
      const pleatDisplacement = Math.cos(theta * pleatCount) * pleatDepth;
      
      const rOuter = Math.max(2.0, refRadius + pleatDisplacement + wallThickness / 2);

      // Outer Vertex
      const xOuter = rOuter * Math.cos(theta);
      const zOuter = rOuter * Math.sin(theta);
      vertices.push(xOuter, y, zOuter);
      uvs.push(u, v);
      normals.push(Math.cos(theta), 0.1, Math.sin(theta));
    }
  }

  // B. Generate Inner Grid Vertices
  for (let h = 0; h <= heightSegments; h++) {
    const v = h / heightSegments;
    const y = v * height;
    const refRadius = profileRadii[h]; // Use our precalculated optimized profile array!

    for (let r = 0; r <= radialSegments; r++) {
      const u = r / radialSegments;
      const theta = u * Math.PI * 2;

      const pleatDisplacement = Math.cos(theta * pleatCount) * pleatDepth;
      const rInner = Math.max(1.0, refRadius + pleatDisplacement - wallThickness / 2);

      // Inner Vertex
      const xInner = rInner * Math.cos(theta);
      const zInner = rInner * Math.sin(theta);
      vertices.push(xInner, y, zInner);
      uvs.push(u, v);
      normals.push(-Math.cos(theta), -0.1, -Math.sin(theta));
    }
  }

  // C. Build Faces & Bridge Borders
  for (let h = 0; h < heightSegments; h++) {
    for (let r = 0; r < radialSegments; r++) {
      const thetaCurr = (r / radialSegments) * Math.PI * 2;
      const thetaNext = ((r + 1) / radialSegments) * Math.PI * 2;

      const currInSlot = isInsideSlot(thetaCurr);
      const nextInSlot = isInsideSlot(thetaNext);

      // 1. If BOTH points are inside the slot, we skip generating wall faces! (This creates the cutout holes)
      if (currInSlot && nextInSlot) {
        continue;
      }

      // Outer and Inner cell indices
      const o00 = h * stride + r;
      const o10 = (h + 1) * stride + r;
      const o01 = h * stride + (r + 1);
      const o11 = (h + 1) * stride + (r + 1);

      const i00 = innerStartIdx + h * stride + r;
      const i10 = innerStartIdx + (h + 1) * stride + r;
      const i01 = innerStartIdx + h * stride + (r + 1);
      const i11 = innerStartIdx + (h + 1) * stride + (r + 1);

      // 2. If BOTH are solid, generate standard outer & inner quads
      if (!currInSlot && !nextInSlot) {
        // Outer face (CCW)
        indices.push(o00, o01, o10);
        indices.push(o01, o11, o10);

        // Inner face (pointing inside)
        indices.push(i00, i10, i01);
        indices.push(i10, i11, i01);
        continue;
      }

      // 3. If transitioning: ONE is in slot, ONE is solid.
      // This forms the vertical slot edge! We must bridge the inner and outer walls here!
      if (!currInSlot && nextInSlot) {
        // Current column is solid, next is slot cutout.
        // We close the solid wall by bridging outer column r to inner column r!
        // Bridge outer column (o00 -> o10) to inner column (i00 -> i10)
        indices.push(o00, i00, o10);
        indices.push(i00, i10, o10);
      } else if (currInSlot && !nextInSlot) {
        // Current column is slot, next column is solid.
        // We close the solid wall by bridging outer column r+1 to inner column r+1!
        indices.push(o01, o11, i01);
        indices.push(i01, o11, i11);
      }
    }
  }

  // D. Bridge Top and Bottom Rim Caps (only where solid)
  // Top rim connects y=height (h=heightSegments) outer and inner walls
  // Bottom rim connects y=0 (h=0) outer and inner walls
  const outerTopOffset = heightSegments * stride;
  const innerTopOffset = innerStartIdx + heightSegments * stride;

  for (let r = 0; r < radialSegments; r++) {
    const thetaCurr = (r / radialSegments) * Math.PI * 2;
    const thetaNext = ((r + 1) / radialSegments) * Math.PI * 2;

    if (isInsideSlot(thetaCurr) && isInsideSlot(thetaNext)) {
      continue; // skip capping open slots
    }

    const oTop0 = outerTopOffset + r;
    const oTop1 = outerTopOffset + r + 1;
    const iTop0 = innerTopOffset + r;
    const iTop1 = innerTopOffset + r + 1;

    const oBot0 = r;
    const oBot1 = r + 1;
    const iBot0 = innerStartIdx + r;
    const iBot1 = innerStartIdx + r + 1;

    // Top Rim Cap
    indices.push(oTop0, oTop1, iTop0);
    indices.push(oTop1, iTop1, iTop0);

    // Bottom Rim Cap (seal bottom wall edges)
    indices.push(oBot0, iBot0, oBot1);
    indices.push(iBot0, iBot1, oBot1);
  }

  // Build BufferGeometry
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);

  geometry.computeVertexNormals();

  return geometry;
}
