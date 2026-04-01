import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import type { Water } from 'three/examples/jsm/objects/Water.js';
import type { SceneManager } from '@/engine/SceneManager';

export class SkyController {
  sky: Sky;
  sun = new THREE.Vector3();
  private sm: SceneManager;

  constructor(sm: SceneManager) {
    this.sm = sm;
    this.sky = new Sky();
    this.sky.scale.setScalar(50000);
    const u = this.sky.material.uniforms;
    u['turbidity'].value = 4;
    u['rayleigh'].value = 1.5;
    u['mieCoefficient'].value = 0.003;
    u['mieDirectionalG'].value = 0.7;
    sm.scene.add(this.sky);
  }

  updateSun(elev: number, azim: number, water: Water) {
    const phi = THREE.MathUtils.degToRad(90 - elev);
    const theta = THREE.MathUtils.degToRad(azim);
    this.sun.setFromSphericalCoords(1, phi, theta);

    this.sky.material.uniforms['sunPosition'].value.copy(this.sun);
    water.material.uniforms['sunDirection'].value.copy(this.sun).normalize();

    if (this.sm.envTarget) this.sm.envTarget.dispose();
    this.sm.sceneEnv.add(this.sky);
    this.sm.envTarget = this.sm.pmremGen.fromScene(this.sm.sceneEnv);
    this.sm.scene.add(this.sky);
    this.sm.scene.environment = this.sm.envTarget.texture;
  }
}
