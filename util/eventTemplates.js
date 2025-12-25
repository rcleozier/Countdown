import { i18n } from './i18n';

export const TEMPLATES = {
  birthday: {
    id: 'birthday',
    icon: '🎂',
    defaultReminderPreset: 'chill',
  },
  trip: {
    id: 'trip',
    icon: '✈️',
    defaultReminderPreset: 'standard',
  },
  exam: {
    id: 'exam',
    icon: '📝',
    defaultReminderPreset: 'standard',
  },
  wedding: {
    id: 'wedding',
    icon: '💒',
    defaultReminderPreset: 'intense',
  },
  flight: {
    id: 'flight',
    icon: '🛫',
    defaultReminderPreset: 'chill',
  },
  appointment: {
    id: 'appointment',
    icon: '📅',
    defaultReminderPreset: 'chill',
  },
};

// Get template name (localized)
export const getTemplateName = (templateId) => {
  if (!templateId || !TEMPLATES[templateId]) return null;
  return i18n.t(`templates.${templateId}.name`);
};

// Get default event name from template (localized)
export const getDefaultEventName = (templateId, params = {}) => {
  if (!templateId || !TEMPLATES[templateId]) return '';
  const pattern = i18n.t(`templates.${templateId}.defaultName`);
  // Simple parameter replacement
  return pattern.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return params[key] || '';
  });
};

// Get all templates with localized names
export const getAllTemplates = () => {
  return Object.values(TEMPLATES).map(template => ({
    ...template,
    name: getTemplateName(template.id),
  }));
};

