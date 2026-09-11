import React, { useState } from 'react';
import {
  Sparkles,
  Bot,
  CloudRain,
  Sun,
  Wind,
  Zap,
  RotateCcw,
  PlusCircle,
  Building,
  TreePine,
  Layers,
  CheckCircle2,
  AlertTriangle,
  X,
  Compass,
} from 'lucide-react';
import { WeatherSystem } from '../game/weather';
import { VillageWorld } from '../game/world';
import { PhysicsWorld } from '../game/physics';
import { PlayerController } from '../game/player';
import * as THREE from 'three';
import { sound } from '../game/audio';

interface WorldEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  weather: WeatherSystem | null;
  world: VillageWorld | null;
  physics: PhysicsWorld | null;
  player: PlayerController | null;
  onSyncState: () => void;
}

export const WorldEditorModal: React.FC<WorldEditorModalProps> = ({
  isOpen,
  onClose,
  weather,
  world,
  physics,
  player,
  onSyncState,
}) => {
  const [promptInput, setPromptInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState<{
    description: string;
    modelUsed: string;
    fallbackTriggered: boolean;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<'ai' | 'structures' | 'props' | 'atmosphere'>('ai');

  // Sliders state
  const [rainVal, setRainVal] = useState(weather ? weather.rainIntensity : 0);
  const [timeVal, setTimeVal] = useState(weather ? weather.timeOfDay : 0.38);
  const [windVal, setWindVal] = useState(weather ? weather.windSpeed : 0.6);

  if (!isOpen) return null;

  // Handle AI Village Transformation via server endpoint with Gemini 3.8 -> 3.7 -> 3.6 fallback
  const handleGenerateAI = async (customPrompt?: string) => {
    const promptToUse = customPrompt || promptInput;
    if (!promptToUse.trim() || isLoading) return;

    setIsLoading(true);
    sound.playWhoosh();

    try {
      const response = await fetch('/api/edit-village', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptToUse,
          currentEnvironment: {
            timeOfDay: weather?.timeOfDay,
            rainIntensity: weather?.rainIntensity,
            physicsObjects: physics?.objects.length,
          },
        }),
      });

      const data = await response.json();
      if (data.success && data.plan) {
        applyEditPlan(data.plan);
        setLastResult({
          description: data.plan.description || 'Transformation applied successfully.',
          modelUsed: data.modelUsed,
          fallbackTriggered: Boolean(data.fallbackTriggered),
        });
        setPromptInput('');
      }
    } catch (err) {
      console.error('AI Architect request failed:', err);
    } finally {
      setIsLoading(false);
      onSyncState();
    }
  };

  // Execute the transformation plan on Three.js & Cannon.js engine
  const applyEditPlan = (plan: any) => {
    if (!world || !weather || !physics) return;

    // 1. Time & Weather
    if (plan.timePreset) {
      weather.setTimePreset(plan.timePreset);
      setTimeVal(weather.timeOfDay);
    } else if (typeof plan.timeOfDay === 'number') {
      weather.setTime(plan.timeOfDay);
      setTimeVal(plan.timeOfDay);
    }

    if (plan.weather) {
      if (typeof plan.weather.rainIntensity === 'number') {
        weather.setRain(plan.weather.rainIntensity);
        setRainVal(plan.weather.rainIntensity);
      }
      if (typeof plan.weather.windSpeed === 'number') {
        weather.windSpeed = plan.weather.windSpeed;
        setWindVal(plan.weather.windSpeed);
      }
      if (plan.weather.lightning) {
        weather.triggerLightning();
      }
    }

    // 2. Physics Rules
    if (plan.physics) {
      if (typeof plan.physics.zeroGravity === 'boolean') {
        if (physics.isZeroGravity !== plan.physics.zeroGravity) {
          physics.toggleZeroGravity();
        }
      }
    }

    // 3. Spawns
    if (Array.isArray(plan.spawns)) {
      plan.spawns.forEach((item: any) => {
        const count = Math.min(8, Math.max(1, item.count || 1));
        for (let i = 0; i < count; i++) {
          const offsetX = (Math.random() - 0.5) * 4;
          const offsetZ = (Math.random() - 0.5) * 4;
          const pos = new THREE.Vector3(
            (item.position?.x ?? 0) + offsetX,
            item.position?.y ?? 0.5,
            (item.position?.z ?? 0) + offsetZ
          );

          spawnItemByType(item.type, pos);
        }
      });
    }

    // 4. Sounds
    if (plan.sound === 'thunder') {
      sound.playThunder();
    } else if (plan.sound === 'bell') {
      sound.playBell();
    } else if (plan.sound === 'splash') {
      sound.playSplash(0.9);
    }
  };

  const spawnItemByType = (type: string, pos: THREE.Vector3) => {
    if (!world) return;
    switch (type) {
      case 'watchtower':
        world.spawnWatchtower(pos);
        break;
      case 'gazebo':
        world.spawnGazebo(pos);
        break;
      case 'shrine':
        world.spawnStoneShrine(pos);
        break;
      case 'tree_autumn':
        world.spawnCustomTree(pos, 'autumn');
        break;
      case 'tree_pine':
        world.spawnCustomTree(pos, 'pine');
        break;
      case 'pumpkin':
        world.spawnPumpkin(new THREE.Vector3(pos.x, Math.max(1.0, pos.y), pos.z));
        break;
      case 'boulder':
        world.spawnBoulder(new THREE.Vector3(pos.x, Math.max(1.0, pos.y), pos.z));
        break;
      case 'anvil':
        world.spawnAnvil(new THREE.Vector3(pos.x, Math.max(1.0, pos.y), pos.z));
        break;
      case 'lantern':
        world.spawnLanternProp(pos);
        break;
      case 'barrel':
        world.spawnBarrel(new THREE.Vector3(pos.x, Math.max(1.0, pos.y), pos.z));
        break;
      case 'crate':
        world.spawnCrate(new THREE.Vector3(pos.x, Math.max(1.0, pos.y), pos.z));
        break;
      case 'gold':
        world.spawnGoldenSphere(new THREE.Vector3(pos.x, Math.max(1.0, pos.y), pos.z));
        break;
      case 'chair':
        world.spawnChair(new THREE.Vector3(pos.x, Math.max(1.0, pos.y), pos.z));
        break;
      default:
        world.spawnCrate(new THREE.Vector3(pos.x, Math.max(1.0, pos.y), pos.z));
        break;
    }
  };

  const getPlayerSpawnPos = (distance = 4): THREE.Vector3 => {
    if (!player) return new THREE.Vector3(0, 1, 0);
    const forward = new THREE.Vector3();
    player.camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    return player.camera.position.clone().add(forward.multiplyScalar(distance));
  };

  const handleManualSpawn = (type: string) => {
    const pos = getPlayerSpawnPos(type.includes('tower') || type.includes('gazebo') ? 7 : 3);
    spawnItemByType(type, pos);
    sound.playImpact('wood', 0.5);
    onSyncState();
  };

  const presets = [
    { label: '🍂 Autumn Harvest', prompt: 'Turn into golden hour with falling leaves, vibrant autumn trees, and harvest pumpkins across the square' },
    { label: '⚡ Midnight Thunderstorm', prompt: 'Make it a pitch-black midnight thunderstorm with heavy rain, violent lightning flashes, and dark fog' },
    { label: '🏰 Fortified Lookout', prompt: 'Construct stone watchtowers, place river boulders, and hang glowing lanterns along the path' },
    { label: '🌌 Zero-Gravity Floating Realm', prompt: 'Activate zero gravity, summon floating golden orbs and spinning barrels with luminous crystals' },
    { label: '🌸 Spring Morning Pavilion', prompt: 'Set bright crisp morning daylight with a garden gazebo and gentle warm breeze' },
  ];

  return (
    <div
      id="world-editor-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm pointer-events-auto"
    >
      <div
        id="world-editor-panel"
        className="w-full max-w-3xl bg-stone-900/95 border border-stone-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-stone-100"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-stone-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-wide text-stone-100 flex items-center gap-2">
                Elderstone World Architect & Live Editor
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Gemini 3.8 / 3.7 / 3.6 Fallback
                </span>
              </h2>
              <p className="text-xs text-stone-400">
                Prompt the AI to reshape village architecture, physics, and atmospheric realism in real time
              </p>
            </div>
          </div>
          <button
            id="close-editor-btn"
            onClick={onClose}
            className="p-1.5 hover:bg-stone-800 rounded-lg text-stone-400 hover:text-stone-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-stone-800 px-6 bg-stone-900/50">
          <button
            onClick={() => setActiveTab('ai')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'ai'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            AI Village Crafter
          </button>
          <button
            onClick={() => setActiveTab('structures')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'structures'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Building className="w-4 h-4" />
            Structures & Nature
          </button>
          <button
            onClick={() => setActiveTab('props')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'props'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            Physics Props
          </button>
          <button
            onClick={() => setActiveTab('atmosphere')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'atmosphere'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <CloudRain className="w-4 h-4" />
            Atmosphere & Lighting
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* TAB 1: AI Village Crafter */}
          {activeTab === 'ai' && (
            <div className="space-y-5">
              {/* AI Input Box */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-stone-300">
                  Describe what you want to create or change:
                </label>
                <div className="flex gap-2">
                  <input
                    id="ai-prompt-input"
                    type="text"
                    value={promptInput}
                    onChange={e => setPromptInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleGenerateAI()}
                    placeholder="e.g. Build an autumn watchtower with rain and floating pumpkins..."
                    className="flex-1 bg-stone-950/80 border border-stone-700/80 rounded-xl px-4 py-3 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                  />
                  <button
                    id="ai-generate-btn"
                    onClick={() => handleGenerateAI()}
                    disabled={isLoading || !promptInput.trim()}
                    className="flex items-center gap-2 px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-sm shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-stone-950 border-t-transparent rounded-full animate-spin" />
                        Architecting...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Cast Transformation
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Model Fallback Intelligence Status Card */}
              <div className="p-3.5 rounded-xl bg-stone-950/50 border border-stone-800 text-xs text-stone-400 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-stone-300 flex items-center gap-1.5">
                    <Bot className="w-3.5 h-3.5 text-amber-400" />
                    Adaptive Intelligence Tier Architecture:
                  </span>
                  <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                    Auto-Fallback Enabled
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed text-stone-400">
                  Primary model is <strong className="text-amber-300">Gemini 3.8 Flash</strong>. If quota or rate limits are exceeded,
                  the system automatically cascades to <strong className="text-blue-300">Gemini 3.7</strong> and <strong className="text-purple-300">Gemini 3.6</strong>,
                  with offline procedural physics fallback so your village creation is never interrupted.
                </p>
              </div>

              {/* Result Notification Card */}
              {lastResult && (
                <div
                  className={`p-4 rounded-xl border flex items-start gap-3 ${
                    lastResult.fallbackTriggered
                      ? 'bg-amber-950/30 border-amber-700/60 text-amber-200'
                      : 'bg-emerald-950/30 border-emerald-700/60 text-emerald-200'
                  }`}
                >
                  {lastResult.fallbackTriggered ? (
                    <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1 text-xs">
                    <p className="font-medium">{lastResult.description}</p>
                    <div className="flex items-center gap-2 text-[11px] text-stone-400 font-mono">
                      <span>Executed via:</span>
                      <span className="px-2 py-0.5 rounded bg-stone-900 border border-stone-700 text-stone-200">
                        {lastResult.modelUsed}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Instant 1-Click Creative Presets */}
              <div className="space-y-2">
                <span className="text-xs font-medium text-stone-400">1-Click Transformation Presets:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {presets.map((preset, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleGenerateAI(preset.prompt)}
                      disabled={isLoading}
                      className="text-left p-3 rounded-xl bg-stone-950/60 hover:bg-stone-800/80 border border-stone-800 hover:border-amber-500/50 transition-all group"
                    >
                      <span className="text-xs font-bold text-amber-300 group-hover:text-amber-200 block">
                        {preset.label}
                      </span>
                      <span className="text-[11px] text-stone-400 line-clamp-1 mt-0.5">
                        {preset.prompt}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Structures & Nature */}
          {activeTab === 'structures' && (
            <div className="space-y-4">
              <p className="text-xs text-stone-400">
                Spawn custom medieval buildings and foliage directly in front of your player position:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <button
                  onClick={() => handleManualSpawn('watchtower')}
                  className="p-3.5 rounded-xl bg-stone-950/60 hover:bg-stone-800 border border-stone-800 hover:border-amber-500/50 text-left transition-all"
                >
                  <Building className="w-5 h-5 text-amber-400 mb-1" />
                  <span className="text-xs font-bold block text-stone-200">Stone Watchtower</span>
                  <span className="text-[11px] text-stone-500">Lookout platform & torch</span>
                </button>

                <button
                  onClick={() => handleManualSpawn('gazebo')}
                  className="p-3.5 rounded-xl bg-stone-950/60 hover:bg-stone-800 border border-stone-800 hover:border-amber-500/50 text-left transition-all"
                >
                  <Building className="w-5 h-5 text-cyan-400 mb-1" />
                  <span className="text-xs font-bold block text-stone-200">Village Gazebo</span>
                  <span className="text-[11px] text-stone-500">Timber pavilion & lantern</span>
                </button>

                <button
                  onClick={() => handleManualSpawn('shrine')}
                  className="p-3.5 rounded-xl bg-stone-950/60 hover:bg-stone-800 border border-stone-800 hover:border-amber-500/50 text-left transition-all"
                >
                  <Zap className="w-5 h-5 text-sky-400 mb-1" />
                  <span className="text-xs font-bold block text-stone-200">Runic Stone Shrine</span>
                  <span className="text-[11px] text-stone-500">Glowing crystal obelisk</span>
                </button>

                <button
                  onClick={() => handleManualSpawn('tree_autumn')}
                  className="p-3.5 rounded-xl bg-stone-950/60 hover:bg-stone-800 border border-stone-800 hover:border-amber-500/50 text-left transition-all"
                >
                  <TreePine className="w-5 h-5 text-orange-400 mb-1" />
                  <span className="text-xs font-bold block text-stone-200">Autumn Maple</span>
                  <span className="text-[11px] text-stone-500">Golden-orange foliage</span>
                </button>

                <button
                  onClick={() => handleManualSpawn('tree_pine')}
                  className="p-3.5 rounded-xl bg-stone-950/60 hover:bg-stone-800 border border-stone-800 hover:border-amber-500/50 text-left transition-all"
                >
                  <TreePine className="w-5 h-5 text-emerald-400 mb-1" />
                  <span className="text-xs font-bold block text-stone-200">Mountain Pine</span>
                  <span className="text-[11px] text-stone-500">Evergreen conifer tree</span>
                </button>

                <button
                  onClick={() => handleManualSpawn('lantern')}
                  className="p-3.5 rounded-xl bg-stone-950/60 hover:bg-stone-800 border border-stone-800 hover:border-amber-500/50 text-left transition-all"
                >
                  <Sun className="w-5 h-5 text-amber-400 mb-1" />
                  <span className="text-xs font-bold block text-stone-200">Iron Street Lantern</span>
                  <span className="text-[11px] text-stone-500">Warm dynamic point light</span>
                </button>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => {
                    world?.clearCustomSpawns();
                    onSyncState();
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-800/60 text-red-300 text-xs font-semibold transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  Clear Custom Spawned Structures
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: Physics Props */}
          {activeTab === 'props' && (
            <div className="space-y-4">
              <p className="text-xs text-stone-400">
                Spawn dynamic rigid-body props featuring real Cannon-es gravity, mass, friction, and buoyancy:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <button
                  onClick={() => handleManualSpawn('pumpkin')}
                  className="p-3 rounded-xl bg-stone-950/60 hover:bg-stone-800 border border-stone-800 hover:border-orange-500/50 text-left"
                >
                  <span className="text-xl block mb-1">🎃</span>
                  <span className="text-xs font-bold block text-stone-200">Harvest Pumpkin</span>
                  <span className="text-[11px] text-stone-500">Rolls & floats in river</span>
                </button>

                <button
                  onClick={() => handleManualSpawn('boulder')}
                  className="p-3 rounded-xl bg-stone-950/60 hover:bg-stone-800 border border-stone-800 hover:border-stone-500/50 text-left"
                >
                  <span className="text-xl block mb-1">🪨</span>
                  <span className="text-xs font-bold block text-stone-200">River Boulder</span>
                  <span className="text-[11px] text-stone-500">Heavy stone mass (45kg)</span>
                </button>

                <button
                  onClick={() => handleManualSpawn('anvil')}
                  className="p-3 rounded-xl bg-stone-950/60 hover:bg-stone-800 border border-stone-800 hover:border-stone-500/50 text-left"
                >
                  <span className="text-xl block mb-1">⚙️</span>
                  <span className="text-xs font-bold block text-stone-200">Cast Iron Anvil</span>
                  <span className="text-[11px] text-stone-500">Dense metal clang (120kg)</span>
                </button>

                <button
                  onClick={() => handleManualSpawn('barrel')}
                  className="p-3 rounded-xl bg-stone-950/60 hover:bg-stone-800 border border-stone-800 hover:border-amber-500/50 text-left"
                >
                  <span className="text-xl block mb-1">🛢️</span>
                  <span className="text-xs font-bold block text-stone-200">Wooden Barrel</span>
                  <span className="text-[11px] text-stone-500">Hollow wood inertia</span>
                </button>

                <button
                  onClick={() => handleManualSpawn('crate')}
                  className="p-3 rounded-xl bg-stone-950/60 hover:bg-stone-800 border border-stone-800 hover:border-amber-500/50 text-left"
                >
                  <span className="text-xl block mb-1">📦</span>
                  <span className="text-xs font-bold block text-stone-200">Cargo Crate</span>
                  <span className="text-[11px] text-stone-500">Stackable wooden box</span>
                </button>

                <button
                  onClick={() => handleManualSpawn('gold')}
                  className="p-3 rounded-xl bg-stone-950/60 hover:bg-stone-800 border border-stone-800 hover:border-yellow-500/50 text-left"
                >
                  <span className="text-xl block mb-1">🔮</span>
                  <span className="text-xs font-bold block text-stone-200">Golden Orb</span>
                  <span className="text-[11px] text-stone-500">Bouncy specular sphere</span>
                </button>
              </div>

              {/* Zero-G switch */}
              <div className="pt-2 flex items-center justify-between p-3.5 rounded-xl bg-stone-950/60 border border-stone-800">
                <div>
                  <span className="text-xs font-bold text-stone-200 block">Anti-Gravity Physics Field</span>
                  <span className="text-[11px] text-stone-400">Allow objects to float weightlessly in 3D space</span>
                </div>
                <button
                  onClick={() => {
                    physics?.toggleZeroGravity();
                    onSyncState();
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                    physics?.isZeroGravity
                      ? 'bg-purple-600 text-white'
                      : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                  }`}
                >
                  {physics?.isZeroGravity ? 'Zero-G Active' : 'Enable Zero-G'}
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: Atmosphere & Lighting */}
          {activeTab === 'atmosphere' && (
            <div className="space-y-5">
              {/* Time of Day */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-stone-300 font-medium">Time of Day (Sun / Moon Position):</span>
                  <span className="font-mono text-amber-300">{weather?.getClockString()}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={timeVal}
                  onChange={e => {
                    const val = parseFloat(e.target.value);
                    setTimeVal(val);
                    weather?.setTime(val);
                    onSyncState();
                  }}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>

              {/* Rain Intensity */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-stone-300 font-medium">Rain & Downpour Intensity:</span>
                  <span className="font-mono text-cyan-300">{Math.round(rainVal * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={rainVal}
                  onChange={e => {
                    const val = parseFloat(e.target.value);
                    setRainVal(val);
                    weather?.setRain(val);
                    onSyncState();
                  }}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              {/* Wind Speed */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-stone-300 font-medium">Wind Drift Speed:</span>
                  <span className="font-mono text-emerald-300">{windVal.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="2.5"
                  step="0.1"
                  value={windVal}
                  onChange={e => {
                    const val = parseFloat(e.target.value);
                    setWindVal(val);
                    if (weather) weather.windSpeed = val;
                    onSyncState();
                  }}
                  className="w-full accent-emerald-400 cursor-pointer"
                />
              </div>

              {/* Lightning trigger button */}
              <div className="pt-2 flex gap-3">
                <button
                  onClick={() => weather?.triggerLightning()}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-sky-950/60 hover:bg-sky-900/60 border border-sky-700/60 text-sky-300 text-xs font-bold transition-colors"
                >
                  <Zap className="w-4 h-4" />
                  Trigger Lightning Strike & Thunder
                </button>
                <button
                  onClick={() => sound.playBell()}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-950/60 hover:bg-amber-900/60 border border-amber-700/60 text-amber-300 text-xs font-bold transition-colors"
                >
                  <Sun className="w-4 h-4" />
                  Ring Church Bell
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-stone-800 bg-stone-950/70 flex items-center justify-between text-xs text-stone-400">
          <span>Press [E] or click outside to close editor</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl font-medium transition-colors"
          >
            Done Editing
          </button>
        </div>
      </div>
    </div>
  );
};
