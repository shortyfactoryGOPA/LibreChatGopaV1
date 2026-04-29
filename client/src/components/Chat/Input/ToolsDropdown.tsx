import React, { useState, useCallback } from 'react';
import * as Ariakit from '@ariakit/react';
import { Globe, Settings2, TerminalSquareIcon } from 'lucide-react';
import { TooltipAnchor, DropdownPopup, PinIcon } from '@librechat/client';
import type { MenuItemProps } from '~/common';
import {
  Permissions,
  PermissionTypes,
} from 'librechat-data-provider';
import { useLocalize, useHasAccess } from '~/hooks';
import MCPSubMenu from '~/components/Chat/Input/MCPSubMenu';
import { useGetStartupConfig } from '~/data-provider';
import { useBadgeRowContext } from '~/Providers';
import { cn } from '~/utils';

interface ToolsDropdownProps {
  disabled?: boolean;
}

const ToolsDropdown = ({ disabled }: ToolsDropdownProps) => {
  const localize = useLocalize();
  const context = useBadgeRowContext();
  const { data: startupConfig } = useGetStartupConfig();

  const canUseWebSearch = useHasAccess({
    permissionType: PermissionTypes.WEB_SEARCH,
    permission: Permissions.USE,
  });

  const canUseMcp = useHasAccess({
    permissionType: PermissionTypes.MCP_SERVERS,
    permission: Permissions.USE,
  });

  const [isPopoverActive, setIsPopoverActive] = useState(false);
  const isDisabled = disabled ?? false;
  const { webSearch, mcpServerManager, codeInterpreter } = context ?? {};

  const { isPinned: isSearchPinned, setIsPinned: setIsSearchPinned } = webSearch ?? {};
  const { isPinned: isCodePinned, setIsPinned: setIsCodePinned } = codeInterpreter ?? {};

  const handleWebSearchToggle = useCallback(() => {
    webSearch?.debouncedChange({ value: !webSearch?.toggleState });
  }, [webSearch]);

  const handleCodeInterpreterToggle = useCallback(() => {
    codeInterpreter?.debouncedChange({ value: !codeInterpreter?.toggleState });
  }, [codeInterpreter]);

  const mcpPlaceholder = startupConfig?.interface?.mcpServers?.placeholder;

  const dropdownItems: MenuItemProps[] = [];

  if (canUseWebSearch) {
    dropdownItems.push({
      onClick: handleWebSearchToggle,
      hideOnClick: false,
      render: (props) => (
        <div {...props}>
          <div className="flex items-center gap-2">
            <Globe className="icon-md" aria-hidden="true" />
            <span>{localize('com_ui_web_search')}</span>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsSearchPinned?.(!isSearchPinned);
            }}
            className={cn(
              'rounded p-1 transition-all duration-200',
              'hover:bg-surface-secondary hover:shadow-sm',
              !isSearchPinned && 'text-text-secondary hover:text-text-primary',
            )}
            aria-label={isSearchPinned ? 'Unpin' : 'Pin'}
          >
            <div className="h-4 w-4">
              <PinIcon unpin={isSearchPinned} />
            </div>
          </button>
        </div>
      ),
    });
  }

  if (codeInterpreter != null) {
    dropdownItems.push({
      onClick: handleCodeInterpreterToggle,
      hideOnClick: false,
      render: (props) => (
        <div {...props}>
          <div className="flex items-center gap-2">
            <TerminalSquareIcon className="icon-md" aria-hidden="true" />
            <span>{localize('com_assistants_code_interpreter')}</span>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsCodePinned?.(!isCodePinned);
            }}
            className={cn(
              'rounded p-1 transition-all duration-200',
              'hover:bg-surface-secondary hover:shadow-sm',
              !isCodePinned && 'text-text-primary hover:text-text-primary',
            )}
            aria-label={isCodePinned ? 'Unpin' : 'Pin'}
          >
            <div className="h-4 w-4">
              <PinIcon unpin={isCodePinned} />
            </div>
          </button>
        </div>
      ),
    });
  }

  const { availableMCPServers } = mcpServerManager ?? {};
  if (canUseMcp && availableMCPServers && availableMCPServers.length > 0) {
    dropdownItems.push({
      hideOnClick: false,
      render: (props) => <MCPSubMenu {...props} placeholder={mcpPlaceholder} />,
    });
  }

  if (dropdownItems.length === 0) {
    return null;
  }

  const menuTrigger = (
    <TooltipAnchor
      render={
        <Ariakit.MenuButton
          disabled={isDisabled}
          id="tools-dropdown-button"
          aria-label="Tools Options"
          className={cn(
            'flex size-9 items-center justify-center rounded-full p-1 hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-opacity-50',
            isPopoverActive && 'bg-surface-hover',
          )}
        >
          <div className="flex w-full items-center justify-center gap-2">
            <Settings2 className="size-5" aria-hidden="true" />
          </div>
        </Ariakit.MenuButton>
      }
      id="tools-dropdown-button"
      description={localize('com_ui_tools')}
      disabled={isDisabled}
    />
  );

  return (
    <DropdownPopup
      itemClassName="flex w-full cursor-pointer rounded-lg items-center justify-between hover:bg-surface-hover gap-5"
      menuId="tools-dropdown-menu"
      isOpen={isPopoverActive}
      setIsOpen={setIsPopoverActive}
      modal={true}
      unmountOnHide={true}
      trigger={menuTrigger}
      items={dropdownItems}
      iconClassName="mr-0"
    />
  );
};

export default React.memo(ToolsDropdown);
