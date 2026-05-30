import * as THREE from 'three';

export interface STLAnalysisResults {
  isWatertight: boolean;
  boundaryEdgesCount: number;
  nonManifoldEdgesCount: number;
  volume: number; // in mm³
  surfaceArea: number; // in mm²
  dimensions: {
    width: number;  // X mm
    height: number; // Y mm
    depth: number;  // Z mm
  };
  vertexCount: number;
  triangleCount: number;
  materialsWeight: {
    pla: number;     // g
    silver: number;  // g
    gold14k: number; // g
    gold18k: number; // g
    platinum: number;// g
  };
  printabilityRating: 'AAA' | 'Good' | 'Warning' | 'Critical';
  diagnostics: string[];
  overhangAreaPercent: number;
  requiresSupports: boolean;
}

// Density of materials in g/cm³ (g/1000mm³)
const DENSITIES = {
  pla: 1.24,
  silver: 10.36,
  gold14k: 12.90,
  gold18k: 15.60,
  platinum: 20.10
};

export function analyzeGeometry(geometry: THREE.BufferGeometry): STLAnalysisResults {
  const posAttr = geometry.getAttribute('position');
  const indexAttr = geometry.getIndex();
  
  if (!posAttr) {
    return createEmptyResults();
  }

  const vertexCount = posAttr.count;
  const triangleCount = indexAttr ? indexAttr.count / 3 : posAttr.count / 3;

  // 1. Compute Bounding Box Dimensions
  geometry.computeBoundingBox();
  const bbox = geometry.boundingBox || new THREE.Box3();
  const size = new THREE.Vector3();
  bbox.getSize(size);

  const dimensions = {
    width: Math.round(size.x * 100) / 100,
    height: Math.round(size.y * 100) / 100,
    depth: Math.round(size.z * 100) / 100
  };

  // 2. Compute Volume & Surface Area & Edge Sharing Map
  let volume = 0;
  let surfaceArea = 0;
  let overhangArea = 0;

  // We use the positions array directly
  const positions = posAttr.array as Float32Array;
  
  // Edge map: stores key "vMin_vMax" -> count of sharing triangles
  const edgeMap = new Map<string, number>();

  const getEdgeKey = (v1Idx: number, v2Idx: number): string => {
    // Round coordinates slightly to handle floating point discrepancies
    const x1 = Math.round(positions[v1Idx * 3] * 1000);
    const y1 = Math.round(positions[v1Idx * 3 + 1] * 1000);
    const z1 = Math.round(positions[v1Idx * 3 + 2] * 1000);

    const x2 = Math.round(positions[v2Idx * 3] * 1000);
    const y2 = Math.round(positions[v2Idx * 3 + 1] * 1000);
    const z2 = Math.round(positions[v2Idx * 3 + 2] * 1000);

    const k1 = `${x1}_${y1}_${z1}`;
    const k2 = `${x2}_${y2}_${z2}`;

    return k1 < k2 ? `${k1}|${k2}` : `${k2}|${k1}`;
  };

  const addEdge = (v1Idx: number, v2Idx: number) => {
    const key = getEdgeKey(v1Idx, v2Idx);
    edgeMap.set(key, (edgeMap.get(key) || 0) + 1);
  };

  // Helper vectors
  const p1 = new THREE.Vector3();
  const p2 = new THREE.Vector3();
  const p3 = new THREE.Vector3();
  const edge1 = new THREE.Vector3();
  const edge2 = new THREE.Vector3();
  const cross = new THREE.Vector3();

  // Loop through all triangles
  if (indexAttr) {
    const indices = indexAttr.array;
    for (let i = 0; i < indexAttr.count; i += 3) {
      const idx1 = indices[i];
      const idx2 = indices[i + 1];
      const idx3 = indices[i + 2];

      p1.fromBufferAttribute(posAttr, idx1);
      p2.fromBufferAttribute(posAttr, idx2);
      p3.fromBufferAttribute(posAttr, idx3);

      // Signed volume of tetrahedron from origin to face
      // Formula: (v1 . (v2 x v3)) / 6
      const vSigned = p1.dot(cross.crossVectors(p2, p3)) / 6.0;
      volume += vSigned;

      // Surface area
      edge1.subVectors(p2, p1);
      edge2.subVectors(p3, p1);
      cross.crossVectors(edge1, edge2);
      const faceArea = cross.length() / 2.0;
      surfaceArea += faceArea;

      // Overhang check: normal vector points downward steeper than 45 degrees
      const faceNormal = cross.clone().normalize();
      if (faceNormal.y < -0.707) {
        overhangArea += faceArea;
      }

      // Build edges map for watertightness
      addEdge(idx1, idx2);
      addEdge(idx2, idx3);
      addEdge(idx3, idx1);
    }
  } else {
    // Non-indexed geometry
    for (let i = 0; i < posAttr.count; i += 3) {
      p1.fromBufferAttribute(posAttr, i);
      p2.fromBufferAttribute(posAttr, i + 1);
      p3.fromBufferAttribute(posAttr, i + 2);

      const vSigned = p1.dot(cross.crossVectors(p2, p3)) / 6.0;
      volume += vSigned;

      edge1.subVectors(p2, p1);
      edge2.subVectors(p3, p1);
      cross.crossVectors(edge1, edge2);
      surfaceArea += cross.length() / 2.0;

      addEdge(i, i + 1);
      addEdge(i + 1, i + 2);
      addEdge(i + 2, i);
    }
  }

  // Convert volume to absolute mm³
  volume = Math.abs(volume);

  // 3. Evaluate Watertightness and Manifold Conditions
  let boundaryEdgesCount = 0;
  let nonManifoldEdgesCount = 0;

  edgeMap.forEach((count) => {
    if (count === 1) {
      boundaryEdgesCount++;
    } else if (count > 2) {
      nonManifoldEdgesCount++;
    }
  });

  const isWatertight = boundaryEdgesCount === 0;

  // 4. Calculate Weight in Grams
  // volume is in mm³, convert to cm³ by dividing by 1000
  const volCm3 = volume / 1000;
  const materialsWeight = {
    pla: Math.round(volCm3 * DENSITIES.pla * 100) / 100,
    silver: Math.round(volCm3 * DENSITIES.silver * 100) / 100,
    gold14k: Math.round(volCm3 * DENSITIES.gold14k * 100) / 100,
    gold18k: Math.round(volCm3 * DENSITIES.gold18k * 100) / 100,
    platinum: Math.round(volCm3 * DENSITIES.platinum * 100) / 100
  };

  // 5. Diagnostics & Printability Grading
  const diagnostics: string[] = [];
  let rating: 'AAA' | 'Good' | 'Warning' | 'Critical' = 'AAA';

  if (isWatertight) {
    diagnostics.push('Mesh is fully watertight (all boundaries are closed).');
  } else {
    diagnostics.push(`Open boundaries detected! Found ${boundaryEdgesCount} open edges. Slicers may fail to infill.`);
    rating = 'Warning';
  }

  if (nonManifoldEdgesCount > 0) {
    diagnostics.push(`Non-manifold geometry found: ${nonManifoldEdgesCount} edges shared by more than 2 faces.`);
    rating = 'Critical';
  } else {
    diagnostics.push('Manifold check passed (no self-intersections or t-junctions).');
  }

  // Normal orientation checks
  // If volume computed is extremely low but triangle count is high, normals might be scrambled
  if (volume < 0.1 && triangleCount > 100) {
    diagnostics.push('Scrambled normals detected. Signed volume calculation is close to zero.');
    rating = 'Critical';
  } else {
    diagnostics.push('Face orientations (normals) are solid and consistent.');
  }

  // Thin wall warnings
  // If thickness is too low relative to scale, trigger a warnings
  const minDimension = Math.min(dimensions.width, dimensions.height, dimensions.depth);
  if (minDimension < 1.0) {
    diagnostics.push(`Model has ultra-thin elements (${minDimension}mm). Some 3D printers may fail to resolve details.`);
    if (rating === 'AAA') rating = 'Good';
  }

  // Overhang check diagnostics
  const overhangAreaPercent = surfaceArea > 0 ? Math.round((overhangArea / surfaceArea) * 1000) / 10 : 0;
  const requiresSupports = overhangAreaPercent > 2.5; // Threshold 2.5%

  if (requiresSupports) {
    diagnostics.push(`Overhangs detected: ${overhangAreaPercent.toFixed(1)}% of model area is steeper than 45°. Supports recommended.`);
    if (rating === 'AAA') rating = 'Good';
  } else {
    diagnostics.push('Overhang angles are solid (supports not strictly required).');
  }

  // Final overall rating logic
  if (rating === 'AAA' && !isWatertight) {
    rating = 'Good';
  }

  return {
    isWatertight,
    boundaryEdgesCount,
    nonManifoldEdgesCount,
    volume: Math.round(volume * 10) / 10,
    surfaceArea: Math.round(surfaceArea * 10) / 10,
    dimensions,
    vertexCount,
    triangleCount,
    materialsWeight,
    printabilityRating: rating,
    diagnostics,
    overhangAreaPercent,
    requiresSupports
  };
}

function createEmptyResults(): STLAnalysisResults {
  return {
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
    diagnostics: ['Empty geometry or no coordinates available.'],
    overhangAreaPercent: 0,
    requiresSupports: false
  };
}
