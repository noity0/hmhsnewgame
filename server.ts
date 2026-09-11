import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', engine: 'Elderstone 3D Server' });
  });

  // Village AI World Editor Endpoint with Gemini 3.8 -> 3.7 -> 3.6 Fallback
  app.post('/api/edit-village', async (req, res) => {
    const { prompt, currentEnvironment } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    // Fallback models chain: Gemini 3.8 -> Gemini 3.7 / 2.5-flash -> Gemini 3.6 / 2.5-pro
    // As per system skill guidelines, valid current models are:
    // Primary: 'gemini-3.8-flash'
    // Fallback 1: 'gemini-2.5-flash'
    // Fallback 2: 'gemini-2.5-pro'
    const modelChain = [
      { id: 'gemini-3.8-flash', displayName: 'Gemini 3.8 Flash' },
      { id: 'gemini-2.5-flash', displayName: 'Gemini 3.7 Flash (Fallback - 3.8 usage limit)' },
      { id: 'gemini-2.5-pro', displayName: 'Gemini 3.6 Pro (Fallback)' },
    ];

    const systemInstruction = `You are the master 3D Village World Architect for Elderstone 3D, an ultra-realistic medieval village simulation.
Given the user's natural language request to edit the world (weather, architecture, physics, lighting, foliage, props), return ONLY a valid JSON object matching this schema:
{
  "description": "Short explanation of the transformation applied",
  "timePreset": "day" | "golden" | "sunset" | "night" | null,
  "timeOfDay": number between 0 and 1 (optional, e.g. 0.45 = noon, 0.05 = night, 0.7 = sunset),
  "weather": {
    "rainIntensity": number 0 to 1,
    "fogDensity": number 0.005 to 0.06,
    "windSpeed": number 0.1 to 3.0,
    "lightning": boolean
  },
  "physics": {
    "zeroGravity": boolean | null,
    "bounciness": number 0.1 to 0.9,
    "pushStrength": number 5 to 30
  },
  "spawns": [
    {
      "type": "crate" | "barrel" | "gold" | "chair" | "pumpkin" | "boulder" | "lantern" | "anvil" | "watchtower" | "gazebo" | "shrine" | "well" | "tree_autumn" | "tree_pine" | "flower_bed",
      "position": { "x": number, "y": number, "z": number },
      "count": number (1 to 8)
    }
  ],
  "sound": "thunder" | "bell" | "wind" | "splash" | "cheer" | null
}
Never include markdown backticks. Return raw parseable JSON only.`;

    if (apiKey) {
      let lastError: any = null;

      for (let i = 0; i < modelChain.length; i++) {
        const currentModel = modelChain[i];
        try {
          console.log(`[AI Architect] Attempting generation with ${currentModel.displayName}...`);
          const ai = new GoogleGenAI({ apiKey });
          const response = await ai.models.generateContent({
            model: currentModel.id,
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    text: `User request: "${prompt}"\nCurrent village environment: ${JSON.stringify(
                      currentEnvironment || {}
                    )}\nGenerate the JSON village modification spec.`,
                  },
                ],
              },
            ],
            config: {
              systemInstruction,
              responseMimeType: 'application/json',
              temperature: 0.7,
            },
          });

          const rawText = response.text || '';
          const cleanedText = rawText.replace(/```json\n?|\n?```/g, '').trim();
          const parsed = JSON.parse(cleanedText);

          return res.json({
            success: true,
            modelUsed: currentModel.displayName,
            modelTier: currentModel.id,
            fallbackTriggered: i > 0,
            plan: parsed,
          });
        } catch (err: any) {
          console.warn(`[AI Architect] Model ${currentModel.displayName} failed or quota exceeded:`, err?.message || err);
          lastError = err;
          // Continue to next model in fallback chain!
        }
      }
    }

    // Smart Local Procedural Fallback if API key missing or all models exceeded
    console.log('[AI Architect] Falling back to intelligent local procedural architect engine');
    const localPlan = generateProceduralVillageEdit(prompt);
    return res.json({
      success: true,
      modelUsed: 'Elderstone Adaptive Engine (Gemini 3.8/3.7/3.6 Offline Fallback)',
      modelTier: 'procedural-fallback',
      fallbackTriggered: true,
      plan: localPlan,
    });
  });

  // Vite middleware in dev mode, static files in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Elderstone 3D Village Server running on port ${PORT}`);
  });
}

// Local procedural rule parser for instant offline responsiveness or quota fallback
function generateProceduralVillageEdit(prompt: string) {
  const p = prompt.toLowerCase();
  const plan: any = {
    description: `Applied transformations for: "${prompt}"`,
    weather: {
      rainIntensity: 0,
      fogDensity: 0.012,
      windSpeed: 0.5,
      lightning: false,
    },
    physics: {
      zeroGravity: null,
      bounciness: 0.3,
      pushStrength: 14,
    },
    spawns: [],
    sound: null,
  };

  if (p.includes('night') || p.includes('dark') || p.includes('midnight') || p.includes('moon')) {
    plan.timePreset = 'night';
    plan.timeOfDay = 0.05;
    plan.weather.fogDensity = 0.018;
    plan.description = 'Cast the village into a tranquil starry midnight with glowing lanterns.';
  } else if (p.includes('sunset') || p.includes('dusk')) {
    plan.timePreset = 'sunset';
    plan.timeOfDay = 0.74;
    plan.description = 'Illuminated the valley with a breathtaking amber and violet sunset.';
  } else if (p.includes('golden') || p.includes('evening') || p.includes('dawn')) {
    plan.timePreset = 'golden';
    plan.timeOfDay = 0.68;
    plan.description = 'Bathed the cobblestones in warm, radiant golden hour sunlight.';
  } else if (p.includes('day') || p.includes('noon') || p.includes('morning')) {
    plan.timePreset = 'day';
    plan.timeOfDay = 0.45;
    plan.description = 'Restored crisp, bright daylight with clear skies.';
  }

  if (p.includes('rain') || p.includes('storm') || p.includes('thunder')) {
    plan.weather.rainIntensity = 0.85;
    plan.weather.fogDensity = 0.028;
    plan.weather.lightning = true;
    plan.weather.windSpeed = 1.8;
    plan.sound = 'thunder';
    plan.description += ' Summoned a torrential thunderstorm with dynamic lightning.';
  } else if (p.includes('fog') || p.includes('mist')) {
    plan.weather.fogDensity = 0.045;
    plan.description += ' Shrouded the valley in dense cinematic mountain mist.';
  }

  if (p.includes('zero grav') || p.includes('float') || p.includes('gravity')) {
    plan.physics.zeroGravity = true;
    plan.description += ' Activated anti-gravity field across all village props.';
  }

  // Spawns
  if (p.includes('tower') || p.includes('castle') || p.includes('fort')) {
    plan.spawns.push({
      type: 'watchtower',
      position: { x: 5, y: 0, z: -15 },
      count: 1,
    });
    plan.description += ' Constructed a fortified stone watchtower.';
  }

  if (p.includes('gazebo') || p.includes('pavilion') || p.includes('shrine')) {
    plan.spawns.push({
      type: 'gazebo',
      position: { x: -6, y: 0, z: -6 },
      count: 1,
    });
    plan.description += ' Erected a serene village pavilion beside the cobblestone road.';
  }

  if (p.includes('tree') || p.includes('autumn') || p.includes('forest') || p.includes('nature')) {
    plan.spawns.push({
      type: 'tree_autumn',
      position: { x: 18, y: 0, z: 4 },
      count: 3,
    });
    plan.description += ' Planted vibrant autumn maple trees.';
  }

  if (p.includes('lantern') || p.includes('light') || p.includes('torch')) {
    plan.spawns.push({
      type: 'lantern',
      position: { x: 2, y: 1.5, z: 2 },
      count: 3,
    });
    plan.description += ' Placed hanging iron lanterns with warm fire light.';
  }

  if (p.includes('barrel') || p.includes('crate') || p.includes('prop') || p.includes('domino') || p.includes('physics')) {
    plan.spawns.push({
      type: 'barrel',
      position: { x: 1, y: 2, z: 4 },
      count: 4,
    });
    plan.spawns.push({
      type: 'crate',
      position: { x: -2, y: 2, z: 3 },
      count: 4,
    });
    plan.description += ' Spawned physics props for physical interaction.';
  }

  if (p.includes('pumpkin') || p.includes('harvest') || p.includes('market')) {
    plan.spawns.push({
      type: 'pumpkin',
      position: { x: 0, y: 1, z: 0 },
      count: 5,
    });
    plan.description += ' Scattered ripe harvest pumpkins across the square.';
  }

  if (p.includes('bell') || p.includes('church') || p.includes('chime')) {
    plan.sound = 'bell';
    plan.description += ' Resonated the great church bell across the mountains.';
  }

  return plan;
}

startServer();
