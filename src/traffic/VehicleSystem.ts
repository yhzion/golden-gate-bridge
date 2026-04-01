import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { BRIDGE, LANES, CAR_COLORS } from '@/config/bridge';

interface CarData {
  z: number;
  x: number;
  speed: number;
  dir: number;
  colorIdx: number;
  laneIdx: number;
  scaleX: number;
  scaleY: number;
}

const NUM_CARS = 80;

export class VehicleSystem {
  private cars: CarData[] = [];
  private bodyMesh!: THREE.InstancedMesh;
  private wheelMesh!: THREE.InstancedMesh;
  private tailMesh!: THREE.InstancedMesh;
  private headMesh!: THREE.InstancedMesh;
  private _mat = new THREE.Matrix4();
  private _pos = new THREE.Vector3();
  private _scale = new THREE.Vector3(1, 1, 1);
  private _qId = new THREE.Quaternion();
  private _qFlip = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);

  build(scene: THREE.Scene) {
    const shape = new THREE.Shape();
    shape.moveTo(-2.1, 0.12);
    shape.lineTo(2.1, 0.12);
    shape.lineTo(2.15, 0.4);
    shape.lineTo(1.7, 0.58);
    shape.lineTo(0.8, 1.08);
    shape.lineTo(-0.3, 1.08);
    shape.lineTo(-0.9, 0.62);
    shape.lineTo(-1.6, 0.52);
    shape.lineTo(-2.15, 0.38);
    shape.closePath();

    const bodyGeo = new THREE.ExtrudeGeometry(shape, {
      depth: 1.85, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 1,
    });
    bodyGeo.translate(0, 0, -0.925);
    bodyGeo.rotateY(Math.PI / 2);

    const bodyMat = new THREE.MeshStandardMaterial({ roughness: 0.25, metalness: 0.75 });
    this.bodyMesh = new THREE.InstancedMesh(bodyGeo, bodyMat, NUM_CARS);
    this.bodyMesh.castShadow = true;

    // Wheels
    const wheelR = 0.28, wheelW = 0.16;
    const singleWheel = new THREE.CylinderGeometry(wheelR, wheelR, wheelW, 8);
    singleWheel.rotateZ(Math.PI / 2);
    const wheelPositions: [number, number, number][] = [
      [-0.88, wheelR + 0.02, 1.15], [0.88, wheelR + 0.02, 1.15],
      [-0.88, wheelR + 0.02, -1.15], [0.88, wheelR + 0.02, -1.15],
    ];
    const wheelParts: THREE.BufferGeometry[] = wheelPositions.map(([x, y, z]) => {
      const w = singleWheel.clone();
      w.translate(x, y, z);
      return w;
    });
    const hubGeo = new THREE.CylinderGeometry(wheelR * 0.55, wheelR * 0.55, wheelW + 0.01, 6);
    hubGeo.rotateZ(Math.PI / 2);
    for (const [x, y, z] of wheelPositions) {
      const h = hubGeo.clone();
      h.translate(x, y, z);
      wheelParts.push(h);
    }

    const wheelSetGeo = mergeGeometries(wheelParts);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.85, metalness: 0.15 });
    this.wheelMesh = new THREE.InstancedMesh(wheelSetGeo, wheelMat, NUM_CARS);

    // Lights
    const lightGeo = new THREE.BoxGeometry(1.5, 0.18, 0.12);
    const tailMat = new THREE.MeshStandardMaterial({ emissive: 0xff3300, emissiveIntensity: 3.5, color: 0xff3300 });
    const headMat = new THREE.MeshStandardMaterial({ emissive: 0xffffcc, emissiveIntensity: 3.0, color: 0xffffcc });
    this.tailMesh = new THREE.InstancedMesh(lightGeo, tailMat, NUM_CARS);
    this.headMesh = new THREE.InstancedMesh(lightGeo, headMat, NUM_CARS);

    // Init cars
    const bridgeStart = -BRIDGE.sideSpan + 20;
    const bridgeEnd = BRIDGE.mainSpan + BRIDGE.sideSpan - 20;
    const bridgeLen = bridgeEnd - bridgeStart;

    for (let i = 0; i < NUM_CARS; i++) {
      const dir = i < NUM_CARS / 2 ? 1 : -1;
      const laneIdx = dir > 0 ? Math.floor(Math.random() * 3) + 3 : Math.floor(Math.random() * 3);
      this.cars.push({
        z: bridgeStart + Math.random() * bridgeLen,
        x: LANES[laneIdx],
        speed: (18 + Math.random() * 6) * dir,
        dir,
        colorIdx: Math.floor(Math.random() * CAR_COLORS.length),
        laneIdx,
        scaleX: 0.9 + Math.random() * 0.25,
        scaleY: 0.85 + Math.random() * 0.4,
      });
      this.bodyMesh.setColorAt(i, new THREE.Color(CAR_COLORS[this.cars[i].colorIdx]));
    }
    this.bodyMesh.instanceColor!.needsUpdate = true;

    scene.add(this.bodyMesh, this.wheelMesh, this.tailMesh, this.headMesh);
    this.updateMatrices();
  }

  update(dt: number) {
    const bridgeStart = -BRIDGE.sideSpan + 20;
    const bridgeEnd = BRIDGE.mainSpan + BRIDGE.sideSpan - 20;

    for (const c of this.cars) {
      c.z += c.speed * dt;
      if (c.dir > 0 && c.z > bridgeEnd) c.z = bridgeStart;
      if (c.dir < 0 && c.z < bridgeStart) c.z = bridgeEnd;
    }
    this.updateMatrices();
  }

  private updateMatrices() {
    for (let i = 0; i < NUM_CARS; i++) {
      const c = this.cars[i];
      const y = BRIDGE.deckH + 0.01;
      const q = c.dir > 0 ? this._qId : this._qFlip;

      this._pos.set(c.x, y, c.z);
      this._scale.set(c.scaleX, c.scaleY, 1);
      this._mat.compose(this._pos, q, this._scale);
      this.bodyMesh.setMatrixAt(i, this._mat);

      this._scale.set(c.scaleX, 1, 1);
      this._mat.compose(this._pos, q, this._scale);
      this.wheelMesh.setMatrixAt(i, this._mat);

      this._scale.set(1, 1, 1);
      this._pos.set(c.x, y + 0.32 * c.scaleY, c.z - 2.1 * c.dir);
      this._mat.compose(this._pos, this._qId, this._scale);
      this.tailMesh.setMatrixAt(i, this._mat);

      this._pos.set(c.x, y + 0.32 * c.scaleY, c.z + 2.1 * c.dir);
      this._mat.compose(this._pos, this._qId, this._scale);
      this.headMesh.setMatrixAt(i, this._mat);
    }
    this.bodyMesh.instanceMatrix.needsUpdate = true;
    this.wheelMesh.instanceMatrix.needsUpdate = true;
    this.tailMesh.instanceMatrix.needsUpdate = true;
    this.headMesh.instanceMatrix.needsUpdate = true;
  }
}
