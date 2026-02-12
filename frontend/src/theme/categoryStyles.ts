/**
 * Category Styles - Single source of truth for category colors
 * Use this everywhere categories are displayed for consistency
 */

export interface CategoryStyle {
  id: string;
  name: string;
  icon: string;
  color: string;        // Primary/text color
  bgColor: string;      // Soft background for pills
  iconColor: string;    // Icon tint color
}

export const categoryStyles: Record<string, CategoryStyle> = {
  money: {
    id: 'money',
    name: 'Money',
    icon: 'cash-outline',
    color: '#059669',      // Emerald
    bgColor: '#D1FAE5',    // Emerald soft
    iconColor: '#059669',
  },
  work: {
    id: 'work',
    name: 'Work',
    icon: 'briefcase-outline',
    color: '#2563EB',      // Blue
    bgColor: '#DBEAFE',    // Blue soft
    iconColor: '#2563EB',
  },
  health: {
    id: 'health',
    name: 'Health',
    icon: 'heart-outline',
    color: '#DC2626',      // Red
    bgColor: '#FEE2E2',    // Red soft
    iconColor: '#DC2626',
  },
  home: {
    id: 'home',
    name: 'Home',
    icon: 'home-outline',
    color: '#D97706',      // Amber
    bgColor: '#FEF3C7',    // Amber soft
    iconColor: '#D97706',
  },
  tech: {
    id: 'tech',
    name: 'Tech',
    icon: 'hardware-chip-outline',
    color: '#7C3AED',      // Purple
    bgColor: '#EDE9FE',    // Purple soft
    iconColor: '#7C3AED',
  },
  school: {
    id: 'school',
    name: 'School',
    icon: 'school-outline',
    color: '#DB2777',      // Pink
    bgColor: '#FCE7F3',    // Pink soft
    iconColor: '#DB2777',
  },
  relationships: {
    id: 'relationships',
    name: 'Relationships',
    icon: 'people-outline',
    color: '#EA580C',      // Orange
    bgColor: '#FFEDD5',    // Orange soft
    iconColor: '#EA580C',
  },
  travel: {
    id: 'travel',
    name: 'Travel/Transport',
    icon: 'car-outline',
    color: '#0891B2',      // Cyan
    bgColor: '#CFFAFE',    // Cyan soft
    iconColor: '#0891B2',
  },
  services: {
    id: 'services',
    name: 'Services',
    icon: 'construct-outline',
    color: '#65A30D',      // Lime
    bgColor: '#ECFCCB',    // Lime soft
    iconColor: '#65A30D',
  },
  other: {
    id: 'other',
    name: 'Other',
    icon: 'ellipsis-horizontal-outline',
    color: '#6B7280',      // Gray
    bgColor: '#F3F4F6',    // Gray soft
    iconColor: '#6B7280',
  },
};

/**
 * Get category style by ID with fallback
 */
export function getCategoryStyle(categoryId: string): CategoryStyle {
  return categoryStyles[categoryId] || categoryStyles.other;
}

/**
 * Get all categories as array (useful for lists)
 */
export function getAllCategories(): CategoryStyle[] {
  return Object.values(categoryStyles).filter(c => c.id !== 'other');
}
