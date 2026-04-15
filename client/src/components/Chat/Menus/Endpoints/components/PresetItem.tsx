import { VisuallyHidden } from '@ariakit/react';
import { CheckCircle2, LayoutList } from 'lucide-react';
import type { TPreset } from 'librechat-data-provider';
import { useLocalize } from '~/hooks';
import { CustomMenu as Menu, CustomMenuItem as MenuItem } from '../CustomMenu';
import { useModelSelectorContext } from '../ModelSelectorContext';

interface PresetItemProps {
  preset: TPreset;
  isSelected: boolean;
}

function PresetItem({ preset, isSelected }: PresetItemProps) {
  const localize = useLocalize();
  const { handleSelectPreset } = useModelSelectorContext();

  return (
    <MenuItem
      onClick={() => handleSelectPreset(preset)}
      aria-selected={isSelected || undefined}
      className="group flex w-full cursor-pointer items-center justify-between rounded-lg px-2 text-sm"
    >
      <div className="flex w-full min-w-0 items-center gap-2 px-1 py-1">
        <span className="truncate">{preset.title || localize('com_endpoint_preset_title')}</span>
      </div>
      {isSelected && (
        <>
          <CheckCircle2 className="size-4 shrink-0 text-text-primary" aria-hidden="true" />
          <VisuallyHidden>{localize('com_a11y_selected')}</VisuallyHidden>
        </>
      )}
    </MenuItem>
  );
}

export function PresetsGroup() {
  const localize = useLocalize();
  const { presets, selectedValues } = useModelSelectorContext();

  if (!presets?.length) {
    return null;
  }

  return (
    <Menu
      label={
        <div className="flex min-w-0 items-center gap-2">
          <LayoutList className="size-4 shrink-0" aria-hidden="true" />
          <span className="truncate text-left">{localize('com_endpoint_my_presets')}</span>
        </div>
      }
    >
      {presets.map((preset) => (
        <PresetItem
          key={preset.presetId}
          preset={preset}
          isSelected={
            !selectedValues.modelSpec &&
            selectedValues.endpoint === preset.endpoint &&
            selectedValues.model === (preset.model ?? '')
          }
        />
      ))}
    </Menu>
  );
}
