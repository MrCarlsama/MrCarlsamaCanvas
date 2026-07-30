<script setup lang="ts">
import { computed } from "vue";
import { useStudioStore } from "./store";
import type { StudioNodeStatus } from "./model";

const emit = defineEmits<{
  "request-import": [];
  "request-export": [];
  "request-help": [];
}>();

const store = useStudioStore();

const selectedTitle = computed({
  get: () => store.selectedNode?.title ?? "",
  set: (title: string) => store.updateSelected({ title }),
});

const selectedSummary = computed({
  get: () => store.selectedNode?.summary ?? "",
  set: (summary: string) => store.updateSelected({ summary }),
});

const selectedStatus = computed({
  get: () => store.selectedNode?.status ?? "draft",
  set: (status: StudioNodeStatus) => store.updateSelected({ status }),
});
</script>

<template>
  <main class="studio-shell">
    <header class="editor-bar" aria-label="编辑工具栏">
      <div class="brand-lockup">
        <span class="brand-mark" aria-hidden="true"></span>
        <div>
          <p class="brand-name">MrCarlsama Canvas</p>
          <p class="document-name">NOIR SHOOT / BOARD 01</p>
        </div>
      </div>

      <div class="editor-tools" role="toolbar" aria-label="画布操作">
        <button
          class="tool-button tool-button--accent"
          type="button"
          @click="store.addChild"
        >
          <span aria-hidden="true">＋</span>
          子节点
        </button>
        <button
          class="tool-button"
          type="button"
          title="连接工具将在下一迭代接通"
        >
          连线
        </button>
        <span class="tool-separator" aria-hidden="true"></span>
        <button class="tool-button tool-button--compact" type="button" disabled>
          撤销
        </button>
        <button class="tool-button tool-button--compact" type="button" disabled>
          重做
        </button>
        <span class="tool-separator" aria-hidden="true"></span>
        <button
          class="tool-button"
          type="button"
          @click="store.resetViewportRequest"
        >
          100%
        </button>
      </div>

      <div class="document-actions">
        <button
          class="text-action"
          type="button"
          @click="emit('request-import')"
        >
          选择素材
        </button>
        <button
          class="text-action"
          type="button"
          @click="emit('request-export')"
        >
          导出项目
        </button>
        <button
          class="help-action"
          type="button"
          aria-label="打开项目说明"
          @click="emit('request-help')"
        >
          ?
        </button>
      </div>
    </header>

    <aside class="navigation-panel" aria-label="项目导航">
      <section class="nav-section">
        <div class="section-heading">
          <h2>根节点</h2>
          <span>{{ String(store.rootNodes.length).padStart(2, "0") }}</span>
        </div>
        <button
          v-for="node in store.rootNodes"
          :key="node.id"
          class="nav-row nav-row--root"
          :class="{ 'is-active': store.selectedNodeId === node.id }"
          type="button"
          @click="store.selectNode(node.id)"
        >
          <span class="nav-index">01</span>
          <span class="nav-copy">
            <strong>{{ node.title }}</strong>
            <small>{{ store.childNodes.length }} linked notes</small>
          </span>
        </button>
      </section>

      <section class="nav-section nav-section--grow">
        <div class="section-heading">
          <h2>素材库</h2>
          <span>{{ String(store.assets.length).padStart(2, "0") }}</span>
        </div>
        <button
          v-for="asset in store.assets"
          :key="asset.id"
          class="nav-row"
          :class="{ 'is-active': store.activeAssetId === asset.id }"
          type="button"
          @click="store.selectAsset(asset.id)"
        >
          <span class="asset-swatch" :data-group="asset.group"></span>
          <span class="nav-copy">
            <strong>{{ asset.label }}</strong>
            <small>{{ asset.group }} · {{ asset.meta }}</small>
          </span>
        </button>
      </section>

      <footer class="library-note">
        <span>LIBRARY</span>
        <p>
          托管素材按 SHA-256 去重，项目只保存引用；素材源文件导出将在 M2 提供。
        </p>
      </footer>
    </aside>

    <section class="canvas-stage" aria-label="无限画布">
      <div class="canvas-caption" aria-hidden="true">
        <span>BOARD 01</span>
        <span>CHARACTER / SHOOT PLANNING</span>
      </div>
      <slot
        name="canvas"
        :nodes="store.nodes"
        :selected-node-id="store.selectedNodeId"
        :viewport="store.viewport"
        :viewport-reset-revision="store.viewportResetRevision"
        :select-node="store.selectNode"
        :move-node="store.moveNode"
        :set-viewport="store.setViewport"
        :set-pointer="store.setPointer"
      >
        <div class="canvas-fallback">
          <p>CANVAS ADAPTER MISSING</p>
          <span>请在桌面入口注入画布实现。</span>
        </div>
      </slot>
      <div class="canvas-legend" aria-hidden="true">
        <span><i class="legend-rule legend-rule--solid"></i> 主关系</span>
        <span><i class="legend-rule legend-rule--dash"></i> 参考关系</span>
        <span>SPACE + DRAG / PAN</span>
      </div>
    </section>

    <aside class="inspector-panel" aria-label="节点检查器">
      <template v-if="store.selectedNode">
        <div class="inspector-heading">
          <div>
            <p>{{ store.selectedNode.kicker }}</p>
            <h2>节点检查器</h2>
          </div>
          <span class="status-stamp">{{ store.selectedNode.status }}</span>
        </div>

        <div class="inspector-preview">
          <span class="preview-number"
            >0{{ store.nodes.indexOf(store.selectedNode) + 1 }}</span
          >
          <div>
            <p>{{ store.selectedNode.kind }}</p>
            <strong>{{ store.selectedNode.title }}</strong>
          </div>
        </div>

        <label class="field-block">
          <span>标题</span>
          <input v-model="selectedTitle" type="text" />
        </label>

        <label class="field-block">
          <span>说明</span>
          <textarea v-model="selectedSummary" rows="5"></textarea>
        </label>

        <label class="field-block">
          <span>状态</span>
          <select v-model="selectedStatus">
            <option value="draft">DRAFT / 草稿</option>
            <option value="ready">READY / 可执行</option>
            <option value="locked">LOCKED / 已锁定</option>
          </select>
        </label>

        <dl class="node-metrics">
          <div>
            <dt>POSITION</dt>
            <dd>{{ store.selectedNode.x }}, {{ store.selectedNode.y }}</dd>
          </div>
          <div>
            <dt>SIZE</dt>
            <dd>
              {{ store.selectedNode.width }} × {{ store.selectedNode.height }}
            </dd>
          </div>
          <div>
            <dt>ID</dt>
            <dd>{{ store.selectedNode.id }}</dd>
          </div>
        </dl>
      </template>
      <div v-else class="empty-inspector">
        <p>NO SELECTION</p>
        <span>在画布上选择一个节点。</span>
      </div>
    </aside>

    <footer class="status-bar">
      <div class="status-primary">
        <span class="status-dot" aria-hidden="true"></span>
        <span>{{ store.platformMessage }}</span>
      </div>
      <div class="status-readout">
        <span>X {{ store.pointer.x }}</span>
        <span>Y {{ store.pointer.y }}</span>
        <span>{{ Math.round(store.viewport.zoom * 100) }}%</span>
        <span>{{ store.nodes.length }} NODES</span>
      </div>
    </footer>
  </main>
</template>
