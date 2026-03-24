import { HELPERS } from "../../constants";
import { CleanerUtils } from "./clean";

export const helpers = {
    [HELPERS.LAST]: () => {
        const lastItem = CleanerUtils.getLastMessage();
        return lastItem ? lastItem.cleanedText : "";
    },
    [HELPERS.CLEAN]: (value?: string) => {
        setTimeout(() => {
            CleanerUtils.registerMessage(value || "");
        }, 1000);
        return CleanerUtils.cleanText(String(value || ""));
    }
}