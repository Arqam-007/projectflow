import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface ThreeDWorkflowCanvasProps {
  className?: string;
  size?: number;
}

export const ThreeDWorkflowCanvas: React.FC<ThreeDWorkflowCanvasProps> = ({
  className = '',
  size = 280,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Detect software WebGL per Three.js skill guidelines
    const isSoftwareGl = (() => {
      try {
        const testCanvas = document.createElement('canvas');
        const gl = testCanvas.getContext('webgl2') || testCanvas.getContext('webgl');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    // 2. Scene & Camera Setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.z = 6;

    // 3. Renderer Configuration
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
      });
      renderer.setSize(size, size);
      renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.1;
      container.appendChild(renderer.domElement);
    } catch (err) {
      console.warn('WebGL initialization failed, falling back to CSS animation', err);
      return;
    }

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight(0x0b0e14, 2.5);
    scene.add(ambientLight);

    const blueLight = new THREE.PointLight(0x1558c9, 8, 15);
    blueLight.position.set(4, 3, 4);
    scene.add(blueLight);

    const limeLight = new THREE.PointLight(0xd4ff24, 4, 12);
    limeLight.position.set(-3, -2, 3);
    scene.add(limeLight);

    // 5. Procedural 3D Subject (Composite Group: Core + Orbit Ring + Node Cluster)
    const workflowGroup = new THREE.Group();

    // 5a. Core Faceted Crystal (Electric Blue)
    const coreGeo = new THREE.IcosahedronGeometry(1.3, 0);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x1558c9,
      metalness: 0.85,
      roughness: 0.25,
      emissive: 0x0c2d6e,
      emissiveIntensity: 0.35,
      flatShading: true,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    workflowGroup.add(coreMesh);

    // Wireframe overlay for futuristic cyber look
    const wireGeo = new THREE.WireframeGeometry(coreGeo);
    const wireMat = new THREE.LineBasicMaterial({
      color: 0x488bff,
      transparent: true,
      opacity: 0.6,
      linewidth: 1,
    });
    const wireLines = new THREE.LineSegments(wireGeo, wireMat);
    coreMesh.add(wireLines);

    // 5b. Orbit Gyro Ring (Neon Lime Accent)
    const ringGeo = new THREE.TorusGeometry(2.1, 0.035, 16, 64);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xd4ff24,
      emissive: 0xd4ff24,
      emissiveIntensity: 0.7,
      metalness: 0.9,
      roughness: 0.1,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 3;
    ringMesh.rotation.y = Math.PI / 6;
    workflowGroup.add(ringMesh);

    // Second complementary orbit ring
    const secondaryRingGeo = new THREE.TorusGeometry(1.8, 0.02, 16, 64);
    const secondaryRingMat = new THREE.MeshStandardMaterial({
      color: 0x1558c9,
      emissive: 0x1558c9,
      emissiveIntensity: 0.4,
      metalness: 0.8,
      roughness: 0.3,
    });
    const secondaryRingMesh = new THREE.Mesh(secondaryRingGeo, secondaryRingMat);
    secondaryRingMesh.rotation.x = -Math.PI / 4;
    secondaryRingMesh.rotation.z = Math.PI / 4;
    workflowGroup.add(secondaryRingMesh);

    // 5c. Satellite Data Nodes
    const nodesGroup = new THREE.Group();
    const nodeCount = 5;
    const nodeGeo = new THREE.OctahedronGeometry(0.16);
    const nodeMat = new THREE.MeshStandardMaterial({
      color: 0xd4ff24,
      emissive: 0xd4ff24,
      emissiveIntensity: 0.8,
    });

    for (let i = 0; i < nodeCount; i++) {
      const angle = (i / nodeCount) * Math.PI * 2;
      const radius = 2.1;
      const node = new THREE.Mesh(nodeGeo, nodeMat);
      node.position.set(
        Math.cos(angle) * radius,
        Math.sin(angle) * Math.cos(Math.PI / 3) * radius,
        Math.sin(angle) * Math.sin(Math.PI / 3) * radius
      );
      nodesGroup.add(node);
    }
    workflowGroup.add(nodesGroup);

    scene.add(workflowGroup);

    // 6. Interactive Mouse Tracking
    let targetRotationX = 0;
    let targetRotationY = 0;
    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      targetRotationY = x * 0.45;
      targetRotationX = -y * 0.45;
    };

    window.addEventListener('mousemove', handleMouseMove);

    // 7. Animation Loop with Clock
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Continuous ambient rotation
      coreMesh.rotation.y = elapsedTime * 0.4;
      coreMesh.rotation.x = Math.sin(elapsedTime * 0.25) * 0.3;

      ringMesh.rotation.z = elapsedTime * 0.6;
      secondaryRingMesh.rotation.z = -elapsedTime * 0.5;
      nodesGroup.rotation.z = elapsedTime * 0.6;

      // Smooth mouse-follow damping
      workflowGroup.rotation.y += (targetRotationY - workflowGroup.rotation.y) * 0.05;
      workflowGroup.rotation.x += (targetRotationX - workflowGroup.rotation.x) * 0.05;

      renderer.render(scene, camera);
    };

    animate();

    // 8. Cleanup & Disposal
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);

      coreGeo.dispose();
      coreMat.dispose();
      wireGeo.dispose();
      wireMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      secondaryRingGeo.dispose();
      secondaryRingMat.dispose();
      nodeGeo.dispose();
      nodeMat.dispose();

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [size]);

  return (
    <div
      ref={mountRef}
      className={`relative flex items-center justify-center select-none pointer-events-auto ${className}`}
      style={{ width: size, height: size }}
      title="ProjectFlow 3D Workflow Core"
    />
  );
};
