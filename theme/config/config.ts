import {
  PaletteColorOptions,
  createTheme,
  PaletteOptions,
} from "@mui/material/styles";
import { Roboto, Dancing_Script } from "next/font/google";
import { APP_COLORS } from "../colors/colors";

const roboto = Roboto({
  weight: ["300", "400", "500", "700", "900"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  display: "swap",
});
const dancingScript = Dancing_Script({
  weight: ["400", "700", "600", "500"],
  style: ["normal"],
  subsets: ["latin"],
  display: "swap",
});

declare module "@mui/material/styles" {
  interface CustomPalette {
    milkWhite?: PaletteColorOptions;
    google?: PaletteColorOptions;
  }
  interface Palette extends CustomPalette {}
  interface PaletteOptions extends CustomPalette {}
  interface Theme extends CustomPalette {}
  interface ThemeOptions extends CustomPalette {}
}

// Override button props
declare module "@mui/material/Button" {
  interface ButtonPropsColorOverrides {
    milkWhite: true;
    google: true;
  }
}
export type AllowedTheme = NonNullable<PaletteOptions["mode"]>;
export const DEFAULT_THEME: AllowedTheme = "dark";
const defaultTheme = createTheme({});
const { augmentColor } = defaultTheme.palette;
const createColor = (mainColor: any) =>
  augmentColor({
    color: {
      main: mainColor,
    },
  });
export const lightTheme = createTheme({
  palette: {
    text: {
      secondary: APP_COLORS.TEXT_SECONDARY_COLOR,
    },
    primary: { main: APP_COLORS.PRIMARY_COLOR },
    secondary: { main: APP_COLORS.SECONDARY_COLOR },
    mode: "light",
    milkWhite: createColor(APP_COLORS.WHITE),
    google: createColor(APP_COLORS.GOOGLE),
  },
  typography: {
    fontFamily: [roboto.style.fontFamily].join(","),
    h1: {
      fontSize: 30,
      fontWeight: 700,
      lineHeight: "39px",
    },

    h2: {
      fontFamily: dancingScript.style.fontFamily,
      
    },

    subtitle1: {
      fontSize: 24,
      lineHeight: "28px",
      fontWeight: 500,
    },
    subtitle2: {
      fontSize: 18,
      lineHeight: "28px",
      fontWeight: 600,
    },
    body1: {
      fontSize: 16,
      lineHeight: "24px",
      letterSpacing: "0.5px",
    },
    caption: {
      color: defaultTheme.palette.text.secondary,
    },
  },
  components: {
    MuiButton: {
      defaultProps: {
        disableElevation: true,
        variant: "contained",
        color: "primary",
        fullWidth: true,
        size: "large",
      },
      styleOverrides: {
        root: {
          textTransform: "none",
        },
        sizeLarge: {
          height: 50,
        },
        containedPrimary: {
          color: defaultTheme.palette.common.white,
          fontSize: 16,
          fontWeight: 500,
        },
        outlinedInherit: {
          border: `1px solid ${defaultTheme.palette.divider}`,
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        size: "medium",
      },
      styleOverrides: {},
    },
    MuiAppBar: {
      defaultProps: {
        color: "inherit",
        elevation: 0,
      },
      styleOverrides: {
        root: {
          minHeight: `70px !important`,
        },
        colorInherit: {
          borderBottom: `1px solid ${defaultTheme.palette.divider}`,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontSize: 16,
          lineHeight: "20px",
          letterSpacing: 0.1,
        },
      },
    },
  },
});
