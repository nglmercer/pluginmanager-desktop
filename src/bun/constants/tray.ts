export const ontrayevent = "tray-clicked";

/**
 * Menu item types for Tray context menu
 */
export type MenuItemType = "normal" | "divider";

export interface BaseMenuItem {
	type: MenuItemType;
}

export interface NormalMenuItem extends BaseMenuItem {
	type: "normal";
	label: string;
	action: string;
	submenu?: TrayMenu;
	enabled?: boolean;
}

export interface DividerMenuItem extends BaseMenuItem {
	type: "divider";
}

export type TrayMenuItem = NormalMenuItem | DividerMenuItem;

export type TrayMenu = TrayMenuItem[];

/**
 * Fluent builder for creating Tray menus
 */
export class MenuBuilder {
	private items: TrayMenuItem[] = [];

	private constructor() {}

	/**
	 * Create a new MenuBuilder instance
	 */
	static create(): MenuBuilder {
		return new MenuBuilder();
	}

	/**
	 * Add a normal menu item
	 */
	addItem(label: string, action: string, enabled: boolean = true): MenuBuilder {
		this.items.push({
			type: "normal",
			label,
			action,
			enabled,
		});
		return this;
	}

	/**
	 * Add a separator/divider
	 */
	addDivider(): MenuBuilder {
		this.items.push({
			type: "divider",
		});
		return this;
	}

	/**
	 * Add a submenu
	 */
	addSubmenu(label: string, action: string, builder: MenuBuilder): MenuBuilder {
		this.items.push({
			type: "normal",
			label,
			action,
			submenu: builder.build(),
		});
		return this;
	}

	/**
	 * Add multiple items at once
	 */
	addItems(items: Array<{ label: string; action: string }>): MenuBuilder {
		for (const item of items) {
			this.addItem(item.label, item.action);
		}
		return this;
	}

	/**
	 * Build the menu array
	 */
	build(): TrayMenu {
		return [...this.items];
	}
}
