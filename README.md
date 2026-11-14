# miketaps.com

My personal site: projects I've built, a few things I care about, and the site itself
as a project. It's a static site built with [Astro](https://astro.build) and served
from a server in my home through a Cloudflare Tunnel, so no ports are open on my network.

## How a change goes live

1. A change is made on a branch and opened as a pull request.
2. GitHub Actions builds the site and runs the content check (see below).
3. I review the pull request and merge it.
4. On `main`, Actions builds again and publishes a GitHub Release
   (`site.tar.gz` plus its SHA-256 checksum).
5. On the home server, `site-update` runs every 5 minutes, sees the new release,
   verifies the checksum, unpacks it and switches the live site to it.

The server only ever pulls from GitHub. It never accepts incoming connections for
deploys, and it needs no GitHub token because this repo is public.

## Rolling back

On the server:

```sh
site-rollback --list     # see releases on disk, live one marked with *
site-rollback            # go back one release (pauses automatic updates)
site-update --unpin      # resume updates once main is fixed
```

Or revert the bad pull request on GitHub, which ships the old version the normal way.

## The content check

`npm run check` fails the build if anything contains:

- an em dash
- a private network address (home LAN, Docker or Tailscale ranges)
- a private term (employer, places, names), read from the `PRIVACY_TERMS` secret in CI
  or a local `.privacy-terms` file that is never committed

## Working on it locally

```sh
npm install
npm run dev      # local preview at http://localhost:4321
npm run ci       # build + content check, same as CI
```

Needs Node 22.23.4 or newer.

## What's where

| Path | What it is |
| --- | --- |
| `src/pages/` | One file per page |
| `src/layouts/Base.astro` | Header, footer and page shell |
| `src/styles/global.css` | Colors, fonts and spacing (light and dark) |
| `public/` | Files served as-is (favicon, robots.txt) |
| `scripts/check-content.mjs` | The content check |
| `ops/compose.yaml` | The web server container (hardened, localhost only) |
| `ops/nginx/default.conf` | Web server config and security headers |
| `ops/bin/` | `site-update` and `site-rollback` |
| `ops/systemd/` | Timer that runs `site-update` every 5 minutes |
| `AGENTS.md` | Rules for anyone editing the repo |

## Server setup (one time)

```sh
sudo useradd --system --no-create-home --shell /usr/sbin/nologin miketaps-deploy
sudo mkdir -p /srv/miketaps/site/releases
sudo chown -R miketaps-deploy:miketaps-deploy /srv/miketaps/site
sudo cp ops/compose.yaml /srv/miketaps/compose.yaml
sudo cp -r ops/nginx /srv/miketaps/nginx
sudo install -m 755 ops/bin/site-update ops/bin/site-rollback /usr/local/bin/
sudo cp ops/systemd/miketaps-update.* /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now miketaps-update.timer
sudo -u miketaps-deploy site-update
cd /srv/miketaps && sudo docker compose up -d
```

Then add `miketaps.com` and `www.miketaps.com` to the Cloudflare Tunnel's ingress rules,
pointing at `http://localhost:8090`, above the catch-all rule.
