import type {
  Asset,
  AssetCollectionMembership,
  AssetId,
  AssetTag,
  CollectionId,
  ProjectAsset,
  ProjectId,
  Sha256,
  TagId,
} from "./model";

export interface AssetCatalog {
  findBySha256(sha256: Sha256): Promise<Asset | null>;
}

export type AssetDeduplicationDecision =
  | {
      readonly kind: "reuse";
      readonly asset: Asset;
    }
  | {
      readonly kind: "create";
      readonly sha256: Sha256;
    };

export class AssetIdentityConflictError extends Error {
  constructor(
    readonly asset: Asset,
    readonly candidateByteSize: number,
  ) {
    super(
      `SHA-256 matched asset ${asset.id}, but byte size differed (${asset.byteSize} !== ${candidateByteSize})`,
    );
    this.name = "AssetIdentityConflictError";
  }
}

/**
 * One content hash maps to one global asset. Re-importing the same bytes must
 * reuse that asset instead of creating a duplicate library item.
 */
export async function decideAssetDeduplication(
  catalog: AssetCatalog,
  sha256: Sha256,
  byteSize?: number,
): Promise<AssetDeduplicationDecision> {
  const existing = await catalog.findBySha256(sha256);
  if (existing === null) {
    return { kind: "create", sha256 };
  }
  if (byteSize !== undefined && existing.byteSize !== byteSize) {
    throw new AssetIdentityConflictError(existing, byteSize);
  }
  return { kind: "reuse", asset: existing };
}

/**
 * `source` is an opaque handle owned by an infrastructure adapter. The domain
 * package never opens a file, invokes Tauri, or reads browser blobs.
 */
export interface AssetImportSource<TSource = unknown> {
  readonly source: TSource;
  readonly fileName: string;
  readonly mediaType?: string;
  readonly byteSize?: number;
  readonly sha256?: Sha256;
}

export interface AssetImportRequest<TSource = unknown> {
  readonly sources: readonly AssetImportSource<TSource>[];
  readonly collectionIds?: readonly CollectionId[];
  readonly tagIds?: readonly TagId[];
}

export interface ImportedAsset {
  readonly asset: Asset;
  readonly reusedAsset: boolean;
  readonly collectionMemberships: readonly AssetCollectionMembership[];
  readonly tags: readonly AssetTag[];
}

export interface AssetImportResult {
  readonly items: readonly ImportedAsset[];
}

export interface AssetImportPort<TSource = unknown> {
  importAssets(
    request: AssetImportRequest<TSource>,
  ): Promise<AssetImportResult>;
}

/**
 * Project association is an explicit operation after global import. This keeps
 * library identity and lifecycle independent from any one canvas project.
 */
export interface ProjectAssetReferenceRequest {
  readonly projectId: ProjectId;
  readonly assetIds: readonly AssetId[];
}

export interface ProjectAssetReferencePort {
  referenceAssets(
    request: ProjectAssetReferenceRequest,
  ): Promise<readonly ProjectAsset[]>;
}

export interface AssetExportRequest {
  readonly assetIds: readonly AssetId[];
}

export interface ExportedAsset {
  readonly assetId: AssetId;
  readonly outputName: string;
  readonly sha256: Sha256;
  readonly byteSize: number;
}

export interface AssetExportResult {
  readonly items: readonly ExportedAsset[];
}

/**
 * V0.1 exports managed source bytes only. Destination selection belongs to the
 * infrastructure adapter, so the domain request needs only asset identities.
 */
export interface AssetExportPort {
  exportSourceFiles(request: AssetExportRequest): Promise<AssetExportResult>;
}
