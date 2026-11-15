---
layout: ../../layouts/ProjectLayout.astro
title: A SOC lab that caught a brute-force attack
summary: A Wazuh SIEM watching Linux, macOS and Windows machines over a private mesh VPN, proven end to end by attacking my own server and timing the alert.
kind: Security project
date: July 2026
order: 1
stack: [Wazuh 4.9, Ubuntu Server 24.04, VirtualBox, Tailscale, Debian, macOS, Windows 11]
broke: macOS wanted a system extension approved by hand, and the Windows agent wouldn't install silently without an elevated shell.
teaser: 11 failed logins became one correlated alert in about 64 seconds.
---

I wanted to know what a security operations center actually sees, so I built a small one. A single-node Wazuh stack (manager, indexer and dashboard) runs in a VM, and three machines report to it: my Debian server, a MacBook and my Windows workstation.

Everything talks over a Tailscale mesh VPN. Agents enroll against the manager's stable mesh address instead of a LAN address that DHCP can change, and nothing in the lab is exposed to the public internet.

<figure>
  <img src="/img/work/soc-endpoints.webp" alt="Wazuh endpoints summary showing three active agents: Debian, macOS and Windows" width="1272" height="973" loading="lazy" />
  <figcaption>Three agents, three operating systems, all reporting Active.</figcaption>
</figure>

## How it's built

| Piece | Role |
| --- | --- |
| SIEM VM | Wazuh manager, indexer and dashboard, all in one (8 GB RAM, 4 vCPU, 100 GB disk) |
| Debian server | Monitored endpoint, the always-on home server |
| MacBook | Monitored endpoint |
| Windows workstation | Monitored endpoint and the VM's host |

The VM uses a bridged adapter so it shows up on the network like any other machine. I also had to grow the LVM root volume, because the Ubuntu installer only allocates half the disk by default.

## The test

A SIEM that's never fired is just a dashboard. So I ran a brute-force attack against my own server: repeated SSH logins with a username that doesn't exist.

- **11** authentication failures captured, **0** successful logins
- Each failure logged on its own as rule 5710, level 5
- Once the failures crossed the threshold, Wazuh raised rule **5712, "sshd: brute force trying to get access"**, level 10
- First failed login to correlated alert: **about 64 seconds**

<figure>
  <img src="/img/work/soc-dashboard.webp" alt="Wazuh threat hunting dashboard showing 11 total events, 11 authentication failures, 0 successes" width="1278" height="1233" loading="lazy" />
  <figcaption>Eleven failures, zero successes.</figcaption>
</figure>

Wazuh tagged the alert with **MITRE ATT&CK T1110** (Brute Force) and mapped it to PCI DSS, NIST 800-53 and HIPAA controls on its own. That's the language findings get reported in, so seeing it attached to my own alert made it click.

<figure>
  <img src="/img/work/soc-alert.webp" alt="Alert detail for rule 5712 with the MITRE T1110 mapping and compliance controls, addresses redacted" width="1262" height="1256" loading="lazy" />
  <figcaption>The full alert, with network addresses blacked out.</figcaption>
</figure>

## What I learned

- The difference between an **event** and an **alert**. Eleven events are noise. One correlated alert is something a person should look at.
- Deploying agents across three operating systems is mostly about each platform's quirks, not the SIEM.
- A mesh VPN lets you monitor everything without opening a single port.

## Where it stands

The SIEM is shut down for now and the write-up carries the project. Next on the list is the other half of the job: fail2ban on the server to block the attack automatically, then running it again to show detect, respond and verify.
