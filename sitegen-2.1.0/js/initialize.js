"use strict";
window.addEventListener("pageshow", e => {
    if (e.persisted) {
        document.body.style.overflow = "hidden";
        document.body.style.paddingBottom = "1px";
        window.setTimeout(() => {
            document.body.style.overflow = "auto";
            document.body.style.paddingBottom = "0px";
        }, 100);
    }
});
