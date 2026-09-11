import * as THREE from 'three';
import { sound } from './audio';
import { InventorySystem } from './inventory';

export type ZombieWeaponType = 'shovel' | 'hands';

export interface BulletDrop {
  id: string;
  mesh: THREE.Group;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  ammoCount: number;
  bobPhase: number;
  lifetime: number;
  isMagnetizing: boolean;
}

export interface Zombie {
  id: string;
  group: THREE.Group;
  weaponType: ZombieWeaponType;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  yaw: number;
  health: number;
  maxHealth: number;
  walkTimer: number;
  attackCooldown: number;
  hitFlashTimer: number;
  isDying: boolean;
  deathTimer: number;
  // Mesh parts for animation
  leftLeg: THREE.Mesh;
  rightLeg: THREE.Mesh;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  head: THREE.Group;
  shovelMesh?: THREE.Group;
  materials: THREE.MeshStandardMaterial[];
}

export class ZombieManager {
  public zombies: Zombie[] = [];
  public droppedBullets: BulletDrop[] = [];
  public activeZombiesCount: number = 0;
  public totalKilled: number = 0;
  public currentWave: number = 1;
  public isNightHordeActive: boolean = false;
  public onBulletsAutoConnected?: (count: number) => void;

  private scene: THREE.Scene;
  private inventory: InventorySystem;
  private spawnTimer: number = 0;
  private groanTimer: number = 4;
  private maxZombies: number = 6; // Stable FPS cap

  // Shared Geometries
  private headGeo = new THREE.BoxGeometry(0.48, 0.48, 0.48);
  private eyeGeo = new THREE.BoxGeometry(0.1, 0.08, 0.04);
  private bodyGeo = new THREE.BoxGeometry(0.62, 0.85, 0.36);
  private limbGeo = new THREE.BoxGeometry(0.22, 0.8, 0.22);
  private shovelPoleGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.2, 6);
  private shovelBladeGeo = new THREE.BoxGeometry(0.32, 0.35, 0.04);

  // Shared Base Materials
  private skinMat = new THREE.MeshStandardMaterial({
    color: 0x476b42,
    roughness: 0.85,
  });
  private eyeMat = new THREE.MeshStandardMaterial({
    color: 0xff3b30,
    emissive: 0xff2200,
    emissiveIntensity: 2.0,
  });
  private shirtMat = new THREE.MeshStandardMaterial({
    color: 0x2d4356,
    roughness: 0.9,
  });
  private pantsMat = new THREE.MeshStandardMaterial({
    color: 0x39302a,
    roughness: 0.9,
  });
  private ironMat = new THREE.MeshStandardMaterial({
    color: 0x5a5f63,
    metalness: 0.6,
    roughness: 0.4,
  });
  private woodMat = new THREE.MeshStandardMaterial({
    color: 0x5c4033,
    roughness: 0.8,
  });

  // Hit Spark / Blood Particle Pool
  private particles: {
    mesh: THREE.Mesh;
    velocity: THREE.Vector3;
    lifetime: number;
    maxLife: number;
  }[] = [];
  private particleGeo = new THREE.SphereGeometry(0.06, 4, 4);
  private particleMat = new THREE.MeshBasicMaterial({ color: 0x44aa44 });

  constructor(scene: THREE.Scene, inventory: InventorySystem) {
    this.scene = scene;
    this.inventory = inventory;
  }

  public getTerrainHeight(x: number, z: number): number {
    if (z >= 3.65 && z <= 8.35) {
      if (x >= -17.8 && x <= -2.2) {
        return 0.80; // On bridge deck
      } else if (x > -2.2 && x <= -0.5) {
        const t = (x - (-0.5)) / (-2.2 - (-0.5));
        return Math.max(0, Math.min(0.80, t * 0.80));
      } else if (x < -17.8 && x >= -19.5) {
        const t = (x - (-19.5)) / (-17.8 - (-19.5));
        return Math.max(0, Math.min(0.80, t * 0.80));
      }
    }
    return 0.0;
  }

  public update(
    delta: number,
    playerPos: THREE.Vector3,
    isNight: boolean,
    onPlayerDamage: (damage: number) => void
  ) {
    this.isNightHordeActive = isNight;

    // 1. Spawning / Wave logic
    if (isNight) {
      this.spawnTimer += delta;
      // Spawn a new zombie every 4 seconds until cap is reached
      if (this.spawnTimer > 3.8 && this.zombies.length < this.maxZombies) {
        this.spawnTimer = 0;
        this.spawnZombie(playerPos);
      }

      // Ambient zombie groans during night
      this.groanTimer -= delta;
      if (this.groanTimer <= 0) {
        this.groanTimer = 5 + Math.random() * 6;
        if (this.zombies.length > 0) {
          sound.playZombieGroan();
        }
      }
    } else {
      // Daytime: burn away any night zombies
      for (const z of this.zombies) {
        if (!z.isDying) {
          z.isDying = true;
          z.deathTimer = 0.8;
          this.spawnHitParticles(z.position, 10, 0xff7700);
        }
      }
    }

    // 2. Update each zombie
    for (let i = this.zombies.length - 1; i >= 0; i--) {
      const z = this.zombies[i];

      // Dying animation
      if (z.isDying) {
        z.deathTimer -= delta;
        z.group.position.y -= delta * 0.8;
        z.group.rotation.x += delta * 1.5;
        if (z.deathTimer <= 0) {
          this.scene.remove(z.group);
          this.zombies.splice(i, 1);
        }
        continue;
      }

      // Hit Flash reset
      if (z.hitFlashTimer > 0) {
        z.hitFlashTimer -= delta;
        if (z.hitFlashTimer <= 0) {
          z.materials.forEach(m => (m.color.setHex(m.userData.originalColor)));
        }
      }

      // Direction to player
      const dx = playerPos.x - z.position.x;
      const dz = playerPos.z - z.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      // Turn towards player
      z.yaw = Math.atan2(dx, dz);
      z.group.rotation.y = z.yaw;

      // Apply velocity / knockback friction
      z.position.x += z.velocity.x * delta;
      z.position.z += z.velocity.z * delta;
      z.velocity.multiplyScalar(Math.max(0, 1 - delta * 6));

      // Easy Fight: Shambling walk towards player if distance > 1.6m
      const attackRange = 1.7;
      if (dist > attackRange && dist < 45) {
        const speed = 1.45; // Easy, slow shambling pace
        z.position.x += Math.sin(z.yaw) * speed * delta;
        z.position.z += Math.cos(z.yaw) * speed * delta;
        z.walkTimer += delta * 4.5;
      }

      // Height clamped to terrain / bridge deck
      z.position.y = this.getTerrainHeight(z.position.x, z.position.z);
      z.group.position.copy(z.position);

      // Walk limb sway animation
      const sway = Math.sin(z.walkTimer);
      z.leftLeg.rotation.x = sway * 0.6;
      z.rightLeg.rotation.x = -sway * 0.6;

      if (z.weaponType === 'hands') {
        // Arms held forward, undulating like classic zombies
        z.leftArm.rotation.x = -Math.PI / 2 + Math.sin(z.walkTimer * 0.5) * 0.15;
        z.rightArm.rotation.x = -Math.PI / 2 - Math.sin(z.walkTimer * 0.5) * 0.15;
      } else {
        // Holding shovel
        z.leftArm.rotation.x = -Math.PI / 3 + sway * 0.2;
        z.rightArm.rotation.x = -Math.PI / 3 - sway * 0.2;
      }

      // Attack player when in range
      z.attackCooldown -= delta;
      if (dist <= attackRange && z.attackCooldown <= 0) {
        z.attackCooldown = 1.4; // Generous attack delay for easy fight
        sound.playZombieAttack();

        // Arm strike animation
        z.rightArm.rotation.x = -Math.PI * 0.85;

        // Damage player (only 6 damage - easy fight!)
        onPlayerDamage(6);
      }
    }

    // 3. Update 3D Physical Dropped Bullets (Magnetic Auto-Connect)
    const playerChestPos = playerPos.clone().add(new THREE.Vector3(0, 1.2, 0));
    for (let i = this.droppedBullets.length - 1; i >= 0; i--) {
      const drop = this.droppedBullets[i];
      drop.lifetime += delta;
      drop.bobPhase += delta * 4.0;

      // Distance to player
      const toPlayer = playerChestPos.clone().sub(drop.position);
      const distToPlayer = toPlayer.length();

      // Trigger magnetic attraction if player is within 14m or after initial bounce
      if (distToPlayer < 14.0 || drop.lifetime > 0.4) {
        drop.isMagnetizing = true;
      }

      if (drop.isMagnetizing) {
        // Accelerate smoothly towards player / gun
        toPlayer.normalize();
        const flySpeed = Math.min(22.0, 5.0 + drop.lifetime * 14.0);
        drop.velocity.lerp(toPlayer.multiplyScalar(flySpeed), delta * 8.0);
        drop.position.addScaledVector(drop.velocity, delta);

        // Spin rapidly during flight
        drop.mesh.rotation.y += delta * 12.0;
        drop.mesh.rotation.x += delta * 6.0;

        // Trail sparkle particle
        if (Math.random() > 0.4) {
          this.spawnHitParticles(drop.position.clone(), 1, 0xffd700);
        }
      } else {
        // Idle bobbing and spinning on ground
        drop.mesh.rotation.y += delta * 2.5;
        drop.position.y += Math.sin(drop.bobPhase) * 0.006;
      }

      drop.mesh.position.copy(drop.position);

      // Auto-connect when reaching player / gun
      if (distToPlayer < 1.35) {
        // Connect to player inventory
        this.inventory.addItem({
          id: 'gun_bullets',
          name: 'Brass Gun Bullets',
          count: drop.ammoCount,
          maxStack: 64,
          type: 'tool',
          rarity: 'uncommon',
          icon: '💥',
          lore: 'Recovered brass bullets automatically connected with your gun.',
        });

        // Trigger gun auto-load callback
        if (this.onBulletsAutoConnected) {
          this.onBulletsAutoConnected(drop.ammoCount);
        }

        sound.playItemPop();
        this.spawnHitParticles(drop.position.clone(), 8, 0xffea00);

        // Remove 3D mesh
        this.scene.remove(drop.mesh);
        this.droppedBullets.splice(i, 1);
      }
    }

    // 3. Update Hit Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.lifetime += delta;
      p.mesh.position.addScaledVector(p.velocity, delta);
      p.velocity.y -= 9.8 * delta;

      if (p.lifetime >= p.maxLife) {
        this.scene.remove(p.mesh);
        this.particles.splice(i, 1);
      }
    }

    this.activeZombiesCount = this.zombies.filter(z => !z.isDying).length;
  }

  // Hit test against zombies with raycast (for gun bullets)
  public checkGunHit(origin: THREE.Vector3, direction: THREE.Vector3, maxDist: number = 45): boolean {
    const ray = new THREE.Ray(origin, direction.normalize());

    let closestDist = maxDist;
    let hitZombie: Zombie | null = null;

    for (const z of this.zombies) {
      if (z.isDying) continue;
      // Cylinder / sphere bounding check around zombie center
      const center = z.position.clone().add(new THREE.Vector3(0, 1.0, 0));
      const sphere = new THREE.Sphere(center, 0.75);

      const hitPoint = ray.intersectSphere(sphere, new THREE.Vector3());
      if (hitPoint) {
        const d = origin.distanceTo(hitPoint);
        if (d < closestDist) {
          closestDist = d;
          hitZombie = z;
        }
      }
    }

    if (hitZombie) {
      // Gun deals 60 damage (one-shot kill for satisfying gunplay!)
      this.damageZombie(hitZombie, 60, direction.clone().multiplyScalar(5.5));
      return true;
    }
    return false;
  }

  // Hit test against zombies with melee swing (for sword)
  public checkMeleeHit(playerPos: THREE.Vector3, playerYaw: number, reach: number = 2.6): boolean {
    let hitAny = false;
    const forward = new THREE.Vector3(Math.sin(playerYaw), 0, Math.cos(playerYaw));

    for (const z of this.zombies) {
      if (z.isDying) continue;
      const toZombie = z.position.clone().sub(playerPos);
      toZombie.y = 0;
      const dist = toZombie.length();

      if (dist <= reach) {
        // Angle check (front 130-degree arc)
        toZombie.normalize();
        const dot = forward.dot(toZombie);
        if (dot > 0.1) {
          // Sword deals 35 damage with knockback (2 quick slashes defeat a zombie!)
          this.damageZombie(z, 35, forward.clone().multiplyScalar(4.0));
          hitAny = true;
        }
      }
    }

    return hitAny;
  }

  public damageZombie(z: Zombie, amount: number, knockback: THREE.Vector3) {
    if (z.isDying) return;

    z.health -= amount;
    sound.playZombieHurt();

    // Knockback
    z.velocity.add(knockback);

    // Red hit flash
    z.hitFlashTimer = 0.16;
    z.materials.forEach(m => m.color.setHex(0xff0000));

    // Sparks / Blood particles
    this.spawnHitParticles(z.position.clone().add(new THREE.Vector3(0, 1.1, 0)), 8, 0x55bb44);

    // Death check
    if (z.health <= 0) {
      z.isDying = true;
      z.deathTimer = 0.7;
      this.totalKilled++;

      // 1. Drop 3D physical floating golden brass bullets that auto-connect with gun!
      const bulletCount = 4 + Math.floor(Math.random() * 5);
      this.spawnBulletDrop(z.position.clone(), bulletCount);

      // 2. Chance of Food (Bread or Apples)
      if (Math.random() > 0.4) {
        this.inventory.addItem({
          id: 'harvest_bread',
          name: 'Hearth-Baked Bread',
          count: 1,
          maxStack: 64,
          type: 'food',
          rarity: 'common',
          icon: '🍞',
          lore: 'Recovered provision dropped by the fallen horde.',
          stats: { nutrition: 20 },
        });
      }

      // Check wave progression
      if (this.totalKilled % 5 === 0) {
        this.currentWave++;
      }
    }
  }

  public spawnBulletDrop(pos: THREE.Vector3, count: number) {
    const dropGroup = new THREE.Group();
    dropGroup.position.copy(pos);

    // Golden brass bullet cluster
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xffcc00,
      metalness: 0.9,
      roughness: 0.2,
      emissive: 0xaa7700,
      emissiveIntensity: 0.6,
    });
    const tipMat = new THREE.MeshStandardMaterial({
      color: 0xcc5522,
      metalness: 0.8,
      roughness: 0.3,
    });

    const casingGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.16, 8);
    const tipGeo = new THREE.ConeGeometry(0.04, 0.08, 8);

    for (let b = 0; b < 3; b++) {
      const bulletMesh = new THREE.Group();
      const casing = new THREE.Mesh(casingGeo, brassMat);
      const tip = new THREE.Mesh(tipGeo, tipMat);
      tip.position.y = 0.12;
      bulletMesh.add(casing);
      bulletMesh.add(tip);

      const angle = (b * Math.PI * 2) / 3;
      bulletMesh.position.set(Math.cos(angle) * 0.08, 0, Math.sin(angle) * 0.08);
      bulletMesh.rotation.z = (Math.random() - 0.5) * 0.3;
      dropGroup.add(bulletMesh);
    }

    // Glowing Aura Light
    const auraLight = new THREE.PointLight(0xffaa00, 1.5, 4, 2);
    auraLight.position.set(0, 0.1, 0);
    dropGroup.add(auraLight);

    this.scene.add(dropGroup);

    this.droppedBullets.push({
      id: 'drop_' + Math.random().toString(36).substr(2, 9),
      mesh: dropGroup,
      position: pos.clone().add(new THREE.Vector3(0, 0.4, 0)),
      velocity: new THREE.Vector3((Math.random() - 0.5) * 2, 2.5, (Math.random() - 0.5) * 2),
      ammoCount: count,
      bobPhase: Math.random() * Math.PI * 2,
      lifetime: 0,
      isMagnetizing: false,
    });
  }

  private spawnZombie(playerPos: THREE.Vector3) {
    // Spawn in a ring around the player (22 to 32 meters out)
    const angle = Math.random() * Math.PI * 2;
    const spawnDist = 22 + Math.random() * 10;
    const x = playerPos.x + Math.sin(angle) * spawnDist;
    const z = playerPos.z + Math.cos(angle) * spawnDist;

    // Pick weapon variant (shovel or bare hands)
    const weaponType: ZombieWeaponType = Math.random() > 0.5 ? 'shovel' : 'hands';

    const group = new THREE.Group();
    const clonedMaterials: THREE.MeshStandardMaterial[] = [];

    const matSkin = this.skinMat.clone();
    matSkin.userData = { originalColor: matSkin.color.getHex() };
    clonedMaterials.push(matSkin);

    const matShirt = this.shirtMat.clone();
    matShirt.userData = { originalColor: matShirt.color.getHex() };
    clonedMaterials.push(matShirt);

    const matPants = this.pantsMat.clone();
    matPants.userData = { originalColor: matPants.color.getHex() };
    clonedMaterials.push(matPants);

    // Torso
    const torso = new THREE.Mesh(this.bodyGeo, matShirt);
    torso.position.y = 1.05;
    torso.castShadow = true;
    group.add(torso);

    // Head
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.72, 0);

    const headMesh = new THREE.Mesh(this.headGeo, matSkin);
    headMesh.castShadow = true;
    headGroup.add(headMesh);

    // Glowing Red Eyes
    const eyeL = new THREE.Mesh(this.eyeGeo, this.eyeMat);
    eyeL.position.set(-0.13, 0.05, 0.25);
    headGroup.add(eyeL);

    const eyeR = new THREE.Mesh(this.eyeGeo, this.eyeMat);
    eyeR.position.set(0.13, 0.05, 0.25);
    headGroup.add(eyeR);

    group.add(headGroup);

    // Left Leg
    const leftLeg = new THREE.Mesh(this.limbGeo, matPants);
    leftLeg.position.set(-0.18, 0.4, 0);
    leftLeg.castShadow = true;
    group.add(leftLeg);

    // Right Leg
    const rightLeg = new THREE.Mesh(this.limbGeo, matPants);
    rightLeg.position.set(0.18, 0.4, 0);
    rightLeg.castShadow = true;
    group.add(rightLeg);

    // Left Arm
    const leftArm = new THREE.Group();
    leftArm.position.set(-0.42, 1.35, 0);
    const leftArmMesh = new THREE.Mesh(this.limbGeo, matSkin);
    leftArmMesh.position.set(0, -0.3, 0);
    leftArmMesh.castShadow = true;
    leftArm.add(leftArmMesh);
    group.add(leftArm);

    // Right Arm
    const rightArm = new THREE.Group();
    rightArm.position.set(0.42, 1.35, 0);
    const rightArmMesh = new THREE.Mesh(this.limbGeo, matSkin);
    rightArmMesh.position.set(0, -0.3, 0);
    rightArmMesh.castShadow = true;
    rightArm.add(rightArmMesh);

    let shovelGroup: THREE.Group | undefined;

    if (weaponType === 'shovel') {
      // 3D Shovel attached to right hand
      shovelGroup = new THREE.Group();
      shovelGroup.position.set(0, -0.65, 0.2);
      shovelGroup.rotation.x = Math.PI / 2.5;

      const pole = new THREE.Mesh(this.shovelPoleGeo, this.woodMat);
      pole.castShadow = true;
      shovelGroup.add(pole);

      const blade = new THREE.Mesh(this.shovelBladeGeo, this.ironMat);
      blade.position.y = 0.65;
      blade.castShadow = true;
      shovelGroup.add(blade);

      rightArm.add(shovelGroup);
    }

    group.add(rightArm);

    const pos = new THREE.Vector3(x, 0, z);
    group.position.copy(pos);
    this.scene.add(group);

    const zombie: Zombie = {
      id: 'zombie_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      group,
      weaponType,
      position: pos,
      velocity: new THREE.Vector3(),
      yaw: 0,
      health: 45, // Easy fight!
      maxHealth: 45,
      walkTimer: Math.random() * 10,
      attackCooldown: 1.0,
      hitFlashTimer: 0,
      isDying: false,
      deathTimer: 0,
      leftLeg,
      rightLeg,
      leftArm,
      rightArm,
      head: headGroup,
      shovelMesh: shovelGroup,
      materials: clonedMaterials,
    };

    this.zombies.push(zombie);
  }

  private spawnHitParticles(pos: THREE.Vector3, count = 8, color = 0x55bb44) {
    const mat = new THREE.MeshBasicMaterial({ color });
    for (let i = 0; i < count; i++) {
      const p = new THREE.Mesh(this.particleGeo, mat);
      p.position.copy(pos);
      this.scene.add(p);
      this.particles.push({
        mesh: p,
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 4,
          Math.random() * 3 + 1,
          (Math.random() - 0.5) * 4
        ),
        lifetime: 0,
        maxLife: 0.35 + Math.random() * 0.2,
      });
    }
  }

  public dispose() {
    for (const z of this.zombies) {
      this.scene.remove(z.group);
    }
    for (const p of this.particles) {
      this.scene.remove(p.mesh);
    }
    for (const b of this.droppedBullets) {
      this.scene.remove(b.mesh);
    }
    this.zombies = [];
    this.particles = [];
    this.droppedBullets = [];
  }
}
