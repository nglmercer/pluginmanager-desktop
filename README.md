# Plugin Manager Desktop

> A powerful desktop application for managing plugins, built with [Electrobun](https://electrobun.dev) - the ultra-fast, tiny desktop application framework for TypeScript.

![Electrobun](https://img.shields.io/badge/Built%20with-Electrobun-4A90D9?style=flat-square)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square)
![Bun](https://img.shields.io/badge/Bun-1.0-orange?style=flat-square)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-4.0-38BDF8?style=flat-square)

## 📋 Table of Contents

- [Features](#-features)
- [Screenshots](#-screenshots)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Development](#-development)
- [Building](#-building)
- [Project Structure](#-project-structure)
- [Architecture](#-architecture)
- [Configuration](#-configuration)
- [Internationalization](#-internationalization)
- [Plugin System](#-plugin-system)
- [IPC Communication](#-ipc-communication)
- [Contributing](#-contributing)
- [License](#-license)

## ✨ Features

- **🔌 Plugin Management**: Install, enable, disable, and manage plugins with ease
- **⚡ Ultra-Fast**: Built with Electrobun for <50ms startup time and ~14MB bundle size
- **🎨 Modern UI**: Clean, responsive interface built with Lit and Tailwind CSS
- **🌐 Internationalization**: Multi-language support (English, Spanish)
- **🔧 Rule System**: Configure plugin behavior with flexible rules
- **📱 System Tray**: Quick access from system tray with context menu
- **🔄 Real-time Updates**: Live plugin status updates via IPC
- **🎯 Trigger Editor**: Visual editor for configuring plugin triggers
- **🔒 Secure**: Sandboxed plugin execution with controlled permissions

## 📸 Screenshots

### Main Window
The main interface shows all installed plugins with their status, version, and quick actions.

### Plugin Manager
Easily manage your plugins with enable/disable toggles and detailed information.

### Rule Manager
Configure rules to control plugin behavior and interactions.

### Settings
Customize application preferences and language settings.

## 📦 Prerequisites

Before you begin, ensure you have the following installed:

- [Bun](https://bun.sh/) (v1.0 or higher)
- [Node.js](https://nodejs.org/) (v18 or higher) - for npm compatibility
- [Git](https://git-scm.com/)

### Platform-Specific Requirements

#### macOS
- macOS 10.15 (Catalina) or higher
- Xcode Command Line Tools

#### Windows
- Windows 10 or higher
- Visual Studio Build Tools (for native modules)

#### Linux
- Ubuntu 20.04+ or equivalent
- WebKitGTK development libraries:
  ```bash
  sudo apt-get install libwebkit2gtk-4.0-dev
  ```

## 🚀 Installation

### Clone the Repository

```bash
git clone https://github.com/nglmercer/pluginmanager-desktop.git
cd pluginmanager-desktop
```

### Install Dependencies

```bash
bun install
```

## 💻 Development

### Start Development Server

```bash
# Standard development mode
bun start

# Development mode with file watching
bun run dev
```

The application will start with hot-reload enabled. The main window will open automatically, and you'll see the tray icon in your system tray.

### Development Features

- **Hot Reload**: Changes to source files trigger automatic rebuilds
- **DevTools**: Browser DevTools are automatically opened for debugging
- **Console Logging**: All logs are visible in the terminal
- **Live CSS Updates**: Tailwind CSS changes are reflected immediately

## 🏗️ Building

### Development Build

```bash
bunx electrobun build
```

### Canary Build

```bash
bun run build:canary
# or
bunx electrobun build --env=canary
```

### Stable Build

```bash
bunx electrobun build --env=stable
```

### Cross-Platform Compilation

Build for multiple platforms from a single command:

```bash
# Build for all platforms
bunx electrobun build --targets macos-arm64,macos-x64,win-x64,linux-x64,linux-arm64

# Build for specific platforms
bunx electrobun build --targets macos-arm64,win-x64
```

### Build Output

Build artifacts are located in the `artifacts/` directory:

```
artifacts/
├── macos-arm64/
│   └── pluginmanager.app
├── win-x64/
│   └── pluginmanager.exe
└── linux-x64/
    └── pluginmanager
```

## 📁 Project Structure

```
pluginmanager-desktop/
├── src/
│   ├── bun/                    # Main process (Bun runtime)
│   │   ├── index.ts           # Application entry point
│   │   ├── index.d.ts         # Type definitions
│   │   ├── pluginmanager.ts   # Plugin manager initialization
│   │   ├── constants.ts       # Application constants
│   │   ├── constants/
│   │   │   └── tray.ts        # Tray menu configuration
│   │   ├── ipc/
│   │   │   └── index.ts       # IPC handler for plugin communication
│   │   ├── manager/
│   │   │   ├── baseplugin.ts  # Base plugin class
│   │   │   ├── plugin-api.ts  # Plugin API interface
│   │   │   ├── plugin-installer.ts # Plugin installation logic
│   │   │   ├── Register.ts    # Plugin registration system
│   │   │   ├── rules-api.ts   # Rules API implementation
│   │   │   └── defaults/      # Default plugins and rules
│   │   └── utils/
│   │       └── filepath.ts    # File path utilities
│   ├── mainview/              # Main application view
│   │   ├── index.html         # HTML entry point
│   │   ├── index.ts           # TypeScript entry point
│   │   ├── index.css          # Tailwind CSS styles
│   │   ├── dist.css           # Compiled CSS (generated)
│   │   ├── types.ts           # View type definitions
│   │   ├── components/        # Lit web components
│   │   │   ├── app-container.ts
│   │   │   ├── plugin-list.ts
│   │   │   ├── plugin-manager.ts
│   │   │   ├── rule-list.ts
│   │   │   ├── rule-manager.ts
│   │   │   ├── settings-modal.ts
│   │   │   └── custom-dialog.ts
│   │   ├── defaults/          # Default configurations
│   │   │   ├── i18n.ts        # Internationalization setup
│   │   │   ├── langs/         # Language files
│   │   │   │   ├── en.ts      # English
│   │   │   │   └── es.ts      # Spanish
│   │   │   └── dialogs.ts     # Dialog configurations
│   │   ├── styles/            # Style utilities
│   │   │   ├── colors.ts      # Color palette
│   │   │   ├── css.ts         # CSS utilities
│   │   │   ├── icons.ts       # Icon definitions
│   │   │   ├── manager.ts     # Style manager
│   │   │   └── types.ts       # Style type definitions
│   │   └── trigger-editor/    # Trigger editor component
│   │       ├── index.html
│   │       ├── index.js
│   │       └── index.css
│   ├── shared/                # Shared code between processes
│   │   ├── rpc.ts             # RPC type definitions
│   │   ├── types.ts           # Shared type definitions
│   │   └── pluginsample.ts    # Sample plugin implementation
│   ├── assets/                # Static assets
│   │   └── tray-icon.svg      # System tray icon
│   └── types/                 # Global type definitions
│       └── three.d.ts
├── docs/                      # Documentation
│   ├── electrobun.md          # Electrobun framework documentation
│   └── notes.md               # Development notes
├── artifacts/                 # Build output directory
├── package.json               # Project dependencies
├── electrobun.config.ts       # Electrobun configuration
├── tailwind.config.cjs        # Tailwind CSS configuration
├── postcss.config.js          # PostCSS configuration
├── tsconfig.json              # TypeScript configuration
└── bun.lock                   # Bun lockfile
```

## 🏛️ Architecture

### Process Model

Plugin Manager Desktop uses Electrobun's multi-process architecture:

1. **Main Process (Bun)**: Runs in Node.js-like environment
   - Manages application lifecycle
   - Handles system tray and menus
   - Coordinates plugin system
   - Manages IPC communication

2. **Renderer Process (WebView)**: Runs in system webview
   - Renders the UI using Lit components
   - Handles user interactions
   - Communicates with main process via RPC

### Communication Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Main Process (Bun)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Tray       │  │   Plugin     │  │   IPC        │      │
│  │   Manager    │  │   Manager    │  │   Handler    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ RPC (Typed)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  Renderer Process (WebView)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   App        │  │   Plugin     │  │   Rule       │      │
│  │   Container  │  │   List       │  │   Manager    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### Key Components

- **PluginManager**: Core plugin lifecycle management
- **IPC Handler**: Bidirectional communication between processes
- **Rule System**: Flexible plugin behavior configuration
- **Tray Manager**: System tray integration and menu handling

## ⚙️ Configuration

### Electrobun Configuration

The application is configured via [`electrobun.config.ts`](electrobun.config.ts):

```typescript
import type { ElectrobunConfig } from "electrobun";
import tailwind from "bun-plugin-tailwind";

export default {
  app: {
    name: "pluginmanager",
    identifier: "trayapp.electrobun.dev",
    version: "0.0.1",
  },
  runtime: {
    exitOnLastWindowClosed: false, // Keep running in tray
  },
  build: {
    bun: {
      entrypoint: "src/bun/index.ts",
      plugins: [tailwind],
    },
    views: {
      mainview: {
        entrypoint: "src/mainview/index.html",
        plugins: [tailwind],
      },
    },
    // ... more configuration
  },
} satisfies ElectrobunConfig;
```

### Tailwind CSS Configuration

Tailwind is configured in [`tailwind.config.cjs`](tailwind.config.cjs):

```javascript
module.exports = {
  content: ["./src/**/*.{ts,html}"],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

### TypeScript Configuration

TypeScript settings are in [`tsconfig.json`](tsconfig.json):

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

## 🌐 Internationalization

The application supports multiple languages through the i18next library.

### Supported Languages

- 🇺🇸 English (en)
- 🇪🇸 Spanish (es)

### Adding a New Language

1. Create a new language file in [`src/mainview/defaults/langs/`](src/mainview/defaults/langs/):

```typescript
// src/mainview/defaults/langs/fr.ts
export default {
  app: {
    title: "Gestionnaire de Plugins",
    // ... more translations
  },
  plugins: {
    title: "Plugins",
    // ... more translations
  },
  // ... more sections
};
```

2. Register the language in [`src/mainview/defaults/i18n.ts`](src/mainview/defaults/i18n.ts):

```typescript
import fr from "./langs/fr";

i18next.init({
  resources: {
    en: { translation: en },
    es: { translation: es },
    fr: { translation: fr }, // Add new language
  },
  // ... configuration
});
```

3. Add the language option to the settings modal.

### Usage in Components

```typescript
import { LitElement, html } from "lit";
import { translate } from "lit-i18n";

class MyComponent extends LitElement {
  render() {
    return html`
      <h1>${translate("app.title")}</h1>
      <p>${translate("app.description")}</p>
    `;
  }
}
```

## 🔌 Plugin System

### Plugin Architecture

Plugins are modular extensions that add functionality to the application. Each plugin:

- Has a unique identifier
- Can be enabled/disabled
- Can define rules for behavior
- Communicates via IPC

### Creating a Plugin

1. Define the plugin structure:

```typescript
// src/shared/pluginsample.ts
export interface Plugin {
  id: string;
  name: string;
  version: string;
  description: string;
  enabled: boolean;
  rules: Rule[];
}
```

2. Implement the plugin:

```typescript
import { BasePlugin } from "../manager/baseplugin";

export class MyPlugin extends BasePlugin {
  id = "my-plugin";
  name = "My Custom Plugin";
  version = "1.0.0";
  description = "A sample plugin implementation";

  async initialize(): Promise<void> {
    // Plugin initialization logic
  }

  async execute(context: PluginContext): Promise<void> {
    // Plugin execution logic
  }

  async cleanup(): Promise<void> {
    // Cleanup resources
  }
}
```

3. Register the plugin:

```typescript
import { PluginManager } from "../manager/Register";

const manager = new PluginManager();
manager.register(new MyPlugin());
```

### Plugin API

Plugins have access to the following API:

```typescript
interface PluginAPI {
  // IPC Communication
  send(message: string, data: any): void;
  onMessage(handler: (message: string, data: any) => void): void;

  // File System
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;

  // Notifications
  showNotification(title: string, body: string): void;

  // Storage
  get(key: string): Promise<any>;
  set(key: string, value: any): Promise<void>;
}
```

## 📡 IPC Communication

### Overview

IPC (Inter-Process Communication) enables secure communication between the main process and renderer process using typed RPC.

### Defining RPC Schema

```typescript
// src/shared/rpc.ts
import { RPCSchema } from "electrobun/bun";

export type PluginManagerRPC = {
  bun: RPCSchema<{
    requests: {
      getPlugins: { params: {}; response: Plugin[] };
      enablePlugin: { params: { id: string }; response: boolean };
      disablePlugin: { params: { id: string }; response: boolean };
    };
    messages: {
      pluginStatusChanged: { id: string; enabled: boolean };
    };
  }>;
  webview: RPCSchema<{
    requests: {
      showConfirmation: { params: { message: string }; response: boolean };
    };
    messages: {
      notification: { title: string; body: string };
    };
  }>;
};
```

### Using RPC in Main Process

```typescript
import { BrowserView } from "electrobun/bun";
import type { PluginManagerRPC } from "../shared/rpc";

const rpc = BrowserView.defineRPC<PluginManagerRPC>({
  handlers: {
    requests: {
      getPlugins: () => pluginManager.listPlugins(),
      enablePlugin: ({ id }) => pluginManager.enablePlugin(id),
      disablePlugin: ({ id }) => pluginManager.disablePlugin(id),
    },
    messages: {
      pluginStatusChanged: ({ id, enabled }) => {
        console.log(`Plugin ${id} ${enabled ? "enabled" : "disabled"}`);
      },
    },
  },
});
```

### Using RPC in Renderer Process

```typescript
import { Electroview } from "electrobun/view";
import type { PluginManagerRPC } from "../../shared/rpc";

const electroview = new Electroview({ rpc });

// Call main process functions
const plugins = await electroview.rpc.request.getPlugins({});
await electroview.rpc.request.enablePlugin({ id: "my-plugin" });

// Send messages to main process
electroview.rpc.send.pluginStatusChanged({ id: "my-plugin", enabled: true });
```

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

### Development Setup

1. Fork the repository
2. Create a feature branch:
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. Install dependencies:
   ```bash
   bun install
   ```
4. Make your changes
5. Test thoroughly
6. Commit your changes:
   ```bash
   git commit -m 'Add amazing feature'
   ```
7. Push to the branch:
   ```bash
   git push origin feature/amazing-feature
   ```
8. Open a Pull Request

### Code Style

- Use TypeScript for all new code
- Follow the existing code style
- Use meaningful variable and function names
- Add comments for complex logic
- Keep functions small and focused

### Testing

Before submitting a PR:

1. Test on your target platform(s)
2. Ensure no TypeScript errors:
   ```bash
   bun run tsc --noEmit
   ```
3. Verify the build works:
   ```bash
   bunx electrobun build
   ```

### Reporting Issues

When reporting issues, please include:

- Operating system and version
- Bun version
- Steps to reproduce
- Expected behavior
- Actual behavior
- Screenshots (if applicable)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Electrobun](https://electrobun.dev) - The ultra-fast desktop application framework
- [Bun](https://bun.sh) - The fast JavaScript runtime
- [Lit](https://lit.dev) - Simple, fast, lightweight web components
- [Tailwind CSS](https://tailwindcss.com) - Utility-first CSS framework
- [i18next](https://www.i18next.com) - Internationalization framework

## 📞 Support

- **Documentation**: [Electrobun Docs](https://electrobun.dev/docs)
- **GitHub Issues**: [Report a Bug](https://github.com/nglmercer/pluginmanager-desktop/issues)
- **Discord**: [Join the Community](https://discord.gg/ueKE4tjaCE)

## 🔗 Links

- [Electrobun Website](https://electrobun.dev)
- [Electrobun GitHub](https://github.com/blackboardsh/electrobun)
- [Electrobun Documentation](https://electrobun.dev/docs)

---

Built with ❤️ using [Electrobun](https://electrobun.dev)
