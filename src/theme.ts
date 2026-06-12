import {MD3LightTheme} from 'react-native-paper';

export const ORANGE = '#F57C00';
export const ORANGE_DARK = '#E65100';
export const ORANGE_LIGHT = '#FFE0B2';

export const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: ORANGE,
    primaryContainer: ORANGE_LIGHT,
    secondary: ORANGE_DARK,
  },
};
