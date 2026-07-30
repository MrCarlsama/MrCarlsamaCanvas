<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { Graph, type Node } from "@antv/x6";
import { getTeleport, register } from "@antv/x6-vue-shape";
import NewsprintNode from "./NewsprintNode.vue";

interface CanvasNode {
  id: string;
  parentId?: string;
  kind: "root" | "scene" | "reference";
  status: "draft" | "ready" | "locked";
  kicker: string;
  title: string;
  summary: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CanvasViewport {
  zoom: number;
  x: number;
  y: number;
}

const props = defineProps<{
  nodes: CanvasNode[];
  selectedNodeId: string;
  viewport: CanvasViewport;
  viewportResetRevision: number;
}>();

const emit = defineEmits<{
  select: [id: string];
  "node-move": [id: string, x: number, y: number];
  "viewport-change": [viewport: CanvasViewport];
  "pointer-move": [point: { x: number; y: number }];
}>();

register({
  shape: "mrcarlsama-newsprint-node",
  width: 238,
  height: 132,
  component: NewsprintNode,
});

const TeleportContainer = getTeleport();
const container = ref<HTMLDivElement | null>(null);
let graph: Graph | null = null;
let didInitialCenter = false;

function nodeData(
  source: CanvasNode,
  selected = source.id === props.selectedNodeId,
) {
  return {
    kind: source.kind,
    status: source.status,
    kicker: source.kicker,
    title: source.title,
    summary: source.summary,
    selected,
  };
}

function syncSelection() {
  if (!graph) return;
  for (const cell of graph.getNodes()) {
    const source = props.nodes.find((node) => node.id === cell.id);
    if (!source) continue;
    cell.setData(nodeData(source));
  }
}

function syncGraph() {
  if (!graph) return;

  const existingIds = new Set(graph.getNodes().map((node) => node.id));
  const nextIds = new Set(props.nodes.map((node) => node.id));

  for (const id of existingIds) {
    if (!nextIds.has(id)) graph.removeNode(id);
  }

  for (const source of props.nodes) {
    const existing = graph.getCellById(source.id) as Node | null;
    if (existing) {
      const position = existing.position();
      const size = existing.size();
      if (position.x !== source.x || position.y !== source.y) {
        existing.position(source.x, source.y);
      }
      if (size.width !== source.width || size.height !== source.height) {
        existing.resize(source.width, source.height);
      }
      existing.setData(nodeData(source));
      continue;
    }

    graph.addNode({
      id: source.id,
      shape: "mrcarlsama-newsprint-node",
      x: source.x,
      y: source.y,
      width: source.width,
      height: source.height,
      data: nodeData(source),
      zIndex: 2,
    });
  }

  graph.getEdges().forEach((edge) => edge.remove());
  for (const source of props.nodes) {
    if (!source.parentId || !nextIds.has(source.parentId)) continue;
    graph.addEdge({
      id: `edge-${source.parentId}-${source.id}`,
      source: { cell: source.parentId, anchor: { name: "right" } },
      target: { cell: source.id, anchor: { name: "left" } },
      router: { name: "manhattan", args: { padding: 22 } },
      connector: { name: "normal" },
      attrs: {
        line: {
          stroke: source.kind === "reference" ? "#CC0000" : "#111111",
          strokeWidth: 1,
          strokeDasharray: source.kind === "reference" ? "5 4" : "",
          targetMarker: {
            name: "block",
            width: 6,
            height: 5,
          },
        },
      },
      zIndex: 1,
    });
  }

  if (!didInitialCenter && props.nodes.length > 0) {
    didInitialCenter = true;
    requestAnimationFrame(() => graph?.centerContent({ padding: 80 }));
  }
}

function publishViewport() {
  if (!graph) return;
  const scale = graph.scale();
  const translation = graph.translate();
  emit("viewport-change", {
    zoom: scale.sx,
    x: translation.tx,
    y: translation.ty,
  });
}

onMounted(() => {
  if (!container.value) return;

  graph = new Graph({
    container: container.value,
    autoResize: true,
    background: { color: "#FFFFFF" },
    grid: {
      visible: true,
      type: "dot",
      size: 16,
      args: {
        color: "rgba(17, 17, 17, 0.18)",
        thickness: 1,
      },
    },
    panning: {
      enabled: true,
      eventTypes: ["leftMouseDown", "mouseWheel"],
    },
    mousewheel: {
      enabled: true,
      modifiers: ["ctrl", "meta"],
      minScale: 0.25,
      maxScale: 2.5,
      factor: 1.08,
    },
    interacting: {
      edgeMovable: false,
      edgeLabelMovable: false,
      arrowheadMovable: false,
    },
  });

  graph.on("node:click", ({ node }) => emit("select", node.id));
  graph.on("node:moved", ({ node }) => {
    const position = node.position();
    emit("node-move", node.id, position.x, position.y);
  });
  graph.on("scale", publishViewport);
  graph.on("translate", publishViewport);
  graph.on("blank:mousemove", ({ x, y }) => emit("pointer-move", { x, y }));
  graph.on("node:mousemove", ({ x, y }) => emit("pointer-move", { x, y }));

  syncGraph();
});

watch(
  () => props.nodes,
  () => syncGraph(),
  { deep: true },
);

watch(
  () => props.selectedNodeId,
  () => syncSelection(),
);

watch(
  () => props.viewportResetRevision,
  () => {
    graph?.zoomTo(props.viewport.zoom);
    graph?.translate(props.viewport.x, props.viewport.y);
  },
);

onBeforeUnmount(() => {
  graph?.dispose();
  graph = null;
});
</script>

<template>
  <div class="x6-canvas">
    <div ref="container" class="x6-canvas__surface"></div>
    <TeleportContainer />
  </div>
</template>
