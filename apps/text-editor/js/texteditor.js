"use strict";
var Sample;
(function (Sample) {
    var BlazorWasm;
    (function (BlazorWasm) {
        var TextEditor;
        (function (TextEditor) {
            class Font {
                get family() { return this._family; }
                get height() { return this._height; }
                static create(family, height) {
                    const font = new Font(family, height);
                    return TextEditor.JSObjectReference.create(font).id;
                }
                constructor(family, height) {
                    this._measureCharOffscreen = new TextEditor.Offscreen({ w: 1, h: 1 });
                    this._family = family;
                    this._height = height;
                    this._measureCharOffscreen.ctx2d.font = `normal ${this._height}pt '${this._family}'`;
                    this._measureCharOffscreen.ctx2d.textBaseline = "top";
                }
                measureChar(ch) {
                    const width = this._measureCharOffscreen.ctx2d.measureText(ch).width;
                    const heightInPixels = this._height / 72.0 * 96.0;
                    return {
                        width: width,
                        height: heightInPixels,
                    };
                }
                measureTextWidth(text) {
                    return this._measureCharOffscreen.ctx2d.measureText(text).width;
                }
            }
            TextEditor.Font = Font;
        })(TextEditor = BlazorWasm.TextEditor || (BlazorWasm.TextEditor = {}));
    })(BlazorWasm = Sample.BlazorWasm || (Sample.BlazorWasm = {}));
})(Sample || (Sample = {}));
var Sample;
(function (Sample) {
    var BlazorWasm;
    (function (BlazorWasm) {
        var TextEditor;
        (function (TextEditor) {
            class InputMethod {
                constructor(canvas, jsEvent) {
                    this._isJpInputting = false;
                    this._isPasting = false;
                    this._font = null;
                    this._offsetX = 0;
                    this._areaWidth = 0;
                    this._jsEvent = jsEvent;
                    this._imeDiv = document.createElement("div");
                    canvas.parentElement.appendChild(this._imeDiv);
                    this._textarea = document.createElement("textarea");
                    this._textarea.rows = 1;
                    this._imeDiv.appendChild(this._textarea);
                    this._imeDiv.style.left = "0px";
                    this._imeDiv.style.top = "0px";
                    this._imeDiv.style.width = "0px";
                    this._imeDiv.style.maxWidth = "0px";
                    this._imeDiv.style.height = "0px";
                    this._imeDiv.style.backgroundColor = "transparent";
                    this._imeDiv.style.position = "absolute";
                    this._imeDiv.style.overflow = "hidden";
                    this._imeDiv.style.zIndex = "-1";
                    this._imeDiv.style.margin = "0px";
                    this._imeDiv.style.padding = "0px";
                    this._textarea.style.left = "0px";
                    this._textarea.style.top = "0px";
                    this._textarea.style.width = "100px";
                    this._textarea.style.resize = "none";
                    this._textarea.style.position = "absolute";
                    this._textarea.style.outline = "none";
                    this._textarea.style.backgroundColor = "white";
                    this._textarea.style.border = "none";
                    this._textarea.style.margin = "0px";
                    this._textarea.style.padding = "0px";
                    this._textarea.addEventListener("focusin", () => this.onFocusIn());
                    this._textarea.addEventListener("focusout", () => this.onFocusOut());
                    this._textarea.addEventListener("compositionupdate", e => this.onCompositionUpdate(e));
                    this._textarea.addEventListener("compositionend", () => this.onCompositionEnd());
                    this._textarea.addEventListener("keydown", e => this.onKeyDown(e));
                    this._textarea.addEventListener("keyup", e => this.onKeyUp(e));
                    this._textarea.addEventListener("paste", () => this.onPaste());
                }
                onFocusIn() {
                    this._jsEvent.raiseAction("InputMethod.focusin", {});
                }
                onFocusOut() {
                    this._jsEvent.raiseAction("InputMethod.focusout", {});
                }
                onCompositionUpdate(e) {
                    this._isJpInputting = true;
                    const oe = e;
                    this._imeDiv.style.zIndex = "1";
                    const width = this._font.measureTextWidth(oe.data);
                    this._textarea.style.width = (width + 100) + "px";
                    this._imeDiv.style.width = (this._offsetX + width + 5) + "px";
                    $(this._imeDiv).scrollLeft(0);
                    const args = {
                        inputKey: "CompositionUpdating",
                        isCtrl: false,
                        isShift: false,
                        isAlt: false,
                    };
                    if (this._jsEvent.raiseFunc("InputMethod.inputKey", args).handled) {
                        e.preventDefault();
                        e.stopPropagation();
                    }
                }
                onCompositionEnd() {
                    this._isJpInputting = false;
                    this._jsEvent.raiseAction("InputMethod.inputText", { text: this._textarea.value });
                    this._textarea.value = "";
                    this._textarea.style.width = "100px";
                    $(this._imeDiv).scrollLeft(0);
                    this._imeDiv.style.zIndex = "-1";
                }
                onKeyDown(e) {
                    if (this._isPasting) {
                        e.preventDefault();
                        e.stopPropagation();
                        return;
                    }
                    if (this._isJpInputting) {
                        return;
                    }
                    if (e.ctrlKey && e.key.toLowerCase() === "v") {
                        return;
                    }
                    this._textarea.value = "";
                    if (e.key !== "Process") {
                        const args = {
                            inputKey: e.key,
                            isCtrl: e.ctrlKey,
                            isShift: e.shiftKey,
                            isAlt: e.altKey,
                        };
                        if (this._jsEvent.raiseFunc("InputMethod.inputKey", args).handled) {
                            e.preventDefault();
                            e.stopPropagation();
                        }
                    }
                    else if (e.code === "Space") {
                        this._jsEvent.raiseAction("InputMethod.inputText", { text: "　" });
                        e.preventDefault();
                        e.stopPropagation();
                    }
                }
                onKeyUp(e) {
                    if (this._isPasting) {
                        e.preventDefault();
                        e.stopPropagation();
                        return;
                    }
                    if (this._isJpInputting) {
                        return;
                    }
                    let handled = false;
                    if (e.key !== "Process") {
                        handled = true;
                    }
                    else if (e.code === "Space") {
                        handled = true;
                        this._textarea.value = "";
                    }
                    if (handled) {
                        e.preventDefault();
                        e.stopPropagation();
                    }
                }
                onPaste() {
                    if (this._isPasting) {
                        return;
                    }
                    this._isPasting = true;
                    let retryCount = 0;
                    let timerId = -1;
                    timerId = window.setInterval(() => {
                        const text = this._textarea.value;
                        if (text.length > 0 || retryCount++ >= 10) {
                            this._isPasting = false;
                            window.clearInterval(timerId);
                            if (text.length > 0) {
                                this._textarea.value = "";
                                TextEditor.processStringToUTF8(text, (ptr, len) => {
                                    this._jsEvent.raiseAction("InputMethod.paste", { ptr, len });
                                });
                            }
                        }
                    }, 10);
                }
                setClipboardText(ptr, len) {
                    const text = UTF8ToString(ptr, len);
                    if (text.length > 0) {
                        this._textarea.value = text;
                        this._textarea.select();
                        document.execCommand("copy");
                        this._textarea.value = "";
                    }
                }
                focus() {
                    this._textarea.focus();
                }
                setArea(area, caretLocation) {
                    this._offsetX = caretLocation.x - area.x;
                    this._areaWidth = area.w;
                    this._textarea.style.left = (caretLocation.x - area.x) + "px";
                    this._textarea.style.top = (caretLocation.y - area.y) + "px";
                    this._imeDiv.style.left = area.x + "px";
                    this._imeDiv.style.top = area.y + "px";
                    this._imeDiv.style.maxWidth = area.w + "px";
                    this._imeDiv.style.height = area.h + "px";
                    if (!this._isJpInputting) {
                        this._imeDiv.style.width = this._areaWidth + "px";
                    }
                }
                setFont(family, height, lineHeight) {
                    this._font = new TextEditor.Font(family, height);
                    this._textarea.style.fontFamily = `'${family}'`;
                    this._textarea.style.fontSize = `${height}pt`;
                    this._textarea.style.lineHeight = lineHeight + "px";
                    this._textarea.style.height = lineHeight + "px";
                }
            }
            TextEditor.InputMethod = InputMethod;
        })(TextEditor = BlazorWasm.TextEditor || (BlazorWasm.TextEditor = {}));
    })(BlazorWasm = Sample.BlazorWasm || (Sample.BlazorWasm = {}));
})(Sample || (Sample = {}));
var Sample;
(function (Sample) {
    var BlazorWasm;
    (function (BlazorWasm) {
        var TextEditor;
        (function (TextEditor) {
            class Offscreen {
                static create(size) {
                    const offscreen = new Offscreen(size);
                    return TextEditor.JSObjectReference.create(offscreen).id;
                }
                constructor(size) {
                    this.canvas = document.createElement("canvas");
                    this.ctx2d = this.canvas.getContext("2d", { alpha: false });
                    this.setSize(size.w, size.h);
                }
                resize(size) {
                    this.setSize(size.w, size.h);
                }
                setSize(width, height) {
                    this.canvas.width = Math.max(width, 1);
                    this.canvas.height = Math.max(height, 1);
                }
                callCommands(ptrUtf8Json, length) {
                    const json = UTF8ToString(ptrUtf8Json, length);
                    const parameter = JSON.parse(json);
                    for (const func of parameter.funcs) {
                        this[func.name](func.arg);
                    }
                }
                setColor(color) {
                    this.ctx2d.fillStyle = color;
                }
                setFont(fontObjId) {
                    const font = TextEditor.JSObjectReference.from(fontObjId).obj;
                    this.ctx2d.font = `normal ${font.height}pt '${font.family}'`;
                    this.ctx2d.textBaseline = "top";
                }
                save() {
                    this.ctx2d.save();
                }
                restore() {
                    this.ctx2d.restore();
                }
                clip(clipRects) {
                    const region = new Path2D();
                    for (let rect of clipRects) {
                        region.rect(rect.x, rect.y, rect.w, rect.h);
                    }
                    this.ctx2d.clip(region);
                }
                drawString(arg) {
                    this.ctx2d.fillText(arg.str, arg.pt.x, arg.pt.y);
                }
                fillRect(rect) {
                    this.ctx2d.fillRect(rect.x, rect.y, rect.w, rect.h);
                }
                fillPolygon(points) {
                    this.ctx2d.beginPath();
                    this.ctx2d.moveTo(points[0].x, points[0].y);
                    const length = points.length;
                    for (var i = 1; i < length; i++) {
                        this.ctx2d.lineTo(points[i].x, points[i].y);
                    }
                    this.ctx2d.fill();
                }
                drawOffscreen(arg) {
                    const offscreen = TextEditor.JSObjectReference.from(arg.id).obj;
                    this.ctx2d.drawImage(offscreen.canvas, arg.pt.x, arg.pt.y);
                }
            }
            TextEditor.Offscreen = Offscreen;
        })(TextEditor = BlazorWasm.TextEditor || (BlazorWasm.TextEditor = {}));
    })(BlazorWasm = Sample.BlazorWasm || (Sample.BlazorWasm = {}));
})(Sample || (Sample = {}));
var Sample;
(function (Sample) {
    var BlazorWasm;
    (function (BlazorWasm) {
        var TextEditor;
        (function (TextEditor) {
            class TextEditorComponent {
                get size() { return { w: this._visualCanvas.width, h: this._visualCanvas.height }; }
                static create(canvasElementId, objRefJsec) {
                    const jsEvent = new TextEditor.JSEvent(objRefJsec);
                    const textEditorComponent = new TextEditorComponent(canvasElementId, jsEvent);
                    return TextEditor.JSObjectReference.create(textEditorComponent).id;
                }
                constructor(canvasElementId, jsEvent) {
                    this._destroyer = () => { };
                    this._visualCanvas = document.getElementById(canvasElementId);
                    this._visualCtx2d = this._visualCanvas.getContext("2d", { alpha: false });
                    this._jsEvent = jsEvent;
                    this._inputMethod = new TextEditor.InputMethod(this._visualCanvas, jsEvent);
                    this.initEventListener();
                }
                destroy() {
                    this._destroyer();
                }
                initEventListener() {
                    const callbackMouseDown = (e) => this.onMouseDown(e);
                    const callbackMouseUp = (e) => this.onMouseUp(e);
                    const callbackMouseMove = (e) => this.onMouseMove(e);
                    document.addEventListener("mousedown", callbackMouseDown);
                    document.addEventListener("mouseup", callbackMouseUp);
                    document.addEventListener("mousemove", callbackMouseMove);
                    this._destroyer = () => {
                        document.removeEventListener("mousedown", callbackMouseDown);
                        document.removeEventListener("mouseup", callbackMouseUp);
                        document.removeEventListener("mousemove", callbackMouseMove);
                    };
                    this._visualCanvas.addEventListener("wheel", e => this.onMouseWheel(e));
                    new MutationObserver(() => this.onResize())
                        .observe(this._visualCanvas, {
                        attributes: true,
                        attributeFilter: ["width", "height"],
                    });
                }
                onMouseDown(e) {
                    this._inputMethod.focus();
                    this._jsEvent.raiseAction("TextEditorComponent.mousedown", this.toMouseEventArgs(e));
                    e.preventDefault();
                    e.stopPropagation();
                }
                onMouseUp(e) {
                    this._jsEvent.raiseAction("TextEditorComponent.mouseup", this.toMouseEventArgs(e));
                    e.preventDefault();
                    e.stopPropagation();
                }
                onMouseMove(e) {
                    this._jsEvent.raiseAction("TextEditorComponent.mousemove", this.toMouseEventArgs(e));
                    e.preventDefault();
                    e.stopPropagation();
                }
                onMouseWheel(e) {
                    this._jsEvent.raiseAction("TextEditorComponent.mousewheel", this.toMouseEventArgs(e));
                    e.preventDefault();
                    e.stopPropagation();
                }
                onResize() {
                    this._jsEvent.raiseAction("TextEditorComponent.resize", this.size);
                }
                bindInputMethod() {
                    return TextEditor.JSObjectReference.create(this._inputMethod).id;
                }
                focus() {
                    this._inputMethod.focus();
                }
                resize(width, height) {
                    this._visualCanvas.width = width;
                    this._visualCanvas.height = height;
                }
                requestRender() {
                    window.requestAnimationFrame(timestamp => {
                        this._jsEvent.raiseAction("TextEditorComponent.render", {});
                    });
                }
                setCursor(cursor) {
                    this._visualCanvas.style.cursor = cursor;
                }
                transferScreen(offscreenId) {
                    const offscreen = TextEditor.JSObjectReference.from(offscreenId).obj;
                    this._visualCtx2d.drawImage(offscreen.canvas, 0, 0);
                }
                toMouseEventArgs(e) {
                    let notchY = 0;
                    if (e instanceof WheelEvent) {
                        const notchDelta = (e.deltaMode == WheelEvent.DOM_DELTA_PIXEL) ? 100.0
                            : (e.deltaMode == WheelEvent.DOM_DELTA_LINE) ? 3.0
                                : 1.0;
                        notchY = Math.ceil(Math.abs(e.deltaY) / notchDelta) * Math.sign(e.deltaY) * -1;
                    }
                    const offset = $(this._visualCanvas).offset();
                    return {
                        x: Math.ceil(e.pageX - offset.left),
                        y: Math.ceil(e.pageY - offset.top),
                        notchY: notchY,
                        button: e.button,
                        isCtrl: e.ctrlKey,
                        isShift: e.shiftKey,
                        isAlt: e.altKey,
                    };
                }
            }
            TextEditor.TextEditorComponent = TextEditorComponent;
        })(TextEditor = BlazorWasm.TextEditor || (BlazorWasm.TextEditor = {}));
    })(BlazorWasm = Sample.BlazorWasm || (Sample.BlazorWasm = {}));
})(Sample || (Sample = {}));
var Sample;
(function (Sample) {
    var BlazorWasm;
    (function (BlazorWasm) {
        var TextEditor;
        (function (TextEditor) {
            function processStringToUTF8(str, callback) {
                const bufferSize = lengthBytesUTF8(str) + 1;
                const ptr = Module._malloc(bufferSize);
                try {
                    stringToUTF8(str, ptr, bufferSize);
                    callback(ptr, bufferSize - 1);
                }
                finally {
                    Module._free(ptr);
                }
            }
            TextEditor.processStringToUTF8 = processStringToUTF8;
        })(TextEditor = BlazorWasm.TextEditor || (BlazorWasm.TextEditor = {}));
    })(BlazorWasm = Sample.BlazorWasm || (Sample.BlazorWasm = {}));
})(Sample || (Sample = {}));
var Sample;
(function (Sample) {
    var BlazorWasm;
    (function (BlazorWasm) {
        var TextEditor;
        (function (TextEditor) {
            class JSEvent {
                constructor(_objRef) {
                    this._objRef = _objRef;
                }
                raiseAction(eventName, arg) {
                    this._objRef.invokeMethod("CallbackAction", eventName, arg);
                }
                raiseFunc(eventName, arg) {
                    return this._objRef.invokeMethod("CallbackFunc", eventName, arg);
                }
            }
            TextEditor.JSEvent = JSEvent;
        })(TextEditor = BlazorWasm.TextEditor || (BlazorWasm.TextEditor = {}));
    })(BlazorWasm = Sample.BlazorWasm || (Sample.BlazorWasm = {}));
})(Sample || (Sample = {}));
var Sample;
(function (Sample) {
    var BlazorWasm;
    (function (BlazorWasm) {
        var TextEditor;
        (function (TextEditor) {
            class JSObjectReference {
                get id() { return this._id; }
                get obj() { return this._obj; }
                static create(obj) {
                    return new JSObjectReference(obj);
                }
                static from(id) {
                    return JSObjectReference.__map.get(id);
                }
                constructor(obj) {
                    this._id = JSObjectReference.__seq++;
                    this._obj = obj;
                    JSObjectReference.__map.set(this._id, this);
                }
                dispose() {
                    JSObjectReference.__map.delete(this._id);
                }
                static dispose(id) {
                    JSObjectReference.from(id).dispose();
                }
                static call(id, methodName, args) {
                    return JSObjectReference.internalCall(id, methodName, args);
                }
                static callVoid(id, methodName, args) {
                    JSObjectReference.internalCall(id, methodName, args);
                }
                static internalCall(id, methodName, args) {
                    const obj = JSObjectReference.__map.get(id).obj;
                    return obj[methodName].apply(obj, args);
                }
            }
            JSObjectReference.__map = new Map();
            JSObjectReference.__seq = 1;
            TextEditor.JSObjectReference = JSObjectReference;
        })(TextEditor = BlazorWasm.TextEditor || (BlazorWasm.TextEditor = {}));
    })(BlazorWasm = Sample.BlazorWasm || (Sample.BlazorWasm = {}));
})(Sample || (Sample = {}));
//# sourceMappingURL=texteditor.js.map