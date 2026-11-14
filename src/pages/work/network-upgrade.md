---
layout: ../../layouts/ProjectLayout.astro
title: Walling off the server from the pet camera
summary: Moving my home network from a consumer mesh router to gear I can segment, in phases, without anyone in the house noticing the internet go down.
kind: Networking
date: October 2026
order: 3
stack: [MikroTik hEX (RouterOS), Zyxel GS1900-8, CyberPower UPS, NUT, Pi-hole]
repo: https://github.com/mzarem01/homelab-network-upgrade
broke: The firewall rules "worked" but every counter read zero. The switch chip was forwarding traffic in hardware, so the firewall never saw a packet.
teaser: An allow-list firewall, and the hardware offload trap that almost fooled me.
---

My server, my workstation, the TVs, a doorbell and a no-name pet camera all shared one flat network. The mesh router couldn't do VLANs at all. This project fixes that, with one rule: the internet has to keep working after every phase, because other people live here.

## The gear

| Role | Device | Why |
| --- | --- | --- |
| Router and firewall | MikroTik hEX | Cheap, VLAN-capable, full RouterOS |
| Switch | Zyxel GS1900-8 | Managed, 802.1Q VLANs |
| UPS | CyberPower 1000VA | Keeps the network core and server up, then shuts the server down cleanly |
| Wi-Fi | The old mesh router | Demoted to access point only |

## The phases

1. **Physical install.** UPS and managed switch in, no config changes.
2. **New router.** The MikroTik takes over routing with the exact same addressing, so nothing that pointed at the old setup had to change. The mesh drops to bridge mode.
3. **Wall off the server.** The server gets its own port on the router, so every connection to it has to cross the firewall.
4. **Later:** separate IoT and guest Wi-Fi once I have an access point that can tag VLANs.

## Allow-list, not block-list

I didn't want to hunt down every IoT device and block it one by one. New stuff shows up all the time. So it's flipped: my desktop gets full access, and everything else gets only what it needs (DNS, the media server, the VPN, ping). Everything else is logged and dropped.

## The part that almost fooled me

I turned on bridge filtering, tested, and everything worked. Then I looked at the counters: all zero. The router's switch chip was still passing traffic between those ports in hardware, so the firewall never saw a thing. "Everything still works" was the bad sign, not the good one.

Turning off hardware offload on the server's port fixed it, and the counters started climbing right away. I also blocked IPv6 on that port so nothing could route around the IPv4 rules.

> When you add a firewall rule, check the counters, not just that things still work.

## Testing it

From my phone on Wi-Fi with the VPN off, the server's dashboard spun and timed out, the media server still played, and the router logged every blocked attempt. With the VPN on, the dashboard came right up.

## Lessons

- Plan the UPS outlets before plugging anything in. The TV doesn't need battery. The switch does.
- Know what depends on what. My server runs DNS for the house, so turning it off looks exactly like the internet going down.
- Never plug an unconfigured router into a live network. Out of the box it runs its own DHCP server.
- Build a safety net before changing firewall rules on the device you manage everything through. Mine was a background job that undid the change after three minutes unless I cancelled it.
