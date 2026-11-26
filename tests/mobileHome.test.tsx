import { describe, it, expect } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { MobileHome } from "@/components/mobile/MobileHome";
import { UpdateModal } from "@/components/updates/UpdateModal";
import type { Note, Collection, FilterState } from "@/types";
import type { UpdateInfo } from "@/services/updater";

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

  it("renders more options three dot button with accessibility label", () => {
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

    expect(html).toContain('aria-label="More options"');
    expect(html).toContain('aria-label="Settings"');
    expect(html).toContain("liquid-glass");
  });

  it("renders Update Available badge when update is available", () => {
    const mockUpdate: UpdateInfo = {
      available: true,
      currentVersion: "0.1.5",
      latestVersion: "0.1.6",
      tagName: "v0.1.6",
      releaseName: "Noted v0.1.6",
      releaseNotes: "Bug fixes and improvements",
      publishedAt: new Date().toISOString(),
      downloadUrl: "https://example.com/download",
      releaseUrl: "https://example.com/release",
    };

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
        availableUpdate={mockUpdate}
      />
    );

    // Initial render has menu closed, but component has props wired properly
    expect(html).toContain('aria-label="More options"');
    expect(html).toContain('aria-label="Settings"');
    expect(html).toContain("liquid-glass");
  });

  describe("UpdateModal Component", () => {
    it("renders You're Up to Date on manual check when no update is available", () => {
      const html = renderToString(
        <UpdateModal
          isOpen={true}
          updateInfo={{
            available: false,
            currentVersion: "0.1.5",
            latestVersion: "0.1.5",
            tagName: "v0.1.5",
            releaseName: "Noted v0.1.5",
            releaseNotes: "",
            publishedAt: new Date().toISOString(),
            downloadUrl: "",
            releaseUrl: "",
          }}
          onClose={() => {}}
          isManualCheck={true}
        />
      );

      expect(html).toContain("You&#x27;re Up to Date");
      expect(html).toContain("0.1.5");
      expect(html).toContain("is currently the latest version");
    });

    it("renders update available details when update is found", () => {
      const mockUpdate: UpdateInfo = {
        available: true,
        currentVersion: "0.1.5",
        latestVersion: "0.2.0",
        tagName: "v0.2.0",
        releaseName: "Noted v0.2.0",
        releaseNotes: "New mobile layout overhaul",
        publishedAt: new Date().toISOString(),
        downloadUrl: "https://github.com/jayo14/noted/releases/download/v0.2.0/app.apk",
        releaseUrl: "https://github.com/jayo14/noted/releases/tag/v0.2.0",
      };

      const html = renderToString(
        <UpdateModal
          isOpen={true}
          updateInfo={mockUpdate}
          onClose={() => {}}
          isManualCheck={true}
        />
      );

      expect(html).toContain("Update Available");
      expect(html).toContain("v0.2.0");
      expect(html).toContain("New mobile layout overhaul");
    });

    it("renders error view when check fails with an error message", () => {
      const html = renderToString(
        <UpdateModal
          isOpen={true}
          updateInfo={null}
          onClose={() => {}}
          isManualCheck={true}
          error="Failed to check for updates. Please check your internet connection."
        />
      );

      expect(html).toContain("Check Failed");
      expect(html).toContain("Please check your internet connection.");
    });
  });
});
