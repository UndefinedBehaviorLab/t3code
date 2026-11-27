// Per-device UI preference: single-environment Settings pages (Providers, Secrets) otherwise
// start on the primary environment every time the Settings modal mounts.
const STORAGE_KEY = "t3:settings-environment:v1";

export function readRememberedSettingsEnvironment(): string | null {
  try {
    return globalThis.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function rememberSettingsEnvironment(environmentId: string): void {
  try {
    globalThis.localStorage.setItem(STORAGE_KEY, environmentId);
  } catch {
    // A blocked storage backend only loses the remembered selection.
  }
}
