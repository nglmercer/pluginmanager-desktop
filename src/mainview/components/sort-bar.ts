import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { i18next } from "../defaults/i18n.js";
import { CHEVRON_DOWN_ICON } from "../styles/index.js";

export type SortOptions = {
    field: string;
    order: 'asc' | 'desc';
};

@customElement("sort-bar")
export class SortBar extends LitElement {
    protected createRenderRoot() {
        return this;
    }

    @property({ type: String }) currentField: string = "name";
    @property({ type: String }) currentOrder: 'asc' | 'desc' = "asc";
    @property({ type: Array }) fields: { id: string; label: string }[] = [];

    private handleChangeField(e: Event) {
        const field = (e.target as HTMLSelectElement).value;
        this.dispatchEvent(new CustomEvent("sort-change", {
            detail: { field, order: this.currentOrder },
            bubbles: true,
            composed: true,
        }));
    }

    private toggleOrder() {
        const order = this.currentOrder === "asc" ? "desc" : "asc";
        this.dispatchEvent(new CustomEvent("sort-change", {
            detail: { field: this.currentField, order },
            bubbles: true,
            composed: true,
        }));
    }

    render() {
        return html`
            <div class="flex items-center gap-3 bg-hover/20 rounded-lg">
                <div class="flex items-center gap-2">
                    <span class="text-muted text-sm font-medium">${i18next.t("app.sortBy", { defaultValue: "Ordenar por:" })}</span>
                    <div class="relative inline-flex items-center">
                        <select 
                            @change=${this.handleChangeField}
                            .value=${this.currentField}
                            class="appearance-none bg-card border border-border rounded-md py-1.5 pl-3 pr-8 text-sm focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                        >
                            ${this.fields.map(f => html`
                                <option value=${f.id} ?selected=${this.currentField === f.id}>${f.label}</option>
                            `)}
                        </select>
                        <div class="absolute right-2 pointer-events-none text-muted-foreground w-4 h-4">
                            ${CHEVRON_DOWN_ICON}
                        </div>
                    </div>
                </div>

                <button 
                    @click=${this.toggleOrder}
                    class="p-1.5 bg-card border border-border rounded-md hover:bg-hover transition-colors flex items-center justify-center text-primary"
                    title="${i18next.t("app.toggleSortOrder", { defaultValue: "Alternar orden" })}"
                >
                    <span class="text-xs font-bold uppercase w-8">${this.currentOrder}</span>
                </button>
            </div>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "sort-bar": SortBar;
    }
}
