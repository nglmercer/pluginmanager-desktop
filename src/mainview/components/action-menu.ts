import { LitElement, html, css } from "lit";
import { customElement, state } from "lit/decorators.js";

export interface ActionMenuItem {
  id: string;
  label: string;
  icon?: any;
  action: () => void;
  danger?: boolean;
}

/**
 * Universal Action Menu (Dropdown)
 * Renders a single absolute positioned menu triggered by other elements
 */
@customElement("action-menu")
export class ActionMenu extends LitElement {
  static styles = css`
    :host {
      display: block;
      position: absolute;
      z-index: 9999;
    }
    .menu {
      display: flex;
      flex-direction: column;
      background: var(--theme-card, #1e1e1e);
      border: 1px solid var(--theme-border, #333);
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
      min-width: 160px;
      padding: 5px;
      opacity: 0;
      transform: translateY(-10px);
      pointer-events: none;
      transition: opacity 0.2s, transform 0.2s;
    }
    .menu.open {
      opacity: 1;
      transform: translateY(0);
      pointer-events: auto;
    }
    .menu-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 12px;
      border-radius: 4px;
      color: var(--theme-text-primary, #e0e0e0);
      cursor: pointer;
      font-size: 14px;
      border: none;
      background: transparent;
      text-align: left;
      width: 100%;
    }
    .menu-item:hover {
      background: var(--theme-hover, #2a2a2a);
    }
    .menu-item.danger {
      color: var(--theme-danger, #ff5c5c);
    }
    .menu-item.danger:hover {
      background: var(--theme-danger-muted, rgba(255, 92, 92, 0.1));
    }
    .menu-item svg {
      width: 16px;
      height: 16px;
    }
  `;

  @state() private isOpen = false;
  @state() private items: ActionMenuItem[] = [];
  
  private _top = 0;
  private _left = 0;

  static instance: ActionMenu | null = null;

  connectedCallback() {
    super.connectedCallback();
    ActionMenu.instance = this;
    document.addEventListener("click", this.handleDocumentClick);
    window.addEventListener("resize", this.close);
    // Move to body to avoid clipping
    if (this.parentElement !== document.body) {
      document.body.appendChild(this);
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (ActionMenu.instance === this) {
      ActionMenu.instance = null;
    }
    document.removeEventListener("click", this.handleDocumentClick);
    window.removeEventListener("resize", this.close);
  }

  private handleDocumentClick = (e: MouseEvent) => {
    if (this.isOpen && !this.contains(e.target as Node)) {
      this.close();
    }
  };

  public close = () => {
    this.isOpen = false;
  };

  /**
   * Show the menu at the target element
   */
  public static show(e: MouseEvent | HTMLElement, items: ActionMenuItem[]) {
    if (!this.instance) return;
    
    let targetRect: DOMRect;
    if (e instanceof Event) {
      e.stopPropagation();
      e.preventDefault();
      targetRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    } else {
      targetRect = e.getBoundingClientRect();
    }

    this.instance.items = items;
    
    // Position below the target element, aligned to the right
    this.instance._top = targetRect.bottom + window.scrollY + 5;
    this.instance._left = targetRect.right + window.scrollX;
    
    this.instance.isOpen = true;
    
    // Use requestAnimationFrame to adjust after rendering to get actual width
    requestAnimationFrame(() => {
      if (!this.instance) return;
      const menuEl = this.instance.shadowRoot?.querySelector('.menu') as HTMLElement;
      if (menuEl) {
        // adjust left to right-align with the target element
        this.instance.style.top = `${this.instance._top}px`;
        this.instance.style.left = `${this.instance._left - menuEl.offsetWidth}px`;
      }
    });
  }

  render() {
    return html`
      <div class="menu ${this.isOpen ? 'open' : ''}">
        ${this.items.map(item => html`
          <button 
            class="menu-item ${item.danger ? 'danger' : ''}" 
            @click=${(e: Event) => {
              e.stopPropagation();
              this.close();
              item.action();
            }}
          >
            ${item.icon ? item.icon : ''}
            <span>${item.label}</span>
          </button>
        `)}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "action-menu": ActionMenu;
  }
}
