import { describe, expect, it } from "vitest";

import type { CanvasNode } from "@mrcarlsama/canvas-core";
import { CardRegistry } from "@mrcarlsama/card-sdk";

import {
  IMAGE_CARD_TYPE,
  ROOT_TOPIC_CARD_TYPE,
  builtInCards,
  registerBuiltInCards,
} from "../src";

describe("built-in cards", () => {
  it("registers the minimal built-in set", () => {
    const registry = registerBuiltInCards(new CardRegistry());

    expect(registry.size).toBe(3);
    expect(registry.has("mrcarlsama.text")).toBe(true);
    expect(registry.has("mrcarlsama.image")).toBe(true);
    expect(registry.has(ROOT_TOPIC_CARD_TYPE)).toBe(true);
    expect(builtInCards).toHaveLength(3);
  });

  it("reports the image asset reference", () => {
    const registry = registerBuiltInCards(new CardRegistry());
    const imageNode: CanvasNode = {
      id: "image-1",
      type: IMAGE_CARD_TYPE,
      content: {
        assetId: "asset-1",
        alt: "reference",
      },
      position: { x: 0, y: 0 },
    };

    expect(registry.collectAssetIds(imageNode)).toEqual(["asset-1"]);
  });

  it("validates built-in content through the SDK schema capability", () => {
    const registry = registerBuiltInCards(new CardRegistry());
    const rootNode: CanvasNode = {
      id: "root-1",
      type: ROOT_TOPIC_CARD_TYPE,
      content: { title: "Noir" },
      position: { x: 0, y: 0 },
    };

    const prepared = registry.prepare(rootNode);

    expect(prepared.kind).toBe("registered");
    if (prepared.kind === "registered") {
      expect(prepared.node.content).toEqual({ title: "Noir" });
    }
  });
});
