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

<!-- COMMUNITY-CONTRIBUTORS-SECTION -->
## Contributors & community

[![Contributors](https://img.shields.io/github/contributors/noity0/hmhsnewgame?style=flat-square)](https://github.com/noity0/hmhsnewgame/graphs/contributors)
[![Pull requests](https://img.shields.io/github/issues-pr/noity0/hmhsnewgame?style=flat-square)](https://github.com/noity0/hmhsnewgame/pulls)
[![Open issues](https://img.shields.io/github/issues/noity0/hmhsnewgame?style=flat-square)](https://github.com/noity0/hmhsnewgame/issues)

<a href="https://github.com/noity0/hmhsnewgame/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=noity0/hmhsnewgame&max=100&columns=10" alt="GitHub contributors to hmhsnewgame" />
</a>

This live contributor panel is generated from GitHub's repository contribution data. It shows real contributors when GitHub has qualifying contribution records; it does not imply endorsement by other developers or companies.

### How to contribute

1. Check the [open issues](https://github.com/noity0/hmhsnewgame/issues) and [pull requests](https://github.com/noity0/hmhsnewgame/pulls) before starting.
2. Open an issue to discuss substantial changes.
3. Fork the repository and create a focused branch.
4. Keep pull requests small and explain the problem, solution, and testing performed.
5. Update documentation and tests when behavior changes.
6. Never commit API keys, passwords, private data, or other secrets.

### Upstream projects & acknowledgements

This project builds on the open-source tools named in its technology stack. Visit their official documentation and repositories to learn more, and follow each project's license and attribution requirements. Upstream maintainers and well-known developers are not listed as project contributors unless they have verifiable contributions here.

- [GitHub: Contributing to projects](https://docs.github.com/en/get-started/quickstart/contributing-to-projects)
- [GitHub: Project contributors](https://docs.github.com/en/repositories/viewing-activity-and-data-for-your-repository/viewing-a-projects-contributors)
