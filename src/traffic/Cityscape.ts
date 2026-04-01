import * as THREE from 'three';

interface BoatGroup extends THREE.Group {
  userData: { phase: number };
}

export class Cityscape {
  boats: BoatGroup[] = [];

  build(scene: THREE.Scene) {
    const g = new THREE.Group();

    // Boats
    const boatPositions: [number, number, number][] = [
      [300, 0, 800], [500, 0, 500], [-200, 0, 900], [700, 0, 300],
      [900, 0, 650], [-100, 0, 1200], [400, 0, 1100], [150, 0, 400],
    ];
    for (const bp of boatPositions) {
      const bg = new THREE.Group() as BoatGroup;
      const hullPts: THREE.Vector2[] = [];
      for (let j = 0; j <= 12; j++) {
        const t = j / 12;
        hullPts.push(new THREE.Vector2(Math.sin(t * Math.PI) * 2.5 + 0.2, t * 14 - 7));
      }
      const hullGeo = new THREE.LatheGeometry(hullPts, 8);
      hullGeo.rotateX(Math.PI / 2);
      hullGeo.scale(1, 0.35, 1);
      const hull = new THREE.Mesh(hullGeo, new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.35, metalness: 0.2 }));
      hull.position.y = 0.5;
      bg.add(hull);
      const deckMesh = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.15, 12), new THREE.MeshStandardMaterial({ color: 0x8b7355, roughness: 0.8 }));
      deckMesh.position.y = 1.2;
      bg.add(deckMesh);
      const cab = new THREE.Mesh(new THREE.BoxGeometry(2.8, 2.2, 4), new THREE.MeshStandardMaterial({ color: 0x334455, roughness: 0.4 }));
      cab.position.set(0, 2.4, -1);
      bg.add(cab);
      const cabRoof = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.12, 4.5), new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.5 }));
      cabRoof.position.set(0, 3.55, -1);
      bg.add(cabRoof);
      const winMat = new THREE.MeshStandardMaterial({ color: 0x88bbdd, emissive: 0x224466, emissiveIntensity: 0.3 });
      for (const side of [-1, 1]) {
        for (let wz = -2.5; wz <= 0.5; wz += 1.0) {
          const win = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.9), winMat);
          win.position.set(side * 1.41, 2.5, wz);
          win.rotation.y = side * Math.PI / 2;
          bg.add(win);
        }
      }
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 4, 4), new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8 }));
      mast.position.set(0, 5.5, -1);
      bg.add(mast);

      bg.position.set(bp[0], bp[1], bp[2]);
      bg.rotation.y = Math.random() * Math.PI;
      bg.userData.phase = Math.random() * Math.PI * 2;
      this.boats.push(bg);
      g.add(bg);
    }

    scene.add(g);
  }

  update(_dt: number, elapsed: number) {
    for (const b of this.boats) {
      b.position.y = Math.sin(elapsed * 0.8 + b.userData.phase) * 0.4;
      b.rotation.x = Math.sin(elapsed * 0.6 + b.userData.phase + 1) * 0.02;
      b.rotation.z = Math.sin(elapsed * 0.5 + b.userData.phase + 2) * 0.015;
    }
  }
}
