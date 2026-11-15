# Rules for anyone (human or AI) editing this repo

This is the source for miketaps.com, a personal site that is built and hosted at home.
Claude maintains it; Mike reviews and merges every change.

## Workflow

- Never push to `main`. Every change is a pull request with a plain-words summary and
  screenshots of any page that changed.
- A merge to `main` publishes a release, and the home server deploys it within about
  5 minutes. Treat a merge as "live".
- `npm run ci` must pass locally before opening a pull request.

## Writing style

- No em dashes anywhere (site, docs, comments, commit messages). Use commas, colons,
  parentheses or separate sentences. The content check fails the build on one.
- Write like Mike talks: plain, direct, a little dry. No marketing language.

## Privacy

- Never name Mike's employer, his town, his address, family members or his gym.
- Never publish internal IP addresses, ports, hostnames, Tailscale names or admin URLs.
  Diagrams show roles and trust zones only.
- Private terms are checked by `scripts/check-content.mjs` using a secret list that
  lives outside the repo. Don't try to add those terms to the repo.

## Accuracy

- Project pages only claim what is already in Mike's own write-ups and repos.
  Don't invent skills, tools, numbers or results.
- Washington franchise history: every fact needs a source link, checked against that
  page before it's added. No AI-written history.
- Season stats come only from `scripts/data/pfr-franchise.txt` (Pro Football Reference,
  credited on the page). Never scrape Sports Reference; edit that file by hand from their
  Share & Export table. Stat machine facts are computed from the data in
  `public/js/gameday.js`, never typed in, and each one links to the seasons behind it.
- Scripture: World English Bible text only, copied by script from the eBible.org files,
  never retyped or paraphrased. Label it "WEB". Commentary goes in a separate,
  clearly labeled box.

## What stays off the site

- The media-acquisition side of the home server, game emulation, and anything that
  describes the local AI as "uncensored".
