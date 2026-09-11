import * as THREE from 'three';

// Procedural high-fidelity textures & normal maps for ultra-realistic PBR materials
const textureCache = new Map<string, THREE.CanvasTexture>();

function createNoise(ctx: CanvasRenderingContext2D, width: number, height: number, opacity = 0.05) {
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 255 * opacity;
    data[i] = Math.min(255, Math.max(0, data[i] + noise));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
  }
  ctx.putImageData(imgData, 0, 0);
}

// Convert a grayscale heightmap canvas into a high-fidelity tangent-space normal map
function generateNormalMap(srcCanvas: HTMLCanvasElement, strength = 2.5): THREE.CanvasTexture {
  const width = srcCanvas.width;
  const height = srcCanvas.height;
  const srcCtx = srcCanvas.getContext('2d')!;
  const srcData = srcCtx.getImageData(0, 0, width, height).data;

  const normalCanvas = document.createElement('canvas');
  normalCanvas.width = width;
  normalCanvas.height = height;
  const normCtx = normalCanvas.getContext('2d')!;
  const normImg = normCtx.createImageData(width, height);
  const dst = normImg.data;

  const getIntensity = (x: number, y: number) => {
    const px = ((x + width) % width);
    const py = ((y + height) % height);
    const idx = (py * width + px) * 4;
    return (srcData[idx] * 0.299 + srcData[idx + 1] * 0.587 + srcData[idx + 2] * 0.114) / 255;
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Sobel gradient
      const tl = getIntensity(x - 1, y - 1);
      const l = getIntensity(x - 1, y);
      const bl = getIntensity(x - 1, y + 1);
      const tr = getIntensity(x + 1, y - 1);
      const r = getIntensity(x + 1, y);
      const br = getIntensity(x + 1, y + 1);
      const t = getIntensity(x, y - 1);
      const b = getIntensity(x, y + 1);

      const dX = (tr + 2.0 * r + br) - (tl + 2.0 * l + bl);
      const dY = (bl + 2.0 * b + br) - (tl + 2.0 * t + tr);

      let nx = -dX * strength;
      let ny = -dY * strength;
      let nz = 1.0;

      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
      nx /= len;
      ny /= len;
      nz /= len;

      const idx = (y * width + x) * 4;
      dst[idx] = Math.floor((nx * 0.5 + 0.5) * 255);
      dst[idx + 1] = Math.floor((ny * 0.5 + 0.5) * 255);
      dst[idx + 2] = Math.floor((nz * 0.5 + 0.5) * 255);
      dst[idx + 3] = 255;
    }
  }

  normCtx.putImageData(normImg, 0, 0);
  const tex = new THREE.CanvasTexture(normalCanvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

// COBBLESTONE ALBEDO & NORMAL
let cobbleCanvasCache: HTMLCanvasElement | null = null;

function getCobbleBaseCanvas(): HTMLCanvasElement {
  if (cobbleCanvasCache) return cobbleCanvasCache;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#262420';
  ctx.fillRect(0, 0, 512, 512);

  const rows = 16;
  const cols = 16;
  const rh = 512 / rows;
  const cw = 512 / cols;

  for (let r = 0; r < rows; r++) {
    const offset = (r % 2) * (cw / 2);
    for (let c = -1; c <= cols; c++) {
      const x = c * cw + offset + (Math.random() * 4 - 2);
      const y = r * rh + (Math.random() * 4 - 2);
      const w = cw - 6 + (Math.random() * 4 - 2);
      const h = rh - 6 + (Math.random() * 4 - 2);

      const shade = Math.floor(95 + Math.random() * 45);
      const rVal = shade + Math.floor(Math.random() * 12 - 6);
      const gVal = shade + Math.floor(Math.random() * 8 - 4);
      const bVal = shade - 6 + Math.floor(Math.random() * 8 - 4);

      const grad = ctx.createRadialGradient(x + w / 2, y + h / 2, 2, x + w / 2, y + h / 2, w / 1.4);
      grad.addColorStop(0, `rgb(${rVal + 30}, ${gVal + 28}, ${bVal + 20})`);
      grad.addColorStop(0.7, `rgb(${rVal}, ${gVal}, ${bVal})`);
      grad.addColorStop(1, `rgb(${rVal - 35}, ${gVal - 35}, ${bVal - 35})`);

      ctx.fillStyle = grad;
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(x, y, w, h, [7]);
      } else {
        ctx.rect(x, y, w, h);
      }
      ctx.fill();
    }
  }

  createNoise(ctx, 512, 512, 0.08);
  cobbleCanvasCache = canvas;
  return canvas;
}

export function getCobblestoneTexture(): THREE.CanvasTexture {
  if (textureCache.has('cobble')) return textureCache.get('cobble')!;
  const canvas = getCobbleBaseCanvas();
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(6, 6);
  textureCache.set('cobble', texture);
  return texture;
}

export function getCobblestoneNormalMap(): THREE.CanvasTexture {
  if (textureCache.has('cobble_norm')) return textureCache.get('cobble_norm')!;
  const baseCanvas = getCobbleBaseCanvas();
  const normalTex = generateNormalMap(baseCanvas, 3.2);
  normalTex.repeat.set(6, 6);
  textureCache.set('cobble_norm', normalTex);
  return normalTex;
}

// WOOD PLANK ALBEDO & NORMAL
let woodCanvasCache: HTMLCanvasElement | null = null;

function getWoodBaseCanvas(): HTMLCanvasElement {
  if (woodCanvasCache) return woodCanvasCache;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const planks = 8;
  const ph = 512 / planks;

  for (let i = 0; i < planks; i++) {
    const y = i * ph;
    const baseTone = 80 + (i % 3) * 14;
    ctx.fillStyle = `rgb(${baseTone + 35}, ${baseTone + 15}, ${baseTone - 10})`;
    ctx.fillRect(0, y, 512, ph - 3);

    // Dark recessed groove between planks
    ctx.fillStyle = '#140c06';
    ctx.fillRect(0, y + ph - 3, 512, 3);

    // Wood grain lines
    ctx.strokeStyle = `rgba(${baseTone - 20}, ${baseTone - 35}, ${baseTone - 50}, 0.3)`;
    ctx.lineWidth = 1.5;
    for (let g = 0; g < 18; g++) {
      ctx.beginPath();
      const gy = y + Math.random() * (ph - 6);
      ctx.moveTo(0, gy);
      ctx.bezierCurveTo(
        140,
        gy + (Math.random() * 8 - 4),
        360,
        gy + (Math.random() * 8 - 4),
        512,
        gy + (Math.random() * 6 - 3)
      );
      ctx.stroke();
    }

    // Nail heads
    ctx.fillStyle = '#110d0a';
    ctx.beginPath();
    ctx.arc(30, y + ph / 2, 2.5, 0, Math.PI * 2);
    ctx.arc(482, y + ph / 2, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  createNoise(ctx, 512, 512, 0.05);
  woodCanvasCache = canvas;
  return canvas;
}

export function getWoodPlankTexture(): THREE.CanvasTexture {
  if (textureCache.has('wood')) return textureCache.get('wood')!;
  const canvas = getWoodBaseCanvas();
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  textureCache.set('wood', texture);
  return texture;
}

export function getWoodPlankNormalMap(): THREE.CanvasTexture {
  if (textureCache.has('wood_norm')) return textureCache.get('wood_norm')!;
  const baseCanvas = getWoodBaseCanvas();
  const normalTex = generateNormalMap(baseCanvas, 2.8);
  normalTex.repeat.set(3, 3);
  textureCache.set('wood_norm', normalTex);
  return normalTex;
}

// STONE WALL ALBEDO & NORMAL
let stoneWallCanvasCache: HTMLCanvasElement | null = null;

function getStoneWallBaseCanvas(): HTMLCanvasElement {
  if (stoneWallCanvasCache) return stoneWallCanvasCache;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#312d29';
  ctx.fillRect(0, 0, 512, 512);

  const rows = 12;
  const rh = 512 / rows;
  for (let r = 0; r < rows; r++) {
    const cols = 6;
    const cw = 512 / cols;
    const offset = (r % 2) * (cw / 2);
    for (let c = -1; c <= cols; c++) {
      const x = c * cw + offset;
      const y = r * rh;
      const shade = 100 + Math.floor(Math.random() * 45);
      const grad = ctx.createLinearGradient(x, y, x + cw, y + rh);
      grad.addColorStop(0, `rgb(${shade + 15}, ${shade + 12}, ${shade})`);
      grad.addColorStop(1, `rgb(${shade - 30}, ${shade - 30}, ${shade - 32})`);
      ctx.fillStyle = grad;
      ctx.fillRect(x + 2, y + 2, cw - 4, rh - 4);
    }
  }

  createNoise(ctx, 512, 512, 0.1);
  stoneWallCanvasCache = canvas;
  return canvas;
}

export function getStoneWallTexture(): THREE.CanvasTexture {
  if (textureCache.has('stonewall')) return textureCache.get('stonewall')!;
  const canvas = getStoneWallBaseCanvas();
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  textureCache.set('stonewall', texture);
  return texture;
}

export function getStoneWallNormalMap(): THREE.CanvasTexture {
  if (textureCache.has('stonewall_norm')) return textureCache.get('stonewall_norm')!;
  const base = getStoneWallBaseCanvas();
  const normalTex = generateNormalMap(base, 3.4);
  normalTex.repeat.set(2, 2);
  textureCache.set('stonewall_norm', normalTex);
  return normalTex;
}

// ROOF TILE ALBEDO & NORMAL
let roofCanvasCache: HTMLCanvasElement | null = null;

function getRoofBaseCanvas(): HTMLCanvasElement {
  if (roofCanvasCache) return roofCanvasCache;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#2c140e';
  ctx.fillRect(0, 0, 512, 512);

  const rows = 16;
  const rh = 512 / rows;
  for (let r = 0; r < rows; r++) {
    const cols = 12;
    const cw = 512 / cols;
    const offset = (r % 2) * (cw / 2);
    for (let c = -1; c <= cols; c++) {
      const x = c * cw + offset;
      const y = r * rh;
      const shade = Math.floor(Math.random() * 32);
      ctx.fillStyle = `rgb(${135 + shade}, ${48 + shade / 2}, ${35 + shade / 3})`;
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(x + 1, y + 1, cw - 2, rh - 2, [0, 0, 8, 8]);
      } else {
        ctx.rect(x + 1, y + 1, cw - 2, rh - 2);
      }
      ctx.fill();
    }
  }

  createNoise(ctx, 512, 512, 0.08);
  roofCanvasCache = canvas;
  return canvas;
}

export function getRoofTileTexture(): THREE.CanvasTexture {
  if (textureCache.has('roof')) return textureCache.get('roof')!;
  const canvas = getRoofBaseCanvas();
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  textureCache.set('roof', texture);
  return texture;
}

export function getRoofTileNormalMap(): THREE.CanvasTexture {
  if (textureCache.has('roof_norm')) return textureCache.get('roof_norm')!;
  const base = getRoofBaseCanvas();
  const normalTex = generateNormalMap(base, 2.6);
  normalTex.repeat.set(4, 4);
  textureCache.set('roof_norm', normalTex);
  return normalTex;
}

// GRASS & MEADOW
let grassCanvasCache: HTMLCanvasElement | null = null;

function getGrassBaseCanvas(): HTMLCanvasElement {
  if (grassCanvasCache) return grassCanvasCache;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#3a5f2a';
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 450; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = 5 + Math.random() * 26;
    const tone = Math.random();
    if (tone > 0.65) {
      ctx.fillStyle = 'rgba(78, 132, 50, 0.4)';
    } else if (tone > 0.3) {
      ctx.fillStyle = 'rgba(40, 72, 28, 0.4)';
    } else {
      ctx.fillStyle = 'rgba(84, 68, 44, 0.25)'; // loam / peat
    }
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  createNoise(ctx, 512, 512, 0.08);
  grassCanvasCache = canvas;
  return canvas;
}

export function getGrassTexture(): THREE.CanvasTexture {
  if (textureCache.has('grass')) return textureCache.get('grass')!;
  const canvas = getGrassBaseCanvas();
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(24, 24);
  textureCache.set('grass', texture);
  return texture;
}

export function getGrassNormalMap(): THREE.CanvasTexture {
  if (textureCache.has('grass_norm')) return textureCache.get('grass_norm')!;
  const base = getGrassBaseCanvas();
  const normalTex = generateNormalMap(base, 1.8);
  normalTex.repeat.set(24, 24);
  textureCache.set('grass_norm', normalTex);
  return normalTex;
}

// BARK TEXTURE & NORMAL
export function getBarkTexture(): THREE.CanvasTexture {
  if (textureCache.has('bark')) return textureCache.get('bark')!;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#3d2514';
  ctx.fillRect(0, 0, 256, 256);

  ctx.strokeStyle = '#27170a';
  ctx.lineWidth = 2.5;
  for (let i = 0; i < 40; i++) {
    ctx.beginPath();
    const x = Math.random() * 256;
    ctx.moveTo(x, 0);
    ctx.lineTo(x + (Math.random() * 10 - 5), 256);
    ctx.stroke();
  }
  createNoise(ctx, 256, 256, 0.1);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 4);
  textureCache.set('bark', texture);
  return texture;
}

export function getBarkNormalMap(): THREE.CanvasTexture {
  if (textureCache.has('bark_norm')) return textureCache.get('bark_norm')!;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 3;
  for (let i = 0; i < 35; i++) {
    ctx.beginPath();
    const x = Math.random() * 256;
    ctx.moveTo(x, 0);
    ctx.lineTo(x + (Math.random() * 12 - 6), 256);
    ctx.stroke();
  }
  const normalTex = generateNormalMap(canvas, 3.0);
  normalTex.repeat.set(1, 4);
  textureCache.set('bark_norm', normalTex);
  return normalTex;
}

// WATER NORMAL MAP (Multi-frequency ripples)
export function getWaterNormalMap(): THREE.CanvasTexture {
  if (textureCache.has('water_norm')) return textureCache.get('water_norm')!;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, 512, 512);

  // Soft wave interference ripples
  for (let i = 0; i < 80; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = 20 + Math.random() * 60;
    const grad = ctx.createRadialGradient(x, y, 1, x, y, r);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
    grad.addColorStop(0.5, 'rgba(128, 128, 128, 0.2)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const normalTex = generateNormalMap(canvas, 1.8);
  normalTex.wrapS = THREE.RepeatWrapping;
  normalTex.wrapT = THREE.RepeatWrapping;
  normalTex.repeat.set(4, 16);
  textureCache.set('water_norm', normalTex);
  return normalTex;
}
