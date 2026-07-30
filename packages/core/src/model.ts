export type ProjectId = string;
export type CanvasDocumentId = string;
export type CanvasNodeId = string;
export type CanvasEdgeId = string;
export type FrameId = string;
export type SavedViewId = string;

export type JsonPrimitive = string | number | boolean | null;
export type JsonObject = { readonly [key: string]: JsonValue };
export type JsonValue = JsonPrimitive | readonly JsonValue[] | JsonObject;

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface Size {
  readonly width: number;
  readonly height: number;
}

/**
 * Stable persistence shell shared by every card type.
 *
 * `type` and `content` deliberately remain open so plugins can add cards
 * without requiring a new core release or a closed union update.
 */
export interface CanvasNode<TContent = JsonValue> {
  readonly id: CanvasNodeId;
  readonly type: string;
  readonly content: TContent;
  readonly contentVersion?: number;
  readonly position: Point;
  readonly size?: Size;
  readonly zIndex?: number;
  readonly metadata?: Readonly<Record<string, JsonValue>>;
}

/**
 * Edges use the same open-type rule as nodes. Core only assigns semantics to
 * the `expansion` type; plugins remain free to add other relationships.
 */
export interface CanvasEdge<TData = JsonValue> {
  readonly id: CanvasEdgeId;
  readonly type: string;
  readonly source: CanvasNodeId;
  readonly target: CanvasNodeId;
  readonly data?: TData;
}

export interface Viewport {
  readonly center: Point;
  readonly zoom: number;
}

export interface SavedView {
  readonly id: SavedViewId;
  readonly name: string;
  readonly viewport: Viewport;
  readonly focusedNodeIds?: readonly CanvasNodeId[];
  readonly focusedFrameIds?: readonly FrameId[];
  readonly sortOrder: number;
}

export interface Frame {
  readonly id: FrameId;
  readonly title: string;
  readonly position: Point;
  readonly size: Size;
  readonly color?: string;
  readonly collapsed?: boolean;
}

/**
 * Membership is persisted explicitly. Geometry is only an editor hint, and
 * neither X6 parent state nor hit testing may become a second source of truth.
 */
export interface FrameMember {
  readonly frameId: FrameId;
  readonly nodeId: CanvasNodeId;
}

/**
 * A project owns exactly this one canvas document. There is intentionally no
 * page/document collection nested inside a project.
 */
export interface CanvasDocument {
  readonly schemaVersion: number;
  readonly id: CanvasDocumentId;
  readonly projectId: ProjectId;
  readonly title: string;
  readonly nodes: readonly CanvasNode[];
  readonly edges: readonly CanvasEdge[];
  readonly frames: readonly Frame[];
  readonly frameMembers: readonly FrameMember[];
  readonly savedViews: readonly SavedView[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CanvasDocumentRepository {
  load(projectId: ProjectId): Promise<CanvasDocument | null>;
  save(document: CanvasDocument): Promise<void>;
}

export const EXPANSION_EDGE_TYPE = "expansion";

export type CanvasDocumentValidationIssueCode =
  | "EMPTY_ID"
  | "DUPLICATE_ID"
  | "MISSING_REFERENCE"
  | "DUPLICATE_FRAME_MEMBER"
  | "NODE_IN_MULTIPLE_FRAMES"
  | "EXPANSION_MULTIPLE_PARENTS"
  | "EXPANSION_CYCLE"
  | "MISSING_ROOT";

export interface CanvasDocumentValidationIssue {
  readonly code: CanvasDocumentValidationIssueCode;
  readonly path: string;
  readonly message: string;
}

export interface CanvasDocumentValidationResult {
  readonly valid: boolean;
  readonly issues: readonly CanvasDocumentValidationIssue[];
}

export interface CreateCanvasDocumentInput {
  readonly id: CanvasDocumentId;
  readonly projectId: ProjectId;
  readonly title?: string;
  readonly now?: string;
}

export function createCanvasDocument(
  input: CreateCanvasDocumentInput,
): CanvasDocument {
  const now = input.now ?? new Date().toISOString();

  return {
    schemaVersion: 1,
    id: input.id,
    projectId: input.projectId,
    title: input.title ?? "Untitled canvas",
    nodes: [],
    edges: [],
    frames: [],
    frameMembers: [],
    savedViews: [],
    createdAt: now,
    updatedAt: now,
  };
}

export interface CreateFrameInput {
  readonly id: FrameId;
  readonly position: Point;
  readonly size: Size;
  readonly title: string;
  readonly color?: string;
  readonly collapsed?: boolean;
}

export function createFrame(input: CreateFrameInput): Frame {
  return {
    id: input.id,
    title: input.title,
    position: input.position,
    size: input.size,
    ...(input.color === undefined ? {} : { color: input.color }),
    ...(input.collapsed === undefined ? {} : { collapsed: input.collapsed }),
  };
}

export interface CreateSavedViewInput {
  readonly id: SavedViewId;
  readonly name: string;
  readonly center: Point;
  readonly zoom: number;
  readonly focusedNodeIds?: readonly CanvasNodeId[];
  readonly focusedFrameIds?: readonly FrameId[];
  readonly sortOrder?: number;
}

export function createSavedView(input: CreateSavedViewInput): SavedView {
  if (!Number.isFinite(input.zoom) || input.zoom <= 0) {
    throw new RangeError("Saved view zoom must be a positive number");
  }

  return {
    id: input.id,
    name: input.name,
    viewport: {
      center: input.center,
      zoom: input.zoom,
    },
    ...(input.focusedNodeIds === undefined
      ? {}
      : { focusedNodeIds: input.focusedNodeIds }),
    ...(input.focusedFrameIds === undefined
      ? {}
      : { focusedFrameIds: input.focusedFrameIds }),
    sortOrder: input.sortOrder ?? 0,
  };
}

/**
 * Validates all structural invariants owned by core.
 *
 * Editors and persistence adapters should use this one result instead of
 * recreating invariant-specific branches. Card payload validation remains the
 * responsibility of the card implementation.
 */
export function validateCanvasDocument(
  document: CanvasDocument,
): CanvasDocumentValidationResult {
  const issues: CanvasDocumentValidationIssue[] = [];
  const addIssue = (
    code: CanvasDocumentValidationIssueCode,
    path: string,
    message: string,
  ): void => {
    issues.push({ code, path, message });
  };
  const collectIds = <T>(
    collection: readonly T[],
    collectionName: string,
    getId: (value: T) => string,
  ): Set<string> => {
    const ids = new Set<string>();

    collection.forEach((value, index) => {
      const id = getId(value);
      const path = `${collectionName}[${index}].id`;

      if (id.trim().length === 0) {
        addIssue("EMPTY_ID", path, `${collectionName} ID must not be empty`);
        return;
      }

      if (ids.has(id)) {
        addIssue(
          "DUPLICATE_ID",
          path,
          `${collectionName} ID "${id}" must be unique`,
        );
        return;
      }

      ids.add(id);
    });

    return ids;
  };

  if (document.id.trim().length === 0) {
    addIssue("EMPTY_ID", "id", "Canvas document ID must not be empty");
  }
  if (document.projectId.trim().length === 0) {
    addIssue("EMPTY_ID", "projectId", "Project ID must not be empty");
  }

  const nodeIds = collectIds(document.nodes, "nodes", (node) => node.id);
  collectIds(document.edges, "edges", (edge) => edge.id);
  const frameIds = collectIds(document.frames, "frames", (frame) => frame.id);
  collectIds(document.savedViews, "savedViews", (view) => view.id);

  document.edges.forEach((edge, index) => {
    if (!nodeIds.has(edge.source)) {
      addIssue(
        "MISSING_REFERENCE",
        `edges[${index}].source`,
        `Edge "${edge.id}" references missing source node "${edge.source}"`,
      );
    }
    if (!nodeIds.has(edge.target)) {
      addIssue(
        "MISSING_REFERENCE",
        `edges[${index}].target`,
        `Edge "${edge.id}" references missing target node "${edge.target}"`,
      );
    }
  });

  const frameMemberships = new Set<string>();
  const frameIdsByNode = new Map<CanvasNodeId, Set<FrameId>>();

  document.frameMembers.forEach((member, index) => {
    if (!frameIds.has(member.frameId)) {
      addIssue(
        "MISSING_REFERENCE",
        `frameMembers[${index}].frameId`,
        `Frame member references missing frame "${member.frameId}"`,
      );
    }
    if (!nodeIds.has(member.nodeId)) {
      addIssue(
        "MISSING_REFERENCE",
        `frameMembers[${index}].nodeId`,
        `Frame member references missing node "${member.nodeId}"`,
      );
    }

    const membershipKey = `${member.frameId}\u0000${member.nodeId}`;
    if (frameMemberships.has(membershipKey)) {
      addIssue(
        "DUPLICATE_FRAME_MEMBER",
        `frameMembers[${index}]`,
        `Node "${member.nodeId}" is listed more than once in frame "${member.frameId}"`,
      );
    } else {
      frameMemberships.add(membershipKey);
    }

    const memberships = frameIdsByNode.get(member.nodeId) ?? new Set<FrameId>();
    memberships.add(member.frameId);
    frameIdsByNode.set(member.nodeId, memberships);
  });

  for (const [nodeId, memberships] of frameIdsByNode) {
    if (memberships.size > 1) {
      addIssue(
        "NODE_IN_MULTIPLE_FRAMES",
        "frameMembers",
        `Node "${nodeId}" belongs to more than one frame`,
      );
    }
  }

  document.savedViews.forEach((view, viewIndex) => {
    view.focusedNodeIds?.forEach((nodeId, nodeIndex) => {
      if (!nodeIds.has(nodeId)) {
        addIssue(
          "MISSING_REFERENCE",
          `savedViews[${viewIndex}].focusedNodeIds[${nodeIndex}]`,
          `Saved view "${view.id}" references missing node "${nodeId}"`,
        );
      }
    });
    view.focusedFrameIds?.forEach((frameId, frameIndex) => {
      if (!frameIds.has(frameId)) {
        addIssue(
          "MISSING_REFERENCE",
          `savedViews[${viewIndex}].focusedFrameIds[${frameIndex}]`,
          `Saved view "${view.id}" references missing frame "${frameId}"`,
        );
      }
    });
  });

  const expansionEdges = document.edges.filter(
    (edge) =>
      edge.type === EXPANSION_EDGE_TYPE &&
      nodeIds.has(edge.source) &&
      nodeIds.has(edge.target),
  );
  const expansionParentEdgeByNode = new Map<CanvasNodeId, CanvasEdgeId>();

  for (const edge of expansionEdges) {
    const existingParentEdgeId = expansionParentEdgeByNode.get(edge.target);
    if (existingParentEdgeId !== undefined) {
      addIssue(
        "EXPANSION_MULTIPLE_PARENTS",
        "edges",
        `Node "${edge.target}" has more than one expansion parent edge: "${existingParentEdgeId}" and "${edge.id}"`,
      );
    } else {
      expansionParentEdgeByNode.set(edge.target, edge.id);
    }
  }

  const roots = deriveRootNodeIds(document);
  if (document.nodes.length > 0 && roots.length === 0) {
    addIssue(
      "MISSING_ROOT",
      "nodes",
      "A non-empty canvas must contain at least one expansion root",
    );
  }

  const expansionTargetsBySource = new Map<CanvasNodeId, CanvasNodeId[]>();
  const expansionInDegree = new Map<CanvasNodeId, number>(
    document.nodes.map((node) => [node.id, 0]),
  );

  for (const edge of expansionEdges) {
    const targets = expansionTargetsBySource.get(edge.source) ?? [];
    targets.push(edge.target);
    expansionTargetsBySource.set(edge.source, targets);
    expansionInDegree.set(
      edge.target,
      (expansionInDegree.get(edge.target) ?? 0) + 1,
    );
  }

  const remainingRoots = [...expansionInDegree]
    .filter(([, inDegree]) => inDegree === 0)
    .map(([nodeId]) => nodeId);
  let visitedNodeCount = 0;

  for (let index = 0; index < remainingRoots.length; index += 1) {
    const nodeId = remainingRoots[index];
    if (nodeId === undefined) {
      continue;
    }

    visitedNodeCount += 1;
    for (const target of expansionTargetsBySource.get(nodeId) ?? []) {
      const nextInDegree = (expansionInDegree.get(target) ?? 0) - 1;
      expansionInDegree.set(target, nextInDegree);
      if (nextInDegree === 0) {
        remainingRoots.push(target);
      }
    }
  }

  if (visitedNodeCount < nodeIds.size) {
    addIssue(
      "EXPANSION_CYCLE",
      "edges",
      "Expansion edges must not contain a cycle",
    );
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Root topics are derived data: a node is a root when no valid expansion edge
 * points to it. Dangling edges do not make a real node disappear from roots.
 */
export function deriveRootNodeIds(
  document: Pick<CanvasDocument, "nodes" | "edges">,
): CanvasNodeId[] {
  const nodeIds = new Set(document.nodes.map((node) => node.id));
  const expandedChildren = new Set<CanvasNodeId>();

  for (const edge of document.edges) {
    if (
      edge.type === EXPANSION_EDGE_TYPE &&
      nodeIds.has(edge.source) &&
      nodeIds.has(edge.target)
    ) {
      expandedChildren.add(edge.target);
    }
  }

  return document.nodes
    .filter((node) => !expandedChildren.has(node.id))
    .map((node) => node.id);
}
