---
layout: ../../layouts/ProjectLayout.astro
title: "Postmortem: load 5.8 on four cores, with 11% CPU"
summary: The server felt overloaded and the old CPU looked guilty. One command proved it innocent. The real cause was disk I/O I'd configured myself.
kind: Postmortem
date: August 28, 2026
order: 4
stack: [Linux load average, docker stats, iostat, Netdata]
broke: My first hypothesis. It fit every symptom and was completely wrong.
teaser: A plausible explanation is not a diagnosis.
---

## Symptom

Web UIs took seconds to load, SSH lagged, and playback stuttered.

```
$ uptime
 load average: 5.78, 5.22, 4.12
```

On four cores, that reads as overloaded. And on a CPU from 2009, the conclusion writes itself.

## First hypothesis (wrong)

"The old Athlon is finally too slow." It matched a story I already believed, and replacing it was already on my list. That's exactly why it deserved checking before I spent money on it.

## The evidence

If the machine were CPU-bound, the containers would be using the CPU. So I looked.

```
$ docker stats --no-stream
```

Combined CPU across the whole stack: about **11 to 12 percent.** That one number was the diagnosis.

## Root cause

On Linux, load average isn't a CPU measurement. It counts processes that are runnable **and** processes stuck waiting on I/O. A process waiting on the disk adds to the load while using no CPU at all. High load with low CPU means the box is I/O-bound, and a faster processor would have changed nothing.

Two causes, both my own doing:

1. **Too many active transfers.** The download client was allowed 20 at once against a pool with a spinning disk, which meant a deep queue of small reads and writes.
2. **Monitoring sampling every second.** The telemetry container was installed with defaults and polled everything once a second. The monitoring tool was a real part of the load it was reporting.

## Fix and proof

| | Before | After |
| --- | --- | --- |
| Active transfers (down / up / total) | 10 / 10 / 20 | 3 / 3 / 6 |
| Telemetry interval | 1 second | 5 seconds |
| Telemetry container CPU | 8.52% | 2.76% |
| 1-minute load average | 5.78 | 3.23 |

Load dropped 44% within minutes. No hardware, no reboot, no downtime.

## What I took from it

- **Load average is queue depth, not CPU.** Compare it against real CPU use before blaming the processor.
- **Defaults are someone else's decision for a different machine.** On constrained hardware, check them.
- **Measure before and after.** That's what turns "I think that helped" into a fact.

> A plausible explanation is not a diagnosis.
