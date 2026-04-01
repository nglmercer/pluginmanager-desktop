export type RequestConfig = {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  query?: Record<string, string>;
  headers?: Record<string, string>;
  body?: string | object;
};

export class ApiExecutor {
  private defaults: Partial<RequestConfig>;

  constructor(defaults: Partial<RequestConfig> = {}) {
    this.defaults = {
      headers: { 'Content-Type': 'application/json' },
      ...defaults
    };
  }

  /**
   * Replaces placeholders in the body or URL
   * e.g., replaceVariables("Hello {name}", { name: "World" }) -> "Hello World"
   */
  private replaceVariables(template: string, vars: Record<string, string>): string {
    return template.replace(/{(\w+)}/g, (_, key) => vars[key] || `{${key}}`);
  }

  async execute(config: RequestConfig, vars: Record<string, string> = {}) {
    const finalUrl = this.replaceVariables(config.url, vars);
    const finalBody = typeof config.body === 'string' 
      ? this.replaceVariables(config.body, vars) 
      : config.body;

    const url = new URL(finalUrl);
    if (config.query) {
      Object.entries(config.query).forEach(([k, v]) => url.searchParams.append(k, v));
    }

    const response = await fetch(url.toString(), {
      method: config.method || this.defaults.method,
      headers: { ...this.defaults.headers, ...config.headers },
      body: typeof finalBody === 'object' ? JSON.stringify(finalBody) : finalBody,
    });

    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
    return response.json().catch(() => response.text());
  }
}