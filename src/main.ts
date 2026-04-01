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
import { GoldenGateBridge } from '@/landmarks/GoldenGateBridge';
import { landmarkRegistry } from '@/landmarks/index';
import { FlightCamera } from '@/camera/FlightCamera';
import { VehicleSystem } from '@/traffic/VehicleSystem';
import { Cityscape } from '@/traffic/Cityscape';
import { BirdSystem } from '@/traffic/BirdSystem';
import { TimeOfDay } from '@/atmosphere/TimeOfDay';
import { WeatherSystem, WeatherType } from '@/atmosphere/WeatherSystem';
import { MaterialUpdater } from '@/atmosphere/MaterialUpdater';
import { NightSky } from '@/atmosphere/NightSky';
import { HUD } from '@/ui/HUD';

function init() {
  const prog = document.getElementById('prog') as HTMLElement;
  prog.style.width = '10%';

  // Engine core
  const sm = new SceneManager();
  prog.style.width = '20%';

  // Materials
  const mats = createMaterials();
  prog.style.width = '25%';

  // Sky & Water
  const skyCtrl = new SkyController(sm);
  const water = createWater(sm.scene);
  prog.style.width = '35%';

  skyCtrl.updateSun(12, 235, water);
  const { sun: sunLight, hemisphere } = createLighting(sm.scene);
  prog.style.width = '45%';

  // Terrain
  createTerrain(sm.scene);
  prog.style.width = '55%';

  // Landmarks
  const ggb = new GoldenGateBridge(mats);
  landmarkRegistry.register(ggb);
  landmarkRegistry.buildAll();
  landmarkRegistry.addAllTo(sm.scene);
  prog.style.width = '65%';

  // Cityscape (boats, fog, Alcatraz — no downtown buildings, user removed them)
  const cityscape = new Cityscape();
  cityscape.build(sm.scene);

  const vehicles = new VehicleSystem();
  vehicles.build(sm.scene);

  const birds = new BirdSystem();
  birds.build(sm.scene);
  prog.style.width = '75%';

  // Atmosphere
  const timeOfDay = new TimeOfDay(17);
  const weatherSystem = new WeatherSystem();
  const matUpdater = new MaterialUpdater(sm, water, skyCtrl.sky, sunLight, hemisphere);
  const nightSky = new NightSky();
  sm.scene.add(nightSky.mesh);
  prog.style.width = '80%';

  // Input + Camera
  const input = new InputManager(sm.renderer.domElement);
  const flight = new FlightCamera(sm.camera, input.ctrl);

  input.setCallbacks(
    (n) => {
      flight.autoFly = false;
      if (n === 7) { weatherSystem.setWeather(WeatherType.Clear); return; }
      if (n === 8) { weatherSystem.setWeather(WeatherType.Fog); return; }
      if (n === 9) { weatherSystem.setWeather(WeatherType.Rain); return; }
      flight.goToViewpoint(n);
    },
    () => {
      timeOfDay.paused = !timeOfDay.paused;
    },
  );

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

  const hud = new HUD();
  prog.style.width = '90%';

  // PostFX
  const postfx = new PostFXPipeline(sm.renderer, sm.scene, sm.camera);
  window.addEventListener('resize', () => postfx.resize());

  // Game loop
  const loop = new GameLoop();

  loop.register((dt, elapsed) => {
    water.material.uniforms['time'].value = elapsed * 0.4;

    // Atmosphere
    const timeState = timeOfDay.update(dt);
    const weatherState = weatherSystem.update(dt);
    matUpdater.update(timeState, weatherState, dt);

    const nightFactor = 1 - Math.min(1, Math.max(0, timeState.sunIntensity / 0.8));
    nightSky.update(nightFactor, elapsed);

    // Camera + entities
    flight.update(dt);
    vehicles.update(dt);
    cityscape.update(dt, elapsed);
    birds.update(dt, elapsed);

    // UI
    hud.update(input.ctrl, sm.camera.position);
  });

  loop.setRender(() => postfx.render());
  prog.style.width = '100%';

  // Hide loading
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
