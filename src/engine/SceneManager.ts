import * as THREE from 'three';

export class SceneManager {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  sceneEnv: THREE.Scene;
  pmremGen: THREE.PMREMGenerator;
  envTarget: THREE.WebGLRenderTarget | null = null;

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0xc8bfaa, 0.00008);

    this.camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.5, 80000);
    this.camera.position.set(-400, 180, -250);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.45;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    document.body.appendChild(this.renderer.domElement);

    this.sceneEnv = new THREE.Scene();
    this.pmremGen = new THREE.PMREMGenerator(this.renderer);
    this.pmremGen.compileEquirectangularShader();

    window.addEventListener('resize', this.onResize);
  }

  private onResize = () => {
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(innerWidth, innerHeight);
  };

  dispose() {
    window.removeEventListener('resize', this.onResize);
    this.pmremGen.dispose();
    if (this.envTarget) this.envTarget.dispose();
    this.renderer.dispose();
  }
}
