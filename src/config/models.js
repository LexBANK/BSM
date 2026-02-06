export const models = {
  openai: {
    bsm: process.env.OPENAI_BSM_KEY,
    brinder: process.env.OPENAI_BRINDER_KEY,
    lexnexus: process.env.OPENAI_LEXNEXUS_KEY,
    default: process.env.OPENAI_BSM_KEY
  },
  github: {
    token: process.env.GITHUB_TOKEN,
    model: process.env.GITHUB_MODELS_MODEL || "gpt-4o"
  }
};
