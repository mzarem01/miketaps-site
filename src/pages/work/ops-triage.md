---
layout: ../../layouts/ProjectLayout.astro
title: An alert pipeline that can't change anything
summary: Turning a noisy stream of monitoring alerts into one clean incident per real problem, with the evidence already gathered and a one-tap handoff to an AI for a second opinion.
kind: Automation
date: October 2026
order: 5
stack: [Python (standard library), Docker, Uptime Kuma, Discord webhooks, SQLite, docker-socket-proxy]
broke: The AI handoff link got cut off at about 1,000 characters, and a single percent sign stopped it decoding at all. The fix was a hard budget on what goes in the link.
teaser: One clean incident per real problem, the evidence attached, and nothing it's allowed to touch.
---

My server has a lot of monitors watching it. When something went down, I got a pile of Discord pings, then I had to sit at my desk and go dig through containers, disks and logs before I even knew what I was looking at. I wanted the first message to already have the answers to the first five questions I always ask.

So I built a small listener that sits between the monitoring and my phone.

## What it does

1. A monitor goes down and sends its alert to the listener.
2. The listener opens an incident with an ID (like `INC-20261027-03`) and a single post goes to Discord. Repeats stay quiet for 30 minutes, then one reminder.
3. Something that keeps going up and down gets one "flapping" post instead of twenty.
4. Before it posts, it gathers read-only evidence in a 5 second budget: container state, recent errors in the logs, whether the disks are actually mounted, system load, and the last backup result. That shows up as a card with warnings marked.
5. The card has an "Investigate with Claude" link with the evidence already filled in, so I can start figuring it out from my phone.
6. When the monitor comes back up, the incident closes quietly.

## Built so it can't hurt anything

The whole point of this thing is to read. So I made sure that's all it can do.

| Control | What it means |
| --- | --- |
| No published ports | Nothing on my network or my VPN can reach it. Only the monitoring app can talk to it. |
| Locked-down container | Runs as a normal user, read-only filesystem, every Linux capability dropped, small memory and CPU caps. |
| No Docker socket | It asks about containers through a proxy that only allows reading. I tested restart, create, delete and the rest: all of them came back 403. |
| No SSH, no keys | It has no way to log into anything or change anything. |
| Scrubbing | Push tokens, passwords, auth headers and anything that looks like a long secret are stripped before anything is stored or posted. |
| Rate limit | Six posts an hour max, then one notice, so a bad night can't flood the channel. |

## Treating logs as untrusted

Log lines go into a prompt for an AI, and log lines can contain anything, including text someone else wrote. So they're labeled untrusted inside the prompt, and the AI only gets a handful of them. It's a small thing, but it's the same idea as not running a command you found in an email.

I also tried running this with the local model on my desktop. It wasn't good enough at multi-step reasoning, so scripts gather the facts and the cloud model only gets involved when I tap the link.

## What broke

The first real test from my phone opened the chat with the prompt cut off mid-sentence and still URL-encoded. I measured it: the app only keeps about the first 1,000 characters of the link, and a literal percent sign stops it decoding. So the link now has a hard budget of 950 encoded characters (warnings first, then the key facts, then up to four error lines), percent is written out as "pct," and the full evidence goes on the Discord card and in the incident file instead.

## Has it caught anything?

Yes. The backup of my desktop failed twice in November. Both times the card made the cause quick to find: a desktop app was running during the backup window and had files locked, so the backup couldn't read them. Not a disk problem and not a backup bug. Without the evidence attached, my first guess would've been the drive.

## Lessons

- Decide what a tool is allowed to do before you decide what it does. Read-only from the start was easier than locking it down later.
- Test the permissions you denied, not just the ones you granted. The 403s are the proof.
- Measure the limits of the thing on the other end. "The link should work" was an assumption until I opened it on a phone.
- Gather facts with scripts, and save the AI for the part that needs judgment.
