// OpenAI key priority:
// 1) OPENAI_BSM_KEY (primary platform key)
// 2) OPENAI_BSU_KEY (fallback key when BSM is unavailable)
export const models = {
  openai: {
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
