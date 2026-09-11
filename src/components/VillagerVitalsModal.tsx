import React, { useEffect, useRef, useState } from 'react';
import { VillagerData, VillagerSystem } from '../game/villagers';
import { InventorySystem } from '../game/inventory';
import { sound } from '../game/audio';
import { Activity, Heart, Wind, Utensils, Brain, MessageSquare, X, Sparkles } from 'lucide-react';

interface VillagerVitalsModalProps {
  isOpen: boolean;
  onClose: () => void;
  villager: VillagerData | null;
  villagerSystem: VillagerSystem;
  inventory: InventorySystem;
}

export const VillagerVitalsModal: React.FC<VillagerVitalsModalProps> = ({
  isOpen,
  onClose,
  villager,
  villagerSystem,
  inventory,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [feedFeedback, setFeedFeedback] = useState<string | null>(null);
  const [activeSpeechIndex, setActiveSpeechIndex] = useState(0);

  // Animated ECG loop on canvas
  useEffect(() => {
    if (!isOpen || !villager) return;

    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const points: number[] = [];
    const maxPoints = canvas.width;
    for (let i = 0; i < maxPoints; i++) points.push(0);

    let phase = 0;

    const renderECG = () => {
      phase = (phase + 0.02 * (villager.heart.bpm / 70)) % 1;
      const volt = villagerSystem.getEcgVoltage(phase);

      points.push(volt);
      if (points.length > maxPoints) points.shift();

      // Clear with dark phosphor background & grid lines
      ctx.fillStyle = '#061a12';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Grid lines
      ctx.strokeStyle = '#0f3d2a';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 20) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 20) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Draw ECG wave
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#4ade80';
      ctx.shadowBlur = 6;
      ctx.beginPath();

      const centerY = canvas.height * 0.55;
      const amp = canvas.height * 0.42;

      for (let i = 0; i < points.length; i++) {
        const x = i;
        const y = centerY - points[i] * amp;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Scan-head indicator
      ctx.fillStyle = '#86efac';
      ctx.fillRect(canvas.width - 2, 0, 2, canvas.height);

      animId = requestAnimationFrame(renderECG);
    };

    animId = requestAnimationFrame(renderECG);
    return () => cancelAnimationFrame(animId);
  }, [isOpen, villager, villagerSystem]);

  if (!isOpen || !villager) return null;

  const handleFeed = (foodId: 'harvest_bread' | 'red_apple') => {
    // Check inventory
    const foodItem = inventory.hotbar.find(i => i?.id === foodId) || inventory.mainSlots.find(i => i?.id === foodId);
    if (!foodItem) {
      setFeedFeedback(`You do not have any ${foodId === 'harvest_bread' ? 'Bread' : 'Apples'} in your inventory!`);
      setTimeout(() => setFeedFeedback(null), 3000);
      return;
    }

    foodItem.count--;
    if (foodItem.count <= 0) {
      const hotbarIdx = inventory.hotbar.indexOf(foodItem);
      if (hotbarIdx !== -1) inventory.hotbar[hotbarIdx] = null;
      const mainIdx = inventory.mainSlots.indexOf(foodItem);
      if (mainIdx !== -1) inventory.mainSlots[mainIdx] = null;
    }
    inventory.notify();

    const nutrition = foodItem.stats?.nutrition || 25;
    const msg = villagerSystem.feedVillager(villager.id, foodItem.name, nutrition);
    setFeedFeedback(msg);
    setTimeout(() => setFeedFeedback(null), 4000);
  };

  return (
    <div
      id="villager-vitals-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 select-none"
      onClick={onClose}
    >
      <div
        className="relative bg-zinc-950 border border-zinc-700/80 rounded-xl p-6 shadow-2xl max-w-3xl w-full text-zinc-100 font-sans"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-950/60 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Activity className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white">{villager.name}</h2>
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {villager.role}
                </span>
                <span className="text-xs text-zinc-400">Age {villager.age}</span>
              </div>
              <p className="text-xs text-zinc-400">
                Real Biological Functions • 120Hz Sub-Stepped Living Human Anatomy
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Real-time ECG Oscilloscope Monitor */}
        <div className="mb-5 bg-black rounded-lg border border-emerald-900/60 p-3 shadow-inner">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-mono text-emerald-400 flex items-center gap-1.5 font-bold">
              <Heart className="w-3.5 h-3.5 text-red-500 animate-ping" />
              LIVE ELECTROCARDIOGRAM (LEAD II ECG)
            </span>
            <span className="font-mono text-emerald-300 font-bold">
              {Math.round(villager.heart.bpm)} BPM • SINUS RHYTHM
            </span>
          </div>
          <canvas
            ref={canvasRef}
            width={640}
            height={96}
            className="w-full h-24 rounded border border-emerald-950 block bg-[#061a12]"
          />
        </div>

        {/* Real Organs Diagnostic Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5 text-sm">
          {/* Heart & Cardiovascular */}
          <div className="p-3.5 rounded-lg bg-zinc-900/70 border border-zinc-800">
            <div className="flex items-center gap-2 text-xs font-bold text-red-400 uppercase mb-2">
              <Heart className="w-4 h-4" /> Cardiovascular & Heart
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="bg-black/40 p-2 rounded border border-zinc-800/80">
                <div className="text-zinc-500 text-[10px]">BLOOD PRESSURE</div>
                <div className="text-sm font-bold text-zinc-200">
                  {villager.heart.systolic}/{villager.heart.diastolic} mmHg
                </div>
              </div>
              <div className="bg-black/40 p-2 rounded border border-zinc-800/80">
                <div className="text-zinc-500 text-[10px]">CARDIAC OUTPUT</div>
                <div className="text-sm font-bold text-emerald-400">
                  {villager.heart.cardiacOutput} L/min
                </div>
              </div>
              <div className="bg-black/40 p-2 rounded border border-zinc-800/80">
                <div className="text-zinc-500 text-[10px]">OXYGEN (SpO2)</div>
                <div className="text-sm font-bold text-cyan-400">
                  {villager.heart.oxygenSaturation}% Saturation
                </div>
              </div>
              <div className="bg-black/40 p-2 rounded border border-zinc-800/80">
                <div className="text-zinc-500 text-[10px]">STROKE VOLUME</div>
                <div className="text-sm font-bold text-amber-400">70 mL/beat</div>
              </div>
            </div>
          </div>

          {/* Pulmonary & Lungs */}
          <div className="p-3.5 rounded-lg bg-zinc-900/70 border border-zinc-800">
            <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase mb-2">
              <Wind className="w-4 h-4" /> Respiratory & Lungs
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="bg-black/40 p-2 rounded border border-zinc-800/80">
                <div className="text-zinc-500 text-[10px]">RESPIRATION RATE</div>
                <div className="text-sm font-bold text-zinc-200">
                  {villager.lungs.respiratoryRate} breaths/min
                </div>
              </div>
              <div className="bg-black/40 p-2 rounded border border-zinc-800/80">
                <div className="text-zinc-500 text-[10px]">TIDAL VOLUME</div>
                <div className="text-sm font-bold text-cyan-400">
                  {villager.lungs.tidalVolume} mL
                </div>
              </div>
              <div className="bg-black/40 p-2 rounded border border-zinc-800/80">
                <div className="text-zinc-500 text-[10px]">PHYSICAL STAMINA</div>
                <div className="text-sm font-bold text-emerald-400">
                  {Math.round(villager.lungs.stamina)}%
                </div>
              </div>
              <div className="bg-black/40 p-2 rounded border border-zinc-800/80">
                <div className="text-zinc-500 text-[10px]">EXPANSION RATIO</div>
                <div className="text-sm font-bold text-blue-400">1.04x Sine Cycle</div>
              </div>
            </div>
          </div>

          {/* Digestive & Metabolism */}
          <div className="p-3.5 rounded-lg bg-zinc-900/70 border border-zinc-800">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase mb-2">
              <Utensils className="w-4 h-4" /> Digestive & Metabolism
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Stomach Fullness:</span>
                <span className="font-bold text-amber-400">
                  {Math.round(villager.digestive.stomachFullness)}%
                </span>
              </div>
              <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-amber-500 h-full rounded-full transition-all"
                  style={{ width: `${villager.digestive.stomachFullness}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1">
                <span>Burn: {villager.digestive.metabolicRate} kcal/day</span>
                <span>Hydration: {Math.round(villager.digestive.hydration)}%</span>
              </div>
              <div className="text-[11px] text-zinc-400">
                <span className="text-zinc-500">Craving:</span> {villager.digestive.craving}
              </div>
            </div>
          </div>

          {/* Neural Cortex & AI Consciousness */}
          <div className="p-3.5 rounded-lg bg-zinc-900/70 border border-zinc-800">
            <div className="flex items-center gap-2 text-xs font-bold text-purple-400 uppercase mb-2">
              <Brain className="w-4 h-4" /> Neural AI & Consciousness
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Active Mood:</span>
                <span className="font-bold text-purple-300">{villager.neural.mood}</span>
              </div>
              <div className="p-2 rounded bg-black/50 border border-purple-950/60 italic text-purple-200/90 text-[11px]">
                "{villager.neural.currentThought}"
              </div>
              <div className="flex items-center justify-between text-[11px] text-zinc-400">
                <span>Stress Level: {Math.round(villager.neural.stress)}%</span>
                <span>Melatonin: {Math.round(villager.neural.melatonin)}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Speech Dialogue & Interactive Actions */}
        <div className="p-4 rounded-lg bg-emerald-950/20 border border-emerald-900/40">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase">
              <MessageSquare className="w-4 h-4" /> Spoken Dialogue
            </div>
            <button
              onClick={() => {
                setActiveSpeechIndex((activeSpeechIndex + 1) % villager.neural.dialogue.length);
                sound.playVillagerGreet();
              }}
              className="text-xs text-emerald-400 hover:text-emerald-300 underline"
            >
              Ask Another Question ↻
            </button>
          </div>
          <p className="text-sm text-zinc-200 italic mb-3">
            "{villager.neural.dialogue[activeSpeechIndex]}"
          </p>

          {/* Feed Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-zinc-800/80 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-zinc-400">Feed Villager from Inventory:</span>
              <button
                onClick={() => handleFeed('harvest_bread')}
                className="px-2.5 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-white font-medium flex items-center gap-1 active:translate-y-0.5"
              >
                🍞 Give Hearth Bread (+32)
              </button>
              <button
                onClick={() => handleFeed('red_apple')}
                className="px-2.5 py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-medium flex items-center gap-1 active:translate-y-0.5"
              >
                🍎 Give Orchard Apple (+18)
              </button>
            </div>

            {feedFeedback && (
              <span className="text-xs text-amber-300 font-medium animate-pulse flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> {feedFeedback}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
