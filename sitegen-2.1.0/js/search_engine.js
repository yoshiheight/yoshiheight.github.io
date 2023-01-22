export class Searcher {
    constructor(keywordString, _dbLinkFormat, _startCallback, _hitCallback, _completeCallback) {
        this._dbLinkFormat = _dbLinkFormat;
        this._startCallback = _startCallback;
        this._hitCallback = _hitCallback;
        this._completeCallback = _completeCallback;
        this._searchCondition = new SearchCondition(keywordString);
    }
    search() {
        this._startCallback();
        this.searchAjaxJson(0, 0);
    }
    searchAjaxJson(dbFileNo, hitCount) {
        const dbUrl = this._dbLinkFormat.replace("{0}", String(dbFileNo));
        fetch(dbUrl)
            .then(response => response.json())
            .then((articles) => {
            for (const article of articles) {
                if (article.url.length === 0) {
                    this._completeCallback(hitCount);
                    return;
                }
                const hitResult = this._searchCondition.searchIn(article);
                if (hitResult !== undefined) {
                    this._hitCallback(hitCount++, hitResult);
                }
            }
            this.searchAjaxJson(dbFileNo + 1, hitCount);
        });
    }
}
class SearchCondition {
    constructor(keywordString) {
        const quoteRegex = /".*?"/g;
        this._keywords = (keywordString.match(quoteRegex) ?? []).map(keyword => keyword.slice(1, -1))
            .concat(keywordString.replace(quoteRegex, "").match(/\S+/g) ?? [])
            .map(keyword => new Keyword(keyword.toLowerCase()))
            .filter(keyword => keyword.isValid);
    }
    searchIn(article) {
        const content = article.content.toLowerCase();
        const title = article.title.toLowerCase();
        const tags = article.tags
            .map(tag => tag.name)
            .concat(article.category.name)
            .map(tag => tag.toLowerCase());
        let contentHitIndex = -1;
        const isHit = this._keywords.length > 0
            && this._keywords.every(keyword => (contentHitIndex = keyword.searchIn(title, tags, content)) !== -1);
        return isHit ? new HitResult(article, contentHitIndex) : undefined;
    }
}
class Keyword {
    constructor(_keyword) {
        this._keyword = _keyword;
    }
    get isValid() {
        return this._keyword.length > 0;
    }
    searchIn(title, tags, content) {
        if (title.indexOf(this._keyword) !== -1 || tags.some(tag => tag.indexOf(this._keyword) !== -1)) {
            return 0;
        }
        else {
            return content.indexOf(this._keyword);
        }
    }
}
export class HitResult {
    constructor(article, contentHitIndex) {
        this.article = article;
        this.contentHitIndex = contentHitIndex;
    }
}
