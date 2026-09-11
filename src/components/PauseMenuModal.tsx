import React from 'react';
import {
  Play,
  Pause,
  Sun,
  Sunset,
  Moon,
  Zap,
  Flame,
  Eye,
  Volume2,
  VolumeX,
  Shield,
  Heart,
  Crosshair,
  Skull,
  Sliders,
  Sparkles,
  Users,
} from 'lucide-react';
import { TimePreset } from '../game/weather';
import { CameraMode } from '../game/player';

interface PauseMenuModalProps {
  isOpen: boolean;
  onResume: () => void;
  timeString: string;
  fps: number;
  playerHealth?: number;
  bulletCount?: number;
  gunLoadedAmmo?: number;
  activeZombiesCount?: number;
  zombiesKilled?: number;
  isZeroGrav: boolean;
  isTorchOn: boolean;
  cameraMode: CameraMode;
  qualityPreset: 'low' | 'middle' | 'high' | 'max';
  onToggleZeroGrav: () => void;
  onToggleTorch: () => void;
  onToggleCamera: () => void;
  onSetTimePreset: (preset: TimePreset) => void;
  onSetQuality: (preset: 'low' | 'middle' | 'high' | 'max') => void;
  onOpenInventory: () => void;
  onOpenVillagerVitals: () => void;
}

export const PauseMenuModal: React.FC<PauseMenuModalProps> = ({
  isOpen,
  onResume,
  timeString,
  fps,
  playerHealth = 100,
  bulletCount = 64,
  gunLoadedAmmo = 8,
  activeZombiesCount = 0,
  zombiesKilled = 0,
  isZeroGrav,
  isTorchOn,
  cameraMode,
  qualityPreset,
  onToggleZeroGrav,
  onToggleTorch,
  onToggleCamera,
  onSetTimePreset,
  onSetQuality,
  onOpenInventory,
  onOpenVillagerVitals,
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="pause-menu-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/80 backdrop-blur-md transition-all duration-300 pointer-events-auto p-4 select-none"
    >
      <div className="relative w-full max-w-xl bg-stone-900/95 border border-amber-600/30 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/80 flex flex-col gap-6 text-stone-200">
        {/* Header with Title & Live Stats */}
        <div className="flex items-center justify-between border-b border-stone-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-inner">
              <Pause className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-amber-100 tracking-wide">
                GAME PAUSED
              </h2>
              <p className="text-xs text-stone-400">
                Elderstone 3D Simulation Frozen • Press <kbd className="px-1.5 py-0.5 bg-stone-800 border border-stone-700 rounded text-amber-300 font-mono text-[11px]">P</kbd> or <kbd className="px-1.5 py-0.5 bg-stone-800 border border-stone-700 rounded text-amber-300 font-mono text-[11px]">ESC</kbd> to resume
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs font-mono px-2.5 py-1 rounded bg-stone-800/80 border border-stone-700 text-amber-300 font-semibold">
              {timeString}
            </span>
          </div>
        </div>

        {/* Big Primary Action: Resume Game */}
        <button
          id="pause-resume-button"
          onClick={onResume}
          className="w-full py-4 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 font-bold rounded-xl shadow-lg shadow-amber-900/40 flex items-center justify-center gap-3 transition-all duration-150 transform hover:scale-[1.01] active:scale-[0.99] text-base uppercase tracking-wider cursor-pointer"
        >
          <Play className="w-5 h-5 fill-current" />
          <span>Resume Adventure</span>
        </button>

        {/* Quick Game Status Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="bg-stone-950/60 p-3 rounded-xl border border-stone-800 flex flex-col items-center justify-center text-center">
            <div className="flex items-center gap-1.5 text-red-400 text-xs mb-1 font-semibold">
              <Heart className="w-3.5 h-3.5 fill-red-400" />
              <span>Health</span>
            </div>
            <span className="text-base font-bold text-stone-100 font-mono">
              {playerHealth} / 100
            </span>
          </div>

          <div className="bg-stone-950/60 p-3 rounded-xl border border-stone-800 flex flex-col items-center justify-center text-center">
            <div className="flex items-center gap-1.5 text-amber-400 text-xs mb-1 font-semibold">
              <Crosshair className="w-3.5 h-3.5" />
              <span>Ammo</span>
            </div>
            <span className="text-base font-bold text-stone-100 font-mono">
              {gunLoadedAmmo} / {bulletCount}
            </span>
          </div>

          <div className="bg-stone-950/60 p-3 rounded-xl border border-stone-800 flex flex-col items-center justify-center text-center">
            <div className="flex items-center gap-1.5 text-emerald-400 text-xs mb-1 font-semibold">
              <Users className="w-3.5 h-3.5" />
              <span>Villagers</span>
            </div>
            <span className="text-base font-bold text-stone-100 font-mono">
              6 Living
            </span>
          </div>

          <div className="bg-stone-950/60 p-3 rounded-xl border border-stone-800 flex flex-col items-center justify-center text-center">
            <div className="flex items-center gap-1.5 text-purple-400 text-xs mb-1 font-semibold">
              <Skull className="w-3.5 h-3.5" />
              <span>Killed</span>
            </div>
            <span className="text-base font-bold text-stone-100 font-mono">
              {zombiesKilled}
            </span>
          </div>
        </div>

        {/* Quick Settings Bar in Pause Menu */}
        <div className="flex flex-col gap-3 bg-stone-950/40 p-4 rounded-xl border border-stone-800/80">
          <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
            Quick In-Game Toggles
          </span>

          {/* Graphics Quality */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-stone-300 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-stone-400" />
              Graphics Preset:
            </span>
            <div className="flex items-center gap-1 bg-stone-900 p-1 rounded-lg border border-stone-800">
              {(['low', 'middle', 'high', 'max'] as const).map((q) => (
                <button
                  key={q}
                  onClick={() => onSetQuality(q)}
                  className={`px-2 py-1 rounded text-[11px] font-semibold uppercase transition-colors ${
                    qualityPreset === q
                      ? 'bg-amber-500 text-stone-950 shadow-sm'
                      : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Environment Time of Day */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-stone-300 flex items-center gap-1.5">
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              Time Preset:
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onSetTimePreset('day')}
                className="px-2.5 py-1 bg-stone-900 hover:bg-stone-800 border border-stone-800 rounded-lg text-amber-300 flex items-center gap-1 transition-colors text-xs"
              >
                <Sun className="w-3 h-3" /> Day
              </button>
              <button
                onClick={() => onSetTimePreset('sunset')}
                className="px-2.5 py-1 bg-stone-900 hover:bg-stone-800 border border-stone-800 rounded-lg text-orange-400 flex items-center gap-1 transition-colors text-xs"
              >
                <Sunset className="w-3 h-3" /> Sunset
              </button>
              <button
                onClick={() => onSetTimePreset('night')}
                className="px-2.5 py-1 bg-stone-900 hover:bg-stone-800 border border-stone-800 rounded-lg text-blue-300 flex items-center gap-1 transition-colors text-xs"
              >
                <Moon className="w-3 h-3" /> Night
              </button>
            </div>
          </div>

          {/* Perspective & Physics Controls */}
          <div className="flex items-center justify-between pt-1 border-t border-stone-800/60 text-xs">
            <span className="text-stone-300">Perspective & Physics:</span>
            <div className="flex items-center gap-2">
              <button
                onClick={onToggleCamera}
                className="px-2.5 py-1 bg-stone-900 hover:bg-stone-800 border border-stone-800 rounded-lg text-stone-300 flex items-center gap-1 text-xs"
              >
                <Eye className="w-3 h-3 text-cyan-400" />
                {cameraMode === 'first' ? '1st Person' : '3rd Person'} (V)
              </button>
              <button
                onClick={onToggleZeroGrav}
                className={`px-2.5 py-1 rounded-lg border text-xs flex items-center gap-1 ${
                  isZeroGrav
                    ? 'bg-purple-900/60 border-purple-500 text-purple-200'
                    : 'bg-stone-900 hover:bg-stone-800 border-stone-800 text-stone-300'
                }`}
              >
                <Zap className="w-3 h-3 text-purple-400" />
                Zero-G (G)
              </button>
              <button
                onClick={onToggleTorch}
                className={`px-2.5 py-1 rounded-lg border text-xs flex items-center gap-1 ${
                  isTorchOn
                    ? 'bg-amber-900/60 border-amber-500 text-amber-200'
                    : 'bg-stone-900 hover:bg-stone-800 border-stone-800 text-stone-300'
                }`}
              >
                <Flame className="w-3 h-3 text-amber-400" />
                Torch (F)
              </button>
            </div>
          </div>
        </div>

        {/* Footer shortcuts */}
        <div className="flex items-center justify-between text-xs text-stone-500 pt-2 border-t border-stone-800">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onResume();
                onOpenInventory();
              }}
              className="text-amber-400 hover:underline cursor-pointer"
            >
              Open Inventory [E]
            </button>
            <span>•</span>
            <button
              onClick={() => {
                onResume();
                onOpenVillagerVitals();
              }}
              className="text-emerald-400 hover:underline cursor-pointer"
            >
              Villager Organ Vitals [Y]
            </button>
          </div>
          <span>Elderstone 3D</span>
        </div>
      </div>
    </div>
  );
};
