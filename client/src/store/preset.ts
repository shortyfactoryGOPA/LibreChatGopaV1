import { atom } from 'recoil';
import { TPreset } from 'librechat-data-provider';

const defaultPreset = atom<TPreset | null>({
  key: 'defaultPreset',
  default: null,
});

const activePresetId = atom<string | null>({
  key: 'activePresetId',
  default: null,
});

const presetModalVisible = atom<boolean>({
  key: 'presetModalVisible',
  default: false,
});

export default {
  defaultPreset,
  presetModalVisible,
  activePresetId,
};
