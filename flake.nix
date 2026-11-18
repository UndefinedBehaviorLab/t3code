{
  description = "T3 Code";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = {
    self,
    nixpkgs,
  }: let
    systems = [
      "x86_64-linux"
      "aarch64-linux"
      "x86_64-darwin"
      "aarch64-darwin"
    ];
    version = (nixpkgs.lib.importJSON ./apps/desktop/package.json).version;
    # Same value nixpkgs pins for v0.1.6; recompute (fakeHash, read `got:`) after a
    # lockfile change.
    pnpmDepsHash = "sha256-s/vm8Ox4o/AYpNC/amYP1KFWwh7SY5bCmVBuIJn9f/c=";
  in {
    packages = nixpkgs.lib.genAttrs systems (
      system: let
        pkgs = import nixpkgs {
          inherit system;
          config.allowUnfree = true;
        };
        t3code = pkgs.callPackage ./nix/t3code.nix {
          src = self;
          inherit version pnpmDepsHash;
          # The Rust sidecar vendors crates from crates.io inside the sandbox,
          # which times out on some networks. Opt in with `.override {}`.
          enableResourceMonitor = false;
        };
      in {
        inherit t3code;
        default = t3code;
      }
    );
  };
}
