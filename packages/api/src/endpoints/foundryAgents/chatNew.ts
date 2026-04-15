import { AIProjectClient } from '@azure/ai-projects';

import { getFoundryProjectEndpoint, getFoundryTokenCredential } from './initialize';
import type { FoundryAgentUsage } from './chat';

export type NewFoundryAgentChatParams = {
  text: string;
  assistantId: string;
  threadId?: string | null;
  instructions?: string | null;
};

export type NewFoundryAgentChatResult = {
  runId: string;
  model: string;
  threadId: string;
  assistantId: string;
  responseText: string;
  usage: FoundryAgentUsage | null;
};

function extractAgentName(assistantId: string): string {
  return assistantId.split(':')[0];
}

export async function chatWithNewFoundryAgent({
  text,
  assistantId,
  threadId,
  instructions,
}: NewFoundryAgentChatParams): Promise<NewFoundryAgentChatResult> {
  if (!assistantId?.trim()) {
    throw new Error('Missing assistant_id');
  }

  if (!text?.trim()) {
    throw new Error('New Foundry Agents requires a text prompt.');
  }

  const endpoint = getFoundryProjectEndpoint();

  if (!endpoint) {
    throw new Error(
      'Foundry Agents is not configured. Set AZURE_FOUNDRY_PROJECT_ENDPOINT or AZURE_AI_PROJECT_ENDPOINT.',
    );
  }

  const agentName = extractAgentName(assistantId);
  const projectClient = new AIProjectClient(endpoint, getFoundryTokenCredential());
  const openai = projectClient.getOpenAIClient();

  const response = await openai.responses.create({
    model: agentName,
    input: text,
    ...(instructions?.trim() ? { instructions: instructions.trim() } : {}),
    ...(threadId?.trim() ? { previous_response_id: threadId.trim() } : {}),
  });

  const responseText = response.output_text;

  if (!responseText?.trim()) {
    throw new Error('New Foundry agent completed without returning text.');
  }

  return {
    runId: response.id,
    model: response.model,
    threadId: response.id,
    assistantId,
    responseText,
    usage: response.usage
      ? {
          totalTokens: response.usage.total_tokens,
          promptTokens: response.usage.input_tokens,
          completionTokens: response.usage.output_tokens,
        }
      : null,
  };
}
