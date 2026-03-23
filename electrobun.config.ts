import type { ElectrobunConfig } from "electrobun";
import tailwind from "bun-plugin-tailwind";
import { readFileSync } from 'fs';
const packageJson = JSON.parse(readFileSync('./package.json', 'utf8'));
const iconPath = "assets/icon_256x256.png";
export default {
	app: {
		name: "pluginmanager",
		identifier: "trayapp.electrobun.dev",
		version: packageJson.version,
	},
	runtime: {
		exitOnLastWindowClosed: false,
	},
	build: {
		bunVersion: "1.3.11",
		bun: {
			entrypoint: "src/bun/index.ts",
			plugins: [
				tailwind
			],
		},
		views: {
			mainview: {
				entrypoint: "src/mainview/index.html",
				plugins: [tailwind],
			},
			editor: {
				entrypoint: "src/shared/rpc.ts",
			}
		},
		copy: {
			"src/mainview/index.html": "views/mainview/index.html",
			"src/mainview/index.ts": "views/mainview/index.ts",
			"src/assets": "views/assets",
			"src/shared": "views/shared",
			"src/mainview/dist.css": "views/mainview/dist.css",
			"src/mainview/trigger-editor/": "views/editor/",
		},
		mac: {
			bundleCEF: false,
			icons: iconPath,
		},
		linux: {
			bundleCEF: false,
			icon: iconPath,
		},
		win: {
			bundleCEF: false,
			icon: iconPath,
		},
	},
} satisfies ElectrobunConfig;
