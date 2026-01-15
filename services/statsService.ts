
export interface DailyStat {
  date: string;
  count: number;
}

export const recordActivity = (points: number = 1) => {
  const today = new Date().toISOString().split('T')[0];
  const stats: DailyStat[] = JSON.parse(localStorage.getItem('user_daily_stats') || '[]');
  const todayStat = stats.find(s => s.date === today);

  if (todayStat) {
    todayStat.count += points;
  } else {
    stats.push({ date: today, count: points });
  }

  // 只保留最近 30 天
  const filteredStats = stats.slice(-30);
  localStorage.setItem('user_daily_stats', JSON.stringify(filteredStats));
  updateStreak();
};

const updateStreak = () => {
  const today = new Date().toISOString().split('T')[0];
  const lastDate = localStorage.getItem('last_study_date');
  let streak = parseInt(localStorage.getItem('study_streak') || '0');

  if (lastDate !== today) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (lastDate === yesterdayStr) {
      streak += 1;
    } else {
      streak = 1;
    }
    localStorage.setItem('last_study_date', today);
    localStorage.setItem('study_streak', streak.toString());
  }
};

export const getStats = () => {
  const stats: DailyStat[] = JSON.parse(localStorage.getItem('user_daily_stats') || '[]');
  const streak = parseInt(localStorage.getItem('study_streak') || '0');
  const collections = JSON.parse(localStorage.getItem('user_collection') || '[]');
  
  // 获取过去7天的数据用于图表
  const last7Days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dStr = d.toISOString().split('T')[0];
    const stat = stats.find(s => s.date === dStr);
    return stat ? stat.count : 0;
  });

  return {
    streak,
    totalWords: collections.filter((c: any) => c.type === 'word').length,
    chartData: last7Days,
    todayPoints: stats.find(s => s.date === new Date().toISOString().split('T')[0])?.count || 0
  };
};
