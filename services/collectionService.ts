import { CollectionItem } from '../types';

const COLLECTION_KEY = 'user_collection';

export const getCollection = (): CollectionItem[] => {
  const data = localStorage.getItem(COLLECTION_KEY);
  return data ? JSON.parse(data) : [];
};

export const toggleCollection = (type: 'word' | 'grammar' | 'sentence' | 'verse', content: any) => {
  const collection = getCollection();
  // 唯一性标识：词汇用 word，句子用内容前20字，语法点用 point
  const contentId = content.id || (content.word) || (content.point) || (typeof content === 'string' ? content.substring(0, 20) : JSON.stringify(content).substring(0,20));
  
  const existingIdx = collection.findIndex(item => {
    const itemContent = item.content;
    const itemId = itemContent.id || (itemContent.word) || (itemContent.point) || (typeof itemContent === 'string' ? itemContent.substring(0, 20) : JSON.stringify(itemContent).substring(0,20));
    return itemId === contentId;
  });

  if (existingIdx > -1) {
    collection.splice(existingIdx, 1);
    localStorage.setItem(COLLECTION_KEY, JSON.stringify(collection));
    return false; // 已移除
  } else {
    const newItem: CollectionItem = {
      id: `col-${Date.now()}`,
      type,
      content,
      addedAt: Date.now(),
      nextReviewAt: Date.now() + (24 * 60 * 60 * 1000), // 初始 1 天后复习
      reviewStage: 1
    };
    collection.push(newItem);
    localStorage.setItem(COLLECTION_KEY, JSON.stringify(collection));
    return true; // 已添加
  }
};

export const isCollected = (content: any): boolean => {
  if (!content) return false;
  const collection = getCollection();
  const contentId = content.id || (content.word) || (content.point) || (typeof content === 'string' ? content.substring(0, 20) : JSON.stringify(content).substring(0,20));
  
  return collection.some(item => {
    const itemContent = item.content;
    const itemId = itemContent.id || (itemContent.word) || (itemContent.point) || (typeof itemContent === 'string' ? itemContent.substring(0, 20) : JSON.stringify(itemContent).substring(0,20));
    return itemId === contentId;
  });
};
