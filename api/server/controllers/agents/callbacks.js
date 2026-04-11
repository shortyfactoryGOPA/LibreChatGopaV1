const { nanoid } = require('nanoid');
const { logger } = require('@librechat/data-schemas');
const { Tools, StepTypes, FileContext, FileSources, ErrorTypes } = require('librechat-data-provider');
const {
  EnvVar,
  Constants,
  GraphEvents,
  GraphNodeKeys,
  ToolEndHandler,
} = require('@librechat/agents');
const {
  sendEvent,
  getBasePath,
  GenerationJobManager,
  writeAttachmentEvent,
  createToolExecuteHandler,
} = require('@librechat/api');
const { processFileCitations } = require('~/server/services/Files/Citations');
const { processCodeOutput } = require('~/server/services/Files/Code/process');
const { loadAuthValues } = require('~/server/services/Tools/credentials');
const { saveBase64Image } = require('~/server/services/Files/process');
const { createFile } = require('~/models');

const MIME_TO_EXT = {
  'text/csv': 'csv',
  'text/plain': 'txt',
  'text/html': 'html',
  'text/markdown': 'md',
  'application/json': 'json',
  'application/xml': 'xml',
  'application/pdf': 'pdf',
  'application/zip': 'zip',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.ms-powerpoint': 'ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
};

const EXT_TO_MIME = Object.fromEntries(Object.entries(MIME_TO_EXT).map(([k, v]) => [v, k]));

/**
 * Resolves the Azure OpenAI v1 base URL and API key from environment variables.
 * Supports both explicit AZURE_OPENAI_BASEURL and instance-name-based construction.
 * @returns {{ apiKey: string, baseURL: string } | null}
 */
function resolveAzureCredentials() {
  const apiKey = process.env.AZURE_OPENAI_API_KEY || process.env.AZURE_API_KEY || '';
  let baseURL = (process.env.AZURE_OPENAI_BASEURL || '').replace(/\/deployments(?:\/.*)?$/, '/v1');
  if (!baseURL) {
    const instanceName = process.env.AZURE_OPENAI_INSTANCE_NAME || '';
    if (instanceName) {
      baseURL = `https://${instanceName}.openai.azure.com/openai/v1`;
    }
  }
  if (!apiKey || !baseURL) {
    return null;
  }
  return { apiKey, baseURL };
}

/**
 * Lists files in an Azure Responses API container.
 * @param {string} container_id
 * @returns {Promise<Array<{id: string, path?: string, filename?: string}>>}
 */
async function fetchAzureContainerFiles(container_id) {
  const credentials = resolveAzureCredentials();
  if (!credentials) {
    logger.warn('[fetchAzureContainerFiles] Missing Azure credentials (AZURE_OPENAI_API_KEY / AZURE_OPENAI_INSTANCE_NAME)');
    return [];
  }
  const { apiKey, baseURL } = credentials;
  try {
    const url = `${baseURL}/containers/${container_id}/files?api-version=preview`;
    const response = await fetch(url, { headers: { 'api-key': apiKey } });
    if (!response.ok) {
      logger.warn(`[fetchAzureContainerFiles] Azure returned ${response.status} for container ${container_id}`);
      return [];
    }
    const json = await response.json();
    return json?.data ?? [];
  } catch (error) {
    logger.error('[fetchAzureContainerFiles] Error listing container files:', error);
    return [];
  }
}

/**
 * Processes native Azure Responses API code_interpreter file outputs.
 * Creates DB file records and emits attachment events for each generated file.
 * @param {Object} params
 * @param {ServerRequest} params.req
 * @param {ServerResponse} params.res
 * @param {string | null} params.streamId
 * @param {ArtifactPromises} params.artifactPromises
 * @param {Object} params.toolOutput - A code_interpreter_call tool output object
 * @param {Record<string, unknown>} params.metadata - Graph event metadata
 */
async function processNativeCodeInterpreterOutputs({
  req,
  res,
  streamId,
  artifactPromises,
  toolOutput,
  metadata,
}) {
  const { container_id, outputs, id: toolCallId } = toolOutput;
  if (!container_id || !outputs) {
    return;
  }

  const userId = req.user.id;
  const basePath = getBasePath();
  const messageId = metadata.run_id;
  const conversationId = metadata.thread_id;

  for (const output of outputs) {
    if (output.type !== 'files' || !output.files) {
      continue;
    }
    for (const fileInfo of output.files) {
      const { file_id, mime_type } = fileInfo;
      if (!file_id) {
        continue;
      }
      artifactPromises.push(
        (async () => {
          const ext = MIME_TO_EXT[mime_type] || '';
          const filename = ext ? `${file_id}.${ext}` : file_id;
          const filepath = `${basePath}/api/files/download/${userId}/${file_id}`;

          const fileRecord = {
            file_id,
            filename,
            filepath,
            object: 'file',
            type: mime_type || 'application/octet-stream',
            source: FileSources.azure_responses,
            context: FileContext.execute_code,
            bytes: 0,
            usage: 1,
            user: userId,
            conversationId,
            messageId,
            metadata: { container_id },
          };

          await createFile(fileRecord, true);

          const attachment = {
            ...fileRecord,
            messageId,
            toolCallId,
            conversationId,
          };

          writeAttachment(res, streamId, attachment);
          return fileRecord;
        })().catch((error) => {
          logger.error('[processNativeCodeInterpreterOutputs] Error saving file:', error);
          return null;
        }),
      );
    }
  }
}

/**
 * Extracts filenames referenced via `sandbox:` paths in the model's response text.
 * @param {unknown} textContent - The output content array from the AIMessage
 * @returns {Set<string>} Set of filenames (e.g. "report.xlsx")
 */
function extractSandboxFilenames(textContent) {
  const filenames = new Set();
  if (!Array.isArray(textContent)) {
    return filenames;
  }
  for (const part of textContent) {
    const text = part?.text ?? '';
    for (const match of text.matchAll(/sandbox:\/[^\)\s"']+/g)) {
      const filename = match[0].split('/').pop();
      if (filename) {
        filenames.add(filename);
      }
    }
  }
  return filenames;
}

/**
 * Fallback handler for Azure code_interpreter calls where `outputs` is empty but the model
 * references a file via a `sandbox:` path in its response text.
 * Lists the container's files, matches by filename, and emits SSE attachment events.
 * @param {Object} params
 * @param {ServerRequest} params.req
 * @param {ServerResponse} params.res
 * @param {string | null} params.streamId
 * @param {ArtifactPromises} params.artifactPromises
 * @param {Object} params.toolOutput - The code_interpreter_call tool output (with container_id)
 * @param {Record<string, unknown>} params.metadata - Graph event metadata
 * @param {unknown} params.textContent - The AIMessage output content array
 */
async function processCodeInterpreterSandboxFiles({
  req,
  res,
  streamId,
  artifactPromises,
  toolOutput,
  metadata,
  textContent,
}) {
  const { container_id } = toolOutput;
  const sandboxFilenames = extractSandboxFilenames(textContent);
  if (sandboxFilenames.size === 0) {
    return;
  }

  const containerFiles = await fetchAzureContainerFiles(container_id);
  if (containerFiles.length === 0) {
    return;
  }

  const matchedFiles = containerFiles
    .filter((f) => {
      const path = f.path ?? f.filename ?? f.name ?? String(f.id ?? '');
      const fname = path.split('/').pop() ?? '';
      return sandboxFilenames.has(fname);
    })
    .map((f) => {
      const path = f.path ?? f.filename ?? f.name ?? '';
      const ext = path.split('.').pop()?.toLowerCase() ?? '';
      return { file_id: f.id, mime_type: EXT_TO_MIME[ext] ?? 'application/octet-stream' };
    })
    .filter((f) => f.file_id);

  if (matchedFiles.length === 0) {
    return;
  }

  await processNativeCodeInterpreterOutputs({
    req,
    res,
    streamId,
    artifactPromises,
    metadata,
    toolOutput: {
      ...toolOutput,
      outputs: [{ type: 'files', files: matchedFiles }],
    },
  });
}

class ModelEndHandler {
  /**
   * @param {Array<UsageMetadata>} collectedUsage
   * @param {{ req: ServerRequest, res: ServerResponse, artifactPromises: ArtifactPromises, streamId: string | null } | null} [nativeToolOptions]
   */
  constructor(collectedUsage, nativeToolOptions = null) {
    if (!Array.isArray(collectedUsage)) {
      throw new Error('collectedUsage must be an array');
    }
    this.collectedUsage = collectedUsage;
    this.nativeToolOptions = nativeToolOptions;
  }

  finalize(errorMessage) {
    if (!errorMessage) {
      return;
    }
    throw new Error(errorMessage);
  }

  /**
   * @param {string} event
   * @param {ModelEndData | undefined} data
   * @param {Record<string, unknown> | undefined} metadata
   * @param {StandardGraph} graph
   * @returns {Promise<void>}
   */
  async handle(event, data, metadata, graph) {
    if (!graph || !metadata) {
      console.warn(`Graph or metadata not found in ${event} event`);
      return;
    }

    /** @type {string | undefined} */
    let errorMessage;
    try {
      const agentContext = graph.getAgentContext(metadata);
      if (data?.output?.additional_kwargs?.stop_reason === 'refusal') {
        const info = { ...data.output.additional_kwargs };
        errorMessage = JSON.stringify({
          type: ErrorTypes.REFUSAL,
          info,
        });
        logger.debug(`[ModelEndHandler] Model refused to respond`, {
          ...info,
          userId: metadata.user_id,
          messageId: metadata.run_id,
          conversationId: metadata.thread_id,
        });
      }

      const toolOutputs = data?.output?.additional_kwargs?.tool_outputs;
      if (toolOutputs?.length && this.nativeToolOptions) {
        const textContent = data?.output?.content;
        for (const toolOutput of toolOutputs) {
          if (toolOutput.type !== 'code_interpreter_call') {
            continue;
          }
          if (toolOutput.outputs?.length) {
            await processNativeCodeInterpreterOutputs({
              ...this.nativeToolOptions,
              toolOutput,
              metadata,
            });
          } else if (toolOutput.container_id) {
            await processCodeInterpreterSandboxFiles({
              ...this.nativeToolOptions,
              toolOutput,
              metadata,
              textContent,
            });
          }
        }
      }

      const usage = data?.output?.usage_metadata;
      if (!usage) {
        return this.finalize(errorMessage);
      }
      const modelName = metadata?.ls_model_name || agentContext.clientOptions?.model;
      if (modelName) {
        usage.model = modelName;
      }

      const taggedUsage = markSummarizationUsage(usage, metadata);

      this.collectedUsage.push(taggedUsage);
    } catch (error) {
      logger.error('Error handling model end event:', error);
      return this.finalize(errorMessage);
    }
  }
}

/**
 * @deprecated Agent Chain helper
 * @param {string | undefined} [last_agent_id]
 * @param {string | undefined} [langgraph_node]
 * @returns {boolean}
 */
function checkIfLastAgent(last_agent_id, langgraph_node) {
  if (!last_agent_id || !langgraph_node) {
    return false;
  }
  return langgraph_node?.endsWith(last_agent_id);
}

/**
 * Helper to emit events either to res (standard mode) or to job emitter (resumable mode).
 * In Redis mode, awaits the emit to guarantee event ordering (critical for streaming deltas).
 * @param {ServerResponse} res - The server response object
 * @param {string | null} streamId - The stream ID for resumable mode, or null for standard mode
 * @param {Object} eventData - The event data to send
 * @returns {Promise<void>}
 */
async function emitEvent(res, streamId, eventData) {
  if (streamId) {
    await GenerationJobManager.emitChunk(streamId, eventData);
  } else {
    sendEvent(res, eventData);
  }
}

/**
 * @typedef {Object} ToolExecuteOptions
 * @property {(toolNames: string[]) => Promise<{loadedTools: StructuredTool[]}>} loadTools - Function to load tools by name
 * @property {Object} configurable - Configurable context for tool invocation
 */

/**
 * Get default handlers for stream events.
 * @param {Object} options - The options object.
 * @param {ServerRequest} [options.req] - The server request object (required for native tool processing).
 * @param {ServerResponse} options.res - The server response object.
 * @param {ContentAggregator} options.aggregateContent - Content aggregator function.
 * @param {ToolEndCallback} options.toolEndCallback - Callback to use when tool ends.
 * @param {Array<UsageMetadata>} options.collectedUsage - The list of collected usage metadata.
 * @param {ArtifactPromises} [options.artifactPromises] - Artifact promises array for native tool outputs.
 * @param {string | null} [options.streamId] - The stream ID for resumable mode, or null for standard mode.
 * @param {ToolExecuteOptions} [options.toolExecuteOptions] - Options for event-driven tool execution.
 * @returns {Record<string, t.EventHandler>} The default handlers.
 * @throws {Error} If the request is not found.
 */
function getDefaultHandlers({
  req,
  res,
  aggregateContent,
  toolEndCallback,
  collectedUsage,
  artifactPromises = null,
  streamId = null,
  toolExecuteOptions = null,
  summarizationOptions = null,
}) {
  if (!res || !aggregateContent) {
    throw new Error(
      `[getDefaultHandlers] Missing required options: res: ${!res}, aggregateContent: ${!aggregateContent}`,
    );
  }
  const nativeToolOptions =
    req && artifactPromises ? { req, res, artifactPromises, streamId } : null;
  const handlers = {
    [GraphEvents.CHAT_MODEL_END]: new ModelEndHandler(collectedUsage, nativeToolOptions),
    [GraphEvents.TOOL_END]: new ToolEndHandler(toolEndCallback, logger),
    [GraphEvents.ON_RUN_STEP]: {
      /**
       * Handle ON_RUN_STEP event.
       * @param {string} event - The event name.
       * @param {StreamEventData} data - The event data.
       * @param {GraphRunnableConfig['configurable']} [metadata] The runnable metadata.
       */
      handle: async (event, data, metadata) => {
        aggregateContent({ event, data });
        if (data?.stepDetails.type === StepTypes.TOOL_CALLS) {
          await emitEvent(res, streamId, { event, data });
        } else if (checkIfLastAgent(metadata?.last_agent_id, metadata?.langgraph_node)) {
          await emitEvent(res, streamId, { event, data });
        } else if (!metadata?.hide_sequential_outputs) {
          await emitEvent(res, streamId, { event, data });
        } else {
          const agentName = metadata?.name ?? 'Agent';
          const isToolCall = data?.stepDetails.type === StepTypes.TOOL_CALLS;
          const action = isToolCall ? 'performing a task...' : 'thinking...';
          await emitEvent(res, streamId, {
            event: 'on_agent_update',
            data: {
              runId: metadata?.run_id,
              message: `${agentName} is ${action}`,
            },
          });
        }
      },
    },
    [GraphEvents.ON_RUN_STEP_DELTA]: {
      /**
       * Handle ON_RUN_STEP_DELTA event.
       * @param {string} event - The event name.
       * @param {StreamEventData} data - The event data.
       * @param {GraphRunnableConfig['configurable']} [metadata] The runnable metadata.
       */
      handle: async (event, data, metadata) => {
        aggregateContent({ event, data });
        if (data?.delta.type === StepTypes.TOOL_CALLS) {
          await emitEvent(res, streamId, { event, data });
        } else if (checkIfLastAgent(metadata?.last_agent_id, metadata?.langgraph_node)) {
          await emitEvent(res, streamId, { event, data });
        } else if (!metadata?.hide_sequential_outputs) {
          await emitEvent(res, streamId, { event, data });
        }
      },
    },
    [GraphEvents.ON_RUN_STEP_COMPLETED]: {
      /**
       * Handle ON_RUN_STEP_COMPLETED event.
       * @param {string} event - The event name.
       * @param {StreamEventData & { result: ToolEndData }} data - The event data.
       * @param {GraphRunnableConfig['configurable']} [metadata] The runnable metadata.
       */
      handle: async (event, data, metadata) => {
        aggregateContent({ event, data });
        if (data?.result != null) {
          await emitEvent(res, streamId, { event, data });
        } else if (checkIfLastAgent(metadata?.last_agent_id, metadata?.langgraph_node)) {
          await emitEvent(res, streamId, { event, data });
        } else if (!metadata?.hide_sequential_outputs) {
          await emitEvent(res, streamId, { event, data });
        }
      },
    },
    [GraphEvents.ON_MESSAGE_DELTA]: {
      /**
       * Handle ON_MESSAGE_DELTA event.
       * @param {string} event - The event name.
       * @param {StreamEventData} data - The event data.
       * @param {GraphRunnableConfig['configurable']} [metadata] The runnable metadata.
       */
      handle: async (event, data, metadata) => {
        aggregateContent({ event, data });
        if (checkIfLastAgent(metadata?.last_agent_id, metadata?.langgraph_node)) {
          await emitEvent(res, streamId, { event, data });
        } else if (!metadata?.hide_sequential_outputs) {
          await emitEvent(res, streamId, { event, data });
        }
      },
    },
    [GraphEvents.ON_REASONING_DELTA]: {
      /**
       * Handle ON_REASONING_DELTA event.
       * @param {string} event - The event name.
       * @param {StreamEventData} data - The event data.
       * @param {GraphRunnableConfig['configurable']} [metadata] The runnable metadata.
       */
      handle: async (event, data, metadata) => {
        aggregateContent({ event, data });
        if (checkIfLastAgent(metadata?.last_agent_id, metadata?.langgraph_node)) {
          await emitEvent(res, streamId, { event, data });
        } else if (!metadata?.hide_sequential_outputs) {
          await emitEvent(res, streamId, { event, data });
        }
      },
    },
  };

  if (toolExecuteOptions) {
    handlers[GraphEvents.ON_TOOL_EXECUTE] = createToolExecuteHandler(toolExecuteOptions);
  }

  if (summarizationOptions?.enabled !== false) {
    handlers[GraphEvents.ON_SUMMARIZE_START] = {
      handle: async (_event, data) => {
        await emitEvent(res, streamId, {
          event: GraphEvents.ON_SUMMARIZE_START,
          data,
        });
      },
    };
    handlers[GraphEvents.ON_SUMMARIZE_DELTA] = {
      handle: async (_event, data) => {
        aggregateContent({ event: GraphEvents.ON_SUMMARIZE_DELTA, data });
        await emitEvent(res, streamId, {
          event: GraphEvents.ON_SUMMARIZE_DELTA,
          data,
        });
      },
    };
    handlers[GraphEvents.ON_SUMMARIZE_COMPLETE] = {
      handle: async (_event, data) => {
        aggregateContent({ event: GraphEvents.ON_SUMMARIZE_COMPLETE, data });
        await emitEvent(res, streamId, {
          event: GraphEvents.ON_SUMMARIZE_COMPLETE,
          data,
        });
      },
    };
  }

  handlers[GraphEvents.ON_AGENT_LOG] = { handle: agentLogHandler };

  return handlers;
}

/**
 * Helper to write attachment events either to res or to job emitter.
 * Note: Attachments are not order-sensitive like deltas, so fire-and-forget is acceptable.
 * @param {ServerResponse} res - The server response object
 * @param {string | null} streamId - The stream ID for resumable mode, or null for standard mode
 * @param {Object} attachment - The attachment data
 */
function writeAttachment(res, streamId, attachment) {
  if (streamId) {
    GenerationJobManager.emitChunk(streamId, { event: 'attachment', data: attachment });
  } else {
    res.write(`event: attachment\ndata: ${JSON.stringify(attachment)}\n\n`);
  }
}

/**
 *
 * @param {Object} params
 * @param {ServerRequest} params.req
 * @param {ServerResponse} params.res
 * @param {Promise<MongoFile | { filename: string; filepath: string; expires: number;} | null>[]} params.artifactPromises
 * @param {string | null} [params.streamId] - The stream ID for resumable mode, or null for standard mode.
 * @returns {ToolEndCallback} The tool end callback.
 */
function createToolEndCallback({ req, res, artifactPromises, streamId = null }) {
  /**
   * @type {ToolEndCallback}
   */
  return async (data, metadata) => {
    const output = data?.output;
    if (!output) {
      return;
    }

    if (!output.artifact) {
      return;
    }

    if (output.artifact[Tools.file_search]) {
      artifactPromises.push(
        (async () => {
          const user = req.user;
          const attachment = await processFileCitations({
            user,
            metadata,
            appConfig: req.config,
            toolArtifact: output.artifact,
            toolCallId: output.tool_call_id,
          });
          if (!attachment) {
            return null;
          }
          if (!streamId && !res.headersSent) {
            return attachment;
          }
          writeAttachment(res, streamId, attachment);
          return attachment;
        })().catch((error) => {
          logger.error('Error processing file citations:', error);
          return null;
        }),
      );
    }

    if (output.artifact[Tools.ui_resources]) {
      artifactPromises.push(
        (async () => {
          const attachment = {
            type: Tools.ui_resources,
            messageId: metadata.run_id,
            toolCallId: output.tool_call_id,
            conversationId: metadata.thread_id,
            [Tools.ui_resources]: output.artifact[Tools.ui_resources].data,
          };
          if (!streamId && !res.headersSent) {
            return attachment;
          }
          writeAttachment(res, streamId, attachment);
          return attachment;
        })().catch((error) => {
          logger.error('Error processing artifact content:', error);
          return null;
        }),
      );
    }

    if (output.artifact[Tools.web_search]) {
      artifactPromises.push(
        (async () => {
          const attachment = {
            type: Tools.web_search,
            messageId: metadata.run_id,
            toolCallId: output.tool_call_id,
            conversationId: metadata.thread_id,
            [Tools.web_search]: { ...output.artifact[Tools.web_search] },
          };
          if (!streamId && !res.headersSent) {
            return attachment;
          }
          writeAttachment(res, streamId, attachment);
          return attachment;
        })().catch((error) => {
          logger.error('Error processing artifact content:', error);
          return null;
        }),
      );
    }

    if (output.artifact.content) {
      /** @type {FormattedContent[]} */
      const content = output.artifact.content;
      for (let i = 0; i < content.length; i++) {
        const part = content[i];
        if (!part) {
          continue;
        }
        if (part.type !== 'image_url') {
          continue;
        }
        const { url } = part.image_url;
        artifactPromises.push(
          (async () => {
            const filename = `${output.name}_img_${nanoid()}`;
            const file_id = output.artifact.file_ids?.[i];
            const file = await saveBase64Image(url, {
              req,
              file_id,
              filename,
              endpoint: metadata.provider,
              context: FileContext.image_generation,
            });
            const fileMetadata = Object.assign(file, {
              messageId: metadata.run_id,
              toolCallId: output.tool_call_id,
              conversationId: metadata.thread_id,
            });
            if (!streamId && !res.headersSent) {
              return fileMetadata;
            }

            if (!fileMetadata) {
              return null;
            }

            writeAttachment(res, streamId, fileMetadata);
            return fileMetadata;
          })().catch((error) => {
            logger.error('Error processing artifact content:', error);
            return null;
          }),
        );
      }
      return;
    }

    const isCodeTool =
      output.name === Tools.execute_code || output.name === Constants.PROGRAMMATIC_TOOL_CALLING;
    if (!isCodeTool) {
      return;
    }

    if (!output.artifact.files) {
      return;
    }

    for (const file of output.artifact.files) {
      const { id, name } = file;
      artifactPromises.push(
        (async () => {
          const result = await loadAuthValues({
            userId: req.user.id,
            authFields: [EnvVar.CODE_API_KEY],
          });
          const fileMetadata = await processCodeOutput({
            req,
            id,
            name,
            apiKey: result[EnvVar.CODE_API_KEY],
            messageId: metadata.run_id,
            toolCallId: output.tool_call_id,
            conversationId: metadata.thread_id,
            session_id: output.artifact.session_id,
          });
          if (!streamId && !res.headersSent) {
            return fileMetadata;
          }

          if (!fileMetadata) {
            return null;
          }

          writeAttachment(res, streamId, fileMetadata);
          return fileMetadata;
        })().catch((error) => {
          logger.error('Error processing code output:', error);
          return null;
        }),
      );
    }
  };
}

/**
 * Helper to write attachment events in Open Responses format (librechat:attachment)
 * @param {ServerResponse} res - The server response object
 * @param {Object} tracker - The response tracker with sequence number
 * @param {Object} attachment - The attachment data
 * @param {Object} metadata - Additional metadata (messageId, conversationId)
 */
function writeResponsesAttachment(res, tracker, attachment, metadata) {
  const sequenceNumber = tracker.nextSequence();
  writeAttachmentEvent(res, sequenceNumber, attachment, {
    messageId: metadata.run_id,
    conversationId: metadata.thread_id,
  });
}

/**
 * Creates a tool end callback specifically for the Responses API.
 * Emits attachments as `librechat:attachment` events per the Open Responses extension spec.
 *
 * @param {Object} params
 * @param {ServerRequest} params.req
 * @param {ServerResponse} params.res
 * @param {Object} params.tracker - Response tracker with sequence number
 * @param {Promise<MongoFile | { filename: string; filepath: string; expires: number;} | null>[]} params.artifactPromises
 * @returns {ToolEndCallback} The tool end callback.
 */
function createResponsesToolEndCallback({ req, res, tracker, artifactPromises }) {
  /**
   * @type {ToolEndCallback}
   */
  return async (data, metadata) => {
    const output = data?.output;
    if (!output) {
      return;
    }

    if (!output.artifact) {
      return;
    }

    if (output.artifact[Tools.file_search]) {
      artifactPromises.push(
        (async () => {
          const user = req.user;
          const attachment = await processFileCitations({
            user,
            metadata,
            appConfig: req.config,
            toolArtifact: output.artifact,
            toolCallId: output.tool_call_id,
          });
          if (!attachment) {
            return null;
          }
          // For Responses API, emit attachment during streaming
          if (res.headersSent && !res.writableEnded) {
            writeResponsesAttachment(res, tracker, attachment, metadata);
          }
          return attachment;
        })().catch((error) => {
          logger.error('Error processing file citations:', error);
          return null;
        }),
      );
    }

    if (output.artifact[Tools.ui_resources]) {
      artifactPromises.push(
        (async () => {
          const attachment = {
            type: Tools.ui_resources,
            toolCallId: output.tool_call_id,
            [Tools.ui_resources]: output.artifact[Tools.ui_resources].data,
          };
          // For Responses API, always emit attachment during streaming
          if (res.headersSent && !res.writableEnded) {
            writeResponsesAttachment(res, tracker, attachment, metadata);
          }
          return attachment;
        })().catch((error) => {
          logger.error('Error processing artifact content:', error);
          return null;
        }),
      );
    }

    if (output.artifact[Tools.web_search]) {
      artifactPromises.push(
        (async () => {
          const attachment = {
            type: Tools.web_search,
            toolCallId: output.tool_call_id,
            [Tools.web_search]: { ...output.artifact[Tools.web_search] },
          };
          // For Responses API, always emit attachment during streaming
          if (res.headersSent && !res.writableEnded) {
            writeResponsesAttachment(res, tracker, attachment, metadata);
          }
          return attachment;
        })().catch((error) => {
          logger.error('Error processing artifact content:', error);
          return null;
        }),
      );
    }

    if (output.artifact.content) {
      /** @type {FormattedContent[]} */
      const content = output.artifact.content;
      for (let i = 0; i < content.length; i++) {
        const part = content[i];
        if (!part) {
          continue;
        }
        if (part.type !== 'image_url') {
          continue;
        }
        const { url } = part.image_url;
        artifactPromises.push(
          (async () => {
            const filename = `${output.name}_img_${nanoid()}`;
            const file_id = output.artifact.file_ids?.[i];
            const file = await saveBase64Image(url, {
              req,
              file_id,
              filename,
              endpoint: metadata.provider,
              context: FileContext.image_generation,
            });
            const fileMetadata = Object.assign(file, {
              toolCallId: output.tool_call_id,
            });

            if (!fileMetadata) {
              return null;
            }

            // For Responses API, emit attachment during streaming
            if (res.headersSent && !res.writableEnded) {
              const attachment = {
                file_id: fileMetadata.file_id,
                filename: fileMetadata.filename,
                type: fileMetadata.type,
                url: fileMetadata.filepath,
                width: fileMetadata.width,
                height: fileMetadata.height,
                tool_call_id: output.tool_call_id,
              };
              writeResponsesAttachment(res, tracker, attachment, metadata);
            }

            return fileMetadata;
          })().catch((error) => {
            logger.error('Error processing artifact content:', error);
            return null;
          }),
        );
      }
      return;
    }

    const isCodeTool =
      output.name === Tools.execute_code || output.name === Constants.PROGRAMMATIC_TOOL_CALLING;
    if (!isCodeTool) {
      return;
    }

    if (!output.artifact.files) {
      return;
    }

    for (const file of output.artifact.files) {
      const { id, name } = file;
      artifactPromises.push(
        (async () => {
          const result = await loadAuthValues({
            userId: req.user.id,
            authFields: [EnvVar.CODE_API_KEY],
          });
          const fileMetadata = await processCodeOutput({
            req,
            id,
            name,
            apiKey: result[EnvVar.CODE_API_KEY],
            messageId: metadata.run_id,
            toolCallId: output.tool_call_id,
            conversationId: metadata.thread_id,
            session_id: output.artifact.session_id,
          });

          if (!fileMetadata) {
            return null;
          }

          // For Responses API, emit attachment during streaming
          if (res.headersSent && !res.writableEnded) {
            const attachment = {
              file_id: fileMetadata.file_id,
              filename: fileMetadata.filename,
              type: fileMetadata.type,
              url: fileMetadata.filepath,
              width: fileMetadata.width,
              height: fileMetadata.height,
              tool_call_id: output.tool_call_id,
            };
            writeResponsesAttachment(res, tracker, attachment, metadata);
          }

          return fileMetadata;
        })().catch((error) => {
          logger.error('Error processing code output:', error);
          return null;
        }),
      );
    }
  };
}

const ALLOWED_LOG_LEVELS = new Set(['debug', 'info', 'warn', 'error']);

function agentLogHandler(_event, data) {
  if (!data) {
    return;
  }
  const logFn = ALLOWED_LOG_LEVELS.has(data.level) ? logger[data.level] : logger.debug;
  const meta = typeof data.data === 'object' && data.data != null ? data.data : {};
  logFn(`[agents:${data.scope ?? 'unknown'}] ${data.message ?? ''}`, {
    ...meta,
    runId: data.runId,
    agentId: data.agentId,
  });
}

function markSummarizationUsage(usage, metadata) {
  const node = metadata?.langgraph_node;
  if (typeof node === 'string' && node.startsWith(GraphNodeKeys.SUMMARIZE)) {
    return { ...usage, usage_type: 'summarization' };
  }
  return usage;
}

const agentLogHandlerObj = { handle: agentLogHandler };

/**
 * Builds the three summarization SSE event handlers.
 * In streaming mode, each event is forwarded to the client via `res.write`.
 * In non-streaming mode, the handlers are no-ops.
 * @param {{ isStreaming: boolean, res: import('express').Response }} opts
 */
function buildSummarizationHandlers({ isStreaming, res }) {
  if (!isStreaming) {
    const noop = { handle: () => {} };
    return { on_summarize_start: noop, on_summarize_delta: noop, on_summarize_complete: noop };
  }
  const writeEvent = (name) => ({
    handle: async (_event, data) => {
      if (!res.writableEnded) {
        res.write(`event: ${name}\ndata: ${JSON.stringify(data)}\n\n`);
      }
    },
  });
  return {
    on_summarize_start: writeEvent('on_summarize_start'),
    on_summarize_delta: writeEvent('on_summarize_delta'),
    on_summarize_complete: writeEvent('on_summarize_complete'),
  };
}

module.exports = {
  agentLogHandler,
  agentLogHandlerObj,
  getDefaultHandlers,
  createToolEndCallback,
  markSummarizationUsage,
  buildSummarizationHandlers,
  createResponsesToolEndCallback,
};
