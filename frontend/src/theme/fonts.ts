// Safe font style helper — prevents fontWeight + fontFamily conflicts on iOS
// In React Native, the weight is embedded in the font file name.
// NEVER combine fontWeight with these fontFamily values.

export const getFontStyle = (weight: '400' | '500' | '600' | '700') => {
  const map: Record<string, string> = {
    '400': 'PlusJakartaSans_400Regular',
    '500': 'PlusJakartaSans_500Medium',
    '600': 'PlusJakartaSans_600SemiBold',
    '700': 'PlusJakartaSans_700Bold',
  };
  return { fontFamily: map[weight] };
};

export const fontFamily = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
};
