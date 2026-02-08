import { modelRouter } from "../config/modelRouter.js";

export async function legalResearch(query, jurisdiction = "global") {
  const result = await modelRouter.execute(
    {
      user: `ابحث عن: ${query}\nالاختصاص القضائي: ${jurisdiction}\nتاريخ اليوم: ${new Date().toISOString()}`
    },
    {
      task: "legal_analysis",
      complexity: "critical",
      requiresSearch: true,
      searchQuery: `latest laws and regulations about ${query} in ${jurisdiction} 2024 2025`
    }
  );

  return {
    answer: result.output,
    sources: result.citations || [],
    verifiedDate: result.timestamp
  };
}
