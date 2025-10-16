// International AdMob Configuration for Global Monetization
import { Platform } from "react-native";

// Country-specific ad optimization
export const COUNTRY_SPECIFIC_CONFIG = {
  // High-value markets
  US: {
    keywords: ["countdown", "timer", "productivity", "business", "technology"],
    refreshRate: 30000, // 30 seconds
    priority: "high"
  },
  UK: {
    keywords: ["countdown", "timer", "productivity", "business", "technology"],
    refreshRate: 30000,
    priority: "high"
  },
  DE: {
    keywords: ["countdown", "timer", "produktivität", "business", "technologie"],
    refreshRate: 30000,
    priority: "high"
  },
  FR: {
    keywords: ["countdown", "timer", "productivité", "business", "technologie"],
    refreshRate: 30000,
    priority: "high"
  },
  JP: {
    keywords: ["countdown", "timer", "productivity", "business", "technology"],
    refreshRate: 30000,
    priority: "high"
  },
  // Emerging markets
  BR: {
    keywords: ["countdown", "timer", "produtividade", "business", "tecnologia"],
    refreshRate: 45000,
    priority: "medium"
  },
  IN: {
    keywords: ["countdown", "timer", "productivity", "business", "technology"],
    refreshRate: 45000,
    priority: "medium"
  },
  CN: {
    keywords: ["countdown", "timer", "productivity", "business", "technology"],
    refreshRate: 45000,
    priority: "medium"
  },
  // Default for other countries
  DEFAULT: {
    keywords: ["countdown", "timer", "productivity", "business", "technology"],
    refreshRate: 60000,
    priority: "standard"
  }
};

// International ad request optimization
export const getInternationalAdConfig = (countryCode = 'DEFAULT') => {
  const config = COUNTRY_SPECIFIC_CONFIG[countryCode] || COUNTRY_SPECIFIC_CONFIG.DEFAULT;
  
  return {
    // Enhanced keywords for international markets
    keywords: [
      ...config.keywords,
      "mobile app",
      "smartphone",
      "digital",
      "online",
      "utility",
      "tool",
      "service",
      "platform",
      "solution",
      "innovation",
      "modern",
      "convenient",
      "efficient",
      "user-friendly",
      "helpful",
      "practical",
      "useful"
    ],
    
    // Optimized refresh rates by market
    refreshRate: config.refreshRate,
    
    // Enhanced targeting for international traffic
    targeting: {
      // Global targeting options
      location: "all",
      language: "all",
      gender: "all",
      ageGroup: "all",
      
      // Content rating for global compatibility
      maxAdContentRating: "G",
      tagForChildDirectedTreatment: false,
      tagForUnderAgeOfConsent: false,
      
      // International-friendly content categories
      contentCategories: [
        "general",
        "business",
        "technology",
        "lifestyle",
        "productivity",
        "utilities",
        "education",
        "entertainment"
      ],
      
      // Exclude problematic categories
      excludeCategories: [
        "adult",
        "violence",
        "profanity",
        "gambling",
        "alcohol",
        "tobacco"
      ]
    },
    
    // Ad format preferences for international markets
    adFormats: {
      preferred: ["banner", "interstitial", "rewarded"],
      fallback: ["banner"],
      // Higher value formats for premium markets
      premium: config.priority === "high" ? ["interstitial", "rewarded"] : ["banner"]
    },
    
    // Market-specific optimizations
    marketOptimizations: {
      // High-value markets get more aggressive targeting
      aggressiveTargeting: config.priority === "high",
      
      // Emerging markets get broader targeting
      broadTargeting: config.priority === "medium" || config.priority === "standard",
      
      // International compatibility
      internationalCompatible: true,
      
      // Local market inclusion
      includeLocalMarkets: true,
      
      // Global market inclusion
      includeGlobalMarkets: true
    }
  };
};

// Get optimized ad request for international traffic
export const getOptimizedInternationalAdRequest = (countryCode = 'DEFAULT') => {
  const config = getInternationalAdConfig(countryCode);
  
  return {
    keywords: config.keywords,
    requestNonPersonalizedAdsOnly: false,
    maxAdContentRating: config.targeting.maxAdContentRating,
    tagForChildDirectedTreatment: config.targeting.tagForChildDirectedTreatment,
    tagForUnderAgeOfConsent: config.targeting.tagForUnderAgeOfConsent,
    
    // Enhanced targeting for international markets
    gender: config.targeting.gender,
    location: config.targeting.location,
    language: config.targeting.language,
    ageGroup: config.targeting.ageGroup,
    
    // Content filtering for global compatibility
    contentCategories: config.targeting.contentCategories,
    excludeCategories: config.targeting.excludeCategories,
    
    // Ad format preferences
    preferredAdFormats: config.adFormats.preferred,
    fallbackAdFormats: config.adFormats.fallback,
    
    // Market optimizations
    ...config.marketOptimizations
  };
};

// Country detection utility (you can implement this based on your needs)
export const detectUserCountry = () => {
  // This is a placeholder - you can implement country detection
  // using device locale, IP geolocation, or other methods
  return 'DEFAULT';
};

// Get country-specific refresh rate
export const getCountryRefreshRate = (countryCode = 'DEFAULT') => {
  const config = COUNTRY_SPECIFIC_CONFIG[countryCode] || COUNTRY_SPECIFIC_CONFIG.DEFAULT;
  return config.refreshRate;
};

// Get country priority for ad optimization
export const getCountryPriority = (countryCode = 'DEFAULT') => {
  const config = COUNTRY_SPECIFIC_CONFIG[countryCode] || COUNTRY_SPECIFIC_CONFIG.DEFAULT;
  return config.priority;
};
