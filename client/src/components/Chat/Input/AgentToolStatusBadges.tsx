import React, { memo } from 'react';
import { Globe, TerminalSquareIcon } from 'lucide-react';
import { Tools } from 'librechat-data-provider';
import { useRecoilValue } from 'recoil';
import { useGetAgentByIdQuery } from '~/data-provider';
import { useLocalize } from '~/hooks';
import { ephemeralAgentByConvoId } from '~/store';
import { cn } from '~/utils';

interface AgentToolStatusBadgesProps {
  conversationId: string;
  agentId?: string;
}

function StatusPill({
  icon,
  label,
  enabled,
  enabledClassName,
}: {
  icon: React.ReactNode;
  label: string;
  enabled: boolean;
  enabledClassName: string;
}) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium',
        enabled ? enabledClassName : 'border-border-medium bg-transparent text-text-secondary',
      )}
      title={label}
    >
      <span className="flex h-3.5 w-3.5 items-center justify-center">{icon}</span>
      <span className="hidden md:block">{label}</span>
    </div>
  );
}

function AgentToolStatusBadges({ conversationId, agentId }: AgentToolStatusBadgesProps) {
  const localize = useLocalize();
  const ephemeralAgent = useRecoilValue(ephemeralAgentByConvoId(conversationId));
  const { data: agent } = useGetAgentByIdQuery(agentId, { enabled: !!agentId });

  const tools = agent?.tools ?? [];
  const hasCodeInterpreter = tools.includes(Tools.execute_code);
  const hasWebSearch = tools.includes(Tools.web_search);

  if (!hasCodeInterpreter && !hasWebSearch) {
    return null;
  }

  const codeEnabled = ephemeralAgent?.execute_code === true;
  const webEnabled = ephemeralAgent?.web_search === true;

  return (
    <div className="flex items-center gap-1.5">
      {hasCodeInterpreter && (
        <StatusPill
          icon={<TerminalSquareIcon className="h-3.5 w-3.5" aria-hidden="true" />}
          label={localize('com_assistants_code_interpreter')}
          enabled={codeEnabled}
          enabledClassName="border-purple-600/40 bg-purple-500/10 text-purple-600 dark:text-purple-400"
        />
      )}
      {hasWebSearch && (
        <StatusPill
          icon={<Globe className="h-3.5 w-3.5" aria-hidden="true" />}
          label={localize('com_ui_web_search')}
          enabled={webEnabled}
          enabledClassName="border-blue-600/40 bg-blue-500/10 text-blue-600 dark:text-blue-400"
        />
      )}
    </div>
  );
}

export default memo(AgentToolStatusBadges);
