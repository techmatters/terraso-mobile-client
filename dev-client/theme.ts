import { extendTheme } from "native-base";

const newColorTheme = {
    primary: "#276749",
    background: "#FFFFFF",
    secondary: {
        "main": "#C05621"
    }
};

export const theme = extendTheme({ colors: newColorTheme});
