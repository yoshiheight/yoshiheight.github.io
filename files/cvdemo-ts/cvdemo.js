"use strict";
var CvDemo;
(function (CvDemo) {
    class DemoApp {
        constructor() {
            this._imgSrc = null;
            this._canvasDst = document.querySelector("#demo-canvas-dst");
            this._checkGamma = document.querySelector("#demo-check-gamma");
            this._rangeGamma = document.querySelector("#demo-range-gamma");
            this._spanGamma = document.querySelector("#demo-span-gamma");
            this._checkContrast = document.querySelector("#demo-check-contrast");
            this._rangeContrast = document.querySelector("#demo-range-contrast");
            this._spanContrast = document.querySelector("#demo-span-contrast");
            this._checkSharpness = document.querySelector("#demo-check-sharpness");
            this._rangeSharpness = document.querySelector("#demo-range-sharpness");
            this._spanSharpness = document.querySelector("#demo-span-sharpness");
            this._checkMosaic = document.querySelector("#demo-check-mosaic");
            this._rangeMosaic = document.querySelector("#demo-range-mosaic");
            this._spanMosaic = document.querySelector("#demo-span-mosaic");
            this._checkDithering = document.querySelector("#demo-check-dithering");
            this._checkGrayscale = document.querySelector("#demo-check-grayscale");
            this._checkBinary = document.querySelector("#demo-check-binary");
            this._checkCenter = document.querySelector("#demo-check-center");
        }
        start() {
            document.querySelector("#demo-loading-progress").style.display = "none";
            document.querySelector("#demo-root").style.display = "inline";
            const targets = document.querySelectorAll("#demo-root input");
            for (const target of targets) {
                target.addEventListener("change", () => {
                    if (this._imgSrc?.complete) {
                        this.refreshGui();
                        this.processCv();
                    }
                });
            }
            this._imgSrc = document.createElement("img");
            this._imgSrc.onload = () => {
                this.refreshGui();
                this.processCv();
            };
            this._imgSrc.src = "/files/cvdemo-ts/test.jpg?v=9b6b4392aa42418fbdeae5f6607ff23c";
            document.querySelector("#demo-img-src-wrapper").appendChild(this._imgSrc);
        }
        refreshGui() {
            this._rangeGamma.disabled = !this._checkGamma.checked;
            this._spanGamma.textContent = this._rangeGamma.value;
            this._rangeContrast.disabled = !this._checkContrast.checked;
            this._spanContrast.textContent = this._rangeContrast.value;
            this._rangeSharpness.disabled = !this._checkSharpness.checked;
            this._spanSharpness.textContent = this._rangeSharpness.value;
            this._rangeMosaic.disabled = !this._checkMosaic.checked;
            this._spanMosaic.textContent = this._rangeMosaic.value;
            const targets = document.querySelectorAll("#demo-require-grayscaled input");
            for (const target of targets) {
                target.disabled = !this._checkGrayscale.checked;
            }
        }
        processCv() {
            const imageProc = new ImageProc(cv.imread(this._imgSrc));
            try {
                if (this._checkGamma.checked) {
                    imageProc.gamma(this._rangeGamma.valueAsNumber);
                }
                if (this._checkContrast.checked) {
                    imageProc.contrast(this._rangeContrast.valueAsNumber);
                }
                if (this._checkSharpness.checked) {
                    imageProc.sharpness(this._rangeSharpness.valueAsNumber);
                }
                if (this._checkMosaic.checked) {
                    imageProc.mosaic(this._rangeMosaic.valueAsNumber);
                }
                if (this._checkDithering.checked) {
                    imageProc.dithering();
                }
                if (this._checkGrayscale.checked) {
                    imageProc.colorToGray();
                    if (this._checkBinary.checked) {
                        imageProc.binary();
                    }
                    if (this._checkCenter.checked) {
                        imageProc.drawCenterOfMoments();
                    }
                }
                cv.imshow(this._canvasDst, imageProc.mat);
            }
            finally {
                imageProc.dispose();
            }
        }
    }
    class ImageProc {
        constructor(_mat) {
            this._mat = _mat;
            this._disposed = false;
        }
        get mat() { return this._mat; }
        dispose() {
            if (!this._disposed) {
                this._mat.delete();
                this._disposed = true;
            }
        }
        gamma(value) {
            const GV = 1.0 / value;
            const lut = ImageProc.createLut(i => {
                return Math.pow(i / 255.0, GV) * 255.0;
            });
            this.applyFunc((row, col, value) => lut[value]);
        }
        contrast(value) {
            const lut = ImageProc.createLut(i => {
                return 255.0 / (1 + Math.exp(-value * (i - 128) / 255.0));
            });
            this.applyFunc((row, col, value) => lut[value]);
        }
        sharpness(value) {
            this.exchange(dst => {
                value = value / 9.0;
                const kernelData = [
                    -value, -value, -value,
                    -value, 1 + (8 * value), -value,
                    -value, -value, -value,
                ];
                const kernel = cv.matFromArray(3, 3, cv.CV_64F, kernelData);
                cv.filter2D(this._mat, dst, -1, kernel);
            });
        }
        mosaic(value) {
            const ROWS = this._mat.rows;
            const COLS = this._mat.cols;
            this.exchange(dst => {
                const dstSize = new cv.Size(0, 0);
                const ratio = 1.0 / value;
                cv.resize(this._mat, dst, dstSize, ratio, ratio, cv.INTER_NEAREST);
            });
            this.exchange(dst => {
                const dstSize = new cv.Size(COLS, ROWS);
                cv.resize(this._mat, dst, dstSize, 0, 0, cv.INTER_NEAREST);
            });
        }
        colorToGray() {
            this.exchange(dst => {
                cv.cvtColor(this._mat, dst, cv.COLOR_RGBA2GRAY, 0);
            });
        }
        grayToColor() {
            this.exchange(dst => {
                cv.cvtColor(this._mat, dst, cv.COLOR_GRAY2RGBA, 0);
            });
        }
        binary() {
            this.exchange(dst => {
                cv.threshold(this._mat, dst, 0.0, 255.0, cv.THRESH_BINARY | cv.THRESH_OTSU);
            });
        }
        dithering() {
            const matrix = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
            for (let i = 0; i < 4; i++) {
                for (let j = 0; j < 4; j++) {
                    matrix[i][j] *= 16;
                }
            }
            this.applyFunc((row, col, value) => {
                return (value < matrix[row % 4][col % 4]) ? 0 : 255;
            });
        }
        drawCenterOfMoments() {
            const center = this.getCenterOfMoments();
            this.grayToColor();
            this.fillCircle(center, 7, new cv.Scalar(255, 0, 0, 255));
        }
        fillCircle(point, radius, scalar) {
            cv.circle(this._mat, point, radius, scalar, -1, cv.LINE_AA);
        }
        getCenterOfMoments() {
            const moments = cv.moments(this._mat);
            return new cv.Point(moments.m10 / moments.m00, moments.m01 / moments.m00);
        }
        exchange(callback) {
            const dst = new cv.Mat();
            callback(dst);
            this._mat.delete();
            this._mat = dst;
        }
        applyFunc(callback) {
            if (!this._mat.isContinuous()) {
                throw "mat is not continuous.";
            }
            const ROWS = this._mat.rows;
            const COLS = this._mat.cols;
            const CHANNELS = this._mat.channels();
            const TARGET_CHANNELS = Math.min(CHANNELS, 3);
            let index = 0;
            let beforeIndex = 0;
            const data = this._mat.data;
            for (let row = 0; row < ROWS; row++) {
                beforeIndex = row * COLS * CHANNELS;
                for (let col = 0; col < COLS; col++) {
                    index = beforeIndex + (col * CHANNELS);
                    for (let ch = 0; ch < TARGET_CHANNELS; ch++) {
                        data[index + ch] = callback(row, col, data[index + ch]);
                    }
                }
            }
        }
        static createLut(callback) {
            const LENGTH = 256;
            const lut = new Array(LENGTH);
            for (let i = 0; i < LENGTH; i++) {
                lut[i] = Math.floor(callback(i));
            }
            return lut;
        }
    }
    const demoApp = new DemoApp();
    demoApp.start();
})(CvDemo || (CvDemo = {}));
//# sourceMappingURL=cvdemo.js.map