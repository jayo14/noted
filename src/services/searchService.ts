import type { Note, FilterState } from "@/types";
import { extractTextFromJSONContent } from "@/lib/utils";

export interface SearchResult {
  note: Note;
  matchScore: number;
  snippet?: string;
}

export class SearchService {
  private static instance: SearchService;

  public static getInstance(): SearchService {
    if (!SearchService.instance) {
      SearchService.instance = new SearchService();
    }
    return SearchService.instance;
  }

  public filterNotes(notes: Note[], filter: FilterState): SearchResult[] {
    const { section, collectionId, searchQuery } = filter;

    // 1. Filter by section / collection
    let scopedNotes: Note[] = [];

    if (section === "trash") {
      scopedNotes = notes.filter((n) => n.deleted_at !== null);
    } else {
      // Normal active notes (not deleted)
      const activeNotes = notes.filter((n) => n.deleted_at === null);

      if (section === "all") {
        scopedNotes = activeNotes;
      } else if (section === "pinned") {
        scopedNotes = activeNotes.filter((n) => n.is_pinned);
      } else if (section === "collection" && collectionId) {
        scopedNotes = activeNotes.filter((n) => n.collection_id === collectionId);
      } else {
        scopedNotes = activeNotes;
      }
    }

    // 2. If no search query, return sorted by pinned status and updated_at
    const trimmedQuery = searchQuery.trim().toLowerCase();
    if (!trimmedQuery) {
      return scopedNotes
        .sort((a, b) => {
          if (section !== "trash") {
            if (a.is_pinned !== b.is_pinned) {
              return a.is_pinned ? -1 : 1;
            }
          }
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        })
        .map((note) => ({ note, matchScore: 0 }));
    }

    // 3. Search query matching
    const results: SearchResult[] = [];
    const queryTerms = trimmedQuery.split(/\s+/).filter((t) => t.length > 0);

    for (const note of scopedNotes) {
      const titleLower = note.title.toLowerCase();
      const bodyText = extractTextFromJSONContent(note.content);
      const bodyLower = bodyText.toLowerCase();

      let score = 0;
      let matchedInTitle = false;
      let matchedInBody = false;

      // Title exact or terms match
      if (titleLower === trimmedQuery) {
        score += 100;
        matchedInTitle = true;
      } else if (titleLower.includes(trimmedQuery)) {
        score += 50;
        matchedInTitle = true;
      } else {
        const titleMatchCount = queryTerms.filter((term) => titleLower.includes(term)).length;
        if (titleMatchCount > 0) {
          score += titleMatchCount * 15;
          matchedInTitle = true;
        }
      }

      // Body terms match
      if (bodyLower.includes(trimmedQuery)) {
        score += 30;
        matchedInBody = true;
      } else {
        const bodyMatchCount = queryTerms.filter((term) => bodyLower.includes(term)).length;
        if (bodyMatchCount > 0) {
          score += bodyMatchCount * 5;
          matchedInBody = true;
        }
      }

      if (matchedInTitle || matchedInBody) {
        // Boost pinned notes slightly
        if (note.is_pinned) score += 5;

        // Generate context snippet
        let snippet = "";
        const idx = bodyLower.indexOf(trimmedQuery);
        if (idx !== -1) {
          const start = Math.max(0, idx - 40);
          const end = Math.min(bodyText.length, idx + trimmedQuery.length + 60);
          snippet = (start > 0 ? "..." : "") + bodyText.slice(start, end).trim() + (end < bodyText.length ? "..." : "");
        }

        results.push({
          note,
          matchScore: score,
          snippet: snippet || undefined,
        });
      }
    }

    // Sort results by match score descending, then updated_at
    results.sort((a, b) => {
      if (b.matchScore !== a.matchScore) {
        return b.matchScore - a.matchScore;
      }
      return new Date(b.note.updated_at).getTime() - new Date(a.note.updated_at).getTime();
    });

    return results;
  }
}

export const searchService = SearchService.getInstance();
