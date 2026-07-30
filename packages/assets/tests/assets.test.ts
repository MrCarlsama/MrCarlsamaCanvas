import { describe, expect, it } from "vitest";

import {
  decideAssetDeduplication,
  managedStorageKeyForSha256,
  normalizeSha256,
  referenceAssetFromProject,
  setAssetCollections,
  type Asset,
  type AssetCatalog,
  type AssetExportPort,
  type AssetExportRequest,
  type AssetImportRequest,
  type ProjectAssetReferenceRequest,
} from "../src";

const HASH = normalizeSha256("a".repeat(64));

describe("asset domain", () => {
  it("normalizes SHA-256 and rejects malformed values", () => {
    expect(normalizeSha256(`  ${"A".repeat(64)}  `)).toBe(HASH);
    expect(() => normalizeSha256("not-a-hash")).toThrow(TypeError);
  });

  it("reuses one global asset solely by SHA-256", async () => {
    const asset: Asset = {
      id: "asset-1",
      sha256: HASH,
      byteSize: 42,
      storageKey: managedStorageKeyForSha256(HASH),
      originalFileName: "reference.jpg",
      metadata: {},
      createdAt: "2026-07-30T00:00:00.000Z",
      updatedAt: "2026-07-30T00:00:00.000Z",
    };
    const catalog: AssetCatalog = {
      findBySha256: async (sha256) => (sha256 === asset.sha256 ? asset : null),
    };

    await expect(decideAssetDeduplication(catalog, HASH, 42)).resolves.toEqual({
      kind: "reuse",
      asset,
    });
  });

  it("lets projects reference one global asset without copying its bytes", () => {
    const asset: Asset = {
      id: "asset-1",
      sha256: HASH,
      byteSize: 42,
      storageKey: managedStorageKeyForSha256(HASH),
      originalFileName: "reference.jpg",
      metadata: {},
      createdAt: "2026-07-30T00:00:00.000Z",
      updatedAt: "2026-07-30T00:00:00.000Z",
    };
    const first = referenceAssetFromProject(
      "project-a",
      asset.id,
      "2026-07-30T00:00:00.000Z",
    );
    const second = referenceAssetFromProject(
      "project-b",
      asset.id,
      "2026-07-30T00:00:01.000Z",
    );

    expect([first.assetId, second.assetId]).toEqual([asset.id, asset.id]);
    expect("storageKey" in first).toBe(false);
    expect("storageKey" in second).toBe(false);
  });

  it("keeps global import separate from project association", () => {
    const importRequest: AssetImportRequest<string> = {
      sources: [
        { source: "/incoming/reference.jpg", fileName: "reference.jpg" },
      ],
      collectionIds: ["references"],
    };
    const projectRequest: ProjectAssetReferenceRequest = {
      projectId: "project-a",
      assetIds: ["asset-1"],
    };

    expect(importRequest).not.toHaveProperty("projectId");
    expect(projectRequest).toEqual({
      projectId: "project-a",
      assetIds: ["asset-1"],
    });
  });

  it("moves an asset between virtual collections by replacing relations", () => {
    const original = [
      {
        assetId: "asset-1",
        collectionId: "collection-a",
        addedAt: "2026-07-30T00:00:00.000Z",
      },
      {
        assetId: "asset-2",
        collectionId: "collection-a",
        addedAt: "2026-07-30T00:00:00.000Z",
      },
    ];

    const moved = setAssetCollections(
      original,
      "asset-1",
      ["collection-b"],
      "2026-07-30T00:01:00.000Z",
    );

    expect(moved).toEqual([
      original[1],
      {
        assetId: "asset-1",
        collectionId: "collection-b",
        addedAt: "2026-07-30T00:01:00.000Z",
      },
    ]);
    expect(original[0]?.collectionId).toBe("collection-a");
  });

  it("derives one fixed managed storage key from SHA-256", () => {
    expect(managedStorageKeyForSha256(HASH)).toBe(
      `objects/aa/${"a".repeat(64)}`,
    );
    expect(managedStorageKeyForSha256(normalizeSha256("b".repeat(64)))).toBe(
      `objects/bb/${"b".repeat(64)}`,
    );
  });

  it("exports source files by asset identity alone", async () => {
    const request: AssetExportRequest = { assetIds: ["asset-1", "asset-2"] };
    const port: AssetExportPort = {
      exportSourceFiles: async ({ assetIds }) => ({
        items: assetIds.map((assetId) => ({
          assetId,
          outputName: `${assetId}.bin`,
          sha256: HASH,
          byteSize: 42,
        })),
      }),
    };

    await expect(port.exportSourceFiles(request)).resolves.toMatchObject({
      items: [{ assetId: "asset-1" }, { assetId: "asset-2" }],
    });
    expect(Object.keys(request)).toEqual(["assetIds"]);
  });
});
