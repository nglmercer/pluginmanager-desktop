import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { translate as t } from "lit-i18n";
import type { RuleInfo } from "../types.js";

// Import theme system
import { TRASH_ICON, NO_PLUGINS_ICON, EDIT_ICON } from "../styles/index.js";

/**
 * Rule List Component
 * Displays the list of rules (list only, no global actions)
 */
@customElement("rule-list")
export class RuleList extends LitElement {
  protected createRenderRoot() {
    return this;
  }

  @property({ type: Array }) rules: RuleInfo[] = [];
  @property({ type: Boolean }) loading: boolean = false;

  private handleDelete(ruleId: string): void {
    this.dispatchEvent(
      new CustomEvent("rule-delete", {
        detail: { ruleId },
        bubbles: true,
        composed: true,
      })
    );
  }

  private async handleToggle(ruleId: string, enabled: boolean): Promise<void> {
    const { invokeRpc } = await import("../../shared/rpc.js");
    try {
      await invokeRpc("toggleRule", { ruleId, enabled });
    } catch (e) {
      console.error("Failed to toggle rule:", e);
    }
  }

  private async handleEdit(rule: RuleInfo): Promise<void> {
    if (!rule.filePath) {
      console.error("Cannot edit rule: No file path provided");
      return;
    }

    const { invokeRpc } = await import("../../shared/rpc.js");
    try {
      console.log(`[RuleList] Loading rule into editor: ${rule.filePath}`);
      await invokeRpc("loadRuleInEditor", { filePath: rule.filePath });
    } catch (e) {
      console.error("Failed to load rule in editor:", e);
    }
  }

  render() {
    if (this.loading) {
      return html`<div class="text-primary text-center p-5">${t("app.loading")}</div>`;
    }

    if (this.rules.length === 0) {
      return html`
        <div class="text-center text-muted py-10 px-5">
          ${NO_PLUGINS_ICON}
          <p class="m-[5px_0]">${t("app.noRules")}</p>
        </div>
      `;
    }

    return html`
      <div class="flex flex-col gap-[10px]">
        ${this.rules.map(
          (rule) => html`
            <div class="flex justify-between items-center p-[15px] bg-card rounded-md border border-border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-primary">
              <div class="flex-1">
                <div class="flex items-center gap-[10px] mb-1">
                  <span class="text-primary font-semibold text-[1.1rem]">${rule.name || rule.id}</span>
                  <span class="text-muted text-[12px] py-0.5 px-1.5 bg-hover rounded-md">${rule.platform}</span>
                </div>
                ${rule.description
                  ? html`
                      <div class="text-muted text-[13px] mt-1 leading-[1.4]">
                        ${rule.description}
                      </div>
                    `
                  : html`<div class="text-muted text-[13px] mt-1 leading-[1.4]">${t("app.noDescription")}</div>`}
                ${rule.tags && rule.tags.length > 0
                  ? html`
                      <div class="flex gap-[5px] mt-2">
                        ${rule.tags.map(
                          (tag: string) => html`
                            <span class="text-[11px] py-0.5 px-1.5 bg-hover rounded text-muted">
                              ${tag}
                            </span>
                          `
                        )}
                      </div>
                    `
                  : ""}
              </div>
              <div class="flex items-center gap-3">
                <label class="relative inline-block w-10 h-5 mr-1" title="${rule.enabled ? t("app.disable") : t("app.enable")}">
                  <input
                    type="checkbox"
                    class="opacity-0 w-0 h-0"
                    ?checked=${rule.enabled}
                    @change=${(e: Event) => this.handleToggle(rule.id, (e.target as HTMLInputElement).checked)}
                  />
                  <span class="slider absolute cursor-pointer inset-0 bg-border transition-all duration-400 rounded-[20px] checked:bg-success"></span>
                </label>

                <button
                  class="bg-transparent border border-border p-2 cursor-pointer rounded-md flex items-center justify-center text-primary transition-all duration-200 hover:bg-hover hover:border-primary"
                  @click=${() => this.handleEdit(rule)}
                  ?disabled=${!rule.filePath}
                  title="${rule.filePath ? t("app.editRule") : t("app.noFilePath")}"
                >
                  ${EDIT_ICON}
                </button>

                <button
                  class="bg-transparent border border-border p-2 cursor-pointer rounded-md flex items-center justify-center text-primary transition-all duration-200 hover:bg-danger-muted hover:border-danger hover:text-danger"
                  @click=${() => this.handleDelete(rule.id)}
                  title="${t("app.deleteRule")}"
                >
                  ${TRASH_ICON}
                </button>
              </div>
            </div>
          `
        )}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "rule-list": RuleList;
  }
}
