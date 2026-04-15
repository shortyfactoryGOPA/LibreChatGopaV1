import { AIProjectClient } from '@azure/ai-projects';
import { logger } from '@librechat/data-schemas';

import type { Assistant, AssistantListResponse } from 'librechat-data-provider';

import { getFoundryProjectEndpoint, getFoundryTokenCredential } from './initialize';

type AgentObject = {
  id: string;
  name: string;
  object: string;
  versions: {
    latest: {
      id: string;
      name: string;
      version: number;
      description?: string | null;
      created_at: Date;
      metadata?: Record<string, unknown> | null;
      definition?: {
        model?: string;
        instructions?: string | null;
        kind?: string;
      } | null;
    };
  };
};

function mapAgentObjectToAssistant(agent: AgentObject): Assistant {
  const latest = agent.versions.latest;
  return {
    id: latest.id,
    object: 'assistant',
    name: agent.name,
    model: latest.definition?.model ?? '',
    description: latest.description ?? null,
    instructions: latest.definition?.instructions ?? null,
    created_at: Math.floor(latest.created_at.getTime() / 1000),
    metadata: (latest.metadata as Record<string, string>) ?? null,
    tools: [],
  };
}

export async function listNewFoundryAgents(): Promise<AssistantListResponse> {
  const endpoint = getFoundryProjectEndpoint();

  if (!endpoint) {
    throw new Error(
      'Foundry Agents is not configured. Set AZURE_FOUNDRY_PROJECT_ENDPOINT or AZURE_AI_PROJECT_ENDPOINT.',
    );
  }

  const client = new AIProjectClient(endpoint, getFoundryTokenCredential());
  const agents: Assistant[] = [];

  try {
    for await (const agent of client.agents.list()) {
      agents.push(mapAgentObjectToAssistant(agent as unknown as AgentObject));
    }
  } catch (error: unknown) {
    logger.error('[listNewFoundryAgents] Failed to list new Foundry agents', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }

  return {
    object: 'list',
    data: agents,
    has_more: false,
    first_id: agents[0]?.id ?? '',
    last_id: agents[agents.length - 1]?.id ?? '',
  };
}
