import { CustomDialog } from "../components/custom-dialog.js";

let dialogInstance: CustomDialog | null = null;

/**
 * Gets or creates the global dialog instance
 */
function getDialogInstance(): CustomDialog {
  if (!dialogInstance) {
    dialogInstance = document.querySelector("custom-dialog");
    if (!dialogInstance) {
      dialogInstance = document.createElement("custom-dialog");
      document.body.appendChild(dialogInstance);
    }
  }
  return dialogInstance;
}

/**
 * Custom async alert replacement
 * @param message The message to display
 * @param title Optional title
 */
export async function alert(message: string, title?: string): Promise<void> {
  await getDialogInstance().show({ message, title, type: "alert" });
}

/**
 * Custom async confirm replacement
 * @param message The message to display
 * @param title Optional title
 * @returns Promise resolving to true if confirmed, false otherwise
 */
export async function confirm(message: string, title?: string): Promise<boolean> {
  return await getDialogInstance().show({ message, title, type: "confirm" });
}

/**
 * Custom async prompt replacement
 * @param message The message to display
 * @param defaultValue Default input value
 * @param title Optional title
 * @returns Promise resolving to the input value or null if cancelled
 */
export async function prompt(message: string, defaultValue: string = "", title?: string): Promise<string | null> {
  return await getDialogInstance().show({ 
    message, 
    value: defaultValue, 
    title, 
    type: "prompt" 
  });
}

// Register globally to replace window methods
// Note: We use any to avoid type conflicts with native non-async methods
(window as any).alert = alert;
(window as any).confirm = confirm;
(window as any).prompt = prompt;
