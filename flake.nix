{
  description = "Imran's blog (Next.js) with Nix packaging, module, and devenv";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    devenv.url = "github:cachix/devenv";
  };

  outputs =
    inputs@{ self, nixpkgs, flake-utils, devenv, ... }:
    {
      nixosModules.blog = import ./nix/module.nix;
    }
    // flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = import nixpkgs {
          inherit system;
        };
        lib = pkgs.lib;
        isLinux = pkgs.stdenv.isLinux;

        blog = pkgs.callPackage ./nix/package.nix { };
        devenvPkg = devenv.packages.${system}.devenv;
        devShell = devenv.lib.mkShell {
          inherit inputs pkgs;
          modules = [ ./devenv.nix ];
        };
      in
      {
        packages = lib.optionalAttrs isLinux {
          default = blog;
          blog = blog;
        } // {
          devenv = devenvPkg;
        };

        apps = lib.optionalAttrs isLinux {
          default = {
            type = "app";
            program = "${blog}/bin/blog";
          };
        } // {
          devenv = {
            type = "app";
            program = "${devenvPkg}/bin/devenv";
          };
        };

        devShells.default = devShell;
      }
    );
}
