# Firewall rules for the site container

The site container lives on its own Docker network, pinned to `172.28.0.0/16` in
`compose.yaml`. It only ever answers requests; it never needs to start a connection.
These two rules make sure it can't, even if someone found a way to run code inside it:

```sh
# nothing from the site network may start a connection through the host (LAN, other containers, internet)
iptables -I DOCKER-USER 1 -s 172.28.0.0/16 -m conntrack --ctstate NEW -j DROP
# nothing from the site network may start a connection to the host itself
iptables -I INPUT 1 -s 172.28.0.0/16 -m conntrack --ctstate NEW -j DROP
```

They're persisted in `/etc/iptables/rules.v4` on the server. They come first on purpose:
other DOCKER-USER rules allow `172.16.0.0/12` (all Docker networks) to reach internal
dashboards, and the site network falls inside that range.

Check them with `iptables -S DOCKER-USER | head -3` and `iptables -S INPUT | head -3`.
