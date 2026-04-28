import logger from '~/config/winston';

const options = [
  { label: 'com_ui_gopa_cat_writing_editing', value: 'writing_editing' },
  { label: 'com_ui_gopa_cat_translation_localization', value: 'translation_localization' },
  { label: 'com_ui_gopa_cat_meetings_summaries', value: 'meetings_summaries' },
  { label: 'com_ui_gopa_cat_research_analysis', value: 'research_analysis' },
  { label: 'com_ui_gopa_cat_brainstorming_ideation', value: 'brainstorming_ideation' },
  { label: 'com_ui_gopa_cat_formatting_structuring', value: 'formatting_structuring' },
  { label: 'com_ui_gopa_cat_general_support', value: 'general_support' },
] as const;

export type CategoryOption = { label: string; value: string };

export function createCategoriesMethods(_mongoose: typeof import('mongoose')) {
  /**
   * Retrieves the categories.
   */
  async function getCategories(): Promise<CategoryOption[]> {
    try {
      return [...options];
    } catch (error) {
      logger.error('Error getting categories', error);
      return [];
    }
  }

  return { getCategories };
}

export type CategoriesMethods = ReturnType<typeof createCategoriesMethods>;
