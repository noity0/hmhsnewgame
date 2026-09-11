import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import { sound } from './audio';

export interface PhysicsObject {
  mesh: THREE.Object3D;
  body: CANNON.Body;
  materialType: 'wood' | 'metal' | 'stone';
  isHeld?: boolean;
  name: string;
}

export interface StaticBoxCollider {
  center: THREE.Vector3;
  halfExtents: THREE.Vector3;
  rotationY: number;
}

export interface StaticCylinderCollider {
  center: THREE.Vector3;
  radius: number;
  height: number;
}

export class PhysicsWorld {
  public world: CANNON.World;
  public objects: PhysicsObject[] = [];
  public staticBodies: CANNON.Body[] = [];
  public staticColliders: StaticBoxCollider[] = [];
  public staticCylinders: StaticCylinderCollider[] = [];

  // Materials
  private groundMaterial: CANNON.Material;
  private woodMaterial: CANNON.Material;
  private metalMaterial: CANNON.Material;
  private stoneMaterial: CANNON.Material;

  public heldObject: PhysicsObject | null = null;
  public isZeroGravity: boolean = false;

  constructor() {
    this.world = new CANNON.World();
    this.world.gravity.set(0, -9.82, 0);
    this.world.allowSleep = true;

    // Contact Materials
    this.groundMaterial = new CANNON.Material('ground');
    this.woodMaterial = new CANNON.Material('wood');
    this.metalMaterial = new CANNON.Material('metal');
    this.stoneMaterial = new CANNON.Material('stone');

    // Wood on Ground
    this.world.addContactMaterial(new CANNON.ContactMaterial(this.woodMaterial, this.groundMaterial, {
      friction: 0.55,
      restitution: 0.25,
    }));

    // Metal on Stone
    this.world.addContactMaterial(new CANNON.ContactMaterial(this.metalMaterial, this.stoneMaterial, {
      friction: 0.4,
      restitution: 0.15,
    }));

    // Wood on Wood
    this.world.addContactMaterial(new CANNON.ContactMaterial(this.woodMaterial, this.woodMaterial, {
      friction: 0.6,
      restitution: 0.3,
    }));

    // Stone on Stone
    this.world.addContactMaterial(new CANNON.ContactMaterial(this.stoneMaterial, this.stoneMaterial, {
      friction: 0.7,
      restitution: 0.1,
    }));
  }

  public toggleZeroGravity(): boolean {
    this.isZeroGravity = !this.isZeroGravity;
    this.world.gravity.set(0, this.isZeroGravity ? 0 : -9.82, 0);
    // Wake up all bodies
    this.objects.forEach(obj => obj.body.wakeUp());
    return this.isZeroGravity;
  }

  public addStaticGround(sizeX: number, sizeZ: number, y = 0) {
    const groundBody = new CANNON.Body({
      type: CANNON.Body.STATIC,
      shape: new CANNON.Plane(),
      material: this.groundMaterial,
    });
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    groundBody.position.set(0, y, 0);
    this.world.addBody(groundBody);
    this.staticBodies.push(groundBody);
  }

  public addStaticBox(pos: THREE.Vector3, halfExtents: THREE.Vector3, quat?: THREE.Quaternion) {
    const body = new CANNON.Body({
      type: CANNON.Body.STATIC,
      shape: new CANNON.Box(new CANNON.Vec3(halfExtents.x, halfExtents.y, halfExtents.z)),
      material: this.stoneMaterial,
    });
    body.position.set(pos.x, pos.y, pos.z);
    let rotY = 0;
    if (quat) {
      body.quaternion.set(quat.x, quat.y, quat.z, quat.w);
      const euler = new THREE.Euler().setFromQuaternion(quat, 'YXZ');
      rotY = euler.y;
    }
    this.world.addBody(body);
    this.staticBodies.push(body);

    // Register static collider for player anti-clipping collision resolution
    this.staticColliders.push({
      center: pos.clone(),
      halfExtents: halfExtents.clone(),
      rotationY: rotY,
    });

    return body;
  }

  // Cylindrical static collider for well, windmill, and tree trunks (100% impenetrable at any angle)
  public addStaticCylinder(center: THREE.Vector3, radius: number, height: number) {
    const body = new CANNON.Body({
      type: CANNON.Body.STATIC,
      shape: new CANNON.Cylinder(radius, radius, height, 16),
      material: this.stoneMaterial,
    });
    body.position.set(center.x, center.y, center.z);
    this.world.addBody(body);
    this.staticBodies.push(body);

    this.staticCylinders.push({
      center: center.clone(),
      radius,
      height,
    });

    return body;
  }

  // Deep Wall Collision Resolution - Prevents passing through house walls, buildings, fences, well, or props
  public resolvePlayerCollision(
    newPos: THREE.Vector3,
    radius = 0.44,
    playerHeight = 1.8
  ): THREE.Vector3 {
    const resolved = newPos.clone();
    const playerBottom = resolved.y - playerHeight;
    const playerTop = resolved.y + 0.1;

    // Multi-pass resolution for corners and complex geometry
    for (let pass = 0; pass < 2; pass++) {
      // 1. Resolve against static cylinders (Well, Windmill tower, Trees)
      for (let i = 0; i < this.staticCylinders.length; i++) {
        const cyl = this.staticCylinders[i];
        const cylBottom = cyl.center.y - cyl.height / 2;
        const cylTop = cyl.center.y + cyl.height / 2;

        if (playerTop < cylBottom || playerBottom > cylTop) {
          continue;
        }

        const dx = resolved.x - cyl.center.x;
        const dz = resolved.z - cyl.center.z;
        const distSq = dx * dx + dz * dz;
        const minDist = cyl.radius + radius;

        if (distSq < minDist * minDist) {
          const dist = Math.sqrt(distSq);
          if (dist > 0.0001) {
            resolved.x = cyl.center.x + (dx / dist) * minDist;
            resolved.z = cyl.center.z + (dz / dist) * minDist;
          } else {
            resolved.x = cyl.center.x + minDist;
          }
        }
      }

      // 2. Resolve against static boxes (Walls, Buildings, Fences, Market Tables)
      for (let i = 0; i < this.staticColliders.length; i++) {
        const box = this.staticColliders[i];
        const boxBottom = box.center.y - box.halfExtents.y;
        const boxTop = box.center.y + box.halfExtents.y;

        // Vertical overlap check
        if (playerTop < boxBottom || playerBottom > boxTop) {
          continue;
        }

        // XZ collision check
        if (Math.abs(box.rotationY) < 0.01) {
          // Axis-aligned bounding box test
          const minX = box.center.x - box.halfExtents.x;
          const maxX = box.center.x + box.halfExtents.x;
          const minZ = box.center.z - box.halfExtents.z;
          const maxZ = box.center.z + box.halfExtents.z;

          const closestX = Math.max(minX, Math.min(resolved.x, maxX));
          const closestZ = Math.max(minZ, Math.min(resolved.z, maxZ));

          const dx = resolved.x - closestX;
          const dz = resolved.z - closestZ;
          const distSq = dx * dx + dz * dz;

          if (distSq < radius * radius) {
            const dist = Math.sqrt(distSq);
            if (dist > 0.0001) {
              const overlap = radius - dist;
              resolved.x += (dx / dist) * overlap;
              resolved.z += (dz / dist) * overlap;
            } else {
              // Deep inside: push out along shortest axis
              const toMinX = Math.abs(resolved.x - minX);
              const toMaxX = Math.abs(maxX - resolved.x);
              const toMinZ = Math.abs(resolved.z - minZ);
              const toMaxZ = Math.abs(maxZ - resolved.z);
              const minPen = Math.min(toMinX, toMaxX, toMinZ, toMaxZ);
              if (minPen === toMinX) resolved.x = minX - radius;
              else if (minPen === toMaxX) resolved.x = maxX + radius;
              else if (minPen === toMinZ) resolved.z = minZ - radius;
              else resolved.z = maxZ + radius;
            }
          }
        } else {
          // Oriented bounding box test in box local space
          const cos = Math.cos(-box.rotationY);
          const sin = Math.sin(-box.rotationY);

          const relX = resolved.x - box.center.x;
          const relZ = resolved.z - box.center.z;

          const localX = cos * relX - sin * relZ;
          const localZ = sin * relX + cos * relZ;

          const closestLocalX = Math.max(-box.halfExtents.x, Math.min(localX, box.halfExtents.x));
          const closestLocalZ = Math.max(-box.halfExtents.z, Math.min(localZ, box.halfExtents.z));

          const locDx = localX - closestLocalX;
          const locDz = localZ - closestLocalZ;
          const distSq = locDx * locDx + locDz * locDz;

          if (distSq < radius * radius) {
            const dist = Math.sqrt(distSq);
            let pushLocalX = 0;
            let pushLocalZ = 0;

            if (dist > 0.0001) {
              const overlap = radius - dist;
              pushLocalX = (locDx / dist) * overlap;
              pushLocalZ = (locDz / dist) * overlap;
            } else {
              const toMinX = Math.abs(localX - (-box.halfExtents.x));
              const toMaxX = Math.abs(box.halfExtents.x - localX);
              const toMinZ = Math.abs(localZ - (-box.halfExtents.z));
              const toMaxZ = Math.abs(box.halfExtents.z - localZ);
              const minPen = Math.min(toMinX, toMaxX, toMinZ, toMaxZ);
              if (minPen === toMinX) pushLocalX = -box.halfExtents.x - radius - localX;
              else if (minPen === toMaxX) pushLocalX = box.halfExtents.x + radius - localX;
              else if (minPen === toMinZ) pushLocalZ = -box.halfExtents.z - radius - localZ;
              else pushLocalZ = box.halfExtents.z + radius - localZ;
            }

            const cosW = Math.cos(box.rotationY);
            const sinW = Math.sin(box.rotationY);
            resolved.x += cosW * pushLocalX - sinW * pushLocalZ;
            resolved.z += sinW * pushLocalX + cosW * pushLocalZ;
          }
        }
      }

      // 3. Resolve against dynamic physics props (Crates, Barrels, Anvils)
      for (let i = 0; i < this.objects.length; i++) {
        const obj = this.objects[i];
        if (obj.isHeld) continue;
        const objY = obj.body.position.y;
        if (Math.abs(resolved.y - 0.9 - objY) > 1.2) continue;

        const dx = resolved.x - obj.body.position.x;
        const dz = resolved.z - obj.body.position.z;
        const distSq = dx * dx + dz * dz;
        const minDist = 0.7 + radius;

        if (distSq < minDist * minDist) {
          const dist = Math.sqrt(distSq);
          if (dist > 0.0001) {
            const push = (minDist - dist) * 0.5;
            resolved.x += (dx / dist) * push;
            resolved.z += (dz / dist) * push;
            obj.body.wakeUp();
            obj.body.position.x -= (dx / dist) * push;
            obj.body.position.z -= (dz / dist) * push;
          }
        }
      }
    }

    return resolved;
  }

  public registerDynamicObject(
    mesh: THREE.Object3D,
    body: CANNON.Body,
    materialType: 'wood' | 'metal' | 'stone',
    name: string
  ): PhysicsObject {
    this.world.addBody(body);

    const physObj: PhysicsObject = { mesh, body, materialType, name };
    this.objects.push(physObj);

    // Collision sound handler
    body.addEventListener('collide', (e: { contact: { getImpactVelocityAlongNormal: () => number } }) => {
      const relVel = Math.abs(e.contact.getImpactVelocityAlongNormal());
      if (relVel > 0.8) {
        sound.playImpact(materialType, Math.min(1, relVel / 6));
      }
    });

    return physObj;
  }

  // Create standard dynamic objects
  public createBox(
    size: THREE.Vector3,
    position: THREE.Vector3,
    mesh: THREE.Mesh,
    mass = 5,
    materialType: 'wood' | 'metal' | 'stone' = 'wood',
    name = 'Wooden Crate'
  ): PhysicsObject {
    const shape = new CANNON.Box(new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2));
    const mat = materialType === 'wood' ? this.woodMaterial : materialType === 'metal' ? this.metalMaterial : this.stoneMaterial;
    const body = new CANNON.Body({
      mass,
      shape,
      material: mat,
      position: new CANNON.Vec3(position.x, position.y, position.z),
    });
    body.linearDamping = 0.05;
    body.angularDamping = 0.05;
    return this.registerDynamicObject(mesh, body, materialType, name);
  }

  public createCylinder(
    radiusTop: number,
    radiusBottom: number,
    height: number,
    position: THREE.Vector3,
    mesh: THREE.Mesh,
    mass = 8,
    name = 'Wooden Barrel'
  ): PhysicsObject {
    const shape = new CANNON.Cylinder(radiusTop, radiusBottom, height, 12);
    const body = new CANNON.Body({
      mass,
      shape,
      material: this.woodMaterial,
      position: new CANNON.Vec3(position.x, position.y, position.z),
    });
    body.linearDamping = 0.08;
    body.angularDamping = 0.08;
    return this.registerDynamicObject(mesh, body, 'wood', name);
  }

  public createSphere(
    radius: number,
    position: THREE.Vector3,
    mesh: THREE.Mesh,
    mass = 12,
    materialType: 'wood' | 'metal' | 'stone' = 'metal',
    name = 'Heavy Sphere'
  ): PhysicsObject {
    const shape = new CANNON.Sphere(radius);
    const mat = materialType === 'wood' ? this.woodMaterial : materialType === 'metal' ? this.metalMaterial : this.stoneMaterial;
    const body = new CANNON.Body({
      mass,
      shape,
      material: mat,
      position: new CANNON.Vec3(position.x, position.y, position.z),
    });
    return this.registerDynamicObject(mesh, body, materialType, name);
  }

  public pickUp(obj: PhysicsObject) {
    if (this.heldObject) {
      this.dropHeld();
    }
    this.heldObject = obj;
    obj.isHeld = true;
    obj.body.wakeUp();
    obj.body.velocity.set(0, 0, 0);
    obj.body.angularVelocity.set(0, 0, 0);
  }

  public dropHeld() {
    if (this.heldObject) {
      this.heldObject.isHeld = false;
      this.heldObject = null;
    }
  }

  public throwHeld(direction: THREE.Vector3, strength = 14) {
    if (!this.heldObject) return;
    const body = this.heldObject.body;
    body.wakeUp();
    this.heldObject.isHeld = false;
    sound.playWhoosh();

    const impulse = new CANNON.Vec3(
      direction.x * strength,
      (direction.y + 0.15) * strength,
      direction.z * strength
    );
    body.applyImpulse(impulse);
    // Add realistic tumble rotation
    body.angularVelocity.set(
      (Math.random() - 0.5) * 8,
      (Math.random() - 0.5) * 8,
      (Math.random() - 0.5) * 8
    );
    this.heldObject = null;
  }

  public update(delta: number, holdTargetPos?: THREE.Vector3) {
    // 120 FPS high-precision physics sub-stepping with optimized contact solver
    const fixedDelta = Math.min(delta, 0.033);
    this.world.step(1 / 120, fixedDelta, 4);

    // Synchronize meshes with Cannon bodies
    for (let i = 0; i < this.objects.length; i++) {
      const { mesh, body, isHeld } = this.objects[i];

      if (isHeld && holdTargetPos) {
        // Move towards hold target position smoothly using velocity
        const curPos = body.position;
        const targetVec = new CANNON.Vec3(holdTargetPos.x, holdTargetPos.y, holdTargetPos.z);
        const diff = targetVec.vsub(curPos);
        body.velocity.set(diff.x * 12, diff.y * 12, diff.z * 12);
        body.angularVelocity.set(0, 0, 0);
      }

      mesh.position.set(body.position.x, body.position.y, body.position.z);
      mesh.quaternion.set(body.quaternion.x, body.quaternion.y, body.quaternion.z, body.quaternion.w);
    }
  }

  public setQuality(preset: 'low' | 'middle' | 'high' | 'max') {
    const solver = this.world.solver as CANNON.GSSolver;
    if (solver && 'iterations' in solver) {
      if (preset === 'low') {
        solver.iterations = 2;
      } else if (preset === 'middle') {
        solver.iterations = 4;
      } else if (preset === 'high') {
        solver.iterations = 6;
      } else {
        solver.iterations = 8;
      }
    }
  }

  public removeObject(obj: PhysicsObject) {
    this.world.removeBody(obj.body);
    const index = this.objects.indexOf(obj);
    if (index !== -1) {
      this.objects.splice(index, 1);
    }
  }
}
