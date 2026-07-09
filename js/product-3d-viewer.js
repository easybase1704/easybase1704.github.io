/**
 * Product 3D Viewer — Three.js 多角度旋转展示
 * ES Module，用于产品详情页
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

(function () {
  'use strict';

  const container = document.getElementById('product3dContainer');
  if (!container) return;

  // ---------- DOM ----------
  const canvas = container.querySelector('#threeCanvas');
  const toggleBtn = container.querySelector('#viewerToggle');
  const galleryEl = container.querySelector('#galleryFallback');
  if (!canvas || !toggleBtn) return;

  // ---------- 配置 ----------
  const basePath = container.dataset.basepath || '';
  const IMG_SRC = [
    basePath + '-01.webp',
    basePath + '-02.webp',
    basePath + '-03.webp',
    basePath + '-04.webp',
  ];

  // ---------- 状态 ----------
  let is3dActive = false;
  let scene, camera, renderer, controls;
  let cards = [];
  let animId = null;

  // ---------- 初始化 Three.js ----------
  function initScene() {
    const rect = container.getBoundingClientRect();
    const w = rect.width || 700;
    const h = rect.height || 480;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f0f1a);

    camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 50);
    camera.position.set(0, 0.6, 4.2);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    // 灯光
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambient);

    const key = new THREE.DirectionalLight(0xffffff, 1.8);
    key.position.set(3, 4, 4);
    scene.add(key);

    const fill = new THREE.DirectionalLight(0x4488ff, 0.5);
    fill.position.set(-3, 1, -2);
    scene.add(fill);

    const back = new THREE.DirectionalLight(0x4466ff, 0.3);
    back.position.set(0, -1, -4);
    scene.add(back);

    // 底部光环
    const glowRing = new THREE.RingGeometry(1.4, 1.8, 48);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x2255aa,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.15,
    });
    const ring = new THREE.Mesh(glowRing, glowMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -0.55;
    scene.add(ring);

    // 粒子
    const pCount = 300;
    const pos = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount * 3; i++) pos[i] = (Math.random() - 0.5) * 16;
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pMat = new THREE.PointsMaterial({ color: 0x4488ff, size: 0.015, transparent: true, opacity: 0.4 });
    scene.add(new THREE.Points(pGeo, pMat));

    // 控制
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 2.0;
    controls.minDistance = 2.2;
    controls.maxDistance = 7;
    controls.maxPolarAngle = Math.PI / 2.1;
    controls.target.set(0, 0, 0);

    let restartTimer = null;
    controls.addEventListener('start', () => {
      controls.autoRotate = false;
      if (restartTimer) { clearTimeout(restartTimer); restartTimer = null; }
    });
    controls.addEventListener('end', () => {
      restartTimer = setTimeout(() => {
        controls.autoRotate = true;
      }, 3000);
    });

    window.addEventListener('resize', onResize);
  }

  // ---------- 加载纹理并构建卡片 ----------
  async function buildCards() {
    // 清除旧卡片
    cards.forEach(g => scene.remove(g));
    cards = [];

    const loader = new THREE.TextureLoader();
    const radius = 1.9;
    const cardW = 1.5;
    const cardH = 1.125;

    for (let i = 0; i < IMG_SRC.length; i++) {
      const angle = i * (Math.PI / 2); // 0, 90°, 180°, 270°
      const x = Math.sin(angle) * radius;
      const z = Math.cos(angle) * radius;

      const tex = await new Promise(resolve => {
        loader.load(IMG_SRC[i], t => resolve(t), undefined, () => resolve(null));
      });
      if (!tex) continue;

      const geo = new THREE.PlaneGeometry(cardW, cardH);
      const mat = new THREE.MeshStandardMaterial({
        map: tex,
        side: THREE.DoubleSide,
        roughness: 0.15,
        metalness: 0.0,
      });
      const mesh = new THREE.Mesh(geo, mat);

      // 边框
      const edge = new THREE.EdgesGeometry(geo);
      const line = new THREE.LineSegments(
        edge,
        new THREE.LineBasicMaterial({ color: 0x4488ff, transparent: true, opacity: 0.25 })
      );
      mesh.add(line);

      const group = new THREE.Group();
      group.add(mesh);
      group.position.set(x, 0, z);
      // 朝向中心
      group.lookAt(0, 0, 0);

      scene.add(group);
      cards.push(group);
    }
  }

  // ---------- Resize ----------
  function onResize() {
    if (!camera || !renderer) return;
    const rect = container.getBoundingClientRect();
    const w = rect.width || 700;
    const h = rect.height || 480;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }

  // ---------- 动画循环 ----------
  function animate() {
    animId = requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }

  // ---------- 切换 2D/3D ----------
  function switchTo3D() {
    if (is3dActive) return;
    is3dActive = true;

    galleryEl.style.display = 'none';
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    toggleBtn.textContent = '⟳ 3D展示';
    toggleBtn.classList.add('active');

    if (!renderer) {
      initScene();
      buildCards().then(() => animate());
    } else {
      onResize();
      animate();
    }
  }

  function switchTo2D() {
    if (!is3dActive) return;
    is3dActive = false;

    canvas.style.display = 'none';
    galleryEl.style.display = '';
    toggleBtn.textContent = '🎯 3D展示';
    toggleBtn.classList.remove('active');

    if (animId) {
      cancelAnimationFrame(animId);
      animId = null;
    }
  }

  toggleBtn.addEventListener('click', () => {
    is3dActive ? switchTo2D() : switchTo3D();
  });

  // ---------- 暴露全局 ----------
  window.productViewer3D = { switchTo3D, switchTo2D, isActive: () => is3dActive };

  // 如果设置 auto-open
  if (container.dataset.autoOpen === 'true') switchTo3D();

})();
