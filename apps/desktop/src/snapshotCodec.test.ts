import { describe, expect, it } from "vitest";
import {
  deserializeStudioSnapshot,
  serializeStudioSnapshot,
} from "./snapshotCodec";

describe("studio snapshot codec", () => {
  it("round-trips open card payloads without narrowing them", () => {
    const snapshot = {
      version: 1,
      document: {
        schemaVersion: 1,
        nodes: [
          {
            id: "plugin-node",
            type: "community.custom-card",
            content: {
              futureField: { nested: [1, "two", true] },
            },
          },
        ],
      },
    };

    expect(
      deserializeStudioSnapshot(serializeStudioSnapshot(snapshot)),
    ).toEqual(snapshot);
  });
});
