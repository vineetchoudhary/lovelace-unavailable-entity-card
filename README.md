# Unavailable Entity Card

A Lovelace card that surfaces the entities Home Assistant has quietly lost. Point it at your whole install, or a slice of it, and it lists only what is `unavailable` or `unknown` right now in the native tile look.

![Unavailable Entity Card in light and dark themes](screenshots/screenshot-light-dark.png)

## Contents

- [Features](#features)
- [Requirements](#requirements)
- [Installation](#installation)
- [Quick start](#quick-start)
- [Examples](#examples)
  - [Whole-home health card](#whole-home-health-card)
  - [Dead batteries only](#dead-batteries-only)
  - [Critical devices, several selectors at once](#critical-devices-several-selectors-at-once)
  - [A hand-picked watchlist](#a-hand-picked-watchlist)
  - [Custom states from an integration](#custom-states-from-an-integration)
  - [Compact badge for a header row](#compact-badge-for-a-header-row)
  - [One card per floor](#one-card-per-floor)
- [Configuration reference](#configuration-reference)
  - [Card options](#card-options)
  - [Entity options](#entity-options)
  - [`include` / `exclude` selectors](#include--exclude-selectors)
  - [`unavailable_states` options](#unavailable_states-options)
- [Features in depth](#features-in-depth)
  - [Finding entities automatically](#finding-entities-automatically)
  - [Searching](#searching)
  - [Collapsing](#collapsing)
  - [Styling states](#styling-states)
  - [Missing entities](#missing-entities)
  - [The empty state](#the-empty-state)
- [Using auto-entities](#using-auto-entities)
- [Troubleshooting](#troubleshooting)
- [Development](#development)
- [License](#license)

## Features

- **Finds them for you:** scan every entity, or select by wildcard, domain, label or area
- Native tile look: friendly name, entity id, state chip, and the entity's own icon or picture
- Shows only entities in an unavailable state
- Flags entities that no longer exist in Home Assistant at all as `not available`
- Custom states are yours to define: `offline`, `error`, `idle` with per-state badge colors
- Search box appears automatically once the list gets long
- Tapping a row opens the standard more-info dialog
- Theme-aware, responsive, and available from the card picker with a live preview

## Requirements
- Latest version of Home Assistant
- Nothing else

## Installation

### 1. Via HACS (recommended)

Installation is easiest through the [Home Assistant Community Store (HACS)](https://hacs.xyz/). Once HACS is set up, click the button below (requires [My Home Assistant](https://my.home-assistant.io/) configured) or follow the [instructions for adding a custom repository](https://hacs.xyz/docs/faq/custom_repositories), then find **Unavailable Entity Card** under **Frontend** and install it.

[![Open HACS repository on My Home Assistant](icons/hacs.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=vineetchoudhary&repository=lovelace-unavailable-entity-card&category=dashboard)

### 2. Manual install

1. Copy `unavailable-entity-card.js` to your Home Assistant `/config/www/unavailable-entity-card/` folder.
2. Add the resource through **Settings → Dashboards → Resources → +**:
   ```yaml
   url: /local/unavailable-entity-card/unavailable-entity-card.js
   type: module
   ```
3. Reload the browser cache (`Ctrl/Cmd + Shift + R`).

## Quick start

Add a manual card with this configuration:

```yaml
type: custom:unavailable-entity-card
title: Offline right now
all_entities: true
expanded: false
```

That is the whole card. Every entity in your install is watched, only the unavailable ones are listed, and a healthy install collapses to a single header row with no count badge.

Prefer to be specific? List the entities you care about instead:

```yaml
type: custom:unavailable-entity-card
title: Critical sensors
entities:
  - sensor.living_room_temperature
  - binary_sensor.garage_door
  - sensor.ups_status
```

Either style can be mixed with the other, and refined from there.

## Examples

### Whole-home health card

The one card most people want: everything, collapsed by default, searchable, sitting at the top of a dashboard as a quiet health indicator.

```yaml
type: custom:unavailable-entity-card
title: Unavailable entities
all_entities: true
expanded: false
search: true
exclude:
  entity_globs:
    - "*_last_seen"      # sensors that are unknown until they first report
    - "sensor.sun_*"
  domains: [device_tracker]   # away phones are legitimately unknown
```

`device_tracker` and "last seen" timestamps are the usual sources of permanent noise, excluding them is what turns this card from a long list into a card you actually trust.

### Dead batteries only

Wildcards match the entity id, so one glob covers every battery sensor you will ever add.

```yaml
type: custom:unavailable-entity-card
title: Batteries needing attention
include:
  entity_globs:
    - "sensor.*_battery"
    - "sensor.*_battery_level"
    - "binary_sensor.*_battery_low"
```

### Critical devices, several selectors at once

An entity is listed if it matches **any** `include` key, so selectors combine instead of narrowing. Label a handful of entities `Critical` in Home Assistant and this card keeps itself up to date.

```yaml
type: custom:unavailable-entity-card
title: Critical kit
include:
  labels: [Critical]
  areas: [Garage, Server rack]
  domains: [lock, alarm_control_panel]
  entity_globs: ["sensor.*_smoke"]
exclude:
  entities: [sensor.known_flaky]
  labels: [Ignore]
```

### A hand-picked watchlist

Explicit entries can be renamed and re-iconed, always appear in the order you wrote them, and are never removed by `exclude`.

```yaml
type: custom:unavailable-entity-card
title: Infrastructure
entities:
  - entity: binary_sensor.nas_online
    name: NAS
    icon: mdi:server-network
  - entity: sensor.ups_status
    name: UPS
    icon: mdi:power-plug-battery
  - entity: binary_sensor.zigbee_coordinator
    name: Zigbee coordinator
    icon: mdi:zigbee
  - sensor.internet_uptime
```

### Custom states from an integration

Plenty of integrations report their own idea of "unavailable" like `offline`, `error`, `disconnected`. Add them, and give each one a badge color.

```yaml
type: custom:unavailable-entity-card
title: Printers and network gear
include:
  domains: [sensor, binary_sensor]
  entity_globs: ["*.printer_*", "*.switch_port_*"]
unavailable_states:
  - state: [offline, disconnected]
    background: "rgba(255, 152, 0, 0.18)"
    color: "#e65100"
  - state: error
    background: "rgba(244, 67, 54, 0.18)"
    color: "#b71c1c"
  - state: unavailable
    background: "rgba(158, 158, 158, 0.18)"
    color: "var(--secondary-text-color)"
```

`unavailable` and `unknown` are always included, anything you add here is on top of them.

### Compact badge for a header row

With `show_header: false` the card is just the list, which makes it a good citizen inside a `vertical-stack` or a grid where a heading already exists.

```yaml
type: vertical-stack
cards:
  - type: markdown
    content: "## System health"
  - type: custom:unavailable-entity-card
    show_header: false
    all_entities: true
```

### One card per floor

`areas` accepts an area name, one of its aliases, or its area id, and falls back to the entity's device when the entity itself has no area.

```yaml
type: grid
columns: 2
cards:
  - type: custom:unavailable-entity-card
    title: Upstairs
    include:
      areas: [Bedroom, Bathroom, Landing]
  - type: custom:unavailable-entity-card
    title: Downstairs
    include:
      areas: [Kitchen, Living Room, Hallway]
```

## Configuration reference

### Card options

| Option | Required | Default | Description |
| --- | --- | --- | --- |
| `type` | **Yes** | — | `custom:unavailable-entity-card` |
| `entities` | Conditional | — | Entities to monitor, as ids or [objects](#entity-options). Required unless `all_entities` or an `include` key is set |
| `all_entities` | Conditional | `false` | Watch every entity in Home Assistant. Required unless you set `entities` or `include` |
| `include` | No | — | Narrow the automatic search — see [selectors](#include--exclude-selectors). Setting any key enables scanning |
| `exclude` | No | — | Remove automatically found entities. Same keys as `include`, and it wins over `include` |
| `include_hidden` | No | `false` | Include entities hidden in the Home Assistant entity registry |
| `title` | No | `Unavailable entities` | Card header text |
| `show_header` | No | `true` | `false` drops the header, count badge and collapse control |
| `expanded` | No | `true` | `false` starts the card collapsed |
| `search` | No | *(automatic)* | Force the search box on or off, regardless of list length |
| `search_threshold` | No | `20` | How many entities must be listed before the search box appears on its own |
| `unavailable_states` | No | `[unavailable, unknown]` | Extra states to treat as unavailable, with optional colors — see [options](#unavailable_states-options) |

### Entity options

Each item under `entities` is either an entity id string, or an object:

| Option | Description |
| --- | --- |
| `entity` | **Required.** The entity id |
| `name` | Label for the row. Defaults to the entity's friendly name, or the entity id |
| `icon` | Icon for the row, e.g. `mdi:server-network`. Defaults to the entity's own icon or picture |

### `include` / `exclude` selectors

Every key accepts a single value or a list, and matching is case-insensitive.

| Key | Matches |
| --- | --- |
| `entities` | Exact entity ids |
| `domains` | The part before the dot — `sensor`, `light`, `binary_sensor` |
| `entity_globs` | Wildcard patterns over the entity id, same syntax as Home Assistant's own `entity_globs`: `*` for any run of characters, `?` for exactly one |
| `labels` | A label's name or its underlying label id. Matches the entity's own labels **and** those of its device |
| `areas` | An area's name, one of its aliases, or its area id. Uses the entity's area, falling back to its device's area |

```yaml
include:
  entities: sensor.always_watch_this   # single value, no list needed
  domains: [binary_sensor, lock]
  entity_globs: ["sensor.*_battery", "light.garden_?"]
  labels: [Critical]
  areas: [Living Room, Garage]
exclude:
  entity_globs: "*_last_seen"
  labels: [Ignore]
```

### `unavailable_states` options

`unavailable` and `unknown` are always treated as unavailable. This option adds more, and optionally styles their badge. Three forms are accepted:

```yaml
# 1. A single state
unavailable_states: offline
```

```yaml
# 2. A list of states, or of objects
unavailable_states:
  - offline
  - state: error
    background: "rgba(244, 67, 54, 0.18)"
    color: "#b71c1c"
  - state: [idle, standby]      # one style, several states
    background: "#eceff1"
```

```yaml
# 3. A map of state to style
unavailable_states:
  offline: "#f0f4c3"            # string shorthand for background
  unknown:
    background: "#fff59d"
    color: "#827717"
    border: "1px solid #cddc39"
```

| Field | Description |
| --- | --- |
| `state` | The state, or a list of states, this entry applies to. `states` is accepted as an alias |
| `background` | Badge background. Any CSS value — color, `var(--…)`, or a gradient |
| `color` | Badge text color |
| `border` | Badge border, e.g. `1px solid #cddc39` |
| `value` | Alias for `background` |

All values are inserted as inline styles, so theme variables and gradients work as well as plain colors.

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

## Troubleshooting

- **Custom card not found:** check the resource URL is registered (`/hacsfiles/…` for HACS, `/local/…` for a manual install) and hard-refresh the browser.
- **The card is empty:** that is the good outcome that means nothing is unavailable. Confirm it is working by temporarily adding a state you do have, e.g. `unavailable_states: 'on'`.
- **An entity I expected is missing:** it may be `hidden` (set `include_hidden: true`), `disabled` (Home Assistant never exposes those), or excluded by an `exclude` key.
- **`labels:` or `areas:` match nothing:** check the name against **Settings → Areas & labels**.
- **A row says `not available`:** the entity id does not exist. Check it against **Developer tools → States**, or remove it from `entities:`.
- **Too much noise:** `device_tracker` entities and `*_last_seen` timestamps are legitimately `unknown` much of the time. Exclude them rather than living with them.
- **Custom colors ignored:** each entry in an `unavailable_states` list needs its own `state` key alongside the style fields.

## Development

- The distributed file is `unavailable-entity-card.js`. No build tooling requires, it is ready-to-serve JavaScript. Edit it and refresh your dashboard.
- `test/index.html` is a dependency-free browser test suite. Open it in Chrome; it loads `../unavailable-entity-card.js` directly, so it always exercises the real card file.
- `test/preview.html` renders the card in the configurations used for the screenshot above, and `test/capture-preview.sh` regenerates the image after a UI change.

## License

MIT © 2025
