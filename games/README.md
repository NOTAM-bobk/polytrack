# Adding a game

Each game lives in its own folder:

```text
games/
  config.json
  my-game/
    index.html
```

Add one entry to `games/config.json` for each game:

```json
{
  "domain": "benlaunches.icu",
  "games": [
    {
      "subdomain": "my-game",
      "name": "My Game",
      "subtext": "Optional short description"
    }
  ]
}
```

The hub will add the game under **More Games** and link it to
`https://my-game.benlaunches.icu`. When the wildcard domain is configured for
this Vercel project, visiting that subdomain loads `games/my-game/index.html`.

The `subdomain` value may contain lowercase letters, numbers, and hyphens.

For externally hosted games, add a `url` property. The hub uses that URL
instead of the generated subdomain URL:

```json
{
  "subdomain": "example-game",
  "name": "Example Game",
  "url": "https://example.com/game"
}
```
