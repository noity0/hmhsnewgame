import * as THREE from 'three';
import React, { useEffect, useRef, useState } from 'react';
import { HUD } from './components/HUD';
import { WorldEditorModal } from './components/WorldEditorModal';
import { InventoryModal } from './components/InventoryModal';
import { VillagerVitalsModal } from './components/VillagerVitalsModal';
import { PauseMenuModal } from './components/PauseMenuModal';
import { CameraMode, InteractionPrompt, PlayerController } from './game/player';
import { PhysicsWorld } from './game/physics';
import { WeatherSystem, TimePreset } from './game/weather';
import { VillageWorld } from './game/world';
import { InventoryItem, InventorySystem } from './game/inventory';
import { VillagerData, VillagerSystem } from './game/villagers';
import { ZombieManager } from './game/zombies';

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);

  // References for game engine systems
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const physicsRef = useRef<PhysicsWorld | null>(null);
  const weatherRef = useRef<WeatherSystem | null>(null);
  const worldRef = useRef<VillageWorld | null>(null);
  const playerRef = useRef<PlayerController | null>(null);
  const inventoryRef = useRef<InventorySystem>(new InventorySystem());
  const villagerSystemRef = useRef<VillagerSystem | null>(null);
  const zombieManagerRef = useRef<ZombieManager | null>(null);

  // HUD and UI state
  const [playerState, setPlayerState] = useState<PlayerController | null>(null);
  const [worldState, setWorldState] = useState<VillageWorld | null>(null);
  const [weatherState, setWeatherState] = useState<WeatherSystem | null>(null);
  const [villagerSystemState, setVillagerSystemState] = useState<VillagerSystem | null>(null);
  const [prompt, setPrompt] = useState<InteractionPrompt | null>(null);
  const [fps, setFps] = useState(120);
  const [timeString, setTimeString] = useState('10:00 AM');
  const [cameraMode, setCameraMode] = useState<CameraMode>('first');
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [isZeroGrav, setIsZeroGrav] = useState(false);
  const [physicsObjectCount, setPhysicsObjectCount] = useState(0);
  const [isPointerLocked, setIsPointerLocked] = useState(false);
  const [qualityPreset, setQualityPreset] = useState<'low' | 'middle' | 'high' | 'max'>('middle');

  // Combat, Vitals & Night Horde State
  const [playerHealth, setPlayerHealth] = useState(100);
  const [bulletCount, setBulletCount] = useState(64);
  const [gunLoadedAmmo, setGunLoadedAmmo] = useState(6);
  const [gunMagCapacity, setGunMagCapacity] = useState(6);
  const [isAiming, setIsAiming] = useState(false);
  const [isReloading, setIsReloading] = useState(false);
  const [activeZombiesCount, setActiveZombiesCount] = useState(0);
  const [isNightHorde, setIsNightHorde] = useState(false);
  const [zombiesKilled, setZombiesKilled] = useState(0);
  const [isHurt, setIsHurt] = useState(false);

  // Modals & Pause State
  const [isGamePaused, setIsGamePaused] = useState(false);
  const isGamePausedRef = useRef(false);
  const [isWorldEditorOpen, setIsWorldEditorOpen] = useState(false);
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [isVitalsOpen, setIsVitalsOpen] = useState(false);
  const [inspectedVillager, setInspectedVillager] = useState<VillagerData | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    // 1. Three.js Scene & Camera
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      70,
      container.clientWidth / container.clientHeight,
      0.1,
      250
    );
    cameraRef.current = camera;

    // 2. High Quality WebGL Renderer optimized for rock-solid 120 FPS
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.35));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;

    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 3. Physics (120Hz Sub-stepping) & Dynamic Weather (1hr = 30s)
    const physics = new PhysicsWorld();
    physicsRef.current = physics;

    const weather = new WeatherSystem(scene);
    weatherRef.current = weather;
    setWeatherState(weather);

    // 4. Village 3D World (houses, tavern, church, bridges, windmill, waving trees)
    const world = new VillageWorld(scene, physics, weather);
    worldRef.current = world;
    setWorldState(world);

    // 5. Living Villagers with Real Human Figures, Organs & AI
    const villagerSystem = new VillagerSystem(scene, physics, weather);
    villagerSystemRef.current = villagerSystem;
    setVillagerSystemState(villagerSystem);

    // 6. Minecraft Inventory, Zombie Horde Manager & Player Controller
    const inventory = inventoryRef.current;
    const zombieManager = new ZombieManager(scene, inventory);
    zombieManagerRef.current = zombieManager;

    const player = new PlayerController(
      camera,
      renderer.domElement,
      physics,
      world,
      inventory,
      villagerSystem
    );
    player.zombieManager = zombieManager;
    zombieManager.onBulletsAutoConnected = (count: number) => {
      player.onBulletsAutoConnected(count);
    };
    playerRef.current = player;
    setPlayerState(player);
    setPhysicsObjectCount(physics.objects.length);

    // Pointer lock state listener
    const onPointerLockChange = () => {
      setIsPointerLocked(document.pointerLockElement === renderer.domElement);
    };
    document.addEventListener('pointerlockchange', onPointerLockChange);

    // Window resize handler
    const handleResize = () => {
      if (!container || !camera || !renderer) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    // Global Key shortcuts for G, V, F, Q, P (Pause), Escape
    const onKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }
      if (e.code === 'KeyG') {
        const zg = physics.toggleZeroGravity();
        setIsZeroGrav(zg);
      } else if (e.code === 'KeyP') {
        setIsGamePaused(prev => {
          const next = !prev;
          isGamePausedRef.current = next;
          if (next && document.pointerLockElement) {
            document.exitPointerLock();
          }
          return next;
        });
      } else if (e.code === 'Escape') {
        if (isGamePausedRef.current) {
          setIsGamePaused(false);
          isGamePausedRef.current = false;
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);

    // AI World Crafter Modal toggle listener
    const onToggleWorldEditor = () => {
      if (document.pointerLockElement) {
        document.exitPointerLock();
      }
      setIsWorldEditorOpen(prev => !prev);
    };
    window.addEventListener('toggle-world-editor', onToggleWorldEditor);

    // Minecraft Inventory toggle listener
    const onToggleInventory = () => {
      if (document.pointerLockElement) {
        document.exitPointerLock();
      }
      setIsInventoryOpen(prev => !prev);
    };
    window.addEventListener('toggle-inventory', onToggleInventory);

    // Inspect Villager Vitals modal listener
    const onOpenVillagerVitals = (e: Event) => {
      const customEvent = e as CustomEvent<VillagerData>;
      if (document.pointerLockElement) {
        document.exitPointerLock();
      }
      setInspectedVillager(customEvent.detail);
      setIsVitalsOpen(true);
    };
    window.addEventListener('open-villager-vitals', onOpenVillagerVitals);

    // 7. 120 FPS Locked & Stable Game Animation Loop
    const clock = new THREE.Clock();
    let animationFrameId: number;
    let frameCount = 0;
    let lastFpsUpdate = performance.now();

    const fpsTarget = 120;
    const frameInterval = 1000 / fpsTarget; // ~8.333ms per frame
    let lastFrameTime = performance.now();

    const animate = (now: number) => {
      animationFrameId = requestAnimationFrame(animate);

      // Stable 120 FPS frame pacing
      const elapsedSinceLast = now - lastFrameTime;
      if (elapsedSinceLast < frameInterval - 0.5) {
        return;
      }
      lastFrameTime = now - (elapsedSinceLast % frameInterval);

      const delta = Math.min(clock.getDelta(), 0.033);
      const elapsed = clock.getElapsedTime();

      // If game is paused, render static scene and skip physics/AI/weather updates
      if (isGamePausedRef.current) {
        renderer.render(scene, camera);
        return;
      }

      // Update player, deep physics, waving trees, weather & living villagers
      player.update(delta);
      world.update(delta, elapsed);
      weather.update(delta);
      villagerSystem.update(delta, player.position, isZeroGrav);

      // Night-time only Zombie Horde (easy fight with shovels/hands)
      const isNight = weather.isNightTime();
      zombieManager.update(delta, player.position, isNight, (damage) => {
        player.takeDamage(damage);
      });

      // Render scene
      renderer.render(scene, camera);

      // FPS calculation & state syncing
      frameCount++;
      if (now - lastFpsUpdate >= 300) {
        setFps(Math.round((frameCount * 1000) / (now - lastFpsUpdate)));
        frameCount = 0;
        lastFpsUpdate = now;

        setTimeString(weather.getClockString());
        setPrompt(player.currentPrompt);
        setCameraMode(player.cameraMode);
        setIsTorchOn(player.isTorchOn);
        setPhysicsObjectCount(physics.objects.length);

        // Combat & Vitals syncing
        setPlayerHealth(player.health);
        setBulletCount(inventory.getItemCount('gun_bullets'));
        setGunLoadedAmmo(player.gunLoadedAmmo);
        setGunMagCapacity(player.gunMagCapacity);
        setIsAiming(player.isAiming);
        setIsReloading(player.isReloading);
        setActiveZombiesCount(zombieManager.activeZombiesCount);
        setIsNightHorde(isNight);
        setZombiesKilled(zombieManager.totalKilled);
        setIsHurt(player.hurtFlashTimer > 0);
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    // Cleanup on unmount
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('toggle-world-editor', onToggleWorldEditor);
      window.removeEventListener('toggle-inventory', onToggleInventory);
      window.removeEventListener('open-villager-vitals', onOpenVillagerVitals);
      document.removeEventListener('pointerlockchange', onPointerLockChange);

      zombieManager.dispose();

      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  const handleTogglePause = () => {
    setIsGamePaused(prev => {
      const next = !prev;
      isGamePausedRef.current = next;
      if (next && document.pointerLockElement) {
        document.exitPointerLock();
      }
      return next;
    });
  };

  const handleResumeGame = () => {
    setIsGamePaused(false);
    isGamePausedRef.current = false;
    if (rendererRef.current && rendererRef.current.domElement) {
      rendererRef.current.domElement.requestPointerLock?.();
    }
  };

  const handleOpenWorldEditor = () => {
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
    setIsWorldEditorOpen(true);
  };

  const handleOpenInventory = () => {
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
    setIsInventoryOpen(true);
  };

  const handleOpenVillagerVitalsManual = () => {
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
    if (villagerSystemRef.current && villagerSystemRef.current.villagers.length > 0) {
      setInspectedVillager(villagerSystemRef.current.villagers[0]);
      setIsVitalsOpen(true);
    }
  };

  const handleSyncState = () => {
    if (weatherRef.current) setTimeString(weatherRef.current.getClockString());
    if (physicsRef.current) {
      setPhysicsObjectCount(physicsRef.current.objects.length);
      setIsZeroGrav(physicsRef.current.isZeroGravity);
    }
  };

  const handleToggleCamera = () => {
    if (playerRef.current) {
      playerRef.current.toggleCameraMode();
      setCameraMode(playerRef.current.cameraMode);
    }
  };

  const handleToggleTorch = () => {
    if (playerRef.current) {
      playerRef.current.toggleTorch();
      setIsTorchOn(playerRef.current.isTorchOn);
    }
  };

  const handleToggleZeroGrav = () => {
    if (physicsRef.current) {
      const zg = physicsRef.current.toggleZeroGravity();
      setIsZeroGrav(zg);
    }
  };

  const handleSetTimePreset = (preset: TimePreset) => {
    if (weatherRef.current) {
      weatherRef.current.setTimePreset(preset);
      setTimeString(weatherRef.current.getClockString());
    }
  };

  const handleSetQuality = (preset: 'low' | 'middle' | 'high' | 'max') => {
    setQualityPreset(preset);
    if (physicsRef.current) {
      physicsRef.current.setQuality(preset);
    }
    if (rendererRef.current) {
      if (preset === 'low') {
        rendererRef.current.setPixelRatio(1.0);
        rendererRef.current.shadowMap.enabled = false;
      } else if (preset === 'middle') {
        rendererRef.current.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
        rendererRef.current.shadowMap.enabled = true;
      } else if (preset === 'high') {
        rendererRef.current.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        rendererRef.current.shadowMap.enabled = true;
      } else {
        rendererRef.current.setPixelRatio(Math.min(window.devicePixelRatio, 2.0));
        rendererRef.current.shadowMap.enabled = true;
      }
    }
  };

  const handleSpawnProp = (type: 'crate' | 'barrel' | 'gold' | 'chair') => {
    if (!playerRef.current || !worldRef.current) return;
    const player = playerRef.current;
    const world = worldRef.current;

    const forward = new THREE.Vector3();
    player.camera.getWorldDirection(forward);
    const spawnPos = player.camera.position.clone().add(forward.multiplyScalar(2.4));
    spawnPos.y = Math.max(1.0, spawnPos.y);

    if (type === 'crate') {
      world.spawnCrate(spawnPos);
    } else if (type === 'barrel') {
      world.spawnBarrel(spawnPos);
    } else if (type === 'gold') {
      world.spawnGoldenSphere(spawnPos);
    } else if (type === 'chair') {
      world.spawnChair(spawnPos);
    }

    if (physicsRef.current) {
      setPhysicsObjectCount(physicsRef.current.objects.length);
    }
  };

  const handleDropItemFromInventory = (item: InventoryItem) => {
    if (!playerRef.current || !worldRef.current) return;
    const player = playerRef.current;
    const world = worldRef.current;

    const forward = new THREE.Vector3();
    player.camera.getWorldDirection(forward);
    const dropPos = player.camera.position.clone().add(forward.multiplyScalar(1.8));

    if (item.stats?.blockProp === 'barrel') {
      world.spawnBarrel(dropPos);
    } else if (item.stats?.blockProp === 'pumpkin') {
      world.spawnPumpkin(dropPos);
    } else if (item.stats?.blockProp === 'stone') {
      world.spawnBoulder(dropPos);
    } else {
      world.spawnCrate(dropPos);
    }
  };

  return (
    <div id="game-viewport" className="relative w-screen h-screen overflow-hidden bg-stone-950">
      {/* 3D WebGL Canvas Container */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full cursor-crosshair" />

      {/* Game HUD Overlay */}
      <HUD
        player={playerState}
        weather={weatherState}
        world={worldState}
        inventory={inventoryRef.current}
        prompt={prompt}
        fps={fps}
        timeString={timeString}
        cameraMode={cameraMode}
        isTorchOn={isTorchOn}
        isZeroGrav={isZeroGrav}
        physicsObjectCount={physicsObjectCount}
        isPointerLocked={isPointerLocked}
        qualityPreset={qualityPreset}
        playerHealth={playerHealth}
        bulletCount={bulletCount}
        gunLoadedAmmo={gunLoadedAmmo}
        gunMagCapacity={gunMagCapacity}
        isAiming={isAiming}
        isReloading={isReloading}
        activeZombiesCount={activeZombiesCount}
        isNightHorde={isNightHorde}
        zombiesKilled={zombiesKilled}
        isHurt={isHurt}
        isGamePaused={isGamePaused}
        onTogglePause={handleTogglePause}
        onToggleCamera={handleToggleCamera}
        onToggleTorch={handleToggleTorch}
        onToggleZeroGrav={handleToggleZeroGrav}
        onSetTimePreset={handleSetTimePreset}
        onSetQuality={handleSetQuality}
        onSpawnProp={handleSpawnProp}
        onOpenWorldEditor={handleOpenWorldEditor}
        onOpenInventory={handleOpenInventory}
        onOpenVillagerVitals={handleOpenVillagerVitalsManual}
      />

      {/* Game Paused Overlay Modal */}
      <PauseMenuModal
        isOpen={isGamePaused}
        onResume={handleResumeGame}
        timeString={timeString}
        fps={fps}
        playerHealth={playerHealth}
        bulletCount={bulletCount}
        gunLoadedAmmo={gunLoadedAmmo}
        activeZombiesCount={activeZombiesCount}
        zombiesKilled={zombiesKilled}
        isZeroGrav={isZeroGrav}
        isTorchOn={isTorchOn}
        cameraMode={cameraMode}
        qualityPreset={qualityPreset}
        onToggleZeroGrav={handleToggleZeroGrav}
        onToggleTorch={handleToggleTorch}
        onToggleCamera={handleToggleCamera}
        onSetTimePreset={handleSetTimePreset}
        onSetQuality={handleSetQuality}
        onOpenInventory={handleOpenInventory}
        onOpenVillagerVitals={handleOpenVillagerVitalsManual}
      />

      {/* Minecraft Crafting & Survival Inventory Modal */}
      <InventoryModal
        isOpen={isInventoryOpen}
        onClose={() => setIsInventoryOpen(false)}
        inventory={inventoryRef.current}
        onDropItem={handleDropItemFromInventory}
      />

      {/* Real Biological Functions & Organ Vitals Modal */}
      {villagerSystemState && (
        <VillagerVitalsModal
          isOpen={isVitalsOpen}
          onClose={() => setIsVitalsOpen(false)}
          villager={inspectedVillager}
          villagerSystem={villagerSystemState}
          inventory={inventoryRef.current}
        />
      )}

      {/* AI World Architect & Village Crafter Modal (Gemini 3.8 / 3.7 / 3.6 Cascade) */}
      <WorldEditorModal
        isOpen={isWorldEditorOpen}
        onClose={() => setIsWorldEditorOpen(false)}
        weather={weatherRef.current}
        world={worldRef.current}
        physics={physicsRef.current}
        player={playerRef.current}
        onSyncState={handleSyncState}
      />
    </div>
  );
}
