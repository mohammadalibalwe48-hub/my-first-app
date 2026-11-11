// Renderer, lighting rig and post-processing shared by the film and the preview harness.
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { C } from "./materials.js";

const FinishShader = {
  uniforms: {
    tDiffuse: { value: null },
    uFrame: { value: 0 },
    uGrain: { value: 0.035 },
    uVignette: { value: 0.14 },
    uResolution: { value: new THREE.Vector2(1920, 1080) },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uFrame, uGrain, uVignette;
    uniform vec2 uResolution;
    varying vec2 vUv;
    float hash(vec3 p) {
      p = fract(p * 0.1031);
      p += dot(p, p.zyx + 31.32);
      return fract((p.x + p.y) * p.z);
    }
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      vec2 d = vUv - 0.5;
      d.x *= uResolution.x / uResolution.y;
      float v = smoothstep(1.15, 0.25, length(d));
      c.rgb *= mix(1.0 - uVignette, 1.0, v);
      // Film grain, stronger in mid-tones; doubles as dither against banding.
      float n = hash(vec3(gl_FragCoord.xy, mod(uFrame, 977.0))) - 0.5;
      float l = dot(c.rgb, vec3(0.299, 0.587, 0.114));
      c.rgb += n * uGrain * (0.55 + 0.45 * (1.0 - abs(l - 0.5) * 2.0));
      gl_FragColor = c;
    }`,
};

export function createStage({ width = 1920, height = 1080, scale = 1 } = {}) {
  const W = Math.round(width * scale);
  const H = Math.round(height * scale);
  const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.domElement.id = "gl";
  document.body.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(C.cream);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;

  const camera = new THREE.PerspectiveCamera(30, W / H, 0.05, 200);
  camera.position.set(0, 2, 8);

  // Key: warm late-afternoon sun from upper left. Fill: sky/ground bounce. Rim: cool kicker.
  const key = new THREE.DirectionalLight("#fff0dc", 2.6);
  key.position.set(-4.5, 8, 6);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.radius = 5;
  key.shadow.bias = -0.0003;
  key.shadow.normalBias = 0.015;
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 40;
  scene.add(key, key.target);

  const fill = new THREE.HemisphereLight("#fffaf2", "#e9d6bf", 0.9);
  scene.add(fill);
  const rim = new THREE.DirectionalLight("#dfe9ff", 1.4);
  rim.position.set(6, 5, -7);
  scene.add(rim);

  // Invisible floor that only catches shadows, so props sit on an infinite backdrop.
  const shadowFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.ShadowMaterial({ color: "#5a3a1e", opacity: 0.16 }),
  );
  shadowFloor.rotation.x = -Math.PI / 2;
  shadowFloor.receiveShadow = true;
  scene.add(shadowFloor);

  const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, rt);
  composer.setPixelRatio(1);
  composer.setSize(W, H);
  composer.addPass(new RenderPass(scene, camera));
  // Threshold well above lit-surface radiance: only HDR emissives (scan beam, glints) bloom.
  const bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), 0.4, 0.45, 3.2);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const finish = new ShaderPass(FinishShader);
  finish.uniforms.uResolution.value.set(W, H);
  composer.addPass(finish);

  /** Point the sun's shadow frustum at the action (dir = direction towards the light). */
  const defaultDir = new THREE.Vector3(-4.5, 8, 6).normalize();
  function fitShadow(center, radius, dir = defaultDir) {
    key.target.position.copy(center);
    key.position.copy(center).addScaledVector(dir, 15);
    const cam = key.shadow.camera;
    cam.left = -radius;
    cam.right = radius;
    cam.top = radius;
    cam.bottom = -radius;
    cam.updateProjectionMatrix();
  }
  fitShadow(new THREE.Vector3(), 4);

  function render(frame = 0) {
    finish.uniforms.uFrame.value = frame;
    composer.render();
    // Block until the GPU process has finished so the screenshot sees this frame.
    const gl = renderer.getContext();
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
  }

  return { renderer, scene, camera, composer, bloom, finish, lights: { key, fill, rim }, shadowFloor, fitShadow, render, W, H, scale };
}
