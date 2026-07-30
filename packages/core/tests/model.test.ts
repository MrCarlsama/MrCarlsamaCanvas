import { describe, expect, it } from "vitest";

import {
  EXPANSION_EDGE_TYPE,
  createCanvasDocument,
  createFrame,
  createSavedView,
  deriveRootNodeIds,
  validateCanvasDocument,
  type CanvasDocument,
  type CanvasNode,
} from "../src";

const node = (id: string, type = "example"): CanvasNode => ({
  id,
  type,
  content: { id },
  position: { x: 0, y: 0 },
});

describe("CanvasDocument", () => {
  it("starts as the project's single empty document", () => {
    const document = createCanvasDocument({
      id: "canvas-1",
      projectId: "project-1",
      now: "2026-07-30T00:00:00.000Z",
    });

    expect(document.projectId).toBe("project-1");
    expect(document.nodes).toEqual([]);
    expect(document.savedViews).toEqual([]);
    expect(validateCanvasDocument(document)).toEqual({
      valid: true,
      issues: [],
    });
  });

  it("allows multiple expansion roots", () => {
    const document: CanvasDocument = {
      ...createCanvasDocument({
        id: "canvas-1",
        projectId: "project-1",
        now: "2026-07-30T00:00:00.000Z",
      }),
      nodes: [node("root-a"), node("child"), node("root-b")],
      edges: [
        {
          id: "expand-a",
          type: EXPANSION_EDGE_TYPE,
          source: "root-a",
          target: "child",
        },
        {
          id: "reference",
          type: "reference",
          source: "child",
          target: "root-b",
        },
      ],
    };

    expect(deriveRootNodeIds(document)).toEqual(["root-a", "root-b"]);
    expect(validateCanvasDocument(document).valid).toBe(true);
  });

  it("supports frames and saved views without closing the node model", () => {
    const frame = createFrame({
      id: "frame-1",
      title: "Opening",
      position: { x: 10, y: 20 },
      size: { width: 640, height: 480 },
    });
    const view = createSavedView({
      id: "view-1",
      name: "Overview",
      center: { x: 320, y: 240 },
      zoom: 0.75,
      focusedFrameIds: [frame.id],
    });

    expect(frame.title).toBe("Opening");
    expect(view.focusedFrameIds).toEqual([frame.id]);
    expect(view.viewport.zoom).toBe(0.75);
  });

  it("reports duplicate IDs and missing references through one validator", () => {
    const document: CanvasDocument = {
      ...createCanvasDocument({
        id: "canvas-1",
        projectId: "project-1",
        now: "2026-07-30T00:00:00.000Z",
      }),
      nodes: [node("node-1"), node("node-1")],
      edges: [
        {
          id: "edge-1",
          type: "reference",
          source: "node-1",
          target: "missing-node",
        },
        {
          id: "edge-1",
          type: "reference",
          source: "node-1",
          target: "node-1",
        },
      ],
      frames: [
        createFrame({
          id: "frame-1",
          title: "Frame",
          position: { x: 0, y: 0 },
          size: { width: 100, height: 100 },
        }),
      ],
      frameMembers: [
        { frameId: "missing-frame", nodeId: "node-1" },
        { frameId: "frame-1", nodeId: "missing-node" },
      ],
      savedViews: [
        createSavedView({
          id: "view-1",
          name: "Broken view",
          center: { x: 0, y: 0 },
          zoom: 1,
          focusedNodeIds: ["missing-node"],
          focusedFrameIds: ["missing-frame"],
        }),
      ],
    };

    const result = validateCanvasDocument(document);

    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(["DUPLICATE_ID", "MISSING_REFERENCE"]),
    );
    expect(
      result.issues.some(
        (issue) =>
          issue.path === "savedViews[0].focusedNodeIds[0]" &&
          issue.code === "MISSING_REFERENCE",
      ),
    ).toBe(true);
  });

  it("limits a node to one persisted frame membership", () => {
    const document: CanvasDocument = {
      ...createCanvasDocument({
        id: "canvas-1",
        projectId: "project-1",
        now: "2026-07-30T00:00:00.000Z",
      }),
      nodes: [node("node-1")],
      frames: [
        createFrame({
          id: "frame-1",
          title: "Frame 1",
          position: { x: 0, y: 0 },
          size: { width: 100, height: 100 },
        }),
        createFrame({
          id: "frame-2",
          title: "Frame 2",
          position: { x: 100, y: 0 },
          size: { width: 100, height: 100 },
        }),
      ],
      frameMembers: [
        { frameId: "frame-1", nodeId: "node-1" },
        { frameId: "frame-2", nodeId: "node-1" },
      ],
    };

    expect(validateCanvasDocument(document).issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "NODE_IN_MULTIPLE_FRAMES" }),
      ]),
    );
  });

  it("rejects duplicate expansion parents", () => {
    const document: CanvasDocument = {
      ...createCanvasDocument({
        id: "canvas-1",
        projectId: "project-1",
        now: "2026-07-30T00:00:00.000Z",
      }),
      nodes: [node("root-a"), node("root-b"), node("child")],
      edges: [
        {
          id: "expand-a",
          type: EXPANSION_EDGE_TYPE,
          source: "root-a",
          target: "child",
        },
        {
          id: "expand-b",
          type: EXPANSION_EDGE_TYPE,
          source: "root-b",
          target: "child",
        },
      ],
    };

    expect(validateCanvasDocument(document).issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "EXPANSION_MULTIPLE_PARENTS" }),
      ]),
    );
  });

  it("rejects expansion cycles and requires a root for non-empty canvases", () => {
    const document: CanvasDocument = {
      ...createCanvasDocument({
        id: "canvas-1",
        projectId: "project-1",
        now: "2026-07-30T00:00:00.000Z",
      }),
      nodes: [node("node-a"), node("node-b")],
      edges: [
        {
          id: "expand-a",
          type: EXPANSION_EDGE_TYPE,
          source: "node-a",
          target: "node-b",
        },
        {
          id: "expand-b",
          type: EXPANSION_EDGE_TYPE,
          source: "node-b",
          target: "node-a",
        },
      ],
    };

    const issueCodes = validateCanvasDocument(document).issues.map(
      (issue) => issue.code,
    );

    expect(issueCodes).toContain("EXPANSION_CYCLE");
    expect(issueCodes).toContain("MISSING_ROOT");
  });

  it("does not apply tree restrictions to non-expansion relationships", () => {
    const document: CanvasDocument = {
      ...createCanvasDocument({
        id: "canvas-1",
        projectId: "project-1",
        now: "2026-07-30T00:00:00.000Z",
      }),
      nodes: [node("node-a"), node("node-b")],
      edges: [
        {
          id: "reference-a",
          type: "reference",
          source: "node-a",
          target: "node-b",
        },
        {
          id: "reference-b",
          type: "reference",
          source: "node-b",
          target: "node-a",
        },
      ],
    };

    expect(validateCanvasDocument(document)).toEqual({
      valid: true,
      issues: [],
    });
  });
});
