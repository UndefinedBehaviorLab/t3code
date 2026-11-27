import { RegistryContext } from "@effect/atom-react";
import { EnvironmentId } from "@t3tools/contracts";
import { describe, expect, it, vi } from "vite-plus/test";
import { userEvent } from "vite-plus/test/browser";

import { render } from "../../../test/render";
import { appAtomRegistry } from "../../rpc/atomRegistry";
import { SettingsScopeProvider, useSettingsScope } from "./SettingsScopeContext";

const fixtures = vi.hoisted(() => {
  const primary = "primary";
  const remote = "remote";
  return {
    ids: { primary, remote },
    environments: [primary, remote].map((environmentId) => ({
      environmentId,
      label: environmentId,
      connection: { phase: "connected" },
      serverConfig: null,
    })),
  };
});
const ids = fixtures.ids;

vi.mock(import("~/state/environments"), async (original) => ({
  ...(await original()),
  useEnvironments: (() => ({ environments: fixtures.environments })) as never,
  usePrimaryEnvironmentId: (() => fixtures.ids.primary) as never,
}));
vi.mock(import("./useSettingsProjectGroups"), () => ({
  useSettingsProjectGroups: () => [],
}));

const STORAGE_KEY = "t3:settings-environment:v1";

function Probe() {
  const { search, selectScope } = useSettingsScope();
  return (
    <div>
      <output data-testid="machine">{search.machine ?? "none"}</output>
      <button
        type="button"
        onClick={() => selectScope({ machine: EnvironmentId.make(ids.remote) })}
      >
        pick remote
      </button>
    </div>
  );
}

async function mount() {
  return render(
    <RegistryContext.Provider value={appAtomRegistry}>
      <SettingsScopeProvider search={{}} singleEnvironment onChange={() => {}}>
        <Probe />
      </SettingsScopeProvider>
    </RegistryContext.Provider>,
    { router: false },
  );
}

describe("settings environment preference", () => {
  it("starts a single-environment page on the remembered environment", async () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.setItem(STORAGE_KEY, ids.remote);
    await using screen = await mount();
    expect(screen.container.querySelector("[data-testid=machine]")?.textContent).toBe(ids.remote);
  });

  it("remembers an environment picked in a single-environment page", async () => {
    localStorage.removeItem(STORAGE_KEY);
    await using screen = await mount();
    await userEvent.click(screen.getByRole("button", { name: "pick remote" }));
    expect(localStorage.getItem(STORAGE_KEY)).toBe(ids.remote);
  });
});
