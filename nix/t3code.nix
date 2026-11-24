{
  lib,
  callPackage,
  symlinkJoin,
  makeBinaryWrapper,
  enableAzureDevOps ? false,
  azure-cli,
  azure-cli-extensions,
  enableBitbucket ? false,
  bitbucket-cli,
  enableClaude ? false,
  claude-code,
  enableCodex ? true,
  codex,
  enableCursor ? false,
  code-cursor,
  enableCursorCli ? false,
  cursor-cli,
  enableGitHub ? true,
  gh,
  enableGit ? true,
  git,
  enableGitLab ? false,
  glab,
  enableJujutsu ? false,
  jujutsu,
  enableOpencode ? false,
  opencode,
  # crates.io downloads time out inside the build sandbox on this host; the
  # monitor is an optional telemetry sidecar, so opt in explicitly.
  enableResourceMonitor ? false,
  src,
  version,
  pnpmDepsHash ? lib.fakeHash,
  cargoHash ? lib.fakeHash,
  t3code-unwrapped ? callPackage ./t3code-unwrapped.nix {
    inherit src version pnpmDepsHash;
  },
  t3code-resource-monitor ? callPackage ./t3code-resource-monitor.nix {
    inherit src version cargoHash;
  },
}:

let
  runtimePackages =
    lib.optionals enableAzureDevOps [
      (azure-cli.withExtensions [ azure-cli-extensions.azure-devops ])
    ]
    ++ lib.optionals enableBitbucket [ bitbucket-cli ]
    ++ lib.optionals enableClaude [ claude-code ]
    ++ lib.optionals enableCodex [ codex ]
    ++ lib.optionals enableCursor [ code-cursor ]
    ++ lib.optionals enableCursorCli [ cursor-cli ]
    ++ lib.optionals enableGitHub [ gh ]
    ++ lib.optionals enableGit [ git ]
    ++ lib.optionals enableGitLab [ glab ]
    ++ lib.optionals enableJujutsu [ jujutsu ]
    ++ lib.optionals enableOpencode [ opencode ];

  # The resource monitor sidecar is a separate Rust binary that upstream only
  # builds in its electron-builder pipeline, not in `build:desktop`. The server
  # checks this variable before any bundled location, and the desktop app's
  # server child inherits it.
  wrapperArgs =
    lib.optionals (runtimePackages != [ ]) [
      "--prefix"
      "PATH"
      ":"
      (lib.makeBinPath runtimePackages)
    ]
    ++ lib.optionals enableResourceMonitor [
      "--set-default"
      "T3CODE_RESOURCE_MONITOR_PATH"
      (lib.getExe t3code-resource-monitor)
    ]
    # Product analytics (PostHog, via ingest.t3.codes) is on by default in the
    # upstream source: `AnalyticsService` reads `T3CODE_TELEMETRY_ENABLED` with
    # `Config.withDefault(true)`. Set it here so every binary in this package
    # starts with it off.
    #
    # `--set` and not `--set-default`: with the latter a `T3CODE_TELEMETRY_ENABLED=true`
    # left in a shell profile wins. The desktop app spawns the server child with
    # `extendEnv: true`, so this value reaches the process that actually sends.
    # This also turns off relay OTLP tracing (`isRelayTracingEnabled` reads the
    # same flag); local OTLP export to your own collector (`T3CODE_OTLP_*`) is a
    # different path and stays untouched.
    #
    # Kept outside the optionals above on purpose: `wrapperArgs` being empty would
    # skip `postBuild` entirely and silently drop this.
    ++ [
      "--set"
      "T3CODE_TELEMETRY_ENABLED"
      "false"
    ];

in
symlinkJoin {
  pname = "t3code";
  inherit (t3code-unwrapped) version;
  __structuredAttrs = true;
  strictDeps = true;

  paths = [ t3code-unwrapped ];

  nativeBuildInputs = [ makeBinaryWrapper ];

  postBuild = lib.optionalString (wrapperArgs != [ ]) ''
    for program in "$out/bin"/*; do
      wrapProgram "$program" ${lib.escapeShellArgs wrapperArgs}
    done
  '';

  passthru = {
    unwrapped = t3code-unwrapped;
  }
  // lib.optionalAttrs enableResourceMonitor { resourceMonitor = t3code-resource-monitor; }
  // t3code-unwrapped.passthru;

  meta = {
    inherit (t3code-unwrapped.meta)
      description
      homepage
      license
      mainProgram
      platforms
      ;
  };
}
