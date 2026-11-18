{
  lib,
  rustPlatform,
  src,
  version,
  cargoHash ? lib.fakeHash,
}:

rustPlatform.buildRustPackage {
  pname = "t3code-resource-monitor";
  inherit version src;

  # stdenv strips the store hash prefix when copying a directory source, so the
  # unpacked tree is always `source/`.
  sourceRoot = "source/native/resource-monitor";

  inherit cargoHash;

  meta = {
    description = "Native resource diagnostics sidecar for T3 Code";
    homepage = "https://t3.codes";
    license = lib.licenses.mit;
    mainProgram = "t3-resource-monitor";
  };
}
