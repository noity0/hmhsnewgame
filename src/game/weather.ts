import * as THREE from 'three';
import { sound } from './audio';

export type TimePreset = 'day' | 'golden' | 'sunset' | 'night';

export class WeatherSystem {
  public scene: THREE.Scene;
  public sunLight: THREE.DirectionalLight;
  public moonLight: THREE.DirectionalLight;
  public hemiLight: THREE.HemisphereLight;
  public ambientLight: THREE.AmbientLight;
  public lightningLight: THREE.PointLight;
  public sunMesh: THREE.Mesh;
  public moonMesh: THREE.Mesh;
  public skyDome: THREE.Mesh;
  public fog: THREE.FogExp2;
  public lanterns: THREE.PointLight[] = [];

  // 1000x Realism Atmospheric Systems
  public godRays: THREE.Group;
  public cloudGroup: THREE.Group;
  public rainParticles: THREE.Points | null = null;
  public rainPositions: Float32Array | null = null;
  public rainSpeeds: Float32Array | null = null;
  public dustMotes: THREE.Points | null = null;
  public dustPositions: Float32Array | null = null;

  // Weather parameters:
  // Day: 1 sec real = 0.5 hour (30 min) in-game -> 1/48 cycle per real second
  // Night: 1 min real (60 sec) = 2 hours in-game -> 1/720 cycle per real second
  public timeOfDay: number = 0.38; // 0 = midnight, 0.25 = sunrise, 0.5 = noon, 0.75 = sunset
  public dayCycleSpeed: number = 0.5 / 24; // 1 / 48 per second
  public nightCycleSpeed: number = 2 / (60 * 24); // 1 / 720 per second
  public isPaused: boolean = false;
  public rainIntensity: number = 0.0; // 0 = none, 1 = heavy downpour
  public windSpeed: number = 0.6;
  public windAngle: number = 0.4;
  public lightningTimer: number = 0;
  public lightningActive: boolean = false;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    // Atmospheric Fog
    this.fog = new THREE.FogExp2(0xcfe2f3, 0.011);
    this.scene.fog = this.fog;

    // Base Lighting
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.35);
    this.scene.add(this.ambientLight);

    this.hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.5);
    this.hemiLight.position.set(0, 50, 0);
    this.scene.add(this.hemiLight);

    // Sun directional with soft shadow
    this.sunLight = new THREE.DirectionalLight(0xfffaed, 2.4);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 1024;
    this.sunLight.shadow.mapSize.height = 1024;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 130;
    this.sunLight.shadow.camera.left = -45;
    this.sunLight.shadow.camera.right = 45;
    this.sunLight.shadow.camera.top = 45;
    this.sunLight.shadow.camera.bottom = -45;
    this.sunLight.shadow.bias = -0.0004;
    this.scene.add(this.sunLight);

    // Moon directional
    this.moonLight = new THREE.DirectionalLight(0x7da4d4, 0.45);
    this.moonLight.castShadow = false;
    this.scene.add(this.moonLight);

    // Lightning point light
    this.lightningLight = new THREE.PointLight(0xddeeff, 0, 160, 1.2);
    this.lightningLight.position.set(0, 45, 0);
    this.scene.add(this.lightningLight);

    // Visual Sun sphere with radiant halo
    const sunGeo = new THREE.SphereGeometry(3.2, 20, 20);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xfffa77 });
    this.sunMesh = new THREE.Mesh(sunGeo, sunMat);
    this.scene.add(this.sunMesh);

    // Visual Moon sphere with lunar tint
    const moonGeo = new THREE.SphereGeometry(2.4, 20, 20);
    const moonMat = new THREE.MeshBasicMaterial({ color: 0xd9e8ff });
    this.moonMesh = new THREE.Mesh(moonGeo, moonMat);
    this.scene.add(this.moonMesh);

    // Sky Dome
    const skyGeo = new THREE.SphereGeometry(150, 32, 24);
    const skyMat = new THREE.MeshBasicMaterial({
      color: 0x7bb6ec,
      side: THREE.BackSide,
    });
    this.skyDome = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(this.skyDome);

    // Volumetric Sun Rays (God Rays)
    this.godRays = this.createGodRays();
    this.scene.add(this.godRays);

    // 3D Volumetric Clouds
    this.cloudGroup = this.createClouds();
    this.scene.add(this.cloudGroup);

    // Atmospheric Dust / Pollen Motes
    this.setupAtmosphericParticles();

    // Dynamic Rain System
    this.setupRainSystem();

    this.updateLighting();
  }

  // Crepuscular god rays shining from the sun
  private createGodRays(): THREE.Group {
    const group = new THREE.Group();
    const rayCount = 6;
    for (let i = 0; i < rayCount; i++) {
      const coneGeo = new THREE.ConeGeometry(5 + i * 2.5, 90, 8, 1, true);
      const coneMat = new THREE.MeshBasicMaterial({
        color: 0xfff6cf,
        transparent: true,
        opacity: 0.05 - i * 0.005,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const cone = new THREE.Mesh(coneGeo, coneMat);
      cone.rotation.x = Math.PI / 2;
      cone.position.z = 45;
      cone.rotation.z = (i * Math.PI) / 3;
      group.add(cone);
    }
    return group;
  }

  // Realistic fluffy cumulus cloud clusters
  private createClouds(): THREE.Group {
    const group = new THREE.Group();
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 1.0,
      metalness: 0.0,
      transparent: true,
      opacity: 0.85,
      flatShading: true,
    });

    for (let c = 0; c < 12; c++) {
      const cluster = new THREE.Group();
      const puffCount = 5 + Math.floor(Math.random() * 5);
      for (let p = 0; p < puffCount; p++) {
        const r = 6 + Math.random() * 8;
        const puffGeo = new THREE.DodecahedronGeometry(r, 1);
        const puff = new THREE.Mesh(puffGeo, cloudMat);
        puff.position.set(
          (Math.random() - 0.5) * 20,
          (Math.random() - 0.5) * 4,
          (Math.random() - 0.5) * 16
        );
        puff.scale.set(1.4, 0.7, 1.2);
        cluster.add(puff);
      }
      cluster.position.set(
        (Math.random() - 0.5) * 160,
        42 + Math.random() * 12,
        (Math.random() - 0.5) * 160
      );
      group.add(cluster);
    }
    return group;
  }

  // Floating dust motes / golden hour pollen
  private setupAtmosphericParticles() {
    const count = 400;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 70;
      pos[i * 3 + 1] = 0.5 + Math.random() * 12;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 70;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.dustPositions = pos;

    const mat = new THREE.PointsMaterial({
      color: 0xffea9f,
      size: 0.25,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
    });

    this.dustMotes = new THREE.Points(geo, mat);
    this.scene.add(this.dustMotes);
  }

  // Dynamic 3D rain streaks
  private setupRainSystem() {
    const count = 2500;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const speeds = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 90;
      pos[i * 3 + 1] = Math.random() * 45;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 90;
      speeds[i] = 25 + Math.random() * 20;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.rainPositions = pos;
    this.rainSpeeds = speeds;

    const mat = new THREE.PointsMaterial({
      color: 0xbbd5ed,
      size: 0.18,
      transparent: true,
      opacity: 0.0, // hidden initially until rainIntensity > 0
    });

    this.rainParticles = new THREE.Points(geo, mat);
    this.scene.add(this.rainParticles);
  }

  public registerLantern(light: THREE.PointLight) {
    this.lanterns.push(light);
  }

  public setTimePreset(preset: TimePreset) {
    switch (preset) {
      case 'day':
        this.timeOfDay = 0.45;
        this.rainIntensity = 0;
        break;
      case 'golden':
        this.timeOfDay = 0.68;
        this.rainIntensity = 0;
        break;
      case 'sunset':
        this.timeOfDay = 0.74;
        this.rainIntensity = 0;
        break;
      case 'night':
        this.timeOfDay = 0.05;
        break;
    }
    this.updateLighting();
  }

  public setRain(intensity: number) {
    this.rainIntensity = Math.max(0, Math.min(1, intensity));
    if (this.rainIntensity > 0.4 && Math.random() > 0.5) {
      sound.playThunder();
    }
  }

  public setTime(val: number) {
    this.timeOfDay = Math.max(0, Math.min(1, val));
    this.updateLighting();
  }

  public isDaytime(): boolean {
    return this.timeOfDay >= 0.25 && this.timeOfDay < 0.75;
  }

  public isNightTime(): boolean {
    return !this.isDaytime();
  }

  public getCurrentCycleSpeed(): number {
    return this.isDaytime() ? this.dayCycleSpeed : this.nightCycleSpeed;
  }

  public update(delta: number) {
    if (!this.isPaused) {
      const speed = this.getCurrentCycleSpeed();
      this.timeOfDay = (this.timeOfDay + speed * delta) % 1;
      this.updateLighting();
    }

    // Drift clouds across sky with wind
    const windVecX = Math.cos(this.windAngle) * this.windSpeed * delta * 4;
    const windVecZ = Math.sin(this.windAngle) * this.windSpeed * delta * 4;
    this.cloudGroup.children.forEach(c => {
      c.position.x += windVecX;
      c.position.z += windVecZ;
      if (c.position.x > 90) c.position.x = -90;
      if (c.position.x < -90) c.position.x = 90;
      if (c.position.z > 90) c.position.z = -90;
      if (c.position.z < -90) c.position.z = 90;
    });

    // Update Dust Motes
    if (this.dustMotes && this.dustPositions) {
      const count = this.dustPositions.length / 3;
      for (let i = 0; i < count; i++) {
        this.dustPositions[i * 3] += Math.sin(Date.now() * 0.001 + i) * delta * 0.2;
        this.dustPositions[i * 3 + 1] += Math.cos(Date.now() * 0.001 + i * 2) * delta * 0.15;
        if (this.dustPositions[i * 3 + 1] < 0.2) this.dustPositions[i * 3 + 1] = 12;
        if (this.dustPositions[i * 3 + 1] > 14) this.dustPositions[i * 3 + 1] = 0.5;
      }
      this.dustMotes.geometry.attributes.position.needsUpdate = true;
    }

    // Update Rain Particles
    if (this.rainParticles && this.rainPositions && this.rainSpeeds) {
      const mat = this.rainParticles.material as THREE.PointsMaterial;
      mat.opacity = THREE.MathUtils.lerp(mat.opacity, this.rainIntensity * 0.75, delta * 3);

      if (mat.opacity > 0.02) {
        const count = this.rainPositions.length / 3;
        for (let i = 0; i < count; i++) {
          this.rainPositions[i * 3 + 1] -= this.rainSpeeds[i] * delta;
          this.rainPositions[i * 3] += windVecX * 2;
          this.rainPositions[i * 3 + 2] += windVecZ * 2;

          if (this.rainPositions[i * 3 + 1] < 0.1) {
            this.rainPositions[i * 3 + 1] = 40 + Math.random() * 5;
            this.rainPositions[i * 3] = (Math.random() - 0.5) * 90;
            this.rainPositions[i * 3 + 2] = (Math.random() - 0.5) * 90;
          }
        }
        this.rainParticles.geometry.attributes.position.needsUpdate = true;
      }
    }

    // Lightning strikes during storms
    if (this.rainIntensity > 0.5) {
      this.lightningTimer += delta;
      if (this.lightningTimer > 8 + Math.random() * 10) {
        this.triggerLightning();
        this.lightningTimer = 0;
      }
    }
  }

  public triggerLightning() {
    this.lightningActive = true;
    this.lightningLight.intensity = 15;
    this.scene.background = new THREE.Color(0xddeeff);
    sound.playThunder();

    setTimeout(() => {
      this.lightningLight.intensity = 2;
    }, 60);

    setTimeout(() => {
      this.lightningLight.intensity = 18;
    }, 120);

    setTimeout(() => {
      this.lightningLight.intensity = 0;
      this.lightningActive = false;
      this.updateLighting();
    }, 280);
  }

  private updateLighting() {
    if (this.lightningActive) return;

    // Angle in radians (0 = bottom/midnight, 0.5 = top/noon)
    const sunAngle = (this.timeOfDay - 0.25) * Math.PI * 2;
    const distance = 85;

    const sunX = Math.cos(sunAngle) * distance;
    const sunY = Math.sin(sunAngle) * distance;
    const sunZ = Math.sin(sunAngle * 0.5) * 20;

    this.sunLight.position.set(sunX, Math.max(-5, sunY), sunZ);
    this.sunLight.target.position.set(0, 0, 0);
    this.sunMesh.position.set(sunX, sunY, sunZ);

    // Align God rays towards village center
    this.godRays.position.set(sunX, sunY, sunZ);
    this.godRays.lookAt(0, 0, 0);

    // Moon is opposite to sun
    const moonX = -sunX;
    const moonY = -sunY;
    const moonZ = -sunZ;
    this.moonLight.position.set(moonX, Math.max(-5, moonY), moonZ);
    this.moonLight.target.position.set(0, 0, 0);
    this.moonMesh.position.set(moonX, moonY, moonZ);

    const isDay = sunY > 0;
    const sunElevation = sunY / distance; // -1 to 1

    // Sky & Fog color interpolations
    let skyColor: THREE.Color;
    let fogColor: THREE.Color;
    let sunColor: THREE.Color;
    let sunIntensity: number;
    let ambientIntensity: number;
    let lanternIntensity: number;
    let godRayOpacity = 0.0;

    if (sunElevation > 0.25) {
      // Crisp daylight
      skyColor = new THREE.Color(0x78b2e8);
      fogColor = new THREE.Color(0xcbe3f8);
      sunColor = new THREE.Color(0xfff7e6);
      sunIntensity = 2.4;
      ambientIntensity = 0.55;
      lanternIntensity = 0.1;
      godRayOpacity = 0.04;
    } else if (sunElevation > 0.05) {
      // Golden Hour
      const t = (sunElevation - 0.05) / 0.2;
      skyColor = new THREE.Color(0xef9e5f).lerp(new THREE.Color(0x78b2e8), t);
      fogColor = new THREE.Color(0xfdd5b1).lerp(new THREE.Color(0xcbe3f8), t);
      sunColor = new THREE.Color(0xffaa44).lerp(new THREE.Color(0xfff7e6), t);
      sunIntensity = 1.9;
      ambientIntensity = 0.45;
      lanternIntensity = 0.7;
      godRayOpacity = 0.08;
    } else if (sunElevation > -0.1) {
      // Sunset / Dusk
      const t = (sunElevation + 0.1) / 0.15;
      skyColor = new THREE.Color(0x2d2542).lerp(new THREE.Color(0xda5d42), t);
      fogColor = new THREE.Color(0x352b47).lerp(new THREE.Color(0xf59871), t);
      sunColor = new THREE.Color(0xff5522);
      sunIntensity = Math.max(0, t * 1.5);
      ambientIntensity = 0.25;
      lanternIntensity = 1.6;
      godRayOpacity = 0.02;
    } else {
      // Night
      skyColor = new THREE.Color(0x060914);
      fogColor = new THREE.Color(0x090f1e);
      sunColor = new THREE.Color(0x111122);
      sunIntensity = 0.0;
      ambientIntensity = 0.12;
      lanternIntensity = 2.4;
      godRayOpacity = 0.0;
    }

    // Overcast adjustment if raining
    if (this.rainIntensity > 0.2) {
      const stormSky = new THREE.Color(0x263342);
      const stormFog = new THREE.Color(0x303e4d);
      skyColor.lerp(stormSky, this.rainIntensity * 0.85);
      fogColor.lerp(stormFog, this.rainIntensity * 0.85);
      sunIntensity *= (1 - this.rainIntensity * 0.7);
      godRayOpacity = 0.0;
      this.fog.density = THREE.MathUtils.lerp(0.011, 0.028, this.rainIntensity);
    } else {
      this.fog.density = 0.011;
    }

    (this.skyDome.material as THREE.MeshBasicMaterial).color.copy(skyColor);
    this.fog.color.copy(fogColor);
    this.scene.background = skyColor;

    this.sunLight.color.copy(sunColor);
    this.sunLight.intensity = sunIntensity;
    this.sunLight.castShadow = isDay && this.rainIntensity < 0.7;

    this.moonLight.intensity = isDay ? 0.0 : 0.45;
    this.ambientLight.intensity = ambientIntensity;
    this.hemiLight.intensity = ambientIntensity * 1.1;

    // Update God Ray opacity
    this.godRays.children.forEach(c => {
      const mat = (c as THREE.Mesh).material as THREE.MeshBasicMaterial;
      mat.opacity = godRayOpacity;
    });

    // Lanterns illuminate village at dusk & night
    this.lanterns.forEach(l => {
      l.intensity = lanternIntensity;
    });

    // Particle tint: golden at day, cyan/green at night
    if (this.dustMotes) {
      const mat = this.dustMotes.material as THREE.PointsMaterial;
      if (isDay) {
        mat.color.setHex(0xffea9f);
        mat.size = 0.25;
      } else {
        mat.color.setHex(0x6ee7b7); // Fireflies
        mat.size = 0.4;
      }
    }
  }

  public getClockString(): string {
    const totalMinutes = Math.floor(this.timeOfDay * 24 * 60);
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 === 0 ? 12 : hours % 12;
    return `${displayHours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')} ${ampm}`;
  }
}
