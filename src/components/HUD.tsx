import {
  Compass,
  Eye,
  Flame,
  Globe,
  HelpCircle,
  Moon,
  Move,
  Package,
  PackagePlus,
  Play,
  Sparkles,
  Sun,
  Sunset,
  Volume2,
  VolumeX,
  Zap,
  Activity,
  Heart,
  Shield,
  Crosshair,
  Skull,
  Sliders,
  Pause,
} from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { sound } from '../game/audio';
import { CameraMode, InteractionPrompt, PlayerController } from '../game/player';
import { TimePreset, WeatherSystem } from '../game/weather';
import { VillageWorld } from '../game/world';
import { InventorySystem } from '../game/inventory';

interface HUDProps {
  player: PlayerController | null;
  weather: WeatherSystem | null;
  world: VillageWorld | null;
  inventory: InventorySystem | null;
  prompt: InteractionPrompt | null;
  fps: number;
  timeString: string;
  cameraMode: CameraMode;
  isTorchOn: boolean;
  isZeroGrav: boolean;
  physicsObjectCount: number;
  isPointerLocked: boolean;
  qualityPreset?: 'low' | 'middle' | 'high' | 'max';
  playerHealth?: number;
  bulletCount?: number;
  gunLoadedAmmo?: number;
  gunMagCapacity?: number;
  isAiming?: boolean;
  isReloading?: boolean;
  activeZombiesCount?: number;
  isNightHorde?: boolean;
  zombiesKilled?: number;
  isHurt?: boolean;
  isGamePaused?: boolean;
  onTogglePause?: () => void;
  onToggleCamera: () => void;
  onToggleTorch: () => void;
  onToggleZeroGrav: () => void;
  onSetTimePreset: (preset: TimePreset) => void;
  onSetQuality?: (preset: 'low' | 'middle' | 'high' | 'max') => void;
  onSpawnProp: (type: 'crate' | 'barrel' | 'gold' | 'chair') => void;
  onOpenWorldEditor: () => void;
  onOpenInventory: () => void;
  onOpenVillagerVitals?: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  player,
  prompt,
  inventory,
  fps,
  timeString,
  cameraMode,
  isTorchOn,
  isZeroGrav,
  physicsObjectCount,
  isPointerLocked,
  qualityPreset = 'middle',
  playerHealth = 100,
  bulletCount = 64,
  gunLoadedAmmo = 6,
  gunMagCapacity = 6,
  isAiming = false,
  isReloading = false,
  activeZombiesCount = 0,
  isNightHorde = false,
  zombiesKilled = 0,
  isHurt = false,
  isGamePaused = false,
  onTogglePause,
  onToggleCamera,
  onToggleTorch,
  onToggleZeroGrav,
  onSetTimePreset,
  onSetQuality,
  onSpawnProp,
  onOpenWorldEditor,
  onOpenInventory,
  onOpenVillagerVitals,
}) => {
  const [showHelp, setShowHelp] = useState(false);
  const [isMuted, setIsMuted] = useState(sound.getIsMuted());
  const [, setInventoryTick] = useState(0);

  useEffect(() => {
    if (inventory) {
      return inventory.subscribe(() => setInventoryTick(t => t + 1));
    }
  }, [inventory]);

  const handleToggleSound = () => {
    sound.init();
    sound.resume();
    const muted = sound.toggleMute();
    setIsMuted(muted);
  };

  // Compute minimap player coordinates (world -40..+40 -> 0..100%)
  const px = player ? Math.min(95, Math.max(5, 50 + (player.position.x / 60) * 45)) : 50;
  const pz = player ? Math.min(95, Math.max(5, 50 + (player.position.z / 60) * 45)) : 50;
  const yawDeg = player ? (-player.yaw * 180) / Math.PI : 0;

  const activeHeldItem = inventory?.getActiveItem();

  return (
    <div id="hud-container" className="absolute inset-0 pointer-events-none select-none overflow-hidden font-sans text-stone-100">
      {/* Damage Hurt Screen Vignette */}
      <div
        className={`absolute inset-0 border-[8px] border-red-600/40 bg-red-950/20 transition-opacity duration-200 pointer-events-none ${
          isHurt ? 'opacity-100 animate-pulse' : 'opacity-0'
        }`}
      />

      {/* Night Horde Warning Banner */}
      {isNightHorde && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-red-950/90 text-red-200 border border-red-500/60 px-4 py-1.5 rounded-full shadow-2xl backdrop-blur-md animate-pulse z-20">
          <Skull className="w-4 h-4 text-red-400" />
          <span className="text-xs font-mono font-bold tracking-wider">
            NIGHT HORDE ACTIVE: {activeZombiesCount} Zombies • Slain: {zombiesKilled} • Hand/Shovel Fight
          </span>
        </div>
      )}

      {/* Top Navigation & Status Bar */}
      <div id="top-status-bar" className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-auto">
        {/* Game Badge */}
        <div id="game-badge" className="flex items-center gap-3 bg-stone-900/85 backdrop-blur-md px-4 py-2 rounded-xl border border-stone-700/60 shadow-lg">
          <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold tracking-wider text-amber-300 uppercase">
                Elderstone 3D
              </h1>
              <span className="text-[10px] px-1.5 py-0.2 bg-emerald-950 text-emerald-400 border border-emerald-500/30 rounded font-mono font-bold">
                120 FPS LOCKED
              </span>
            </div>
            <p className="text-[11px] text-stone-400">Living World • Real Human Organs & AI • Minecraft Inventory</p>
          </div>
        </div>

        {/* Time & Quality Environment Controls */}
        <div className="flex items-center gap-2">
          {/* Quality Switching System [Low, Middle, High, Max] */}
          <div id="quality-selector" className="flex items-center gap-1 bg-stone-900/85 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-stone-700/60 shadow-lg text-xs font-mono">
            <span className="text-stone-400 flex items-center gap-1 mr-1 text-[11px] font-sans font-medium">
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
              Quality:
            </span>
            {(['low', 'middle', 'high', 'max'] as const).map((q) => {
              const active = qualityPreset === q;
              return (
                <button
                  key={q}
                  id={`quality-preset-${q}`}
                  onClick={() => onSetQuality?.(q)}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase transition-all ${
                    active
                      ? 'bg-amber-500 text-stone-950 shadow-sm'
                      : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
                  }`}
                  title={`Switch Graphics & Physics Quality to ${q.toUpperCase()}`}
                >
                  {q}
                </button>
              );
            })}
          </div>

          {/* Time & Environment Controls */}
          <div id="time-controls" className="flex items-center gap-2 bg-stone-900/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-stone-700/60 shadow-lg">
            <div className="flex items-center gap-1.5 pr-2 border-r border-stone-700 text-xs font-mono font-medium text-amber-200">
              {isNightHorde ? (
                <Moon className="w-3.5 h-3.5 text-blue-300 animate-pulse" />
              ) : (
                <Sun className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span>{timeString}</span>
              <span className="text-[10px] text-stone-400 font-sans ml-1">
                {isNightHorde ? '(Night: 1m=2h)' : '(Day: 1s=30m)'}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                id="time-preset-day"
                onClick={() => onSetTimePreset('day')}
                className="p-1.5 hover:bg-stone-800 rounded-lg text-amber-300 transition-colors"
                title="Daylight Noon"
              >
                <Sun className="w-4 h-4" />
              </button>
              <button
                id="time-preset-sunset"
                onClick={() => onSetTimePreset('sunset')}
                className="p-1.5 hover:bg-stone-800 rounded-lg text-orange-400 transition-colors"
                title="Golden Sunset"
              >
                <Sunset className="w-4 h-4" />
              </button>
              <button
                id="time-preset-night"
                onClick={() => onSetTimePreset('night')}
                className="p-1.5 hover:bg-stone-800 rounded-lg text-blue-300 transition-colors"
                title="Starry Night"
              >
                <Moon className="w-4 h-4" />
              </button>
            </div>

            <div className="w-px h-5 bg-stone-700 mx-1" />

            {/* Pause / Resume Game Button */}
            {onTogglePause && (
              <button
                id="pause-toggle-btn"
                onClick={onTogglePause}
                className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 text-xs font-medium ${
                  isGamePaused
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'hover:bg-stone-800 text-stone-300'
                }`}
                title={isGamePaused ? 'Resume Game [P]' : 'Pause Game [P]'}
              >
                {isGamePaused ? (
                  <Play className="w-4 h-4 fill-amber-400 text-amber-400" />
                ) : (
                  <Pause className="w-4 h-4 text-amber-400" />
                )}
              </button>
            )}

            {/* Sound Toggle */}
            <button
              id="sound-toggle-btn"
              onClick={handleToggleSound}
              className="p-1.5 hover:bg-stone-800 rounded-lg text-stone-300 transition-colors"
              title={isMuted ? 'Unmute Realistic 3D Audio' : 'Mute Audio'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>

            {/* Help Button */}
            <button
              id="help-toggle-btn"
              onClick={() => setShowHelp(!showHelp)}
              className="p-1.5 hover:bg-stone-800 rounded-lg text-stone-300 transition-colors"
              title="Open Controls & Physics Guide"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Top-Right Performance & Telemetry Pill */}
      <div id="telemetry-pill" className="absolute top-20 right-4 flex flex-col items-end gap-1.5 pointer-events-auto">
        <div className="bg-stone-900/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-stone-700/60 shadow-md flex items-center gap-3 text-xs font-mono">
          <span className="text-emerald-400 font-bold flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            {fps} FPS (120Hz)
          </span>
          <span className="text-stone-400">8.33ms Step</span>
          <span className="text-cyan-300">Physics: {physicsObjectCount}</span>
        </div>

        {/* Anti-clipping collision notice */}
        <div className="bg-stone-900/70 backdrop-blur-sm px-2.5 py-1 rounded text-[11px] text-stone-400 border border-stone-800">
          Anti-Clipping Wall Colliders: Active
        </div>
      </div>

      {/* Center Screen Crosshair or Tactical ADS Sniper Reticle */}
      <div id="center-crosshair" className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {isAiming ? (
          <div className="relative w-36 h-36 flex items-center justify-center animate-fade-in">
            {/* Sniper Circle Sight */}
            <div className="absolute inset-0 rounded-full border-2 border-red-500/80 shadow-[0_0_20px_rgba(239,68,68,0.5)]" />
            <div className="absolute inset-3 rounded-full border border-dashed border-red-400/50" />
            {/* Crosshairs with stadia ticks */}
            <div className="absolute w-full h-[1.5px] bg-red-500/90" />
            <div className="absolute h-full w-[1.5px] bg-red-500/90" />
            <div className="w-2 h-2 rounded-full bg-red-400 shadow-[0_0_10px_rgba(239,68,68,1)]" />
            <span className="absolute bottom-2 text-[9px] font-mono text-red-300 font-bold tracking-widest bg-black/60 px-1.5 py-0.5 rounded">
              ADS ZOOM • 2.5X
            </span>
          </div>
        ) : (
          <div className="relative w-5 h-5 flex items-center justify-center">
            <div className="absolute w-2.5 h-0.5 bg-white/70 rounded-full" />
            <div className="absolute h-2.5 w-0.5 bg-white/70 rounded-full" />
            <div className="w-1 h-1 rounded-full bg-amber-400/90" />
          </div>
        )}
      </div>

      {/* Interactive Aim Target Prompt */}
      {prompt && (
        <div
          id="interaction-prompt-banner"
          className="absolute bottom-40 left-1/2 -translate-x-1/2 pointer-events-auto bg-stone-950/90 backdrop-blur-md border border-amber-500/60 px-4 py-2 rounded-xl shadow-2xl flex items-center gap-3 animate-fade-in"
        >
          <div className="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold text-xs">
            E
          </div>
          <div>
            <div className="text-xs font-bold text-amber-300">{prompt.targetName}</div>
            <div className="text-[11px] text-stone-300">{prompt.action}</div>
          </div>
        </div>
      )}

      {/* Pointer Lock Start Overlay if not locked */}
      {!isPointerLocked && (
        <div
          id="pointerlock-invitation"
          onClick={() => {
            sound.init();
            sound.resume();
            document.querySelector('canvas')?.requestPointerLock?.();
          }}
          className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center pointer-events-auto cursor-pointer"
        >
          <div className="bg-stone-900/95 border-2 border-amber-500/80 p-6 rounded-2xl shadow-2xl text-center max-w-sm mx-4 transform hover:scale-105 transition-transform">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 mx-auto mb-3 flex items-center justify-center text-amber-400">
              <Play className="w-6 h-6 fill-amber-400" />
            </div>
            <h3 className="text-base font-bold text-amber-300 mb-1">Click to Enter 3D Village</h3>
            <p className="text-xs text-stone-300 mb-3">
              Lock mouse cursor for smooth 120 FPS camera, physics interactions & Minecraft inventory.
            </p>
            <div className="text-[11px] text-stone-400 bg-stone-950/60 py-1.5 px-3 rounded-lg border border-stone-800">
              Press [ESC] at any time to release mouse
            </div>
          </div>
        </div>
      )}

      {/* Mini-Map Radar (Bottom Left) */}
      <div id="village-minimap" className="absolute bottom-6 left-6 pointer-events-auto hidden sm:block">
        <div className="relative w-32 h-32 rounded-2xl bg-stone-950/85 border border-stone-700/80 overflow-hidden shadow-2xl p-1 backdrop-blur-md">
          <div className="w-full h-full rounded-xl bg-[#223322]/80 relative overflow-hidden border border-stone-800">
            {/* River trace */}
            <div className="absolute left-[20%] top-0 bottom-0 w-3.5 bg-blue-600/40" />
            {/* Wooden Bridge */}
            <div className="absolute left-[18%] top-[55%] w-5 h-2 bg-amber-800/80 border border-amber-600/60" />
            {/* Stone Plaza & Well */}
            <div className="absolute left-[45%] top-[45%] w-6 h-6 bg-stone-500/40 rounded-full border border-stone-400/50" />
            {/* Cottages */}
            <div className="absolute left-[60%] top-[42%] w-4 h-4 bg-amber-900/70 border border-amber-700/50" />
            <div className="absolute left-[62%] top-[25%] w-5 h-4 bg-amber-900/70 border border-amber-700/50" />
            {/* Church */}
            <div className="absolute left-[40%] top-[15%] w-5 h-6 bg-stone-600/70 border border-stone-400/50" />

            {/* Villager blips */}
            <div className="absolute left-[52%] top-[48%] w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            <div className="absolute left-[42%] top-[42%] w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <div className="absolute left-[63%] top-[30%] w-1.5 h-1.5 rounded-full bg-emerald-400" />

            {/* Player Blip with heading arrow */}
            <div
              className="absolute w-3 h-3 -ml-1.5 -mt-1.5 z-10 transition-all duration-75"
              style={{ left: `${px}%`, top: `${pz}%` }}
            >
              <div
                className="w-full h-full flex items-center justify-center text-amber-400"
                style={{ transform: `rotate(${yawDeg}deg)` }}
              >
                <Compass className="w-3.5 h-3.5 text-amber-400 drop-shadow-[0_0_4px_rgba(245,158,11,1)]" />
              </div>
            </div>
          </div>
          <span className="absolute bottom-1 right-2 text-[9px] font-mono text-stone-400 bg-stone-900/90 px-1 rounded">
            RADAR
          </span>
        </div>
      </div>

      {/* MINECRAFT HOTBAR & BOTTOM CONTROLS */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 pointer-events-auto">
        {/* Survival Vitals & Weapon Ammo Status */}
        <div className="flex items-center gap-3 bg-stone-950/85 px-4 py-1.5 rounded-xl border border-stone-700/70 shadow-xl backdrop-blur-md">
          {/* Health Hearts & Bar */}
          <div className="flex items-center gap-1.5 text-xs font-mono">
            <Heart className="w-4 h-4 text-red-500 fill-red-500 animate-pulse" />
            <div className="w-24 h-2.5 bg-stone-800 rounded-full overflow-hidden border border-stone-600">
              <div
                className="h-full bg-gradient-to-r from-red-600 via-amber-500 to-emerald-500 transition-all duration-300"
                style={{ width: `${Math.max(0, Math.min(100, playerHealth))}%` }}
              />
            </div>
            <span className="font-bold text-red-300 min-w-[50px]">{Math.round(playerHealth)}/100</span>
          </div>

          <div className="w-px h-3.5 bg-stone-700" />

          {/* Ammo / Bullets Status */}
          {activeHeldItem?.id === 'marksman_gun' ? (
            <div className="flex items-center gap-2 text-xs font-mono">
              <div className="flex items-center gap-1.5 text-amber-300 bg-amber-950/50 px-2.5 py-0.5 rounded border border-amber-500/40 shadow-sm">
                <Crosshair className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-bold text-amber-200">
                  {gunLoadedAmmo}/{gunMagCapacity}
                </span>
                <span className="text-[10px] text-amber-400/90 font-sans">CHAMBER</span>
              </div>
              <div className="text-[11px] text-stone-400 font-mono">
                <span className="text-stone-200 font-bold">{bulletCount}</span> Reserve
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs font-mono text-amber-300">
              <Crosshair className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-bold">{bulletCount}</span>
              <span className="text-[10px] text-stone-400">BULLETS</span>
            </div>
          )}

          {/* Active Weapon Action Hint */}
          {activeHeldItem?.id === 'marksman_gun' && (
            <>
              <div className="w-px h-3.5 bg-stone-700" />
              <span className="text-[10px] font-mono text-amber-400 font-bold">[LMB] Shoot</span>
              <div className="w-px h-3.5 bg-stone-700" />
              <span className="text-[10px] font-mono text-emerald-400 font-bold">[RMB] Zoom (ADS)</span>
              <div className="w-px h-3.5 bg-stone-700" />
              <span className={`text-[10px] font-mono font-bold ${isReloading ? 'text-yellow-300 animate-pulse' : 'text-cyan-300'}`}>
                {isReloading ? 'Reloading Chamber...' : '[R] Reload'}
              </span>
            </>
          )}
          {activeHeldItem?.id === 'iron_sword' && (
            <>
              <div className="w-px h-3.5 bg-stone-700" />
              <span className="text-[10px] font-mono text-cyan-400 font-bold">[LMB] Sword Slash</span>
            </>
          )}
          {activeHeldItem?.type === 'food' && (
            <>
              <div className="w-px h-3.5 bg-stone-700" />
              <span className="text-[10px] font-mono text-emerald-400 font-bold">
                [E] Eat / Heal (+{activeHeldItem.stats?.nutrition || 20} HP)
              </span>
            </>
          )}
        </div>

        {/* Active Item Name Floating Banner */}
        {activeHeldItem && (
          <div className="text-xs font-mono font-bold text-amber-300 bg-black/85 px-3 py-1 rounded-full border border-amber-500/40 shadow-lg animate-fade-in flex items-center gap-1.5">
            <span>{activeHeldItem.icon}</span>
            <span>{activeHeldItem.name}</span>
            {activeHeldItem.count > 1 && <span className="text-stone-400">x{activeHeldItem.count}</span>}
            {activeHeldItem.stats?.damage && (
              <span className="text-red-400 text-[10px]">⚔️+{activeHeldItem.stats.damage}</span>
            )}
            {activeHeldItem.stats?.nutrition && (
              <span className="text-emerald-400 text-[10px]">🍞+{activeHeldItem.stats.nutrition}</span>
            )}
            {activeHeldItem.stats?.blockProp && (
              <span className="text-cyan-400 text-[10px]">📦 [RMB] Place</span>
            )}
          </div>
        )}

        {/* Minecraft 9-Slot Hotbar */}
        <div
          id="minecraft-hotbar"
          className="flex items-center gap-1 bg-[#8b8b8b]/60 dark:bg-black/80 p-1.5 border-4 border-t-[#ffffff] border-l-[#ffffff] border-b-[#555555] border-r-[#555555] rounded-none shadow-2xl backdrop-blur-md"
        >
          {inventory?.hotbar.map((item, idx) => {
            const isSelected = inventory.selectedSlot === idx;
            return (
              <div
                key={idx}
                onClick={() => {
                  inventory.selectSlot(idx);
                  sound.playItemPop();
                }}
                className={`relative w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center text-2xl cursor-pointer border-2 transition-all select-none ${
                  isSelected
                    ? 'border-yellow-400 ring-2 ring-yellow-400/90 bg-yellow-500/20 scale-105 z-10'
                    : 'border-t-[#373737] border-l-[#373737] border-b-[#ffffff] border-r-[#ffffff] bg-[#8b8b8b]/40 dark:bg-black/50 hover:bg-white/20'
                }`}
                title={item ? `${item.name} [Key ${idx + 1}]` : `Empty Slot ${idx + 1}`}
              >
                <span className="absolute top-0.5 left-1 text-[10px] text-zinc-400 font-bold">
                  {idx + 1}
                </span>
                {item && <span>{item.icon}</span>}
                {item && item.count > 1 && (
                  <span className="absolute bottom-0.5 right-1 text-xs font-bold text-white drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]">
                    {item.count}
                  </span>
                )}
              </div>
            );
          })}

          {/* Quick Inventory Toggle Button */}
          <button
            onClick={onOpenInventory}
            className="ml-1.5 p-2 bg-[#8b8b8b]/80 dark:bg-zinc-800 hover:bg-amber-600 hover:text-white border-2 border-t-[#ffffff] border-l-[#ffffff] border-b-[#555555] border-r-[#555555] active:translate-y-0.5 transition-colors"
            title="Open Full Minecraft Inventory & Crafting [I / Tab]"
          >
            <Package className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Utilities Pill */}
        <div className="flex items-center gap-2 bg-stone-900/80 backdrop-blur-md px-3 py-1 rounded-xl border border-stone-700/60 shadow-lg text-xs">
          <button
            onClick={onToggleCamera}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] ${
              cameraMode === 'third' ? 'bg-amber-500 text-stone-950 font-bold' : 'text-stone-300 hover:bg-stone-800'
            }`}
          >
            <Eye className="w-3 h-3" /> {cameraMode === 'first' ? '1st' : '3rd'} [V]
          </button>

          <button
            onClick={onToggleTorch}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] ${
              isTorchOn ? 'bg-amber-500 text-stone-950 font-bold' : 'text-stone-300 hover:bg-stone-800'
            }`}
          >
            <Flame className="w-3 h-3" /> Torch [F]
          </button>

          <button
            onClick={onToggleZeroGrav}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] ${
              isZeroGrav ? 'bg-purple-600 text-white font-bold' : 'text-stone-300 hover:bg-stone-800'
            }`}
          >
            <Globe className="w-3 h-3" /> Zero-G [G]
          </button>

          {onOpenVillagerVitals && (
            <button
              onClick={onOpenVillagerVitals}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] text-emerald-300 hover:bg-emerald-950/60 border border-emerald-500/30"
            >
              <Activity className="w-3 h-3" /> Villagers AI
            </button>
          )}

          <button
            onClick={onOpenWorldEditor}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold ml-1"
          >
            <Sparkles className="w-3 h-3" /> AI Crafter [B]
          </button>
        </div>
      </div>

      {/* Full Help Modal */}
      {showHelp && (
        <div id="help-modal" className="absolute inset-0 bg-stone-950/85 backdrop-blur-md pointer-events-auto flex items-center justify-center p-4 z-50">
          <div className="bg-stone-900 border border-stone-700 max-w-xl w-full rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800">
              <h2 className="text-lg font-bold text-amber-300">Elderstone 3D • Comprehensive Game Guide</h2>
              <button
                onClick={() => setShowHelp(false)}
                className="text-stone-400 hover:text-white text-sm px-2.5 py-1 bg-stone-800 rounded-lg"
              >
                ✕ Close
              </button>
            </div>

            <div className="space-y-3 py-4 text-xs sm:text-sm text-stone-300 font-sans">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-stone-950/60 p-3 rounded-xl border border-stone-800">
                  <div className="font-bold text-amber-400 mb-1.5 flex items-center gap-1.5">
                    <Move className="w-4 h-4" /> Movement & Physics
                  </div>
                  <ul className="space-y-1 text-stone-400 text-xs">
                    <li><strong className="text-stone-200">W, A, S, D</strong> : Walk</li>
                    <li><strong className="text-stone-200">Shift</strong> : Sprint</li>
                    <li><strong className="text-stone-200">Space</strong> : Jump</li>
                    <li><strong className="text-stone-200">C</strong> : Crouch</li>
                    <li><strong className="text-stone-200">G</strong> : Zero-Gravity Physics</li>
                  </ul>
                </div>

                <div className="bg-stone-950/60 p-3 rounded-xl border border-stone-800">
                  <div className="font-bold text-cyan-400 mb-1.5 flex items-center gap-1.5">
                    <Package className="w-4 h-4" /> Combat, Items & Controls
                  </div>
                  <ul className="space-y-1 text-stone-400 text-xs">
                    <li><strong className="text-amber-300">LMB</strong> : Shoot Gun / Slash Sword</li>
                    <li><strong className="text-emerald-300">RMB</strong> : Zoom In Gun (ADS) / Place Prop</li>
                    <li><strong className="text-cyan-300">R</strong> : Reload Gun Chamber</li>
                    <li><strong className="text-emerald-300">E</strong> : Talk to Villager / Eat Food / Heal</li>
                    <li><strong className="text-stone-200">1 - 9 / Wheel</strong> : Select Hotbar Slot</li>
                    <li><strong className="text-stone-200">I / Tab</strong> : Open Minecraft Inventory</li>
                    <li><strong className="text-stone-200">Q</strong> : Drop Active Item into World</li>
                  </ul>
                </div>
              </div>

              <div className="bg-stone-950/60 p-3 rounded-xl border border-stone-800">
                <div className="font-bold text-emerald-400 mb-1 flex items-center gap-1.5">
                  <Activity className="w-4 h-4" /> Living Villagers, Real Human Organs & Deep Physics
                </div>
                <p className="text-stone-400 text-xs leading-relaxed">
                  Villagers possess anatomical 3D human figures (pelvis, chest, neck, head, limbs) with continuous breathing expansion and biological vitals: real-time <strong>Lead II ECG Heartbeat</strong>, systolic/diastolic blood pressure, oxygen saturation (SpO2), tidal lung respiration, stomach fullness & metabolism, and neural AI thoughts. Aim at any villager and press <strong>[E]</strong> to inspect live vitals and feed them hearth-baked bread or orchard apples.
                </p>
              </div>

              <div className="bg-stone-950/60 p-3 rounded-xl border border-stone-800">
                <div className="font-bold text-amber-400 mb-1 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" /> Anti-Clipping Solid Walls & Waving Wind Trees
                </div>
                <p className="text-stone-400 text-xs leading-relaxed">
                  Multi-pass solid colliders prevent passing through walls of houses, cottages, tavern, church, and fences. All forest foliage, oak branches, and pines sway and wave with realistic atmospheric wind dynamics.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowHelp(false)}
              className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl transition-colors text-sm"
            >
              Resume Game
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
