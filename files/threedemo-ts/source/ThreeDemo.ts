/// <reference path="../../../node_modules/three/src/Three.d.ts" />

namespace ThreeDemo {
    /**
     * アプリケーションクラス。
     */
    export class Application {
        public static readonly Version = "6342153889f44ad5b48dd142f098915c";

        private static readonly WIDTH = 600;
        private static readonly HEIGHT = 338;
        private static readonly ASPECT = Application.WIDTH / Application.HEIGHT;

        private static __instance: Application;
        public static get instance(): Application { return Application.__instance; }

        private readonly _scene: THREE.Scene;
        private readonly _renderer: THREE.WebGLRenderer;

        private _items: Updatable[] = [];

        private readonly _fps: Fps;

        private readonly _camera: Camera;

        public static start(targetDivSelector: string, fpsDivSelector: string): void {
            Application.__instance = new Application(targetDivSelector, fpsDivSelector);
        }

        public constructor(targetDivSelector: string, fpsDivSelector: string) {
            this._renderer = new THREE.WebGLRenderer({ antialias: true });
            this._renderer.setSize(Application.WIDTH, Application.HEIGHT);
            $(targetDivSelector).append(this._renderer.domElement);

            this._scene = new THREE.Scene();
            this._scene.add(new THREE.AxesHelper(1));

            this._fps = new Fps(fpsDivSelector);

            for (let i = 0; i < 100; i++) {
                this.addItem(new BoxModel());
            }

            this._camera = new Camera(this._renderer.domElement, Application.ASPECT);

            Application.startAnimation(elapsed => this.render(elapsed));
        }

        private static startAnimation(callback: (elapsed: number) => void): void {
            let oldTime = 0;
            let animationFrame = (time: number) => {
                if (oldTime > 0) {
                    let elapsed = (time - oldTime) / 1000.0;
                    callback(elapsed);
                }

                oldTime = time;
                requestAnimationFrame(animationFrame);
            };
            animationFrame(0);
        }

        private addItem(item: BoxModel): void {
            this._scene.add(item.mesh);
            this._items.push(item);
        }

        private render(elapsed: number): void {
            this._fps.update(elapsed);

            for (let item of this._items) {
                item.update(elapsed);
            }

            this._camera.update(elapsed);

            this._renderer.render(this._scene, this._camera.camera);
        }
    }

    /**
     * 更新インターフェイス。
     */
    interface Updatable {
        update(elapsed: number): void;
    }

    /**
     * カメラ。
     */
    class Camera implements Updatable {
        private readonly _camera: THREE.PerspectiveCamera;

        public get camera(): THREE.PerspectiveCamera { return this._camera; }

        public constructor(domElement: Element, aspect: number) {
            this._camera = new THREE.PerspectiveCamera(45, aspect, 0.01, 10);
            this._camera.position.z = 1;

            EventUtil.onMouseWheel(domElement, delta => {
                this._camera.fov += delta / 50.0;
                this._camera.updateProjectionMatrix();
            });

            EventUtil.onTouchPinch(domElement, pinch => {
                this._camera.fov -= pinch / 5.0;
                this._camera.updateProjectionMatrix();
            });

            EventUtil.onMouseDragOffset(domElement, offset => {
                this._camera.rotation.x -= offset.height / 200.0;
                this._camera.rotation.y -= offset.width / 200.0;
            });

            EventUtil.onTouchMoveOffset(domElement, offset => {
                this._camera.rotation.x -= offset.height / 200.0;
                this._camera.rotation.y -= offset.width / 200.0;
            });
        }

        public update(elapsed: number): void {

        }
    }

    /**
     * Boxクラス。
     */
    class BoxModel implements Updatable {
        private readonly _geometry: THREE.BoxGeometry;
        private readonly _material: THREE.MeshNormalMaterial;
        private readonly _mesh: THREE.Mesh;

        public get mesh(): THREE.Mesh { return this._mesh; }

        public constructor() {
            this._geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
            this._material = new THREE.MeshNormalMaterial();

            this._mesh = new THREE.Mesh(this._geometry, this._material);

            this._mesh.position.x = Math.random() - 0.5;
            this._mesh.position.y = Math.random() - 0.5;
            this._mesh.position.z = Math.random() * -1;
        }

        public update(elapsed: number) {
            this._mesh.rotation.x += 1.0 * elapsed;
            this._mesh.rotation.y += 2.0 * elapsed;
        }
    }

    /**
     * 2D座標。
     */
    class Point2D {
        public constructor(
            public x: number,
            public y: number) {
        }
    }

    /**
     * 2Dサイズ。
     */
    class Size2D {
        public constructor(
            public width: number,
            public height: number) {
        }
    }

    /**
     * FPS表示クラス。
     */
    class Fps {
        private readonly _fpsStopWatch: FpsStopWatch;

        public constructor(divSelector: string) {
            let targetElement = $(divSelector);

            this._fpsStopWatch = new FpsStopWatch(fps => {
                targetElement.text(fps + " fps");
            });
        }

        public update(elapsed: number): void {
            this._fpsStopWatch.update(elapsed);
        }
    }

    /**
     * FPS計測クラス。
     */
    class FpsStopWatch {
        private _totalElapsed = 0.0;
        private _frameCount = 0;

        private readonly _callback: (fps: number) => void;

        public constructor(callback: (fps: number) => void) {
            this._callback = callback;

            this._callback(0.0);
        }

        public update(elapsed: number): void {
            this._totalElapsed += elapsed;
            this._frameCount++;

            if (this._totalElapsed >= 1.0) {
                let fps = _.round(this._frameCount / this._totalElapsed, 1);
                this._callback(fps);

                this._totalElapsed = 0.0;
                this._frameCount = 0;
            }
        }
    }

    /**
     * 数学ユーティリティー。
     */
    class MathUtil {
        private constructor() { }

        public static degreeToRadian(degree: number): number {
            return degree / 180.0 * Math.PI;
        }

        public static radianToDegree(radian: number): number {
            return radian / Math.PI * 180.0;
        }

        public static normalizeDegree(degree: number): number {
            if (degree < 0) {
                degree = (degree % 360) + 360;
            }
            return degree % 360;
        }

        public static distance2D(x1: number, y1: number, x2: number, y2: number): number {
            return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
        }

        public static distance3D(x1: number, y1: number, z1: number, x2: number, y2: number, z2: number): number {
            return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2) + Math.pow(z1 - z2, 2));
        }

        public static inRange(value: number, min: number, max: number): boolean {
            return min <= value && value <= max;
        }
    }

    /**
     * イベントユーティリティー。
     */
    class EventUtil {
        private constructor() { }

        public static onMouseWheel(targetElement: Element, callback: (deltaValue: number) => void): void {
            $(targetElement).on("wheel", (e: JQuery.TriggeredEvent) => {
                let we = e.originalEvent as WheelEvent;
                if (we.deltaMode === WheelEvent.DOM_DELTA_PIXEL) {
                    callback(we.deltaY);
                    return false;
                }
            });
        }

        public static onMouseDragOffset(targetElement: Element, callback: (offsetValue: Size2D) => void): void {
            let oldPos: Point2D | null = null;

            $(targetElement).mousemove(e => {
                if (e.buttons === 1) {
                    let pos = new Point2D(e.clientX, e.clientY);
                    if (oldPos !== null) {
                        callback(new Size2D(pos.x - oldPos.x, pos.y - oldPos.y));
                    }
                    oldPos = pos;
                    return false;
                }
                else {
                    oldPos = null;
                }
            });

            $(targetElement).mousedown(e => {
                oldPos = null;
            });
        }

        public static onTouchPinch(targetElement: Element, callback: (pinchValue: number) => void): void {
            let oldDistance: number | null = null;

            $(targetElement).on("touchmove", (e: JQuery.TouchMoveEvent) => {
                if (e.targetTouches.length === 2) {
                    let distance = MathUtil.distance2D(
                        e.targetTouches[0].clientX, e.targetTouches[0].clientY,
                        e.targetTouches[1].clientX, e.targetTouches[1].clientY);
                    if (oldDistance !== null) {
                        callback(distance - oldDistance);
                    }
                    oldDistance = distance;
                    return false;
                }
                else {
                    oldDistance = null;
                }
            });

            $(targetElement).on("touchstart", (e: JQuery.TouchStartEvent) => {
                oldDistance = null;
            });
        }

        public static onTouchMoveOffset(targetElement: Element, callback: (offsetValue: Size2D) => void): void {
            let oldPos: Point2D | null = null;

            $(targetElement).on("touchmove", (e: JQuery.TouchMoveEvent) => {
                if (e.targetTouches.length === 1) {
                    let pos = new Point2D(e.targetTouches[0].clientX, e.targetTouches[0].clientY);
                    if (oldPos !== null) {
                        callback(new Size2D(pos.x - oldPos.x, pos.y - oldPos.y));
                    }
                    oldPos = pos;
                    return false;
                }
                else {
                    oldPos = null;
                }
            });

            $(targetElement).on("touchstart", (e: JQuery.TouchStartEvent) => {
                oldPos = null;
            });
        }
    }
}
