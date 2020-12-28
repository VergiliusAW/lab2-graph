let hiddenCanvas = document.getElementById("hc");
const holder = document.getElementById("drag-file");
let baseData;
let canvas;

const lc = document.getElementById("lc");
const norm = document.getElementById("norm");
const eg = document.getElementById("eg");
const inp = document.getElementById("input");

let minInp;
let maxInp;

lc.onclick = (e) => {
    clickTab(e);
    lcInputRender();
}

function lcInputRender() {
    let minL = getP("yMin")
    minInp = getInput("yMin");
    let maxL = getP("yMax");
    maxInp = getInput("yMax", 255)

    minInp.onchange = () => {
        setRange(minInp)
        lcFunc(parseInt(minInp.value), parseInt(maxInp.value), canvas, baseData)
    }
    maxInp.onchange = () => {
        setRange(maxInp)
        lcFunc(parseInt(minInp.value), parseInt(maxInp.value), canvas, baseData)
    }
    addElement(minL)
    addElement(minInp)
    addElement(maxL)
    addElement(maxInp)
}

norm.onclick = (e) => {
    clickTab(e);
    clean()
}
eg.onclick = (e) => {
    clickTab(e);
    clean();
}

/**
 * Выделение при селекте
 * @param e
 */
function clickTab(e) {
    lc.className = norm.className = eg.className = "tab";
    e.target.classList.add("selected")
}

/**
 * очистить див инпут
 */
function clean() {
    let list = inp.childNodes
    for (let index = list.length - 1; index >= 0; index--) {
        list[index].remove()
    }
}

/**
 * ограничение на ввод
 * @param element
 * @param min
 * @param max
 */
function setRange(element, min = 0, max = 255) {
    if (element.value < 0)
        element.value = 0;
    else if (element.value > 255)
        element.value = 255
}

/**
 * Получить новый инпут
 * @param id
 * @param defaultValue
 * @returns {HTMLInputElement}
 */
function getInput(id, defaultValue = 0) {
    let input = document.createElement("input");
    input.id = id;
    input.type = "number";
    input.value = defaultValue;
    return input;
}

/**
 * добавить элемент к диву инпут
 * @param element
 */
function addElement(element) {
    inp.appendChild(element)
}

/**
 * Получиь новый параграф
 * @param defaultValue
 * @returns {HTMLParagraphElement}
 */
function getP(defaultValue = "undefined") {
    let p = document.createElement("p");
    p.textContent = defaultValue;
    return p;
}

const save = document.getElementById("save");
save.onclick = () => {
    let promise = new Promise((resolve, reject) => {
        console.log(hiddenCanvas.width,hiddenCanvas.height)
        lcFunc(
            parseInt(minInp.value),
            parseInt(maxInp.value),
            hiddenCanvas,
            hiddenCanvas.getContext("2d").getImageData(0, 0, hiddenCanvas.width, hiddenCanvas.height).data
        )
        resolve(hiddenCanvas);
    })
    promise.then((can) => {
        can.toBlob(function (blob) {
            saveAs(blob, "pretty image.png");
        });
    })
    lcFunc(parseInt(minInp.value), parseInt(maxInp.value), canvas, baseData)
}

/**
 * значения по умолчанию
 * @type {number}
 */
let xMin = 0;
let xMax = 255;

holder.ondragover = () => {
    return false;
};

holder.ondragleave = () => {
    return false;
};

holder.ondragend = () => {
    return false;
};

holder.ondrop = (e) => {
    e.preventDefault();
    for (let f of e.dataTransfer.files) {
        console.log("File(s) you dragged here: ", f.path);

        let img = new Image();
        img.addEventListener("load", (e) => {
            console.log(img.naturalHeight);
            console.log(img.naturalWidth);
            const imgH = img.naturalHeight;
            const imgW = img.naturalWidth;
            hiddenCanvas.width = imgW;
            hiddenCanvas.height = imgH;
            hiddenCanvas.getContext("2d").drawImage(img, 0, 0, imgW, imgH);
            let ctx = canvas.getContext("2d");
            const height = imgH < imgW ? 375 * (imgH / imgW) : 375;
            const width = imgH > imgW ? 375 * (imgW / imgH) : 375;
            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);
            const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
            baseData = data.data;
            let c = 0;
            let v = calcLightness(baseData[c * 4], baseData[c * 4 + 1], baseData[c * 4 + 2]);
            xMin = xMax = v;
            c++;
            for (c; c < height * width; c++) {
                let v = calcLightness(baseData[c * 4], baseData[c * 4 + 1], baseData[c * 4 + 2]);
                if (xMin > v) xMin = v;
                else if (xMax < v) xMax = v;
            }
            console.log(xMin, xMax)
        });

        try {
            holder.style.border = "3px solid transparent";
            let child = document.getElementById("p");
            child.parentNode.removeChild(child);
            canvas = document.createElement("canvas");
            canvas.setAttribute("id", "canvas");
            holder.appendChild(canvas);
            img.src = f.path;
        } catch {
            canvas = document.getElementById("canvas");
            canvas
                .getContext("2d")
                .clearRect(0, 0, canvas.width, canvas.height);
            img.src = f.path;
        }
    }
    return false;
};

/**
 * Линейное контрастинирование для canvas
 * @param yMin
 * @param yMax
 * @param cav
 * @param bD
 */
function lcFunc(yMin, yMax, cav, bD) {
    const ctx = cav.getContext("2d");
    const data = ctx.getImageData(0, 0, cav.width, cav.height);
    let d = data.data;
    for (let c = 0; c < (cav.width * cav.height); c++) {
        let r = bD[c * 4]
        let g = bD[c * 4 + 1]
        let b = bD[c * 4 + 2]
        let y = (((calcLightness(r, g, b) - xMin) / (xMax - xMin)) * (yMax - yMin) + yMin) / 255;
        let co = RGBtoHSL(r, g, b);
        let converted = HSLtoRGB(co.h, co.s, Math.round(y * 100));
        d[c * 4] = converted.r;
        d[c * 4 + 1] = converted.g;
        d[c * 4 + 2] = converted.b;
        d[c * 4 + 3] = 255;
    }
    ctx.putImageData(data, 0, 0, 0, 0, cav.width, cav.height)
}

/**
 * калькулировать яркость
 * @param r
 * @param g
 * @param b
 * @returns {number}
 */
function calcLightness(r, g, b) {
    return 0.299 * r + 0.587 * g + 0.114 * b;
}

const RGB_MAX = 255;
const HUE_MAX = 360;
const SV_MAX = 100;

/**
 * Конвертация RGB в HSL
 * @param r
 * @param g
 * @param b
 * @returns {{s: number, h: number, l: number}}
 * @constructor
 */
function RGBtoHSL(r, g, b) {
    if (typeof r === 'object') {
        const args = r
        r = args.r;
        g = args.g;
        b = args.b;
    }
    r = (r === RGB_MAX) ? 1 : (r % RGB_MAX / parseFloat(RGB_MAX))
    g = (g === RGB_MAX) ? 1 : (g % RGB_MAX / parseFloat(RGB_MAX))
    b = (b === RGB_MAX) ? 1 : (b % RGB_MAX / parseFloat(RGB_MAX))

    let max = Math.max(r, g, b)
    let min = Math.min(r, g, b)
    let h, s, l = (max + min) / 2

    if (max === min) {
        h = s = 0 // achromatic
    } else {
        let d = max - min
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
        switch (max) {
            case r:
                h = (g - b) / d + (g < b ? 6 : 0)
                break
            case g:
                h = (b - r) / d + 2
                break
            case b:
                h = (r - g) / d + 4
                break
        }
        h /= 6
    }

    return {
        h: Math.round(h * HUE_MAX),
        s: Math.round(s * SV_MAX),
        l: Math.round(l * SV_MAX)
    }
}

/**
 * Конвертация HSL в RGB
 * @param h
 * @param s
 * @param l
 * @returns {{r: number, b: number, g: number}}
 * @constructor
 */
function HSLtoRGB(h, s, l) {
    if (typeof h === 'object') {
        const args = h
        h = args.h;
        s = args.s;
        l = args.l;
    }

    let r, g, b

    h = _normalizeAngle(h)
    h = (h === HUE_MAX) ? 1 : (h % HUE_MAX / parseFloat(HUE_MAX))
    s = (s === SV_MAX) ? 1 : (s % SV_MAX / parseFloat(SV_MAX))
    l = (l === SV_MAX) ? 1 : (l % SV_MAX / parseFloat(SV_MAX))

    if (s === 0) {
        r = g = b = l
    } else {
        let q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        let p = 2 * l - q;
        r = _hue2Rgb(p, q, h + 1 / 3)
        g = _hue2Rgb(p, q, h)
        b = _hue2Rgb(p, q, h - 1 / 3)
    }

    return {
        r: Math.round(r * RGB_MAX),
        g: Math.round(g * RGB_MAX),
        b: Math.round(b * RGB_MAX),
    }
}

/**
 * Конвертация RGB в HSI
 * @param {*} R 
 * @param {*} G 
 * @param {*} B 
 */
function RGBtoHSI(R, G, B) {
    var r, g, b, h, s, i;
    r = R / RGB_MAX;
    g = G / RGB_MAX;
    b = B / RGB_MAX;
    i = (r + g + b) / 3;
    
    if (R == G && G == B){
        s = h = 0;
    }
    else {
        w = (r - g + r - b) / Math.sqrt((r - g) * (r - g) + (r - b) * (g - b)) / 2;
        h = Math.acos(w) * 180 / PI;

        if (b > g)
            h = 360 - h;

        s = 1 - Math.min(r, g, b) / i;
    }

    return [h, s, i];
}

/**
 * Конвертация HSI в RGB
 * @param {*} h 
 * @param {*} s 
 * @param {*} i 
 */
function HSItoRGB(h, s, i) {
    var r, g, b, z, x;
    z = (1 - s) /3;

    function x(h) {
        return (1 + s * cos(h) / cos(60 - h)) / 3;
    }

    if (h < 0) {
        return [0, 0, 0];
    }
    else if (h <= 120) {
        b = z;
        r = x(h);
        g = 1 - r - b;
    }
    else if (h <= 240) {
        g = x(h - 120);
        r = z;
        b = 1 - r - g;
    }
    else if (h <= 360) {
        b = x(h - 240);
        g = z;
        r= 1 - g - b;
    }
    else {
        r = g = b = 0;
    }

    return [Math.round(i * r * 765), Math.round(i * g * 765), Math.round(i * b * 765)];
}

/**
 * Вынесенная логика
 * @param p
 * @param q
 * @param t
 * @returns {*}
 * @private
 */
function _hue2Rgb(p, q, t) {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
}

/**
 * Вынесенное вычисление
 * @param degrees
 * @returns {number}
 * @private
 */
function _normalizeAngle(degrees) {
    return (degrees % 360 + 360) % 360;
}