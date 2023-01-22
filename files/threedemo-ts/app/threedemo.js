"use strict";
var ThreeDemo;
(function (ThreeDemo) {
    let Application = (() => {
        class Application {
            constructor(targetDivSelector, fpsDivSelector) {
                this._items = [];
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
            static get instance() { return Application.__instance; }
            static start(targetDivSelector, fpsDivSelector) {
                Application.__instance = new Application(targetDivSelector, fpsDivSelector);
            }
            static startAnimation(callback) {
                let oldTime = 0;
                let animationFrame = (time) => {
                    if (oldTime > 0) {
                        let elapsed = (time - oldTime) / 1000.0;
                        callback(elapsed);
                    }
                    oldTime = time;
                    requestAnimationFrame(animationFrame);
                };
                animationFrame(0);
            }
            addItem(item) {
                this._scene.add(item.mesh);
                this._items.push(item);
            }
            render(elapsed) {
                this._fps.update(elapsed);
                for (let item of this._items) {
                    item.update(elapsed);
                }
                this._camera.update(elapsed);
                this._renderer.render(this._scene, this._camera.camera);
            }
        }
        Application.Version = "6342153889f44ad5b48dd142f098915c";
        Application.WIDTH = 600;
        Application.HEIGHT = 338;
        Application.ASPECT = Application.WIDTH / Application.HEIGHT;
        return Application;
    })();
    ThreeDemo.Application = Application;
    class Camera {
        constructor(domElement, aspect) {
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
        get camera() { return this._camera; }
        update(elapsed) {
        }
    }
    class BoxModel {
        constructor() {
            this._geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
            this._material = new THREE.MeshNormalMaterial();
            this._mesh = new THREE.Mesh(this._geometry, this._material);
            this._mesh.position.x = Math.random() - 0.5;
            this._mesh.position.y = Math.random() - 0.5;
            this._mesh.position.z = Math.random() * -1;
        }
        get mesh() { return this._mesh; }
        update(elapsed) {
            this._mesh.rotation.x += 1.0 * elapsed;
            this._mesh.rotation.y += 2.0 * elapsed;
        }
    }
    class Point2D {
        constructor(x, y) {
            this.x = x;
            this.y = y;
        }
    }
    class Size2D {
        constructor(width, height) {
            this.width = width;
            this.height = height;
        }
    }
    class Fps {
        constructor(divSelector) {
            let targetElement = $(divSelector);
            this._fpsStopWatch = new FpsStopWatch(fps => {
                targetElement.text(fps + " fps");
            });
        }
        update(elapsed) {
            this._fpsStopWatch.update(elapsed);
        }
    }
    class FpsStopWatch {
        constructor(callback) {
            this._totalElapsed = 0.0;
            this._frameCount = 0;
            this._callback = callback;
            this._callback(0.0);
        }
        update(elapsed) {
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
    class MathUtil {
        constructor() { }
        static degreeToRadian(degree) {
            return degree / 180.0 * Math.PI;
        }
        static radianToDegree(radian) {
            return radian / Math.PI * 180.0;
        }
        static normalizeDegree(degree) {
            if (degree < 0) {
                degree = (degree % 360) + 360;
            }
            return degree % 360;
        }
        static distance2D(x1, y1, x2, y2) {
            return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
        }
        static distance3D(x1, y1, z1, x2, y2, z2) {
            return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2) + Math.pow(z1 - z2, 2));
        }
        static inRange(value, min, max) {
            return min <= value && value <= max;
        }
    }
    class EventUtil {
        constructor() { }
        static onMouseWheel(targetElement, callback) {
            $(targetElement).on("wheel", (e) => {
                let we = e.originalEvent;
                if (we.deltaMode === WheelEvent.DOM_DELTA_PIXEL) {
                    callback(we.deltaY);
                    return false;
                }
            });
        }
        static onMouseDragOffset(targetElement, callback) {
            let oldPos = null;
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
        static onTouchPinch(targetElement, callback) {
            let oldDistance = null;
            $(targetElement).on("touchmove", (e) => {
                if (e.targetTouches.length === 2) {
                    let distance = MathUtil.distance2D(e.targetTouches[0].clientX, e.targetTouches[0].clientY, e.targetTouches[1].clientX, e.targetTouches[1].clientY);
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
            $(targetElement).on("touchstart", (e) => {
                oldDistance = null;
            });
        }
        static onTouchMoveOffset(targetElement, callback) {
            let oldPos = null;
            $(targetElement).on("touchmove", (e) => {
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
            $(targetElement).on("touchstart", (e) => {
                oldPos = null;
            });
        }
    }
})(ThreeDemo || (ThreeDemo = {}));
//# sourceMappingURL=threedemo.js.map