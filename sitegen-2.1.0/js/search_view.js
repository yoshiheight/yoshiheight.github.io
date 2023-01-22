import { ScrollRestore } from "./scroll_restore.js";
import * as searchjs from "./search_engine.js";
export class SearchView {
    constructor(_dbLinkFormatWithCacheBusting) {
        this._dbLinkFormatWithCacheBusting = _dbLinkFormatWithCacheBusting;
        this._inputKeyword = document.querySelector("#sdi-input-search-keyword");
        this._searchForm = document.querySelector("#sdi-container form");
        this._headerArticleList = document.querySelector("#sdi-header-article-list");
        this._articleList = document.querySelector("#sdi-body-article-list");
        this._footer = document.querySelector("#sdi-footer");
        this._searchForm.addEventListener("submit", e => {
            if (this._inputKeyword.value.trim().length === 0) {
                this._inputKeyword.focus();
                e.stopPropagation();
                e.preventDefault();
            }
        });
        this._inputKeyword.focus();
    }
    start() {
        const scrollRestore = new ScrollRestore();
        const keywordString = new URLSearchParams(window.location.search).get("q")?.trim();
        if (keywordString === undefined) {
            this._footer.style.visibility = "visible";
            return;
        }
        this._inputKeyword.value = keywordString;
        const articleElementFactory = new ArticleElementFactory();
        new searchjs.Searcher(keywordString, this._dbLinkFormatWithCacheBusting, () => {
            SearchView.setDocumentTitle(keywordString);
            this._headerArticleList.textContent = "検索中...";
        }, (index, hitResult) => {
            this._articleList.appendChild(articleElementFactory.create(hitResult));
        }, hitCount => {
            this._headerArticleList.textContent = `検索結果 (${hitCount}件)`;
            this._footer.style.visibility = "visible";
            scrollRestore.restore();
        }).search();
    }
    static setDocumentTitle(keywordString) {
        const titleWord = keywordString.replace(/\s+/g, " ");
        const separateIndex = document.title.indexOf("|");
        document.title = document.title.slice(0, separateIndex) + titleWord + document.title.slice(separateIndex - 1);
    }
}
class ArticleElementFactory {
    create(hitResult) {
        const article = hitResult.article;
        const dateElem = DomUtil.createDiv({ cls: "sdc-article-list-date", text: article.date });
        const titleElem = DomUtil.createDiv({ cls: "sdc-article-list-title" });
        titleElem.appendChild(DomUtil.createAnchor({ url: article.url, text: article.title }));
        const tagsElem = DomUtil.createDiv({ cls: "sdc-tags sdc-article-list-tags" });
        const categoryDiv = DomUtil.createDiv({ cls: `sdc-tag sdc-primary-tag sdc-primary-tag${article.category.order}` });
        categoryDiv.appendChild(DomUtil.createAnchor({ url: article.category.url, text: article.category.name }));
        tagsElem.appendChild(categoryDiv);
        for (const tag of article.tags) {
            const tagDiv = DomUtil.createDiv({ cls: "sdc-tag" });
            tagDiv.appendChild(DomUtil.createAnchor({ url: tag.url, text: tag.name }));
            tagsElem.appendChild(tagDiv);
        }
        const itemElem = DomUtil.createDiv({ cls: "sdc-article-list-item" });
        itemElem.appendChild(titleElem);
        itemElem.appendChild(tagsElem);
        itemElem.appendChild(dateElem);
        const startIndex = Math.max(0, hitResult.contentHitIndex - 70);
        const summary = (startIndex === 0 ? "" : "…") + article.content.substr(startIndex, 140) + "…";
        itemElem.appendChild(DomUtil.createDiv({ cls: "sdc-article-list-summary", text: summary }));
        return itemElem;
    }
}
class DomUtil {
    constructor() { }
    static createDiv(props) {
        const elem = document.createElement("div");
        if (props.id !== undefined) {
            elem.id = props.id;
        }
        if (props.cls !== undefined) {
            elem.className = props.cls;
        }
        if (props.text !== undefined) {
            elem.textContent = props.text;
        }
        return elem;
    }
    static createAnchor(props) {
        const elem = document.createElement("a");
        elem.href = props.url;
        elem.textContent = props.text;
        return elem;
    }
}
