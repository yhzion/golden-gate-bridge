import * as THREE from 'three';
import { SceneManager } from '@/engine/SceneManager';
import { GameLoop } from '@/engine/GameLoop';
import { InputManager } from '@/engine/InputManager';
import { PostFXPipeline } from '@/postfx/PostFXPipeline';
import { createMaterials } from '@/world/Materials';
import { SkyController } from '@/world/SkyController';
import { createWater } from '@/world/Water';
import { createLighting } from '@/world/Lighting';
import { createTerrain } from '@/world/TerrainGenerator';
import { BridgeAssembler } from '@/landmarks/bridge/BridgeAssembler';
import { landmarkRegistry } from '@/landmarks/index';
import { FlightCamera } from '@/camera/FlightCamera';
import { CINEMATIC_SHOTS } from '@/camera/shots';
import { VehicleSystem } from '@/traffic/VehicleSystem';
import { Cityscape } from '@/traffic/Cityscape';
import { BirdSystem } from '@/traffic/BirdSystem';
import { TimeOfDay } from '@/atmosphere/TimeOfDay';
import { WeatherSystem, WeatherType } from '@/atmosphere/WeatherSystem';
import { MaterialUpdater } from '@/atmosphere/MaterialUpdater';
import { LightingManager } from '@/lighting/LightingManager';
import { HUD } from '@/ui/HUD';
import { Clock } from '@/ui/Clock';
import { DriveMode } from '@/drive/DriveMode';

function init() {
  const prog = document.getElementById('prog') as HTMLElement;
  prog.style.width = '10%';

  const sm = new SceneManager();
  prog.style.width = '20%';

  const mats = createMaterials();
  prog.style.width = '25%';

  const skyCtrl = new SkyController(sm);
  const water = createWater(sm.scene);
  prog.style.width = '35%';

  skyCtrl.updateSun(12, 235, water);
  const { sun: sunLight, hemisphere } = createLighting(sm.scene);
  prog.style.width = '45%';

  createTerrain(sm.scene);
  prog.style.width = '55%';

  const ggb = new BridgeAssembler(mats);
  landmarkRegistry.register(ggb);
  landmarkRegistry.buildAll();
  landmarkRegistry.addAllTo(sm.scene);
  prog.style.width = '65%';

  const cityscape = new Cityscape();
  cityscape.build(sm.scene);

  const vehicles = new VehicleSystem();
  vehicles.build(sm.scene);

  const birds = new BirdSystem();
  birds.build(sm.scene);

  prog.style.width = '75%';

  const timeOfDay = new TimeOfDay();
  const weatherSystem = new WeatherSystem();
  const matUpdater = new MaterialUpdater(sm, water, skyCtrl.sky, sunLight, hemisphere);
  prog.style.width = '80%';

  // Cinematic Lighting System
  const lightingManager = new LightingManager(sm.scene, sm.camera);

  const input = new InputManager(sm.renderer.domElement);
  const flight = new FlightCamera(sm.camera, input.ctrl);

  // UI
  const hud = new HUD();
  const clock = new Clock();
  prog.style.width = '90%';

  const postfx = new PostFXPipeline(sm.renderer, sm.scene, sm.camera, lightingManager);
  window.addEventListener('resize', () => postfx.resize());

  // Drive mode
  const driveMode = new DriveMode(sm.scene, sm.camera, mats);
  driveMode.load(); // async, non-blocking

  const driveBtn = document.getElementById('driveBtn')!;
  driveBtn.addEventListener('click', () => {
    if (driveMode.isActive()) {
      driveMode.exit();
      driveBtn.textContent = 'DRIVE';
    } else {
      driveMode.enter(ggb.group);
      driveBtn.textContent = 'EXIT DRIVE';
    }
  });

  // Mouse move for drive mode
  document.addEventListener('mousemove', (e) => {
    if (driveMode.isActive()) {
      driveMode.onMouseMove(e.movementX, e.movementY);
    }
  });

  // Key handlers for drive mode
  document.addEventListener('keydown', (e) => {
    if (driveMode.isActive()) {
      driveMode.onKeyDown(e.key);
    }
    if (e.key === 'm' || e.key === 'M') {
      if (driveMode.isActive()) {
        driveMode.exit();
        driveBtn.textContent = 'DRIVE';
      } else {
        driveMode.enter(ggb.group);
        driveBtn.textContent = 'EXIT DRIVE';
      }
    }
  });

  input.setCallbacks(
    (n) => {
      if (n === 7) { weatherSystem.setWeather(WeatherType.Clear); return; }
      if (n === 8) { weatherSystem.setWeather(WeatherType.Fog); return; }
      if (n === 9) { weatherSystem.setWeather(WeatherType.Rain); return; }
    },
    () => {
      timeOfDay.paused = !timeOfDay.paused;
    },
    (key) => {
      if (key === 'L') {
        lightingManager.cycleQualityTier();
      } else if (key === 'G') {
        const gr = postfx.godRays;
        gr.setGodRaysEnabled(!gr.isGodRaysEnabled());
      }
    },
  );

  // Cinematic ↔ free-flight mode switch
  document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement === sm.renderer.domElement) {
      flight.enterFreeFlight();
    } else {
      flight.enterCinematic();
    }
  });

  // Shot name display
  const shotLabel = document.getElementById('viewpoint-label');
  flight.director.onShotChange = (name) => {
    if (shotLabel) {
      shotLabel.textContent = name;
      shotLabel.style.opacity = '1';
      setTimeout(() => (shotLabel.style.opacity = '0'), 2000);
    }
  };
  // Fire initial shot name
  flight.director.onShotChange(CINEMATIC_SHOTS[0].name);

  // UI — help toggle
  const helpToggle = document.getElementById('helpToggle');
  const controlsHelp = document.getElementById('controlsHelp');
  if (helpToggle && controlsHelp) {
    helpToggle.addEventListener('click', () => {
      controlsHelp.classList.toggle('show');
    });
  }

  // FLY button — enters 1st person
  const startBtn = document.getElementById('startBtn');
  if (startBtn) {
    startBtn.addEventListener('click', () => {
      sm.renderer.domElement.requestPointerLock();
    });
  }

  const loop = new GameLoop();

  loop.register((dt, elapsed) => {
    water.material.uniforms['time'].value = elapsed * 0.4;
    water.material.uniforms['glitterTime'].value = elapsed * 0.6;

    const timeState = timeOfDay.update(dt);
    const weatherState = weatherSystem.update(dt);
    matUpdater.update(timeState, weatherState, dt);

    // Cinematic lighting
    lightingManager.update(dt, elapsed, timeState);
    postfx.updateLighting(timeState, weatherState);

    // Bridge updatable parts
    ggb.update(dt, elapsed);

    const nightFactor = 1 - Math.min(timeState.sunIntensity / 0.25, 1);

    if (driveMode.isActive()) {
      driveMode.update(dt, elapsed, timeState);
    } else {
      flight.update(dt);
      vehicles.update(dt);
      cityscape.update(dt, elapsed);
      birds.update(dt, elapsed);
    }

    // HUD visibility
    const flightHud = document.getElementById('hud')!;
    flightHud.style.display = driveMode.isActive() ? 'none' : '';

    clock.update(dt);

    const qt = lightingManager.qualityTier;
    const tierLabel = qt.getMode() === 'auto'
      ? `AUTO (${qt.getCurrentTier().toUpperCase()})`
      : qt.getCurrentTier().toUpperCase();
    hud.update(input.ctrl, sm.camera.position, tierLabel, qt.getAverageFPS());
  });

  loop.setRender(() => postfx.render());
  prog.style.width = '100%';

  setTimeout(() => {
    const loading = document.getElementById('loading');
    if (loading) {
      loading.style.opacity = '0';
      setTimeout(() => (loading.style.display = 'none'), 1500);
    }
  }, 500);

  loop.start();
}

init();
