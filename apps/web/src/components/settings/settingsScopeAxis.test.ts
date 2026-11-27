import { EnvironmentId } from "@t3tools/contracts";
import { describe, expect, it } from "vite-plus/test";

import type { SidebarProjectSnapshot } from "../../sidebarProjectGrouping";
import {
  selectEnvironmentAxis,
  selectProjectAxis,
  selectSingleEnvironmentScope,
  settingsScopeCheckoutChoices,
  settingsScopeCheckoutLabel,
} from "./settingsScopeAxis";

const member = (environmentId: string, physicalProjectKey: string, workspaceRoot = "") =>
  ({
    environmentId,
    physicalProjectKey,
    workspaceRoot,
  }) as SidebarProjectSnapshot["memberProjects"][number];
const group = (...memberProjects: SidebarProjectSnapshot["memberProjects"]) =>
  ({ memberProjects }) as SidebarProjectSnapshot;

describe("settings scope axes", () => {
  it("drops a checkout narrowing from older links when either axis changes", () => {
    const checkout = { project: "app", checkout: "app@first", machine: "first" };
    expect(selectEnvironmentAxis(checkout, "second")).toEqual({
      project: "app",
      machine: "second",
    });
    expect(selectProjectAxis(checkout, "app")).toEqual({ project: "app", machine: "first" });
  });

  it("offers checkouts only where an environment cannot tell them apart", () => {
    const a = member("laptop", "a");
    const b = member("laptop", "b");
    const c = member("server", "c");

    expect(settingsScopeCheckoutChoices(group(a, b, c), { machine: "laptop" })).toEqual([a, b]);
    expect(settingsScopeCheckoutChoices(group(a, b), {})).toEqual([a, b]);
    expect(settingsScopeCheckoutChoices(group(a, b, c), { checkout: "b" })).toEqual([a, b]);
    expect(settingsScopeCheckoutChoices(group(a, b, c), {})).toEqual([]);
    expect(settingsScopeCheckoutChoices(group(a, b, c), { machine: "server" })).toEqual([]);
  });

  it("labels a checkout by its full path only when its folder name repeats", () => {
    const first = member("laptop", "a", "/work/one/app");
    const second = member("laptop", "b", "C:\\work\\two\\app");
    const other = member("laptop", "c", "/work/tools");

    expect(settingsScopeCheckoutLabel(second, [first, second, other])).toBe("C:\\work\\two\\app");
    expect(settingsScopeCheckoutLabel(other, [first, second, other])).toBe("tools");
  });
});

describe("single-environment settings scope", () => {
  const scopeFor = (environmentIds: ReadonlyArray<EnvironmentId>) =>
    ({
      kind: "all",
      label: "All environments",
      members: [],
      environmentIds,
    }) as Parameters<typeof selectSingleEnvironmentScope>[1];
  const environmentsFor = (
    ...environmentIds: ReadonlyArray<EnvironmentId>
  ): Parameters<typeof selectSingleEnvironmentScope>[2] =>
    environmentIds.map((environmentId) => ({
      environmentId,
      connection: { phase: "connected" as const },
    }));
  const laptop = EnvironmentId.make("laptop");
  const server = EnvironmentId.make("server");

  it("starts on the remembered environment instead of the primary one", () => {
    const search = selectSingleEnvironmentScope(
      {},
      scopeFor([laptop, server]),
      environmentsFor(laptop, server),
      laptop,
      server,
    );
    expect(search.machine).toBe(server);
  });

  it("keeps an explicit machine from the link", () => {
    const search = selectSingleEnvironmentScope(
      { machine: laptop },
      scopeFor([laptop, server]),
      environmentsFor(laptop, server),
      laptop,
      server,
    );
    expect(search.machine).toBe(laptop);
  });

  it("falls back to the primary environment when the remembered one is unavailable", () => {
    const search = selectSingleEnvironmentScope(
      {},
      scopeFor([laptop, server]),
      environmentsFor(laptop, server),
      laptop,
      EnvironmentId.make("removed"),
    );
    expect(search.machine).toBe(laptop);
  });

  it("ignores a remembered environment outside the selected scope", () => {
    const search = selectSingleEnvironmentScope(
      {},
      scopeFor([laptop]),
      environmentsFor(laptop, server),
      laptop,
      server,
    );
    expect(search.machine).toBe(laptop);
  });
});
