import { modelRouter } from "../config/modelRouter.js";

export async function getLatestGovernanceStandards(industry) {
  const result = await modelRouter.execute(
    {
      user: `What are the latest governance standards for ${industry} in 2024-2025?`
    },
    {
      task: "chat_response",
      complexity: "high",
      requiresSearch: true,
      searchQuery: `ISO 27001 SOC2 governance standards ${industry} latest updates 2024 2025`
    }
  );

  return {
    standards: result.output,
    officialSources: result.citations || [],
    effectiveDate: new Date().toISOString()
  };
}
