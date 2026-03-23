import { Tray, Utils } from "electrobun/bun";
import Electrobun from "electrobun/bun";
import { TrayClickedEvent } from "./index.d";
import { main } from "./pluginmanager";
import { ontrayevent, MenuBuilder } from "./constants/tray";
import { ipcHandler } from "./ipc";

/**
 * Plugin Manager - Modular Entry Point
 * Uses IPC for plugin communication and modular tray/window management
 */

// Create tray icon
const tray = new Tray({
	title: "Plugin Manager",
	image: "views://assets/tray-icon.svg",
	width: 22,
	height: 22,
});

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
	
	// Initialize IPC with plugin manager
	ipcHandler.initialize(result.manager);
	const cleanup = async () => {
		const allplugins = result.manager.listPlugins();
		console.log('[cleanup]',allplugins)
		allplugins.forEach((plugin) => {
			result.manager.disablePlugin(plugin)
			result.manager.unregister(plugin)
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
		.addItem("Electrobun Docs", "docs")
		.addItem("Electrobun Github", "github")
		.addDivider()
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
		case "docs":
			Utils.openExternal("https://electrobun.dev");
			break;
		case "github":
			Utils.openExternal("https://github.com/blackboardsh/electrobun");
			break;
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
