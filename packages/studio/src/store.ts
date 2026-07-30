import { computed, ref, shallowRef, toRaw } from "vue";
import { defineStore } from "pinia";
import {
  EXPANSION_EDGE_TYPE,
  validateCanvasDocument,
  type CanvasDocument,
  type CanvasNode,
} from "@mrcarlsama/canvas-core";
import {
  demoAssets,
  demoDocument,
  isStudioCardContent,
  toStudioNodes,
  type StudioAsset,
  type StudioCardContent,
  type StudioNode,
  type StudioPointer,
  type StudioViewport,
} from "./model";

export interface StudioSnapshot {
  version: 1;
  document: CanvasDocument;
  assets: StudioAsset[];
  viewport: StudioViewport;
}

function cloneDocument(document: CanvasDocument): CanvasDocument {
  return structuredClone(toRaw(document));
}

function isCanvasDocument(input: unknown): input is CanvasDocument {
  if (!input || typeof input !== "object") return false;
  const value = input as Partial<CanvasDocument>;
  return (
    typeof value.schemaVersion === "number" &&
    typeof value.id === "string" &&
    typeof value.projectId === "string" &&
    typeof value.title === "string" &&
    Array.isArray(value.nodes) &&
    value.nodes.every((node) => {
      if (!node || typeof node !== "object") return false;
      const candidate = node as Partial<CanvasNode>;
      return (
        typeof candidate.id === "string" &&
        typeof candidate.type === "string" &&
        Boolean(candidate.position) &&
        typeof candidate.position?.x === "number" &&
        typeof candidate.position?.y === "number"
      );
    }) &&
    Array.isArray(value.edges) &&
    Array.isArray(value.frames) &&
    Array.isArray(value.frameMembers) &&
    Array.isArray(value.savedViews) &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string"
  );
}

function isStudioAsset(input: unknown): input is StudioAsset {
  if (!input || typeof input !== "object") return false;
  const value = input as Partial<StudioAsset>;
  return (
    typeof value.id === "string" &&
    (value.group === "character" ||
      value.group === "location" ||
      value.group === "wardrobe") &&
    typeof value.label === "string" &&
    typeof value.meta === "string"
  );
}

export const useStudioStore = defineStore("studio", () => {
  const document = shallowRef<CanvasDocument>(cloneDocument(demoDocument));
  const assets = ref<StudioAsset[]>(demoAssets.map((asset) => ({ ...asset })));
  const nodes = computed(() => toStudioNodes(document.value));
  const selectedNodeId = ref(nodes.value[0]?.id ?? "");
  const activeAssetId = ref("");
  const viewport = ref<StudioViewport>({ zoom: 1, x: 0, y: 0 });
  const viewportResetRevision = ref(0);
  const pointer = ref<StudioPointer>({ x: 0, y: 0 });
  const platformMessage = ref("本地草稿 · 尚未写入磁盘");

  const selectedNode = computed(
    () => nodes.value.find((node) => node.id === selectedNodeId.value) ?? null,
  );
  const rootNodes = computed(() =>
    nodes.value.filter((node) => node.kind === "root"),
  );
  const childNodes = computed(() =>
    nodes.value.filter((node) => node.parentId),
  );

  function replaceDocument(
    patch: Partial<Pick<CanvasDocument, "nodes" | "edges">>,
  ) {
    document.value = {
      ...document.value,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
  }

  function selectNode(id: string) {
    if (!nodes.value.some((node) => node.id === id)) return;
    selectedNodeId.value = id;
    activeAssetId.value = "";
  }

  function selectAsset(id: string) {
    if (!assets.value.some((asset) => asset.id === id)) return;
    activeAssetId.value = id;
  }

  function updateSelected(
    patch: Partial<Pick<StudioNode, "title" | "summary" | "status">>,
  ) {
    const id = selectedNodeId.value;
    const nextNodes = document.value.nodes.map((node) => {
      if (node.id !== id || !isStudioCardContent(node.content)) return node;
      return {
        ...node,
        content: { ...node.content, ...patch },
      };
    });
    replaceDocument({ nodes: nextNodes });
    platformMessage.value = "内存中有未保存的修改";
  }

  function addChild() {
    const parent = selectedNode.value ?? rootNodes.value[0];
    if (!parent) return;

    const id = `scene-${document.value.nodes.length + 1}`;
    const siblingCount = nodes.value.filter(
      (node) => node.parentId === parent.id,
    ).length;
    const content: StudioCardContent = {
      kind: "scene",
      status: "draft",
      kicker: `SCENE / ${String(siblingCount + 1).padStart(2, "0")}`,
      title: "未命名镜头",
      summary: "从一个明确的视觉意图开始。",
    };
    const node: CanvasNode<StudioCardContent> = {
      id,
      type: "mrcarlsama.plan-card",
      contentVersion: 1,
      content,
      position: {
        x: parent.x + parent.width + 130,
        y: parent.y + siblingCount * 170,
      },
      size: { width: 238, height: 132 },
    };
    replaceDocument({
      nodes: [...document.value.nodes, node],
      edges: [
        ...document.value.edges,
        {
          id: `edge-${parent.id}-${id}`,
          type: EXPANSION_EDGE_TYPE,
          source: parent.id,
          target: id,
        },
      ],
    });
    selectedNodeId.value = id;
    platformMessage.value = "已创建子节点 · 等待自动保存";
  }

  function setViewport(next: StudioViewport) {
    viewport.value = {
      zoom: Math.min(2.5, Math.max(0.25, next.zoom)),
      x: Math.round(next.x),
      y: Math.round(next.y),
    };
  }

  function setPointer(next: StudioPointer) {
    pointer.value = {
      x: Math.round(next.x),
      y: Math.round(next.y),
    };
  }

  function setPlatformMessage(message: string) {
    platformMessage.value = message;
  }

  function moveNode(id: string, x: number, y: number) {
    const nextNodes = document.value.nodes.map((node) =>
      node.id === id
        ? { ...node, position: { x: Math.round(x), y: Math.round(y) } }
        : node,
    );
    replaceDocument({ nodes: nextNodes });
    platformMessage.value = "节点位置已修改 · 等待自动保存";
  }

  function resetViewportRequest() {
    viewport.value = { zoom: 1, x: 0, y: 0 };
    viewportResetRevision.value += 1;
  }

  function snapshot(): StudioSnapshot {
    return {
      version: 1,
      document: cloneDocument(document.value),
      assets: assets.value.map((asset) => ({ ...asset })),
      viewport: { ...viewport.value },
    };
  }

  function restoreSnapshot(input: unknown) {
    if (!input || typeof input !== "object") return false;
    const candidate = input as Partial<StudioSnapshot>;
    if (candidate.version !== 1 || !isCanvasDocument(candidate.document))
      return false;
    if (!validateCanvasDocument(candidate.document).valid) return false;

    document.value = cloneDocument(candidate.document);
    if (Array.isArray(candidate.assets)) {
      const restoredAssets = candidate.assets.filter(isStudioAsset);
      if (restoredAssets.length > 0) {
        assets.value = restoredAssets.map((asset) => ({ ...asset }));
      }
    }
    if (
      candidate.viewport &&
      typeof candidate.viewport.zoom === "number" &&
      typeof candidate.viewport.x === "number" &&
      typeof candidate.viewport.y === "number"
    ) {
      viewport.value = { ...candidate.viewport };
    }
    viewportResetRevision.value += 1;
    selectedNodeId.value = nodes.value[0]?.id ?? "";
    platformMessage.value = "已从 SQLite 恢复本地工作区";
    return true;
  }

  return {
    document,
    nodes,
    assets,
    selectedNodeId,
    selectedNode,
    activeAssetId,
    rootNodes,
    childNodes,
    viewport,
    viewportResetRevision,
    pointer,
    platformMessage,
    selectNode,
    selectAsset,
    updateSelected,
    addChild,
    setViewport,
    setPointer,
    setPlatformMessage,
    moveNode,
    resetViewportRequest,
    snapshot,
    restoreSnapshot,
  };
});
