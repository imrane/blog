{
  description = "rauchg blog - Next.js with Redis";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            nodejs_22
            pnpm
            redis
          ];

          shellHook = ''
            # Create direnv data directory for Redis
            mkdir -p .direnv/data/redis
            
            # Redis config for localhost-only binding
            REDIS_CONF=".direnv/redis.conf"
            cat > "$REDIS_CONF" <<EOF
bind 127.0.0.1
port 6379
dir $(pwd)/.direnv/data/redis
appendonly yes
protected-mode yes
EOF

            # Start Redis if not already running
            if ! pgrep -f "redis-server.*$(pwd)" > /dev/null; then
              echo "🚀 Starting Redis (localhost only)..."
              redis-server "$REDIS_CONF" --daemonize yes
              echo "✅ Redis running on 127.0.0.1:6379"
            else
              echo "✅ Redis already running"
            fi

            # Set environment variables
            export REDIS_URL="redis://127.0.0.1:6379"
            export NODE_ENV="development"

            # Cleanup function for direnv
            trap 'redis-cli -h 127.0.0.1 shutdown 2>/dev/null || true' EXIT

            echo ""
            echo "📦 Blog environment ready!"
            echo "   Node: $(node --version)"
            echo "   pnpm: $(pnpm --version)"
            echo "   Redis: 127.0.0.1:6379"
            echo ""
            echo "Run: pnpm dev"
          '';
        };
      }
    );
}
