import { useNavigate } from 'react-router-dom';
import { BarChart2, ShieldAlert, Users } from 'lucide-react';
import { useLocalize } from '~/hooks';

export default function AdminNavPanel() {
  const navigate = useNavigate();
  const localize = useLocalize();

  const links = [
    { to: '/admin/users', Icon: Users, label: localize('com_ui_admin_users') },
    { to: '/admin/moderation', Icon: ShieldAlert, label: localize('com_ui_admin_moderation') },
    { to: '/admin/analytics', Icon: BarChart2, label: localize('com_ui_admin_analytics') },
  ] as const;

  return (
    <div className="flex flex-col gap-1 p-2">
      {links.map(({ to, Icon, label }) => (
        <button
          key={to}
          onClick={() => navigate(to)}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-text-primary transition-colors hover:bg-surface-hover"
        >
          <Icon size={18} />
          {label}
        </button>
      ))}
    </div>
  );
}
