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
    class BootLoader {
        static loadAsync() {
            return __awaiter(this, void 0, void 0, function* () {
                yield BootLoader.loadScriptsAsync([
                    "https://cdnjs.cloudflare.com/ajax/libs/pixi.js/4.5.1/pixi.min.js",
                    "/files/neko-ts/app/neko.js?v=3c64656ea23f46e7b5fcc404d647e585",
                ]);
            });
        }
        static loadScriptsAsync(urls) {
            return __awaiter(this, void 0, void 0, function* () {
                for (let url of urls) {
                    yield new Promise(resolve => {
                        let scriptElem = document.createElement("script");
                        scriptElem.onload = () => resolve();
                        scriptElem.async = true;
                        scriptElem.src = url;
                        document.body.appendChild(scriptElem);
                    });
                }
            });
        }
    }
    NekoDemo.BootLoader = BootLoader;
})(NekoDemo || (NekoDemo = {}));
//# sourceMappingURL=bootloader.js.map