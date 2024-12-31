import HttpError from "./HttpError";

const fetchOrThrowIfNotOk: typeof fetch = async (...args) => {
  const response = await fetch(...args);
  if (!response.ok) {
    throw new HttpError(response);
  }
  return response;
}

const fetchJson = async (...args: Parameters<typeof fetch>): Promise<any> => {
  const response = await fetchOrThrowIfNotOk(...args);
  return response.json();
}

export interface PluginsResponse {
  version: number;
  timestamp: number;
  plugins: {[pluginName: string]: {downloads_url: string}};
}

export interface PluginStatsResponse {
  pluginName: string;
  stats: {[date: string]: {downloads: number}};
}

export class Plugin {
  public readonly pluginName: string;

  private downloadsUrl: string;

  constructor(pluginName: string, downloadsUrl: string) {
    this.pluginName = pluginName;
    this.downloadsUrl = downloadsUrl;
  }

  async getStats() {
    const stats: PluginStatsResponse = await fetchJson(this.downloadsUrl);
    return stats;
  }
}

export async function fetchPlugins(): Promise<Plugin[]> {
  const response: PluginsResponse = await fetchJson('plugins.json');
  return Object.keys(response.plugins)
    .map(pluginName => new Plugin(pluginName, response.plugins[pluginName]['downloads_url']));
}

export async function fetchLastUpdatedTimestamp(): Promise<number> {
  const response: PluginsResponse = await fetchJson('plugins.json');
  return response.timestamp;
}
