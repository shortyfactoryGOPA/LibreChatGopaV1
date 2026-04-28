import React from 'react';
import {
  Dices,
  BoxIcon,
  FileText,
  PenLineIcon,
  LightbulbIcon,
  LineChartIcon,
  ShoppingBagIcon,
  PlaneTakeoffIcon,
  GraduationCapIcon,
  TerminalSquareIcon,
  Users as UsersIcon,
  Beaker as BeakerIcon,
  Settings as SettingsIcon,
  Languages,
  AlignLeft,
  LifeBuoy,
  Microscope,
  CalendarDays,
} from 'lucide-react';
import { cn } from '~/utils';

const categoryIconMap: Record<string, React.ElementType> = {
  misc: BoxIcon,
  roleplay: Dices,
  write: PenLineIcon,
  idea: LightbulbIcon,
  shop: ShoppingBagIcon,
  finance: LineChartIcon,
  code: TerminalSquareIcon,
  travel: PlaneTakeoffIcon,
  teach_or_explain: GraduationCapIcon,
  general: BoxIcon,
  hr: UsersIcon,
  rd: BeakerIcon,
  it: TerminalSquareIcon,
  sales: LineChartIcon,
  aftersales: SettingsIcon,
  writing_editing: PenLineIcon,
  translation_localization: Languages,
  meetings_summaries: CalendarDays,
  research_analysis: Microscope,
  brainstorming_ideation: LightbulbIcon,
  formatting_structuring: AlignLeft,
  general_support: LifeBuoy,
};

const categoryColorMap: Record<string, string> = {
  code: 'text-red-500',
  misc: 'text-blue-300',
  shop: 'text-purple-400',
  idea: 'text-yellow-500/90 dark:text-yellow-300',
  write: 'text-purple-400',
  travel: 'text-yellow-500/90 dark:text-yellow-300',
  finance: 'text-orange-400',
  roleplay: 'text-orange-400',
  teach_or_explain: 'text-blue-300',
  general: 'text-blue-500',
  hr: 'text-green-500',
  rd: 'text-purple-500',
  it: 'text-red-500',
  sales: 'text-orange-500',
  aftersales: 'text-yellow-500',
  writing_editing: 'text-purple-400',
  translation_localization: 'text-blue-400',
  meetings_summaries: 'text-orange-400',
  research_analysis: 'text-teal-500',
  brainstorming_ideation: 'text-yellow-500/90 dark:text-yellow-300',
  formatting_structuring: 'text-blue-500',
  general_support: 'text-slate-400',
};

export default function CategoryIcon({
  category,
  className = '',
}: {
  category: string;
  className?: string;
}) {
  const IconComponent = categoryIconMap[category] ?? FileText;
  const colorClass = categoryColorMap[category] ?? 'text-text-secondary';
  return <IconComponent className={cn('size-4', colorClass, className)} aria-hidden="true" />;
}
