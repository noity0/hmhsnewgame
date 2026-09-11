import * as THREE from 'three';
import { PhysicsWorld } from './physics';
import {
  getCobblestoneTexture,
  getCobblestoneNormalMap,
  getGrassTexture,
  getGrassNormalMap,
  getRoofTileTexture,
  getRoofTileNormalMap,
  getStoneWallTexture,
  getStoneWallNormalMap,
  getWoodPlankTexture,
  getWoodPlankNormalMap,
  getBarkTexture,
  getBarkNormalMap,
  getWaterNormalMap,
} from './textures';
import { WeatherSystem } from './weather';

export interface InteractiveDoor {
  mesh: THREE.Group;
  pivot: THREE.Group;
  isOpen: boolean;
  isOpening: boolean;
}

export interface ChimneySmoke {
  particles: THREE.Points;
  positions: Float32Array;
  speeds: Float32Array;
}

export class VillageWorld {
  public scene: THREE.Scene;
  public physics: PhysicsWorld;
  public weather: WeatherSystem;

  public interactiveDoors: InteractiveDoor[] = [];
  public windmillBlades: THREE.Group | null = null;
  public chimneySmokes: ChimneySmoke[] = [];
  public fireflies: THREE.Points | null = null;
  public waterMesh: THREE.Mesh | null = null;
  public churchBell: THREE.Mesh | null = null;
  public customSpawnGroup: THREE.Group = new THREE.Group();
  public fireplaceLights: THREE.PointLight[] = [];
  public wavingTrees: { group: THREE.Group; foliage: THREE.Mesh[]; phase: number }[] = [];

  // Shared 1000x Realistic PBR Materials
  public matCobble: THREE.MeshStandardMaterial;
  public matWood: THREE.MeshStandardMaterial;
  public matStoneWall: THREE.MeshStandardMaterial;
  public matRoof: THREE.MeshStandardMaterial;
  public matGrass: THREE.MeshStandardMaterial;
  public matBark: THREE.MeshStandardMaterial;
  public matLeaves: THREE.MeshStandardMaterial;
  public matWater: THREE.MeshStandardMaterial;
  public matIron: THREE.MeshStandardMaterial;
  public matGold: THREE.MeshStandardMaterial;
  public matFabricRed: THREE.MeshStandardMaterial;
  public matFabricBlue: THREE.MeshStandardMaterial;

  constructor(scene: THREE.Scene, physics: PhysicsWorld, weather: WeatherSystem) {
    this.scene = scene;
    this.physics = physics;
    this.weather = weather;

    // Initialize high-fidelity PBR materials with normal maps
    this.matCobble = new THREE.MeshStandardMaterial({
      map: getCobblestoneTexture(),
      normalMap: getCobblestoneNormalMap(),
      roughness: 0.82,
      metalness: 0.04,
    });
    this.matWood = new THREE.MeshStandardMaterial({
      map: getWoodPlankTexture(),
      normalMap: getWoodPlankNormalMap(),
      roughness: 0.72,
      metalness: 0.02,
    });
    this.matStoneWall = new THREE.MeshStandardMaterial({
      map: getStoneWallTexture(),
      normalMap: getStoneWallNormalMap(),
      roughness: 0.88,
      metalness: 0.04,
    });
    this.matRoof = new THREE.MeshStandardMaterial({
      map: getRoofTileTexture(),
      normalMap: getRoofTileNormalMap(),
      roughness: 0.65,
      metalness: 0.08,
    });
    this.matGrass = new THREE.MeshStandardMaterial({
      map: getGrassTexture(),
      normalMap: getGrassNormalMap(),
      roughness: 0.92,
      metalness: 0.02,
    });

    this.matBark = new THREE.MeshStandardMaterial({
      map: getBarkTexture(),
      normalMap: getBarkNormalMap(),
      roughness: 0.9,
    });
    this.matLeaves = new THREE.MeshStandardMaterial({
      color: 0x2e5c1e,
      roughness: 0.6,
    });
    this.matWater = new THREE.MeshStandardMaterial({
      color: 0x1f5f85,
      normalMap: getWaterNormalMap(),
      roughness: 0.08,
      metalness: 0.88,
      transparent: true,
      opacity: 0.84,
    });
    this.matIron = new THREE.MeshStandardMaterial({
      color: 0x2b2d30,
      roughness: 0.35,
      metalness: 0.85,
    });
    this.matGold = new THREE.MeshStandardMaterial({
      color: 0xffb703,
      roughness: 0.25,
      metalness: 0.9,
    });
    this.matFabricRed = new THREE.MeshStandardMaterial({
      color: 0xb53120,
      roughness: 0.9,
    });
    this.matFabricBlue = new THREE.MeshStandardMaterial({
      color: 0x205ab5,
      roughness: 0.9,
    });

    this.scene.add(this.customSpawnGroup);
    this.buildWorld();
  }

  private buildWorld() {
    this.buildTerrain();
    this.buildRiverAndBridge();
    this.buildVillageSquare();
    this.buildCottage(new THREE.Vector3(12, 0, 8), 0, 'Cottage');
    this.buildTavern(new THREE.Vector3(14, 0, -14), -Math.PI / 2);
    this.buildBlacksmith(new THREE.Vector3(-10, 0, 16), Math.PI / 4);
    this.buildWindmill(new THREE.Vector3(26, 0, 24));
    this.buildChurch(new THREE.Vector3(-8, 0, -22));
    this.buildMarketStalls(new THREE.Vector3(0, 0, -4));
    this.buildNature();
    this.buildMeadowFlora();
    this.spawnPhysicsProps();
    this.setupParticles();
  }

  private buildTerrain() {
    // Ground plane
    const groundGeo = new THREE.PlaneGeometry(160, 160, 40, 40);
    // Add subtle elevation wave
    const pos = groundGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getY(i);
      // river depression around x = -10
      let y = Math.sin(x * 0.05) * Math.cos(z * 0.05) * 0.8;
      if (x > -16 && x < -4) {
        y -= 1.2; // river bed
      }
      pos.setZ(i, y);
    }
    groundGeo.computeVertexNormals();

    const groundMesh = new THREE.Mesh(groundGeo, this.matGrass);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.receiveShadow = true;
    this.scene.add(groundMesh);

    // Static physics ground
    this.physics.addStaticGround(160, 160, 0);

    // Cobblestone Main Pathways
    const pathGroup = new THREE.Group();
    // Central North-South road
    const mainRoadGeo = new THREE.PlaneGeometry(5, 70);
    const mainRoad = new THREE.Mesh(mainRoadGeo, this.matCobble);
    mainRoad.rotation.x = -Math.PI / 2;
    mainRoad.position.set(0, 0.02, 0);
    mainRoad.receiveShadow = true;
    pathGroup.add(mainRoad);

    // East-West road to bridge & blacksmith
    const eastRoadGeo = new THREE.PlaneGeometry(50, 4.5);
    const eastRoad = new THREE.Mesh(eastRoadGeo, this.matCobble);
    eastRoad.rotation.x = -Math.PI / 2;
    eastRoad.position.set(8, 0.025, 6);
    eastRoad.receiveShadow = true;
    pathGroup.add(eastRoad);

    this.scene.add(pathGroup);
  }

  private buildRiverAndBridge() {
    // Dry stone ravine / creek bed with bridge overhead (all water removed except village stone well)
    const creekBedGeo = new THREE.PlaneGeometry(14, 150, 10, 10);
    const creekBed = new THREE.Mesh(creekBedGeo, this.matCobble);
    creekBed.rotation.x = -Math.PI / 2;
    creekBed.position.set(-10, 0.01, 0);
    creekBed.receiveShadow = true;
    this.scene.add(creekBed);

    // Wooden Bridge across creek (deck height: top is at y = 0.80)
    const bridge = new THREE.Group();
    bridge.position.set(-10, 0.6, 6);

    // Main Bridge deck
    const deckGeo = new THREE.BoxGeometry(16, 0.4, 4.5);
    const deck = new THREE.Mesh(deckGeo, this.matWood);
    deck.castShadow = true;
    deck.receiveShadow = true;
    bridge.add(deck);

    // East Ramp (towards village center, x = +8 relative to bridge center, spanning to +9.6)
    const rampEastGeo = new THREE.BoxGeometry(2.0, 0.3, 4.5);
    const rampEast = new THREE.Mesh(rampEastGeo, this.matWood);
    rampEast.position.set(8.8, -0.15, 0);
    rampEast.rotation.z = -0.20;
    rampEast.castShadow = true;
    rampEast.receiveShadow = true;
    bridge.add(rampEast);

    // West Ramp (towards outer trails, x = -8 relative to bridge center, spanning to -9.6)
    const rampWestGeo = new THREE.BoxGeometry(2.0, 0.3, 4.5);
    const rampWest = new THREE.Mesh(rampWestGeo, this.matWood);
    rampWest.position.set(-8.8, -0.15, 0);
    rampWest.rotation.z = 0.20;
    rampWest.castShadow = true;
    rampWest.receiveShadow = true;
    bridge.add(rampWest);

    // Handrails
    const railGeo = new THREE.BoxGeometry(18, 0.2, 0.2);
    const rail1 = new THREE.Mesh(railGeo, this.matWood);
    rail1.position.set(0, 1.0, 2.1);
    rail1.castShadow = true;
    bridge.add(rail1);

    const rail2 = new THREE.Mesh(railGeo, this.matWood);
    rail2.position.set(0, 1.0, -2.1);
    rail2.castShadow = true;
    bridge.add(rail2);

    // Posts
    for (let x = -8; x <= 8; x += 3.2) {
      const postGeo = new THREE.CylinderGeometry(0.12, 0.12, 1.2, 8);
      const post1 = new THREE.Mesh(postGeo, this.matWood);
      post1.position.set(x, 0.5, 2.1);
      post1.castShadow = true;
      bridge.add(post1);

      const post2 = new THREE.Mesh(postGeo, this.matWood);
      post2.position.set(x, 0.5, -2.1);
      post2.castShadow = true;
      bridge.add(post2);
    }

    this.scene.add(bridge);
    // Physics static collider for bridge deck (top at y = 0.8) and ramps
    this.physics.addStaticBox(new THREE.Vector3(-10, 0.6, 6), new THREE.Vector3(8, 0.2, 2.25));
    this.physics.addStaticBox(new THREE.Vector3(-1.2, 0.35, 6), new THREE.Vector3(1.0, 0.15, 2.25));
    this.physics.addStaticBox(new THREE.Vector3(-18.8, 0.35, 6), new THREE.Vector3(1.0, 0.15, 2.25));
  }

  private buildVillageSquare() {
    // Central circular stone plaza
    const plazaGeo = new THREE.CylinderGeometry(8, 8.2, 0.15, 24);
    const plaza = new THREE.Mesh(plazaGeo, this.matCobble);
    plaza.position.set(0, 0.08, 0);
    plaza.receiveShadow = true;
    this.scene.add(plaza);

    // Village Stone Well in center
    const well = new THREE.Group();
    well.position.set(0, 0, 0);

    const wallGeo = new THREE.CylinderGeometry(1.6, 1.7, 1.1, 16, 1, true);
    const wellWall = new THREE.Mesh(wallGeo, this.matStoneWall);
    wellWall.position.y = 0.55;
    wellWall.castShadow = true;
    wellWall.receiveShadow = true;
    well.add(wellWall);

    // Water surface inside well
    const wellWaterGeo = new THREE.CircleGeometry(1.5, 16);
    const wellWater = new THREE.Mesh(wellWaterGeo, this.matWater);
    wellWater.rotation.x = -Math.PI / 2;
    wellWater.position.y = 0.4;
    well.add(wellWater);

    // Well wooden posts and roof
    const postGeo = new THREE.BoxGeometry(0.18, 2.4, 0.18);
    const postA = new THREE.Mesh(postGeo, this.matWood);
    postA.position.set(-1.4, 1.2, 0);
    postA.castShadow = true;
    well.add(postA);

    const postB = new THREE.Mesh(postGeo, this.matWood);
    postB.position.set(1.4, 1.2, 0);
    postB.castShadow = true;
    well.add(postB);

    const roofGeo = new THREE.ConeGeometry(2.1, 1.2, 4);
    const wellRoof = new THREE.Mesh(roofGeo, this.matRoof);
    wellRoof.position.set(0, 2.7, 0);
    wellRoof.rotation.y = Math.PI / 4;
    wellRoof.castShadow = true;
    well.add(wellRoof);

    // Bucket rope & metal bucket
    const ropeGeo = new THREE.CylinderGeometry(0.02, 0.02, 1.2);
    const rope = new THREE.Mesh(ropeGeo, this.matWood);
    rope.position.set(0, 1.8, 0);
    well.add(rope);

    this.scene.add(well);
    // Impenetrable cylinder collider for well from ground up to roof (3.8m tall, radius 1.95m)
    this.physics.addStaticCylinder(new THREE.Vector3(0, 1.9, 0), 1.95, 3.8);

    // Lampposts around square
    this.createLamppost(new THREE.Vector3(4.5, 0, 4.5));
    this.createLamppost(new THREE.Vector3(-4.5, 0, 4.5));
    this.createLamppost(new THREE.Vector3(4.5, 0, -4.5));
    this.createLamppost(new THREE.Vector3(-4.5, 0, -4.5));
  }

  public createLamppost(pos: THREE.Vector3) {
    const post = new THREE.Group();
    post.position.copy(pos);

    // Base
    const baseGeo = new THREE.CylinderGeometry(0.25, 0.35, 0.6, 8);
    const base = new THREE.Mesh(baseGeo, this.matIron);
    base.position.y = 0.3;
    base.castShadow = true;
    post.add(base);

    // Pole
    const poleGeo = new THREE.CylinderGeometry(0.08, 0.1, 3.2, 8);
    const pole = new THREE.Mesh(poleGeo, this.matIron);
    pole.position.y = 1.9;
    pole.castShadow = true;
    post.add(pole);

    // Lantern cage
    const cageGeo = new THREE.BoxGeometry(0.45, 0.6, 0.45);
    const cageMat = new THREE.MeshStandardMaterial({
      color: 0xffd166,
      emissive: 0xffa500,
      emissiveIntensity: 0.6,
      roughness: 0.3,
    });
    const cage = new THREE.Mesh(cageGeo, cageMat);
    cage.position.set(0.35, 3.4, 0);
    cage.castShadow = true;
    post.add(cage);

    // Warm PointLight
    const light = new THREE.PointLight(0xffaa44, 1.0, 12, 1.8);
    light.position.set(pos.x + 0.35, 3.4, pos.z);
    light.castShadow = true;
    light.shadow.bias = -0.002;
    this.scene.add(light);
    this.weather.registerLantern(light);

    this.scene.add(post);
    this.physics.addStaticBox(new THREE.Vector3(pos.x, 1.5, pos.z), new THREE.Vector3(0.3, 1.5, 0.3));
  }

  private buildCottage(pos: THREE.Vector3, rotY: number, _name: string) {
    const house = new THREE.Group();
    house.position.copy(pos);
    house.rotation.y = rotY;

    const width = 8;
    const length = 10;
    const height = 4.2;

    // Interior floor
    const floorGeo = new THREE.BoxGeometry(width - 0.4, 0.2, length - 0.4);
    const floor = new THREE.Mesh(floorGeo, this.matWood);
    floor.position.set(0, 0.1, 0);
    floor.receiveShadow = true;
    house.add(floor);

    // Walls with door opening
    // Back wall
    const backWallGeo = new THREE.BoxGeometry(width, height, 0.4);
    const backWall = new THREE.Mesh(backWallGeo, this.matStoneWall);
    backWall.position.set(0, height / 2, -length / 2 + 0.2);
    backWall.castShadow = true;
    backWall.receiveShadow = true;
    house.add(backWall);

    // Left wall
    const leftWallGeo = new THREE.BoxGeometry(0.4, height, length);
    const leftWall = new THREE.Mesh(leftWallGeo, this.matStoneWall);
    leftWall.position.set(-width / 2 + 0.2, height / 2, 0);
    leftWall.castShadow = true;
    leftWall.receiveShadow = true;
    house.add(leftWall);

    // Right wall
    const rightWall = new THREE.Mesh(leftWallGeo, this.matStoneWall);
    rightWall.position.set(width / 2 - 0.2, height / 2, 0);
    rightWall.castShadow = true;
    rightWall.receiveShadow = true;
    house.add(rightWall);

    // Front wall Left part
    const frontWallLeftGeo = new THREE.BoxGeometry(2.8, height, 0.4);
    const frontWallLeft = new THREE.Mesh(frontWallLeftGeo, this.matStoneWall);
    frontWallLeft.position.set(-2.6, height / 2, length / 2 - 0.2);
    frontWallLeft.castShadow = true;
    frontWallLeft.receiveShadow = true;
    house.add(frontWallLeft);

    // Front wall Right part
    const frontWallRight = new THREE.Mesh(frontWallLeftGeo, this.matStoneWall);
    frontWallRight.position.set(2.6, height / 2, length / 2 - 0.2);
    frontWallRight.castShadow = true;
    frontWallRight.receiveShadow = true;
    house.add(frontWallRight);

    // Above door lintel
    const lintelGeo = new THREE.BoxGeometry(2.4, 1.4, 0.4);
    const lintel = new THREE.Mesh(lintelGeo, this.matWood);
    lintel.position.set(0, height - 0.7, length / 2 - 0.2);
    lintel.castShadow = true;
    house.add(lintel);

    // Interactive Wooden Door
    const doorPivot = new THREE.Group();
    doorPivot.position.set(-1.2, 0, length / 2 - 0.2);

    const doorGeo = new THREE.BoxGeometry(2.35, 2.8, 0.12);
    const doorMesh = new THREE.Mesh(doorGeo, this.matWood);
    doorMesh.position.set(1.17, 1.4, 0);
    doorMesh.castShadow = true;
    doorPivot.add(doorMesh);

    // Door handle
    const handleGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.2);
    const handle = new THREE.Mesh(handleGeo, this.matIron);
    handle.rotation.z = Math.PI / 2;
    handle.position.set(2.0, 1.4, 0.12);
    doorPivot.add(handle);

    house.add(doorPivot);

    this.interactiveDoors.push({
      mesh: house,
      pivot: doorPivot,
      isOpen: false,
      isOpening: false,
    });

    // Pitched Roof
    const roofSlopeL = new THREE.Mesh(new THREE.BoxGeometry(width / 2 + 1.2, 0.35, length + 1), this.matRoof);
    roofSlopeL.position.set(-width / 4, height + 1.3, 0);
    roofSlopeL.rotation.z = Math.PI / 6;
    roofSlopeL.castShadow = true;
    house.add(roofSlopeL);

    const roofSlopeR = new THREE.Mesh(new THREE.BoxGeometry(width / 2 + 1.2, 0.35, length + 1), this.matRoof);
    roofSlopeR.position.set(width / 4, height + 1.3, 0);
    roofSlopeR.rotation.z = -Math.PI / 6;
    roofSlopeR.castShadow = true;
    house.add(roofSlopeR);

    // Stone Chimney with fireplace
    const chimney = new THREE.Mesh(new THREE.BoxGeometry(1.2, 6.2, 1.2), this.matStoneWall);
    chimney.position.set(width / 2 - 1.2, 3.1, -length / 4);
    chimney.castShadow = true;
    house.add(chimney);

    // Chimney smoke origin
    const smokeWorldPos = new THREE.Vector3(pos.x + width / 2 - 1.2, pos.y + 6.4, pos.z - length / 4);
    this.createChimneySmoke(smokeWorldPos);

    // Interior furniture
    // Fireplace hearth inside
    const hearthGeo = new THREE.BoxGeometry(1.4, 1.2, 0.8);
    const hearth = new THREE.Mesh(hearthGeo, this.matStoneWall);
    hearth.position.set(width / 2 - 1.2, 0.6, -length / 4);
    house.add(hearth);

    // Glowing embers light in hearth
    const fireLight = new THREE.PointLight(0xff6611, 1.2, 7, 2);
    fireLight.position.set(pos.x + width / 2 - 1.2, pos.y + 0.6, pos.z - length / 4 + 0.5);
    this.scene.add(fireLight);

    // Wooden Bed
    const bedGroup = new THREE.Group();
    bedGroup.position.set(-width / 2 + 1.8, 0, -length / 2 + 2.2);
    const bedFrame = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.6, 3.4), this.matWood);
    bedFrame.position.y = 0.3;
    bedGroup.add(bedFrame);
    const mattress = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.3, 3.2), this.matFabricRed);
    mattress.position.y = 0.7;
    bedGroup.add(mattress);
    const pillow = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.2, 0.8), new THREE.MeshStandardMaterial({ color: 0xeeece8 }));
    pillow.position.set(0, 0.9, -1.1);
    bedGroup.add(pillow);
    house.add(bedGroup);

    // Wooden Dining Table & Chairs in center
    const tableMesh = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.15, 1.4), this.matWood);
    tableMesh.position.set(0, 1.0, 0);
    tableMesh.castShadow = true;
    house.add(tableMesh);
    const tableLegGeo = new THREE.BoxGeometry(0.12, 1.0, 0.12);
    for (const [lx, lz] of [[-1.1, -0.6], [1.1, -0.6], [-1.1, 0.6], [1.1, 0.6]]) {
      const leg = new THREE.Mesh(tableLegGeo, this.matWood);
      leg.position.set(lx, 0.5, lz);
      house.add(leg);
    }

    // Windows with warm glass
    const winMat = new THREE.MeshStandardMaterial({
      color: 0xffd166,
      emissive: 0xffaa33,
      emissiveIntensity: 0.3,
      transparent: true,
      opacity: 0.65,
    });
    const winGeo = new THREE.BoxGeometry(0.1, 1.4, 1.4);
    const winL = new THREE.Mesh(winGeo, winMat);
    winL.position.set(-width / 2 + 0.2, 2.2, 1.5);
    house.add(winL);

    this.scene.add(house);

    // Static physics colliders for walls with rotation
    this.addRotatedBoxCollider(pos, new THREE.Vector3(0, height / 2, -length / 2 + 0.2), new THREE.Vector3(width / 2, height / 2, 0.35), rotY);
    this.addRotatedBoxCollider(pos, new THREE.Vector3(-width / 2 + 0.2, height / 2, 0), new THREE.Vector3(0.35, height / 2, length / 2), rotY);
    this.addRotatedBoxCollider(pos, new THREE.Vector3(width / 2 - 0.2, height / 2, 0), new THREE.Vector3(0.35, height / 2, length / 2), rotY);
    this.addRotatedBoxCollider(pos, new THREE.Vector3(-2.6, height / 2, length / 2 - 0.2), new THREE.Vector3(1.4, height / 2, 0.35), rotY);
    this.addRotatedBoxCollider(pos, new THREE.Vector3(2.6, height / 2, length / 2 - 0.2), new THREE.Vector3(1.4, height / 2, 0.35), rotY);
  }

  private addRotatedBoxCollider(
    basePos: THREE.Vector3,
    localOffset: THREE.Vector3,
    halfExtents: THREE.Vector3,
    rotY: number = 0
  ) {
    const quat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotY);
    const rotatedOffset = localOffset.clone().applyQuaternion(quat);
    const worldPos = basePos.clone().add(rotatedOffset);
    this.physics.addStaticBox(worldPos, halfExtents, quat);
  }

  private buildTavern(pos: THREE.Vector3, rotY: number) {
    const tavern = new THREE.Group();
    tavern.position.copy(pos);
    tavern.rotation.y = rotY;

    const w = 12;
    const l = 16;
    const h = 5.5;

    // Floor
    const floor = new THREE.Mesh(new THREE.BoxGeometry(w, 0.2, l), this.matWood);
    floor.position.y = 0.1;
    floor.receiveShadow = true;
    tavern.add(floor);

    // Stone base + timber upper walls
    const wallGeoBack = new THREE.BoxGeometry(w, h, 0.4);
    const backWall = new THREE.Mesh(wallGeoBack, this.matStoneWall);
    backWall.position.set(0, h / 2, -l / 2 + 0.2);
    backWall.castShadow = true;
    tavern.add(backWall);

    const wallGeoSide = new THREE.BoxGeometry(0.4, h, l);
    const leftWall = new THREE.Mesh(wallGeoSide, this.matStoneWall);
    leftWall.position.set(-w / 2 + 0.2, h / 2, 0);
    leftWall.castShadow = true;
    tavern.add(leftWall);

    const rightWall = new THREE.Mesh(wallGeoSide, this.matStoneWall);
    rightWall.position.set(w / 2 - 0.2, h / 2, 0);
    rightWall.castShadow = true;
    tavern.add(rightWall);

    // Front wall with entrance
    const frontL = new THREE.Mesh(new THREE.BoxGeometry(4.5, h, 0.4), this.matStoneWall);
    frontL.position.set(-3.7, h / 2, l / 2 - 0.2);
    tavern.add(frontL);

    const frontR = new THREE.Mesh(new THREE.BoxGeometry(4.5, h, 0.4), this.matStoneWall);
    frontR.position.set(3.7, h / 2, l / 2 - 0.2);
    tavern.add(frontR);

    // Entrance archway
    const arch = new THREE.Mesh(new THREE.BoxGeometry(3.0, 2.0, 0.5), this.matWood);
    arch.position.set(0, h - 1.0, l / 2 - 0.2);
    tavern.add(arch);

    // Tavern Signboard outside
    const signGeo = new THREE.BoxGeometry(1.8, 1.2, 0.08);
    const sign = new THREE.Mesh(signGeo, this.matWood);
    sign.position.set(2.4, 3.8, l / 2 + 0.4);
    tavern.add(sign);

    // Long Bar Counter
    const barCounter = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.1, 7.0), this.matWood);
    barCounter.position.set(-w / 2 + 2.2, 0.55, -1);
    barCounter.castShadow = true;
    tavern.add(barCounter);

    // Tavern Chandelier
    const chGeo = new THREE.CylinderGeometry(1.4, 1.4, 0.15, 12);
    const ch = new THREE.Mesh(chGeo, this.matIron);
    ch.position.set(0, 4.4, 0);
    tavern.add(ch);

    const chLight = new THREE.PointLight(0xffa544, 1.5, 14, 2);
    chLight.position.set(pos.x, pos.y + 4.2, pos.z);
    this.scene.add(chLight);

    // Roof
    const roofL = new THREE.Mesh(new THREE.BoxGeometry(w / 2 + 1.4, 0.4, l + 1), this.matRoof);
    roofL.position.set(-w / 4, h + 1.6, 0);
    roofL.rotation.z = Math.PI / 5.5;
    roofL.castShadow = true;
    tavern.add(roofL);

    const roofR = new THREE.Mesh(new THREE.BoxGeometry(w / 2 + 1.4, 0.4, l + 1), this.matRoof);
    roofR.position.set(w / 4, h + 1.6, 0);
    roofR.rotation.z = -Math.PI / 5.5;
    roofR.castShadow = true;
    tavern.add(roofR);

    this.scene.add(tavern);

    // Accurate rotated wall boundaries for Tavern
    this.addRotatedBoxCollider(pos, new THREE.Vector3(0, h / 2, -l / 2 + 0.2), new THREE.Vector3(w / 2, h / 2, 0.35), rotY);
    this.addRotatedBoxCollider(pos, new THREE.Vector3(-w / 2 + 0.2, h / 2, 0), new THREE.Vector3(0.35, h / 2, l / 2), rotY);
    this.addRotatedBoxCollider(pos, new THREE.Vector3(w / 2 - 0.2, h / 2, 0), new THREE.Vector3(0.35, h / 2, l / 2), rotY);
    // Front wings leaving doorway open in center
    this.addRotatedBoxCollider(pos, new THREE.Vector3(-3.8, h / 2, l / 2 - 0.2), new THREE.Vector3(2.2, h / 2, 0.35), rotY);
    this.addRotatedBoxCollider(pos, new THREE.Vector3(3.8, h / 2, l / 2 - 0.2), new THREE.Vector3(2.2, h / 2, 0.35), rotY);
  }

  private buildBlacksmith(pos: THREE.Vector3, rotY: number) {
    const smith = new THREE.Group();
    smith.position.copy(pos);
    smith.rotation.y = rotY;

    // Stone foundation
    const foundGeo = new THREE.BoxGeometry(9, 0.3, 8);
    const found = new THREE.Mesh(foundGeo, this.matCobble);
    found.position.y = 0.15;
    smith.add(found);

    // Open timber columns
    const colGeo = new THREE.BoxGeometry(0.35, 3.8, 0.35);
    for (const [cx, cz] of [[-4.2, -3.7], [4.2, -3.7], [-4.2, 3.7], [4.2, 3.7]]) {
      const col = new THREE.Mesh(colGeo, this.matWood);
      col.position.set(cx, 1.9, cz);
      col.castShadow = true;
      smith.add(col);
    }

    // Open forge canopy roof
    const roof = new THREE.Mesh(new THREE.ConeGeometry(6.5, 2.0, 4), this.matRoof);
    roof.position.set(0, 4.6, 0);
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    smith.add(roof);

    // Large Stone Forge with burning embers
    const forgeGeo = new THREE.BoxGeometry(2.4, 1.4, 1.8);
    const forge = new THREE.Mesh(forgeGeo, this.matStoneWall);
    forge.position.set(0, 0.7, -2.5);
    forge.castShadow = true;
    smith.add(forge);

    // Glowing coals
    const coalGeo = new THREE.BoxGeometry(1.6, 0.2, 1.0);
    const coalMat = new THREE.MeshStandardMaterial({
      color: 0xff3300,
      emissive: 0xff4400,
      emissiveIntensity: 1.5,
      roughness: 0.2,
    });
    const coals = new THREE.Mesh(coalGeo, coalMat);
    coals.position.set(0, 1.45, -2.5);
    smith.add(coals);

    // Forge Orange PointLight
    const forgeLight = new THREE.PointLight(0xff4400, 2.0, 9, 2);
    forgeLight.position.set(pos.x, pos.y + 1.8, pos.z - 2.5);
    this.scene.add(forgeLight);

    // Smoke from forge
    this.createChimneySmoke(new THREE.Vector3(pos.x, pos.y + 5.2, pos.z - 2.5));

    this.scene.add(smith);
    // Blacksmith stone forge & back wall with rotation
    this.addRotatedBoxCollider(pos, new THREE.Vector3(0, 0.9, -2.5), new THREE.Vector3(1.6, 0.9, 1.2), rotY);
    this.addRotatedBoxCollider(pos, new THREE.Vector3(-4.0, 1.5, 0), new THREE.Vector3(0.3, 1.5, 3.8), rotY);
  }

  private buildWindmill(pos: THREE.Vector3) {
    const mill = new THREE.Group();
    mill.position.copy(pos);

    // Hexagonal stone tower
    const towerGeo = new THREE.CylinderGeometry(3.5, 4.8, 11, 6);
    const tower = new THREE.Mesh(towerGeo, this.matStoneWall);
    tower.position.y = 5.5;
    tower.castShadow = true;
    mill.add(tower);

    // Cap roof
    const capGeo = new THREE.ConeGeometry(4.2, 3.2, 6);
    const cap = new THREE.Mesh(capGeo, this.matRoof);
    cap.position.y = 12.6;
    cap.castShadow = true;
    mill.add(cap);

    // Rotating Sails Group
    this.windmillBlades = new THREE.Group();
    this.windmillBlades.position.set(0, 10.2, 3.9);

    // Hub
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.8, 8), this.matWood);
    hub.rotation.x = Math.PI / 2;
    this.windmillBlades.add(hub);

    // 4 Blades
    for (let b = 0; b < 4; b++) {
      const blade = new THREE.Group();
      blade.rotation.z = (b * Math.PI) / 2;

      // Spar
      const spar = new THREE.Mesh(new THREE.BoxGeometry(0.2, 7.5, 0.2), this.matWood);
      spar.position.y = 3.8;
      spar.castShadow = true;
      blade.add(spar);

      // Canvas sail cloth
      const sail = new THREE.Mesh(new THREE.BoxGeometry(1.2, 6.0, 0.04), this.matFabricRed);
      sail.position.set(0.65, 4.2, 0);
      sail.castShadow = true;
      blade.add(sail);

      this.windmillBlades.add(blade);
    }

    mill.add(this.windmillBlades);
    this.scene.add(mill);

    // Impenetrable cylinder for windmill tower
    this.physics.addStaticCylinder(new THREE.Vector3(pos.x, 5.5, pos.z), 4.8, 11);
  }

  private buildChurch(pos: THREE.Vector3) {
    const church = new THREE.Group();
    church.position.copy(pos);

    // Main hall
    const hallGeo = new THREE.BoxGeometry(9, 7, 14);
    const hall = new THREE.Mesh(hallGeo, this.matStoneWall);
    hall.position.y = 3.5;
    hall.castShadow = true;
    hall.receiveShadow = true;
    church.add(hall);

    // Hall Roof
    const roof = new THREE.Mesh(new THREE.ConeGeometry(8, 3.5, 4), this.matRoof);
    roof.position.y = 8.5;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    church.add(roof);

    // Bell Tower
    const towerGeo = new THREE.BoxGeometry(4.5, 14, 4.5);
    const tower = new THREE.Mesh(towerGeo, this.matStoneWall);
    tower.position.set(0, 7, 7.5);
    tower.castShadow = true;
    church.add(tower);

    // Tower Spire
    const spireGeo = new THREE.ConeGeometry(3.5, 6, 8);
    const spire = new THREE.Mesh(spireGeo, this.matRoof);
    spire.position.set(0, 17, 7.5);
    spire.castShadow = true;
    church.add(spire);

    // Church Bronze Bell inside open belfry window
    const bellGeo = new THREE.CylinderGeometry(0.3, 0.9, 1.2, 16);
    this.churchBell = new THREE.Mesh(bellGeo, this.matGold);
    this.churchBell.position.set(pos.x, pos.y + 12.5, pos.z + 7.5);
    this.churchBell.castShadow = true;
    this.scene.add(this.churchBell);

    this.scene.add(church);
    this.physics.addStaticBox(new THREE.Vector3(pos.x, 3.5, pos.z), new THREE.Vector3(4.5, 3.5, 7.0));
    this.physics.addStaticBox(new THREE.Vector3(pos.x, 7.0, pos.z + 7.5), new THREE.Vector3(2.3, 7.0, 2.3));
  }

  private buildMarketStalls(pos: THREE.Vector3) {
    const market = new THREE.Group();
    market.position.copy(pos);

    // Stall 1 (Produce)
    const stall1 = this.createStall(this.matFabricRed);
    stall1.position.set(-3.5, 0, 0);
    market.add(stall1);

    // Stall 2 (Pottery & Goods)
    const stall2 = this.createStall(this.matFabricBlue);
    stall2.position.set(3.5, 0, 0);
    market.add(stall2);

    this.scene.add(market);

    // Static physics colliders for market tables so player cannot walk through them
    this.physics.addStaticBox(new THREE.Vector3(pos.x - 3.5, 0.45, pos.z), new THREE.Vector3(1.35, 0.45, 0.75));
    this.physics.addStaticBox(new THREE.Vector3(pos.x + 3.5, 0.45, pos.z), new THREE.Vector3(1.35, 0.45, 0.75));
  }

  private createStall(canopyMat: THREE.MeshStandardMaterial): THREE.Group {
    const stall = new THREE.Group();

    // Table
    const table = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.9, 1.4), this.matWood);
    table.position.y = 0.45;
    table.castShadow = true;
    stall.add(table);

    // 4 Posts
    for (const [px, pz] of [[-1.2, -0.6], [1.2, -0.6], [-1.2, 0.6], [1.2, 0.6]]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.4, 0.1), this.matWood);
      post.position.set(px, 1.2, pz);
      post.castShadow = true;
      stall.add(post);
    }

    // Canopy cloth
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.15, 1.8), canopyMat);
    canopy.position.y = 2.4;
    canopy.rotation.x = 0.15;
    canopy.castShadow = true;
    stall.add(canopy);

    return stall;
  }

  private buildNature() {
    // Trees
    const treePositions: [number, number][] = [
      [8, 18], [14, 16], [20, 12], [22, -6], [18, -20], [6, -26],
      [-18, 12], [-22, 4], [-20, -10], [-24, -22], [-4, -34], [16, -32],
      [-18, 26], [2, 28], [28, 4], [30, -14],
    ];

    treePositions.forEach(([tx, tz]) => {
      this.createOakTree(new THREE.Vector3(tx, 0, tz));
    });

    // Wooden fences along paths and cottage yard
    for (let x = 6; x <= 18; x += 3) {
      this.createFencePost(new THREE.Vector3(x, 0, 14));
    }
  }

  private createOakTree(pos: THREE.Vector3) {
    const tree = new THREE.Group();
    tree.position.copy(pos);

    // Trunk
    const trunkGeo = new THREE.CylinderGeometry(0.4, 0.65, 4.5, 8);
    const trunk = new THREE.Mesh(trunkGeo, this.matBark);
    trunk.position.y = 2.25;
    trunk.castShadow = true;
    tree.add(trunk);

    // Foliage Clusters
    const foliageCluster1 = new THREE.Mesh(new THREE.DodecahedronGeometry(2.4, 1), this.matLeaves);
    foliageCluster1.position.set(0, 4.8, 0);
    foliageCluster1.castShadow = true;
    tree.add(foliageCluster1);

    const foliageCluster2 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.9, 1), this.matLeaves);
    foliageCluster2.position.set(1.2, 4.2, 0.8);
    foliageCluster2.castShadow = true;
    tree.add(foliageCluster2);

    const foliageCluster3 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.8, 1), this.matLeaves);
    foliageCluster3.position.set(-1.1, 4.4, -0.6);
    foliageCluster3.castShadow = true;
    tree.add(foliageCluster3);

    this.scene.add(tree);
    this.wavingTrees.push({
      group: tree,
      foliage: [foliageCluster1, foliageCluster2, foliageCluster3],
      phase: pos.x * 0.4 + pos.z * 0.3,
    });
    this.physics.addStaticBox(new THREE.Vector3(pos.x, 2.25, pos.z), new THREE.Vector3(0.5, 2.25, 0.5));
  }

  private createFencePost(pos: THREE.Vector3) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.2, 0.2), this.matWood);
    post.position.set(pos.x, 0.6, pos.z);
    post.castShadow = true;
    this.scene.add(post);

    const rail = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.12, 0.08), this.matWood);
    rail.position.set(pos.x + 1.5, 0.8, pos.z);
    rail.castShadow = true;
    this.scene.add(rail);

    this.physics.addStaticBox(new THREE.Vector3(pos.x + 1.5, 0.6, pos.z), new THREE.Vector3(1.5, 0.6, 0.15));
  }

  // Spawn true physics interactive objects
  public spawnPhysicsProps() {
    // 1. Stack of Wooden Crates near tavern
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 2; x++) {
        this.spawnCrate(new THREE.Vector3(10 + x * 1.3, 0.7 + y * 1.1, -8));
      }
    }

    // 2. Wooden Barrels near windmill and blacksmith
    this.spawnBarrel(new THREE.Vector3(22, 0.9, 20));
    this.spawnBarrel(new THREE.Vector3(23.5, 0.9, 21));
    this.spawnBarrel(new THREE.Vector3(22.8, 2.2, 20.5)); // stacked on top!
    this.spawnBarrel(new THREE.Vector3(-8, 0.9, 14));

    // 3. Blacksmith Anvil (heavy metallic physics object)
    this.spawnAnvil(new THREE.Vector3(-10, 0.5, 14.5));

    // 4. Village Square Physics Props (kickable wooden chairs and golden spheres)
    this.spawnChair(new THREE.Vector3(2.5, 0.6, 2.0));
    this.spawnChair(new THREE.Vector3(-2.5, 0.6, 2.0));

    // 5. Produce Apples and Bread on market tables
    for (let i = 0; i < 5; i++) {
      this.spawnFruit(new THREE.Vector3(-3.5 + (i - 2) * 0.4, 1.2, -4), 'apple');
      this.spawnFruit(new THREE.Vector3(3.5 + (i - 2) * 0.4, 1.2, -4), 'melon');
    }

    // 6. Interactive Metal Bucket near the well
    this.spawnBucket(new THREE.Vector3(1.8, 0.4, 0.8));
  }

  public spawnCrate(pos: THREE.Vector3) {
    const size = new THREE.Vector3(1.0, 1.0, 1.0);
    const geo = new THREE.BoxGeometry(size.x, size.y, size.z);
    const mesh = new THREE.Mesh(geo, this.matWood);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);
    return this.physics.createBox(size, pos, mesh, 6, 'wood', 'Wooden Crate');
  }

  public spawnBarrel(pos: THREE.Vector3) {
    const geo = new THREE.CylinderGeometry(0.5, 0.5, 1.2, 12);
    const mesh = new THREE.Mesh(geo, this.matWood);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);
    return this.physics.createCylinder(0.5, 0.5, 1.2, pos, mesh, 8, 'Wooden Barrel');
  }

  public spawnAnvil(pos: THREE.Vector3) {
    const geo = new THREE.BoxGeometry(0.8, 0.6, 0.5);
    const mesh = new THREE.Mesh(geo, this.matIron);
    mesh.castShadow = true;
    this.scene.add(mesh);
    return this.physics.createBox(new THREE.Vector3(0.8, 0.6, 0.5), pos, mesh, 120, 'metal', 'Cast Iron Anvil');
  }

  public spawnChair(pos: THREE.Vector3) {
    const chairGroup = new THREE.Group();
    // Seat
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.08, 0.6), this.matWood);
    seat.position.y = 0.5;
    chairGroup.add(seat);
    // Backrest
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.08), this.matWood);
    back.position.set(0, 0.8, -0.26);
    chairGroup.add(back);
    // 4 Legs
    for (const [lx, lz] of [[-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25], [0.25, 0.25]]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 0.06), this.matWood);
      leg.position.set(lx, 0.25, lz);
      chairGroup.add(leg);
    }
    this.scene.add(chairGroup);
    return this.physics.createBox(new THREE.Vector3(0.6, 1.1, 0.6), pos, chairGroup as unknown as THREE.Mesh, 4, 'wood', 'Wooden Chair');
  }

  public spawnFruit(pos: THREE.Vector3, type: 'apple' | 'melon' = 'apple') {
    const isMelon = type === 'melon';
    const radius = isMelon ? 0.22 : 0.12;
    const geo = new THREE.SphereGeometry(radius, 12, 12);
    const mat = new THREE.MeshStandardMaterial({
      color: isMelon ? 0x4a7c2a : 0xcc2222,
      roughness: 0.4,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    this.scene.add(mesh);
    return this.physics.createSphere(radius, pos, mesh, isMelon ? 2 : 0.4, 'wood', isMelon ? 'Fresh Melon' : 'Crisp Apple');
  }

  public spawnGoldenSphere(pos: THREE.Vector3) {
    const radius = 0.45;
    const geo = new THREE.SphereGeometry(radius, 16, 16);
    const mesh = new THREE.Mesh(geo, this.matGold);
    mesh.castShadow = true;
    this.scene.add(mesh);
    return this.physics.createSphere(radius, pos, mesh, 15, 'metal', 'Golden Physics Orb');
  }

  public spawnBucket(pos: THREE.Vector3) {
    const geo = new THREE.CylinderGeometry(0.35, 0.25, 0.6, 12);
    const mesh = new THREE.Mesh(geo, this.matIron);
    mesh.castShadow = true;
    this.scene.add(mesh);
    return this.physics.createCylinder(0.35, 0.25, 0.6, pos, mesh, 3, 'Iron Water Bucket');
  }

  private createChimneySmoke(worldPos: THREE.Vector3) {
    const count = 35;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = worldPos.x + (Math.random() - 0.5) * 0.4;
      positions[i * 3 + 1] = worldPos.y + Math.random() * 3.5;
      positions[i * 3 + 2] = worldPos.z + (Math.random() - 0.5) * 0.4;
      speeds[i] = 0.4 + Math.random() * 0.6;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xdde5ed,
      size: 0.6,
      transparent: true,
      opacity: 0.35,
    });

    const particles = new THREE.Points(geo, mat);
    this.scene.add(particles);
    this.chimneySmokes.push({ particles, positions, speeds });
  }

  private setupParticles() {
    // Fireflies hovering around grass & trees at dusk/night
    const count = 80;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 80;
      pos[i * 3 + 1] = 0.5 + Math.random() * 3.0;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 80;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color: 0x99ff44,
      size: 0.25,
      transparent: true,
      opacity: 0.75,
    });

    this.fireflies = new THREE.Points(geo, mat);
    this.scene.add(this.fireflies);
  }

  public toggleDoor(door: InteractiveDoor) {
    door.isOpen = !door.isOpen;
    door.isOpening = true;
  }

  public update(delta: number, elapsedTime: number) {
    // Rotate windmill blades
    if (this.windmillBlades) {
      this.windmillBlades.rotation.z += delta * 0.5;
    }

    // Animate interactive doors smoothly
    this.interactiveDoors.forEach(d => {
      const targetAngle = d.isOpen ? Math.PI / 2.2 : 0;
      d.pivot.rotation.y = THREE.MathUtils.lerp(d.pivot.rotation.y, targetAngle, delta * 5);
    });

    // Animate chimney smoke rising and dispersing
    this.chimneySmokes.forEach(smoke => {
      const posAttr = smoke.particles.geometry.attributes.position;
      const arr = smoke.positions;
      for (let i = 0; i < arr.length / 3; i++) {
        arr[i * 3 + 1] += smoke.speeds[i] * delta * 1.5;
        // gentle wind drift
        arr[i * 3] += Math.sin(elapsedTime + i) * 0.01;
        // reset if too high
        if (arr[i * 3 + 1] > 12) {
          arr[i * 3 + 1] = 6.4;
        }
      }
      posAttr.needsUpdate = true;
    });

    // Animate fireflies floating
    if (this.fireflies) {
      const posAttr = this.fireflies.geometry.attributes.position;
      const arr = posAttr.array as Float32Array;
      for (let i = 0; i < arr.length / 3; i++) {
        arr[i * 3 + 1] += Math.sin(elapsedTime * 2 + i) * 0.008;
        arr[i * 3] += Math.cos(elapsedTime + i) * 0.006;
      }
      posAttr.needsUpdate = true;
    }

    // Water wave subtle ripple & flow
    if (this.waterMesh) {
      const posAttr = this.waterMesh.geometry.attributes.position;
      for (let i = 0; i < posAttr.count; i++) {
        const u = posAttr.getX(i);
        const v = posAttr.getY(i);
        const wave = Math.sin(u * 1.4 + elapsedTime * 2.8) * Math.cos(v * 0.9 + elapsedTime * 1.9) * 0.07;
        posAttr.setZ(i, wave);
      }
      posAttr.needsUpdate = true;

      // Scroll water normal map texture for river flow
      if (this.matWater.normalMap) {
        this.matWater.normalMap.offset.y = (elapsedTime * 0.06) % 1;
      }
    }

    // Dynamic firelight flicker in fireplaces & lanterns
    this.fireplaceLights.forEach((light, idx) => {
      light.intensity = 1.3 + Math.sin(elapsedTime * 16 + idx * 2.3) * 0.35 + (Math.random() - 0.5) * 0.15;
    });

    // Realistic Tree & Foliage Wind Swaying
    const windSpeed = this.weather.windSpeed || 0.6;
    const windAngle = this.weather.windAngle || 0.4;
    const windDirX = Math.cos(windAngle);
    const windDirZ = Math.sin(windAngle);

    for (let i = 0; i < this.wavingTrees.length; i++) {
      const t = this.wavingTrees[i];
      const trunkSway = Math.sin(elapsedTime * 1.8 + t.phase) * 0.035 * windSpeed;
      const gust = Math.sin(elapsedTime * 3.6 + t.phase * 1.5) * 0.015 * windSpeed;
      const totalSway = trunkSway + gust;

      t.group.rotation.z = totalSway * windDirX;
      t.group.rotation.x = totalSway * windDirZ;

      // Realistic foliage cluster rustling
      for (let j = 0; j < t.foliage.length; j++) {
        const fol = t.foliage[j];
        fol.rotation.y = Math.sin(elapsedTime * 2.4 + j + t.phase) * 0.05 * windSpeed;
        fol.rotation.z = Math.cos(elapsedTime * 2.1 + j * 1.3) * 0.04 * windSpeed;
      }
    }
  }

  // 1000x Realism 3D Meadow Flora & Wildflower Tuft Clusters
  private buildMeadowFlora() {
    const floraGroup = new THREE.Group();
    const flowerColors = [0xdd3333, 0xffbb22, 0x4488ee, 0xdd66bb, 0xffffff];

    // Spawn 120 natural wildflower tufts throughout meadows
    for (let i = 0; i < 120; i++) {
      const x = (Math.random() - 0.5) * 110;
      const z = (Math.random() - 0.5) * 110;

      // Avoid placing in river or main road
      if (x > -16 && x < -4) continue;
      if (Math.abs(x) < 3.5 && Math.abs(z) < 32) continue;

      const cluster = new THREE.Group();
      cluster.position.set(x, 0.05, z);

      // Stems / Leaves
      const stemGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.35, 4);
      const stemMat = new THREE.MeshStandardMaterial({ color: 0x3d6e24, roughness: 0.8 });
      const stem = new THREE.Mesh(stemGeo, stemMat);
      stem.position.y = 0.17;
      cluster.add(stem);

      // Flower blossom
      const blossomGeo = new THREE.SphereGeometry(0.08, 6, 6);
      const blossomMat = new THREE.MeshStandardMaterial({
        color: flowerColors[Math.floor(Math.random() * flowerColors.length)],
        roughness: 0.5,
      });
      const blossom = new THREE.Mesh(blossomGeo, blossomMat);
      blossom.position.y = 0.34;
      cluster.add(blossom);

      floraGroup.add(cluster);
    }
    this.scene.add(floraGroup);
  }

  // Dynamic Custom Spawners for AI Architect & World Editor
  public spawnWatchtower(pos: THREE.Vector3) {
    const tower = new THREE.Group();
    tower.position.copy(pos);

    // Stone base
    const baseGeo = new THREE.CylinderGeometry(2.4, 2.8, 8, 8);
    const base = new THREE.Mesh(baseGeo, this.matStoneWall);
    base.position.y = 4;
    base.castShadow = true;
    base.receiveShadow = true;
    tower.add(base);

    // Wooden parapet lookout platform
    const platGeo = new THREE.BoxGeometry(6, 0.4, 6);
    const plat = new THREE.Mesh(platGeo, this.matWood);
    plat.position.y = 8.2;
    plat.castShadow = true;
    tower.add(plat);

    // Conical roof
    const roofGeo = new THREE.ConeGeometry(3.6, 3, 8);
    const roof = new THREE.Mesh(roofGeo, this.matRoof);
    roof.position.y = 11;
    roof.castShadow = true;
    tower.add(roof);

    // Lookout torch
    const torchLight = new THREE.PointLight(0xff9922, 1.8, 16);
    torchLight.position.set(0, 9, 0);
    tower.add(torchLight);
    this.weather.registerLantern(torchLight);

    this.customSpawnGroup.add(tower);
    this.physics.addStaticBox(new THREE.Vector3(pos.x, pos.y + 4, pos.z), new THREE.Vector3(2.5, 4, 2.5));
    return tower;
  }

  public spawnGazebo(pos: THREE.Vector3) {
    const gazebo = new THREE.Group();
    gazebo.position.copy(pos);

    // Wooden deck
    const deck = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.4, 0.3, 8), this.matWood);
    deck.position.y = 0.15;
    deck.receiveShadow = true;
    gazebo.add(deck);

    // 6 Wooden pillars
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const px = Math.cos(angle) * 2.8;
      const pz = Math.sin(angle) * 2.8;
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 3, 6), this.matWood);
      pillar.position.set(px, 1.65, pz);
      pillar.castShadow = true;
      gazebo.add(pillar);
    }

    // Octagonal roof
    const roof = new THREE.Mesh(new THREE.ConeGeometry(3.8, 2.2, 8), this.matRoof);
    roof.position.y = 4.2;
    roof.castShadow = true;
    gazebo.add(roof);

    // Central lantern
    const lantern = new THREE.PointLight(0xff9933, 1.5, 12);
    lantern.position.set(0, 2.8, 0);
    gazebo.add(lantern);
    this.weather.registerLantern(lantern);

    this.customSpawnGroup.add(gazebo);
    return gazebo;
  }

  public spawnStoneShrine(pos: THREE.Vector3) {
    const shrine = new THREE.Group();
    shrine.position.copy(pos);

    const base = new THREE.Mesh(new THREE.BoxGeometry(2, 0.5, 2), this.matStoneWall);
    base.position.y = 0.25;
    shrine.add(base);

    const obelisk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.6, 2.8, 4), this.matStoneWall);
    obelisk.position.y = 1.65;
    obelisk.castShadow = true;
    shrine.add(obelisk);

    const crystal = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.35),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.1, metalness: 0.8 })
    );
    crystal.position.y = 3.3;
    shrine.add(crystal);

    const runeLight = new THREE.PointLight(0x38bdf8, 1.6, 10);
    runeLight.position.y = 3.3;
    shrine.add(runeLight);

    this.customSpawnGroup.add(shrine);
    return shrine;
  }

  public spawnCustomTree(pos: THREE.Vector3, type: 'autumn' | 'pine' | 'oak' = 'autumn') {
    const tree = new THREE.Group();
    tree.position.copy(pos);

    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.45, 3.5, 8), this.matBark);
    trunk.position.y = 1.75;
    trunk.castShadow = true;
    tree.add(trunk);

    const leafMat = new THREE.MeshStandardMaterial({
      color: type === 'autumn' ? 0xd9531e : type === 'pine' ? 0x1b431e : 0x3e7a2b,
      roughness: 0.7,
    });

    if (type === 'pine') {
      for (let i = 0; i < 3; i++) {
        const cone = new THREE.Mesh(new THREE.ConeGeometry(2.5 - i * 0.6, 2.2, 8), leafMat);
        cone.position.y = 3.5 + i * 1.5;
        cone.castShadow = true;
        tree.add(cone);
      }
    } else {
      const crown = new THREE.Mesh(new THREE.DodecahedronGeometry(2.2, 1), leafMat);
      crown.position.y = 4.2;
      crown.scale.set(1.1, 1.2, 1.1);
      crown.castShadow = true;
      tree.add(crown);
    }

    this.customSpawnGroup.add(tree);
    this.physics.addStaticBox(new THREE.Vector3(pos.x, pos.y + 1.75, pos.z), new THREE.Vector3(0.4, 1.75, 0.4));
    return tree;
  }

  public spawnPumpkin(pos: THREE.Vector3) {
    const pumpkinGroup = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xee6c11, roughness: 0.65 });
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 10), bodyMat);
    body.scale.set(1.15, 0.85, 1.15);
    body.castShadow = true;
    pumpkinGroup.add(body);

    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.05, 0.16, 6),
      new THREE.MeshStandardMaterial({ color: 0x3d5c22, roughness: 0.9 })
    );
    stem.position.y = 0.35;
    pumpkinGroup.add(stem);

    this.scene.add(pumpkinGroup);
    return this.physics.createSphere(0.35, pos, pumpkinGroup as unknown as THREE.Mesh, 3, 'wood', 'Harvest Pumpkin');
  }

  public spawnBoulder(pos: THREE.Vector3) {
    const geo = new THREE.DodecahedronGeometry(0.7, 1);
    const mesh = new THREE.Mesh(geo, this.matStoneWall);
    mesh.castShadow = true;
    this.scene.add(mesh);
    return this.physics.createSphere(0.7, pos, mesh, 45, 'stone', 'River Boulder');
  }

  public spawnLanternProp(pos: THREE.Vector3) {
    const lantern = new THREE.Group();
    lantern.position.copy(pos);

    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.45, 0.3), this.matIron);
    lantern.add(frame);

    const light = new THREE.PointLight(0xff9922, 2.0, 14);
    lantern.add(light);
    this.weather.registerLantern(light);

    this.customSpawnGroup.add(lantern);
    return lantern;
  }

  public clearCustomSpawns() {
    while (this.customSpawnGroup.children.length > 0) {
      const obj = this.customSpawnGroup.children[0];
      this.customSpawnGroup.remove(obj);
    }
  }
}
