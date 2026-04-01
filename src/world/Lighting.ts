import * as THREE from 'three';

export function createLighting(scene: THREE.Scene) {
  const sun = new THREE.DirectionalLight(0xffddbb, 1.5);
  sun.position.set(-600, 300, -400);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 10;
  sun.shadow.camera.far = 3000;
  sun.shadow.camera.left = -1500;
  sun.shadow.camera.right = 1500;
  sun.shadow.camera.top = 400;
  sun.shadow.camera.bottom = -50;
  sun.shadow.bias = -0.0003;
  scene.add(sun);

  scene.add(new THREE.HemisphereLight(0x87ceeb, 0x3a5f3a, 0.6));
  scene.add(new THREE.AmbientLight(0x404050, 0.3));

  return sun;
}
