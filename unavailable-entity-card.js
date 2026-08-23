const CARD_TYPE = "custom:unavailable-entity-card";
const ELEMENT_TAG = "unavailable-entity-card";
const DEFAULT_TITLE = "Unavailable entities";
const DEFAULT_ICON = "mdi:alert-circle-outline";
const MISSING_ICON = "mdi:help-circle-outline";
const MISSING_STATE = "not available";
const DEFAULT_UNAVAILABLE_STATES = new Set(["unavailable", "unknown"]);
const DEFAULT_SEARCH_THRESHOLD = 20;
const LABEL_REGISTRY_MESSAGE = "config/label_registry/list";

const GROUP_NONE = "none";
const GROUP_MODES = new Set([GROUP_NONE, "device", "integration", "area", "domain"]);
const GROUP_ALIASES = {
  devices: "device",
  platform: "integration",
  platforms: "integration",
  service: "integration",
  services: "integration",
  integrations: "integration",
  areas: "area",
  room: "area",
  rooms: "area",
  domains: "domain"
};
const GROUP_FALLBACK_LABELS = {
  device: "No device",
  integration: "No integration",
  area: "No area",
  domain: "Other"
};
const UNGROUPED_KEY = "__ungrouped__";

const HTML_ESCAPES = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
  "`": "&#96;"
};
const HTML_ESCAPE_PATTERN = /[&<>"'`]/g;

const escapeHtml = (value) =>
  String(value ?? "").replace(HTML_ESCAPE_PATTERN, (char) => HTML_ESCAPES[char]);

const sanitizeStyleValue = (value) => {
  if (typeof value !== "string") {
    return undefined;
  }

  let depth = 0;
  let quote = "";
  let end = value.length;

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];

    if (quote) {
      if (char === quote && value[index - 1] !== "\\") {
        quote = "";
      }
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
    } else if (char === "(") {
      depth += 1;
    } else if (char === ")") {
      depth = Math.max(0, depth - 1);
    } else if (depth === 0 && (char === ";" || char === "{" || char === "}")) {
      end = index;
      break;
    }
  }

  const cleaned = value.slice(0, end).trim();
  return cleaned || undefined;
};

const toList = (value) => {
  if (value === undefined || value === null) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
};

const toLowerSet = (value) =>
  new Set(
    toList(value)
      .filter((item) => typeof item === "string")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean)
  );

const globToRegExp = (glob) => {
  let pattern = "";
  for (const char of glob) {
    if (char === "*") {
      pattern += ".*";
    } else if (char === "?") {
      pattern += ".";
    } else {
      pattern += char.replace(/[.+^${}()|[\]\\]/g, "\\$&");
    }
  }
  return new RegExp(`^${pattern}$`, "i");
};

const prettifyDomain = (value) =>
  String(value)
    .split(/[_-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const normalizeGroupBy = (value) => {
  if (value === undefined || value === null) {
    return GROUP_NONE;
  }
  if (typeof value !== "string") {
    throw new Error(`group_by must be one of: ${[...GROUP_MODES].join(", ")}`);
  }
  const key = value.trim().toLowerCase();
  if (!key) {
    return GROUP_NONE;
  }
  const resolved = GROUP_ALIASES[key] || key;
  if (!GROUP_MODES.has(resolved)) {
    throw new Error(`Unknown group_by "${value}". Use one of: ${[...GROUP_MODES].join(", ")}`);
  }
  return resolved;
};

const isFilterSection = (section) =>
  !!section && typeof section === "object" && !Array.isArray(section);

const buildStateFilter = (section) => {
  if (!isFilterSection(section)) {
    return undefined;
  }
  const states = toLowerSet(section.states);
  return states.size ? states : undefined;
};

const buildFilter = (section) => {
  if (!isFilterSection(section)) {
    return undefined;
  }

  const filter = {
    entities: toLowerSet(section.entities),
    domains: toLowerSet(section.domains),
    labels: toLowerSet(section.labels),
    areas: toLowerSet(section.areas),
    globs: toList(section.entity_globs)
      .filter((glob) => typeof glob === "string" && glob.trim() !== "")
      .map((glob) => globToRegExp(glob.trim()))
  };

  const active =
    filter.entities.size ||
    filter.domains.size ||
    filter.labels.size ||
    filter.areas.size ||
    filter.globs.length;

  return active ? filter : undefined;
};

const CARD_STYLES = `
  :host {
    display: block;
  }

  ha-card {
    padding: 0 8px 8px;
    box-sizing: border-box;
    background: var(--ha-card-background, var(--card-background-color));
  }

  ha-card.collapsed {
    padding-bottom: 0;
  }

  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 8px;
    margin: 0;
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--primary-text-color);
    cursor: pointer;
    user-select: none;
    border-radius: var(--ha-card-border-radius, 12px);
  }

  .card-header:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: -2px;
  }

  .header-content {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  .header-title {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .entity-count {
    background: rgba(var(--rgb-primary-color, 0, 154, 199), 0.12);
    color: var(--primary-color);
    font-size: 0.8rem;
    padding: 2px 8px;
    border-radius: 999px;
  }

  .entity-count[hidden] {
    display: none;
  }

  .collapse-icon {
    color: var(--secondary-text-color);
    transition: transform 180ms ease;
  }

  ha-card.collapsed .collapse-icon {
    transform: rotate(-90deg);
  }

  .card-search {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 8px 4px;
  }

  .card-search[hidden] {
    display: none;
  }

  .card-search ha-icon {
    flex: 0 0 auto;
    color: var(--secondary-text-color);
  }

  .card-search input {
    flex: 1 1 auto;
    min-width: 0;
    font: inherit;
    font-size: 0.9rem;
    padding: 8px 10px;
    color: var(--primary-text-color);
    background: rgba(var(--rgb-primary-text-color, 33, 33, 33), 0.04);
    border: 1px solid rgba(var(--rgb-primary-text-color, 33, 33, 33), 0.12);
    border-radius: var(--ha-card-border-radius, 12px);
  }

  .card-search input::placeholder {
    color: var(--secondary-text-color);
    opacity: 0.8;
  }

  .card-search input:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: 1px;
  }

  .card-body {
    display: grid;
  }

  .entity-list {
    display: grid;
    gap: 12px;
    grid-template-columns: 1fr;
    margin: 8px 0 0;
  }

  .entity-tile {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 14px;
    padding: 14px 16px;
    border-radius: var(--ha-card-border-radius, 12px);
    background: var(--tile-background, rgba(var(--rgb-primary-text-color, 33, 33, 33), 0.06));
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
    border: 1px solid rgba(var(--rgb-primary-text-color, 33, 33, 33), 0.08);
    transition: background-color 120ms ease, border-color 120ms ease, box-shadow 120ms ease;
  }

  .entity-tile.interactive {
    cursor: pointer;
  }

  .entity-tile.interactive:hover {
    background: var(--tile-background-hover, rgba(var(--rgb-primary-text-color, 33, 33, 33), 0.1));
    border-color: rgba(var(--rgb-primary-text-color, 33, 33, 33), 0.16);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  }

  .entity-tile.interactive:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: 2px;
  }

  .entity-visual {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    display: grid;
    place-items: center;
    background: var(--tile-icon-background, rgba(var(--rgb-primary-color, 0, 154, 199), 0.12));
    color: var(--tile-icon-color, var(--primary-color));
    overflow: hidden;
  }

  .entity-visual img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .entity-meta {
    overflow: hidden;
  }

  .entity-name {
    margin: 0;
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--primary-text-color);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .entity-id {
    margin: 2px 0 0;
    font-size: 0.8rem;
    color: var(--secondary-text-color);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .entity-state {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    border-radius: 999px;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    font-weight: 600;
    background: rgba(var(--rgb-warning-color, 255, 166, 0), 0.15);
    color: var(--warning-color);
  }

  .entity-state.missing {
    background: rgba(var(--rgb-disabled-color, 189, 189, 189), 0.25);
    color: var(--secondary-text-color);
  }

  .entity-groups {
    display: grid;
  }

  .entity-group {
    display: grid;
  }

  .group-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 14px 8px 2px;
    cursor: pointer;
    user-select: none;
    border-radius: var(--ha-card-border-radius, 12px);
  }

  .group-header:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: -2px;
  }

  .group-title {
    font-size: 0.8rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--secondary-text-color);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .group-count {
    flex: 0 0 auto;
    background: rgba(var(--rgb-primary-text-color, 33, 33, 33), 0.08);
    color: var(--secondary-text-color);
    font-size: 0.72rem;
    font-weight: 600;
    padding: 1px 8px;
    border-radius: 999px;
  }

  .group-icon {
    flex: 0 0 auto;
    margin-left: auto;
    --mdc-icon-size: 20px;
    color: var(--secondary-text-color);
    transition: transform 180ms ease;
  }

  .entity-group.collapsed .group-icon {
    transform: rotate(-90deg);
  }

  .entity-group .entity-list {
    margin-top: 6px;
  }

  .empty-state {
    display: grid;
    place-items: center;
    padding: 32px 16px;
    margin: 8px 0 0;
    border-radius: var(--ha-card-border-radius, 12px);
    background: rgba(var(--rgb-primary-text-color, 33, 33, 33), 0.06);
    color: var(--secondary-text-color);
    text-align: center;
  }

  .empty-state strong {
    display: block;
    margin-bottom: 8px;
    font-size: 1rem;
  }

  .empty-state.no-match strong {
    margin-bottom: 4px;
  }

  @media (prefers-reduced-motion: reduce) {
    .entity-tile,
    .collapse-icon,
    .group-icon {
      transition: none;
    }
  }
`;

const supportsAdoptedStyleSheets =
  typeof CSSStyleSheet === "function" &&
  "replaceSync" in CSSStyleSheet.prototype &&
  typeof ShadowRoot === "function" &&
  "adoptedStyleSheets" in ShadowRoot.prototype;

let sharedStyleSheet;

const applyStyles = (root) => {
  if (supportsAdoptedStyleSheets) {
    if (!sharedStyleSheet) {
      sharedStyleSheet = new CSSStyleSheet();
      sharedStyleSheet.replaceSync(CARD_STYLES);
    }
    root.adoptedStyleSheets = [sharedStyleSheet];
    return;
  }

  const style = document.createElement("style");
  style.textContent = CARD_STYLES;
  root.append(style);
};

class UnavailableEntityCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    applyStyles(this.shadowRoot);

    this._config = undefined;
    this._hass = undefined;
    this._entities = [];
    this._collapsed = false;
    this._unavailableStates = DEFAULT_UNAVAILABLE_STATES;
    this._stateColors = new Map();
    this._signature = undefined;
    this._card = undefined;
    this._header = undefined;
    this._titleElement = undefined;
    this._countElement = undefined;
    this._body = undefined;
    this._searchRow = undefined;
    this._searchInput = undefined;

    this._include = undefined;
    this._exclude = undefined;
    this._excludedStates = undefined;
    this._discover = false;
    this._includeHidden = false;
    this._needsLabels = false;
    this._labelNames = new Map();
    this._labelsRequested = false;
    this._query = "";
    this._groupBy = GROUP_NONE;
    this._groupState = new Map();
    this._groupsExpandedByDefault = true;

    this._handleClick = this._handleClick.bind(this);
    this._handleKeydown = this._handleKeydown.bind(this);
    this._handleSearchInput = this._handleSearchInput.bind(this);
  }

  static getStubConfig(hass, entities, entitiesFallback) {
    const states = hass && hass.states ? hass.states : {};
    const pool =
      [entities, entitiesFallback, Object.keys(states)].find(
        (list) => Array.isArray(list) && list.length > 0
      ) || [];

    const offline = pool.filter((entityId) => {
      const state = states[entityId];
      return !!state && DEFAULT_UNAVAILABLE_STATES.has(state.state);
    });

    const picked = (offline.length > 0 ? offline : pool).slice(0, 3);

    return {
      type: CARD_TYPE,
      title: DEFAULT_TITLE,
      entities: picked.length > 0 ? picked : ["sun.sun"]
    };
  }

  setConfig(config) {
    if (!config) {
      throw new Error("You need to define entities");
    }

    const configured = Array.isArray(config.entities) ? config.entities : undefined;

    const entities = (configured || [])
      .map((entry) => {
        if (typeof entry === "string") {
          return { entity: entry.trim() };
        }
        if (entry && typeof entry.entity === "string") {
          return { ...entry, entity: entry.entity.trim() };
        }
        return entry;
      })
      .filter((entry) => entry && typeof entry.entity === "string" && entry.entity !== "");

    this._groupBy = normalizeGroupBy(config.group_by);
    this._groupsExpandedByDefault = config.groups_expanded !== false;
    this._groupState = new Map();

    if (buildStateFilter(config.include)) {
      throw new Error("states is only supported inside exclude, not include");
    }

    this._include = buildFilter(config.include);
    this._exclude = buildFilter(config.exclude);
    this._excludedStates = buildStateFilter(config.exclude);
    this._discover = config.all_entities === true || this._include !== undefined;
    this._includeHidden = config.include_hidden === true;

    this._needsLabels =
      (this._include ? this._include.labels.size > 0 : false) ||
      (this._exclude ? this._exclude.labels.size > 0 : false);
    this._labelsRequested = false;
    this._labelNames = new Map();
    this._query = "";

    if (!this._discover) {
      if (!configured) {
        throw new Error(
          "You need to define entities, or set all_entities: true or an include filter"
        );
      }
      if (configured.length > 0 && entities.length === 0) {
        throw new Error("You need to define entities");
      }
    }

    this._config = { ...config, entities };
    this._collapsed = config.expanded === undefined ? false : !config.expanded;

    const unavailableConfig = this._buildUnavailableConfig(config.unavailable_states);
    this._unavailableStates = unavailableConfig.states;
    this._stateColors = unavailableConfig.colors;
    this._entities = this._calculateEntities();

    this._teardown();
    this._render(true);
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._config) {
      return;
    }
    this._ensureLabelNames();
    this._entities = this._calculateEntities();
    this._render();
  }

  get hass() {
    return this._hass;
  }

  getCardSize() {
    if (this._collapsed) {
      return 1;
    }
    const headerRows = this._config && this._config.show_header === false ? 0 : 1;
    const searchRows = this._searchEnabled() ? 1 : 0;
    const visible = this._visibleEntities();
    const groups = this._buildGroups(visible);
    const groupRows = groups ? groups.length : 0;
    const entityRows = groups
      ? groups.reduce(
          (total, group) => total + (this._isGroupCollapsed(group.key) ? 0 : group.entities.length),
          0
        ) || 1
      : visible.length || 1;
    return Math.max(1, headerRows + searchRows + groupRows + entityRows);
  }

  getGridOptions() {
    return {
      columns: "full",
      rows: "auto",
      min_columns: 6,
      min_rows: 1
    };
  }

  _calculateEntities() {
    if (!this._config || !this._hass || !this._hass.states) {
      return [];
    }

    const listed = new Set();
    const output = [];

    for (const entry of this._config.entities) {
      listed.add(entry.entity);
      const entity = this._hass.states[entry.entity];

      if (!entity) {
        output.push({
          id: entry.entity,
          name: entry.name || entry.entity,
          state: MISSING_STATE,
          icon: entry.icon,
          picture: undefined,
          missing: true,
          group: this._resolveGroup(entry.entity)
        });
        continue;
      }

      if (!this._unavailableStates.has(entity.state)) {
        continue;
      }

      output.push(this._describeEntity(entity, entry));
    }

    if (!this._discover) {
      return output;
    }

    const discovered = [];

    for (const entityId in this._hass.states) {
      if (listed.has(entityId)) {
        continue;
      }
      if (this._include && !this._matchesFilter(this._include, entityId)) {
        continue;
      }
      if (this._exclude && this._matchesFilter(this._exclude, entityId)) {
        continue;
      }
      if (!this._includeHidden && this._isHidden(entityId)) {
        continue;
      }

      const entity = this._hass.states[entityId];
      if (!entity || !this._unavailableStates.has(entity.state)) {
        continue;
      }

      discovered.push(this._describeEntity(entity, {}));
    }

    discovered.sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));

    return output.concat(discovered);
  }

  _describeEntity(entity, entry) {
    const attributes = entity.attributes || {};
    const name = entry.name || attributes.friendly_name || entity.entity_id;
    const icon = entry.icon || (typeof attributes.icon === "string" ? attributes.icon : undefined);
    const picture =
      typeof attributes.entity_picture === "string" ? attributes.entity_picture : undefined;

    return {
      id: entity.entity_id,
      name,
      state: entity.state,
      icon,
      picture,
      missing: false,
      group: this._resolveGroup(entity.entity_id)
    };
  }

  _registryEntry(entityId) {
    const registry = this._hass ? this._hass.entities : undefined;
    return registry ? registry[entityId] : undefined;
  }

  _isHidden(entityId) {
    const entry = this._registryEntry(entityId);
    return entry ? entry.hidden === true : false;
  }

  _matchesFilter(filter, entityId) {
    if (filter.entities.size && filter.entities.has(entityId.toLowerCase())) {
      return true;
    }

    if (filter.domains.size) {
      const separator = entityId.indexOf(".");
      const domain = separator === -1 ? entityId : entityId.slice(0, separator);
      if (filter.domains.has(domain.toLowerCase())) {
        return true;
      }
    }

    if (filter.globs.length && filter.globs.some((pattern) => pattern.test(entityId))) {
      return true;
    }

    if (filter.labels.size && this._matchesLabels(filter.labels, entityId)) {
      return true;
    }

    if (filter.areas.size && this._matchesArea(filter.areas, entityId)) {
      return true;
    }

    return false;
  }

  _matchesLabels(targets, entityId) {
    const entry = this._registryEntry(entityId);
    if (!entry) {
      return false;
    }

    const device =
      entry.device_id && this._hass.devices ? this._hass.devices[entry.device_id] : undefined;

    const groups = [entry.labels, device ? device.labels : undefined];

    for (const labels of groups) {
      if (!Array.isArray(labels)) {
        continue;
      }
      for (const labelId of labels) {
        if (typeof labelId !== "string") {
          continue;
        }
        const id = labelId.toLowerCase();
        if (targets.has(id)) {
          return true;
        }
        const name = this._labelNames.get(id);
        if (name && targets.has(name)) {
          return true;
        }
      }
    }

    return false;
  }

  _matchesArea(targets, entityId) {
    const entry = this._registryEntry(entityId);
    if (!entry) {
      return false;
    }

    const device =
      entry.device_id && this._hass.devices ? this._hass.devices[entry.device_id] : undefined;
    const areaId = entry.area_id || (device ? device.area_id : undefined);

    if (!areaId) {
      return false;
    }
    if (targets.has(String(areaId).toLowerCase())) {
      return true;
    }

    const area = this._hass.areas ? this._hass.areas[areaId] : undefined;
    if (!area) {
      return false;
    }
    if (typeof area.name === "string" && targets.has(area.name.toLowerCase())) {
      return true;
    }

    return (
      Array.isArray(area.aliases) &&
      area.aliases.some((alias) => typeof alias === "string" && targets.has(alias.toLowerCase()))
    );
  }

  _integrationName(domain) {
    const hass = this._hass;
    if (hass && typeof hass.localize === "function") {
      let localized;
      try {
        localized = hass.localize(`component.${domain}.title`);
      } catch (error) {
        localized = undefined;
      }
      if (typeof localized === "string" && localized.trim() !== "") {
        return localized;
      }
    }
    return prettifyDomain(domain);
  }

  _fallbackGroup() {
    return {
      key: UNGROUPED_KEY,
      name: GROUP_FALLBACK_LABELS[this._groupBy] || "Other",
      fallback: true
    };
  }

  _resolveGroup(entityId) {
    if (this._groupBy === GROUP_NONE || !this._hass) {
      return undefined;
    }

    if (this._groupBy === "domain") {
      const separator = entityId.indexOf(".");
      const domain = separator === -1 ? "" : entityId.slice(0, separator);
      return domain
        ? { key: `domain:${domain}`, name: this._integrationName(domain) }
        : this._fallbackGroup();
    }

    const entry = this._registryEntry(entityId);
    const deviceId = entry && typeof entry.device_id === "string" ? entry.device_id : undefined;
    const device = deviceId && this._hass.devices ? this._hass.devices[deviceId] : undefined;

    if (this._groupBy === "device") {
      if (!deviceId) {
        return this._fallbackGroup();
      }
      const name = device ? device.name_by_user || device.name : undefined;
      return { key: `device:${deviceId}`, name: name || deviceId };
    }

    if (this._groupBy === "integration") {
      const platform = entry && typeof entry.platform === "string" ? entry.platform.trim() : "";
      return platform
        ? { key: `integration:${platform}`, name: this._integrationName(platform) }
        : this._fallbackGroup();
    }

    const areaId = (entry && entry.area_id) || (device ? device.area_id : undefined);
    if (!areaId) {
      return this._fallbackGroup();
    }
    const area = this._hass.areas ? this._hass.areas[areaId] : undefined;
    const name = area && typeof area.name === "string" && area.name.trim() !== "" ? area.name : undefined;
    return { key: `area:${areaId}`, name: name || String(areaId) };
  }

  _buildGroups(entities) {
    if (this._groupBy === GROUP_NONE || entities.length === 0) {
      return undefined;
    }

    const buckets = new Map();
    for (const entity of entities) {
      const group = entity.group || this._fallbackGroup();
      let bucket = buckets.get(group.key);
      if (!bucket) {
        bucket = {
          key: group.key,
          name: group.name,
          fallback: group.fallback === true,
          entities: []
        };
        buckets.set(group.key, bucket);
      }
      bucket.entities.push(entity);
    }

    const groups = [...buckets.values()];
    if (groups.every((group) => group.fallback)) {
      return undefined;
    }

    groups.sort(
      (a, b) =>
        Number(a.fallback) - Number(b.fallback) ||
        a.name.localeCompare(b.name) ||
        a.key.localeCompare(b.key)
    );

    return groups;
  }

  _isSearching() {
    return this._searchEnabled() && this._query.trim() !== "";
  }

  _storedGroupCollapsed(key) {
    if (this._groupState.has(key)) {
      return this._groupState.get(key);
    }
    return !this._groupsExpandedByDefault;
  }

  _isGroupCollapsed(key) {
    // A query has to be able to reach matches inside a folded group, so every
    // group renders open while searching. The stored state is left untouched.
    if (this._isSearching()) {
      return false;
    }
    return this._storedGroupCollapsed(key);
  }

  _toggleGroup(key) {
    if (!key) {
      return;
    }

    const root = this.shadowRoot;
    const active = root ? root.activeElement : undefined;
    const keepFocus = !!(
      active &&
      typeof active.getAttribute === "function" &&
      active.getAttribute("data-group") === key
    );

    this._groupState.set(key, !this._storedGroupCollapsed(key));
    this._render(true);

    // The body is re-rendered wholesale, so a keyboard toggle has to be handed
    // its heading back or the focus ring lands nowhere.
    if (keepFocus && root) {
      for (const header of root.querySelectorAll(".group-header[data-group]")) {
        if (header.getAttribute("data-group") === key && typeof header.focus === "function") {
          header.focus();
          break;
        }
      }
    }
  }

  _ensureLabelNames() {
    if (!this._needsLabels || this._labelsRequested) {
      return;
    }
    const hass = this._hass;
    if (!hass || typeof hass.callWS !== "function") {
      return;
    }

    this._labelsRequested = true;

    hass
      .callWS({ type: LABEL_REGISTRY_MESSAGE })
      .then((labels) => {
        const names = new Map();
        for (const label of toList(labels)) {
          if (label && typeof label.label_id === "string" && typeof label.name === "string") {
            names.set(label.label_id.toLowerCase(), label.name.toLowerCase());
          }
        }
        this._labelNames = names;
        if (this._config) {
          this._entities = this._calculateEntities();
          this._render(true);
        }
      })
      .catch(() => {});
  }

  _buildUnavailableConfig(customStates) {
    const states = new Set(DEFAULT_UNAVAILABLE_STATES);
    const colors = new Map();

    const registerState = (stateKey, styleSource) => {
      const state = typeof stateKey === "string" ? stateKey.trim() : "";
      if (!state) {
        return;
      }
      states.add(state);
      const style = this._normalizeStateStyle(styleSource);
      if (style) {
        colors.set(state, style);
      }
    };

    const collectStates = (stateField) => {
      if (Array.isArray(stateField)) {
        return stateField.map((value) => (typeof value === "string" ? value.trim() : "")).filter(Boolean);
      }
      if (typeof stateField === "string") {
        const trimmed = stateField.trim();
        return trimmed ? [trimmed] : [];
      }
      return [];
    };

    const normalizeEntryStyle = (entry) => {
      if (!entry || typeof entry !== "object") {
        return undefined;
      }
      return {
        background: entry.background,
        color: entry.color,
        border: entry.border,
        value: entry.value
      };
    };

    if (typeof customStates === "string") {
      registerState(customStates, undefined);
    } else if (Array.isArray(customStates)) {
      customStates.forEach((entry) => {
        if (typeof entry === "string") {
          registerState(entry, undefined);
          return;
        }

        if (!entry || typeof entry !== "object") {
          return;
        }

        const statesFromEntry = collectStates(entry.state).concat(collectStates(entry.states));
        if (statesFromEntry.length === 0) {
          return;
        }

        const styleSource = normalizeEntryStyle(entry);
        statesFromEntry.forEach((stateValue) => registerState(stateValue, styleSource));
      });
    } else if (customStates && typeof customStates === "object") {
      Object.entries(customStates).forEach(([stateKey, value]) => {
        if (value === undefined || value === null || typeof value === "boolean") {
          if (value !== false) {
            registerState(stateKey, undefined);
          }
          return;
        }

        if (typeof value === "string") {
          registerState(stateKey, { value });
          return;
        }

        registerState(stateKey, value);
      });
    }

    if (this._excludedStates) {
      for (const state of [...states]) {
        if (this._excludedStates.has(state.toLowerCase())) {
          states.delete(state);
          colors.delete(state);
        }
      }

      if (states.size === 0) {
        throw new Error("exclude.states leaves no state for this card to report");
      }
    }

    return { states, colors };
  }

  _normalizeStateStyle(styleSource) {
    if (typeof styleSource === "string") {
      const background = sanitizeStyleValue(styleSource);
      return background ? { background } : undefined;
    }

    if (!styleSource || typeof styleSource !== "object") {
      return undefined;
    }

    const background = sanitizeStyleValue(styleSource.background) || sanitizeStyleValue(styleSource.value);
    const color = sanitizeStyleValue(styleSource.color);
    const border = sanitizeStyleValue(styleSource.border);

    const normalized = {};
    if (background) {
      normalized.background = background;
    }
    if (color) {
      normalized.color = color;
    }
    if (border) {
      normalized.border = border;
    }

    return Object.keys(normalized).length ? normalized : undefined;
  }

  _getStateStyle(state) {
    const config = state ? this._stateColors.get(state) : undefined;
    if (!config) {
      return "";
    }

    const styles = [];
    if (config.background) {
      styles.push(`background:${escapeHtml(config.background)}`);
    }
    if (config.color) {
      styles.push(`color:${escapeHtml(config.color)}`);
    }
    if (config.border) {
      styles.push(`border:${escapeHtml(config.border)}`);
    }

    return styles.join("; ");
  }

  _searchEnabled() {
    if (!this._config || this._config.search === false) {
      return false;
    }
    if (this._config.search === true) {
      return true;
    }
    const threshold = Number(this._config.search_threshold);
    const limit = Number.isFinite(threshold) ? threshold : DEFAULT_SEARCH_THRESHOLD;
    return this._entities.length > limit;
  }

  _visibleEntities() {
    const query = this._query.trim().toLowerCase();
    if (!query || !this._searchEnabled()) {
      return this._entities;
    }
    return this._entities.filter(
      (entity) =>
        entity.name.toLowerCase().includes(query) || entity.id.toLowerCase().includes(query)
    );
  }

  _buildSignature() {
    return JSON.stringify([
      this._collapsed,
      this._config.show_header !== false,
      this._config.title ?? DEFAULT_TITLE,
      this._searchEnabled(),
      this._searchEnabled() ? this._query.trim().toLowerCase() : "",
      this._groupBy,
      this._groupBy === GROUP_NONE
        ? ""
        : [...this._groupState.entries()]
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([key, collapsed]) => `${key}:${collapsed ? 1 : 0}`)
            .join("|"),
      this._entities.map((entity) => [
        entity.id,
        entity.name,
        entity.state,
        entity.icon || "",
        entity.picture || "",
        entity.missing,
        entity.group ? entity.group.key : "",
        entity.group ? entity.group.name : ""
      ])
    ]);
  }

  _teardown() {
    if (this._card) {
      this._card.removeEventListener("click", this._handleClick);
      this._card.removeEventListener("keydown", this._handleKeydown);
      this._card.remove();
    }
    this._card = undefined;
    this._header = undefined;
    this._titleElement = undefined;
    this._countElement = undefined;
    this._body = undefined;
    this._searchRow = undefined;
    this._searchInput = undefined;
    this._signature = undefined;
  }

  _render(force) {
    if (!this.shadowRoot || !this._config) {
      return;
    }

    const signature = this._buildSignature();
    if (!force && signature === this._signature) {
      return;
    }
    this._signature = signature;

    if (!this._card) {
      this._buildSkeleton();
    }

    this._card.classList.toggle("collapsed", this._collapsed);
    this._updateHeader();
    this._updateSearch();
    this._updateBody();
  }

  _buildSkeleton() {
    const card = document.createElement("ha-card");

    if (this._config.show_header !== false) {
      const header = document.createElement("div");
      header.className = "card-header";
      header.setAttribute("role", "button");
      header.tabIndex = 0;
      header.innerHTML = `
        <div class="header-content">
          <span class="header-title"></span>
          <span class="entity-count" hidden></span>
        </div>
        <ha-icon class="collapse-icon" icon="mdi:chevron-down"></ha-icon>
      `;
      card.append(header);
      this._header = header;
      this._titleElement = header.querySelector(".header-title");
      this._countElement = header.querySelector(".entity-count");
    }

    const searchRow = document.createElement("div");
    searchRow.className = "card-search";
    searchRow.hidden = true;
    const searchInput = document.createElement("input");
    searchInput.type = "search";
    searchInput.placeholder = "Search entities";
    searchInput.setAttribute("aria-label", "Search unavailable entities");
    searchInput.addEventListener("input", this._handleSearchInput);
    const searchIcon = document.createElement("ha-icon");
    searchIcon.setAttribute("icon", "mdi:magnify");
    searchIcon.setAttribute("aria-hidden", "true");
    searchRow.append(searchIcon, searchInput);
    card.append(searchRow);
    this._searchRow = searchRow;
    this._searchInput = searchInput;

    const body = document.createElement("div");
    body.className = "card-body";
    card.append(body);
    this._body = body;

    card.addEventListener("click", this._handleClick);
    card.addEventListener("keydown", this._handleKeydown);

    this.shadowRoot.append(card);
    this._card = card;
  }

  _updateHeader() {
    if (!this._header) {
      return;
    }

    const title = String(this._config.title ?? DEFAULT_TITLE);
    if (this._titleElement.textContent !== title) {
      this._titleElement.textContent = title;
    }

    const count = this._entities.length;
    const visible = this._visibleEntities().length;
    const countText = count > 0 ? (visible === count ? String(count) : `${visible}/${count}`) : "";
    if (this._countElement.textContent !== countText) {
      this._countElement.textContent = countText;
    }
    this._countElement.hidden = count === 0;

    this._header.setAttribute("aria-expanded", this._collapsed ? "false" : "true");
  }

  _updateSearch() {
    if (!this._searchRow) {
      return;
    }
    this._searchRow.hidden = this._collapsed || !this._searchEnabled();
  }

  _updateBody() {
    if (this._collapsed) {
      if (this._body.firstChild) {
        this._body.textContent = "";
      }
      return;
    }

    if (this._entities.length === 0) {
      this._body.innerHTML = this._renderEmptyState();
      return;
    }

    const visible = this._visibleEntities();
    if (visible.length === 0) {
      this._body.innerHTML = this._renderNoMatchState();
      return;
    }

    const groups = this._buildGroups(visible);
    this._body.innerHTML = groups
      ? this._renderGroups(groups)
      : this._renderEntities(visible);
  }

  _renderEntities(entities) {
    const items = entities
      .map((entity) => {
        const stateStyle = this._getStateStyle(entity.state);
        const styleAttribute = stateStyle ? ` style="${stateStyle}"` : "";
        const stateClass = entity.missing ? "entity-state missing" : "entity-state";
        const tileClass = entity.missing ? "entity-tile" : "entity-tile interactive";
        const interactiveAttributes = entity.missing
          ? ""
          : ` tabindex="0" data-entity="${escapeHtml(entity.id)}"`;

        return `
          <div class="${tileClass}" role="listitem"${interactiveAttributes}>
            ${this._renderEntityVisual(entity)}
            <div class="entity-meta">
              <p class="entity-name">${escapeHtml(entity.name)}</p>
              <p class="entity-id">${escapeHtml(entity.id)}</p>
            </div>
            <span class="${stateClass}"${styleAttribute}>${escapeHtml(entity.state)}</span>
          </div>
        `;
      })
      .join("");

    return `
      <div class="entity-list" role="list">
        ${items}
      </div>
    `;
  }

  _renderGroups(groups) {
    const interactive = !this._isSearching();

    const sections = groups
      .map((group) => {
        const collapsed = this._isGroupCollapsed(group.key);
        const headerAttributes = interactive
          ? ` role="button" tabindex="0" aria-expanded="${collapsed ? "false" : "true"}"` +
            ` data-group="${escapeHtml(group.key)}"`
          : "";
        const chevron = interactive
          ? '<ha-icon class="group-icon" icon="mdi:chevron-down"></ha-icon>'
          : "";

        return `
          <section class="entity-group${collapsed ? " collapsed" : ""}">
            <div class="group-header"${headerAttributes}>
              <span class="group-title">${escapeHtml(group.name)}</span>
              <span class="group-count">${group.entities.length}</span>
              ${chevron}
            </div>
            ${collapsed ? "" : this._renderEntities(group.entities)}
          </section>
        `;
      })
      .join("");

    return `
      <div class="entity-groups">
        ${sections}
      </div>
    `;
  }

  _renderEntityVisual(entity) {
    if (entity.picture) {
      return `
        <div class="entity-visual">
          <img src="${escapeHtml(entity.picture)}" alt="${escapeHtml(entity.name)}" />
        </div>
      `;
    }

    const fallbackIcon = entity.missing ? MISSING_ICON : DEFAULT_ICON;
    const icon = escapeHtml(entity.icon || fallbackIcon);
    return `
      <div class="entity-visual" aria-hidden="true">
        <ha-icon icon="${icon}"></ha-icon>
      </div>
    `;
  }

  _renderEmptyState() {
    const watched = [...this._unavailableStates];
    const list =
      watched.length > 1
        ? `${watched.slice(0, -1).join(", ")} or ${watched[watched.length - 1]}`
        : watched[0] || "monitored";

    return `
      <div class="empty-state">
        <strong>All monitored entities look good!</strong>
        <span>No entities are currently reporting ${escapeHtml(list)} states.</span>
      </div>
    `;
  }

  _renderNoMatchState() {
    return `
      <div class="empty-state no-match">
        <strong>No entities match your search</strong>
        <span>${this._entities.length} unavailable ${
          this._entities.length === 1 ? "entity is" : "entities are"
        } hidden by the current filter.</span>
      </div>
    `;
  }

  _handleClick(event) {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) {
      return;
    }

    if (this._header && target.closest(".card-header")) {
      this._toggle();
      return;
    }

    const groupHeader = target.closest(".group-header[data-group]");
    if (groupHeader) {
      this._toggleGroup(groupHeader.getAttribute("data-group"));
      return;
    }

    const tile = target.closest(".entity-tile.interactive");
    if (tile) {
      this._openMoreInfo(tile.getAttribute("data-entity"));
    }
  }

  _handleKeydown(event) {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    const target = event.target instanceof Element ? event.target : null;
    if (!target) {
      return;
    }

    if (this._header && target.closest(".card-header")) {
      event.preventDefault();
      this._toggle();
      return;
    }

    const groupHeader = target.closest(".group-header[data-group]");
    if (groupHeader) {
      event.preventDefault();
      this._toggleGroup(groupHeader.getAttribute("data-group"));
      return;
    }

    const tile = target.closest(".entity-tile.interactive");
    if (tile) {
      event.preventDefault();
      this._openMoreInfo(tile.getAttribute("data-entity"));
    }
  }

  _handleSearchInput(event) {
    this._query = event.target.value || "";
    this._render();
  }

  _toggle() {
    this._collapsed = !this._collapsed;
    this._render(true);
  }

  _openMoreInfo(entityId) {
    if (!entityId) {
      return;
    }

    this.dispatchEvent(
      new CustomEvent("hass-more-info", {
        detail: { entityId },
        bubbles: true,
        composed: true
      })
    );
  }
}

if (!customElements.get(ELEMENT_TAG)) {
  customElements.define(ELEMENT_TAG, UnavailableEntityCard);
}

const cardEntry = {
  type: ELEMENT_TAG,
  name: "Unavailable Entity Card",
  description: "Tile-style list of unavailable or unknown entities.",
  preview: true,
  documentationURL: "https://github.com/vineetchoudhary/lovelace-unavailable-entity-card"
};

const customCards = (window.customCards = window.customCards || []);
if (!customCards.some((card) => card.type === cardEntry.type)) {
  customCards.push(cardEntry);
}
