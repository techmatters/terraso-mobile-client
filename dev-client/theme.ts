import { extendTheme } from "native-base";

const newColorTheme = {
    primary: {
        main: "#276749",
        contrast: "#FFFFFF"
    },
    background: "#FFFFFF",
    secondary: {
        "main": "#C05621"
    }
};

export const theme = extendTheme({ colors: newColorTheme});
