import React, { useState, useEffect } from 'react';
import { InventorySystem, InventoryItem } from '../game/inventory';
import { sound } from '../game/audio';
import { Shield, Sparkles, X, Package, Layers, Info } from 'lucide-react';

interface InventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: InventorySystem;
  onDropItem?: (item: InventoryItem) => void;
}

export const InventoryModal: React.FC<InventoryModalProps> = ({
  isOpen,
  onClose,
  inventory,
  onDropItem,
}) => {
  const [, setTick] = useState(0);
  const [hoveredItem, setHoveredItem] = useState<InventoryItem | null>(null);
  const [draggedSlot, setDraggedSlot] = useState<{ type: 'hotbar' | 'main'; index: number } | null>(null);
  const [quickCraftOpen, setQuickCraftOpen] = useState(false);

  useEffect(() => {
    return inventory.subscribe(() => setTick(t => t + 1));
  }, [inventory]);

  if (!isOpen) return null;

  const handleSlotClick = (type: 'hotbar' | 'main', index: number) => {
    sound.playItemPop();
    if (draggedSlot === null) {
      const arr = type === 'hotbar' ? inventory.hotbar : inventory.mainSlots;
      if (arr[index]) {
        setDraggedSlot({ type, index });
      }
    } else {
      // Swap or drop into target
      inventory.swapSlots(draggedSlot.type, draggedSlot.index, type, index);
      setDraggedSlot(null);
    }
  };

  const handleDropActive = () => {
    if (draggedSlot) {
      const dropped = inventory.dropItem(draggedSlot.type, draggedSlot.index);
      if (dropped && onDropItem) {
        onDropItem(dropped);
      }
      setDraggedSlot(null);
      sound.playItemPop();
    }
  };

  const getRarityBadge = (rarity: string) => {
    switch (rarity) {
      case 'epic':
        return 'text-purple-400 border-purple-500/40 bg-purple-950/40';
      case 'rare':
        return 'text-amber-400 border-amber-500/40 bg-amber-950/40';
      case 'uncommon':
        return 'text-emerald-400 border-emerald-500/40 bg-emerald-950/40';
      default:
        return 'text-zinc-300 border-zinc-600/40 bg-zinc-800/40';
    }
  };

  return (
    <div
      id="minecraft-inventory-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 select-none"
      onClick={onClose}
    >
      <div
        className="relative bg-[#c6c6c6] dark:bg-[#2a2b2e] border-4 border-t-[#ffffff] border-l-[#ffffff] border-b-[#555555] border-r-[#555555] rounded-none p-5 shadow-2xl max-w-2xl w-full text-zinc-900 dark:text-zinc-100 font-mono"
        onClick={e => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-3 border-b-2 border-[#8b8b8b] dark:border-[#444444] mb-4">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-bold tracking-wide uppercase text-zinc-800 dark:text-zinc-100">
              Craft & Survival Inventory
            </h2>
            <span className="text-xs bg-amber-500/20 text-amber-600 dark:text-amber-400 px-2 py-0.5 border border-amber-500/30">
              120Hz Sub-Stepped
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-red-500 hover:text-white border-2 border-t-[#ffffff] border-l-[#ffffff] border-b-[#555555] border-r-[#555555] active:translate-y-0.5"
            title="Close [ESC / E / Tab]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Top Row: Equipped Armor & Character Status */}
        <div className="grid grid-cols-12 gap-4 mb-4">
          {/* Armor Slots */}
          <div className="col-span-4 bg-[#8b8b8b]/20 dark:bg-black/30 p-2.5 border-2 border-t-[#373737] border-l-[#373737] border-b-[#ffffff] border-r-[#ffffff]">
            <div className="flex items-center gap-1.5 mb-2 text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase">
              <Shield className="w-3.5 h-3.5 text-blue-400" /> Armor Rig
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div
                className="w-12 h-12 bg-[#8b8b8b]/40 dark:bg-black/50 border-2 border-t-[#373737] border-l-[#373737] border-b-[#ffffff] border-r-[#ffffff] flex items-center justify-center text-xl"
                title="Headwear"
              >
                {inventory.armor.head?.icon || '🧢'}
              </div>
              <div
                className="w-12 h-12 bg-[#8b8b8b]/40 dark:bg-black/50 border-2 border-t-[#373737] border-l-[#373737] border-b-[#ffffff] border-r-[#ffffff] flex items-center justify-center text-xl"
                title="Chestplate"
              >
                {inventory.armor.chest?.icon || '🛡️'}
              </div>
              <div
                className="w-12 h-12 bg-[#8b8b8b]/40 dark:bg-black/50 border-2 border-t-[#373737] border-l-[#373737] border-b-[#ffffff] border-r-[#ffffff] flex items-center justify-center text-xl text-zinc-400"
                title="Leggings"
              >
                👖
              </div>
              <div
                className="w-12 h-12 bg-[#8b8b8b]/40 dark:bg-black/50 border-2 border-t-[#373737] border-l-[#373737] border-b-[#ffffff] border-r-[#ffffff] flex items-center justify-center text-xl text-zinc-400"
                title="Boots"
              >
                👢
              </div>
            </div>
          </div>

          {/* Player Live Vitals Preview */}
          <div className="col-span-8 bg-[#8b8b8b]/20 dark:bg-black/30 p-2.5 border-2 border-t-[#373737] border-l-[#373737] border-b-[#ffffff] border-r-[#ffffff] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5 font-bold">
                <span className="text-red-500">❤️ HUMAN HEARTBEAT</span>
                <span className="text-emerald-400">74 BPM • 118/76 mmHg</span>
              </div>
              <div className="w-full bg-zinc-900/60 h-2 border border-zinc-700/60 mb-2">
                <div className="bg-red-600 h-full w-[94%]" />
              </div>

              <div className="flex items-center justify-between text-xs mb-1.5 font-bold">
                <span className="text-amber-500">🍞 STOMACH NOURISHMENT</span>
                <span className="text-amber-400">88% Metabolic Saturation</span>
              </div>
              <div className="w-full bg-zinc-900/60 h-2 border border-zinc-700/60">
                <div className="bg-amber-600 h-full w-[88%]" />
              </div>
            </div>

            <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-600/30 text-xs">
              <span className="text-zinc-500">Active Hand:</span>
              <span className="font-bold text-amber-500">
                {inventory.getActiveItem()?.name || 'Empty Hands'}
              </span>
              <button
                onClick={() => setQuickCraftOpen(!quickCraftOpen)}
                className="px-2 py-0.5 text-xs bg-amber-600 hover:bg-amber-500 text-white border border-amber-400 flex items-center gap-1 active:translate-y-0.5"
              >
                <Sparkles className="w-3 h-3" /> Quick Recipes
              </button>
            </div>
          </div>
        </div>

        {/* Quick Crafting Drawer */}
        {quickCraftOpen && (
          <div className="mb-4 p-3 bg-zinc-900/90 text-zinc-100 border-2 border-amber-500/50">
            <div className="text-xs font-bold text-amber-400 uppercase mb-2 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" /> Instant Village Crafting Bench
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <button
                onClick={() => {
                  inventory.addItem({
                    id: 'wooden_crate',
                    name: 'Heavy Oak Cargo Crate',
                    count: 2,
                    maxStack: 64,
                    type: 'block',
                    rarity: 'common',
                    icon: '📦',
                    lore: 'Crafted from seasoned oak timber.',
                    stats: { blockProp: 'crate' },
                  });
                  sound.playItemPop();
                }}
                className="p-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-left"
              >
                📦 Craft 2x Crates
              </button>
              <button
                onClick={() => {
                  inventory.addItem({
                    id: 'torch',
                    name: 'Pitch Pine Torch',
                    count: 4,
                    maxStack: 64,
                    type: 'tool',
                    rarity: 'uncommon',
                    icon: '🔥',
                    lore: 'Bundled pitch pine torch.',
                    stats: { blockProp: 'torch' },
                  });
                  sound.playItemPop();
                }}
                className="p-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-left"
              >
                🔥 Craft 4x Torches
              </button>
              <button
                onClick={() => {
                  inventory.addItem({
                    id: 'harvest_bread',
                    name: 'Hearth-Baked Bread',
                    count: 4,
                    maxStack: 64,
                    type: 'food',
                    rarity: 'common',
                    icon: '🍞',
                    lore: 'Stone-baked warm loaf.',
                    stats: { nutrition: 32 },
                  });
                  sound.playItemPop();
                }}
                className="p-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-left"
              >
                🍞 Bake 4x Bread Loaves
              </button>
            </div>
          </div>
        )}

        {/* 3x9 Main Storage Grid */}
        <div className="mb-4">
          <div className="text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase mb-1.5 flex items-center justify-between">
            <span>Storage Compartments (3x9)</span>
            {draggedSlot && (
              <span className="text-amber-500 animate-pulse">
                Click another slot to move item • Or click "Drop"
              </span>
            )}
          </div>
          <div className="grid grid-cols-9 gap-1.5 bg-[#8b8b8b]/30 dark:bg-black/40 p-2 border-2 border-t-[#373737] border-l-[#373737] border-b-[#ffffff] border-r-[#ffffff]">
            {inventory.mainSlots.map((item, idx) => {
              const isSelected = draggedSlot?.type === 'main' && draggedSlot.index === idx;
              return (
                <div
                  key={idx}
                  onClick={() => handleSlotClick('main', idx)}
                  onMouseEnter={() => setHoveredItem(item)}
                  onMouseLeave={() => setHoveredItem(null)}
                  className={`relative w-12 h-12 flex items-center justify-center text-2xl cursor-pointer border-2 transition-transform ${
                    isSelected
                      ? 'border-amber-400 bg-amber-500/20 scale-105'
                      : 'border-t-[#373737] border-l-[#373737] border-b-[#ffffff] border-r-[#ffffff] bg-[#8b8b8b]/40 dark:bg-black/50 hover:bg-white/20'
                  }`}
                >
                  {item && <span>{item.icon}</span>}
                  {item && item.count > 1 && (
                    <span className="absolute bottom-0.5 right-1 text-xs font-bold text-white drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)]">
                      {item.count}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Hotbar (9 Slots) */}
        <div>
          <div className="text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase mb-1.5 flex items-center justify-between">
            <span>Quick Hotbar [Keys 1 - 9]</span>
            <span className="text-xs text-zinc-500">Selected: Slot {inventory.selectedSlot + 1}</span>
          </div>
          <div className="grid grid-cols-9 gap-1.5 bg-[#8b8b8b]/30 dark:bg-black/40 p-2 border-2 border-t-[#373737] border-l-[#373737] border-b-[#ffffff] border-r-[#ffffff]">
            {inventory.hotbar.map((item, idx) => {
              const isHeld = inventory.selectedSlot === idx;
              const isDragged = draggedSlot?.type === 'hotbar' && draggedSlot.index === idx;
              return (
                <div
                  key={idx}
                  onClick={() => handleSlotClick('hotbar', idx)}
                  onMouseEnter={() => setHoveredItem(item)}
                  onMouseLeave={() => setHoveredItem(null)}
                  className={`relative w-12 h-12 flex items-center justify-center text-2xl cursor-pointer border-2 transition-transform ${
                    isHeld
                      ? 'border-yellow-400 ring-2 ring-yellow-400/80 bg-yellow-500/10'
                      : isDragged
                      ? 'border-amber-400 bg-amber-500/20'
                      : 'border-t-[#373737] border-l-[#373737] border-b-[#ffffff] border-r-[#ffffff] bg-[#8b8b8b]/40 dark:bg-black/50 hover:bg-white/20'
                  }`}
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
          </div>
        </div>

        {/* Action Controls & Item Tooltip Footer */}
        <div className="mt-4 pt-3 border-t-2 border-[#8b8b8b] dark:border-[#444444] flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            {draggedSlot && (
              <button
                onClick={handleDropActive}
                className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white font-bold border-2 border-t-[#ffffff] border-l-[#ffffff] border-b-[#555555] border-r-[#555555] active:translate-y-0.5"
              >
                Drop Item to Ground [Q]
              </button>
            )}
            <span className="text-zinc-500">
              Left-Click to Swing/Eat • Right-Click with Prop to Place into 3D World
            </span>
          </div>

          {hoveredItem && (
            <div className={`p-2 border max-w-xs ${getRarityBadge(hoveredItem.rarity)}`}>
              <div className="font-bold text-sm flex items-center gap-1.5">
                <span>{hoveredItem.icon}</span>
                <span>{hoveredItem.name}</span>
              </div>
              <div className="text-[11px] opacity-80 mt-0.5">{hoveredItem.lore}</div>
              {hoveredItem.stats && (
                <div className="mt-1 text-[10px] font-bold text-amber-300 flex items-center gap-2">
                  {hoveredItem.stats.damage && <span>⚔️ +{hoveredItem.stats.damage} Damage</span>}
                  {hoveredItem.stats.nutrition && <span>🍞 +{hoveredItem.stats.nutrition} Nutrition</span>}
                  {hoveredItem.stats.blockProp && <span>📦 Placeable 3D Prop</span>}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
