# Elderstone 3D — Village Simulation Prototype

[![GitHub stars](https://img.shields.io/github/stars/noity0/hmhsnewgame?style=flat-square)](https://github.com/noity0/hmhsnewgame/stargazers)
[![GitHub issues](https://img.shields.io/github/issues/noity0/hmhsnewgame?style=flat-square)](https://github.com/noity0/hmhsnewgame/issues)
[![Last commit](https://img.shields.io/github/last-commit/noity0/hmhsnewgame?style=flat-square)](https://github.com/noity0/hmhsnewgame/commits/main)

> An experimental browser-based 3D village simulation built around an explorable environment, physics-driven interactions, and AI-assisted features.

Elderstone 3D is an HMHS game prototype using React, Three.js, and the Cannon-es physics engine. The repository combines a browser-rendered 3D scene with a Node.js/Express development server and Gemini API integration.

## Project overview

The project explores:

- A 3D village-style environment.
- Real-time rendering with Three.js.
- Physics simulation using Cannon-es.
- Interactive world and object behavior.
- Character and environment simulation concepts.
- AI-assisted features where configured.

This is an experimental project. Performance depends on the browser, graphics hardware, scene complexity, and device capabilities; no fixed frame rate is guaranteed.

## Technology stack

- React 19 and TypeScript
- Vite 6
- Three.js
- Cannon-es physics
- Node.js and Express
- Google Gemini SDK (`@google/genai`)
- Tailwind CSS, Motion, and Lucide React

## Requirements

- Node.js 22 LTS recommended
- npm
- A modern WebGL-capable browser
- Gemini API key for features that call the AI service

## Install on Windows

```powershell
git clone https://github.com/noity0/hmhsnewgame.git
Set-Location hmhsnewgame
npm install
```

Create a local environment file:

```powershell
Copy-Item .env.example .env
notepad .env
```

Configure your own key:

```dotenv
GEMINI_API_KEY=your_gemini_api_key
APP_URL=http://localhost:3000
```

Do not commit your API key or other private credentials.

## Run locally

```powershell
npm run dev
```

For a production build:

```powershell
npm run build
npm start
```

## Available scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Express/TypeScript development server |
| `npm run build` | Build the Vite frontend and bundle the server |
| `npm start` | Start the built server |
| `npm run preview` | Preview the frontend build |
| `npm run lint` | Run TypeScript checks |

## Performance notes

3D rendering is resource-intensive. Close unnecessary browser tabs, use an up-to-date graphics driver, and test on the target devices. Mobile performance may differ substantially from desktop performance.

## Contributing

Useful contributions include performance profiling, accessible controls, browser compatibility fixes, physics stability, and reproducible bug reports.

- [Issues](https://github.com/noity0/hmhsnewgame/issues)
- [Source code](https://github.com/noity0/hmhsnewgame)

## License

See the repository for a `LICENSE` file. If no license is present, reuse and redistribution are not automatically permitted.

## Search terms

3D village simulation, browser game, Three.js, Cannon-es, physics simulation, React game prototype, WebGL, TypeScript, Gemini AI, HMHS game development.
