export const models = {
  openai: {
    // Priority: OPENAI_BSM_KEY is the primary key; OPENAI_BSU_KEY is fallback-only when BSM is unavailable.
    bsm: process.env.OPENAI_BSM_KEY,
    bsu: process.env.OPENAI_BSU_KEY,
    brinder: process.env.OPENAI_BRINDER_KEY,
    lexnexus: process.env.OPENAI_LEXNEXUS_KEY,
    default: process.env.OPENAI_BSM_KEY || process.env.OPENAI_BSU_KEY
  },
  perplexity: {
    default: process.env.PERPLEXITY_KEY
  }
};
