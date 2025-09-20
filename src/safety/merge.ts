type PlainObject = Record<string, any>;

function isPlainObject(value: unknown): value is PlainObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function deepMerge<T extends PlainObject>(target: T, source: PlainObject): T {
  const output: PlainObject = {};

  for (const [key, value] of Object.entries(source)) {
    if (isPlainObject(value)) {
      const nextTarget = isPlainObject(target[key]) ? (target[key] as PlainObject) : {};
      output[key] = deepMerge(nextTarget, value);
    } else if (Array.isArray(value)) {
      // Replace arrays entirely to avoid duplicate command args/env
      output[key] = [...value];
    } else {
      output[key] = value;
    }
  }

  return output as T;
}

export function mergeMcpServers(existing: PlainObject, updates: PlainObject): PlainObject {
  const result: PlainObject = { ...existing };
  for (const [serverId, config] of Object.entries(updates)) {
    const current = isPlainObject(existing[serverId]) ? (existing[serverId] as PlainObject) : {};
    result[serverId] = deepMerge(current, config as PlainObject);
  }
  return result;
}
