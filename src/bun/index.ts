import { Tray } from "electrobun/bun";
import Electrobun from "electrobun/bun";
import { TrayClickedEvent } from "./index.d";
import { main } from "./pluginmanager";
import { ontrayevent, MenuBuilder } from "./constants/tray";
import { ipcHandler } from "./ipc";
import { PLATFORMS, PLUGIN_NAMES } from "./constants";
import { triggerEmitter } from 'trigger_system/node';
import type { IPlugin } from 'bun_plugins';
import { helpers } from "./manager/defaults/helpers";
/**
 * Plugin Manager - Modular Entry Point
 * Uses IPC for plugin communication and modular tray/window management
 */
const imagePath = "views://assets/icon.ico";
// Create tray icon
const tray = new Tray({
	title: "Plugin Manager",
	image: imagePath,
	template: true,
	width: 32,
	height: 32,
});
//tray.setImage(imagePath);
/**
 * Window management functions
 */
function openMainWindow(): void {
	// If window exists, focus it
	if (ipcHandler.isMainWindowOpen()) {
		ipcHandler.focusWindow();
		ipcHandler.showNotification("Window Refocused", "The main window is already open.");
		return;
	}

	// Create new window with IPC
	const win = ipcHandler.openWindow("views://mainview/index.html");
	win.webview.openDevTools();
	// Set up window close handler
	win.on("close", () => {
		closeMainWindow();
	});

	console.log("Main window opened");
}
// dev open
//openMainWindow()
function closeMainWindow(): void {
	ipcHandler.closeWindow();
	console.log("Main window closed");
}

// Initialize plugin manager
main().then((result) => {
	console.log("Plugins loaded:", Object.keys(result));
	const { manager, engine } = result;
	// Initialize IPC with plugin manager
	ipcHandler.initialize(manager);
	ipcHandler.setCallback(async (event) => {
		if (event === 'focus' || event === 'dom-ready') {
			const info = manager.actionRegistryPlugin?.registry.getDefinitions() || {};
			// add key to each item in info
			const infoWithKey = Object.fromEntries(
				Object.entries(info).map(([key, value]) => [key, { ...value, key }])
			);
			ipcHandler.postMessageToWebview({type: PLUGIN_NAMES.ACTION_REGISTRY, data: infoWithKey});
			const savePlugin = manager.getPlugin(PLUGIN_NAMES.SAVE_EVENTS);
			//  private eventCache = new Map<string, any>();
			interface savePT extends IPlugin {
				eventCache: Map<string, any>;
				getData: () => Promise<any>;
			}
			if (savePlugin) {
				const SAVE_EVENTS = savePlugin as savePT;
				await SAVE_EVENTS?.getData?.();
				ipcHandler.postMessageToWebview({type: PLUGIN_NAMES.SAVE_EVENTS, data: SAVE_EVENTS?.eventCache});
			}
		}
		
	});
	//ipcHandler.broadcastToWebview(PLUGIN_NAMES.ACTION_REGISTRY,manager.actionRegistryPlugin?.registry.getDefinitions() || {});
	triggerEmitter.on('action:error', (error) => {
		ipcHandler.broadcastToWebview('action-error', error);
		
	});
	engine.registerVars(helpers);
	Object.values(PLATFORMS).forEach((platform) => {
		manager.on(platform, async ({ eventName, data }) => {

			//console.log("Helpers:", registryPlugin);
			
			//console.log(pluginHelpers,registryPlugin);
			if (eventName && data) {
				const result = await engine.processEventSimple(eventName, data, helpers);
				ipcHandler.broadcastToWebview('event-result', {eventName, result});
				ipcHandler.broadcastToWebview(eventName, data);
				ipcHandler.broadcastToWebview('event-result', {eventName, result});
				ipcHandler.postMessageToWebview({eventName, data});
			}
		});
	});
	const cleanup = async () => {
		const allplugins = manager.listPlugins();
		console.log('[cleanup]',allplugins)
		allplugins.forEach((plugin) => {
			manager.disablePlugin(plugin)
			manager.unregister(plugin)
		});
	}
	process.on('exit', cleanup);
	process.on('SIGINT', cleanup);
	console.log("IPC Handler initialized");
	Electrobun.events.on("before-quit", async (e) => {
		console.log(e)
		await cleanup();
	});
});
// Set up tray menu using MenuBuilder
tray.setMenu(
	MenuBuilder.create()
		.addItem("Open Window", "open")
		.addItem("Close Window", "close")
		.addDivider()
		.addItem("Quit", "quit")
		.build()
);

// Handle tray events
tray.on(ontrayevent, (event) => {
	const typedEvent = event as unknown as TrayClickedEvent;
	const action = typedEvent.data?.action;

	switch (action) {
		case "open":
			openMainWindow();
			break;
		case "close":
			closeMainWindow();
			break;
/* 		case "docs":
			Utils.openExternal("https://electrobun.dev");
			break;
		case "github":
			Utils.openExternal("https://github.com/blackboardsh/electrobun");
			break; */
		case "quit":
			closeMainWindow();
			tray.remove();
			process.exit(0);
			break;
		default:
			console.log("Tray icon clicked");
			break;
	}
});

console.log("Plugin Manager started! Look for the tray icon.");
