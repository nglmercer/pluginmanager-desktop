import { LitElement, html } from "lit";
import { customElement, state } from "lit/decorators.js";
import { i18next } from "../defaults/i18n.js";
import { invokeRpc } from "../defaults/rpc.js";
import type { RuleInfo } from "../types.js";

// Register child component
import "./rule-list.js";

/**
 * Rule Manager Container
 * Handles data loading and events for the rule list
 */
@customElement("rule-manager")
export class RuleManager extends LitElement {
  protected createRenderRoot() {
    return this;
  }

  @state() private rules: RuleInfo[] = [];
  @state() private loading: boolean = false;
  @state() private error: string = "";
  @state() private success: string = "";

  private _pollInterval?: ReturnType<typeof setInterval>;

  connectedCallback() {
    super.connectedCallback();
    this.loadRules();
    // Poll for changes
    this._pollInterval = setInterval(() => this.loadRules(), 2000);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._pollInterval) {
      clearInterval(this._pollInterval);
    }
  }

  private async loadRules(): Promise<void> {
    try {
      const result = await invokeRpc("getRules", {}) as RuleInfo[];
      this.rules = result || [];
    } catch (e: unknown) {
      this.error = i18next.t("messages.loadFailed", { error: (e as Error).message });
    }
  }

  private async deleteRule(ruleId: string): Promise<void> {
    if (!(await confirm(i18next.t("messages.deleteRuleConfirm", { id: ruleId })))) {
      return;
    }

    this.loading = true;
    this.error = "";
    this.success = "";

    try {
      const result = await invokeRpc("deleteRuleById", {
        ruleId,
      }) as { success: boolean; error?: string };

      if (result?.success) {
        this.success = i18next.t("messages.deleteRuleSuccess", { id: ruleId });
        await this.loadRules();
      } else {
        this.error = i18next.t("messages.deleteRuleFailed", { error: result?.error || "Deletion failed" });
      }
    } catch (e: unknown) {
      this.error = i18next.t("messages.deleteRuleFailed", { error: (e as Error).message || "Deletion failed" });
    } finally {
      this.loading = false;
    }
  }

  private handleRuleDelete(e: CustomEvent<{ ruleId: string }>): void {
    this.deleteRule(e.detail.ruleId);
  }
  render() {
    return html`
      <div class="p-5 pt-0">
        ${this.error ? html`<div class="p-[10px] rounded-md mb-[15px] text-danger bg-danger-muted">${this.error}</div>` : ""}
        ${this.success
          ? html`<div class="p-[10px] rounded-md mb-[15px] text-success bg-success-muted">${this.success}</div>`
          : ""}

        <rule-list
          .rules=${this.rules}
          .loading=${this.loading}
          @rule-delete=${this.handleRuleDelete}
        ></rule-list>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "rule-manager": RuleManager;
  }
}
