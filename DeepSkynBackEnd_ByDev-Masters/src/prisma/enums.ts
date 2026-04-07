// Enums pour les types de peau
export enum SkinType {
  DRY = 'dry',
  OILY = 'oily',
  COMBINATION = 'combination',
  NORMAL = 'normal',
  SENSITIVE = 'sensitive',
}

// Enums pour les types de notification
export enum NotificationType {
  INFO = 'info',
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error',
}

// Enums pour les rôles utilisateur
export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
}

// Enums pour les types de routine
export enum RoutineType {
  AM = 'AM',
  PM = 'PM',
  WEEKLY = 'weekly',
}

// Enums pour les statuts d'analyse
export enum AnalysisStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

// Enums pour les plans d'abonnement
export enum SubscriptionPlan {
  FREE = 'free',
  PREMIUM = 'premium',
  PREMIUM_YEARLY = 'premium_yearly',
}

// Enums pour les statuts d'abonnement
export enum SubscriptionStatus {
  ACTIVE = 'active',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
  PENDING = 'pending',
}

// Problèmes de peau courants
export enum SkinConcern {
  ACNE = 'acne',
  WRINKLES = 'wrinkles',
  HYPERPIGMENTATION = 'hyperpigmentation',
  DRYNESS = 'dryness',
  REDNESS = 'redness',
  DARK_CIRCLES = 'dark_circles',
  PORES = 'pores',
  FINE_LINES = 'fine_lines',
  UNEVEN_TEXTURE = 'uneven_texture',
  DULLNESS = 'dullness',
}

// Sensibilités cutanées
export enum SkinSensitivity {
  FRAGRANCES = 'fragrances',
  ALCOHOL = 'alcohol',
  ESSENTIAL_OILS = 'essential_oils',
  SULFATES = 'sulfates',
  PARABENS = 'parabens',
  RETINOIDS = 'retinoids',
  VITAMIN_C = 'vitamin_c',
  AHA = 'aha',
  BHA = 'bha',
}
