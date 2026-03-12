/**
 * Type declarations for src/bun/index.ts events
 */

export interface TrayClickedEventData {
	action?: string;
}

export interface TrayClickedEvent {
	data?: TrayClickedEventData;
}

export interface TrayItemClickedEventData {
	action?: string;
}

export interface TrayItemClickedEvent {
	data?: TrayItemClickedEventData;
}

export type TrayEventCallback = (event: TrayClickedEvent | TrayItemClickedEvent) => void;
