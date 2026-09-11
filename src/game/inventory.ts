export type ItemType = 'weapon' | 'food' | 'block' | 'tool' | 'curio';
export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic';

export interface InventoryItem {
  id: string;
  name: string;
  count: number;
  maxStack: number;
  type: ItemType;
  rarity: ItemRarity;
  icon: string;
  lore: string;
  stats?: {
    damage?: number;
    durability?: number;
    nutrition?: number;
    blockProp?: 'crate' | 'barrel' | 'stone' | 'pumpkin' | 'torch';
  };
}

export class InventorySystem {
  public hotbar: (InventoryItem | null)[] = new Array(9).fill(null);
  public selectedSlot: number = 0;
  public mainSlots: (InventoryItem | null)[] = new Array(27).fill(null);
  public armor: {
    head: InventoryItem | null;
    chest: InventoryItem | null;
    legs: InventoryItem | null;
    feet: InventoryItem | null;
  } = {
    head: null,
    chest: null,
    legs: null,
    feet: null,
  };
  public offhand: InventoryItem | null = null;
  public listeners: (() => void)[] = [];

  constructor() {
    this.seedDefaultItems();
  }

  public subscribe(cb: () => void) {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter(l => l !== cb);
    };
  }

  public notify() {
    this.listeners.forEach(cb => cb());
  }

  public getActiveItem(): InventoryItem | null {
    return this.hotbar[this.selectedSlot];
  }

  public selectSlot(idx: number) {
    if (idx >= 0 && idx < 9) {
      this.selectedSlot = idx;
      this.notify();
    }
  }

  public nextSlot() {
    this.selectedSlot = (this.selectedSlot + 1) % 9;
    this.notify();
  }

  public prevSlot() {
    this.selectedSlot = (this.selectedSlot - 1 + 9) % 9;
    this.notify();
  }

  public consumeActiveItem(): InventoryItem | null {
    const item = this.hotbar[this.selectedSlot];
    if (!item) return null;

    if (item.count > 1) {
      item.count--;
      this.notify();
      return { ...item, count: 1 };
    } else {
      const consumed = { ...item };
      this.hotbar[this.selectedSlot] = null;
      this.notify();
      return consumed;
    }
  }

  public addItem(item: InventoryItem): boolean {
    // Try to stack in hotbar first
    for (let i = 0; i < 9; i++) {
      const existing = this.hotbar[i];
      if (existing && existing.id === item.id && existing.count < existing.maxStack) {
        const canAdd = Math.min(item.count, existing.maxStack - existing.count);
        existing.count += canAdd;
        item.count -= canAdd;
        if (item.count <= 0) {
          this.notify();
          return true;
        }
      }
    }

    // Try to stack in main inventory
    for (let i = 0; i < 27; i++) {
      const existing = this.mainSlots[i];
      if (existing && existing.id === item.id && existing.count < existing.maxStack) {
        const canAdd = Math.min(item.count, existing.maxStack - existing.count);
        existing.count += canAdd;
        item.count -= canAdd;
        if (item.count <= 0) {
          this.notify();
          return true;
        }
      }
    }

    // Place in empty hotbar slot
    for (let i = 0; i < 9; i++) {
      if (!this.hotbar[i]) {
        this.hotbar[i] = { ...item };
        this.notify();
        return true;
      }
    }

    // Place in empty main inventory slot
    for (let i = 0; i < 27; i++) {
      if (!this.mainSlots[i]) {
        this.mainSlots[i] = { ...item };
        this.notify();
        return true;
      }
    }

    return false; // Inventory full
  }

  public swapSlots(
    fromType: 'hotbar' | 'main',
    fromIdx: number,
    toType: 'hotbar' | 'main',
    toIdx: number
  ) {
    const fromArray = fromType === 'hotbar' ? this.hotbar : this.mainSlots;
    const toArray = toType === 'hotbar' ? this.hotbar : this.mainSlots;

    const temp = fromArray[fromIdx];
    fromArray[fromIdx] = toArray[toIdx];
    toArray[toIdx] = temp;
    this.notify();
  }

  public dropItem(type: 'hotbar' | 'main', idx: number): InventoryItem | null {
    const arr = type === 'hotbar' ? this.hotbar : this.mainSlots;
    const item = arr[idx];
    if (!item) return null;

    if (item.count > 1) {
      item.count--;
      this.notify();
      return { ...item, count: 1 };
    } else {
      arr[idx] = null;
      this.notify();
      return item;
    }
  }

  public getItemCount(id: string): number {
    let total = 0;
    for (const item of this.hotbar) {
      if (item && item.id === id) total += item.count;
    }
    for (const item of this.mainSlots) {
      if (item && item.id === id) total += item.count;
    }
    return total;
  }

  public hasItem(id: string): boolean {
    return this.getItemCount(id) > 0;
  }

  public consumeItem(id: string, amount: number = 1): boolean {
    let needed = amount;

    // Consume from hotbar first
    for (let i = 0; i < this.hotbar.length; i++) {
      const item = this.hotbar[i];
      if (item && item.id === id) {
        if (item.count >= needed) {
          item.count -= needed;
          if (item.count <= 0) this.hotbar[i] = null;
          this.notify();
          return true;
        } else {
          needed -= item.count;
          this.hotbar[i] = null;
        }
      }
    }

    // Then consume from main slots
    for (let i = 0; i < this.mainSlots.length; i++) {
      const item = this.mainSlots[i];
      if (item && item.id === id) {
        if (item.count >= needed) {
          item.count -= needed;
          if (item.count <= 0) this.mainSlots[i] = null;
          this.notify();
          return true;
        } else {
          needed -= item.count;
          this.mainSlots[i] = null;
        }
      }
    }

    this.notify();
    return needed === 0;
  }

  private seedDefaultItems() {
    // Slot 0: Reforged Sword
    this.hotbar[0] = {
      id: 'iron_sword',
      name: 'Reforged Steel Broadsword',
      count: 1,
      maxStack: 1,
      type: 'weapon',
      rarity: 'epic',
      icon: '⚔️',
      lore: 'Tempered in the village forge by Master Eldrin. High-damage slashing weapon with broad arc sweep.',
      stats: { damage: 35, durability: 500 },
    };

    // Slot 1: Flintlock Handgun
    this.hotbar[1] = {
      id: 'marksman_gun',
      name: 'Marksman Flintlock Pistol',
      count: 1,
      maxStack: 1,
      type: 'weapon',
      rarity: 'epic',
      icon: '🔫',
      lore: 'Precision-machined flintlock handgun. Fires high-velocity brass bullets with devastating knockback.',
      stats: { damage: 60, durability: 800 },
    };

    // Slot 2: Gun Bullets
    this.hotbar[2] = {
      id: 'gun_bullets',
      name: 'Brass Gun Bullets',
      count: 64,
      maxStack: 64,
      type: 'tool',
      rarity: 'uncommon',
      icon: '💥',
      lore: 'Heavy lead bullets encased in brass with blackpowder charge. Loaded directly into the Flintlock Pistol.',
    };

    // Slot 3: Healing Draught / Potion
    this.hotbar[3] = {
      id: 'healing_potion',
      name: 'Elixir of Vitality',
      count: 8,
      maxStack: 16,
      type: 'food',
      rarity: 'rare',
      icon: '🧪',
      lore: 'Brewed from distilled mountain lavender and honeycomb. Instantly restores 40 HP and heals human organs.',
      stats: { nutrition: 40 },
    };

    // Slot 4: Healing Salve
    this.hotbar[4] = {
      id: 'healing_salve',
      name: 'Herbal Soothing Salve',
      count: 8,
      maxStack: 16,
      type: 'food',
      rarity: 'uncommon',
      icon: '🌿',
      lore: 'Calming poultice made from fresh crushed medicinal leaves. Restores 25 HP and stabilizes heartbeat.',
      stats: { nutrition: 25 },
    };

    // Slot 5: Harvest Bread
    this.hotbar[5] = {
      id: 'harvest_bread',
      name: 'Hearth-Baked Crusty Bread',
      count: 16,
      maxStack: 64,
      type: 'food',
      rarity: 'common',
      icon: '🍞',
      lore: 'Fresh warm loaf baked in the village brick oven. Restores 20 HP and replenishes calories.',
      stats: { nutrition: 20 },
    };

    // Slot 6: Cooked Roasted Beef
    this.hotbar[6] = {
      id: 'cooked_beef',
      name: 'Savory Woodfire Steak',
      count: 12,
      maxStack: 64,
      type: 'food',
      rarity: 'uncommon',
      icon: '🥩',
      lore: 'Thick tender steak roasted over hickory embers. Restores 30 HP and maximum stamina.',
      stats: { nutrition: 30 },
    };

    // Slot 7: Crisp Apples
    this.hotbar[7] = {
      id: 'red_apple',
      name: 'Honeycrisp Orchard Apple',
      count: 24,
      maxStack: 64,
      type: 'food',
      rarity: 'common',
      icon: '🍎',
      lore: 'Sweet crisp red apples picked from the village orchard. Restores 15 HP.',
      stats: { nutrition: 15 },
    };

    // Slot 8: Pitch Pine Torch
    this.hotbar[8] = {
      id: 'torch',
      name: 'Pitch Pine Torch',
      count: 16,
      maxStack: 64,
      type: 'tool',
      rarity: 'common',
      icon: '🔥',
      lore: 'Ever-burning torch that casts dynamic warm light against the night shadows.',
      stats: { blockProp: 'torch' },
    };

    // Main Inventory items
    this.mainSlots[0] = {
      id: 'gun_bullets',
      name: 'Reserve Gun Bullets',
      count: 64,
      maxStack: 64,
      type: 'tool',
      rarity: 'uncommon',
      icon: '💥',
      lore: 'A reserve bandolier of brass ammunition for the Flintlock Pistol.',
    };

    this.mainSlots[1] = {
      id: 'golden_apple',
      name: 'Golden Fortified Apple',
      count: 4,
      maxStack: 16,
      type: 'food',
      rarity: 'epic',
      icon: '✨',
      lore: 'Enchanted golden fruit. Instantly restores 60 HP and bestows resistance against zombie attacks.',
      stats: { nutrition: 60 },
    };

    this.mainSlots[2] = {
      id: 'wooden_crate',
      name: 'Heavy Oak Cargo Crate',
      count: 8,
      maxStack: 64,
      type: 'block',
      rarity: 'common',
      icon: '📦',
      lore: 'Sturdy iron-banded storage crate with deep physics interaction.',
      stats: { blockProp: 'crate' },
    };

    this.mainSlots[3] = {
      id: 'oak_barrel',
      name: 'Elderberry Wine Barrel',
      count: 4,
      maxStack: 64,
      type: 'block',
      rarity: 'uncommon',
      icon: '🛢️',
      lore: 'Handcrafted oak barrel bound with forged iron hoops.',
      stats: { blockProp: 'barrel' },
    };

    this.mainSlots[4] = {
      id: 'gold_ingot',
      name: 'Imperial Gold Bullion',
      count: 32,
      maxStack: 64,
      type: 'curio',
      rarity: 'rare',
      icon: '🪙',
      lore: 'Pure gold bullion stamped with the village crest.',
    };

    this.mainSlots[5] = {
      id: 'iron_ingot',
      name: 'Refined Steel Bar',
      count: 24,
      maxStack: 64,
      type: 'curio',
      rarity: 'uncommon',
      icon: '⛓️',
      lore: 'Refined iron ingots ready for crafting blades, tools, and bullets.',
    };

    this.armor.head = {
      id: 'leather_cap',
      name: 'Reinforced Leather Cowl',
      count: 1,
      maxStack: 1,
      type: 'tool',
      rarity: 'uncommon',
      icon: '🧢',
      lore: 'Supple leather headwear providing weather protection.',
    };

    this.armor.chest = {
      id: 'chainmail_tunic',
      name: 'Riveted Chainmail Hauberk',
      count: 1,
      maxStack: 1,
      type: 'tool',
      rarity: 'rare',
      icon: '🛡️',
      lore: 'Linked steel rings worn over an arming doublet for deflection.',
    };
  }
}
