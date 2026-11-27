import { describe, expect, it } from "vite-plus/test";

import {
  normalizeLinuxPasswordStorePreference,
  parseLinuxPasswordStorePreference,
  resolveLinuxPasswordStoreSwitch,
} from "./linuxSecretStorage.ts";

const autoSwitch = (env: NodeJS.ProcessEnv) =>
  resolveLinuxPasswordStoreSwitch({ preference: "auto", env });

describe("linuxSecretStorage", () => {
  it("leaves canonical KDE sessions to Electron's own wallet selection", () => {
    expect(autoSwitch({ XDG_CURRENT_DESKTOP: "KDE" })).toBeNull();
    expect(autoSwitch({ XDG_CURRENT_DESKTOP: "KDE", KDE_SESSION_VERSION: "6" })).toBeNull();
    expect(autoSwitch({ XDG_CURRENT_DESKTOP: "KDE", KDE_SESSION_VERSION: "5" })).toBeNull();
    expect(autoSwitch({ XDG_CURRENT_DESKTOP: "KDE:plasma" })).toBeNull();
  });

  it("recognizes a known desktop later in a colon-separated XDG_CURRENT_DESKTOP list", () => {
    expect(autoSwitch({ XDG_CURRENT_DESKTOP: "niri:GNOME" })).toBeNull();
    expect(autoSwitch({ XDG_CURRENT_DESKTOP: "ubuntu:GNOME" })).toBeNull();
  });

  it("forces gnome-libsecret for unrecognized Linux desktop sessions", () => {
    expect(autoSwitch({ XDG_CURRENT_DESKTOP: "niri" })).toBe("gnome-libsecret");
    expect(autoSwitch({ XDG_CURRENT_DESKTOP: "Hyprland" })).toBe("gnome-libsecret");
    expect(autoSwitch({})).toBe("gnome-libsecret");
  });

  it("forces gnome-libsecret for desktops Electron recognizes but leaves on basic text", () => {
    expect(autoSwitch({ XDG_CURRENT_DESKTOP: "LXQt" })).toBe("gnome-libsecret");
    expect(autoSwitch({ XDG_CURRENT_DESKTOP: "LXQt:GNOME" })).toBe("gnome-libsecret");
    expect(autoSwitch({ XDG_CURRENT_DESKTOP: "LXQt:KDE" })).toBe("gnome-libsecret");
    expect(autoSwitch({ XDG_CURRENT_DESKTOP: "LXQt:plasma" })).toBe("gnome-libsecret");
  });

  it("does not treat lowercase desktop names as ones Electron recognizes", () => {
    expect(autoSwitch({ XDG_CURRENT_DESKTOP: "gnome" })).toBe("gnome-libsecret");
    expect(autoSwitch({ XDG_CURRENT_DESKTOP: "xfce" })).toBe("gnome-libsecret");
    expect(autoSwitch({ XDG_CURRENT_DESKTOP: "kde", KDE_SESSION_VERSION: "6" })).toBe(
      "gnome-libsecret",
    );
  });

  it("overrides KDE sessions identified only by legacy variables", () => {
    expect(autoSwitch({ XDG_CURRENT_DESKTOP: "plasma" })).toBe("gnome-libsecret");
    for (const session of [
      "kde",
      "kde-plasma",
      "kde4",
      "plasma",
      "plasmawayland",
      "plasmawayland-dev",
      "plasmax11",
      "plasmax11-dev",
    ]) {
      expect(autoSwitch({ DESKTOP_SESSION: session })).toBe("gnome-libsecret");
      expect(autoSwitch({ XDG_SESSION_DESKTOP: session })).toBe("gnome-libsecret");
      expect(autoSwitch({ GDMSESSION: session })).toBe("gnome-libsecret");
    }
    expect(autoSwitch({ DESKTOP_SESSION: "kde", KDE_SESSION_VERSION: "6" })).toBe(
      "gnome-libsecret",
    );
    expect(autoSwitch({ KDE_SESSION_VERSION: "6" })).toBe("gnome-libsecret");
    expect(autoSwitch({ KDE_FULL_SESSION: "true", KDE_SESSION_VERSION: "6" })).toBe(
      "gnome-libsecret",
    );
  });

  it("ignores stale session hints when XDG_CURRENT_DESKTOP is authoritative", () => {
    expect(
      autoSwitch({ XDG_CURRENT_DESKTOP: "niri", DESKTOP_SESSION: "gnome", GDMSESSION: "gnome" }),
    ).toBe("gnome-libsecret");
    expect(autoSwitch({ XDG_CURRENT_DESKTOP: "niri", KDE_SESSION_VERSION: "6" })).toBe(
      "gnome-libsecret",
    );
    expect(autoSwitch({ XDG_CURRENT_DESKTOP: "niri", XDG_SESSION_DESKTOP: "GNOME" })).toBe(
      "gnome-libsecret",
    );
    expect(autoSwitch({ XDG_CURRENT_DESKTOP: "niri:plasma" })).toBe("gnome-libsecret");
    expect(
      autoSwitch({
        XDG_CURRENT_DESKTOP: "Hyprland",
        XDG_SESSION_DESKTOP: "KDE",
        KDE_SESSION_VERSION: "6",
      }),
    ).toBe("gnome-libsecret");
  });

  it("keeps the opted-in basic store regardless of the desktop name", () => {
    expect(resolveLinuxPasswordStoreSwitch({ preference: "basic", env: {} })).toBe("basic");
    expect(
      resolveLinuxPasswordStoreSwitch({ preference: "basic", env: { XDG_CURRENT_DESKTOP: "KDE" } }),
    ).toBe("basic");
    expect(
      resolveLinuxPasswordStoreSwitch({
        preference: "basic",
        env: { XDG_CURRENT_DESKTOP: "GNOME" },
      }),
    ).toBe("basic");
  });

  it("accepts basic as a stored preference and rejects values this build cannot select", () => {
    expect(parseLinuxPasswordStorePreference("basic")).toBe("basic");
    expect(normalizeLinuxPasswordStorePreference("basic")).toBe("basic");
    expect(normalizeLinuxPasswordStorePreference("kwallet7")).toBe("auto");
    expect(normalizeLinuxPasswordStorePreference("auto")).toBe("auto");
    expect(normalizeLinuxPasswordStorePreference(undefined)).toBe("auto");
  });
});
