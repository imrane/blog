{ config, lib, pkgs, ... }:
let
  cfg = config.services.imrane.blog;
in
{
  options.services.imrane.blog = {
    enable = lib.mkEnableOption "Imrane blog service";

    package = lib.mkOption {
      type = lib.types.package;
      default = pkgs.callPackage ./package.nix { };
      description = "Package to run for the blog service.";
    };

    host = lib.mkOption {
      type = lib.types.str;
      default = "127.0.0.1";
      description = "Host address that Next.js binds to.";
    };

    port = lib.mkOption {
      type = lib.types.port;
      default = 3000;
      description = "Port for the blog service.";
    };

    environment = lib.mkOption {
      type = lib.types.attrsOf lib.types.str;
      default = { };
      description = "Extra environment variables for the service.";
    };

    environmentFile = lib.mkOption {
      type = lib.types.nullOr lib.types.path;
      default = null;
      description = "Optional EnvironmentFile (e.g. from sops-nix/agenix).";
    };

    openFirewall = lib.mkOption {
      type = lib.types.bool;
      default = false;
      description = "Open blog port in the firewall.";
    };
  };

  config = lib.mkIf cfg.enable {
    networking.firewall.allowedTCPPorts = lib.mkIf cfg.openFirewall [ cfg.port ];

    systemd.services.imrane-blog = {
      description = "Imrane Blog (Next.js)";
      wantedBy = [ "multi-user.target" ];
      after = [ "network.target" ];

      environment =
        {
          HOST = cfg.host;
          PORT = toString cfg.port;
          NODE_ENV = "production";
        }
        // cfg.environment;

      serviceConfig = {
        ExecStart = "${cfg.package}/bin/blog";
        Restart = "on-failure";
        RestartSec = 3;
        DynamicUser = true;
        StateDirectory = "imrane-blog";
        WorkingDirectory = "/var/lib/imrane-blog";
        EnvironmentFile = lib.mkIf (cfg.environmentFile != null) cfg.environmentFile;

        NoNewPrivileges = true;
        PrivateTmp = true;
        ProtectSystem = "strict";
        ProtectHome = true;
        ProtectKernelTunables = true;
        ProtectKernelModules = true;
        ProtectControlGroups = true;
        RestrictSUIDSGID = true;
        LockPersonality = true;
        MemoryDenyWriteExecute = true;
      };
    };
  };
}
