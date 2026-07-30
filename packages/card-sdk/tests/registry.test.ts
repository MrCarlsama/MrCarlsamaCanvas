import { describe, expect, expectTypeOf, it } from "vitest";

import {
  CardRegistry,
  defineCard,
  prepareCard,
  type CardNodeEnvelope,
} from "../src";

describe("CardRegistry", () => {
  it("preserves an unknown plugin node without transforming its data", () => {
    const originalNode: CardNodeEnvelope & {
      readonly position: { readonly x: number; readonly y: number };
    } = {
      id: "unknown-1",
      type: "plugin.not-installed",
      content: {
        nested: ["keep", { everything: true }],
      },
      contentVersion: 7,
      position: { x: 10, y: 20 },
    };

    const resolved = new CardRegistry().prepare(originalNode);

    expect(resolved.kind).toBe("missing");
    if (resolved.kind === "missing") {
      expect(resolved.originalNode).toBe(originalNode);
      expect(resolved.originalNode.content).toEqual(originalNode.content);
    }
  });

  it("migrates content in explicit steps and validates the result", () => {
    const definition = defineCard<{ text: string }>({
      type: "example.text",
      version: 2,
      migrations: [
        {
          fromVersion: 1,
          toVersion: 2,
          migrate: (content) => ({
            text: String(content),
          }),
        },
      ],
      schema: {
        parse: (input) => {
          if (
            typeof input !== "object" ||
            input === null ||
            !("text" in input) ||
            typeof input.text !== "string"
          ) {
            throw new TypeError("Expected text content");
          }
          return { text: input.text };
        },
      },
    });
    const registry = new CardRegistry().register(definition);
    const node: CardNodeEnvelope<string> & {
      readonly position: { readonly x: number; readonly y: number };
    } = {
      id: "text-1",
      type: "example.text",
      content: "hello",
      contentVersion: 1,
      position: { x: 10, y: 20 },
    };

    const prepared = registry.prepare(node);
    const staticallyPrepared = prepareCard(definition, node);

    expect(prepared.kind).toBe("registered");
    if (prepared.kind === "registered") {
      expectTypeOf(prepared.node.content).toEqualTypeOf<unknown>();
      expect(prepared.node.contentVersion).toBe(2);
      expect(prepared.node.content).toEqual({ text: "hello" });
    }

    expectTypeOf(staticallyPrepared.node.content).toEqualTypeOf<{
      text: string;
    }>();
    expectTypeOf(staticallyPrepared.node.position).toEqualTypeOf<{
      readonly x: number;
      readonly y: number;
    }>();
    expect(staticallyPrepared.node.content).toEqual({ text: "hello" });
  });

  it("rejects migration jumps and duplicate starting versions", () => {
    expect(() =>
      defineCard({
        type: "example.jump",
        version: 3,
        migrations: [
          {
            fromVersion: 1,
            toVersion: 3,
            migrate: (content) => content,
          },
        ],
        schema: { parse: (input) => input },
      }),
    ).toThrow("Invalid migration 1 -> 3");

    expect(() =>
      defineCard({
        type: "example.duplicate",
        version: 2,
        migrations: [
          {
            fromVersion: 1,
            toVersion: 2,
            migrate: (content) => content,
          },
          {
            fromVersion: 1,
            toVersion: 2,
            migrate: (content) => content,
          },
        ],
        schema: { parse: (input) => input },
      }),
    ).toThrow("Duplicate migration from version 1");
  });

  it("collects and de-duplicates a card's asset references", () => {
    const registry = new CardRegistry().register(
      defineCard<{ assetIds: string[] }>({
        type: "example.gallery",
        version: 1,
        schema: {
          parse: (input) => input as { assetIds: string[] },
        },
        collectAssetIds: ({ assetIds }) => assetIds,
      }),
    );
    const node: CardNodeEnvelope<{ assetIds: string[] }> = {
      id: "gallery-1",
      type: "example.gallery",
      content: { assetIds: ["asset-a", "asset-a", "asset-b"] },
    };

    expect(registry.collectAssetIds(node)).toEqual(["asset-a", "asset-b"]);
  });
});
