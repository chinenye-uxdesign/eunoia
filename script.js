import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import Lenis from "lenis";


//3D Menu Overlay Begins //

document.addEventListener("DOMContentLoaded", () => {
  // =========================
  // UI: Menu overlay + hovers
  // =========================
  const menuToggler = document.querySelector(".menu-toggler");
  const menuOverlay = document.querySelector(".menu-overlay");
  const menuTogglerText = menuToggler?.querySelector("p");

  let isMenuOpen = false;
  let isAnimating = false;

  if (menuToggler && menuOverlay && menuTogglerText) {
    menuToggler.addEventListener("click", () => {
      if (isAnimating) return;

      isMenuOpen = !isMenuOpen;
      isAnimating = true;

      if (isMenuOpen) {
        gsap.to(menuOverlay, {
          opacity: 1,
          duration: 0.5,
          ease: "power3.out",
          onStart: () => {
            menuOverlay.style.pointerEvents = "all";
          },
          onComplete: () => {
            isAnimating = false;
          },
        });
        menuTogglerText.textContent = "Close";
      } else {
        gsap.to(menuOverlay, {
          opacity: 0,
          duration: 0.5,
          ease: "power3.out",
          onComplete: () => {
            menuOverlay.style.pointerEvents = "none";
            isAnimating = false;
          },
        });
        menuTogglerText.textContent = "Menu";
      }
    });

    const menuItems = document.querySelectorAll(".menu-item a");
    menuItems.forEach((item) => {
      item.addEventListener("mouseenter", () => {
        gsap.to(item, {
          backgroundSize: "100% 100%",
          duration: 0.75,
          ease: "power2.out",
          overwrite: true,
        });
      });

      item.addEventListener("mouseleave", () => {
        gsap.to(item, {
          backgroundSize: "0% 100%",
          duration: 0.25,
          ease: "power2.out",
          overwrite: true,
        });
      });
    });
  }

  // =========================
  // 3D CONFIG
  // =========================
  const config = {
    // Scene / canvas
    canvasBg: "#adb5d1",
    modelPath: "assets/glasses2.glb",

    // Material
    metalness: 0.55,
    roughness: 0.75,

    // Model sizing: 1 = original, 0.5 = 50% (smaller)
    modelScale: 0.5, // <<--- 50% size (make smaller by lowering this)

    // Camera fit offset (bigger = looser framing)
    fitOffset: 1.25,

    // Base rotation (radians)
    baseRotationX: 0,
    baseRotationY: 0.3,
    baseRotationZ: 0,

    // Lights
    ambientIntensity: 0.25,
    keyIntensity: 0.5,
    keyPos: new THREE.Vector3(2.5, 10, 10),
    fillIntensity: 1.5,
    fillPos: new THREE.Vector3(-5, 2.5, -2.5),
    rimIntensity: 2.5,
    rimPos: new THREE.Vector3(-7.5, 5, -10),
    topIntensity: 0.5,
    topPos: new THREE.Vector3(0, 15, 0),

    // Cursor light
    cursorLightEnabled: true,
    cursorLightIntensity: 2.5,
    cursorLightColor: 0xffffff,
    cursorLightDistance: 7.5,
    cursorLightDecay: 2,
    cursorLightPosZ: 1.25,
    cursorLightSmoothness: 0.5,
    cursorLightScale: 1,

    // Parallax rotation
    parallaxSensitivityX: 0.25,
    parallaxSensitivityY: 0.05,
  };

  // =========================
  // THREE.JS BASICS
  // =========================
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(config.canvasBg);

  const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.01,
    5000
  );

  const canvas = document.querySelector("canvas");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  // Lights
  scene.add(new THREE.AmbientLight(0xffffff, config.ambientIntensity));

  const keyLight = new THREE.DirectionalLight(0xffffff, config.keyIntensity);
  keyLight.position.copy(config.keyPos);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.width = 4096;
  keyLight.shadow.mapSize.height = 4096;
  keyLight.shadow.camera.near = 0.1;
  keyLight.shadow.camera.far = 100;
  keyLight.shadow.bias = -0.00005;
  keyLight.shadow.normalBias = 0.05;
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xffffff, config.fillIntensity);
  fillLight.position.copy(config.fillPos);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0xffffff, config.rimIntensity);
  rimLight.position.copy(config.rimPos);
  scene.add(rimLight);

  const topLight = new THREE.DirectionalLight(0xffffff, config.topIntensity);
  topLight.position.copy(config.topPos);
  scene.add(topLight);

  // Cursor light
  const cursorLight = new THREE.PointLight(
    config.cursorLightColor,
    config.cursorLightIntensity,
    config.cursorLightDistance,
    config.cursorLightDecay
  );
  cursorLight.position.set(0, 0, config.cursorLightPosZ);
  cursorLight.visible = config.cursorLightEnabled;
  scene.add(cursorLight);

  // Container Group so rotations don't break centering
  const modelGroup = new THREE.Group();
  scene.add(modelGroup);

  // Helpers
  const loader = new GLTFLoader();
  let model; // the actual GLTF scene inside the group

  // --- Center geometry to origin & scale uniformly ---
  function centerAndScale(object, scale = 1) {
    // Compute original bounds
    const box = new THREE.Box3().setFromObject(object);
    const center = box.getCenter(new THREE.Vector3());

    // Recenter geometry about origin
    object.position.sub(center);

    // Uniform scale
    object.scale.setScalar(scale);
    object.updateMatrixWorld(true);
  }

  // --- Fit the camera to the model group ---
  function fitCameraToObject(object, cam, offset = 1.25) {
    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    // Re-center camera look
    object.localToWorld(center);
    cam.lookAt(0, 0, 0);

    const maxSize = Math.max(size.x, size.y, size.z);
    const fitHeightDistance =
      maxSize / (2 * Math.tan(THREE.MathUtils.degToRad(cam.fov * 0.5)));
    const fitWidthDistance = fitHeightDistance / cam.aspect;
    const distance = offset * Math.max(fitHeightDistance, fitWidthDistance);

    cam.near = Math.max(distance / 100, 0.01);
    cam.far = distance * 100;
    cam.updateProjectionMatrix();

    cam.position.set(0, 0, distance);
    cam.lookAt(0, 0, 0);
  }

  // =========================
  // LOAD MODEL
  // =========================
  loader.load(
    config.modelPath,
    (gltf) => {
      model = gltf.scene;

      // Materials
      model.traverse((node) => {
        if (node.isMesh) {
          node.castShadow = true;
          node.receiveShadow = true;
          if (node.material) {
            node.material.metalness = config.metalness;
            node.material.roughness = config.roughness;
            node.material.needsUpdate = true;
          }
        }
      });

      // Center to origin and make it smaller (50%)
      centerAndScale(model, config.modelScale);

      // Put it inside a group that we rotate later
      modelGroup.clear();
      modelGroup.add(model);

      // Base orientation
      modelGroup.rotation.set(
        config.baseRotationX,
        config.baseRotationY,
        config.baseRotationZ
      );

      // Frame once
      fitCameraToObject(modelGroup, camera, config.fitOffset);
    },
    undefined,
    (err) => {
      console.error("Failed to load model:", err);
    }
  );

  // =========================
  // INTERACTION
  // =========================
  let mouseX = 0;
  let mouseY = 0;
  let targetRotationX = 0;
  let targetRotationY = 0;
  let currentRotationX = 0;
  let currentRotationY = 0;

  document.addEventListener("mousemove", (event) => {
    mouseX = (event.clientX / window.innerWidth) * 2 - 1;
    mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
  });

  // Cursor light smoothing
  let cursorLightTargetX = 0;
  let cursorLightTargetY = 0;

  document.addEventListener("mousemove", (event) => {
    const nx = (event.clientX / window.innerWidth) * 2 - 1;
    const ny = -(event.clientY / window.innerHeight) * 2 + 1;

    cursorLightTargetX = nx * config.cursorLightScale;
    cursorLightTargetY = ny * config.cursorLightScale;
  });

  // =========================
  // RENDER LOOP
  // =========================
  function animate() {
    requestAnimationFrame(animate);

    // Parallax rotation on the group (keeps model centered)
    targetRotationY = mouseX * config.parallaxSensitivityX;
    targetRotationX = -mouseY * config.parallaxSensitivityY;

    currentRotationX += (targetRotationX - currentRotationX) * 0.05;
    currentRotationY += (targetRotationY - currentRotationY) * 0.05;

    modelGroup.rotation.x = config.baseRotationX + currentRotationX;
    modelGroup.rotation.y = config.baseRotationY + currentRotationY;
    modelGroup.rotation.z = config.baseRotationZ;

    // Cursor light smoothing
    cursorLight.position.x +=
      (cursorLightTargetX - cursorLight.position.x) *
      config.cursorLightSmoothness;
    cursorLight.position.y +=
      (cursorLightTargetY - cursorLight.position.y) *
      config.cursorLightSmoothness;

    renderer.render(scene, camera);
  }
  animate();

  // =========================
  // RESIZE
  // =========================
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);

    if (modelGroup.children.length) {
      fitCameraToObject(modelGroup, camera, config.fitOffset);
    }
  });
});

//3D Menu Overlay End//

document.addEventListener("DOMContentLoaded", () => {
  gsap.registerPlugin(ScrollTrigger, SplitText);

  // ===== Smooth scrolling (Lenis) =====
  const lenis = new Lenis();
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  // ===== Split text setup =====
  const header1Split = new SplitText(".header-1 h1", {
    type: "chars",
    charsClass: "char",
  });
  const titleSplits = new SplitText(".tooltip .title h2", {
    type: "lines",
    linesClass: "line",
  });
  const descriptionSplits = new SplitText(".tooltip .description p", {
    type: "lines",
    linesClass: "line",
  });

  header1Split.chars.forEach(
    (char) => (char.innerHTML = `<span>${char.innerHTML}</span>`)
  );
  [...titleSplits.lines, ...descriptionSplits.lines].forEach(
    (line) => (line.innerHTML = `<span>${line.innerHTML}</span>`)
  );

  const animOptions = { duration: 1, ease: "power3.out", stagger: 0.025 };
  const tooltipSelectors = [
    {
      trigger: 0.65,
      elements: [
        ".tooltip:nth-child(1) .icon ion-icon",
        ".tooltip:nth-child(1) .title .line > span",
        ".tooltip:nth-child(1) .description .line > span",
      ],
    },
    {
      trigger: 0.85,
      elements: [
        ".tooltip:nth-child(2) .icon ion-icon",
        ".tooltip:nth-child(2) .title .line > span",
        ".tooltip:nth-child(2) .description .line > span",
      ],
    },
  ];

  // ===== Header entrance =====
  ScrollTrigger.create({
    trigger: ".product-overview",
    start: "75% bottom",
    onEnter: () =>
      gsap.to(".header-1 h1 .char > span", {
        y: "0%",
        duration: 1,
        ease: "power3.out",
        stagger: 0.025,
      }),
    onLeaveBack: () =>
      gsap.to(".header-1 h1 .char > span", {
        y: "100%",
        duration: 1,
        ease: "power3.out",
        stagger: 0.025,
      }),
  });

  // ===== Three.js setup =====
  let model, currentRotation = 0, modelSize;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.LinearEncoding;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.toneMappingExposure = 1.0;
  document.querySelector(".model-container").appendChild(renderer.domElement);

  // Lights
  scene.add(new THREE.AmbientLight(0xffffff, 0.7));

  const mainLight = new THREE.DirectionalLight(0xffffff, 1.0);
  mainLight.position.set(1, 2, 3);
  mainLight.castShadow = true;
  mainLight.shadow.bias = -0.001;
  mainLight.shadow.mapSize.width = 1024;
  mainLight.shadow.mapSize.height = 1024;
  scene.add(mainLight);

  const fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
  fillLight.position.set(-2, 0, -2);
  scene.add(fillLight);

  // ------- Center + scale helper -------
  function setupModel() {
    if (!model || !modelSize) return;

    // Get current bounding box & center
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    modelSize = size;

    // Center the model at world origin
    model.position.set(-center.x, -center.y, -center.z);

    // Keep it upright (no angled tilt)
    model.rotation.set(0, 0, 0);

    // 50% size (half)
    model.scale.set(0.75, 0.75, 0.75);

    // Frame it with the camera
    const largest = Math.max(size.x, size.y, size.z);
    const cameraDistance = 1.5; // tweak if you want tighter/looser framing
    camera.position.set(0, 0, largest * cameraDistance);
    camera.lookAt(0, 0, 0);
  }

  // Load the model
  new GLTFLoader().load("assets/glasses2.glb", (gltf) => {
    model = gltf.scene;

    // Materials
    model.traverse((node) => {
      if (node.isMesh && node.material) {
        Object.assign(node.material, {
          metalness: 0.05,
          roughness: 0.9,
        });
      }
    });

    // Initial size
    const box = new THREE.Box3().setFromObject(model);
    modelSize = box.getSize(new THREE.Vector3());

    scene.add(model);
    setupModel();
  });

  // Render loop
  function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
  }
  animate();

  // Handle resize
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    setupModel();
  });

  // ===== Scroll-driven scene & UI =====
  ScrollTrigger.create({
    trigger: ".product-overview",
    start: "top top",
    end: `+=${window.innerHeight * 10}px`,
    pin: true,
    pinSpacing: true,
    scrub: 1,
    onUpdate: ({ progress }) => {
      // Header 1 slide out
      const headerProgress = Math.max(0, Math.min(1, (progress - 0.05) / 0.3));
      gsap.to(".header-1", {
        xPercent:
          progress < 0.05 ? 0 : progress > 0.35 ? -100 : -100 * headerProgress,
      });

      // Circular mask reveal
      const maskSize =
        progress < 0.2 ? 0 : progress > 0.3 ? 100 : 100 * ((progress - 0.2) / 0.1);
      gsap.to(".circular-mask", {
        clipPath: `circle(${maskSize}% at 50% 50%)`,
      });

      // Header 2 cross slide
      const header2Progress = (progress - 0.15) / 0.35;
      const header2XPercent =
        progress < 0.15 ? 100 : progress > 0.5 ? -200 : 100 - 300 * header2Progress;
      gsap.to(".header-2", { xPercent: header2XPercent });

      // Tooltip lines
      const scaleX =
        progress < 0.45 ? 0 : progress > 0.65 ? 100 : 100 * ((progress - 0.45) / 0.2);
      gsap.to(".tooltip .divider", { scaleX: `${scaleX}%`, ...animOptions });

      tooltipSelectors.forEach(({ trigger, elements }) => {
        gsap.to(elements, {
          y: progress >= trigger ? "0%" : "125%",
          ...animOptions,
        });
      });

      // Gentle spin after we start
      if (model && progress >= 0.05) {
        const rotationProgress = (progress - 0.05) / 0.95;
        const targetRotation = Math.PI * 3 * 4 * rotationProgress;
        const rotationDiff = targetRotation - currentRotation;
        if (Math.abs(rotationDiff) > 0.001) {
          model.rotateOnAxis(new THREE.Vector3(0, 1, 0), rotationDiff);
          currentRotation = targetRotation;
        }
      }
    },
  });
});

// ===== 4-Column Smooth Parallax (Lenis + column drift) =====
const cols = document.querySelectorAll(".parallax-gallery .pg-col");
if (cols.length) {
  // ❶ SPEED PROFILE (left → right).
  const SPEEDS = [0.12, 0.24, 0.36, 0.52];
  // ❷ INERTIA
  const SMOOTHING = 0.14;

  // Reuse Lenis if present, else init once
  let lenis = window.__lenis;
  if (!lenis) {
    const { default: Lenis } = await import("lenis");
    lenis = new Lenis({ smoothWheel: true, duration: 1.1, lerp: 0.1 });
    window.__lenis = lenis;
  }

  // Fade cards in when they enter
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) e.target.classList.add("is-inview");
      });
    },
    { rootMargin: "0px 0px -15% 0px", threshold: 0.01 }
  );
  document.querySelectorAll(".pg-card").forEach((c) => io.observe(c));

  // Parallax by column
  const colState = new Map();
  cols.forEach((c, i) => {
    c.dataset.speed = SPEEDS[Math.min(i, SPEEDS.length - 1)];
    colState.set(c, 0);
  });

  function updateParallax() {
    const vh = innerHeight;
    cols.forEach((col) => {
      const speed = parseFloat(col.dataset.speed);
      const rect = col.getBoundingClientRect();
      const dist = rect.top + rect.height / 2 - vh / 2;
      const target = -dist * speed;

      const prev = colState.get(col) || 0;
      const curr = prev + (target - prev) * SMOOTHING; // inertia
      col.style.transform = `translateY(${curr}px)`;
      colState.set(col, curr);
    });
  }

  function raf(t) {
    lenis.raf(t);
    updateParallax();
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);
  addEventListener("resize", updateParallax);
}
// ===== Parallax End =====
