
export enum JLPTLevel {
  N1 = 'N1',
  N2 = 'N2',
  N3 = 'N3',
  N4 = 'N4',
  N5 = 'N5'
}

export type LearningCategory = 'news' | 'forum' | 'trending';

export interface Vocabulary {
  id: string;
  word: string;
  reading: string;
  meaning: string;
  level: JLPTLevel;
}

export interface GrammarPoint {
  id: string;
  point: string;
  explanation: string;
  example: string;
  level: JLPTLevel;
}

export interface Article {
  id: string;
  category: LearningCategory;
  title: string;
  summary: string;
  content: string;
  sentences: string[]; 
  translations: string[]; 
  level: JLPTLevel;
  vocabulary: Vocabulary[];
  grammar: GrammarPoint[];
  date: string; 
  sourceUrl?: string;
}

export interface BibleVerse {
  id: string;
  reference: string;
  japaneseText: string;
  chineseTranslation: string;
  sentences: string[]; 
  translations: string[]; 
  vocabulary: Vocabulary[];
  grammar: GrammarPoint[];
}

export interface QuizQuestion {
  id: string;
  type: 'listening' | 'reading' | 'grammar' | 'vocabulary';
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  audioText?: string;
}

export interface CollectionItem {
  id: string;
  type: 'word' | 'grammar' | 'sentence' | 'verse' | 'article';
  content: any;
  addedAt: number;
  nextReviewAt: number;
  reviewStage: number;
}

export interface Song {
  id: string;
  rank: number;
  title: string;
  artist: string;
  lyrics: string; // 带 <ruby> 的全量歌词
  translation: string; // 全量中文翻译
  youtubeUrl: string;
}
