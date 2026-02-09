import fetch from "node-fetch";
import { AppError } from "../utils/errors.js";

const DUCKDUCKGO_API = "https://api.duckduckgo.com/";
const DEFAULT_FALLBACK = "No relevant web search results were found.";

const hasValidText = (value) => typeof value === "string" && value.trim().length > 0;

const flattenRelatedTopics = (relatedTopics = []) => {
  if (!Array.isArray(relatedTopics)) return [];

  return relatedTopics.flatMap((item) => {
    if (!item || typeof item !== "object") return [];

    if (Array.isArray(item.Topics)) {
      return flattenRelatedTopics(item.Topics);
    }

    return [item];
  });
};

export const webSearchTool = async (query, { maxResults = 5 } = {}) => {
  if (!hasValidText(query)) {
    throw new AppError("Search query is required", 400, "SEARCH_QUERY_REQUIRED");
  }

  try {
    const url = new URL(DUCKDUCKGO_API);
    url.searchParams.set("q", query.trim());
    url.searchParams.set("format", "json");
    url.searchParams.set("no_html", "1");
    url.searchParams.set("no_redirect", "1");

    const response = await fetch(url);
    if (!response.ok) {
      throw new AppError("Web search request failed", 502, "WEB_SEARCH_FAILED");
    }

    const payload = await response.json();
    const topics = flattenRelatedTopics(payload?.RelatedTopics);

    const results = topics
      .filter((item) => hasValidText(item?.Text))
      .map((item) => ({
        text: item.Text.trim(),
        url: hasValidText(item?.FirstURL) ? item.FirstURL.trim() : null
      }))
      .slice(0, maxResults);

    if (results.length === 0) {
      return {
        results: [],
        fallback: DEFAULT_FALLBACK
      };
    }

    return {
      results,
      fallback: null
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError("Web search is currently unavailable", 502, "WEB_SEARCH_UNAVAILABLE");
  }
};

export const webSearchFallbackMessage = DEFAULT_FALLBACK;
