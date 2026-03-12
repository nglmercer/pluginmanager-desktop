import { Tray, Utils } from "electrobun/bun";
import { TrayClickedEvent } from "./index.d";
import { main } from "./pluginmanager";

// Create a system tray icon with an image
const tray = new Tray({
	title: "Plugin Manager",
	image: "views://assets/tray-icon.svg",
	width: 22,
	height: 22,
});

main().then((result) => {
	console.log(Object.keys(result));
});

// Set up the tray context menu
tray.setMenu([
	{ type: "normal", label: "Electrobun Docs", action: "docs" },
	{ type: "normal", label: "Colab", action: "colab" },
	{ type: "normal", label: "Electrobun Github", action: "github" },
	{ type: "divider" },
	{ type: "normal", label: "Quit", action: "quit" },
]);

// Handle tray events (both icon clicks and menu item clicks fire this event)
// The action property indicates which item was clicked
tray.on("tray-clicked", (event) => {
	const typedEvent = event as unknown as TrayClickedEvent;
	const action = typedEvent.data?.action;

	// Handle menu item clicks
	switch (action) {
		case "docs":
			Utils.openExternal("https://electrobun.dev");
			break;
		case "colab":
			Utils.openExternal("https://blackboard.sh/colab/");
			break;
		case "github":
			Utils.openExternal("https://github.com/blackboardsh/electrobun");
			break;
		case "quit":
			tray.remove();
			process.exit(0);
			break;
		default:
			// Handle tray icon click (no action = icon itself was clicked)
			console.log("Tray icon clicked (no menu action)");
			break;
	}
});

console.log("Tray app started! Look for it in your menu bar.");
