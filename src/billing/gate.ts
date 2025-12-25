import { Feature } from './useEntitlements';

export interface GateCallbacks {
  onAllowed?: () => void;
  onBlocked?: (featureName: string) => void;
}

/**
 * Feature gate helper - checks if user has access to a feature
 * If blocked, calls onBlocked callback (typically to show paywall)
 * If allowed, calls onAllowed callback
 */
export const requirePro = (
  featureName: Feature,
  hasFeature: (feature: Feature) => boolean,
  callbacks: GateCallbacks
) => {
  if (hasFeature(featureName)) {
    callbacks.onAllowed?.();
  } else {
    callbacks.onBlocked?.(featureName);
  }
};

