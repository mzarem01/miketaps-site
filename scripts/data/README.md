# Season data

`pfr-franchise.txt` is the Washington franchise table from Pro Football Reference
(https://www.pro-football-reference.com/teams/was/), one season per line:

    year|team|wins|losses|ties|division finish|playoff result|points for|points against|coaches

A `*` after the team name means the team made the playoffs that year. Team names are
shortened (`W` = Washington, `B` = Boston).

It was read once from that one page on 2026-11-14. Don't scrape Sports Reference: their
terms don't allow building sites from scraped data. To update it, open the page, use
Share & Export on the franchise table, and edit the lines that changed by hand.

`npm run seasons` turns it into `src/data/seasons.json` and fails if anything looks off
(missing or doubled years, wrong number of games for the schedule, a playoff marker that
doesn't match the result). The build runs it every time.
