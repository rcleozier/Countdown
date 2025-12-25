// Billing types
export interface EntitlementInfo {
  isPro: boolean;
  isLoading: boolean;
  activeProductId?: string;
  purchase: (pkgId?: string) => Promise<void>;
  restore: () => Promise<void>;
  refresh: () => Promise<void>;
  offerings?: {
    monthly?: Package;
    annual?: Package;
  };
  error?: string;
}

export interface Package {
  identifier: string;
  product: {
    identifier: string;
    title: string;
    description: string;
    price: string;
    priceString: string;
    currencyCode: string;
  };
}

export interface Offerings {
  monthly?: Package;
  annual?: Package;
}

