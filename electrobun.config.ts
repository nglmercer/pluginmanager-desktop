import type { ElectrobunConfig } from "electrobun";

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
		},
		views: {
			mainview: {
				entrypoint: "src/mainview/index.html",
			},
		},
		copy: {
			"src/mainview/index.html": "views/mainview/index.html",
			"src/mainview/index.compiled.css": "views/mainview/index.compiled.css",
			"src/mainview/index.ts": "views/mainview/index.ts",
			"src/assets": "views/assets",
			"src/shared": "views/shared",
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
