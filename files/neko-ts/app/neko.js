"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var NekoDemo;
(function (NekoDemo) {
    class PixiView {
        constructor(viewSelector) {
            this._models = [];
            PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;
            this._app = new PIXI.Application(400, 225, { backgroundColor: 0x4682B4 });
            $(viewSelector).append(this._app.view);
        }
        static get instance() { return PixiView.__view; }
        static startAsync(targetSelector) {
            return __awaiter(this, void 0, void 0, function* () {
                PixiView.__view = new PixiView(targetSelector);
                yield PixiView.__view.main();
            });
        }
        main() {
            return __awaiter(this, void 0, void 0, function* () {
                this._app.ticker.add(delta => {
                    let elapsed = 1.0 / 60.0 * delta;
                    for (let model of this._models) {
                        model.update(elapsed);
                    }
                });
                this.addModel(new LoadProgress());
                yield MinDelay.delayAsync(this.loadResourcesAsync(), 2000);
                this.removeModelAll();
                this.addModel(new Fps());
                this.addModel(new Neko(30, 60));
                this._app.stage.interactive = true;
                this._app.stage.on("pointermove", (e) => {
                    let mousePosition = e.data.global;
                    if (MathUtil.contains(mousePosition.x, 0, this._app.view.width)
                        && MathUtil.contains(mousePosition.y, 0, this._app.view.height)) {
                        for (let model of LinqUtil.ofType(this._models, Neko)) {
                            model.setMousePosition(mousePosition);
                        }
                    }
                });
            });
        }
        loadResourcesAsync() {
            return new Promise(resolve => {
                let imagesUrl = "/files/neko-ts/app/images/neko/";
                $.getJSON(imagesUrl + `image-list.json?v=${PixiView.Version}`)
                    .then((fileNames) => {
                    for (let item of LinqUtil.select(fileNames, fileName => ({ id: PathUtil.getFileNameWithoutExtension(fileName), fileName: fileName }))) {
                        PIXI.loader.add(item.id, imagesUrl + item.fileName);
                    }
                    PIXI.loader.load(() => {
                        resolve();
                    });
                });
            });
        }
        addModel(model) {
            this._app.stage.addChild(model.displayObject);
            this._models.push(model);
        }
        removeModelAll() {
            this._app.stage.removeChildren();
            this._models = [];
        }
    }
    PixiView.Version = "025d677386704dd6b16926b493f72d1f";
    NekoDemo.PixiView = PixiView;
    class ModelBase {
        constructor(displayObject, x, y) {
            this.displayObject = displayObject;
            this.displayObject.position.set(x, y);
        }
        update(elapsed) {
            this.doUpdate(elapsed);
        }
    }
    class LoadProgress extends ModelBase {
        constructor() {
            super(new PIXI.Text("読み込み中"), 0, 0);
            this._totalElapsed = 0.0;
        }
        doUpdate(elapsed) {
            this._totalElapsed += elapsed;
            if (this._totalElapsed >= 0.25) {
                this.displayObject.text += ".";
                this._totalElapsed = 0.0;
            }
        }
    }
    class Fps extends ModelBase {
        constructor() {
            super(new PIXI.Text("0.0 fps"), 0, 0);
            this._totalElapsed = 0.0;
            this._frameCount = 0;
        }
        doUpdate(elapsed) {
            this._totalElapsed += elapsed;
            this._frameCount++;
            if (this._totalElapsed >= 1.0) {
                this.displayObject.text = Math.round(this._frameCount / this._totalElapsed * 10.0) / 10.0 + " fps";
                this._totalElapsed = 0.0;
                this._frameCount = 0;
            }
        }
    }
    class Neko extends ModelBase {
        constructor(x, y) {
            super(new PIXI.Sprite(PIXI.loader.resources["default"].texture), x, y);
            this._defaultState = new NekoDefaultState(this);
            this.awareState = new NekoAwareState(this);
            this.movingState = new NekoMovingState(this);
            this.scratchState = new NekoScratchState(this);
            this.footState = new NekoFootState(this);
            this.yawnState = new NekoYawnState(this);
            this.sleepingState = new NekoSleepingState(this);
            this._mousePosition = null;
            this._currentState = this._defaultState;
            this._collisionRect = new PIXI.Rectangle(0, 0, 48, 48);
            this.displayObject.anchor.set(0.5);
            this.resetState();
        }
        get mousePosition() { return this._mousePosition; }
        get collisionRect() { return this._collisionRect; }
        doUpdate(elapsed) {
            this._currentState.update(elapsed);
        }
        move(x, y) {
            this.displayObject.position.set(x, y);
            this.updateCollisionRect();
        }
        updateCollisionRect() {
            this._collisionRect.x = this.displayObject.x - this._collisionRect.width / 2.0;
            this._collisionRect.y = this.displayObject.y - this._collisionRect.height / 2.0;
        }
        setState(state) {
            this._currentState = state;
            this._currentState.reset();
        }
        resetState() {
            this._mousePosition = null;
            this.setState(this._defaultState);
        }
        setMousePosition(mousePosition) {
            if (this._mousePosition !== null) {
                this._mousePosition.set(mousePosition.x, mousePosition.y);
            }
            else if (!this._collisionRect.contains(mousePosition.x, mousePosition.y)) {
                this._mousePosition = mousePosition.clone();
                this.setState(this.awareState);
            }
        }
    }
    class NekoStateBase {
        constructor(_neko) {
            this._neko = _neko;
            this._totalElapsed = 0.0;
            this._motionNo = -1;
            this._interval = 0.0;
            this._nextFunc = () => { };
        }
        get neko() { return this._neko; }
        get totalElapsed() { return this._totalElapsed; }
        reset() {
            this._totalElapsed = 0.0;
            this._motionNo = 0;
            this.doReset();
        }
        update(elapsed) {
            this._totalElapsed += elapsed;
            if (this._totalElapsed >= this._interval) {
                this._nextFunc();
                this._totalElapsed = 0.0;
            }
        }
        setMotionFunc(interval, nextFunc) {
            this._interval = interval;
            this._nextFunc = nextFunc;
        }
        nextMotionNo() {
            let result = this._motionNo;
            this._motionNo = (this._motionNo + 1) % 2;
            return result;
        }
    }
    class NekoDefaultState extends NekoStateBase {
        constructor(neko) {
            super(neko);
            this._nextStates = [
                () => this.neko.yawnState,
                () => this.neko.footState,
                () => this.neko.scratchState,
                () => this.neko.sleepingState,
            ];
        }
        doReset() {
            this.neko.displayObject.texture = PIXI.loader.resources["default"].texture;
            this.setMotionFunc(1.0, this.motionEnd);
        }
        motionEnd() {
            let nextState = this._nextStates[MathUtil.random(0, this._nextStates.length - 1)]();
            this.neko.setState(nextState);
        }
    }
    class NekoAwareState extends NekoStateBase {
        constructor(neko) {
            super(neko);
        }
        doReset() {
            this.neko.displayObject.texture = PIXI.loader.resources["aware"].texture;
            this.setMotionFunc(0.2, this.motionEnd);
        }
        motionEnd() {
            this.neko.setState(this.neko.movingState);
        }
    }
    class NekoMovingState extends NekoStateBase {
        constructor(neko) {
            super(neko);
        }
        doReset() {
            this.neko.displayObject.texture = PIXI.loader.resources["default"].texture;
            this.setMotionFunc(0.25, this.motionMoving);
        }
        motionMoving() {
            if (this.neko.collisionRect.contains(this.neko.mousePosition.x, this.neko.mousePosition.y)) {
                this.setMotionFunc(0.0, this.motionEnd);
                return;
            }
            let angle = MathUtil.radianToDegree(Math.atan2(-(this.neko.mousePosition.y - this.neko.displayObject.y), this.neko.mousePosition.x - this.neko.displayObject.x));
            angle = (angle + 360) % 360;
            let no = Math.floor((angle + 22.5) % 360 / 45.0);
            this.neko.displayObject.texture = PIXI.loader.resources["move" + no + "_" + this.nextMotionNo()].texture;
            this.neko.move(this.neko.displayObject.x + Math.cos(MathUtil.degreeToRadian(angle)) * this.totalElapsed * NekoMovingState.SPEED, this.neko.displayObject.y - Math.sin(MathUtil.degreeToRadian(angle)) * this.totalElapsed * NekoMovingState.SPEED);
        }
        motionEnd() {
            this.neko.resetState();
        }
    }
    NekoMovingState.SPEED = 60.0;
    class NekoYawnState extends NekoStateBase {
        constructor(neko) {
            super(neko);
        }
        doReset() {
            this.neko.displayObject.texture = PIXI.loader.resources["yawn"].texture;
            this.setMotionFunc(1.5, this.motionEnd);
        }
        motionEnd() {
            this.neko.resetState();
        }
    }
    class NekoScratchState extends NekoStateBase {
        constructor(neko) {
            super(neko);
            this._no = -1;
            this._count = -1;
        }
        doReset() {
            this._no = MathUtil.random(0, 3);
            this._count = 0;
            this.motionScratch();
            this.setMotionFunc(0.5, this.motionScratch);
        }
        motionScratch() {
            this.neko.displayObject.texture = PIXI.loader.resources["scratch" + this._no + "_" + this.nextMotionNo()].texture;
            if (++this._count >= 8) {
                this.setMotionFunc(0.5, this.motionEnd);
            }
        }
        motionEnd() {
            this.neko.resetState();
        }
    }
    class NekoFootState extends NekoStateBase {
        constructor(neko) {
            super(neko);
            this._count = -1;
        }
        doReset() {
            this._count = 0;
            this.motionFoot();
            this.setMotionFunc(0.12, this.motionFoot);
        }
        motionFoot() {
            this.neko.displayObject.texture = PIXI.loader.resources["foot_" + this.nextMotionNo()].texture;
            if (++this._count >= 12) {
                this.setMotionFunc(0.12, this.motionEnd);
            }
        }
        motionEnd() {
            this.neko.resetState();
        }
    }
    class NekoSleepingState extends NekoStateBase {
        constructor(neko) {
            super(neko);
        }
        doReset() {
            this.motionSleeping();
            this.setMotionFunc(0.5, this.motionSleeping);
        }
        motionSleeping() {
            this.neko.displayObject.texture = PIXI.loader.resources["sleep_" + this.nextMotionNo()].texture;
        }
    }
    class MathUtil {
        constructor() { }
        static degreeToRadian(degree) {
            return degree / 180.0 * Math.PI;
        }
        static radianToDegree(radian) {
            return radian / Math.PI * 180.0;
        }
        static random(minValue, maxValue) {
            return Math.floor(Math.random() * (maxValue - minValue + 1)) + minValue;
        }
        static contains(value, min, max) {
            return value >= min && value <= max;
        }
    }
    class PathUtil {
        constructor() { }
        static getFileNameWithoutExtension(path) {
            return path.substr(0, path.lastIndexOf("."));
        }
    }
    class LinqUtil {
        constructor() { }
        static *select(sourceItems, selector) {
            for (let item of sourceItems) {
                yield selector(item);
            }
        }
        static *ofType(sourceItems, resultCtor) {
            for (let item of sourceItems) {
                if (item instanceof resultCtor) {
                    yield item;
                }
            }
        }
    }
    class MinDelay {
        constructor() { }
        static delayAsync(targetPromise, minMilliseconds) {
            return new Promise((resolve) => __awaiter(this, void 0, void 0, function* () {
                let now = Date.now();
                yield targetPromise;
                let realDelay = minMilliseconds - (Date.now() - now);
                if (realDelay > 0) {
                    setTimeout(() => {
                        resolve();
                    }, realDelay);
                }
                else {
                    resolve();
                }
            }));
        }
    }
})(NekoDemo || (NekoDemo = {}));
//# sourceMappingURL=neko.js.map