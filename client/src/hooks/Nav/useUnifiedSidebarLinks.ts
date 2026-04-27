import { useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRecoilValue } from 'recoil';
import { BookOpen, Languages, MessagesSquare, ShieldCheck, Target } from 'lucide-react';
import { SystemRoles } from 'librechat-data-provider';
import { useUserKeyQuery } from 'librechat-data-provider/react-query';
import { getConfigDefaults, getEndpointField } from 'librechat-data-provider';
import type { TEndpointsConfig } from 'librechat-data-provider';
import type { NavLink } from '~/common';
import AdminNavPanel from '~/components/Nav/AdminNavPanel';
import ConversationsSection from '~/components/UnifiedSidebar/ConversationsSection';
import { useGetEndpointsQuery, useGetStartupConfig } from '~/data-provider';
import { useAuthContext } from '~/hooks/AuthContext';
import useSideNavLinks from '~/hooks/Nav/useSideNavLinks';
import store from '~/store';

const defaultInterface = getConfigDefaults().interface;

export default function useUnifiedSidebarLinks() {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const conversation = useRecoilValue(store.conversationByIndex(0));
  const endpoint = conversation?.endpoint;
  const { data: startupConfig } = useGetStartupConfig();
  const { data: endpointsConfig = {} as TEndpointsConfig } = useGetEndpointsQuery();

  const interfaceConfig = useMemo(
    () => startupConfig?.interface ?? defaultInterface,
    [startupConfig],
  );

  const endpointType = useMemo(
    () => getEndpointField(endpointsConfig, endpoint, 'type'),
    [endpoint, endpointsConfig],
  );

  const userProvidesKey = useMemo(
    () => !!(endpointsConfig?.[endpoint ?? '']?.userProvide ?? false),
    [endpointsConfig, endpoint],
  );

  const { data: keyExpiry = { expiresAt: undefined } } = useUserKeyQuery(endpoint ?? '');

  const keyProvided = useMemo(
    () => (userProvidesKey ? !!(keyExpiry.expiresAt ?? '') : true),
    [keyExpiry.expiresAt, userProvidesKey],
  );

  const sideNavLinks = useSideNavLinks({
    keyProvided,
    endpoint,
    endpointType,
    interfaceConfig,
    endpointsConfig,
    includeHidePanel: false,
  });

  const handleDeepLNavigate = useCallback(() => navigate('/deepl'), [navigate]);
  const handleSDGNavigate = useCallback(() => navigate('/sdg'), [navigate]);
  const handleGuideNavigate = useCallback(() => navigate('/guide'), [navigate]);

  const isAdmin = user?.role === SystemRoles.ADMIN;

  const links = useMemo(() => {
    const conversationLink: NavLink = {
      title: 'com_ui_chat_history',
      label: '',
      icon: MessagesSquare,
      id: 'conversations',
      Component: ConversationsSection,
    };

    const deeplLink: NavLink = {
      title: 'com_ui_gopa_nav_document_translator',
      label: '',
      icon: Languages,
      id: 'deepl',
      onClick: handleDeepLNavigate,
    };

    const sdgLink: NavLink = {
      title: 'com_ui_gopa_nav_sdg_mapper',
      label: '',
      icon: Target,
      id: 'sdg',
      onClick: handleSDGNavigate,
    };

    const guideLink: NavLink = {
      title: 'com_ui_gopa_user_guide',
      label: '',
      icon: BookOpen,
      id: 'guide',
      onClick: handleGuideNavigate,
    };

    const adminLink: NavLink = {
      title: 'com_ui_admin',
      label: '',
      icon: ShieldCheck,
      iconClassName: 'text-red-500',
      id: 'admin',
      Component: AdminNavPanel,
    };

    const topLinks = [conversationLink];
    const toolLinks = [deeplLink, sdgLink];
    const baseLinks = [...sideNavLinks, guideLink];
    const mainLinks = isAdmin ? [...baseLinks, adminLink] : baseLinks;
    return { links: [...topLinks, ...toolLinks, ...mainLinks], topLinks, toolLinks, mainLinks };
  }, [sideNavLinks, handleDeepLNavigate, handleSDGNavigate, handleGuideNavigate, isAdmin]);

  return links;
}
