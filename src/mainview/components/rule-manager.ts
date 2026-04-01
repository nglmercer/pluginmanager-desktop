import { LitElement, html } from "lit";
import { customElement, state, property } from "lit/decorators.js";
import { i18next } from "../defaults/i18n.js";
import { invokeRpc } from "../../shared/rpc.js";
import type { RuleInfo } from "../types.js";

// Register child components
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
  @state() private isInitialLoad: boolean = true;
  @state() private error: string = "";
  @state() private success: string = "";
  
  @property({ type: String }) sortBy: string = "name";
  @property({ type: String }) sortOrder: 'asc' | 'desc' = "asc";

  private _pollInterval?: ReturnType<typeof setInterval>;

  updated(changedProperties: Map<string, any>) {
    if (changedProperties.has('sortBy') || changedProperties.has('sortOrder')) {
      this.rules = this.sort(this.rules);
    }
  }

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
    if (this.isInitialLoad) {
      this.loading = true;
    }
    try {
      const result = (await invokeRpc("getRules", {})) as RuleInfo[];
      this.rules = this.sort(result || []);
    } catch (e: unknown) {
      console.error("Failed to load rules:", e);
      this.error = i18next.t("messages.loadFailed", { error: (e as Error).message });
    } finally {
      this.loading = false;
      this.isInitialLoad = false;
    }
  }

  private sort(rules: RuleInfo[]): RuleInfo[] {
    return [...rules].sort((a, b) => {
      let valA: any, valB: any;
      
      switch (this.sortBy) {
        case "id":
          valA = a.id.toLowerCase();
          valB = b.id.toLowerCase();
          break;
        case "enabled":
          valA = a.enabled ? 0 : 1;
          valB = b.enabled ? 0 : 1;
          break;
        case "platform":
          valA = a.platform.toLowerCase();
          valB = b.platform.toLowerCase();
          break;
        case "name":
        default:
          valA = (a.name || a.id).toLowerCase();
          valB = (b.name || b.id).toLowerCase();
          break;
      }

      let comparison = 0;
      if (valA < valB) comparison = -1;
      if (valA > valB) comparison = 1;

      return this.sortOrder === "asc" ? comparison : -comparison;
    });
  }

  private async deleteRule(ruleId: string): Promise<void> {
    if (!(await confirm(i18next.t("messages.deleteRuleConfirm", { id: ruleId })))) {
      return;
    }

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
      // No global loading here, RuleList handles per-item locking
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
