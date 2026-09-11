import * as THREE from 'three';
import { sound } from './audio';
import { PhysicsWorld } from './physics';
import { WeatherSystem } from './weather';

export interface HeartVitals {
  bpm: number;
  systolic: number;
  diastolic: number;
  cardiacOutput: number; // L/min
  oxygenSaturation: number; // SpO2 %
  ecgPhase: number; // 0 to 1 cycle
}

export interface LungVitals {
  respiratoryRate: number; // breaths per min
  tidalVolume: number; // mL
  stamina: number; // 0-100%
  breathPhase: number; // 0 to 2PI
}

export interface DigestiveVitals {
  stomachFullness: number; // 0-100%
  metabolicRate: number; // kcal/day
  hydration: number; // 0-100%
  lastMeal: string;
  craving: string;
}

export interface NeuralAI {
  state: 'working' | 'wandering' | 'socializing' | 'eating' | 'sleeping' | 'talking';
  currentThought: string;
  mood: 'Content' | 'Joyful' | 'Focused' | 'Weary' | 'Contemplative' | 'Vigilant';
  stress: number; // 0-100%
  melatonin: number; // 0-100%
  dialogue: string[];
}

export interface VillagerData {
  id: string;
  name: string;
  role: string;
  age: number;
  health: number;
  maxHealth: number;
  isDead?: boolean;
  isDying?: boolean;
  deathTimer?: number;
  hitFlashTimer?: number;
  appearance: {
    skinColor: number;
    hairColor: number;
    tunicColor: number;
    accentColor: number;
    height: number;
    hasHat?: boolean;
    hasApron?: boolean;
    hasCloak?: boolean;
  };
  heart: HeartVitals;
  lungs: LungVitals;
  digestive: DigestiveVitals;
  neural: NeuralAI;
  position: THREE.Vector3;
  targetPosition: THREE.Vector3;
  rotationY: number;
  waypoints: THREE.Vector3[];
  currentWaypointIdx: number;
  pauseTimer: number;
  stuckTimer?: number;
  lastMovePos?: THREE.Vector3;
}

export class VillagerSystem {
  public scene: THREE.Scene;
  public physics: PhysicsWorld;
  public weather: WeatherSystem;
  public villagers: VillagerData[] = [];
  public villagerMeshes: Map<string, THREE.Group> = new Map();
  public villagerChestMeshes: Map<string, THREE.Mesh> = new Map();
  public villagerHeadMeshes: Map<string, THREE.Group> = new Map();
  public villagerArmLeftMeshes: Map<string, THREE.Group> = new Map();
  public villagerArmRightMeshes: Map<string, THREE.Group> = new Map();
  public villagerLegLeftMeshes: Map<string, THREE.Group> = new Map();
  public villagerLegRightMeshes: Map<string, THREE.Group> = new Map();
  public villagerMaterials: Map<string, { mat: THREE.MeshStandardMaterial; origColor: number }[]> = new Map();

  // Raycaster for hit detection
  private raycaster = new THREE.Raycaster();

  // Active inspected villager for the organic vitals monitor
  public activeInspectedVillager: VillagerData | null = null;

  constructor(scene: THREE.Scene, physics: PhysicsWorld, weather: WeatherSystem) {
    this.scene = scene;
    this.physics = physics;
    this.weather = weather;

    this.initVillagers();
    this.spawnVillagers3D();
  }

  private initVillagers() {
    this.villagers = [
      {
        id: 'eldrin',
        name: 'Master Eldrin',
        role: 'Master Blacksmith',
        age: 44,
        health: 100,
        maxHealth: 100,
        appearance: {
          skinColor: 0xd99b77,
          hairColor: 0x3b2f2f,
          tunicColor: 0x5c4033,
          accentColor: 0x8b0000,
          height: 1.82,
          hasApron: true,
        },
        heart: {
          bpm: 82,
          systolic: 122,
          diastolic: 78,
          cardiacOutput: 5.6,
          oxygenSaturation: 98,
          ecgPhase: 0,
        },
        lungs: {
          respiratoryRate: 18,
          tidalVolume: 580,
          stamina: 88,
          breathPhase: 0,
        },
        digestive: {
          stomachFullness: 72,
          metabolicRate: 2450,
          hydration: 82,
          lastMeal: 'Roast venison and hearty rye',
          craving: 'Cold draught of tavern ale',
        },
        neural: {
          state: 'working',
          currentThought: 'The anvil heat is true today; this steel will temper into a masterwork blade.',
          mood: 'Focused',
          stress: 18,
          melatonin: 12,
          dialogue: [
            'Greetings, traveler! Mind the flying sparks from the forge hearth.',
            'A good blade needs fold upon fold of high-carbon iron.',
            'Listen to the ring of the anvil—that is the heartbeat of Elderstone.',
            'When evening falls, Maeve has a flagon waiting for me at the tavern.',
          ],
        },
        position: new THREE.Vector3(-10, 0, 12),
        targetPosition: new THREE.Vector3(-10, 0, 12),
        rotationY: Math.PI / 2,
        waypoints: [
          new THREE.Vector3(-10, 0, 12),
          new THREE.Vector3(-10, 0, 15),
          new THREE.Vector3(-6, 0, 10),
          new THREE.Vector3(2, 0, 4),
          new THREE.Vector3(12, 0, -10), // tavern visit
        ],
        currentWaypointIdx: 0,
        pauseTimer: 5,
      },
      {
        id: 'rowan',
        name: 'Rowan Greenbrier',
        role: 'Village Baker & Miller',
        age: 36,
        health: 100,
        maxHealth: 100,
        appearance: {
          skinColor: 0xe6ab85,
          hairColor: 0x8b5a2b,
          tunicColor: 0xf5f5dc,
          accentColor: 0xcd853f,
          height: 1.74,
          hasHat: true,
          hasApron: true,
        },
        heart: {
          bpm: 72,
          systolic: 116,
          diastolic: 74,
          cardiacOutput: 5.1,
          oxygenSaturation: 99,
          ecgPhase: 0,
        },
        lungs: {
          respiratoryRate: 15,
          tidalVolume: 510,
          stamina: 94,
          breathPhase: 0,
        },
        digestive: {
          stomachFullness: 85,
          metabolicRate: 2100,
          hydration: 90,
          lastMeal: 'Warm crusty sourdough with churned butter',
          craving: 'Fresh orchard honey',
        },
        neural: {
          state: 'wandering',
          currentThought: 'The millstones ground seventy sacks of wheat today. Bread for every hearth tonight.',
          mood: 'Joyful',
          stress: 10,
          melatonin: 15,
          dialogue: [
            'Smell that fresh hearth bread? Freshly pulled from the brick oven!',
            'The harvest this season is blessed by steady river rains.',
            'Here, take a warm loaf if your belly is rumbling!',
            'Rowan never lets a stranger go hungry in our valley.',
          ],
        },
        position: new THREE.Vector3(-2, 0, -3),
        targetPosition: new THREE.Vector3(-2, 0, -3),
        rotationY: 0,
        waypoints: [
          new THREE.Vector3(-2, 0, -3),
          new THREE.Vector3(0, 0, 2),
          new THREE.Vector3(20, 0, 18), // windmill
          new THREE.Vector3(6, 0, 8),
          new THREE.Vector3(-2, 0, -3),
        ],
        currentWaypointIdx: 0,
        pauseTimer: 4,
      },
      {
        id: 'maeve',
        name: 'Maeve Honeywood',
        role: 'Tavern Mistress',
        age: 32,
        health: 100,
        maxHealth: 100,
        appearance: {
          skinColor: 0xebb494,
          hairColor: 0xb22222,
          tunicColor: 0x2e8b57,
          accentColor: 0xffd700,
          height: 1.70,
          hasApron: true,
        },
        heart: {
          bpm: 76,
          systolic: 118,
          diastolic: 76,
          cardiacOutput: 5.2,
          oxygenSaturation: 98,
          ecgPhase: 0,
        },
        lungs: {
          respiratoryRate: 16,
          tidalVolume: 490,
          stamina: 92,
          breathPhase: 0,
        },
        digestive: {
          stomachFullness: 68,
          metabolicRate: 1950,
          hydration: 88,
          lastMeal: 'Spiced apple tart & elderberry tea',
          craving: 'Smoked sausage stew',
        },
        neural: {
          state: 'working',
          currentThought: 'Tavern fireplace needs another log; Eldrin and Garrick will be stopping in soon.',
          mood: 'Content',
          stress: 14,
          melatonin: 20,
          dialogue: [
            'Welcome into the Dancing Boar Tavern! Pull up a bench by the hearth.',
            'We brew the finest spiced apple cider in the whole northern province.',
            'Rest your weary boots; a warm fire cures all troubles.',
            'Did you hear the church bells chime across the valley?',
          ],
        },
        position: new THREE.Vector3(12, 0, -12),
        targetPosition: new THREE.Vector3(12, 0, -12),
        rotationY: Math.PI / 4,
        waypoints: [
          new THREE.Vector3(12, 0, -12),
          new THREE.Vector3(10, 0, -8),
          new THREE.Vector3(6, 0, -6),
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(12, 0, -12),
        ],
        currentWaypointIdx: 0,
        pauseTimer: 6,
      },
      {
        id: 'thomas',
        name: 'Brother Thomas',
        role: 'Cistercian Monk',
        age: 58,
        health: 100,
        maxHealth: 100,
        appearance: {
          skinColor: 0xd59b79,
          hairColor: 0xdcdcdc,
          tunicColor: 0x4a3b32,
          accentColor: 0x8b4513,
          height: 1.76,
          hasCloak: true,
        },
        heart: {
          bpm: 62,
          systolic: 112,
          diastolic: 72,
          cardiacOutput: 4.8,
          oxygenSaturation: 99,
          ecgPhase: 0,
        },
        lungs: {
          respiratoryRate: 12,
          tidalVolume: 530,
          stamina: 85,
          breathPhase: 0,
        },
        digestive: {
          stomachFullness: 55,
          metabolicRate: 1850,
          hydration: 80,
          lastMeal: 'Lenten herb pottage and spring water',
          craving: 'Fresh chamomile tea',
        },
        neural: {
          state: 'wandering',
          currentThought: 'Peace dwells in this quiet valley. The church bell rings for all who seek sanctuary.',
          mood: 'Contemplative',
          stress: 5,
          melatonin: 10,
          dialogue: [
            'Peace be with you, wanderer. You are safe beneath our church spire.',
            'I tend the old manuscript archives and the bell tower above.',
            'Ring the bronze bell whenever your spirit needs uplifting.',
            'Listen to the whispering wind through the ancient oaks.',
          ],
        },
        position: new THREE.Vector3(-14, 0, -18),
        targetPosition: new THREE.Vector3(-14, 0, -18),
        rotationY: 0,
        waypoints: [
          new THREE.Vector3(-14, 0, -18),
          new THREE.Vector3(-10, 0, -14),
          new THREE.Vector3(-6, 0, -4),
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(-14, 0, -18),
        ],
        currentWaypointIdx: 0,
        pauseTimer: 8,
      },
      {
        id: 'lyra',
        name: 'Lyra Foxglove',
        role: 'Forest Herbalist',
        age: 27,
        health: 100,
        maxHealth: 100,
        appearance: {
          skinColor: 0xf2c4a7,
          hairColor: 0x4a2e1b,
          tunicColor: 0x228b22,
          accentColor: 0x9370db,
          height: 1.68,
          hasCloak: true,
        },
        heart: {
          bpm: 68,
          systolic: 114,
          diastolic: 72,
          cardiacOutput: 4.9,
          oxygenSaturation: 99,
          ecgPhase: 0,
        },
        lungs: {
          respiratoryRate: 14,
          tidalVolume: 460,
          stamina: 96,
          breathPhase: 0,
        },
        digestive: {
          stomachFullness: 75,
          metabolicRate: 1900,
          hydration: 95,
          lastMeal: 'Forest blackberries, walnuts and goat cheese',
          craving: 'Crisp river mint leaves',
        },
        neural: {
          state: 'wandering',
          currentThought: 'Found a rare patch of mountain arnica along the river bank. Excellent for healing salves.',
          mood: 'Content',
          stress: 8,
          melatonin: 10,
          dialogue: [
            'Greetings! The flora by the river bridge is flourishing after the morning dew.',
            'Lavender calms a racing heart, while willow bark eases joint pain.',
            'Watch your step near the wildflowers; they feed our valley bees.',
            'The pulse of nature is as real as our own human heartbeat.',
          ],
        },
        position: new THREE.Vector3(-8, 0.8, 6),
        targetPosition: new THREE.Vector3(-8, 0.8, 6),
        rotationY: -Math.PI / 2,
        waypoints: [
          new THREE.Vector3(-8, 0.8, 6), // on wooden bridge deck
          new THREE.Vector3(-14, 0.8, 6), // on wooden bridge deck
          new THREE.Vector3(-10, 0, 11),
          new THREE.Vector3(0, 0, 4),
          new THREE.Vector3(-8, 0.8, 6),
        ],
        currentWaypointIdx: 0,
        pauseTimer: 5,
      },
      {
        id: 'garrick',
        name: 'Garrick Stonegaze',
        role: 'Town Watchman & Guard',
        age: 39,
        health: 100,
        maxHealth: 100,
        appearance: {
          skinColor: 0xd29775,
          hairColor: 0x2f3542,
          tunicColor: 0x4b6584,
          accentColor: 0x778ca3,
          height: 1.85,
          hasHat: true,
        },
        heart: {
          bpm: 78,
          systolic: 120,
          diastolic: 76,
          cardiacOutput: 5.4,
          oxygenSaturation: 98,
          ecgPhase: 0,
        },
        lungs: {
          respiratoryRate: 17,
          tidalVolume: 600,
          stamina: 95,
          breathPhase: 0,
        },
        digestive: {
          stomachFullness: 65,
          metabolicRate: 2300,
          hydration: 85,
          lastMeal: 'Hardtack and smoked beef strip',
          craving: 'Warm mutton pasty',
        },
        neural: {
          state: 'wandering',
          currentThought: 'Northern and Southern gates secure. No bandit tracks on the valley trail.',
          mood: 'Vigilant',
          stress: 22,
          melatonin: 8,
          dialogue: [
            'Halt! State your business in Elderstone... Ah, an honest traveler. Carry on.',
            'Keep your weapons sheathed within the village square.',
            'The perimeter watchtower gives a view five leagues in all directions.',
            'Stay vigilant after dusk; shadows can play tricks on the eyes.',
          ],
        },
        position: new THREE.Vector3(0, 0, 16),
        targetPosition: new THREE.Vector3(0, 0, 16),
        rotationY: Math.PI,
        waypoints: [
          new THREE.Vector3(0, 0, 16),
          new THREE.Vector3(0, 0, 30), // north gate
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(0, 0, -25), // south gate
          new THREE.Vector3(0, 0, 16),
        ],
        currentWaypointIdx: 0,
        pauseTimer: 7,
      },
    ];

    // Initialize full vitals and health
    this.villagers.forEach(v => {
      v.health = 50;
      v.maxHealth = 50;
      v.isDead = false;
      v.isDying = false;
      v.deathTimer = 0;
      v.hitFlashTimer = 0;
    });
  }

  // Build Real Human Figure 3D Anatomy with realistic proportions
  private spawnVillagers3D() {
    this.villagers.forEach(v => {
      const root = new THREE.Group();
      root.position.copy(v.position);
      root.rotation.y = v.rotationY;
      root.name = `villager_${v.id}`;

      const skinMat = new THREE.MeshStandardMaterial({
        color: v.appearance.skinColor,
        roughness: 0.7,
      });

      const tunicMat = new THREE.MeshStandardMaterial({
        color: v.appearance.tunicColor,
        roughness: 0.85,
      });

      const beltMat = new THREE.MeshStandardMaterial({
        color: 0x221811,
        roughness: 0.9,
      });

      const bootMat = new THREE.MeshStandardMaterial({
        color: 0x1f140e,
        roughness: 0.85,
      });

      const hairMat = new THREE.MeshStandardMaterial({
        color: v.appearance.hairColor,
        roughness: 0.8,
      });

      // 1. Pelvis / Hips
      const pelvisGeo = new THREE.BoxGeometry(0.38, 0.22, 0.26);
      const pelvis = new THREE.Mesh(pelvisGeo, tunicMat);
      pelvis.position.y = 0.88;
      pelvis.castShadow = true;
      root.add(pelvis);

      // Belt with buckle
      const beltGeo = new THREE.BoxGeometry(0.40, 0.08, 0.28);
      const belt = new THREE.Mesh(beltGeo, beltMat);
      belt.position.y = 0.96;
      root.add(belt);

      const buckleGeo = new THREE.BoxGeometry(0.08, 0.09, 0.04);
      const buckleMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.8, roughness: 0.3 });
      const buckle = new THREE.Mesh(buckleGeo, buckleMat);
      buckle.position.set(0, 0.96, 0.15);
      root.add(buckle);

      // 2. Chest & Torso (With dynamic respiration breathing expansion!)
      const chestGeo = new THREE.BoxGeometry(0.44, 0.48, 0.28);
      const chest = new THREE.Mesh(chestGeo, tunicMat);
      chest.position.y = 1.28;
      chest.castShadow = true;
      root.add(chest);
      this.villagerChestMeshes.set(v.id, chest);

      // Apron (if applicable)
      if (v.appearance.hasApron) {
        const apronGeo = new THREE.BoxGeometry(0.36, 0.55, 0.02);
        const apronMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.9 });
        const apron = new THREE.Mesh(apronGeo, apronMat);
        apron.position.set(0, 1.05, 0.15);
        root.add(apron);
      }

      // Cloak (if applicable)
      if (v.appearance.hasCloak) {
        const cloakGeo = new THREE.BoxGeometry(0.48, 0.85, 0.04);
        const cloakMat = new THREE.MeshStandardMaterial({ color: v.appearance.accentColor, roughness: 0.9 });
        const cloak = new THREE.Mesh(cloakGeo, cloakMat);
        cloak.position.set(0, 1.15, -0.16);
        root.add(cloak);
      }

      // 3. Head & Neck
      const headGroup = new THREE.Group();
      headGroup.position.set(0, 1.62, 0);

      // Neck
      const neckGeo = new THREE.CylinderGeometry(0.08, 0.09, 0.14, 8);
      const neck = new THREE.Mesh(neckGeo, skinMat);
      neck.position.y = -0.06;
      headGroup.add(neck);

      // Cranium / Face
      const headGeo = new THREE.BoxGeometry(0.26, 0.30, 0.26);
      const head = new THREE.Mesh(headGeo, skinMat);
      head.position.y = 0.12;
      head.castShadow = true;
      headGroup.add(head);

      // Nose
      const noseGeo = new THREE.BoxGeometry(0.04, 0.07, 0.06);
      const nose = new THREE.Mesh(noseGeo, skinMat);
      nose.position.set(0, 0.11, 0.15);
      headGroup.add(nose);

      // Eyes
      const eyeGeo = new THREE.BoxGeometry(0.04, 0.03, 0.02);
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0x1f2937 });
      const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
      eyeL.position.set(-0.07, 0.15, 0.14);
      headGroup.add(eyeL);

      const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
      eyeR.position.set(0.07, 0.15, 0.14);
      headGroup.add(eyeR);

      // Hair
      const hairGeo = new THREE.BoxGeometry(0.28, 0.12, 0.28);
      const hair = new THREE.Mesh(hairGeo, hairMat);
      hair.position.set(0, 0.24, 0);
      headGroup.add(hair);

      // Hat / Helmet (if applicable)
      if (v.appearance.hasHat) {
        const hatGeo = new THREE.CylinderGeometry(0.18, 0.22, 0.15, 8);
        const hatMat = new THREE.MeshStandardMaterial({ color: v.appearance.accentColor, roughness: 0.7 });
        const hat = new THREE.Mesh(hatGeo, hatMat);
        hat.position.set(0, 0.32, 0);
        headGroup.add(hat);
      }

      root.add(headGroup);
      this.villagerHeadMeshes.set(v.id, headGroup);

      // 4. Left Arm (Shoulder pivot, Upper arm, Forearm, Hand)
      const armL = new THREE.Group();
      armL.position.set(-0.28, 1.48, 0);

      const upperArmGeo = new THREE.BoxGeometry(0.12, 0.32, 0.12);
      const upperArmL = new THREE.Mesh(upperArmGeo, tunicMat);
      upperArmL.position.y = -0.16;
      upperArmL.castShadow = true;
      armL.add(upperArmL);

      const forearmGeo = new THREE.BoxGeometry(0.11, 0.28, 0.11);
      const forearmL = new THREE.Mesh(forearmGeo, skinMat);
      forearmL.position.y = -0.42;
      armL.add(forearmL);

      root.add(armL);
      this.villagerArmLeftMeshes.set(v.id, armL);

      // 5. Right Arm
      const armR = new THREE.Group();
      armR.position.set(0.28, 1.48, 0);

      const upperArmR = new THREE.Mesh(upperArmGeo, tunicMat);
      upperArmR.position.y = -0.16;
      upperArmR.castShadow = true;
      armR.add(upperArmR);

      const forearmR = new THREE.Mesh(forearmGeo, skinMat);
      forearmR.position.y = -0.42;
      armR.add(forearmR);

      // Prop in hand based on role
      if (v.id === 'eldrin') {
        const hammerGeo = new THREE.BoxGeometry(0.12, 0.20, 0.35);
        const hammerMat = new THREE.MeshStandardMaterial({ color: 0x4a4a4a, metalness: 0.8, roughness: 0.3 });
        const hammer = new THREE.Mesh(hammerGeo, hammerMat);
        hammer.position.set(0, -0.58, 0.1);
        armR.add(hammer);
      }

      root.add(armR);
      this.villagerArmRightMeshes.set(v.id, armR);

      // 6. Left Leg (Hip pivot, Thigh, Shin, Leather Boot)
      const legL = new THREE.Group();
      legL.position.set(-0.12, 0.82, 0);

      const thighGeo = new THREE.BoxGeometry(0.15, 0.42, 0.16);
      const thighL = new THREE.Mesh(thighGeo, tunicMat);
      thighL.position.y = -0.21;
      thighL.castShadow = true;
      legL.add(thighL);

      const bootGeo = new THREE.BoxGeometry(0.16, 0.42, 0.24);
      const bootL = new THREE.Mesh(bootGeo, bootMat);
      bootL.position.set(0, -0.62, 0.04);
      bootL.castShadow = true;
      legL.add(bootL);

      root.add(legL);
      this.villagerLegLeftMeshes.set(v.id, legL);

      // 7. Right Leg
      const legR = new THREE.Group();
      legR.position.set(0.12, 0.82, 0);

      const thighR = new THREE.Mesh(thighGeo, tunicMat);
      thighR.position.y = -0.21;
      thighR.castShadow = true;
      legR.add(thighR);

      const bootR = new THREE.Mesh(bootGeo, bootMat);
      bootR.position.set(0, -0.62, 0.04);
      bootR.castShadow = true;
      legR.add(bootR);

      root.add(legR);
      this.villagerLegRightMeshes.set(v.id, legR);

      this.scene.add(root);
      this.villagerMeshes.set(v.id, root);

      // Collect all mesh standard materials for hit flash
      const matList: { mat: THREE.MeshStandardMaterial; origColor: number }[] = [];
      root.traverse(child => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
          matList.push({ mat: child.material, origColor: child.material.color.getHex() });
        }
      });
      this.villagerMaterials.set(v.id, matList);
    });
  }

  public getTerrainHeight(x: number, z: number): number {
    // Bridge Deck is centered at x: -10, z: 6, width in Z: 4.5 (from 3.75 to 8.25), length in X: 16 (from -18 to -2)
    // Top surface of the bridge deck is at y = 0.80
    if (z >= 3.65 && z <= 8.35) {
      if (x >= -17.8 && x <= -2.2) {
        return 0.80; // Full bridge deck top
      } else if (x > -2.2 && x <= -0.5) {
        // Smooth eastern approach ramp
        const t = (x - (-0.5)) / (-2.2 - (-0.5));
        return Math.max(0, Math.min(0.80, t * 0.80));
      } else if (x < -17.8 && x >= -19.5) {
        // Smooth western approach ramp
        const t = (x - (-19.5)) / (-17.8 - (-19.5));
        return Math.max(0, Math.min(0.80, t * 0.80));
      }
    }
    return 0.0;
  }

  public update(delta: number, playerPos: THREE.Vector3, isZeroGravity: boolean = false) {
    const isNight = this.weather.isNightTime();

    this.villagers.forEach(v => {
      const root = this.villagerMeshes.get(v.id);
      if (!root) return;

      const baseY = this.getTerrainHeight(root.position.x, root.position.z);

      // 0. Check if deceased
      if (v.isDead) {
        // Smooth ragdoll fall to ground/deck
        root.rotation.x = THREE.MathUtils.lerp(root.rotation.x, -Math.PI / 2, delta * 8);
        root.position.y = THREE.MathUtils.lerp(root.position.y, baseY + 0.12, delta * 8);
        return;
      }

      // Hit flash decay
      if (v.hitFlashTimer && v.hitFlashTimer > 0) {
        v.hitFlashTimer -= delta;
        if (v.hitFlashTimer <= 0) {
          const mats = this.villagerMaterials.get(v.id);
          if (mats) {
            mats.forEach(m => m.mat.color.setHex(m.origColor));
          }
        }
      }

      // 1. Biological & Organ Functions Simulation
      this.updateOrganBiology(v, delta, isNight, isZeroGravity);

      // 2. Respiration Breathing Animation on Chest Mesh
      const chestMesh = this.villagerChestMeshes.get(v.id);
      if (chestMesh) {
        const expansion = Math.sin(v.lungs.breathPhase) * 0.04;
        chestMesh.scale.set(1 + expansion, 1 + expansion * 0.5, 1 + expansion * 1.2);
      }

      // 3. AI Behavior & Pathfinding
      const legL = this.villagerLegLeftMeshes.get(v.id);
      const legR = this.villagerLegRightMeshes.get(v.id);
      const armL = this.villagerArmLeftMeshes.get(v.id);
      const armR = this.villagerArmRightMeshes.get(v.id);
      const head = this.villagerHeadMeshes.get(v.id);

      // Zero-Gravity floating physics reaction
      if (isZeroGravity) {
        root.position.y += Math.sin(Date.now() * 0.002 + v.age) * delta * 1.5;
        root.rotation.x += delta * 0.2;
        root.rotation.z += delta * 0.15;
        v.neural.stress = Math.min(100, v.neural.stress + delta * 8);
        v.neural.currentThought = 'Great heavens! Gravity has vanished! What sorcery is this?!';
        return;
      }

      // Distance to player
      const distToPlayer = root.position.distanceTo(playerPos);

      // Head turning to look at player when close
      if (distToPlayer < 7.0 && head) {
        const dx = playerPos.x - root.position.x;
        const dz = playerPos.z - root.position.z;
        const targetYaw = Math.atan2(dx, dz) - root.rotation.y;
        head.rotation.y = THREE.MathUtils.lerp(head.rotation.y, targetYaw, delta * 4);
      } else if (head) {
        head.rotation.y = THREE.MathUtils.lerp(head.rotation.y, 0, delta * 3);
      }

      // If waiting or talking to player
      if (v.pauseTimer > 0) {
        v.pauseTimer -= delta;
        root.position.y = THREE.MathUtils.lerp(root.position.y, baseY, delta * 8);

        // Idling limbs
        if (legL && legR && armL && armR) {
          legL.rotation.x = THREE.MathUtils.lerp(legL.rotation.x, 0, delta * 5);
          legR.rotation.x = THREE.MathUtils.lerp(legR.rotation.x, 0, delta * 5);
          armL.rotation.x = THREE.MathUtils.lerp(armL.rotation.x, 0, delta * 5);
          armR.rotation.x = THREE.MathUtils.lerp(armR.rotation.x, 0, delta * 5);
        }

        v.position.copy(root.position);
        v.rotationY = root.rotation.y;
        return;
      }

      // Move along waypoints with Anti-Stuck Protection
      const target = v.waypoints[v.currentWaypointIdx];
      const moveDir = new THREE.Vector3(target.x - root.position.x, 0, target.z - root.position.z);
      const dist = moveDir.length();

      // Anti-stuck watchdog
      if (!v.lastMovePos) v.lastMovePos = root.position.clone();
      if (!v.stuckTimer) v.stuckTimer = 0;

      const distFromLast = root.position.distanceTo(v.lastMovePos);
      if (distFromLast < 0.12) {
        v.stuckTimer += delta;
      } else {
        v.stuckTimer = Math.max(0, v.stuckTimer - delta * 1.5);
        v.lastMovePos.copy(root.position);
      }

      // If stuck for > 4 seconds, skip to next waypoint and continue walking smoothly
      if (v.stuckTimer > 4.0) {
        v.currentWaypointIdx = (v.currentWaypointIdx + 1) % v.waypoints.length;
        v.stuckTimer = 0;
        v.pauseTimer = 0.4;
        v.lastMovePos.copy(root.position);
        return;
      }

      if (dist < 0.85) {
        // Arrived at waypoint, pause for several seconds
        v.currentWaypointIdx = (v.currentWaypointIdx + 1) % v.waypoints.length;
        v.pauseTimer = 3 + Math.random() * 4;
        v.stuckTimer = 0;
        root.position.y = THREE.MathUtils.lerp(root.position.y, baseY, delta * 8);
      } else {
        moveDir.normalize();
        const walkSpeed = 1.4; // Realistic casual human walk ~ 1.4 m/s (5 km/h)
        root.position.x += moveDir.x * walkSpeed * delta;
        root.position.z += moveDir.z * walkSpeed * delta;

        // Dynamic surface elevation (smoothly walking on top of bridge / terrain)
        const currentElev = this.getTerrainHeight(root.position.x, root.position.z);

        // Face movement direction smoothly
        const targetAngle = Math.atan2(moveDir.x, moveDir.z);
        root.rotation.y = THREE.MathUtils.lerp(root.rotation.y, targetAngle, delta * 5);

        // Natural human walking gait cycle
        const walkCycleTime = Date.now() * 0.005;
        const swing = Math.sin(walkCycleTime * 4.5) * 0.55;

        if (legL && legR && armL && armR) {
          legL.rotation.x = swing;
          legR.rotation.x = -swing;
          armL.rotation.x = -swing * 0.8;
          armR.rotation.x = swing * 0.8;
        }

        // Slight hip bobbing positioned cleanly on ground or bridge deck
        root.position.y = currentElev + Math.abs(Math.sin(walkCycleTime * 9)) * 0.04;
      }

      v.position.copy(root.position);
      v.rotationY = root.rotation.y;
    });
  }

  // Real Biological Simulation: Heart, Blood Pressure, Lungs, Metabolism, Circadian
  private updateOrganBiology(v: VillagerData, delta: number, isNight: boolean, isZeroGravity: boolean) {
    // 1. Cardiovascular / Heart Rate
    let targetBpm = 70;
    if (isNight) targetBpm = 58; // sleeping bradycardia
    if (v.pauseTimer <= 0) targetBpm = 95; // walking exertion
    if (isZeroGravity) targetBpm = 125; // panic tachycardia

    v.heart.bpm = THREE.MathUtils.lerp(v.heart.bpm, targetBpm, delta * 0.3);

    // ECG Phase (0 to 1 cycle)
    const beatsPerSec = v.heart.bpm / 60;
    v.heart.ecgPhase = (v.heart.ecgPhase + beatsPerSec * delta) % 1;

    // Blood Pressure & Cardiac Output
    v.heart.systolic = Math.round(100 + v.heart.bpm * 0.28);
    v.heart.diastolic = Math.round(65 + v.heart.bpm * 0.12);
    v.heart.cardiacOutput = parseFloat(((v.heart.bpm * 70) / 1000).toFixed(1));

    // 2. Respiration / Lungs
    const breathsPerSec = (v.heart.bpm / 4.5) / 60;
    v.lungs.breathPhase = (v.lungs.breathPhase + breathsPerSec * delta * Math.PI * 2) % (Math.PI * 2);
    v.lungs.respiratoryRate = Math.round(v.heart.bpm / 4.4);

    // 3. Digestive & Caloric Burn
    // Stomach digests gradually (1% per 20 seconds)
    v.digestive.stomachFullness = Math.max(10, v.digestive.stomachFullness - delta * 0.05);
    v.digestive.hydration = Math.max(15, v.digestive.hydration - delta * 0.03);

    // 4. Circadian & Neural AI State
    if (isNight) {
      v.neural.melatonin = Math.min(100, v.neural.melatonin + delta * 4);
      v.neural.mood = 'Weary';
    } else {
      v.neural.melatonin = Math.max(5, v.neural.melatonin - delta * 2);
    }
  }

  // Feed a villager to nourish their organs and raise happiness
  public feedVillager(villagerId: string, foodName: string, nutrition: number): string {
    const v = this.villagers.find(item => item.id === villagerId);
    if (!v) return 'Villager not found';

    v.digestive.stomachFullness = Math.min(100, v.digestive.stomachFullness + nutrition);
    v.digestive.lastMeal = `${foodName} (Gift from player)`;
    v.neural.mood = 'Joyful';
    v.neural.stress = Math.max(0, v.neural.stress - 15);
    v.heart.bpm = THREE.MathUtils.lerp(v.heart.bpm, 72, 0.5);

    sound.playVillagerGreet();
    return `Thank you kindly, traveler! That ${foodName} hit the spot. My energy is restored!`;
  }

  // Calculate real-time ECG millivolt output for live monitor canvas
  public getEcgVoltage(phase: number): number {
    // Phase 0.0 - 0.15: Baseline
    if (phase < 0.15) return 0;
    // Phase 0.15 - 0.25: P-Wave (Atrial Depolarization)
    if (phase < 0.25) {
      const p = (phase - 0.15) / 0.10;
      return Math.sin(p * Math.PI) * 0.18;
    }
    // Phase 0.25 - 0.35: PR Segment
    if (phase < 0.35) return 0;
    // Phase 0.35 - 0.40: Q-Wave (Slight downward deflection)
    if (phase < 0.40) {
      const q = (phase - 0.35) / 0.05;
      return -Math.sin(q * Math.PI) * 0.15;
    }
    // Phase 0.40 - 0.48: R-Wave (High sharp Ventricular spike!)
    if (phase < 0.48) {
      const r = (phase - 0.40) / 0.08;
      return Math.sin(r * Math.PI) * 1.0;
    }
    // Phase 0.48 - 0.53: S-Wave (Downward dip)
    if (phase < 0.53) {
      const s = (phase - 0.48) / 0.05;
      return -Math.sin(s * Math.PI) * 0.25;
    }
    // Phase 0.53 - 0.65: ST Segment
    if (phase < 0.65) return 0;
    // Phase 0.65 - 0.85: T-Wave (Ventricular Repolarization)
    if (phase < 0.85) {
      const t = (phase - 0.65) / 0.20;
      return Math.sin(t * Math.PI) * 0.32;
    }
    // Phase 0.85 - 1.0: Diastolic Resting Baseline
    return 0;
  }

  // Damage a villager with weapon (sword or gun)
  public damageVillager(v: VillagerData, amount: number, knockback?: THREE.Vector3) {
    if (v.isDead) return;

    v.health -= amount;
    v.hitFlashTimer = 0.22;
    sound.playZombieHurt(); // Organic hurt sound

    // Flash materials red
    const mats = this.villagerMaterials.get(v.id);
    if (mats) {
      mats.forEach(m => m.mat.color.setHex(0xff1111));
    }

    // Apply slight movement impulse
    const root = this.villagerMeshes.get(v.id);
    if (root && knockback) {
      root.position.add(knockback);
    }

    // Stress spike
    v.neural.stress = 100;
    v.heart.bpm = Math.min(180, v.heart.bpm + 45);

    // Death check
    if (v.health <= 0) {
      v.isDead = true;
      v.isDying = true;
      v.deathTimer = 1.0;
      v.heart.bpm = 0;
      v.heart.systolic = 0;
      v.heart.diastolic = 0;
      v.heart.oxygenSaturation = 0;
      v.neural.mood = 'Weary';
      v.neural.currentThought = 'Fallen in combat...';

      // Sound on defeat
      sound.playZombieHurt();
    }
  }

  // Hit test against living villagers with melee sword swing
  public checkMeleeHit(playerPos: THREE.Vector3, playerYaw: number, reach: number = 3.2): boolean {
    let hitAny = false;
    const forward = new THREE.Vector3(Math.sin(playerYaw), 0, Math.cos(playerYaw));

    for (const v of this.villagers) {
      if (v.isDead) continue;
      const root = this.villagerMeshes.get(v.id);
      if (!root) continue;

      const toVillager = root.position.clone().sub(playerPos);
      toVillager.y = 0;
      const dist = toVillager.length();

      if (dist <= reach) {
        toVillager.normalize();
        const dot = forward.dot(toVillager);
        if (dot > 0.1) {
          // Sword deals 35 damage with knockback
          this.damageVillager(v, 35, forward.clone().multiplyScalar(0.6));
          hitAny = true;
        }
      }
    }

    return hitAny;
  }

  // Hit test against living villagers with gunshot raycast
  public checkGunHit(origin: THREE.Vector3, direction: THREE.Vector3, range: number = 52): boolean {
    this.raycaster.set(origin, direction);
    this.raycaster.far = range;

    const livingMeshes: THREE.Object3D[] = [];
    for (const v of this.villagers) {
      if (v.isDead) continue;
      const mesh = this.villagerMeshes.get(v.id);
      if (mesh) livingMeshes.push(mesh);
    }

    const hits = this.raycaster.intersectObjects(livingMeshes, true);
    if (hits.length > 0) {
      let hitMesh = hits[0].object;
      while (hitMesh.parent && !hitMesh.name.startsWith('villager_') && hitMesh.parent !== this.scene) {
        hitMesh = hitMesh.parent;
      }

      const villagerId = hitMesh.name.replace('villager_', '');
      const v = this.villagers.find(item => item.id === villagerId);
      if (v && !v.isDead) {
        // Gun deals 60 damage (one-shot kill or high lethal wound)
        this.damageVillager(v, 60, direction.clone().multiplyScalar(1.2));
        return true;
      }
    }

    return false;
  }
}
