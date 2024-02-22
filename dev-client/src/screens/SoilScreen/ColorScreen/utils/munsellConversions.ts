myApp.factory('CanvasService', function (ImageService) {
    ////Service to set card and soil canvases
    var xCard, yCard, xSoil, ySoil, cardImageData, soilImageData, inputValue, inputValueX, inputValueY, pixel;
    function setCard(x, y) {
        xCard = x;
        yCard = y;
    }
    function getxCard() {
      console.log("Canvas Service")
      return xCard;
    }

    function setSoil(x, y) {
        xSoil = x;
        ySoil = y;
    }
    function createCardCanvas(image, id) {
        var cardCanvas = document.getElementById(id);
        var cardContext = cardCanvas.getContext('2d');
        var currSampleSize = window.localStorage.getItem("SampleSize");
        var ImgHeight = parseInt(window.sessionStorage.getItem("ogHeight"));
        var ImgWidth = parseInt(window.sessionStorage.getItem("ogWidth"));
        if (currSampleSize == 'large') {
            inputValue = parseInt((45 * Math.min(ImgHeight, ImgWidth)) / 100); //1200;
            cardContext.drawImage(image, xCard - (inputValue / 2), yCard - (inputValue / 2), inputValue, inputValue, 0, 0, 100, 100);
            var getCardImageData = cardContext.getImageData(0, 0, inputValue, inputValue);
            pixel = inputValue * inputValue;
        }
        else if (currSampleSize == 'medium') {
            inputValue = parseInt((30 * Math.min(ImgHeight, ImgWidth)) / 100); //1200;
            cardContext.drawImage(image, xCard - (inputValue / 2), yCard - (inputValue / 2), inputValue, inputValue, 0, 0, 100, 100);
            var getCardImageData = cardContext.getImageData(0, 0, inputValue, inputValue);
            pixel = inputValue * inputValue;
        }
        else{
            inputValue = parseInt((15 * Math.min(ImgHeight, ImgWidth)) / 100); //1200;
            cardContext.drawImage(image, xCard - (inputValue / 2), yCard - (inputValue / 2), inputValue, inputValue, 0, 0, 100, 100);
            var getCardImageData = cardContext.getImageData(0, 0, inputValue, inputValue);
            pixel = inputValue * inputValue;
        }
        window.sessionStorage.setItem("inputValue", inputValue);
        cardImageData = getCardImageData.data;
    }

    function getCardImageData() {
        return cardImageData;
    }

    function createSoilCanvas(image, id) {
        var soilCanvas = document.getElementById(id);
        var soilContext = soilCanvas.getContext('2d');
        var currSampleSize = window.localStorage.getItem("SampleSize");
        if (currSampleSize == 'large') {
            soilContext.drawImage(image, xSoil - (inputValue / 2), ySoil - (inputValue / 2), inputValue, inputValue, 0, 0, 100, 100);
            var getSoilImageData = soilContext.getImageData(0, 0, inputValue, inputValue);
        }
            //else if (currShapeType == 'RectangleRadio')
        else if (currSampleSize == 'medium') {
            soilContext.drawImage(image, xSoil - (inputValue / 2), ySoil - (inputValue / 2), inputValue, inputValue, 0, 0, 100, 100);
            var getSoilImageData = soilContext.getImageData(0, 0, inputValue, inputValue);
        }
        else {
            soilContext.drawImage(image, xSoil - (inputValue / 2), ySoil - (inputValue / 2), inputValue, inputValue, 0, 0, 100, 100);
            var getSoilImageData = soilContext.getImageData(0, 0, inputValue, inputValue);
        }
        soilImageData = getSoilImageData.data;
    }

    function getSoilImageData() {
        return soilImageData;
    }

    function getPixelCount() {
        return pixel;
    }
    //Draw blank canvas
    function refreshCanvas(id) {
        var canvas = document.getElementById(id);
        var context = canvas.getContext('2d');
        context.clearRect(0, 0, canvas.width, canvas.height);
    }
    return {
        setCard: setCard,
        setSoil: setSoil,
        createCardCanvas: createCardCanvas,
        createSoilCanvas: createSoilCanvas,
        getCardImageData: getCardImageData,
        getSoilImageData: getSoilImageData,
        getPixelCount: getPixelCount,
        refreshCanvas: refreshCanvas,
    }
})


myApp.factory('ColorService', function (CanvasService) {
    var soilLAB, soilRGB, soilMunsell;
    //var soilHVC;
    var soilLABArray = [];
    function getColor() {        //Get image data from canvases
        var pixelCard = CanvasService.getCardImageData();
        var pixelSoil = CanvasService.getSoilImageData();
        //The size of the palette - the number of vboxes
        var colorCount = 16;
        //How "well" the median cut algorithm performs
        var quality = 1;
        //200px*200px canvas
        //var pixelCount = 40000;
        var pixelCount = CanvasService.getPixelCount();

        var getPalette = function (pixels, pixelCount, quality, colorCount) {
            //Transform pixel info from canvas so quantize can use it
            var pixelArray = [];

            for (var i = 0, offset, r, g, b, a; i < pixelCount; i = i + quality) {
                offset = i * 4;
                r = pixels[offset + 0];
                g = pixels[offset + 1];
                b = pixels[offset + 2];
                a = pixels[offset + 3];
                // If pixel is mostly opaque and not white
                if (a >= 125) {
                    if (!(r > 250 && g > 250 && b > 250)) {
                        pixelArray.push([r, g, b]);
                    }
                }
            }
            //Quantize.js performs median cut algorithm, and returns a palette of the "top 16" colors in the picture
            var cmap = MMCQ.quantize(pixelArray, colorCount);
            var palette = cmap ? cmap.palette() : null;
            return palette;
        };




        //Get the color palettes of both soil and card

        //PAM: wrap around getPalette to divide the image into 7 sub-images, output 7 sets of paletteCard and paletteSample
        var paletteCard = getPalette(pixelCard, pixelCount, quality, colorCount);
        //   var paletteCardSeven = getPaletteSeven(pixelCard, pixelCount, quality, colorCount);
        var paletteSample = getPalette(pixelSoil, pixelCount, quality, colorCount);

        /* Math to transform RGB to LAB
        Credit to Bruce Lindbloom
        http://www.brucelindbloom.com/index.html?UPLab.html
        */
        function RGBtoLAB(r, g, b) {
            function RGBtoXYZ(R, G, B) {
                //Observer. = 2°, Illuminant = D65
                var var_R = (R / 255);        //R from 0 to 255
                var var_G = (G / 255);        //G from 0 to 255
                var var_B = (B / 255);        //B from 0 to 255

                if (var_R > 0.04045)
                    var_R = Math.pow(((var_R + 0.055) / 1.055), 2.4);
                else
                    var_R = var_R / 12.92;

                if (var_G > 0.04045)
                    var_G = Math.pow(((var_G + 0.055) / 1.055), 2.4);
                else
                    var_G = var_G / 12.92;

                if (var_B > 0.04045)
                    var_B = Math.pow(((var_B + 0.055) / 1.055), 2.4);
                else
                    var_B = var_B / 12.92;

                var_R = var_R * 100;
                var_G = var_G * 100;
                var_B = var_B * 100;

                X = var_R * 0.4124 + var_G * 0.3576 + var_B * 0.1805;
                Y = var_R * 0.2126 + var_G * 0.7152 + var_B * 0.0722;
                Z = var_R * 0.0193 + var_G * 0.1192 + var_B * 0.9505;

                return [X, Y, Z];
            }

            function XYZtoLAB(x, y, z) {
                var refX = 95.047;
                var refY = 100.000;
                var refZ = 108.883;

                x = x / refX;
                y = y / refY;
                z = z / refZ;

                // Modify X
                if (x > 0.008856) {
                    x = Math.pow(x, (1 / 3));
                }
                else {
                    x = ((x * 7.787) + (16 / 116));
                }

                // Modify Y
                if (y > 0.008856) {
                    y = Math.pow(y, (1 / 3));
                }
                else {
                    y = ((y * 7.787) + (16 / 116));
                }

                // Modify Z
                if (z > 0.008856) {
                    z = Math.pow(z, (1 / 3));
                }
                else {
                    z = ((z * 7.787) + (16 / 116));
                }

                var l = ((116 * y) - 16);
                var a = (500 * (x - y));
                var b = (200 * (y - z));
                // Return LAB values in an array
                //toFixed()/1 easy way to round to 2 significant figures and return a number not a string
                return [l.toFixed(2) / 1, a.toFixed(2) / 1, b.toFixed(2) / 1];
            }
            var xyz = RGBtoXYZ(r, g, b);
            var lab = XYZtoLAB(xyz[0], xyz[1], xyz[2]);
            return {
                lab: lab
            };
        }

        //Functions used for testing - Instead of using the first vbox
        function cardRGBLab(palette, number) {
            r = palette[number][0];
            g = palette[number][1];
            b = palette[number][2];
            var rgb = [r, g, b];
            var lab = RGBtoLAB(r, g, b);
            return {
                rgb: rgb,
                lab: lab
            };
        }


        function lab2rgb(l, a, b) {
            var y = (l + 16) / 116,
                x = a / 500 + y,
                z = y - b / 200,
                r, g, b;

            x = 0.95047 * ((x * x * x > 0.008856) ? x * x * x : (x - 16 / 116) / 7.787);
            y = 1.00000 * ((y * y * y > 0.008856) ? y * y * y : (y - 16 / 116) / 7.787);
            z = 1.08883 * ((z * z * z > 0.008856) ? z * z * z : (z - 16 / 116) / 7.787);

            r = x * 3.2406 + y * -1.5372 + z * -0.4986;
            g = x * -0.9689 + y * 1.8758 + z * 0.0415;
            b = x * 0.0557 + y * -0.2040 + z * 1.0570;

            r = (r > 0.0031308) ? (1.055 * Math.pow(r, 1 / 2.4) - 0.055) : 12.92 * r;
            g = (g > 0.0031308) ? (1.055 * Math.pow(g, 1 / 2.4) - 0.055) : 12.92 * g;
            b = (b > 0.0031308) ? (1.055 * Math.pow(b, 1 / 2.4) - 0.055) : 12.92 * b;

            return [Math.max(0, Math.min(1, r)) * 255,
                    Math.max(0, Math.min(1, g)) * 255,
                    Math.max(0, Math.min(1, b)) * 255]
        }//lab2rgb

        //Correction values obtain from spectrophotometer Observer. = 2°, Illuminant = D65
        function sampleRGBLab(paletteCard,numberCard,paletteSample,numberSample) {
            var currColorStandard = window.localStorage.getItem("ColorStandard");
            var currUserInputType = window.sessionStorage.getItem("UserInputType");
            var trueR, trueG, trueB;
            if (currColorStandard == 'CameraTrax') {
                trueR = 210.15;
                trueG = 213.95;
                trueB = 218.42;
            }//CameraTrax
            else if (currColorStandard == '3MYellow') {
                trueR = 249.92;
                trueG = 242.07;
                trueB = 161.42;
            }//3MYellow
            else if (currColorStandard == 'UserInput') {
                if (currUserInputType == 'UserRGB') {
                    trueR = parseInt(window.sessionStorage.getItem("RValue"));
                    trueG = parseInt(window.sessionStorage.getItem("GValue"));
                    trueB = parseInt(window.sessionStorage.getItem("BValue"));
                }//if (UserInputType == 'UserRGB')
                else if (currUserInputType == 'UserLAB') {
                    trueL = parseInt(window.sessionStorage.getItem("RValue"));
                    trueA = parseInt(window.sessionStorage.getItem("GValue"));
                    trueB = parseInt(window.sessionStorage.getItem("BValue"));
                    var UserLABInput = lab2rgb(trueL, trueA, trueB);
                    trueR = UserLABInput[0];
                    trueG = UserLABInput[1];
                    trueB = UserLABInput[2];
                }//else if (currColorStandard == 'UserLAB')
                else {
                    trueH = window.sessionStorage.getItem("RValue");
                    trueV = window.sessionStorage.getItem("GValue");
                    trueC = window.sessionStorage.getItem("BValue");
                    var UserMunsellInput = munsell2rgb(trueH, trueV, trueC);
                    trueR = parseInt(255*UserMunsellInput[0]);
                    trueG = parseInt(255*UserMunsellInput[1]);
                    trueB = parseInt(255*UserMunsellInput[2]);
                }//munsell
            }//UserInput
            else {
                trueR = 192.96;
                trueG = 192.00;
                trueB = 191.74;
            }//whibal

            var rCorrection = trueR / paletteCard[numberCard][0];
            var gCorrection = trueG / paletteCard[numberCard][1];
            var bCorrection = trueB / paletteCard[numberCard][2];
            var r = rCorrection * paletteSample[numberSample][0];
            var g = gCorrection * paletteSample[numberSample][1];
            var b = bCorrection * paletteSample[numberSample][2];

            var lab = RGBtoLAB(r, g, b).lab;
            var rgb = [r.toFixed(2) / 1, g.toFixed(2) / 1, b.toFixed(2) / 1];
            var rgbRaw = [paletteSample[numberSample][0], paletteSample[numberSample][1], paletteSample[numberSample][2]];
            return {
                rgb: rgb,
                lab: lab,
                rgbRaw: rgbRaw
            };
        }

        var card = cardRGBLab(paletteCard, 0);
        var sample = sampleRGBLab(paletteCard,0,paletteSample,0);
        //  var sample = sampleRGBLab(paletteCardSeven, paletteCard, 0, paletteSample, 0);
        //Push lab to array for later use in improving results
        soilLABArray.push(sample.lab[0]);
        soilLABArray.push(sample.lab[1]);
        soilLABArray.push(sample.lab[2]);
        //
        soilRGB = sample.rgb[0].toFixed(0) + ",  " + sample.rgb[1].toFixed(0) + ",  " + sample.rgb[2].toFixed(0);
        soilLAB = sample.lab[0] + ",  " + sample.lab[1] + ",  " + sample.lab[2];
        var l = sample.lab[0];
        var cab = (Math.sqrt((Math.pow(sample.lab[1], 2)) + (Math.pow(sample.lab[2], 2))));
        var hab = Math.atan2((sample.lab[2]), (sample.lab[1]));
        soilMunsell = LAB2Munsell(l, cab, hab);

        function LAB2Munsell(l, cab, hab) {

            var habDegrees = (180 / Math.PI) * hab;
            habDegrees = habDegrees % 360;
            // The Munsell hues are assumed to be evenly spaced on a circle, with 5Y at 90 degrees, 5G at 162 degrees, and so on.  Each letter code corresponds
            // to a certain sector of the circle.  The following cases extract the letter code.
            var HueLetterCode;
            if (habDegrees == 0)
                HueLetterCode = 8;
            else if (habDegrees <= 36)
                HueLetterCode = 7;
            else if (habDegrees <= 72)
                HueLetterCode = 6;
            else if (habDegrees <= 108)
                HueLetterCode = 5;
            else if (habDegrees <= 144)
                HueLetterCode = 4;
            else if (habDegrees <= 180)
                HueLetterCode = 3;
            else if (habDegrees <= 216)
                HueLetterCode = 2;
            else if (habDegrees <= 252)
                HueLetterCode = 1;
            else if (habDegrees <= 288)
                HueLetterCode = 10;
            else if (habDegrees <= 324)
                HueLetterCode = 9;
            else
                HueLetterCode = 8;

            // Each letter code is prefixed by a number greater than 0, and less than or equal to 10, that further specifies the hue.
            var HueNumber = ((10. / 36) * (habDegrees % 36)).toFixed(2);
            
            switch( true ) {
              case (HueNumber < 1.25) :
                  HueNumber = 10;
                  if (HueLetterCode == 10){
                    HueLetterCode = 0
                  } else {
                    HueLetterCode = HueLetterCode +1
                  }
                    break;
                case (HueNumber < 3.75) :
                  HueNumber = 2.5;
                    break;
                case (HueNumber < 6.25) :
                  HueNumber = 5;
                    break;
                case (HueNumber < 8.75) :
                  HueNumber = 7.5;
                    break;
                default :
                  HueNumber = 10;
            }

            var Value = Math.round((l / 10).toFixed(2));

            // Munsell value can be approximated very accurately with a simple division by 10 Value = L/10;
            //This Munsell chroma expression is a very rough approximation, but the best available
            var Chroma = Math.round((cab / 5).toFixed(2));

            // Assemble individual Munsell coordinates into one Munsell specification
            //var ColorLabMunsellVector = [HueNumber, Value, Chroma, HueLetterCode];
            // MunsellSpec = ColorLabFormatToMunsellSpec(ColorLabMunsellVector);
            var ColourLetters = ['B', 'BG', 'G', 'GY', 'Y', 'YR', 'R', 'RP', 'P', 'PB'];
            var output = HueNumber.toString() + ColourLetters[HueLetterCode - 1] + " " + Value.toString() + "/" + Chroma.toString();
            return output
        }//LAB2Munsell
    }
    //Average multiple soil touches to improve color
    function getAverageLAB() {
        var lSum = 0;
        var aSum = 0;
        var bSum = 0;
        for (var i = 0; i < soilLABArray.length; i += 3) {
            lSum += soilLABArray[i];
            aSum += soilLABArray[i + 1];
            bSum += soilLABArray[i + 2];
        }
        var lAvg = (lSum / (soilLABArray.length / 3));
        var aAvg = (aSum / (soilLABArray.length / 3));
        var bAvg = (bSum / (soilLABArray.length / 3));

        return [lAvg.toFixed(2) / 1, aAvg.toFixed(2) / 1, bAvg.toFixed(2) / 1];
    }
    function emptyArray() {
        soilLABArray = [];
    }
    function getLAB() {
        return soilLAB;
    }
    function getRGB() {
        return soilRGB;
    }
    function getMunsell() {
        return soilMunsell;
    }
    function getLABArray() {
        return soilLABArray;
    }
    function munsell2rgb(h, v, c) {
        var munsellInput = h + " " + v + " " + c;
        if (parseFloat(c) == 0) {
            v = 255 * (parseFloat(v) / 10);
            return [v, v, v]
        }

        var desxyy = table[munsellInput];
        if (typeof (desxyy) == 'undefined') {
           //var rgb_delinear = to_rgb_interpolate(h, v, c);
           return undefined
        } else {
            var rgb_linear = xyy_to_rgb_linear(desxyy[0], desxyy[1], desxyy[2]);
            var rgb_delinear = rgb_delinearize(rgb_linear);
        }


        return rgb_delinear
    }
    function rgb_delinearize(rgb) {
        var ans = [0, 0, 0];
        var counter = 0;
        for (x in rgb) {
            if (rgb[x] <= 0.0031308) {
                ans[counter] = 12.92 * rgb[x];
            }
            else {
                ans[counter] = 1.055 * Math.pow(rgb[x], 1.0 / 2.4) - 0.055;
            }
            counter = counter + 1;
        }
        return ans
    }//rgb_delinearize

    function xyy_to_rgb_linear(x, y, y2) {
        if (Math.abs(y) < 1e-100) {
            y = 1e-100;
        }
        y2 /= 100;
        var x2 = y2 * x / y;
        var z2 = y2 * (1 - x - y) / y;
        return [3.2406 * x2 - 1.5372 * y2 - 0.4986 * z2,
                -0.9689 * x2 + 1.8758 * y2 + 0.0415 * z2,
                0.0557 * x2 - 0.2040 * y2 + 1.0570 * z2]

    }//xyy_to_rgb_linear

    function to_rgb_interpolate(h,v,c){
      //var value = find_valid_value(h,v,c, direction);
      var mv = parseFloat(v);
      var parts = h.match(/([0-9]+)([A-Za-z]+)/);
      var step = parseFloat(parts[1]);
      var principal = parts[2];
      var step_above = valid_step(Math.ceil(step / 2.5) * 2.5);
      var ha = step_above.toString() + principal.toString();
      var ca = Math.max(parseFloat(Math.ceil(parseFloat(c) / 2.0) * 2), 2);

      var step_below = valid_step(Math.floor(step / 2.5) * 2.5);
      var hb = step_below.toString() + principal.toString();
      var cb = Math.max(parseFloat(Math.floor(parseFloat(c) / 2.0) * 2), 2);

       //rgb, difference factor
      var out01 = interpolate_munsell([ha, find_valid_value(ha, mv, ca, 1), ca], [hb, find_valid_value(hb, mv, ca, 1), ca], h,v,c);
      var a = out01[0];
      var ad = out01[1];
      var out02 = interpolate_munsell([ha, find_valid_value(ha, mv, ca, -1), ca], [hb, find_valid_value(hb, mv, ca, -1), ca], h,v,c);
      var b = out02[0];
      var bd = out02[1];
      var out03 = interpolate_munsell([ha, find_valid_value(ha, mv, cb, 1), cb], [hb, find_valid_value(hb, mv, cb, 1), cb], h,v,c);
      var cc = out03[0];
      var cd = out03[1];
      var out04 = interpolate_munsell([ha, find_valid_value(ha, mv, cb, -1), cb], [hb, find_valid_value(hb, mv, cb, -1), cb], h,v,c);
      var d = out04[0];
      var dd = out04[1];

      var out05 = interpolate_rgb(a, b, ad, bd);
      var e = out05[0];
      var ed = out05[1];
      var out06 = interpolate_rgb(cc, d, cd, dd);
      var f = out06[0];
      var fd = out06[1];
      return interpolate_rgb(f, e, ed, fd)[0]

    }
    function valid_step(step) {
        if (step > 10) {
            step = 10;
        } else if (step < 2.5) {
            step = 2.5;

        } else {
            step = step;
        }
        return step
    }

    function interpolate_munsell(a, b, h,v,c) {
        var step = parseFloat(h.match(/([0-9]+)([A-Za-z]+)/)[1]);
        var a1 = a[0];
        var b1 = b[0];
        var step_a = parseFloat(a1.match(/([0-9]+)([A-Za-z]+)/)[1]);
        var step_b = parseFloat(b1.match(/([0-9]+)([A-Za-z]+)/)[1]);
        var [hue_a, hue_b] = closness_factors(step_a, step_b, step);
        var [value_a, value_b] = closness_factors(a[1], b[1], parseFloat(v));
        var [chroma_a, chroma_b] = closness_factors(a[2], b[2], parseFloat(c));
        var closness_a = average_not_none([hue_a, value_a, chroma_a]);
        var closness_b = average_not_none([hue_b, value_b, chroma_b]);
        var total_diff = Math.abs(step - step_a) + Math.abs(step - step_b) + Math.abs(parseFloat(v) - parseFloat(a[1])) + Math.abs(parseFloat(v) - parseFloat(b[1])) + Math.abs(parseFloat(c) - parseFloat(a[2])) + Math.abs(parseFloat(c) - parseFloat(b[2]));

        var a_rgb = munsell2rgb(a[0], a[1].toString(), a[2].toString());
        var b_rgb = munsell2rgb(b[0], b[1].toString(), b[2].toString());
        var out1 = [0, 0, 0];
        for (i = 0; i < 3; i++) {
            var a1 = a_rgb[i];
            var b1 = b_rgb[i];
            out1[i] = a1 * closness_a + b1 * closness_b;
        }
        return [out1, total_diff]

    }

    function interpolate_rgb(a, b, ad, bd) {
        if (ad + bd == 0){
            var out = [0, 0, 0];
            for(i=0; i < 3; i++){
                out[i] = 0.5*(a[i] + b[i]);
            }
            return [out, 0]
        }
        if (ad == 0){
            return [a, 0]
        }
        if (bd == 0){
            return [b, 0]
        }

        var a_closness = bd / (ad + bd);
        var b_closness = ad / (ad + bd);
        var out2 = [0, 0, 0];
        for (i=0; i<3; i++){
            out2[i] = a[i]*a_closness + b[i]*b_closness;
        }
        return [out2, ad + bd]
    }

    function to_rgb_gray(a){
           var v = 255 * (a[2] / 10.0);
           return [v, v, v]
       }
//
    function average_not_none(a) {
       var not_none = [0, 0, 0];
       var sum = 0;
       var len = 0;
       for (i = 0; i < not_none.length; i++) {
           if ((typeof(a[i]) != 'undefined') && (a[i] != 'None')){
               not_none[i] = parseFloat(a[i]);
               sum = sum + not_none[i];
               len = len + 1;
           }
       }
       if (len > 0) {
           var out = sum / len;
           return out
       } else {
           return 0.5
       }
    }

    function closness_factors(a, b, orig) {
       if (a == b) {
           return ['None', 'None']
       } else {
           var total_diff = parseFloat(Math.abs(orig - a) + Math.abs(orig - b));
           return [Math.abs(orig - b) / total_diff, Math.abs(orig - a) / total_diff]
       }
    }


    function valid_step(step) {
       if (step > 10) {
           step = 10;
       } else if (step < 2.5) {
           step = 2.5;

       } else {
           step = step;
       }
       return step
    }

    function find_valid_value(hue,value,chroma, direction){
     var value = parseFloat(value);
     if (direction == 1){
       value = Math.ceil(5*value)/5.0;
     } else {
       value = Math.floor(5*value)/5.0;
     }
     //value = parseInt(value);
     var direction_changed = false;
     while (true){
       if ((value > 10) || (value < 0)){
         if (direction_changed){
           //alert('Trying to interpolate, but can not find a valid value attribute');
         }
         direction = -1*direction;
         direction_changed = true;
       }
       var munsellvalid = hue + " " + value.toString() + " " + chroma;
       if (typeof(table[munsellvalid]) != 'undefined'){
         return value
       }
       if ((value > 1 && direction == 1) || (value > 2)){
         value = value + direction;
         value = parseInt(value);
       } else {
         value = value + 0.2*direction;
         value = Math.round(value*10)/10.0;
         //if (direction == 1){
         //    value = Math.ceil(10*value)/10.0;
         //} else {
         //    value = Math.floor(10*value)/10.0;
         //}


       }

     }
    }

    /* Math to transform RGB to LAB
    Credit to Bruce Lindbloom
    http://www.brucelindbloom.com/index.html?UPLab.html
    */
    function RGBtoLAB(r, g, b) {
        function RGBtoXYZ(R, G, B) {
            //Observer. = 2°, Illuminant = D65
            var var_R = (R / 255);        //R from 0 to 255
            var var_G = (G / 255);        //G from 0 to 255
            var var_B = (B / 255);        //B from 0 to 255

            if (var_R > 0.04045)
                var_R = Math.pow(((var_R + 0.055) / 1.055), 2.4);
            else
                var_R = var_R / 12.92;

            if (var_G > 0.04045)
                var_G = Math.pow(((var_G + 0.055) / 1.055), 2.4);
            else
                var_G = var_G / 12.92;

            if (var_B > 0.04045)
                var_B = Math.pow(((var_B + 0.055) / 1.055), 2.4);
            else
                var_B = var_B / 12.92;

            var_R = var_R * 100;
            var_G = var_G * 100;
            var_B = var_B * 100;

            X = var_R * 0.4124 + var_G * 0.3576 + var_B * 0.1805;
            Y = var_R * 0.2126 + var_G * 0.7152 + var_B * 0.0722;
            Z = var_R * 0.0193 + var_G * 0.1192 + var_B * 0.9505;

            return [X, Y, Z];
        }

        function XYZtoLAB(x, y, z) {
            var refX = 95.047;
            var refY = 100.000;
            var refZ = 108.883;

            x = x / refX;
            y = y / refY;
            z = z / refZ;

            // Modify X
            if (x > 0.008856) {
                x = Math.pow(x, (1 / 3));
            }
            else {
                x = ((x * 7.787) + (16 / 116));
            }

            // Modify Y
            if (y > 0.008856) {
                y = Math.pow(y, (1 / 3));
            }
            else {
                y = ((y * 7.787) + (16 / 116));
            }

            // Modify Z
            if (z > 0.008856) {
                z = Math.pow(z, (1 / 3));
            }
            else {
                z = ((z * 7.787) + (16 / 116));
            }

            var l = ((116 * y) - 16);
            var a = (500 * (x - y));
            var b = (200 * (y - z));
            // Return LAB values in an array
            //toFixed()/1 easy way to round to 2 significant figures and return a number not a string
            return [l.toFixed(2) / 1, a.toFixed(2) / 1, b.toFixed(2) / 1];
        }
        var xyz = RGBtoXYZ(r, g, b);
        var lab = XYZtoLAB(xyz[0], xyz[1], xyz[2]);
        return {
            lab: lab
        };
    }

    function LAB2Munsell(l, cab, hab) {

            var habDegrees = (180 / Math.PI) * hab;
            habDegrees = habDegrees % 360;
            // The Munsell hues are assumed to be evenly spaced on a circle, with 5Y at 90 degrees, 5G at 162 degrees, and so on.  Each letter code corresponds
            // to a certain sector of the circle.  The following cases extract the letter code.
            var HueLetterCode;
            if (habDegrees == 0)
                HueLetterCode = 8;
            else if (habDegrees <= 36)
                HueLetterCode = 7;
            else if (habDegrees <= 72)
                HueLetterCode = 6;
            else if (habDegrees <= 108)
                HueLetterCode = 5;
            else if (habDegrees <= 144)
                HueLetterCode = 4;
            else if (habDegrees <= 180)
                HueLetterCode = 3;
            else if (habDegrees <= 216)
                HueLetterCode = 2;
            else if (habDegrees <= 252)
                HueLetterCode = 1;
            else if (habDegrees <= 288)
                HueLetterCode = 10;
            else if (habDegrees <= 324)
                HueLetterCode = 9;
            else
                HueLetterCode = 8;

            // Each letter code is prefixed by a number greater than 0, and less than or equal to 10, that further specifies the hue.
            var HueNumber = ((10. / 36) * (habDegrees % 36)).toFixed(2);
            
            switch( true ) {
              case (HueNumber < 1.25) :
                  HueNumber = 10;
                  if (HueLetterCode == 10){
                    HueLetterCode = 0
                  } else {
                    HueLetterCode = HueLetterCode +1
                  }
                    break;
                case (HueNumber < 3.75) :
                  HueNumber = 2.5;
                    break;
                case (HueNumber < 6.25) :
                  HueNumber = 5;
                    break;
                case (HueNumber < 8.75) :
                  HueNumber = 7.5;
                    break;
                default :
                  HueNumber = 10;
            }

            var Value = Math.round((l / 10).toFixed(2));

            // Munsell value can be approximated very accurately with a simple division by 10 Value = L/10;
            //This Munsell chroma expression is a very rough approximation, but the best available
            var Chroma = Math.round((cab / 5).toFixed(2));

            // Assemble individual Munsell coordinates into one Munsell specification
            //var ColorLabMunsellVector = [HueNumber, Value, Chroma, HueLetterCode];
            // MunsellSpec = ColorLabFormatToMunsellSpec(ColorLabMunsellVector);
            var ColourLetters = ['B', 'BG', 'G', 'GY', 'Y', 'YR', 'R', 'RP', 'P', 'PB'];
            var output = HueNumber.toString() + ColourLetters[HueLetterCode - 1] + " " + Value.toString() + "/" + Chroma.toString();
            return output
        }//LAB2Munsell

        function lab2rgb(l, a, b) {
            var y = (l + 16) / 116,
                x = a / 500 + y,
                z = y - b / 200,
                r, g, b;

            x = 0.95047 * ((x * x * x > 0.008856) ? x * x * x : (x - 16 / 116) / 7.787);
            y = 1.00000 * ((y * y * y > 0.008856) ? y * y * y : (y - 16 / 116) / 7.787);
            z = 1.08883 * ((z * z * z > 0.008856) ? z * z * z : (z - 16 / 116) / 7.787);

            r = x * 3.2406 + y * -1.5372 + z * -0.4986;
            g = x * -0.9689 + y * 1.8758 + z * 0.0415;
            b = x * 0.0557 + y * -0.2040 + z * 1.0570;

            r = (r > 0.0031308) ? (1.055 * Math.pow(r, 1 / 2.4) - 0.055) : 12.92 * r;
            g = (g > 0.0031308) ? (1.055 * Math.pow(g, 1 / 2.4) - 0.055) : 12.92 * g;
            b = (b > 0.0031308) ? (1.055 * Math.pow(b, 1 / 2.4) - 0.055) : 12.92 * b;

            return [Math.max(0, Math.min(1, r)) * 255,
                    Math.max(0, Math.min(1, g)) * 255,
                    Math.max(0, Math.min(1, b)) * 255]
        }//lab2rgb


    return {
        getColor: getColor,
        getLAB: getLAB,
        getRGB: getRGB,
        getMunsell: getMunsell,
        getLABArray: getLABArray,
        getAvgLAB: getAverageLAB,
        emptyArray: emptyArray,
        munsell2rgb: munsell2rgb,
        RGBtoLAB: RGBtoLAB,
        LAB2Munsell: LAB2Munsell,
        lab2rgb: lab2rgb
    }
});