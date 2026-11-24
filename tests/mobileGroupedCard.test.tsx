import { describe, it, expect } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { MobileGroupedCard } from "@/components/mobile/MobileGroupedCard";
import type { Note, Collection } from "@/types";

describe("MobileGroupedCard Component", () => {
  const mockNotes: Note[] = [
    {
      id: "note-1",
      user_id: "u1",
      title: "Academic GEM — 19th Nov. 2026",
      content: {
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "text", text: "No One Succeed Alone" }] },
        ],
      },
      collection_id: "col-1",
      is_pinned: false,
      created_at: "2026-11-19T10:00:00Z",
      updated_at: "2026-11-19T10:00:00Z",
      deleted_at: null,
      local_revision: 1,
      sync_revision: 1,
    },
    {
      id: "note-2",
      user_id: "u1",
      title: "Todo - 19th Nov. 2026",
      content: {
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "text", text: "Prepare slides for Academic..." }] },
        ],
      },
      collection_id: null,
      is_pinned: false,
      created_at: "2026-11-19T11:00:00Z",
      updated_at: "2026-11-19T11:00:00Z",
      deleted_at: null,
      local_revision: 1,
      sync_revision: 1,
    },
  ];

  const mockCollections: Collection[] = [
    {
      id: "col-1",
      user_id: "u1",
      name: "Projects",
      color: "#f5a623",
      icon: "folder",
      created_at: "2026-11-01T00:00:00Z",
      updated_at: "2026-11-01T00:00:00Z",
      deleted_at: null,
      local_revision: 1,
      sync_revision: 1,
    },
  ];

  it("renders note titles, snippets, collections, and hairline dividers", () => {
    const html = renderToString(
      <MobileGroupedCard
        notes={mockNotes}
        collections={mockCollections}
        onSelectNote={() => {}}
      />
    );

    expect(html).toContain("Academic GEM — 19th Nov. 2026");
    expect(html).toContain("No One Succeed Alone");
    expect(html).toContain("Projects");

    expect(html).toContain("Todo - 19th Nov. 2026");
    expect(html).toContain("Prepare slides for Academic...");
    // Fallback collection name is Notes
    expect(html).toContain("Notes");

    // Rounded container and hairline divider
    expect(html).toContain("rounded-[22px]");
    expect(html).toContain("border-b border-black/[0.06]");

    // Smart context-aware icons rendered
    expect(html).toContain("Task list note");
    expect(html).toContain("<svg");
  });

  it("handles null/empty notes list gracefully", () => {
    const html = renderToString(
      <MobileGroupedCard
        notes={[]}
        collections={[]}
        onSelectNote={() => {}}
      />
    );

    expect(html).toBe("");
  });
});
