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
    # 上游只在发版时 bump package.json 的 version，本地 fork 从 main 构建时它一直是旧号。
    # 直接沿用会让这份 build 冒充官方发布：t3 的 runtime 目录名、DB 迁移判定
    # （hasPendingMigrations）、`t3 update`/`t3 status` 全都只比版本字符串，于是本地
    # build 和官方同号不同 schema 的包互相打架。这里用 semver build metadata 打本地标记：
    # 排序仍按上游版本（0.1.11+local < 0.1.12），但对 t3 是另一个版本，且
    # isExactServiceVersion 的正则接受 `+local` 这种 build metadata。
    #
    # 故意不带 git rev：版本号会进 `~/.t3/runtime/versions/<version>/` 目录名，
    # 每次提交都变的话服务单元就得跟着重写。要定位具体 build 用 `git -C src rev-parse`。
    version = let
      upstream = (nixpkgs.lib.importJSON ./apps/desktop/package.json).version;
    in "${upstream}+local";
    # Same value nixpkgs pins for v0.1.6; recompute (fakeHash, read `got:`) after a
    # lockfile change.
    pnpmDepsHash = "sha256-2WaOGiNimJYGQTfFt8ZlCrY8sO2uv+x9M1Zg2aXlpA8=";
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
