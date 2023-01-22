export class ScrollRestore {
    constructor() {
        this._sessionKey = "[ScrollRestore]" + window.location.href;
        if (!ScrollRestore.isReloadOrHistory()) {
            sessionStorage.setItem(this._sessionKey, JSON.stringify({ scrollY: 0 }));
        }
        window.addEventListener("scroll", EventUtil.debounce(() => {
            sessionStorage.setItem(this._sessionKey, JSON.stringify({ scrollY: window.scrollY }));
        }, 100));
    }
    restore() {
        if (ScrollRestore.isReloadOrHistory()) {
            const json = sessionStorage.getItem(this._sessionKey);
            if (json !== null) {
                const scrollState = JSON.parse(json);
                window.scrollTo(0, scrollState.scrollY);
            }
        }
    }
    static isReloadOrHistory() {
        const type = window.performance.getEntriesByType("navigation")[0].type;
        return (type === "reload" || type === "back_forward");
    }
}
class EventUtil {
    constructor() { }
    static debounce(callback, interval) {
        let timerId;
        return () => {
            if (timerId !== undefined) {
                window.clearTimeout(timerId);
            }
            timerId = window.setTimeout(() => {
                timerId = undefined;
                callback();
            }, interval);
        };
    }
}
