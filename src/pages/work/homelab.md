---
layout: ../../layouts/ProjectLayout.astro
title: A year of running my own server
summary: An old office PC turned into the server my household uses every day, then moved to better hardware. The decisions, the trade-offs, and what I got wrong.
kind: Infrastructure
date: 2025 to 2026
order: 2
stack: [Debian, Docker, CasaOS, mergerfs, Jellyfin, Immich, Pi-hole, Uptime Kuma, rsync, cron]
broke: My docs. Addresses drifted and notes went stale while I trusted them. Verify against the system, not your notes.
teaser: No forwarded ports, backups that report in, and a list of what I'd do differently.
---

It started with a dusty 2009 office PC: a quad-core with 8 GB of RAM. I wiped Windows, put Debian on it and SSH'd in from my desktop. That was my first time using Linux that way, and I immediately wanted to know what else it could do.

A year later it runs about twenty containers and my household depends on it every day. That changes how you think. Once people rely on something, you start caring about who can reach it and what happens when it breaks, which is a big part of why I'm moving into security.

## What it runs

| | |
| --- | --- |
| Host | Dell OptiPlex 5050 SFF (i7-7700, 32 GB), Debian, headless, managed over SSH. Moved off the 2009 PC in September 2026 |
| Media | Jellyfin, now with hardware transcoding on the Intel iGPU |
| Photos | Immich, replacing cloud photo storage |
| DNS | Pi-hole filtering for the whole house |
| Monitoring | Uptime Kuma with chat alerts, resource telemetry, and an outside check-in that alerts if the whole server goes dark |
| Power | A UPS that shuts the server down cleanly when the battery runs low |

## Decisions worth explaining

**mergerfs instead of RAID.** My disks are different sizes and ages. mergerfs pools them into one folder without striping, so if one dies, the files on the other are still readable. The trade is no redundancy at all, so I paid for backups instead of parity. RAID buys uptime, not safety.

**No forwarded ports, ever.** Private access goes over a WireGuard-based mesh VPN. Nothing on my home connection listens to the internet. The few things that are public go out through an outbound-only tunnel, scoped by hostname, with a 404 for everything else.

**Backups outside the pool.** If the backup drive is part of the pool, a bad command deletes both copies at once. Keeping them separate means a mistake has to be made twice.

**Backups that report in.** Each nightly job pings the uptime monitor when it finishes. A backup that silently stops running raises an alert instead of quietly doing nothing.

**SSH is key-only.** Brute force stops being a threat instead of something to mitigate. It also locked my phone out two weeks later, which taught me to check what I was still using a door for before closing it.

## What I got wrong

- **Start with better hardware.** The 2009 board had no USB 3.0 and couldn't transcode. A cheap used small form factor PC would have saved months of evenings. In September 2026 I finally bought one.
- **Monitoring and backups came after the first quiet failure.** Both should have been there on day one.
- **My network was flat.** The server shared a segment with a no-name pet camera. That's fixed now, see the network upgrade.
- **I trusted my notes.** They were wrong more often than I'd like to admit.

> Knowing what not to build is a decision too.
