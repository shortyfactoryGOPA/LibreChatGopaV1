import { useState, useEffect, useMemo } from 'react';
import {
  EModelEndpoint,
  defaultAssistantsVersion,
  AzureAssistantsNewEndpoint,
  AzureAssistantsOldEndpoint,
  AzureNewFoundryAssistantsEndpoint,
  isAzureAssistantsVariantEnabled,
} from 'librechat-data-provider';
import type { Action, TEndpointsConfig } from 'librechat-data-provider';
import type { ActionsEndpoint } from '~/common';
import {
  useGetActionsQuery,
  useGetEndpointsQuery,
  useGetAssistantDocsQuery,
} from '~/data-provider';
import { getAssistantEndpoint } from '~/utils';
import AssistantPanel from './AssistantPanel';
import { useChatContext } from '~/Providers';
import ActionsPanel from './ActionsPanel';
import { Panel } from '~/common';

export default function PanelSwitch() {
  const { conversation, index } = useChatContext();
  const [activePanel, setActivePanel] = useState(Panel.builder);
  const [action, setAction] = useState<Action | undefined>(undefined);
  const [currentAssistantId, setCurrentAssistantId] = useState<string | undefined>(
    conversation?.assistant_id,
  );

  const { data: endpointsConfig = {} as TEndpointsConfig } = useGetEndpointsQuery();

  const builderEndpoint = useMemo(() => {
    const ep = getAssistantEndpoint(conversation?.endpoint, endpointsConfig);
    if (ep !== EModelEndpoint.azureAssistants) {
      return ep;
    }
    if (isAzureAssistantsVariantEnabled(endpointsConfig, AzureAssistantsNewEndpoint)) {
      return AzureAssistantsNewEndpoint;
    }
    if (isAzureAssistantsVariantEnabled(endpointsConfig, AzureNewFoundryAssistantsEndpoint)) {
      return AzureNewFoundryAssistantsEndpoint;
    }
    if (isAzureAssistantsVariantEnabled(endpointsConfig, AzureAssistantsOldEndpoint)) {
      return AzureAssistantsOldEndpoint;
    }
    return ep;
  }, [conversation?.endpoint, endpointsConfig]);

  const { data: actions = [] } = useGetActionsQuery(builderEndpoint as ActionsEndpoint);
  const { data: documentsMap = null } = useGetAssistantDocsQuery(builderEndpoint ?? '', {
    select: (data) => new Map(data.map((dbA) => [dbA.assistant_id, dbA])),
  });

  const assistantsConfig = useMemo(
    () => endpointsConfig?.[builderEndpoint ?? ''],
    [builderEndpoint, endpointsConfig],
  );

  useEffect(() => {
    const currentId = conversation?.assistant_id ?? '';
    if (currentId) {
      setCurrentAssistantId(currentId);
    }
  }, [conversation?.assistant_id]);

  if (!builderEndpoint) {
    return null;
  }

  const version = assistantsConfig?.version ?? defaultAssistantsVersion[builderEndpoint];

  if (activePanel === Panel.actions || action) {
    return (
      <ActionsPanel
        index={index}
        action={action}
        actions={actions}
        setAction={setAction}
        activePanel={activePanel}
        documentsMap={documentsMap}
        setActivePanel={setActivePanel}
        assistant_id={currentAssistantId}
        setCurrentAssistantId={setCurrentAssistantId}
        endpoint={builderEndpoint}
        version={version}
      />
    );
  } else if (activePanel === Panel.builder) {
    return (
      <AssistantPanel
        index={index}
        activePanel={activePanel}
        action={action}
        actions={actions}
        setAction={setAction}
        documentsMap={documentsMap}
        setActivePanel={setActivePanel}
        assistant_id={currentAssistantId}
        setCurrentAssistantId={setCurrentAssistantId}
        endpoint={builderEndpoint}
        assistantsConfig={assistantsConfig}
        version={version}
      />
    );
  }
}
