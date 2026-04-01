import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const NUM_BIRDS = 20;

interface BirdData {
  cx: number;
  cz: number;
  radius: number;
  height: number;
  speed: number;
  phase: number;
  flapSpeed: number;
}

export class BirdSystem {
  private mesh!: THREE.InstancedMesh;
  private data: BirdData[] = [];
  private _m = new THREE.Matrix4();
  private _p = new THREE.Vector3();
  private _q = new THREE.Quaternion();
  private _s = new THREE.Vector3(1, 1, 1);
  private _e = new THREE.Euler();

  build(scene: THREE.Scene) {
    const wingL = new THREE.BufferGeometry();
    wingL.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0, -1.5, 0.15, 0.25, -0.3, 0, 0.7]), 3));
    const wingR = new THREE.BufferGeometry();
    wingR.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0, 1.5, 0.15, 0.25, 0.3, 0, 0.7]), 3));
    const birdGeo = mergeGeometries([wingL, wingR])!;
    birdGeo.computeVertexNormals();
    const birdMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.8, side: THREE.DoubleSide });
    this.mesh = new THREE.InstancedMesh(birdGeo, birdMat, NUM_BIRDS);

    const rng = (s: number) => { const x = Math.sin(s) * 43758.5453; return x - Math.floor(x); };
    for (let i = 0; i < NUM_BIRDS; i++) {
      this.data.push({
        cx: -150 + rng(i * 7.1) * 500,
        cz: -100 + rng(i * 3.3) * 1500,
        radius: 25 + rng(i * 11.7) * 70,
        height: 75 + rng(i * 5.9) * 160,
        speed: 0.25 + rng(i * 9.1) * 0.4,
        phase: rng(i * 2.1) * Math.PI * 2,
        flapSpeed: 3 + rng(i * 4.4) * 2,
      });
    }
    scene.add(this.mesh);
  }

  update(_dt: number, elapsed: number) {
    for (let i = 0; i < NUM_BIRDS; i++) {
      const bd = this.data[i];
      const angle = elapsed * bd.speed + bd.phase;
      this._p.set(
        bd.cx + Math.cos(angle) * bd.radius,
        bd.height + Math.sin(elapsed * 0.5 + bd.phase) * 5,
        bd.cz + Math.sin(angle) * bd.radius,
      );
      const flap = Math.sin(elapsed * bd.flapSpeed + bd.phase) * 0.25;
      this._e.set(flap, -angle - Math.PI / 2, 0.15);
      this._q.setFromEuler(this._e);
      this._m.compose(this._p, this._q, this._s);
      this.mesh.setMatrixAt(i, this._m);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
