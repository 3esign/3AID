import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { RingParameters } from '../engine/proceduralRing';
import { generateRingBandGeometry, generateGemstoneGeometry, generateProngsGeometry } from '../engine/proceduralRing';
import type { VaseParameters } from '../engine/proceduralVase';
import { generateVaseGeometry } from '../engine/proceduralVase';
import type { LampParameters } from '../engine/proceduralLamp';
import { generateLampGeometry } from '../engine/proceduralLamp';

interface Viewport3DProps {
  parameters: RingParameters;
  materialType: 'gold-yellow' | 'gold-rose' | 'platinum' | 'ceramic-white' | 'ceramic-black' | 'frosted-glass';
  onGeometryChange: (combinedGeometry: THREE.BufferGeometry) => void;
  customGeometry?: THREE.BufferGeometry | null;
  activeModel: 'ring' | 'vase' | 'lamp';
  vaseParameters: VaseParameters;
  lampParameters: LampParameters;
  clippingEnabled: boolean;
}

export const Viewport3D: React.FC<Viewport3DProps> = ({
  parameters,
  materialType,
  onGeometryChange,
  customGeometry,
  activeModel,
  vaseParameters,
  lampParameters,
  clippingEnabled
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  
  // Meshes references
  const bandMeshRef = useRef<THREE.Mesh | null>(null);
  const prongsMeshRef = useRef<THREE.Mesh | null>(null);
  const gemstoneMeshRef = useRef<THREE.Mesh | null>(null);

  // Materials references
  const metalMaterialRef = useRef<THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial | null>(null);
  const gemMaterialRef = useRef<THREE.MeshPhysicalMaterial | null>(null);

  // OrbitControls and category tracking references
  const controlsRef = useRef<OrbitControls | null>(null);
  const lastActiveModelRef = useRef<'ring' | 'vase' | 'lamp' | null>(null);

  // 1. Procedural Studio HDR Environment Map Creator
  // Generates bright softbox outlines to reflect beautifully on the gold band
  const createProceduralEnvMap = (): THREE.CanvasTexture => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Black backdrop
    ctx.fillStyle = '#060608';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Left softbox light
    let gradient = ctx.createLinearGradient(100, 0, 300, 0);
    gradient.addColorStop(0, 'rgba(6, 6, 8, 1)');
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.85)');
    gradient.addColorStop(1, 'rgba(6, 6, 8, 1)');
    ctx.fillStyle = gradient;
    ctx.fillRect(100, 0, 200, canvas.height);

    // Right warm softbox
    gradient = ctx.createLinearGradient(700, 0, 900, 0);
    gradient.addColorStop(0, 'rgba(6, 6, 8, 1)');
    gradient.addColorStop(0.5, 'rgba(255, 235, 200, 0.95)');
    gradient.addColorStop(1, 'rgba(6, 6, 8, 1)');
    ctx.fillStyle = gradient;
    ctx.fillRect(700, 0, 200, canvas.height);

    // Top ceiling light
    gradient = ctx.createRadialGradient(512, 100, 50, 512, 100, 200);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(1, 'rgba(6, 6, 8, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(400, 0, 224, 250);

    const texture = new THREE.CanvasTexture(canvas);
    texture.mapping = THREE.EquirectangularReflectionMapping;
    return texture;
  };

  // 2. Material Configurator based on luxury styles
  const getMetalMaterial = (type: string, envMap: THREE.Texture): THREE.Material => {
    let mat: THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial;

    switch (type) {
      case 'gold-rose':
        mat = new THREE.MeshPhysicalMaterial({
          color: 0xc47b7f,
          metalness: 1.0,
          roughness: 0.08,
          clearcoat: 1.0,
          clearcoatRoughness: 0.03,
          side: THREE.DoubleSide,
          envMap: envMap,
          envMapIntensity: 1.3
        });
        break;
      case 'platinum':
        mat = new THREE.MeshPhysicalMaterial({
          color: 0xe5e4e2,
          metalness: 1.0,
          roughness: 0.06,
          clearcoat: 1.0,
          clearcoatRoughness: 0.02,
          side: THREE.DoubleSide,
          envMap: envMap,
          envMapIntensity: 1.2
        });
        break;
      case 'ceramic-white':
        mat = new THREE.MeshPhysicalMaterial({
          color: 0xfafafa,
          metalness: 0.0,
          roughness: 0.12,
          clearcoat: 1.0,
          clearcoatRoughness: 0.01,
          side: THREE.DoubleSide,
          envMap: envMap,
          envMapIntensity: 0.8
        });
        break;
      case 'ceramic-black':
        mat = new THREE.MeshPhysicalMaterial({
          color: 0x09090b,
          metalness: 0.05,
          roughness: 0.08,
          clearcoat: 1.0,
          clearcoatRoughness: 0.01,
          side: THREE.DoubleSide,
          envMap: envMap,
          envMapIntensity: 1.0
        });
        break;
      case 'frosted-glass':
        mat = new THREE.MeshPhysicalMaterial({
          color: 0xdceefb,
          metalness: 0.0,
          roughness: 0.28,
          transmission: 0.9,
          thickness: 2.0,
          ior: 1.45,
          transparent: true,
          side: THREE.DoubleSide,
          envMap: envMap,
          envMapIntensity: 1.2
        });
        break;
      case 'gold-yellow':
      default:
        mat = new THREE.MeshPhysicalMaterial({
          color: 0xd4af37,
          metalness: 1.0,
          roughness: 0.08,
          clearcoat: 1.0,
          clearcoatRoughness: 0.03,
          side: THREE.DoubleSide,
          envMap: envMap,
          envMapIntensity: 1.4
        });
        break;
    }
    return mat;
  };

  const getGemstoneMaterial = (color: string, envMap: THREE.Texture): THREE.MeshPhysicalMaterial => {
    let gemColor = 0xffffff;
    let ior = 2.417; // Diamond index of refraction

    switch (color) {
      case 'ruby':
        gemColor = 0xe0115f;
        ior = 1.762;
        break;
      case 'sapphire':
        gemColor = 0x0f52ba;
        ior = 1.762;
        break;
      case 'emerald':
        gemColor = 0x50c878;
        ior = 1.577;
        break;
      case 'amethyst':
        gemColor = 0x9966cc;
        ior = 1.544;
        break;
      case 'diamond':
      default:
        gemColor = 0xffffff;
        ior = 2.417;
        break;
    }

    return new THREE.MeshPhysicalMaterial({
      color: gemColor,
      metalness: 0.0,
      roughness: 0.0,
      transmission: 0.96, // Highly transparent
      opacity: 1.0,
      thickness: 3.0,
      ior: ior,
      side: THREE.DoubleSide,
      transparent: true,
      envMap: envMap,
      envMapIntensity: 2.2,
      clearcoat: 1.0,
      clearcoatRoughness: 0.0,
      reflectivity: 1.0
    });
  };

  // 3. Initialize Scene, Lighting, Camera, and Loop
  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // SCENE
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x08080a);
    sceneRef.current = scene;

    // CAMERA
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
    camera.position.set(0, 22, 35);
    cameraRef.current = camera;

    // RENDERER
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.VSMShadowMap; // Very soft shadows
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.localClippingEnabled = true; // Enable local clipping planes!
    
    // Clear the container first
    containerRef.current.innerHTML = '';
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // CONTROLS
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 + 0.1; // Limit camera from going completely under ring plate
    controls.minDistance = 6; // allow close zooms
    controls.maxDistance = 250;
    controlsRef.current = controls;

    // LIGHTING (AAA Studio setup)
    // 1. Soft hemisphere ambient
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x111119, 0.45);
    scene.add(hemiLight);

    // 2. Strong Key Spotlight for nice reflections & soft shadow mapping
    const keySpot = new THREE.SpotLight(0xfffae6, 150, 100, Math.PI / 5, 0.6, 1.2);
    keySpot.position.set(15, 30, 15);
    keySpot.castShadow = true;
    keySpot.shadow.mapSize.width = 2048;
    keySpot.shadow.mapSize.height = 2048;
    keySpot.shadow.camera.near = 10;
    keySpot.shadow.camera.far = 60;
    keySpot.shadow.bias = -0.0002;
    keySpot.shadow.radius = 6;
    scene.add(keySpot);

    // 3. Cool Fill Light from opposite side
    const fillLight = new THREE.DirectionalLight(0xdceefb, 2.5);
    fillLight.position.set(-20, 15, -10);
    scene.add(fillLight);

    // 4. Back rim spotlight to highlight gold curves
    const rimSpot = new THREE.SpotLight(0xffffff, 80, 80, Math.PI / 4, 0.5, 1.5);
    rimSpot.position.set(-10, 20, 20);
    scene.add(rimSpot);

    // 5. Dynamic sparkly pointlights for diamond facets
    const gemSparkleLeft = new THREE.PointLight(0xffffff, 15, 30);
    gemSparkleLeft.position.set(8, 15, -8);
    scene.add(gemSparkleLeft);

    const gemSparkleRight = new THREE.PointLight(0xffffff, 15, 30);
    gemSparkleRight.position.set(-8, 15, 8);
    scene.add(gemSparkleRight);

    // DUSTED PLATINUM STUDIO STAGELIGHT PLATFORM
    // This is the gorgeous dark slate cylinder floor to support shadows
    const stageGeo = new THREE.CylinderGeometry(18, 20, 1.5, 64);
    const stageMat = new THREE.MeshStandardMaterial({
      color: 0x121216,
      roughness: 0.65,
      metalness: 0.1
    });
    const stage = new THREE.Mesh(stageGeo, stageMat);
    stage.position.y = -10.75; // Sunk so bottom of ring lies slightly on it
    stage.receiveShadow = true;
    scene.add(stage);

    const envTexture = createProceduralEnvMap();
    scene.environment = envTexture;

    // ANIMATE LOOP
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      controls.update();


      
      renderer.render(scene, camera);
    };
    animate();

    // RESIZE EVENT listener
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      envTexture.dispose();
    };
  }, []);

  // 4. Update Geometries and Materials when props change
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const envMap = scene.environment as THREE.Texture;

    // Clean old meshes and internal lights from scene
    if (bandMeshRef.current) scene.remove(bandMeshRef.current);
    if (prongsMeshRef.current) scene.remove(prongsMeshRef.current);
    if (gemstoneMeshRef.current) scene.remove(gemstoneMeshRef.current);

    const oldBulb = scene.getObjectByName('internalBulb');
    if (oldBulb) scene.remove(oldBulb);
    const oldLight = scene.getObjectByName('internalLight');
    if (oldLight) scene.remove(oldLight);

    // B. Instantiate Materials
    const metalMat = getMetalMaterial(materialType, envMap);
    metalMaterialRef.current = metalMat as any;

    // Apply local X-axis clipping plane if enabled
    const localPlane = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0);
    metalMat.clippingPlanes = clippingEnabled ? [localPlane] : [];

    let activeGeo: THREE.BufferGeometry;

    if (activeModel === 'vase') {
      const vaseGeo = generateVaseGeometry(vaseParameters);
      activeGeo = vaseGeo;

      const vaseMesh = new THREE.Mesh(vaseGeo, metalMat);
      vaseMesh.castShadow = true;
      vaseMesh.receiveShadow = true;
      // Center vase on platform floor
      vaseMesh.position.set(0, -10, 0);
      scene.add(vaseMesh);
      bandMeshRef.current = vaseMesh;

    } else if (activeModel === 'lamp') {
      const lampGeo = generateLampGeometry(lampParameters);
      activeGeo = lampGeo;

      const lampMesh = new THREE.Mesh(lampGeo, metalMat);
      lampMesh.castShadow = true;
      lampMesh.receiveShadow = true;
      // Center lamp shade
      lampMesh.position.set(0, -10, 0);
      scene.add(lampMesh);
      bandMeshRef.current = lampMesh;

      // AAA BULB GLOW MASTERSTROKE:
      // Insert a pointlight bulb inside the shade that projects procedural shadows
      const bulbHeight = lampParameters.height / 2;
      
      const bulb = new THREE.Mesh(
        new THREE.SphereGeometry(1.6, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0xffaa44 })
      );
      bulb.name = 'internalBulb';
      bulb.position.set(0, -10 + bulbHeight, 0);
      scene.add(bulb);

      const bulbLight = new THREE.PointLight(0xff9500, 180, 80, 1.2);
      bulbLight.name = 'internalLight';
      bulbLight.position.set(0, -10 + bulbHeight, 0);
      bulbLight.castShadow = true;
      bulbLight.shadow.bias = -0.0004;
      bulbLight.shadow.mapSize.width = 1024;
      bulbLight.shadow.mapSize.height = 1024;
      scene.add(bulbLight);

    } else {
      // Default: RING
      const bandGeo = generateRingBandGeometry(parameters);
      const prongsGeo = generateProngsGeometry(parameters);
      const gemstoneGeo = generateGemstoneGeometry(parameters);

      const ringRadius = parameters.innerDiameter / 2;
      const topOffset = ringRadius + parameters.thickness - 0.2;

      const gemMat = getGemstoneMaterial(parameters.gemColor, envMap);
      gemMaterialRef.current = gemMat;

      const bandMesh = new THREE.Mesh(bandGeo, metalMat);
      bandMesh.castShadow = true;
      bandMesh.receiveShadow = true;
      scene.add(bandMesh);
      bandMeshRef.current = bandMesh;

      if (parameters.hasGemstone) {
        const prongsMesh = new THREE.Mesh(prongsGeo, metalMat);
        prongsMesh.castShadow = true;
        prongsMesh.receiveShadow = true;
        scene.add(prongsMesh);
        prongsMeshRef.current = prongsMesh;

        const gemMesh = new THREE.Mesh(gemstoneGeo, gemMat);
        gemMesh.position.set(0, topOffset + parameters.gemSize * 0.18, 0);
        gemMesh.castShadow = true;
        scene.add(gemMesh);
        gemstoneMeshRef.current = gemMesh;
      }

      // Merge band + prongs for STL print chassis
      const combineGeometriesForSTL = (): THREE.BufferGeometry => {
        if (!parameters.hasGemstone) {
          return bandGeo;
        }
        const bPos = bandGeo.getAttribute('position');
        const pPos = prongsGeo.getAttribute('position');
        
        const combinedVertices = new Float32Array((bPos.count + pPos.count) * 3);
        combinedVertices.set(bPos.array as Float32Array, 0);
        combinedVertices.set(pPos.array as Float32Array, bPos.count * 3);

        const bNorm = bandGeo.getAttribute('normal');
        const pNorm = prongsGeo.getAttribute('normal');
        const combinedNormals = new Float32Array((bNorm.count + pNorm.count) * 3);
        combinedNormals.set(bNorm.array as Float32Array, 0);
        combinedNormals.set(pNorm.array as Float32Array, bNorm.count * 3);

        const combinedIndices: number[] = [];
        const bIdx = bandGeo.getIndex()!;
        for (let i = 0; i < bIdx.count; i++) {
          combinedIndices.push(bIdx.getX(i));
        }

        const pIdx = prongsGeo.getIndex()!;
        const offset = bPos.count;
        for (let i = 0; i < pIdx.count; i++) {
          combinedIndices.push(pIdx.getX(i) + offset);
        }

        const mergedGeo = new THREE.BufferGeometry();
        mergedGeo.setAttribute('position', new THREE.BufferAttribute(combinedVertices, 3));
        mergedGeo.setAttribute('normal', new THREE.BufferAttribute(combinedNormals, 3));
        mergedGeo.setIndex(combinedIndices);
        
        return mergedGeo;
      };

      activeGeo = combineGeometriesForSTL();
    }

    // Proactively notify parent component
    const finalGeo = customGeometry ? customGeometry : activeGeo;
    onGeometryChange(finalGeo);

    // Dynamic Camera auto-zoom focus helper function
    const fitCameraToObject = (geometry: THREE.BufferGeometry) => {
      if (!cameraRef.current || !controlsRef.current) return;
      
      geometry.computeBoundingSphere();
      const sphere = geometry.boundingSphere;
      if (!sphere) return;

      const radius = sphere.radius;
      const center = sphere.center.clone();
      
      // Shift center y depending on model displacement
      const offset = activeModel === 'ring' ? 0 : -10;
      center.y += offset;

      // Smoothly point controls target to the center
      controlsRef.current.target.copy(center);

      // Adjust camera distance based on object size
      const distance = Math.max(16, radius * 2.1);
      
      // Point camera from slightly above and in front
      const dir = new THREE.Vector3(0, 0.45, 0.9).normalize();
      cameraRef.current.position.copy(center).addScaledVector(dir, distance);
      cameraRef.current.lookAt(center);
      controlsRef.current.update();
    };

    // Auto-focus ONLY when active model category transitions to prevent annoying jumps during dragging
    if (lastActiveModelRef.current !== activeModel) {
      lastActiveModelRef.current = activeModel;
      // Slight timeout to let geometries build and render
      setTimeout(() => fitCameraToObject(finalGeo), 60);
    }

  }, [parameters, materialType, onGeometryChange, customGeometry, activeModel, vaseParameters, lampParameters, clippingEnabled]);

  const printSafeActive = 
    activeModel === 'ring' ? parameters.printSafeEnabled :
    activeModel === 'vase' ? vaseParameters.printSafeEnabled :
    lampParameters.printSafeEnabled;

  return (
    <div className="viewport-container" style={{ width: '100%', height: '100%' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      <div className="viewport-overlay">
        <div className="model-badge">
          <span className="dot" />
          3AID REAL-TIME AAA VIEWPORT
        </div>
        <div className="model-badge" style={{ textTransform: 'uppercase', fontSize: '0.75rem', background: 'rgba(212,175,55,0.15)', borderColor: 'rgba(212,175,55,0.4)', color: '#fff' }}>
          Procedural Studio Reflection HDR active
        </div>
        {printSafeActive && (
          <div className="model-badge" style={{ textTransform: 'uppercase', fontSize: '0.75rem', background: 'rgba(212,175,55,0.18)', borderColor: 'rgba(212,175,55,0.55)', color: '#ffcc33', fontWeight: 700 }}>
            ⚡ PRINT-SAFE OPTIMIZER ACTIVE
          </div>
        )}
      </div>
    </div>
  );
};
