export function serializeStudioSnapshot(snapshot: unknown) {
  return JSON.stringify(snapshot);
}

export function deserializeStudioSnapshot(serialized: string) {
  return JSON.parse(serialized) as unknown;
}
