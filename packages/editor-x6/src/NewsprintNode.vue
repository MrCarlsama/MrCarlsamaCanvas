<script setup lang="ts">
import { computed, inject, onBeforeUnmount, onMounted, ref } from "vue";
import type { Node } from "@antv/x6";

interface NewsprintNodeData {
  kind: "root" | "scene" | "reference";
  status: "draft" | "ready" | "locked";
  kicker: string;
  title: string;
  summary: string;
  selected?: boolean;
}

const getNode = inject<() => Node>("getNode");
const node = getNode?.();
const nodeData = ref<NewsprintNodeData>(
  node?.getData<NewsprintNodeData>() ?? {
    kind: "scene",
    status: "draft",
    kicker: "SCENE",
    title: "Untitled",
    summary: "",
  },
);

const number = computed(() => {
  const match = nodeData.value.kicker.match(/\d+$/);
  return match?.[0]?.padStart(2, "0") ?? "—";
});

function syncData({ current }: { current: NewsprintNodeData }) {
  nodeData.value = { ...current };
}

onMounted(() => {
  node?.on("change:data", syncData);
});

onBeforeUnmount(() => {
  node?.off("change:data", syncData);
});
</script>

<template>
  <article
    class="newsprint-node"
    :class="[
      `newsprint-node--${nodeData.kind}`,
      { 'is-selected': nodeData.selected },
    ]"
  >
    <header>
      <span>{{ nodeData.kicker }}</span>
      <span class="node-number">{{ number }}</span>
    </header>
    <div class="node-copy">
      <h3>{{ nodeData.title }}</h3>
      <p>{{ nodeData.summary }}</p>
    </div>
    <footer>
      <span>{{ nodeData.status }}</span>
      <i aria-hidden="true"></i>
    </footer>
  </article>
</template>
