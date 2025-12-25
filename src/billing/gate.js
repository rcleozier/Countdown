/**
 * Feature gate helper - checks if user has access to a feature
 * If blocked, calls onBlocked callback (typically to show paywall)
 * If allowed, calls onAllowed callback
 */
export const requirePro = (
  featureName,
  hasFeature,
  callbacks
) => {
  if (hasFeature(featureName)) {
    callbacks.onAllowed?.();
  } else {
    callbacks.onBlocked?.(featureName);
  }
};
