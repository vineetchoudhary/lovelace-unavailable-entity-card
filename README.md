# Unavailable Entity Card

A lightweight Lovelace custom card that highlights entities reporting `unavailable` or `unknown`, keeping the native Home Assistant tile look.

![](/screenshots/screenshot-light-dark.png)

## Features

- Monitors a provided list of entities and only renders those that are offline
- Shows friendly name, entity id, current state chip, and entity icon/picture when available
- Gracefully flags entities missing from Home Assistant as `not available`
- Supports custom state strings via `unavailable_states`, including per-state badge colors
- Collapsible header lets you hide the list once you have reviewed it
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

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `title` | string | `Unavailable entities` | Card header text. Set `show_header: false` to hide. |
| `entities` | array | _(required)_ | Entities to monitor. Objects support `entity`, `name`, `icon`. |
| `unavailable_states` | string, array, or object | `['unavailable', 'unknown']` | Extend unavailable states. Accepts strings or objects with `state` plus optional `background`, `color`, `border`, or `value` (alias for `background`). |
| `show_header` | boolean | `true` | Hide the header entirely when set to `false`. |
| `expanded` | boolean | `true` | Whether the card is expanded by default. Set to `false` to start collapsed. |

### Styling states

Define badge colors inline with each `unavailable_states` entry. Accepted formats:

- **String:** shorthand for `background` only (`unknown: "#fff59d"`).
- **Object:** set any combination of `background`, `color`, `border`, or `value` (alias for `background`).
- **Array/object:** supply multiple entries; each must contain a `state` key (string or list) alongside the style fields above.

All values are inserted as inline styles, so you can use plain colors, CSS variables, or gradients.

## Development

No build step is required. Adjust `unavailable-entity-card.js` directly and refresh your dashboard to see changes.

## License

MIT
