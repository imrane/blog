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

        blog = pkgs.callPackage ./nix/package.nix { };
        devShell = devenv.lib.mkShell {
          inherit inputs pkgs;
          modules = [
            ({ ... }: {
              devenv.root = lib.mkForce (toString ./.);
            })
            ./devenv.nix
          ];
        };
      in
      {
        packages = {
          default = blog;
          blog = blog;
        };

        apps.default = {
          type = "app";
          program = "${blog}/bin/blog";
        };

        devShells.default = devShell;
      }
    );
}
