import {
  EXPANSION_EDGE_TYPE,
  type CanvasDocument,
  type CanvasNode,
  type JsonObject,
} from "@mrcarlsama/canvas-core";

export type StudioNodeKind = "root" | "scene" | "reference";
export type StudioNodeStatus = "draft" | "ready" | "locked";

export interface StudioNode {
  id: string;
  parentId?: string;
  kind: StudioNodeKind;
  status: StudioNodeStatus;
  kicker: string;
  title: string;
  summary: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface StudioAsset {
  id: string;
  group: "character" | "location" | "wardrobe";
  label: string;
  meta: string;
}

export interface StudioViewport {
  zoom: number;
  x: number;
  y: number;
}

export interface StudioPointer {
  x: number;
  y: number;
}

export interface StudioCardContent extends JsonObject {
  kind: StudioNodeKind;
  status: StudioNodeStatus;
  kicker: string;
  title: string;
  summary: string;
}

const createdAt = "2026-07-30T00:00:00.000Z";

function card(
  id: string,
  content: StudioCardContent,
  x: number,
  y: number,
  width: number,
  height: number,
): CanvasNode<StudioCardContent> {
  return {
    id,
    type: "mrcarlsama.plan-card",
    contentVersion: 1,
    content,
    position: { x, y },
    size: { width, height },
  };
}

export const demoDocument: CanvasDocument = {
  schemaVersion: 1,
  id: "canvas-noir-board-01",
  projectId: "project-noir-shoot",
  title: "Noir Shoot / Board 01",
  nodes: [
    card(
      "root-noir",
      {
        kind: "root",
        status: "ready",
        kicker: "ROOT / 001",
        title: "Noir · 黑铸者",
        summary:
          "以黑白棚切换为主线，建立角色气质、服装结构与镜头节奏之间的关系。",
      },
      120,
      126,
      260,
      148,
    ),
    card(
      "scene-white",
      {
        kind: "scene",
        status: "draft",
        kicker: "SCENE / 01",
        title: "白棚：克制的正面",
        summary: "硬光压低环境信息，人物正面站姿作为第一组确认镜头。",
      },
      510,
      64,
      238,
      132,
    ),
    card(
      "scene-black",
      {
        kind: "scene",
        status: "locked",
        kicker: "SCENE / 02",
        title: "黑棚：轮廓与力量",
        summary: "用侧逆光保留帽檐与武器边缘，减少无意义的环境装饰。",
      },
      510,
      280,
      238,
      132,
    ),
    card(
      "reference-pose",
      {
        kind: "reference",
        status: "ready",
        kicker: "REFERENCE / 01",
        title: "姿态：重心后置",
        summary: "腿部形成稳定三角，肩线保持压迫感，镜头略低于腰线。",
      },
      875,
      280,
      220,
      118,
    ),
  ],
  edges: [
    {
      id: "edge-root-white",
      type: EXPANSION_EDGE_TYPE,
      source: "root-noir",
      target: "scene-white",
    },
    {
      id: "edge-root-black",
      type: EXPANSION_EDGE_TYPE,
      source: "root-noir",
      target: "scene-black",
    },
    {
      id: "edge-black-pose",
      type: EXPANSION_EDGE_TYPE,
      source: "scene-black",
      target: "reference-pose",
    },
  ],
  frames: [],
  frameMembers: [],
  savedViews: [],
  createdAt,
  updatedAt: createdAt,
};

export function isStudioCardContent(
  input: unknown,
): input is StudioCardContent {
  if (!input || typeof input !== "object") return false;
  const value = input as Partial<StudioCardContent>;
  return (
    (value.kind === "root" ||
      value.kind === "scene" ||
      value.kind === "reference") &&
    (value.status === "draft" ||
      value.status === "ready" ||
      value.status === "locked") &&
    typeof value.kicker === "string" &&
    typeof value.title === "string" &&
    typeof value.summary === "string"
  );
}

export function toStudioNodes(document: CanvasDocument): StudioNode[] {
  const parents = new Map(
    document.edges
      .filter((edge) => edge.type === EXPANSION_EDGE_TYPE)
      .map((edge) => [edge.target, edge.source]),
  );

  return document.nodes.flatMap((node) => {
    if (!isStudioCardContent(node.content)) return [];
    return [
      {
        id: node.id,
        ...(parents.has(node.id) ? { parentId: parents.get(node.id) } : {}),
        ...node.content,
        x: node.position.x,
        y: node.position.y,
        width: node.size?.width ?? 238,
        height: node.size?.height ?? 132,
      },
    ];
  });
}

export const demoNodes = toStudioNodes(demoDocument);

export const demoAssets: StudioAsset[] = [
  {
    id: "asset-noir",
    group: "character",
    label: "Noir 角色设定",
    meta: "12 refs",
  },
  {
    id: "asset-studio",
    group: "location",
    label: "黑白棚勘景",
    meta: "08 refs",
  },
  {
    id: "asset-costume",
    group: "wardrobe",
    label: "服装结构",
    meta: "16 refs",
  },
];
