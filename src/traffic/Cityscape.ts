import * as THREE from 'three';

interface BoatGroup extends THREE.Group {
  userData: { phase: number };
}

interface FogMesh extends THREE.Mesh {
  userData: { baseX: number; baseZ: number; driftSpeed: number; phase: number };
}

export class Cityscape {
  boats: BoatGroup[] = [];
  fogMeshes: FogMesh[] = [];

  build(scene: THREE.Scene) {
    const g = new THREE.Group();

    // Alcatraz
    const alcRockMat = new THREE.MeshStandardMaterial({ color: 0x8a7d6b, roughness: 0.9 });
    const alcWallMat = new THREE.MeshStandardMaterial({ color: 0xccbbaa, roughness: 0.8 });
    const alcBase = new THREE.Mesh(new THREE.CylinderGeometry(55, 65, 18, 8), alcRockMat);
    alcBase.position.set(1200, 4, 400);
    alcBase.scale.set(1.1, 1, 0.7);
    g.add(alcBase);
    const alcTop = new THREE.Mesh(new THREE.CylinderGeometry(45, 55, 8, 8), alcRockMat);
    alcTop.position.set(1200, 15, 400);
    alcTop.scale.set(1.1, 1, 0.7);
    g.add(alcTop);
    const cellhouse = new THREE.Mesh(new THREE.BoxGeometry(80, 12, 18), alcWallMat);
    cellhouse.position.set(1200, 25, 400);
    g.add(cellhouse);
    const roofMesh = new THREE.Mesh(new THREE.BoxGeometry(82, 1.5, 20), new THREE.MeshStandardMaterial({ color: 0x888880, roughness: 0.7 }));
    roofMesh.position.set(1200, 31.5, 400);
    g.add(roofMesh);
    const lhTower = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 3, 20, 8), alcWallMat);
    lhTower.position.set(1200, 29, 385);
    g.add(lhTower);
    const lhLamp = new THREE.Mesh(
      new THREE.CylinderGeometry(3, 2.5, 4, 8),
      new THREE.MeshStandardMaterial({ color: 0xccddee, emissive: 0xffffaa, emissiveIntensity: 0.6, roughness: 0.1, metalness: 0.3 }),
    );
    lhLamp.position.set(1200, 41, 385);
    g.add(lhLamp);
    const lhCap = new THREE.Mesh(new THREE.ConeGeometry(3.5, 3, 8), new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.5 }));
    lhCap.position.set(1200, 44, 385);
    g.add(lhCap);
    const wt = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 15, 6), new THREE.MeshStandardMaterial({ color: 0x999999, roughness: 0.6, metalness: 0.3 }));
    wt.position.set(1225, 26, 410);
    g.add(wt);

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

    // Fog bank
    const fogMat = new THREE.MeshStandardMaterial({ color: 0xddd8cc, transparent: true, opacity: 0.15, depthWrite: false, side: THREE.DoubleSide });
    for (let i = 0; i < 8; i++) {
      const fm = new THREE.Mesh(new THREE.SphereGeometry(200 + Math.random() * 300, 8, 6), fogMat) as unknown as FogMesh;
      fm.position.set(-1500 - Math.random() * 2000, 30 + Math.random() * 100, -500 + Math.random() * 3000);
      fm.scale.set(1, 0.3, 1);
      fm.userData.baseX = fm.position.x;
      fm.userData.baseZ = fm.position.z;
      fm.userData.driftSpeed = 0.3 + Math.random() * 0.5;
      fm.userData.phase = Math.random() * Math.PI * 2;
      this.fogMeshes.push(fm);
      g.add(fm);
    }

    scene.add(g);
  }

  update(_dt: number, elapsed: number) {
    for (const b of this.boats) {
      b.position.y = Math.sin(elapsed * 0.8 + b.userData.phase) * 0.4;
      b.rotation.x = Math.sin(elapsed * 0.6 + b.userData.phase + 1) * 0.02;
      b.rotation.z = Math.sin(elapsed * 0.5 + b.userData.phase + 2) * 0.015;
    }
    for (const fm of this.fogMeshes) {
      fm.position.x = fm.userData.baseX + Math.sin(elapsed * 0.02 * fm.userData.driftSpeed + fm.userData.phase) * 150;
      fm.position.z = fm.userData.baseZ + Math.cos(elapsed * 0.015 * fm.userData.driftSpeed + fm.userData.phase) * 80;
    }
  }
}
