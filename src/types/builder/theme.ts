export interface BuilderTypographySlot {
  fontFamily: string;
  fontSize: string;
  fontWeight: string;
  lineHeight: string;
  letterSpacing?: string;
}

export interface BuilderColorRamp {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
}

export interface BuilderThemeColors {
  primary: BuilderColorRamp;
  secondary: BuilderColorRamp;
  accent: BuilderColorRamp;
  neutral: BuilderColorRamp;
  success: BuilderColorRamp;
  warning: BuilderColorRamp;
  error: BuilderColorRamp;
}

export interface BuilderSpacingScale {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
  '3xl': string;
}

export interface BuilderRadiusProfile {
  none: string;
  sm: string;
  md: string;
  lg: string;
  full: string;
}

export interface BuilderShadowProfile {
  none: string;
  sm: string;
  md: string;
  lg: string;
}

export interface BuilderThemeDefinition {
  id: string;
  name: string;
  description: string;
  colors: BuilderThemeColors;
  typography: {
    heading: BuilderTypographySlot;
    subheading: BuilderTypographySlot;
    body: BuilderTypographySlot;
    caption: BuilderTypographySlot;
    label: BuilderTypographySlot;
  };
  spacing: BuilderSpacingScale;
  radius: BuilderRadiusProfile;
  shadow: BuilderShadowProfile;
  backgroundStyle: 'flat' | 'subtle-texture' | 'gradient';
}

export interface BuilderSectionStyleOverrideSchema {
  sectionId: string;
  backgroundColor?: string;
  textColor?: string;
  paddingTop?: string;
  paddingBottom?: string;
  customCss?: string;
}
