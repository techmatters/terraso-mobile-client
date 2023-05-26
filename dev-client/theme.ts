import { extendTheme } from "native-base";

const newColorTheme = {
    primary: {
        main: "#276749",
        contrast: "#FFFFFF"
    },
    background: "#FFFFFF",
    secondary: {
        "main": "#C05621"
    },
    actions: {
        "active": "#1A202C"
    }
};

export const theme = extendTheme({ colors: newColorTheme});
