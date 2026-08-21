# Unavailable Entity Card

A lightweight Lovelace custom card that highlights entities reporting `unavailable` or `unknown`, keeping the native Home Assistant tile look.

![](/screenshots/screenshot-light-dark.png)

## Features

- Monitors a provided list of entities and only renders those that are offline
- Or finds them automatically — scan every entity, or select by wildcard, domain, label, or area
- Shows friendly name, entity id, current state chip, and entity icon/picture when available
- Gracefully flags entities missing from Home Assistant as `not available`
- Supports custom state strings via `unavailable_states`, including per-state badge colors
- Collapsible header lets you hide the list once you have reviewed it
- Search box appears automatically once the list gets long
- Works as a single JavaScript file, no build tools required

## Installation

### HACS

1. In Home Assistant, open **HACS (Community Store) → ⋮ → Custom repositories**.
2. Add this repository as a **Dashboard** type and click **Add**.
3. Locate **Unavailable Entity Card** under **Frontend** and install it.
4. Reload Lovelace resources (or restart Home Assistant) so the module is served.

### Manual

1. Copy `unavailable-entity-card.js` into your `config/www/unavailable-entity-card` folder.
2. Add the resource through **Settings → Dashboards → Resources → +**:

   ```yaml
   lovelace:
     resources:
       - url: /local/unavailable-entity-card/unavailable-entity-card.js
         type: module
   ```
3. Reload the browser cache (`Ctrl/Cmd + Shift + R`).

## Usage

```yaml
type: custom:unavailable-entity-card
title: Critical sensors
expanded: false
entities:
  - sensor.living_room_temperature
  - entity: binary_sensor.garage_door
    name: Garage Door
    icon: mdi:garage
  - sensor.ups_status
unavailable_states:
  - state: offline
    background: "#f0f4c3"
    color: "#827717"
  - state: error
  - state: unavailable
    background: "rgba(255, 0, 0, 0.18)"
    color: "#b71c1c"
  - state: unknown
    value: "#fff59d"
```

## Finding entities automatically

Instead of listing entities by hand, let the card find them. Set `all_entities: true` to watch everything, or use `include:` to narrow the search:

```yaml
# Every unavailable entity in your install
type: custom:unavailable-entity-card
title: Everything offline
all_entities: true
expanded: false
```

```yaml
# Only what matters, selected several ways at once
type: custom:unavailable-entity-card
title: Critical kit
include:
  domains: [binary_sensor]
  entity_globs: ["sensor.*_battery"]
  labels: [Critical]
  areas: [Living Room, Garage]
exclude:
  entities: [sensor.known_flaky]
  entity_globs: ["*_last_seen"]
  labels: [Ignore]
entities:
  - sensor.always_watch_this
```

How it resolves:

- **`all_entities: true`** widens the search pool to every entity. It does not turn the card into a full entity list — only entities in an unavailable state are ever shown.
- Setting any `include:` key also enables scanning, so `all_entities` is only needed when you want everything with no narrowing.
- An entity is a candidate if it matches **any** `include` key. `exclude` then removes matches, and exclude always wins.
- `exclude` applies to automatically found entities only. Anything you list under `entities:` is always shown, so an explicit entry is never silently dropped.
- Entities found automatically are sorted by friendly name. Entries under `entities:` keep the order you wrote them and come first.
- Hidden entities are skipped by default; set `include_hidden: true` to include them. Disabled entities never appear at all — Home Assistant does not expose them to dashboards.
- Because a found entity necessarily exists, the `not available` badge only ever applies to entities you listed explicitly under `entities:`.

### Selector reference

| Key | Matches |
|-----|---------|
| `entities` | Exact entity ids. |
| `domains` | The part before the dot — `sensor`, `light`, `binary_sensor`. |
| `entity_globs` | Wildcard patterns over the entity id, same syntax as Home Assistant's own `entity_globs`: `*` for any run of characters, `?` for exactly one. |
| `labels` | A label's name, or its underlying label id. Matches the entity's own labels **and** those of its device. |
| `areas` | An area's name, one of its aliases, or its area id. Uses the entity's area, falling back to its device's area. |

Every key accepts a single value or a list. Matching is case-insensitive.

> **Labels and areas need a newer Home Assistant.** Labels arrived in **2024.4**. On older versions
> these two selectors simply match nothing rather than erroring — wildcards, domains and
> `all_entities` work on any supported version. Renaming a label takes effect after a dashboard
> reload.

## Searching

Once more than 20 entities are listed, a search box appears above the list and filters on name and
entity id. The count badge switches to `matched/total` while you are filtering.

```yaml
type: custom:unavailable-entity-card
all_entities: true
search: true          # force on or off, regardless of how many are listed
search_threshold: 50  # or move the automatic cut-off
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `title` | string | `Unavailable entities` | Card header text. Set `show_header: false` to hide. |
| `entities` | array | _(required, unless a selector is set)_ | Entities to monitor. Objects support `entity`, `name`, `icon`. |
| `all_entities` | boolean | `false` | Search every entity in Home Assistant instead of only the configured list. |
| `include` | object | — | Narrow the automatic search. Accepts `entities`, `domains`, `entity_globs`, `labels`, `areas`. Setting any key enables scanning. |
| `exclude` | object | — | Remove automatically found entities. Same keys as `include`. Wins over `include`. |
| `include_hidden` | boolean | `false` | Include entities hidden in Home Assistant when searching automatically. |
| `search` | boolean | _(automatic)_ | Force the search box on or off. Defaults to showing it once the list exceeds `search_threshold`. |
| `search_threshold` | number | `20` | How many entities must be listed before the search box appears. |
| `unavailable_states` | string, array, or object | `['unavailable', 'unknown']` | Extend unavailable states. Accepts strings or objects with `state` plus optional `background`, `color`, `border`, or `value` (alias for `background`). |
| `show_header` | boolean | `true` | Hide the header entirely when set to `false`. |
| `expanded` | boolean | `true` | Whether the card is expanded by default. Set to `false` to start collapsed. |

### Styling states

Define badge colors inline with each `unavailable_states` entry. Accepted formats:

- **String:** shorthand for `background` only (`unknown: "#fff59d"`).
- **Object:** set any combination of `background`, `color`, `border`, or `value` (alias for `background`).
- **Array/object:** supply multiple entries; each must contain a `state` key (string or list) alongside the style fields above.

All values are inserted as inline styles, so you can use plain colors, CSS variables, or gradients.

## Using auto-entities

The card's own selectors cover most cases, but it also works as the wrapped card for [auto-entities](https://github.com/thomasloven/lovelace-auto-entities) if you already use it:

```yaml
type: custom:auto-entities
card:
  type: custom:unavailable-entity-card
  title: Critical kit
filter:
  include:
    - label: Critical
```

The card accepts an empty entity list, so it renders its empty state rather than an error when the filter matches nothing.

## Development

No build step is required. Adjust `unavailable-entity-card.js` directly and refresh your dashboard to see changes.

`test/index.html` is a dependency-free browser test suite — open it in Chrome. It loads `../unavailable-entity-card.js` directly, so it always exercises the real card file.

## License

MIT
