import { Article, BibleVerse, LearningCategory } from '../types';

const STORAGE_KEYS = {
  ARTICLES: 'komorebi_articles_cache',
  BIBLE: 'komorebi_bible_cache',
  SONGS: 'cached_songs_list',
  LAST_SYNC: 'last_prefetch_date'
};

export function getArticlesCache(): Article[] {
  const data = localStorage.getItem(STORAGE_KEYS.ARTICLES);
  return data ? JSON.parse(data) : [];
}

export function saveArticlesToCache(articles: Article[]) {
  const existing = getArticlesCache();
  const updated = [...existing];
  articles.forEach(art => {
    if (!updated.find(x => x.id === art.id)) {
      updated.push(art);
    }
  });
  localStorage.setItem(STORAGE_KEYS.ARTICLES, JSON.stringify(updated));
}

export function clearCacheByDate(date: string) {
  const articles = getArticlesCache().filter(a => a.date !== date);
  localStorage.setItem(STORAGE_KEYS.ARTICLES, JSON.stringify(articles));
}

export function clearAllLearningCache() {
  localStorage.removeItem(STORAGE_KEYS.ARTICLES);
  localStorage.removeItem(STORAGE_KEYS.BIBLE);
  localStorage.removeItem(STORAGE_KEYS.SONGS);
  localStorage.removeItem(STORAGE_KEYS.LAST_SYNC);
}

export function getArticleById(id: string): Article | undefined {
  return getArticlesCache().find(a => a.id === id);
}

export function getBibleCache(): BibleVerse[] {
  const data = localStorage.getItem(STORAGE_KEYS.BIBLE);
  return data ? JSON.parse(data) : [];
}

export function saveBibleVersesToCache(verses: BibleVerse[]) {
  const existing = getBibleCache();
  const updated = [...existing];
  verses.forEach(v => {
    if (!updated.find(x => x.id === v.id)) {
      updated.push(v);
    }
  });
  localStorage.setItem(STORAGE_KEYS.BIBLE, JSON.stringify(updated));
}

export function getBibleVerseById(id: string): BibleVerse | undefined {
  return getBibleCache().find(v => v.id === id);
}
