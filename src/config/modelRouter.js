import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import logger from '../utils/logger.js';
export class MultiModelRouter {
constructor() {
this.clients = {
openai: new OpenAI({ apiKey: process.env.OPENAI_BSM_KEY }),
anthropic: new Anthropic({ apiKey: process.env.ANTHROPIC_KEY }),
google: new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY),
perplexity: new OpenAI({
apiKey: process.env.PERPLEXITY_KEY,
baseURL: 'https://api.perplexity.ai'
})
};
this.modelMapping = {
  'gpt-4': { provider: 'openai', model: 'gpt-4' },
  'gpt-4o': { provider: 'openai', model: 'gpt-4o' },
  'claude-3-opus': { provider: 'anthropic', model: 'claude-3-opus-20240229' },
  'claude-3-sonnet': { provider: 'anthropic', model: 'claude-3-sonnet-20240229' },
  'gemini-pro': { provider: 'google', model: 'gemini-pro' },
  'perplexity': { provider: 'perplexity', model: 'llama-3.1-sonar-large-128k-online' }
};

}
async execute(prompt, options = {}) {
const { task, complexity, requiresSearch } = options;
const modelName = this.selectModel(task, complexity, requiresSearch);
const config = this.modelMapping[modelName];

logger.info({ model: modelName, task }, 'Executing model');

try {
  const result = await this.callProvider(config.provider, config.model, prompt, options);
  return { ...result, modelUsed: modelName };
} catch (error) {
  logger.error({ model: modelName, error }, 'Model failed, trying fallback');
  return this.executeWithFallback(prompt, options, modelName);
}

}
selectModel(task, complexity, requiresSearch) {
if (requiresSearch) return 'perplexity';
const models = {
  'code_review': {
    critical: 'claude-3-opus',
    high: 'gpt-4o',
    medium: 'claude-3-sonnet'
  },
  'security_scan': {
    critical: 'gpt-4',
    high: 'perplexity',
    medium: 'claude-3-sonnet'
  }
};

return models[task]?.[complexity] || 'gpt-4o';

}
async callProvider(provider, model, prompt, options) {
switch (provider) {
case 'openai':
return this.callOpenAI(model, prompt);
case 'anthropic':
return this.callAnthropic(model, prompt);
case 'google':
return this.callGoogle(model, prompt);
case 'perplexity':
return this.callPerplexity(model, prompt);
default:
throw new Error(Unknown provider: ${provider});
}
}
async callOpenAI(model, prompt) {
const res = await this.clients.openai.chat.completions.create({
model,
messages: [
{ role: 'system', content: prompt.system },
{ role: 'user', content: prompt.user }
],
temperature: 0.2
});
return { output: res.choices[0].message.content, usage: res.usage };
}
async callAnthropic(model, prompt) {
const res = await this.clients.anthropic.messages.create({
model,
max_tokens: 4000,
system: prompt.system,
messages: [{ role: 'user', content: prompt.user }]
});
return { output: res.content[0].text, usage: res.usage };
}
async callGoogle(model, prompt) {
const genModel = this.clients.google.getGenerativeModel({ model });
const res = await genModel.generateContent({
contents: [{ role: 'user', parts: [{ text: ${prompt.system}\n\n${prompt.user} }] }]
});
return { output: res.response.text(), usage: {} };
}
async callPerplexity(model, prompt) {
const res = await this.clients.perplexity.chat.completions.create({
model,
messages: [
{ role: 'system', content: prompt.system },
{ role: 'user', content: prompt.user }
],
return_citations: true
});
return {
output: res.choices[0].message.content,
usage: res.usage,
citations: res.citations
};
}
async executeWithFallback(prompt, options, failedModel) {
const fallbacks = {
'perplexity': 'gemini-pro',
'claude-3-opus': 'gpt-4',
'gpt-4': 'claude-3-sonnet'
};
const fallbackModel = fallbacks[failedModel] || 'gpt-4o';
const config = this.modelMapping[fallbackModel];

const result = await this.callProvider(config.provider, config.model, prompt, options);
return { ...result, modelUsed: `${fallbackModel} (fallback)` };

}
}
export const modelRouter = new MultiModelRouter();
