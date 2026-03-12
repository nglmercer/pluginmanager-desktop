import { HELPERS } from "../../constants";
import { CleanerUtils } from "./clean";
import type { TriggerAction, TriggerContext } from "trigger_system/node";

export const helpers = {
    [HELPERS.LAST]: (_action: TriggerAction, _context: TriggerContext) => {
        const lastItem = CleanerUtils.getLastMessage();
        return lastItem ? lastItem.cleanedText : "";
    },
    [HELPERS.CLEAN]: (action: TriggerAction, _context: TriggerContext) => {
        const t = action.params?.t as string | null | undefined;
        if (t) {
            setTimeout(() => {
                CleanerUtils.registerMessage(t)
            }, 1000);
        }
        return CleanerUtils.cleanText(String(t || ""));
    }
}