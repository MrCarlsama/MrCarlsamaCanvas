<script setup lang="ts">
import { onBeforeUnmount, onMounted, watch } from "vue";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { X6Canvas } from "@mrcarlsama/editor-x6";
import { StudioShell, useStudioStore } from "@mrcarlsama/studio";
import {
  chooseAssetPath,
  exportProjectFile,
  initializeDesktopPersistence,
  isDesktopRuntime,
  loadStudioSnapshot,
  openProjectHelp,
  saveStudioSnapshot,
} from "./desktopBridge";

const studio = useStudioStore();
let persistenceReady = false;
let saveTimer: ReturnType<typeof setTimeout> | undefined;
let pendingSnapshot: ReturnType<typeof studio.snapshot> | undefined;
let unlistenClose: (() => void) | undefined;
let closing = false;

function describeError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function fileName(path: string) {
  return path.split(/[\\/]/).pop() || "已选择文件";
}

async function handleImport() {
  if (!isDesktopRuntime()) {
    studio.setPlatformMessage("浏览器预览 · 文件对话框仅在桌面端可用");
    return;
  }
  try {
    const path = await chooseAssetPath();
    studio.setPlatformMessage(
      path ? `已选择文件 · ${fileName(path)} · 等待托管导入` : "已取消选择",
    );
  } catch (error) {
    studio.setPlatformMessage(`导入失败 · ${describeError(error)}`);
  }
}

async function handleExport() {
  if (!isDesktopRuntime()) {
    studio.setPlatformMessage("浏览器预览 · 项目导出仅在桌面端可用");
    return;
  }
  try {
    const path = await exportProjectFile(studio.snapshot());
    studio.setPlatformMessage(
      path ? `项目文件已导出 · ${fileName(path)}` : "已取消导出",
    );
  } catch (error) {
    studio.setPlatformMessage(`导出失败 · ${describeError(error)}`);
  }
}

async function handleHelp() {
  if (!(await openProjectHelp())) {
    studio.setPlatformMessage("浏览器预览 · 项目说明将在桌面默认浏览器中打开");
  }
}

async function flushPendingSnapshot() {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = undefined;
  }
  const snapshot = pendingSnapshot;
  pendingSnapshot = undefined;
  if (!snapshot || !persistenceReady) return;

  try {
    const saved = await saveStudioSnapshot(snapshot);
    if (saved) studio.setPlatformMessage("已保存到本地 SQLite");
  } catch (error) {
    studio.setPlatformMessage(`自动保存失败 · ${describeError(error)}`);
  }
}

onMounted(async () => {
  try {
    const connected = await initializeDesktopPersistence();
    if (!connected) {
      studio.setPlatformMessage("浏览器预览 · 示例文档为内存态");
      return;
    }
    const savedSnapshot = await loadStudioSnapshot();
    const restored = savedSnapshot
      ? studio.restoreSnapshot(savedSnapshot)
      : false;
    if (savedSnapshot && !restored) {
      throw new Error("本地工作区格式无效或暂不支持，原数据未被覆盖");
    }
    studio.setPlatformMessage(
      restored ? "已从 SQLite 恢复本地工作区" : "SQLite 已连接 · 等待首次修改",
    );
    persistenceReady = true;
    unlistenClose = await getCurrentWindow().onCloseRequested(async (event) => {
      if (closing) return;
      event.preventDefault();
      await flushPendingSnapshot();
      closing = true;
      await getCurrentWindow().destroy();
    });
  } catch (error) {
    studio.setPlatformMessage(`本地数据库不可用 · ${describeError(error)}`);
  }
});

watch(
  () => studio.snapshot(),
  (snapshot) => {
    if (!persistenceReady) return;
    pendingSnapshot = snapshot;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => void flushPendingSnapshot(), 350);
  },
  { deep: true },
);

onBeforeUnmount(() => {
  unlistenClose?.();
  void flushPendingSnapshot();
});
</script>

<template>
  <StudioShell
    @request-import="handleImport"
    @request-export="handleExport"
    @request-help="handleHelp"
  >
    <template
      #canvas="{
        nodes,
        selectedNodeId,
        viewport,
        viewportResetRevision,
        selectNode,
        moveNode,
        setViewport,
        setPointer,
      }"
    >
      <X6Canvas
        :nodes="nodes"
        :selected-node-id="selectedNodeId"
        :viewport="viewport"
        :viewport-reset-revision="viewportResetRevision"
        @select="selectNode"
        @node-move="moveNode"
        @viewport-change="setViewport"
        @pointer-move="setPointer"
      />
    </template>
  </StudioShell>
</template>
