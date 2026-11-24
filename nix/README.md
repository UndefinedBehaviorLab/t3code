# Nix packaging

Builds the desktop app and CLI from this checkout, for use from a NixOS/home-manager flake.
Layout and build steps come from nixpkgs' `pkgs/by-name/t3/t3code`, with `src`, `version`, and
the dependency hashes lifted out so they can point at this tree.

```sh
nix build .#default            # ./result/bin/{t3,t3code-desktop}
nix build .#default -L         # full build log
```

T3 Connect (relay login and tunnels) needs public identifiers baked in at build time; the package
exports the values `.env.example` documents, so the build talks to the production relay like the
official ones. `connectPublicConfig = false` drops them and keeps cloud commands disabled — that
is the default here, because this fork must not reach the production relay; pass
`.override { connectPublicConfig = true; }` to bake them back in.

Product analytics is turned off too: the wrapper sets `T3CODE_TELEMETRY_ENABLED=false` with
`--set` (not `--set-default`, so a shell profile cannot switch it back on), and
`apps/server/src/telemetry/AnalyticsService.ts` defaults the flag to `false`. Local OTLP export to
your own collector (`T3CODE_OTLP_*`) is a separate path and still works.

`version` follows `apps/desktop/package.json`. `enableResourceMonitor` defaults to `false` here
because the Rust sidecar vendors crates from crates.io inside the build sandbox, which times out
on some networks; turn it on with `pkgs.t3code.override { enableResourceMonitor = true; }` after
filling in `cargoHash` in `t3code-resource-monitor.nix`.

## Wiring into a system flake

```nix
inputs.t3code-local = {
  url = "git+file:///path/to/this/checkout";
  inputs.nixpkgs.follows = "nixpkgs-unstable";
};

# where pkgs-unstable is imported
pkgs-unstable = import nixpkgs-unstable {
  # ...
  overlays = [
    (_final: _prev: {
      t3code = inputs.t3code-local.packages.${system}.default;
    })
  ];
};
```

Then `nix flake update t3code-local && nixos-rebuild switch` picks up new commits.

## Dependency hashes

`pnpmDepsHash` in `flake.nix` covers the pnpm store. After `pnpm-lock.yaml` changes, set it to
`nixpkgs.lib.fakeHash`, build once, and paste the `got:` value from the mismatch error.
