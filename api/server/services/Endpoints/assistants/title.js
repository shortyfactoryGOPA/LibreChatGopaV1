const { AIProjectClient } = require('@azure/ai-projects');
const { isEnabled, sanitizeTitle, getFoundryProjectEndpoint, getFoundryTokenCredential } = require('@librechat/api');
const { logger } = require('@librechat/data-schemas');
const { CacheKeys, AzureAssistantsNewEndpoint, AzureNewFoundryAssistantsEndpoint } = require('librechat-data-provider');
const getLogStores = require('~/cache/getLogStores');
const initializeClient = require('./initalize');
const { saveConvo } = require('~/models');

const buildTitlePrompt = (text, responseText) =>
  `Please generate a concise title (max 40 characters) for a conversation that starts with:\nUser: ${text}\nAssistant: ${responseText}\n\nTitle:`;

/**
 * Generates a conversation title using an OpenAI-compatible chat completions client.
 * @param {Object} params
 * @param {import('openai')} params.openai
 * @param {string} params.text
 * @param {string} params.responseText
 * @param {string} [params.model]
 * @returns {Promise<string>}
 */
const generateTitle = async ({ openai, text, responseText, model = 'gpt-3.5-turbo' }) => {
  const completion = await openai.chat.completions.create({
    model,
    messages: [{ role: 'user', content: buildTitlePrompt(text, responseText) }],
    temperature: 0.7,
    max_tokens: 20,
  });

  const title = completion.choices[0]?.message?.content?.trim() || 'New conversation';
  return sanitizeTitle(title);
};

/**
 * Generates a conversation title using the Foundry Responses API.
 * @param {Object} params
 * @param {import('openai')} params.openai
 * @param {string} params.text
 * @param {string} params.responseText
 * @param {string} params.model
 * @returns {Promise<string>}
 */
const generateTitleWithResponses = async ({ openai, text, responseText, model }) => {
  const response = await openai.responses.create({
    model,
    input: buildTitlePrompt(text, responseText),
  });

  const title = response.output_text?.trim() || 'New conversation';
  return sanitizeTitle(title);
};

/**
 * Adds a title to a conversation asynchronously.
 * For Foundry endpoints, uses the Responses API directly (skips initializeClient).
 * @param {ServerRequest} req
 * @param {Object} params
 * @param {string} params.text
 * @param {string} params.responseText
 * @param {string} params.conversationId
 * @param {string} [params.model] - Agent model deployment name (used for Foundry endpoints)
 * @param {string} [params.endpoint] - Endpoint type to select title generation strategy
 */
const addTitle = async (req, { text, responseText, conversationId, model: agentModel, endpoint }) => {
  const { TITLE_CONVO = 'true' } = process.env ?? {};
  if (!isEnabled(TITLE_CONVO)) {
    return;
  }

  if (req?.body?.isTemporary) {
    return;
  }

  const titleCache = getLogStores(CacheKeys.GEN_TITLE);
  const key = `${req.user.id}-${conversationId}`;

  const saveTitle = async (title) => {
    await titleCache.set(key, title, 120000);
    await saveConvo(
      {
        userId: req?.user?.id,
        isTemporary: req?.body?.isTemporary,
        interfaceConfig: req?.config?.interfaceConfig,
      },
      { conversationId, title },
      { context: 'api/server/services/Endpoints/assistants/title.js', noUpsert: true },
    );
  };

  const isFoundryEndpoint =
    endpoint === AzureAssistantsNewEndpoint || endpoint === AzureNewFoundryAssistantsEndpoint;

  try {
    if (isFoundryEndpoint) {
      const foundryEndpoint = getFoundryProjectEndpoint();
      if (!foundryEndpoint || !agentModel) {
        throw new Error('No suitable client for Foundry title generation');
      }
      const projectClient = new AIProjectClient(foundryEndpoint, getFoundryTokenCredential());
      const openai = projectClient.getOpenAIClient();
      const title = await generateTitleWithResponses({ openai, text, responseText, model: agentModel });
      await saveTitle(title);
    } else {
      try {
        const { openai } = await initializeClient({ req });
        const title = await generateTitle({ openai, text, responseText });
        await saveTitle(title);
      } catch {
        const foundryEndpoint = getFoundryProjectEndpoint();
        if (!foundryEndpoint || !agentModel) {
          throw new Error('No suitable client for title generation');
        }
        const projectClient = new AIProjectClient(foundryEndpoint, getFoundryTokenCredential());
        const openai = projectClient.getOpenAIClient();
        const title = await generateTitleWithResponses({ openai, text, responseText, model: agentModel });
        await saveTitle(title);
      }
    }
  } catch (error) {
    logger.error('[addTitle] Error generating title:', error);
    const fallbackTitle = text.length > 40 ? text.substring(0, 37) + '...' : text;
    await saveTitle(fallbackTitle);
  }
};

module.exports = addTitle;
