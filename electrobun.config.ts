import type { ElectrobunConfig } from "electrobun";
import tailwind from "bun-plugin-tailwind";
import { readFileSync } from 'fs';
const packageJson = JSON.parse(readFileSync('./package.json', 'utf8'));
export default {
	app: {
		name: "pluginmanager",
		identifier: "pluginmanager.electrobun.dev",
		version: packageJson.version,
	},
	runtime: {
		exitOnLastWindowClosed: false,
	},
	build: {
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
		},
		linux: {
			bundleCEF: false,
			icon: "assets/icon_256x256.png",
		},
		win: {
			bundleCEF: false,
			icon: "assets/icon.ico",
		},
	},
} satisfies ElectrobunConfig;
