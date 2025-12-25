import { i18n } from './i18n';

// Subscription plan definitions
export const SUBSCRIPTION_PLANS = {
  monthly: {
    id: 'monthly',
    productId: 'com.chronox.app.pro.monthly',
    duration: 'monthly',
    price: '$4.99',
    pricePerMonth: '$4.99',
    savings: null,
    popular: false,
  },
  yearly: {
    id: 'yearly',
    productId: 'com.chronox.app.pro.yearly',
    duration: 'yearly',
    price: '$39.99',
    pricePerMonth: '$3.33',
    savings: '33%',
    popular: true,
  },
};

// Get localized plan name
export const getPlanName = (planId) => {
  return i18n.t(`subscription.plans.${planId}.name`);
};

// Get localized plan description
export const getPlanDescription = (planId) => {
  return i18n.t(`subscription.plans.${planId}.description`);
};

// Get all plans with localized names
export const getAllPlans = () => {
  return Object.values(SUBSCRIPTION_PLANS).map(plan => ({
    ...plan,
    name: getPlanName(plan.id),
    description: getPlanDescription(plan.id),
  }));
};

// Pro features list (for paywall)
export const PRO_FEATURES = [
  'unlimited_countdowns',
  'unlimited_notes',
  'advanced_reminders',
  'custom_templates',
  'export_data',
  'no_ads',
  'priority_support',
];

