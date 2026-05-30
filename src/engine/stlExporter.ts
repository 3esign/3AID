import * as THREE from 'three';

/**
 * Exports a list of BufferGeometries combined into a single binary STL Blob.
 */
export function exportToBinarySTL(geometries: THREE.BufferGeometry[]): Blob {
  // 1. Calculate total triangles across all geometries
  let totalTriangles = 0;
  
  const verifiedGeos = geometries.filter(geo => {
    const pos = geo.getAttribute('position');
    return pos && pos.count > 0;
  });

  verifiedGeos.forEach(geo => {
    const posAttr = geo.getAttribute('position');
    const indexAttr = geo.getIndex();
    if (indexAttr) {
      totalTriangles += indexAttr.count / 3;
    } else {
      totalTriangles += posAttr.count / 3;
    }
  });

  // 2. Binary STL structure sizing
  // Header: 80 bytes
  // Triangle count: 4 bytes
  // Triangle data: 50 bytes per triangle (3x Normal, 3x V1, 3x V2, 3x V3, 2x Attributes)
  const bufferSize = 80 + 4 + totalTriangles * 50;
  const buffer = new ArrayBuffer(bufferSize);
  const view = new DataView(buffer);

  // Write Header (80 bytes)
  const headerText = "3AID Parametric Exporter | Open Source STL Check | aaa Jewelry";
  for (let i = 0; i < Math.min(80, headerText.length); i++) {
    view.setUint8(i, headerText.charCodeAt(i));
  }

  // Write Triangle Count (4 bytes, offset 80)
  view.setUint32(80, totalTriangles, true); // Little endian

  let byteOffset = 84;
  const tempNormal = new THREE.Vector3();
  const vA = new THREE.Vector3();
  const vB = new THREE.Vector3();
  const vC = new THREE.Vector3();

  // Helper vectors for normal computation if missing
  const edge1 = new THREE.Vector3();
  const edge2 = new THREE.Vector3();

  // 3. Populate Triangle Records
  verifiedGeos.forEach(geo => {
    const posAttr = geo.getAttribute('position');
    const normAttr = geo.getAttribute('normal');
    const indexAttr = geo.getIndex();

    if (indexAttr) {
      const indices = indexAttr.array;
      for (let i = 0; i < indexAttr.count; i += 3) {
        const idxA = indices[i];
        const idxB = indices[i + 1];
        const idxC = indices[i + 2];

        vA.fromBufferAttribute(posAttr, idxA);
        vB.fromBufferAttribute(posAttr, idxB);
        vC.fromBufferAttribute(posAttr, idxC);

        // Fetch or compute face normal
        if (normAttr) {
          // Average vertex normals to get face normal
          edge1.fromBufferAttribute(normAttr, idxA);
          edge2.fromBufferAttribute(normAttr, idxB);
          tempNormal.copy(edge1).add(edge2).fromBufferAttribute(normAttr, idxC).add(edge1).normalize();
        } else {
          edge1.subVectors(vB, vA);
          edge2.subVectors(vC, vA);
          tempNormal.crossVectors(edge1, edge2).normalize();
        }

        // Write normal (3 floats)
        view.setFloat32(byteOffset, tempNormal.x, true);
        view.setFloat32(byteOffset + 4, tempNormal.y, true);
        view.setFloat32(byteOffset + 8, tempNormal.z, true);

        // Write Vertex A (3 floats)
        view.setFloat32(byteOffset + 12, vA.x, true);
        view.setFloat32(byteOffset + 16, vA.y, true);
        view.setFloat32(byteOffset + 20, vA.z, true);

        // Write Vertex B (3 floats)
        view.setFloat32(byteOffset + 24, vB.x, true);
        view.setFloat32(byteOffset + 28, vB.y, true);
        view.setFloat32(byteOffset + 32, vB.z, true);

        // Write Vertex C (3 floats)
        view.setFloat32(byteOffset + 36, vC.x, true);
        view.setFloat32(byteOffset + 40, vC.y, true);
        view.setFloat32(byteOffset + 44, vC.z, true);

        // Write attribute byte count (2 bytes)
        view.setUint16(byteOffset + 48, 0, true);

        byteOffset += 50;
      }
    } else {
      // Non-indexed vertices
      for (let i = 0; i < posAttr.count; i += 3) {
        vA.fromBufferAttribute(posAttr, i);
        vB.fromBufferAttribute(posAttr, i + 1);
        vC.fromBufferAttribute(posAttr, i + 2);

        if (normAttr) {
          edge1.fromBufferAttribute(normAttr, i);
          edge2.fromBufferAttribute(normAttr, i + 1);
          tempNormal.copy(edge1).add(edge2).fromBufferAttribute(normAttr, i + 2).add(edge1).normalize();
        } else {
          edge1.subVectors(vB, vA);
          edge2.subVectors(vC, vA);
          tempNormal.crossVectors(edge1, edge2).normalize();
        }

        // Write normal
        view.setFloat32(byteOffset, tempNormal.x, true);
        view.setFloat32(byteOffset + 4, tempNormal.y, true);
        view.setFloat32(byteOffset + 8, tempNormal.z, true);

        // Write vertices
        view.setFloat32(byteOffset + 12, vA.x, true);
        view.setFloat32(byteOffset + 16, vA.y, true);
        view.setFloat32(byteOffset + 20, vA.z, true);

        view.setFloat32(byteOffset + 24, vB.x, true);
        view.setFloat32(byteOffset + 28, vB.y, true);
        view.setFloat32(byteOffset + 32, vB.z, true);

        view.setFloat32(byteOffset + 36, vC.x, true);
        view.setFloat32(byteOffset + 40, vC.y, true);
        view.setFloat32(byteOffset + 44, vC.z, true);

        view.setUint16(byteOffset + 48, 0, true);

        byteOffset += 50;
      }
    }
  });

  return new Blob([buffer], { type: 'application/octet-stream' });
}
