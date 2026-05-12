import React from 'react';
import { useWatch, useFormContext } from 'react-hook-form';
import { LockIcon } from 'lucide-react';
import type { AgentForm } from '~/common';
import { useAgentCategories } from '~/hooks/Agents';
import { TranslationKeys, useLocalize } from '~/hooks';
import { cn } from '~/utils';

const labelClass = 'mb-1 block text-sm font-medium text-token-text-primary';
const valueClass = cn(
  'w-full rounded-lg border border-border-light bg-surface-secondary px-3 py-2',
  'text-sm text-token-text-primary opacity-75 cursor-default select-text',
);

function ReadOnlyField({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) {
    return null;
  }
  return (
    <div className="mb-4">
      <label className={labelClass}>{label}</label>
      <div className={valueClass}>{value}</div>
    </div>
  );
}

export default function AgentReadOnlyView() {
  const localize = useLocalize();
  const { control } = useFormContext<AgentForm>();
  const { categories } = useAgentCategories();

  const name = useWatch({ control, name: 'name' });
  const description = useWatch({ control, name: 'description' });
  const categoryValue = useWatch({ control, name: 'category' });
  const instructions = useWatch({ control, name: 'instructions' });
  const model = useWatch({ control, name: 'model' });

  const categoryLabel = React.useMemo(() => {
    const match = categories.find((c) => c.value === categoryValue);
    if (!match) {
      return categoryValue;
    }
    if (match.label.startsWith('com_')) {
      return localize(match.label as TranslationKeys);
    }
    return match.label;
  }, [categories, categoryValue, localize]);

  return (
    <div className="pt-2">
      <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50/60 px-3 py-2.5 dark:border-amber-500/40 dark:bg-amber-500/10">
        <p className="mb-0.5 text-sm font-semibold text-amber-600 dark:text-amber-400">
          {localize('com_agents_not_available')}
        </p>
        <div className="flex items-center gap-1.5 text-sm text-amber-600 dark:text-amber-400">
          <LockIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{localize('com_agents_no_access')}</span>
        </div>
      </div>
      <ReadOnlyField label={localize('com_ui_name')} value={name} />
      <ReadOnlyField label={localize('com_ui_description')} value={description} />
      <ReadOnlyField label={localize('com_ui_category')} value={categoryLabel} />
      {instructions != null && instructions !== '' && (
        <div className="mb-4">
          <label className={labelClass}>{localize('com_ui_instructions')}</label>
          <div className={cn(valueClass, 'max-h-48 overflow-y-auto whitespace-pre-wrap')}>
            {instructions}
          </div>
        </div>
      )}
      <ReadOnlyField label={localize('com_ui_model')} value={model} />
    </div>
  );
}
