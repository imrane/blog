{ pkgs, ... }:
{
  languages.javascript = {
    enable = true;
    package = pkgs.nodejs_22;
    pnpm.enable = true;
  };

  packages = with pkgs; [
    git
    nodePackages.prettier
  ];

  enterShell = ''
    if [ ! -d node_modules ]; then
      echo "Installing dependencies (pnpm install --frozen-lockfile)..."
      pnpm install --frozen-lockfile
    fi
  '';

  processes.blog.exec = "pnpm dev";
}
