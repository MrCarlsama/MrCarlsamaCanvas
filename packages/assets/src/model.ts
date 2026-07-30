export type AssetId = string;
export type CollectionId = string;
export type TagId = string;
export type ProjectId = string;
export type Sha256 = string & { readonly __sha256: unique symbol };
export type ManagedStorageKey = string & {
  readonly __managedStorageKey: unique symbol;
};

export interface AssetMetadata {
  readonly width?: number;
  readonly height?: number;
  readonly durationMs?: number;
  readonly exif?: Readonly<Record<string, unknown>>;
  readonly custom?: Readonly<Record<string, unknown>>;
}

export interface Asset {
  readonly id: AssetId;
  readonly sha256: Sha256;
  readonly byteSize: number;
  /** Deterministic key derived from `sha256` inside the managed global library. */
  readonly storageKey: ManagedStorageKey;
  readonly originalFileName: string;
  readonly mediaType?: string;
  readonly extension?: string;
  readonly title?: string;
  readonly description?: string;
  readonly metadata: AssetMetadata;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly trashedAt?: string;
}

export interface Collection {
  readonly id: CollectionId;
  readonly name: string;
  readonly parentId?: CollectionId;
  readonly createdAt: string;
}

export interface Tag {
  readonly id: TagId;
  readonly name: string;
  readonly color?: string;
}

/**
 * A project relation is separate from the global asset. Reusing one asset in
 * multiple projects therefore never duplicates its managed bytes.
 */
export interface ProjectAsset {
  readonly projectId: ProjectId;
  readonly assetId: AssetId;
  readonly addedAt: string;
  readonly usageMetadata?: Readonly<Record<string, unknown>>;
}

/**
 * Collections and tags organize the global library, not a project's view of
 * an asset. Moving between collections changes only these relationships.
 */
export interface AssetCollectionMembership {
  readonly assetId: AssetId;
  readonly collectionId: CollectionId;
  readonly addedAt: string;
}

export interface AssetTag {
  readonly assetId: AssetId;
  readonly tagId: TagId;
  readonly addedAt: string;
}

export function referenceAssetFromProject(
  projectId: ProjectId,
  assetId: AssetId,
  addedAt: string,
): ProjectAsset {
  return { projectId, assetId, addedAt };
}

export function setAssetCollections(
  memberships: readonly AssetCollectionMembership[],
  assetId: AssetId,
  collectionIds: readonly CollectionId[],
  addedAt: string,
): AssetCollectionMembership[] {
  const retained = memberships.filter(
    (membership) => membership.assetId !== assetId,
  );
  const uniqueCollectionIds = [...new Set(collectionIds)];
  return [
    ...retained,
    ...uniqueCollectionIds.map((collectionId) => ({
      assetId,
      collectionId,
      addedAt,
    })),
  ];
}

const SHA_256_PATTERN = /^[a-f0-9]{64}$/;

export function normalizeSha256(value: string): Sha256 {
  const normalized = value.trim().toLowerCase();
  if (!SHA_256_PATTERN.test(normalized)) {
    throw new TypeError("SHA-256 must contain exactly 64 hexadecimal digits");
  }
  return normalized as Sha256;
}

export function sameAssetContent(
  left: Pick<Asset, "sha256">,
  right: Pick<Asset, "sha256">,
): boolean {
  return left.sha256 === right.sha256;
}

/**
 * Managed files have one canonical location per content hash. Callers cannot
 * supply paths, filenames, or extensions that would create a second identity.
 */
export function managedStorageKeyForSha256(sha256: Sha256): ManagedStorageKey {
  return `objects/${sha256.slice(0, 2)}/${sha256}` as ManagedStorageKey;
}
