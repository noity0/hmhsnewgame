import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { sound } from './audio';
import { PhysicsObject, PhysicsWorld } from './physics';
import { InteractiveDoor, VillageWorld } from './world';
import { InventoryItem, InventorySystem } from './inventory';
import { VillagerData, VillagerSystem } from './villagers';
import { ZombieManager } from './zombies';

export type CameraMode = 'first' | 'third';

export interface InteractionPrompt {
  action: string;
  targetName: string;
}

export class PlayerController {
  public camera: THREE.PerspectiveCamera;
  public domElement: HTMLElement;
  public physics: PhysicsWorld;
  public world: VillageWorld;
  public inventory: InventorySystem;
  public villagers?: VillagerSystem;
  public zombieManager: ZombieManager | null = null;

  // Player Vitals & Health
  public health: number = 100;
  public maxHealth: number = 100;
  public hurtFlashTimer: number = 0;

  // Position and movement
  public position: THREE.Vector3 = new THREE.Vector3(0, 1.7, 8);
  public velocity: THREE.Vector3 = new THREE.Vector3();
  public isGrounded: boolean = true;
  public isSprinting: boolean = false;
  public isCrouching: boolean = false;
  public isTorchOn: boolean = false;

  // Camera orientation
  public yaw: number = 0;
  public pitch: number = 0;
  public cameraMode: CameraMode = 'first';

  // Input states
  public keys: { [key: string]: boolean } = {};
  public isLocked: boolean = false;

  // Third person avatar
  public avatar: THREE.Group;
  public torchLight: THREE.PointLight;
  public torchMesh: THREE.Group;

  // 3D Viewmodel for Active Held Item
  public viewModelGroup: THREE.Group;
  public viewModelMeshes: Map<string, THREE.Object3D> = new Map();
  public swingProgress: number = 0;
  public isSwinging: boolean = false;
  public gunRecoilProgress: number = 0;
  public gunMuzzleLight?: THREE.PointLight;
  public muzzleFlashTimer: number = 0;

  // Gun Mechanics & ADS Zoom
  public gunLoadedAmmo: number = 6;
  public gunMagCapacity: number = 6;
  public isReloading: boolean = false;
  public reloadTimer: number = 0;
  public isAiming: boolean = false;
  public aimProgress: number = 0;

  // Shooting Tracers & FX
  private tracers: { line: THREE.Line; life: number }[] = [];
  private shootingSparks: { mesh: THREE.Mesh; vel: THREE.Vector3; life: number }[] = [];

  // Interaction
  public raycaster: THREE.Raycaster = new THREE.Raycaster();
  public currentPrompt: InteractionPrompt | null = null;
  public targetedDoor: InteractiveDoor | null = null;
  public targetedObject: PhysicsObject | null = null;
  public targetedVillager: VillagerData | null = null;
  public targetedBell: boolean = false;

  // Footstep timing
  private footstepTimer: number = 0;
  private headBobTimer: number = 0;

  constructor(
    camera: THREE.PerspectiveCamera,
    domElement: HTMLElement,
    physics: PhysicsWorld,
    world: VillageWorld,
    inventory: InventorySystem,
    villagers?: VillagerSystem
  ) {
    this.camera = camera;
    this.domElement = domElement;
    this.physics = physics;
    this.world = world;
    this.inventory = inventory;
    this.villagers = villagers;

    // Build 3rd person character model
    this.avatar = this.createAvatar();
    this.world.scene.add(this.avatar);

    // Handheld Torch (illumination without cubemap shadow pass for 120 FPS)
    this.torchLight = new THREE.PointLight(0xff9922, 0, 14, 1.8);
    this.torchLight.castShadow = false;
    this.world.scene.add(this.torchLight);

    this.torchMesh = this.createTorchMesh();
    this.world.scene.add(this.torchMesh);

    // 3D First-Person Viewmodel Group
    this.viewModelGroup = new THREE.Group();
    this.camera.add(this.viewModelGroup);
    this.world.scene.add(this.camera);
    this.buildViewModels();

    // Cleanly reset weapon states on inventory switch to prevent stuck states
    this.inventory.subscribe(() => {
      this.resetWeaponState();
    });

    this.setupListeners();
  }

  private createAvatar(): THREE.Group {
    const group = new THREE.Group();

    // Body / Tunic
    const bodyGeo = new THREE.CylinderGeometry(0.3, 0.25, 0.9, 8);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x3d5a80, roughness: 0.8 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.85;
    body.castShadow = true;
    group.add(body);

    // Head
    const headGeo = new THREE.SphereGeometry(0.22, 12, 12);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xe0a96d, roughness: 0.6 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.45;
    head.castShadow = true;
    group.add(head);

    // Leather boots
    const bootGeo = new THREE.BoxGeometry(0.16, 0.4, 0.24);
    const bootMat = new THREE.MeshStandardMaterial({ color: 0x291d12, roughness: 0.9 });
    const bootL = new THREE.Mesh(bootGeo, bootMat);
    bootL.position.set(-0.16, 0.2, 0.04);
    bootL.castShadow = true;
    group.add(bootL);

    const bootR = new THREE.Mesh(bootGeo, bootMat);
    bootR.position.set(0.16, 0.2, 0.04);
    bootR.castShadow = true;
    group.add(bootR);

    // Backpack
    const packGeo = new THREE.BoxGeometry(0.42, 0.5, 0.24);
    const packMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 });
    const pack = new THREE.Mesh(packGeo, packMat);
    pack.position.set(0, 0.9, -0.22);
    pack.castShadow = true;
    group.add(pack);

    group.visible = false;
    return group;
  }

  private createTorchMesh(): THREE.Group {
    const group = new THREE.Group();
    const handleGeo = new THREE.CylinderGeometry(0.03, 0.04, 0.5, 6);
    const handleMat = new THREE.MeshStandardMaterial({ color: 0x3f220f, roughness: 0.9 });
    const handle = new THREE.Mesh(handleGeo, handleMat);
    group.add(handle);

    const cupGeo = new THREE.CylinderGeometry(0.06, 0.04, 0.12, 6);
    const cupMat = new THREE.MeshStandardMaterial({ color: 0x1f1f1f, metalness: 0.8 });
    const cup = new THREE.Mesh(cupGeo, cupMat);
    cup.position.y = 0.25;
    group.add(cup);

    const flameGeo = new THREE.ConeGeometry(0.08, 0.2, 6);
    const flameMat = new THREE.MeshStandardMaterial({
      color: 0xff6600,
      emissive: 0xffaa00,
      emissiveIntensity: 2.0,
    });
    const flame = new THREE.Mesh(flameGeo, flameMat);
    flame.position.y = 0.38;
    group.add(flame);

    group.visible = false;
    return group;
  }

  // 3D First-Person Viewmodels for Held Items (Sword, Bread, Apple, Torch, Crate, Barrel, etc.)
  private buildViewModels() {
    // 1. Reforged Iron Longsword
    const swordGroup = new THREE.Group();
    const bladeGeo = new THREE.BoxGeometry(0.05, 0.65, 0.02);
    const bladeMat = new THREE.MeshStandardMaterial({ color: 0xddeeff, metalness: 0.9, roughness: 0.2 });
    const blade = new THREE.Mesh(bladeGeo, bladeMat);
    blade.position.y = 0.35;
    blade.castShadow = true;
    swordGroup.add(blade);

    const crossguard = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.04, 0.04), new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.8 }));
    swordGroup.add(crossguard);

    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.18, 6), new THREE.MeshStandardMaterial({ color: 0x3a2210 }));
    grip.position.y = -0.1;
    swordGroup.add(grip);
    this.viewModelMeshes.set('iron_sword', swordGroup);
    this.viewModelGroup.add(swordGroup);

    // 2. Hearth Bread
    const breadMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0xc88b39, roughness: 0.85 })
    );
    breadMesh.scale.set(1.4, 0.8, 0.9);
    this.viewModelMeshes.set('harvest_bread', breadMesh);
    this.viewModelGroup.add(breadMesh);

    // 3. Apple
    const appleMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 10, 10),
      new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.35 })
    );
    this.viewModelMeshes.set('red_apple', appleMesh);
    this.viewModelGroup.add(appleMesh);

    // 4. Torch
    const torchMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.04, 0.45, 6),
      new THREE.MeshStandardMaterial({ color: 0x5a3818, roughness: 0.9 })
    );
    const torchFlame = new THREE.Mesh(
      new THREE.ConeGeometry(0.06, 0.15, 6),
      new THREE.MeshStandardMaterial({ color: 0xff7700, emissive: 0xffaa00, emissiveIntensity: 2.5 })
    );
    torchFlame.position.y = 0.28;
    torchMesh.add(torchFlame);
    this.viewModelMeshes.set('torch', torchMesh);
    this.viewModelGroup.add(torchMesh);

    // 5. Crate / Block
    const crateMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.25, 0.25, 0.25),
      this.world.matWood
    );
    this.viewModelMeshes.set('wooden_crate', crateMesh);
    this.viewModelGroup.add(crateMesh);

    // 6. Barrel
    const barrelMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 0.28, 10),
      this.world.matWood
    );
    this.viewModelMeshes.set('oak_barrel', barrelMesh);
    this.viewModelGroup.add(barrelMesh);

    // 7. Marksman Flintlock Pistol
    const gunGroup = new THREE.Group();
    // Steel octagonal barrel
    const barrelGeo = new THREE.CylinderGeometry(0.024, 0.028, 0.44, 8);
    const barrelMat = new THREE.MeshStandardMaterial({ color: 0x22262a, metalness: 0.9, roughness: 0.25 });
    const gunBarrel = new THREE.Mesh(barrelGeo, barrelMat);
    gunBarrel.rotation.x = Math.PI / 2;
    gunBarrel.position.set(0, 0.06, -0.16);
    gunGroup.add(gunBarrel);

    // Walnut Wooden Stock & Grip
    const stockGeo = new THREE.BoxGeometry(0.05, 0.14, 0.16);
    const stockMat = new THREE.MeshStandardMaterial({ color: 0x4a2a14, roughness: 0.65 });
    const stock = new THREE.Mesh(stockGeo, stockMat);
    stock.rotation.x = 0.35;
    stock.position.set(0, -0.02, 0.04);
    gunGroup.add(stock);

    // Brass Lockplate, Hammer & Trigger Guard
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.85, roughness: 0.3 });
    const lock = new THREE.Mesh(new THREE.BoxGeometry(0.056, 0.05, 0.09), brassMat);
    lock.position.set(0, 0.06, -0.02);
    gunGroup.add(lock);

    const hammer = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.06, 0.03), brassMat);
    hammer.position.set(0, 0.11, 0.02);
    hammer.rotation.x = -0.3;
    gunGroup.add(hammer);

    // Muzzle flash point light
    this.gunMuzzleLight = new THREE.PointLight(0xff9900, 0, 7, 2);
    this.gunMuzzleLight.position.set(0, 0.06, -0.42);
    gunGroup.add(this.gunMuzzleLight);

    this.viewModelMeshes.set('marksman_gun', gunGroup);
    this.viewModelGroup.add(gunGroup);

    // 8. Healing Draught / Potion
    const potionGroup = new THREE.Group();
    const flaskMat = new THREE.MeshStandardMaterial({
      color: 0x9333ea,
      emissive: 0x7e22ce,
      emissiveIntensity: 0.9,
      transparent: true,
      opacity: 0.85,
    });
    const flask = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 10), flaskMat);
    potionGroup.add(flask);
    const flaskNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.08, 8), flaskMat);
    flaskNeck.position.y = 0.09;
    potionGroup.add(flaskNeck);
    this.viewModelMeshes.set('healing_potion', potionGroup);
    this.viewModelGroup.add(potionGroup);

    // 9. Cooked Beef Steak
    const steakMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.06, 0.14),
      new THREE.MeshStandardMaterial({ color: 0x6e2c14, roughness: 0.7 })
    );
    this.viewModelMeshes.set('cooked_beef', steakMesh);
    this.viewModelGroup.add(steakMesh);

    // 10. Healing Salve
    const salveMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.07, 0.06, 8),
      new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.5 })
    );
    this.viewModelMeshes.set('healing_salve', salveMesh);
    this.viewModelGroup.add(salveMesh);

    // Hide all initially
    this.viewModelMeshes.forEach(m => (m.visible = false));
  }

  private updateViewModel(delta: number) {
    const activeItem = this.inventory.getActiveItem();
    const isGun = activeItem?.id === 'marksman_gun';

    // Set visibility
    this.viewModelMeshes.forEach((mesh, id) => {
      mesh.visible = activeItem?.id === id && this.cameraMode === 'first';
    });

    // Swing animation (Sword / Melee)
    if (this.isSwinging) {
      this.swingProgress += delta * 12;
      if (this.swingProgress >= Math.PI) {
        this.swingProgress = 0;
        this.isSwinging = false;
      }
    }

    // Gun Recoil decay
    if (this.gunRecoilProgress > 0) {
      this.gunRecoilProgress = Math.max(0, this.gunRecoilProgress - delta * 6.5);
    }

    // Muzzle light timer decay
    if (this.muzzleFlashTimer > 0) {
      this.muzzleFlashTimer -= delta;
      if (this.gunMuzzleLight) {
        this.gunMuzzleLight.intensity = this.muzzleFlashTimer > 0 ? 3.5 : 0;
      }
    }

    // Reload timer animation
    if (this.isReloading) {
      this.reloadTimer = Math.max(0, this.reloadTimer - delta);
      if (this.reloadTimer <= 0) {
        this.isReloading = false;
      }
    }

    // ADS Zoom interpolation
    if (this.isAiming && isGun && this.cameraMode === 'first') {
      this.aimProgress = Math.min(1, this.aimProgress + delta * 9);
    } else {
      this.aimProgress = Math.max(0, this.aimProgress - delta * 9);
    }

    // Camera FOV Zoom for gun sniper precision (zooms from 70 to 38 deg)
    const targetFov = THREE.MathUtils.lerp(70, 38, this.aimProgress);
    if (Math.abs(this.camera.fov - targetFov) > 0.05) {
      this.camera.fov = targetFov;
      this.camera.updateProjectionMatrix();
    }

    const swingAngle = Math.sin(this.swingProgress) * 0.85;
    const recoil = Math.sin(this.gunRecoilProgress * Math.PI) * 0.16;
    const bob = Math.sin(this.headBobTimer) * 0.02;
    const reloadDip = this.isReloading ? Math.sin((1 - this.reloadTimer / 0.85) * Math.PI) * 0.08 : 0;

    // Hipfire vs ADS viewmodel alignment
    const posX = THREE.MathUtils.lerp(0.36, 0.0, this.aimProgress);
    const posY = THREE.MathUtils.lerp(-0.3 + bob, -0.21 + bob * 0.2, this.aimProgress) + recoil * 0.5 - reloadDip;
    const posZ = THREE.MathUtils.lerp(-0.62, -0.48, this.aimProgress) + recoil * 1.1;

    const rotX = THREE.MathUtils.lerp(0.1, 0.015, this.aimProgress) + swingAngle * 0.8 - recoil * 0.85;
    const rotY = THREE.MathUtils.lerp(-0.2, 0.0, this.aimProgress) - swingAngle * 0.4;
    const rotZ = -swingAngle * 0.6 + (this.isReloading ? Math.sin((1 - this.reloadTimer / 0.85) * Math.PI) * 0.35 : 0);

    this.viewModelGroup.position.set(posX, posY, posZ);
    this.viewModelGroup.rotation.set(rotX, rotY, rotZ);
  }

  public resetWeaponState() {
    this.isSwinging = false;
    this.swingProgress = 0;
    this.isReloading = false;
    this.reloadTimer = 0;
    this.isAiming = false;
    this.aimProgress = 0;
  }

  public triggerSwing() {
    this.isSwinging = true;
    this.swingProgress = 0;
    sound.playSwing();
  }

  public triggerGunRecoil() {
    this.gunRecoilProgress = 1.0;
    this.muzzleFlashTimer = 0.08;
    if (this.gunMuzzleLight) {
      this.gunMuzzleLight.intensity = 3.5;
    }
  }

  public createTracer(start: THREE.Vector3, end: THREE.Vector3) {
    const material = new THREE.LineBasicMaterial({
      color: 0xffe680,
      transparent: true,
      opacity: 0.95,
    });
    const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
    const line = new THREE.Line(geometry, material);
    this.world.scene.add(line);
    this.tracers.push({ line, life: 0.12 });
  }

  public createHitSparks(pos: THREE.Vector3, count: number = 8) {
    const sparkGeo = new THREE.SphereGeometry(0.04, 4, 4);
    const sparkMat = new THREE.MeshBasicMaterial({ color: 0xffaa11 });
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(sparkGeo, sparkMat);
      mesh.position.copy(pos);
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 6,
        Math.random() * 4 + 1.5,
        (Math.random() - 0.5) * 6
      );
      this.world.scene.add(mesh);
      this.shootingSparks.push({ mesh, vel, life: 0.22 });
    }
  }

  // Auto-connect bullets directly into gun chamber
  public onBulletsAutoConnected(count: number) {
    if (this.gunLoadedAmmo < this.gunMagCapacity) {
      const needed = this.gunMagCapacity - this.gunLoadedAmmo;
      const toLoad = Math.min(needed, count);
      this.gunLoadedAmmo += toLoad;
      sound.playGunReload();
    }
    this.currentPrompt = {
      action: `⚡ +${count} Bullets Auto-Connected into Gun Chamber (${this.gunLoadedAmmo}/${this.gunMagCapacity})!`,
      targetName: 'Marksman Gun',
    };
  }

  // Reload gun from inventory reserve bullets into chamber
  public reloadGun() {
    const active = this.inventory.getActiveItem();
    if (active?.id !== 'marksman_gun') {
      return;
    }
    if (this.isReloading) return;

    if (this.gunLoadedAmmo >= this.gunMagCapacity) {
      this.currentPrompt = {
        action: `Chamber is already full (${this.gunLoadedAmmo}/${this.gunMagCapacity})`,
        targetName: 'Flintlock Gun',
      };
      return;
    }

    const reserve = this.inventory.getItemCount('gun_bullets');
    if (reserve <= 0) {
      sound.playDryClick();
      this.currentPrompt = {
        action: 'No reserve bullets! Slay zombies or loot chests for ammo.',
        targetName: 'Out of Bullets',
      };
      return;
    }

    const needed = this.gunMagCapacity - this.gunLoadedAmmo;
    const toLoad = Math.min(needed, reserve);

    this.inventory.consumeItem('gun_bullets', toLoad);
    this.gunLoadedAmmo += toLoad;
    this.isReloading = true;
    this.reloadTimer = 0.85;

    sound.playGunReload();
    this.currentPrompt = {
      action: `Reloaded +${toLoad} bullets into chamber! (${this.gunLoadedAmmo}/${this.gunMagCapacity})`,
      targetName: 'Gun Chamber Loaded',
    };
  }

  // Use food or healing potion
  public useActiveFoodOrPotion() {
    const active = this.inventory.getActiveItem();
    if (active?.type !== 'food') return;

    const consumed = this.inventory.consumeActiveItem();
    if (consumed) {
      const isPotion = active.id === 'healing_potion' || active.id === 'healing_salve';
      sound.playEatOrHeal(isPotion);

      const healAmount = active.stats?.nutrition || 25;
      this.heal(healAmount);
      this.currentPrompt = {
        action: `Consumed ${active.name}! Restored +${healAmount} HP (Health: ${Math.round(this.health)}/${this.maxHealth})`,
        targetName: 'Vitals Restored',
      };
    }
  }

  private setupListeners() {
    window.addEventListener('keydown', e => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      this.keys[e.code] = true;

      // Hotbar selection keys [1 - 9]
      if (e.code.startsWith('Digit')) {
        const num = parseInt(e.code.replace('Digit', ''), 10);
        if (num >= 1 && num <= 9) {
          this.resetWeaponState();
          this.inventory.selectSlot(num - 1);
          sound.playItemPop();
        }
      }

      // Camera toggle
      if (e.code === 'KeyV') {
        this.toggleCameraMode();
      }

      // Torch toggle
      if (e.code === 'KeyF') {
        this.toggleTorch();
      }

      // Drop active item [Q]
      if (e.code === 'KeyQ') {
        this.resetWeaponState();
        this.dropActiveItem();
      }

      // Reload Gun [R]
      if (e.code === 'KeyR') {
        this.reloadGun();
      }

      // Open / Close Inventory [I] or [Tab]
      if (e.code === 'KeyI' || e.code === 'Tab') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('toggle-inventory'));
      }

      // Talk to / attract Villager ONLY with [Y] button!
      if (e.code === 'KeyY') {
        if (this.targetedVillager && !this.targetedVillager.isDead) {
          window.dispatchEvent(new CustomEvent('open-villager-vitals', { detail: this.targetedVillager }));
          sound.playVillagerGreet();
        }
      }

      // Use healing/food [E], doors, bells, or pick up physics props
      if (e.code === 'KeyE') {
        const active = this.inventory.getActiveItem();

        // 1. Use healing and food if holding food/potion
        if (active?.type === 'food') {
          this.useActiveFoodOrPotion();
        }
        // 2. Interact with targeted door
        else if (this.targetedDoor) {
          this.world.toggleDoor(this.targetedDoor);
          sound.playDoorCreak();
        }
        // 3. Ring church bell
        else if (this.targetedBell) {
          sound.playBell();
        }
        // 4. Pick up physics prop
        else if (this.targetedObject) {
          this.physics.pickUp(this.targetedObject);
        }
        // 5. Otherwise open Crafter / World Editor
        else {
          window.dispatchEvent(new CustomEvent('toggle-world-editor'));
        }
      }

      // Direct Build / Crafter key [B]
      if (e.code === 'KeyB') {
        window.dispatchEvent(new CustomEvent('toggle-world-editor'));
      }
    });

    window.addEventListener('keyup', e => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }
      this.keys[e.code] = false;
    });

    // Mouse wheel cycles hotbar slot
    window.addEventListener('wheel', e => {
      if (!this.isLocked) return;
      this.resetWeaponState();
      if (e.deltaY > 0) {
        this.inventory.nextSlot();
        sound.playItemPop();
      } else {
        this.inventory.prevSlot();
        sound.playItemPop();
      }
    });

    // Mouse Down: RMB Zoom in for gun
    this.domElement.addEventListener('mousedown', e => {
      if (!this.isLocked) return;
      if (e.button === 2) {
        const active = this.inventory.getActiveItem();
        if (active?.id === 'marksman_gun') {
          this.isAiming = true;
        }
      }
    });

    // Mouse Up: RMB Zoom release
    window.addEventListener('mouseup', e => {
      if (e.button === 2) {
        this.isAiming = false;
      }
    });

    // Left Click (LMB): Shoot gun, swing sword, throw physics prop
    this.domElement.addEventListener('click', e => {
      if (!this.isLocked) {
        sound.init();
        sound.resume();
        this.domElement.requestPointerLock?.();
        return;
      }

      if (e.button !== 0) return;

      const active = this.inventory.getActiveItem();

      // If holding physics object, throw it
      if (this.physics.heldObject) {
        this.throwHeldObject();
        return;
      }

      // 1. LMB to Shoot Gun (Range: 52 meters = 2000 inches / 170 ft)
      if (active?.id === 'marksman_gun') {
        if (this.isReloading) {
          this.currentPrompt = {
            action: 'Reloading chamber...',
            targetName: 'Flintlock Gun',
          };
          return;
        }

        if (this.gunLoadedAmmo > 0) {
          this.gunLoadedAmmo--;
          sound.playGunshot();
          this.triggerGunRecoil();

          // Raycast bullet from camera center
          const shootDir = new THREE.Vector3();
          this.camera.getWorldDirection(shootDir);
          const camPos = this.camera.position.clone();
          const maxGunRange = 52; // 2000 inches / 170 ft range

          // Start tracer at gun viewmodel muzzle position
          const tracerStart = camPos.clone().add(shootDir.clone().multiplyScalar(0.7));
          let hitPoint: THREE.Vector3 | null = null;

          // Test hit on villagers (sword & gun killable)
          const hitVillager = this.villagers?.checkGunHit(camPos, shootDir, maxGunRange);

          // Test hit on zombies
          const hitZombie = !hitVillager && this.zombieManager?.checkGunHit(camPos, shootDir, maxGunRange);

          // Test hit on physics props & world geometry
          this.raycaster.set(camPos, shootDir);
          this.raycaster.far = maxGunRange;
          const propMeshes = this.physics.objects.map(o => o.mesh);
          const hits = this.raycaster.intersectObjects(propMeshes, true);
          if (hits.length > 0) {
            hitPoint = hits[0].point;
            let root = hits[0].object;
            while (root.parent && root.parent !== this.world.scene) {
              root = root.parent;
            }
            const prop = this.physics.objects.find(p => p.mesh === root);
            if (prop) {
              prop.body.wakeUp();
              prop.body.applyImpulse(
                new CANNON.Vec3(shootDir.x * 35, shootDir.y * 35 + 6, shootDir.z * 35),
                new CANNON.Vec3(hits[0].point.x, hits[0].point.y, hits[0].point.z)
              );
            }
          }

          // Compute tracer endpoint and visual hit effects
          const endPos = hitPoint || camPos.clone().add(shootDir.clone().multiplyScalar(maxGunRange));
          this.createTracer(tracerStart, endPos);
          if (hitPoint || hitVillager || hitZombie) {
            this.createHitSparks(hitPoint || endPos, 10);
          }

          if (this.gunLoadedAmmo === 0) {
            const reserve = this.inventory.getItemCount('gun_bullets');
            if (reserve > 0) {
              this.currentPrompt = {
                action: `Chamber empty! Press [R] to reload (${reserve} in reserve)`,
                targetName: 'Flintlock Gun',
              };
            } else {
              this.currentPrompt = {
                action: 'Out of Bullets! Slay zombies or loot chests for ammo.',
                targetName: 'Empty Chamber',
              };
            }
          }
        } else {
          sound.playDryClick();
          const reserve = this.inventory.getItemCount('gun_bullets');
          if (reserve > 0) {
            this.currentPrompt = {
              action: `Chamber empty! Press [R] to reload (${reserve} in reserve)`,
              targetName: 'Flintlock Gun',
            };
          } else {
            this.currentPrompt = {
              action: 'Out of Bullets! Slay zombies or loot chests for ammo.',
              targetName: 'Flintlock Gun',
            };
          }
        }
      }
      // 2. LMB to Use Sword (Melee Slash - damages zombies & villagers)
      else if (active?.id === 'iron_sword') {
        this.triggerSwing();
        this.villagers?.checkMeleeHit(this.position, this.yaw, 3.2);
        this.zombieManager?.checkMeleeHit(this.position, this.yaw, 3.2);

        // Apply sword kinetic slice to nearby physics objects
        if (this.targetedObject) {
          const body = this.targetedObject.body;
          body.wakeUp();
          const forward = new THREE.Vector3();
          this.camera.getWorldDirection(forward);
          body.applyImpulse(
            new CANNON.Vec3(forward.x * 15, forward.y * 15 + 4, forward.z * 15)
          );
        }
      }
      // 3. Holding food/potion: hint to use [E]
      else if (active?.type === 'food') {
        this.useActiveFoodOrPotion();
      }
      // 4. Default melee swing / tool swing
      else {
        this.triggerSwing();
        if (this.targetedDoor) {
          this.world.toggleDoor(this.targetedDoor);
          sound.playDoorCreak();
        } else if (this.targetedBell) {
          sound.playBell();
        }
      }
    });

    // Right Click: Zoom in for gun OR place block/prop into 3D world
    this.domElement.addEventListener('contextmenu', e => {
      e.preventDefault();
      if (!this.isLocked) return;

      const active = this.inventory.getActiveItem();
      if (!active) return;

      // If active item is the gun, right click is reserved for ADS zoom
      if (active.id === 'marksman_gun') {
        return;
      }

      // If active item is a placeable block/prop
      if (active.stats?.blockProp) {
        const forward = new THREE.Vector3();
        this.camera.getWorldDirection(forward);
        const spawnPos = this.camera.position.clone().add(forward.multiplyScalar(2.8));
        spawnPos.y = Math.max(0.5, spawnPos.y);

        if (active.stats.blockProp === 'crate') {
          this.world.spawnCrate(spawnPos);
        } else if (active.stats.blockProp === 'barrel') {
          this.world.spawnBarrel(spawnPos);
        } else if (active.stats.blockProp === 'pumpkin') {
          this.world.spawnPumpkin(spawnPos);
        } else if (active.stats.blockProp === 'stone') {
          this.world.spawnBoulder(spawnPos);
        } else if (active.stats.blockProp === 'torch') {
          this.world.spawnLanternProp(spawnPos);
        }

        this.inventory.consumeActiveItem();
        sound.playImpact('wood', 0.8);
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.isLocked = document.pointerLockElement === this.domElement;
      if (!this.isLocked) {
        this.isAiming = false;
      }
    });

    window.addEventListener('mousemove', e => {
      if (!this.isLocked) return;
      // Precision mouse sensitivity when ADS aiming with gun
      const baseSensitivity = 0.0022;
      const sensitivity = this.isAiming ? baseSensitivity * 0.45 : baseSensitivity;
      this.yaw -= e.movementX * sensitivity;
      this.pitch -= e.movementY * sensitivity;

      // Clamp pitch (-85 deg to +85 deg)
      const maxPitch = (Math.PI / 2) * 0.95;
      this.pitch = Math.max(-maxPitch, Math.min(maxPitch, this.pitch));
    });
  }

  public dropActiveItem() {
    const dropped = this.inventory.consumeActiveItem();
    if (!dropped) return;

    sound.playItemPop();
    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    const dropPos = this.camera.position.clone().add(forward.multiplyScalar(1.8));

    if (dropped.stats?.blockProp === 'barrel') {
      this.world.spawnBarrel(dropPos);
    } else if (dropped.stats?.blockProp === 'pumpkin') {
      this.world.spawnPumpkin(dropPos);
    } else if (dropped.stats?.blockProp === 'stone') {
      this.world.spawnBoulder(dropPos);
    } else {
      this.world.spawnCrate(dropPos);
    }
  }

  public toggleCameraMode() {
    this.cameraMode = this.cameraMode === 'first' ? 'third' : 'first';
    this.avatar.visible = this.cameraMode === 'third';
  }

  public toggleTorch() {
    this.isTorchOn = !this.isTorchOn;
    this.torchLight.intensity = this.isTorchOn ? 2.2 : 0;
    this.torchMesh.visible = this.isTorchOn;
  }

  public throwHeldObject() {
    if (!this.physics.heldObject) return;
    const throwDir = new THREE.Vector3();
    this.camera.getWorldDirection(throwDir);
    this.physics.throwHeld(throwDir, 16);
  }

  public handleInteraction() {
    if (this.physics.heldObject) {
      this.physics.dropHeld();
      return;
    }

    if (this.targetedDoor) {
      this.world.toggleDoor(this.targetedDoor);
      sound.playDoorCreak();
    } else if (this.targetedObject) {
      this.physics.pickUp(this.targetedObject);
    } else if (this.targetedBell) {
      sound.playBell();
    }
  }

  public takeDamage(amount: number) {
    this.health = Math.max(0, this.health - amount);
    this.hurtFlashTimer = 0.35;

    if (this.health <= 0) {
      // Respawn player safely in village square with full vitals
      this.health = 100;
      this.position.set(0, 1.7, 8);
      this.velocity.set(0, 0, 0);
      this.currentPrompt = {
        action: 'You were wounded by the horde and recovered at the village fountain!',
        targetName: 'Village Safe Haven',
      };
    }
  }

  public heal(amount: number) {
    this.health = Math.min(this.maxHealth, this.health + amount);
    this.currentPrompt = {
      action: `Restored +${amount} HP vitals! Current health: ${Math.round(this.health)}/${this.maxHealth}`,
      targetName: 'Vitals Nourished',
    };
  }

  public update(delta: number) {
    if (this.hurtFlashTimer > 0) {
      this.hurtFlashTimer -= delta;
    }

    // Update bullet tracers
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const t = this.tracers[i];
      t.life -= delta;
      if (t.life <= 0) {
        this.world.scene.remove(t.line);
        t.line.geometry.dispose();
        this.tracers.splice(i, 1);
      }
    }

    // Update shooting hit spark particles
    for (let i = this.shootingSparks.length - 1; i >= 0; i--) {
      const s = this.shootingSparks[i];
      s.life -= delta;
      s.mesh.position.addScaledVector(s.vel, delta);
      s.vel.y -= delta * 12;
      s.mesh.scale.multiplyScalar(Math.max(0, 1 - delta * 4));
      if (s.life <= 0) {
        this.world.scene.remove(s.mesh);
        s.mesh.geometry.dispose();
        this.shootingSparks.splice(i, 1);
      }
    }

    this.handleMovement(delta);
    this.handleRaycastInteraction();
    this.updateCameraAndAvatar(delta);
    this.updateTorch();
    this.updateViewModel(delta);
  }

  private handleMovement(delta: number) {
    this.isSprinting = !!(this.keys['ShiftLeft'] || this.keys['ShiftRight']);
    this.isCrouching = !!this.keys['KeyC'];

    let moveSpeed = 4.8;
    if (this.isSprinting) moveSpeed = 8.5;
    if (this.isCrouching) moveSpeed = 2.4;

    const moveVector = new THREE.Vector3();
    if (this.keys['KeyW'] || this.keys['ArrowUp']) moveVector.z -= 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) moveVector.z += 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) moveVector.x -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) moveVector.x += 1;

    if (moveVector.lengthSq() > 0) {
      moveVector.normalize();
      moveVector.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);

      this.velocity.x = moveVector.x * moveSpeed;
      this.velocity.z = moveVector.z * moveSpeed;

      const stepInterval = this.isSprinting ? 0.3 : 0.48;
      this.footstepTimer += delta;
      this.headBobTimer += delta * (this.isSprinting ? 14 : 9);

      if (this.footstepTimer >= stepInterval && this.isGrounded) {
        this.footstepTimer = 0;
        const surface = this.detectSurface();
        sound.playFootstep(surface, this.isSprinting);
      }
    } else {
      this.velocity.x *= 0.8;
      this.velocity.z *= 0.8;
      this.headBobTimer = 0;
    }

    // Jump
    if (this.keys['Space'] && this.isGrounded) {
      this.velocity.y = 5.2;
      this.isGrounded = false;
      sound.playFootstep('grass');
    }

    // Gravity
    this.velocity.y -= 14.5 * delta;

    const eyeHeight = this.isCrouching ? 1.1 : 1.7;

    // ANTI-TUNNELING SUB-STEPPING:
    // Subdivide horizontal delta movement into 4 granular sub-steps.
    // At each sub-step, resolve collision against walls, buildings, windmill, well, and props.
    // This physically prevents passing through any collider even at top sprinting speed.
    const subSteps = 4;
    const subDelta = delta / subSteps;

    for (let s = 0; s < subSteps; s++) {
      this.position.x += this.velocity.x * subDelta;
      this.position.z += this.velocity.z * subDelta;

      const resolved = this.physics.resolvePlayerCollision(
        new THREE.Vector3(this.position.x, this.position.y, this.position.z),
        0.44,
        eyeHeight
      );
      this.position.x = resolved.x;
      this.position.z = resolved.z;
    }

    // Vertical translation
    this.position.y += this.velocity.y * delta;

    // Ground check & collision floor
    const floorY = this.getTerrainHeightAt(this.position.x, this.position.z);
    if (this.position.y <= floorY + eyeHeight) {
      this.position.y = floorY + eyeHeight;
      this.velocity.y = 0;
      this.isGrounded = true;
    }

    // Push nearby dynamic physics props when colliding
    for (let i = 0; i < this.physics.objects.length; i++) {
      const obj = this.physics.objects[i];
      if (obj.isHeld) continue;
      const dist = new THREE.Vector2(this.position.x - obj.body.position.x, this.position.z - obj.body.position.z).length();
      if (dist < 1.1 && Math.abs(this.position.y - eyeHeight - obj.body.position.y) < 1.4) {
        const pushDir = new THREE.Vector3(
          obj.body.position.x - this.position.x,
          0,
          obj.body.position.z - this.position.z
        ).normalize();
        obj.body.wakeUp();
        obj.body.velocity.x += pushDir.x * (this.isSprinting ? 5 : 2.5);
        obj.body.velocity.z += pushDir.z * (this.isSprinting ? 5 : 2.5);
      }
    }
  }

  private detectSurface(): 'stone' | 'wood' | 'grass' {
    const x = this.position.x;
    const z = this.position.z;
    if (x > 8 && x < 16 && z > 3 && z < 13) return 'wood';
    if (x > 6 && x < 18 && z > -18 && z < -6) return 'wood';
    if (Math.abs(x) < 5 && Math.abs(z) < 5) return 'stone';
    if (Math.abs(x) < 2.5 && Math.abs(z) < 32) return 'stone';
    return 'grass';
  }

  private getTerrainHeightAt(x: number, z: number): number {
    if (x > -16 && x < -4 && z > -35 && z < 35) {
      if (Math.abs(z - 6) < 2.5) return 0.6; // On wooden river bridge!
      return -0.4; // River bottom
    }
    const distFromOrigin = Math.sqrt(x * x + z * z);
    if (distFromOrigin > 38) {
      return (distFromOrigin - 38) * 0.15;
    }
    return 0;
  }

  private handleRaycastInteraction() {
    this.targetedObject = null;
    this.targetedDoor = null;
    this.targetedVillager = null;
    this.targetedBell = false;
    this.currentPrompt = null;

    if (this.physics.heldObject) {
      this.currentPrompt = {
        action: 'Press [E] to Drop / [LMB] to Throw',
        targetName: this.physics.heldObject.name,
      };
      return;
    }

    // Raycast center of screen
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    this.raycaster.far = 4.5;

    // 1. Check Living Villagers with Real Human Figures & Organs
    if (this.villagers) {
      for (const v of this.villagers.villagers) {
        const vMesh = this.villagers.villagerMeshes.get(v.id);
        if (vMesh) {
          const hits = this.raycaster.intersectObject(vMesh, true);
          if (hits.length > 0 && hits[0].distance < 4.2) {
            this.targetedVillager = v;
            if (v.isDead) {
              this.currentPrompt = {
                action: 'Fallen in combat',
                targetName: `${v.name} (Deceased)`,
              };
            } else {
              this.currentPrompt = {
                action: 'Press [Y] to Speak / Inspect Villager',
                targetName: `${v.name} (${v.role})`,
              };
            }
            return;
          }
        }
      }
    }

    // 2. Check physics props
    const propMeshes = this.physics.objects.map(o => o.mesh);
    const intersectsProps = this.raycaster.intersectObjects(propMeshes, true);

    if (intersectsProps.length > 0) {
      let root = intersectsProps[0].object;
      while (root.parent && root.parent !== this.world.scene) {
        root = root.parent;
      }
      const found = this.physics.objects.find(o => o.mesh === root);
      if (found) {
        this.targetedObject = found;
        this.currentPrompt = {
          action: 'Press [E] or Click to Pick Up',
          targetName: found.name,
        };
        return;
      }
    }

    // 3. Check doors
    for (const door of this.world.interactiveDoors) {
      const doorIntersects = this.raycaster.intersectObject(door.mesh, true);
      if (doorIntersects.length > 0 && doorIntersects[0].distance < 3.8) {
        this.targetedDoor = door;
        this.currentPrompt = {
          action: door.isOpen ? 'Press [E] to Close Door' : 'Press [E] to Open Door',
          targetName: 'Wooden Door',
        };
        return;
      }
    }

    // 4. Check church bell
    if (this.world.churchBell) {
      const bellIntersects = this.raycaster.intersectObject(this.world.churchBell, true);
      if (bellIntersects.length > 0) {
        this.targetedBell = true;
        this.currentPrompt = {
          action: 'Press [E] to Ring Church Bell',
          targetName: 'Bronze Bell',
        };
      }
    }
  }

  private updateCameraAndAvatar(delta: number) {
    const euler = new THREE.Euler(0, 0, 0, 'YXZ');
    euler.x = this.pitch;
    euler.y = this.yaw;

    let bobY = 0;
    let bobX = 0;
    if (this.headBobTimer > 0 && this.isGrounded) {
      bobY = Math.sin(this.headBobTimer) * 0.04;
      bobX = Math.cos(this.headBobTimer * 0.5) * 0.02;
    }

    if (this.cameraMode === 'first') {
      this.avatar.visible = false;
      this.camera.position.set(
        this.position.x + bobX,
        this.position.y + bobY,
        this.position.z
      );
      this.camera.quaternion.setFromEuler(euler);
    } else {
      this.avatar.visible = true;
      this.avatar.position.set(this.position.x, this.position.y - 1.7, this.position.z);
      this.avatar.rotation.y = this.yaw;

      const armLength = 4.2;
      const cameraOffset = new THREE.Vector3(0, 1.2, armLength);
      cameraOffset.applyEuler(euler);

      this.camera.position.set(
        this.position.x + cameraOffset.x,
        this.position.y + cameraOffset.y + 0.5,
        this.position.z + cameraOffset.z
      );

      const lookTarget = new THREE.Vector3(this.position.x, this.position.y, this.position.z);
      this.camera.lookAt(lookTarget);
    }

    // Update held physics object target
    if (this.physics.heldObject) {
      const forward = new THREE.Vector3();
      this.camera.getWorldDirection(forward);
      const holdPos = this.camera.position.clone().add(forward.multiplyScalar(2.2));
      holdPos.y -= 0.2;
      this.physics.update(delta, holdPos);
    } else {
      this.physics.update(delta);
    }
  }

  private updateTorch() {
    if (this.isTorchOn) {
      const forward = new THREE.Vector3();
      this.camera.getWorldDirection(forward);
      const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);

      const torchPos = this.camera.position.clone()
        .add(forward.clone().multiplyScalar(0.7))
        .add(right.clone().multiplyScalar(0.4));
      torchPos.y -= 0.3;

      this.torchMesh.position.copy(torchPos);
      this.torchLight.position.copy(torchPos);
      this.torchLight.intensity = 2.0 + Math.sin(Date.now() * 0.02) * 0.3 + (Math.random() - 0.5) * 0.2;
    }
  }
}
