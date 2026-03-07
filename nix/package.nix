{
  lib,
  stdenv,
  nodejs_22,
  pnpm,
  pnpmConfigHook,
  fetchPnpmDeps,
  bash,
  ...
}:
stdenv.mkDerivation (finalAttrs: {
  pname = "imrane-blog";
  version = "0.1.0";

  src = lib.cleanSource ../.;

  pnpmDeps = fetchPnpmDeps {
    inherit (finalAttrs) pname version src;
    fetcherVersion = 2;
    hash = "sha256-GvCstnxFFSn59E6HdVWuTjLVpcKd/3kWFwHxdxEZETk=";
  };

  nativeBuildInputs = [
    nodejs_22
    pnpm
    pnpmConfigHook
  ];

  env = {
    SKIP_VIEWS = "1";
    SKIP_TWEET_FETCH = "1";
    NEXT_TELEMETRY_DISABLED = "1";
  };

  pnpmInstallFlags = [ "--prod=false" ];

  buildPhase = ''
    runHook preBuild
    node ./fonts/init.mjs
    pnpm run build
    runHook postBuild
  '';

  installPhase = ''
    runHook preInstall

    mkdir -p $out/share/blog
    cp -r .next/standalone $out/share/blog/standalone
    cp -r .next/static $out/share/blog/static
    cp -r public $out/share/blog/public

    mkdir -p $out/bin
    cat > $out/bin/blog <<EOF
    #!${bash}/bin/bash
    set -euo pipefail

    export HOST="''${HOST:-127.0.0.1}"
    export PORT="''${PORT:-3000}"

    cd "$out/share/blog/standalone"
    mkdir -p .next
    ln -sfn "$out/share/blog/static" .next/static
    ln -sfn "$out/share/blog/public" public

    exec ${nodejs_22}/bin/node server.js
    EOF
    chmod +x $out/bin/blog

    runHook postInstall
  '';

  meta = {
    description = "Next.js blog packaged with Nix";
    mainProgram = "blog";
    platforms = lib.platforms.linux;
  };
})
