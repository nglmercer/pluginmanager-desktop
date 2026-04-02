export type RequestConfig = {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  query?: Record<string, string>;
  headers?: Record<string, string>;
  body?: string | object;
};
export type File = {
    id: string;
    name: string;
    originalName: string;
    category: "image" | "audio" | "video" | "document" | "archive" | "application" | "font" | "model" | "data" | "other" | "unknown" | "mismatch" | "corrupted" | "disguised";
    mimeType: string | null;
    extension: string;
    size: number;
    sizeFormatted: string;
    url: string;
    isPublic: boolean;
    tags?: string[] | undefined;
    [key: string]: unknown;
}
export type pagination = {
    page: number;
    pageSize: number;
    totalPages: number;
    total: number;
}
export type filesResponse = {
    files: File[];
    pagination: pagination;
}
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