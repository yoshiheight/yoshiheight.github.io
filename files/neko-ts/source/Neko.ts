namespace NekoDemo {
    /**
     * 描画ビュークラス
     */
    export class PixiView {
        public static readonly Version = "025d677386704dd6b16926b493f72d1f";

        private static __view: PixiView;
        public static get instance(): PixiView { return PixiView.__view; }

        private readonly _app: PIXI.Application;
        private _models: ModelBase<PIXI.DisplayObject>[] = [];

        public static async startAsync(targetSelector: string): Promise<void> {
            PixiView.__view = new PixiView(targetSelector);
            await PixiView.__view.main();
        }

        public constructor(viewSelector: string) {
            PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;
            this._app = new PIXI.Application(400, 225, { backgroundColor: 0x4682B4 });
            $(viewSelector).append(this._app.view);
        }

        private async main(): Promise<void> {
            this._app.ticker.add(delta => {
                let elapsed = 1.0 / 60.0 * delta;

                for (let model of this._models) {
                    model.update(elapsed);
                }
            });

            this.addModel(new LoadProgress());

            await MinDelay.delayAsync(this.loadResourcesAsync(), 2000);

            this.removeModelAll();
            this.addModel(new Fps());
            this.addModel(new Neko(30, 60));

            this._app.stage.interactive = true;
            this._app.stage.on("pointermove", (e: PIXI.interaction.InteractionEvent) => {
                let mousePosition = e.data.global;
                if (MathUtil.contains(mousePosition.x, 0, this._app.view.width)
                    && MathUtil.contains(mousePosition.y, 0, this._app.view.height)) {

                    for (let model of LinqUtil.ofType(this._models, Neko)) {
                        model.setMousePosition(mousePosition);
                    }
                }
            });
        }

        private loadResourcesAsync(): Promise<void> {
            return new Promise<void>(resolve => {
                let imagesUrl = "/files/neko-ts/app/images/neko/";
                $.getJSON(imagesUrl + `image-list.json?v=${PixiView.Version}`)
                    .then((fileNames: string[]) => {
                        for (let item of LinqUtil.select(fileNames, fileName => ({ id: PathUtil.getFileNameWithoutExtension(fileName), fileName: fileName }))) {
                            PIXI.loader.add(item.id, imagesUrl + item.fileName);
                        }

                        PIXI.loader.load(() => {
                            resolve();
                        });
                    });
            });
        }

        private addModel(model: ModelBase<PIXI.DisplayObject>): void {
            this._app.stage.addChild(model.displayObject);
            this._models.push(model);
        }

        private removeModelAll(): void {
            this._app.stage.removeChildren();
            this._models = [];
        }
    }

    /**
     * 表示モデルの基底クラス
     */
    abstract class ModelBase<TDisplayObject extends PIXI.DisplayObject> {
        public constructor(
            public readonly displayObject: TDisplayObject,
            x: number,
            y: number) {

            this.displayObject.position.set(x, y);
        }

        public update(elapsed: number): void {
            this.doUpdate(elapsed);
        }

        protected abstract doUpdate(elapsed: number): void;
    }

    /**
     * リソース読み込み中のプログレス表示クラス
     */
    class LoadProgress extends ModelBase<PIXI.Text> {
        private _totalElapsed = 0.0;

        public constructor() {
            super(new PIXI.Text("読み込み中"), 0, 0);
        }

        protected doUpdate(elapsed: number) {
            this._totalElapsed += elapsed;

            if (this._totalElapsed >= 0.25) {
                this.displayObject.text += ".";
                this._totalElapsed = 0.0;
            }
        }
    }

    /**
     * FPS表示クラス
     */
    class Fps extends ModelBase<PIXI.Text> {
        private _totalElapsed = 0.0;
        private _frameCount = 0;

        public constructor() {
            super(new PIXI.Text("0.0 fps"), 0, 0);
        }

        protected doUpdate(elapsed: number) {
            this._totalElapsed += elapsed;
            this._frameCount++;

            if (this._totalElapsed >= 1.0) {
                this.displayObject.text = Math.round(this._frameCount / this._totalElapsed * 10.0) / 10.0 + " fps";

                this._totalElapsed = 0.0;
                this._frameCount = 0;
            }
        }
    }

    /**
     * ねこクラス
     */
    class Neko extends ModelBase<PIXI.Sprite> {
        private readonly _defaultState = new NekoDefaultState(this);
        public readonly awareState = new NekoAwareState(this);
        public readonly movingState = new NekoMovingState(this);
        public readonly scratchState = new NekoScratchState(this);
        public readonly footState = new NekoFootState(this);
        public readonly yawnState = new NekoYawnState(this);
        public readonly sleepingState = new NekoSleepingState(this);

        private _mousePosition: (PIXI.Point | null) = null;
        private _currentState: NekoStateBase = this._defaultState;

        private readonly _collisionRect: PIXI.Rectangle = new PIXI.Rectangle(0, 0, 48, 48);

        public get mousePosition(): PIXI.Point { return this._mousePosition as PIXI.Point; }
        public get collisionRect(): PIXI.Rectangle { return this._collisionRect; }

        public constructor(x: number, y: number) {
            super(new PIXI.Sprite(PIXI.loader.resources["default"].texture), x, y);

            this.displayObject.anchor.set(0.5);
            this.resetState();
        }

        protected doUpdate(elapsed: number): void {
            this._currentState.update(elapsed);
        }

        public move(x: number, y: number): void {
            this.displayObject.position.set(x, y);
            this.updateCollisionRect();
        }

        private updateCollisionRect(): void {
            this._collisionRect.x = this.displayObject.x - this._collisionRect.width / 2.0;
            this._collisionRect.y = this.displayObject.y - this._collisionRect.height / 2.0;
        }

        public setState(state: NekoStateBase): void {
            this._currentState = state;
            this._currentState.reset();
        }

        public resetState(): void {
            this._mousePosition = null;
            this.setState(this._defaultState);
        }

        public setMousePosition(mousePosition: PIXI.Point): void {
            if (this._mousePosition !== null) {
                this._mousePosition.set(mousePosition.x, mousePosition.y);
            }
            else if (!this._collisionRect.contains(mousePosition.x, mousePosition.y)) {
                this._mousePosition = mousePosition.clone();
                this.setState(this.awareState);
            }
        }
    }

    /**
     * ねこ状態の基底クラス
     */
    abstract class NekoStateBase {
        private _totalElapsed = 0.0;
        private _motionNo = -1;

        private _interval = 0.0;
        private _nextFunc = () => { };

        get neko(): Neko { return this._neko; }
        get totalElapsed(): number { return this._totalElapsed; }

        public constructor(private readonly _neko: Neko) {
        }

        public reset(): void {
            this._totalElapsed = 0.0;
            this._motionNo = 0;

            this.doReset();
        }

        protected abstract doReset(): void;

        public update(elapsed: number): void {
            this._totalElapsed += elapsed;
            if (this._totalElapsed >= this._interval) {
                this._nextFunc();

                this._totalElapsed = 0.0;
            }
        }

        protected setMotionFunc(interval: number, nextFunc: Action): void {
            this._interval = interval;
            this._nextFunc = nextFunc;
        }

        protected nextMotionNo(): number {
            let result = this._motionNo;
            this._motionNo = (this._motionNo + 1) % 2;
            return result;
        }
    }

    /**
     * ねこ状態クラス「デフォルト」
     */
    class NekoDefaultState extends NekoStateBase {
        private readonly _nextStates: Func<NekoStateBase>[] = [
            () => this.neko.yawnState,
            () => this.neko.footState,
            () => this.neko.scratchState,
            () => this.neko.sleepingState,
        ];

        public constructor(neko: Neko) {
            super(neko);
        }

        protected doReset(): void {
            this.neko.displayObject.texture = PIXI.loader.resources["default"].texture;
            this.setMotionFunc(1.0, this.motionEnd);
        }

        private motionEnd(): void {
            let nextState = this._nextStates[MathUtil.random(0, this._nextStates.length - 1)]();
            this.neko.setState(nextState);
        }
    }

    /**
     * ねこ状態クラス「気付き」
     */
    class NekoAwareState extends NekoStateBase {
        public constructor(neko: Neko) {
            super(neko);
        }

        protected doReset(): void {
            this.neko.displayObject.texture = PIXI.loader.resources["aware"].texture;
            this.setMotionFunc(0.2, this.motionEnd);
        }

        private motionEnd(): void {
            this.neko.setState(this.neko.movingState);
        }
    }

    /**
     * ねこ状態クラス「移動」
     */
    class NekoMovingState extends NekoStateBase {
        private static readonly SPEED = 60.0;

        public constructor(neko: Neko) {
            super(neko);
        }

        protected doReset(): void {
            this.neko.displayObject.texture = PIXI.loader.resources["default"].texture;
            this.setMotionFunc(0.25, this.motionMoving);
        }

        private motionMoving(): void {
            if (this.neko.collisionRect.contains(this.neko.mousePosition.x, this.neko.mousePosition.y)) {
                this.setMotionFunc(0.0, this.motionEnd);
                return;
            }

            let angle = MathUtil.radianToDegree(
                Math.atan2(
                    -(this.neko.mousePosition.y - this.neko.displayObject.y),
                    this.neko.mousePosition.x - this.neko.displayObject.x));
            angle = (angle + 360) % 360;

            let no = Math.floor((angle + 22.5) % 360 / 45.0);
            this.neko.displayObject.texture = PIXI.loader.resources["move" + no + "_" + this.nextMotionNo()].texture;

            // 移動
            this.neko.move(
                this.neko.displayObject.x + Math.cos(MathUtil.degreeToRadian(angle)) * this.totalElapsed * NekoMovingState.SPEED,
                this.neko.displayObject.y - Math.sin(MathUtil.degreeToRadian(angle)) * this.totalElapsed * NekoMovingState.SPEED);
        }

        private motionEnd(): void {
            this.neko.resetState();
        }
    }

    /**
     * ねこ状態クラス「あくび」
     */
    class NekoYawnState extends NekoStateBase {
        public constructor(neko: Neko) {
            super(neko);
        }

        protected doReset(): void {
            this.neko.displayObject.texture = PIXI.loader.resources["yawn"].texture;
            this.setMotionFunc(1.5, this.motionEnd);
        }

        private motionEnd(): void {
            this.neko.resetState();
        }
    }

    /**
     * ねこ状態クラス「ひっかき」
     */
    class NekoScratchState extends NekoStateBase {
        private _no = -1;
        private _count = -1;

        public constructor(neko: Neko) {
            super(neko);
        }

        protected doReset(): void {
            this._no = MathUtil.random(0, 3);
            this._count = 0;

            this.motionScratch();
            this.setMotionFunc(0.5, this.motionScratch);
        }

        private motionScratch(): void {
            this.neko.displayObject.texture = PIXI.loader.resources["scratch" + this._no + "_" + this.nextMotionNo()].texture;

            if (++this._count >= 8) {
                this.setMotionFunc(0.5, this.motionEnd);
            }
        }

        private motionEnd(): void {
            this.neko.resetState();
        }
    }

    /**
     * ねこ状態クラス「首かき」
     */
    class NekoFootState extends NekoStateBase {
        private _count = -1;

        public constructor(neko: Neko) {
            super(neko);
        }

        protected doReset(): void {
            this._count = 0;

            this.motionFoot();
            this.setMotionFunc(0.12, this.motionFoot);
        }

        private motionFoot(): void {
            this.neko.displayObject.texture = PIXI.loader.resources["foot_" + this.nextMotionNo()].texture;

            if (++this._count >= 12) {
                this.setMotionFunc(0.12, this.motionEnd);
            }
        }

        private motionEnd(): void {
            this.neko.resetState();
        }
    }

    /**
     * ねこ状態クラス「睡眠」
     */
    class NekoSleepingState extends NekoStateBase {
        public constructor(neko: Neko) {
            super(neko);
        }

        protected doReset(): void {
            this.motionSleeping();
            this.setMotionFunc(0.5, this.motionSleeping);
        }

        private motionSleeping(): void {
            this.neko.displayObject.texture = PIXI.loader.resources["sleep_" + this.nextMotionNo()].texture;
        }
    }

    /**
     * アクション
     */
    interface Action {
        (): void;
    }

    /**
     * ファンクション
     */
    interface Func<TResult> {
        (): TResult;
    }

    /**
     * ファンクション
     */
    interface Func1<TParam1, TResult> {
        (param1: TParam1): TResult;
    }

    /**
     * 数学ユーティリティークラス
     */
    class MathUtil {
        private constructor() { }

        public static degreeToRadian(degree: number): number {
            return degree / 180.0 * Math.PI;
        }

        public static radianToDegree(radian: number): number {
            return radian / Math.PI * 180.0;
        }

        public static random(minValue: number, maxValue: number): number {
            return Math.floor(Math.random() * (maxValue - minValue + 1)) + minValue;
        }

        public static contains(value: number, min: number, max: number): boolean {
            return value >= min && value <= max;
        }
    }

    /**
     * パスユーティリティー
     */
    class PathUtil {
        private constructor() { }

        public static getFileNameWithoutExtension(path: string): string {
            return path.substr(0, path.lastIndexOf("."));
        }
    }

    /**
     * LINQ的なユーティリティー（拡張メソッドにはできないが）
     */
    class LinqUtil {
        private constructor() { }

        public static * select<TSource, TResult>(sourceItems: Iterable<TSource>, selector: Func1<TSource, TResult>): Iterable<TResult> {
            for (let item of sourceItems) {
                yield selector(item);
            }
        }

        public static * ofType<TSource, TResult>(sourceItems: Iterable<TSource>, resultCtor: { new(...args: any[]): TResult }): Iterable<TResult> {
            for (let item of sourceItems) {
                if (item instanceof resultCtor) {
                    yield item;
                }
            }
        }
    }

    /**
     * 最小遅延クラス
     */
    class MinDelay {
        private constructor() { }

        public static delayAsync(targetPromise: Promise<void>, minMilliseconds: number): Promise<void> {
            return new Promise<void>(async resolve => {
                let now = Date.now();

                await targetPromise;

                let realDelay = minMilliseconds - (Date.now() - now);
                if (realDelay > 0) {
                    setTimeout(() => {
                        resolve();
                    }, realDelay);
                }
                else {
                    resolve();
                }
            });
        }
    }
}
