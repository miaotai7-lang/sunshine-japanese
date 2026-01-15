import { Article, BibleVerse, LearningCategory } from '../types';

const STORAGE_KEYS = {
  ARTICLES: 'komorebi_articles_cache',
  BIBLE: 'komorebi_bible_cache',
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

export function getArticleById(id: string): Article | undefined {
  return getArticlesCache().find(a => a.id === id);
}

export function getArticlesByDateAndCategory(date: string, category: LearningCategory): Article[] {
  return getArticlesCache().filter(a => a.date === date && a.category === category);
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
