import type { ElectrobunConfig } from "electrobun";
import tailwind from "bun-plugin-tailwind"
export default {
	app: {
		name: "tray-app",
		identifier: "trayapp.electrobun.dev",
		version: "0.0.1",
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
		},
		win: {
			bundleCEF: false,
		},
	},
} satisfies ElectrobunConfig;
