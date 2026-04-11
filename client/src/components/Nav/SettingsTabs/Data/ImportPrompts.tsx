import { useState, useRef, useCallback } from 'react';
import { Import } from 'lucide-react';
import { dataService, QueryKeys } from 'librechat-data-provider';
import { useQueryClient } from '@tanstack/react-query';
import { Spinner, useToastContext, Label, Button } from '@librechat/client';
import { NotificationSeverity } from '~/common';
import { useLocalize } from '~/hooks';
import { cn, logger } from '~/utils';

function ImportPrompts() {
  const localize = useLocalize();
  const queryClient = useQueryClient();
  const { showToast } = useToastContext();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (!file) {
        return;
      }

      setIsImporting(true);
      try {
        const data = JSON.parse(await file.text());

        if (!Array.isArray(data?.prompts)) {
          showToast({
            message: localize('com_ui_import_invalid_format'),
            status: NotificationSeverity.ERROR,
          });
          setIsImporting(false);
          return;
        }

        const existingGroups = await dataService.getAllPromptGroups();
        const existingNames = new Set(existingGroups.map((g) => g.name.toLowerCase()));

        let created = 0;
        let skipped = 0;
        let errors = 0;

        for (const item of data.prompts) {
          if (!item.name || !item.content) {
            errors++;
            continue;
          }
          if (existingNames.has((item.name as string).toLowerCase())) {
            skipped++;
            continue;
          }
          try {
            await dataService.createPrompt({
              prompt: { prompt: item.content as string, type: 'text' },
              group: { name: item.name as string },
            });
            existingNames.add((item.name as string).toLowerCase());
            created++;
          } catch {
            errors++;
          }
        }

        queryClient.invalidateQueries([QueryKeys.promptGroups]);

        showToast({
          message: localize('com_ui_import_prompts_success', {
            0: String(created),
            1: String(skipped),
            2: String(errors),
          }),
          status: created === 0 && errors > 0 ? NotificationSeverity.ERROR : NotificationSeverity.SUCCESS,
        });
      } catch (error) {
        logger.error('Import prompts error:', error);
        showToast({
          message: localize('com_ui_import_conversation_error'),
          status: NotificationSeverity.ERROR,
        });
      }
      setIsImporting(false);
    },
    [localize, queryClient, showToast],
  );

  return (
    <div className="flex items-center justify-between">
      <Label id="import-prompts-label">{localize('com_ui_import_prompts_info')}</Label>
      <Button
        variant="outline"
        onClick={() => fileInputRef.current?.click()}
        disabled={isImporting}
        aria-label={localize('com_ui_import')}
        aria-labelledby="import-prompts-label"
      >
        {isImporting ? (
          <>
            <Spinner className="mr-1 w-4" />
            <span>{localize('com_ui_importing')}</span>
          </>
        ) : (
          <>
            <Import className="mr-1 flex h-4 w-4 items-center stroke-1" aria-hidden="true" />
            <span>{localize('com_ui_import')}</span>
          </>
        )}
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        className={cn('hidden')}
        accept=".json"
        onChange={handleFileChange}
        aria-hidden="true"
      />
    </div>
  );
}

export default ImportPrompts;
