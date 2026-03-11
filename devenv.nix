{ pkgs, ... }:
{
  languages.javascript = {
    enable = true;
    package = pkgs.nodejs_22;
    pnpm.enable = true;
  };

  services.redis.enable = true;

  env.REDIS_URL = "redis://127.0.0.1:6379";

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
