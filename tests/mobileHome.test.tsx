import { describe, it, expect } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { MobileHome } from "@/components/mobile/MobileHome";
import type { Note, Collection, FilterState } from "@/types";

describe("MobileHome Component", () => {
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
      collection_id: null,
      is_pinned: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
      local_revision: 1,
      sync_revision: 1,
    },
  ];

  const mockCollections: Collection[] = [];
  const mockFilter: FilterState = { section: "all", collectionId: null };

  it("renders large Notes title and dynamic note count", () => {
    const html = renderToString(
      <MobileHome
        notes={mockNotes}
        collections={mockCollections}
        filter={mockFilter}
        onSelectNote={() => {}}
        onCreateNote={() => {}}
        onFilterSection={() => {}}
        onOpenSettings={() => {}}
        onOpenCollections={() => {}}
        activeTab="home"
        onChangeTab={() => {}}
      />
    );

    expect(html).toContain("Notes");
    expect(html).toContain("1 Note");
    expect(html).toContain("Academic GEM — 19th Nov. 2026");
    expect(html).toContain("Search");
  });
});
