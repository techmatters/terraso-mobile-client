import { extendTheme } from "native-base";

const newColorTheme = {
    primary: {
        main: "#276749",
        contrast: "#FFFFFF"
    },
    background: {
        default: "#FFFFFF"
    },
    secondary: {
        "main": "#C05621"
    },
    grey: {
        200: "#EEEEEE"
    },
    action: {
        "active": "#1A202C"
    }
};

export const theme = extendTheme({ colors: newColorTheme});
