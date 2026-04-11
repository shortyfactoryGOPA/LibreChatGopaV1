import { useState, useRef, useCallback } from 'react';
import { Import } from 'lucide-react';
import { dataService, QueryKeys } from 'librechat-data-provider';
import type { TPreset } from 'librechat-data-provider';
import { useQueryClient } from '@tanstack/react-query';
import { Spinner, useToastContext, Label, Button } from '@librechat/client';
import { NotificationSeverity } from '~/common';
import { useLocalize } from '~/hooks';
import { cn, logger } from '~/utils';

function ImportPresets() {
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

        if (!Array.isArray(data?.presets)) {
          showToast({
            message: localize('com_ui_import_invalid_format'),
            status: NotificationSeverity.ERROR,
          });
          setIsImporting(false);
          return;
        }

        const existingPresets = await dataService.getPresets();
        const existingTitles = new Set(
          existingPresets.map((p) => (p.title ?? '').toLowerCase()),
        );

        let created = 0;
        let skipped = 0;
        let errors = 0;

        for (const item of data.presets) {
          if (!item.name) {
            errors++;
            continue;
          }
          if (existingTitles.has((item.name as string).toLowerCase())) {
            skipped++;
            continue;
          }
          try {
            const preset: Partial<TPreset> = {
              title: item.name as string,
              promptPrefix: (item.prompt as string) ?? null,
              model: (item.model?.id as string) ?? null,
              temperature: typeof item.temperature === 'number' ? item.temperature : undefined,
              endpoint: null,
            };
            await dataService.createPreset(preset as TPreset);
            existingTitles.add((item.name as string).toLowerCase());
            created++;
          } catch {
            errors++;
          }
        }

        queryClient.invalidateQueries([QueryKeys.presets]);

        showToast({
          message: localize('com_ui_import_presets_success', {
            0: String(created),
            1: String(skipped),
            2: String(errors),
          }),
          status: created === 0 && errors > 0 ? NotificationSeverity.ERROR : NotificationSeverity.SUCCESS,
        });
      } catch (error) {
        logger.error('Import presets error:', error);
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
      <Label id="import-presets-label">{localize('com_ui_import_presets_info')}</Label>
      <Button
        variant="outline"
        onClick={() => fileInputRef.current?.click()}
        disabled={isImporting}
        aria-label={localize('com_ui_import')}
        aria-labelledby="import-presets-label"
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

export default ImportPresets;
