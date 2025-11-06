import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import Lenis from "lenis";

document.addEventListener("DOMContentLoaded", () => {
  gsap.registerPlugin(ScrollTrigger, SplitText);

  const lenis = new Lenis();
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

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

  let model,
    currentRotation = 0,
    modelSize;
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

  function setupModel() {
    if (!model || !modelSize) return;

    const isMobile = window.innerWidth < 1000;
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());

    model.position.set(
      isMobile ? center.x + modelSize.x * 1 : -center.x - modelSize.x * 0.4,
      -center.y + modelSize.y * 0.085,
      -center.z
    );

    model.rotation.z = isMobile ? 0 : THREE.MathUtils.degToRad(-25);

    const cameraDistance = isMobile ? 2 : 1.25;
    camera.position.set(
      0,
      0,
      Math.max(modelSize.x, modelSize.y, modelSize.z) * cameraDistance
    );
    camera.lookAt(0, 0, 0);
  }

  new GLTFLoader().load("assets/glasses.glb", (gltf) => {
    model = gltf.scene;

    model.traverse((node) => {
      if (node.isMesh && node.material) {
        Object.assign(node.material, {
          metalness: 0.05,
          roughness: 0.9,
        });
      }
    });

    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    modelSize = size;

    scene.add(model);
    setupModel();
  });

  function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
  }
  animate();

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    setupModel();
  });

  ScrollTrigger.create({
    trigger: ".product-overview",
    start: "top top",
    end: `+=${window.innerHeight * 10}px`,
    pin: true,
    pinSpacing: true,
    scrub: 1,
    onUpdate: ({ progress }) => {
      const headerProgress = Math.max(0, Math.min(1, (progress - 0.05) / 0.3));
      gsap.to(".header-1", {
        xPercent:
          progress < 0.05 ? 0 : progress > 0.35 ? -100 : -100 * headerProgress,
      });

      const maskSize =
        progress < 0.2
          ? 0
          : progress > 0.3
          ? 100
          : 100 * ((progress - 0.2) / 0.1);
      gsap.to(".circular-mask", {
        clipPath: `circle(${maskSize}% at 50% 50%)`,
      });

      const header2Progress = (progress - 0.15) / 0.35;
      const header2XPercent =
        progress < 0.15
          ? 100
          : progress > 0.5
          ? -200
          : 100 - 300 * header2Progress;
      gsap.to(".header-2", { xPercent: header2XPercent });

      const scaleX =
        progress < 0.45
          ? 0
          : progress > 0.65
          ? 100
          : 100 * ((progress - 0.45) / 0.2);
      gsap.to(".tooltip .divider", { scaleX: `${scaleX}%`, ...animOptions });

      tooltipSelectors.forEach(({ trigger, elements }) => {
        gsap.to(elements, {
          y: progress >= trigger ? "0%" : "125%",
          ...animOptions,
        });
      });

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
// ===== 4-Column Parallax — exact speed & size =====
const cols = document.querySelectorAll('.parallax-gallery .pg-col');
if (cols.length) {
  // ❶ SPEED PROFILE (left → right). Tweak these four numbers to match perfectly.
  const SPEEDS = [0.12, 0.24, 0.36, 0.52]; // reference-like drift
  // ❷ INERTIA (0 = snappy, 1 = never catches up). 0.12–0.16 feels like the video.
  const SMOOTHING = 0.14;

  // Reuse Lenis if present, else init once
  let lenis = window.__lenis;
  if (!lenis) {
    const { default: Lenis } = await import('lenis');
    lenis = new Lenis({ smoothWheel:true, duration:1.1, lerp:0.1 });
    window.__lenis = lenis;
  }

  // Fade cards in when they enter
  const io = new IntersectionObserver(entries=>{
    entries.forEach(e=>{ if(e.isIntersecting) e.target.classList.add('is-inview'); });
  }, { rootMargin:'0px 0px -15% 0px', threshold:0.01 });
  document.querySelectorAll('.pg-card').forEach(c=>io.observe(c));

  // Parallax by column
  const colState = new Map();
  cols.forEach((c,i)=>{ c.dataset.speed = SPEEDS[Math.min(i, SPEEDS.length-1)]; colState.set(c,0); });

  function updateParallax(){
    const vh = innerHeight;
    cols.forEach(col=>{
      const speed = parseFloat(col.dataset.speed);
      const rect  = col.getBoundingClientRect();
      const dist  = rect.top + rect.height/2 - vh/2;
      const target = -dist * speed;

      const prev = colState.get(col) || 0;
      const curr = prev + (target - prev) * SMOOTHING;  // inertia
      col.style.transform = `translateY(${curr}px)`;
      colState.set(col, curr);
    });
  }

  function raf(t){ lenis.raf(t); updateParallax(); requestAnimationFrame(raf); }
  requestAnimationFrame(raf);
  addEventListener('resize', updateParallax);
}
 // Parallax by column End.