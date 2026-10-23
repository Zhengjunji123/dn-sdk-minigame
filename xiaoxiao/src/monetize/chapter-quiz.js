/**
 * 答题 / 通关统计（对齐成语 $LevelQuiz）
 *
 * 002 玩法映射：
 * - ANSWER：一次放置触发了整行 / 整列消除（算一次答题）
 * - CLEAR：本关宝石收集达标过关（engine.won）
 *
 * Track.track('$LevelQuiz', { type, value, times })
 * times：本次进程内该 type 第几次（内存累加，冷启动清零）
 */
import { Track } from './sdk-facade.js';

export const LEVEL_QUIZ_TYPE = {
  CLEAR: 'CLEAR',
  ANSWER: 'ANSWER',
};

const timesByType = {
  [LEVEL_QUIZ_TYPE.CLEAR]: 0,
  [LEVEL_QUIZ_TYPE.ANSWER]: 0,
};

/**
 * @param {'CLEAR'|'ANSWER'} type
 * @param {number} levelId 关卡号 → analysis.value
 */
export function reportLevelQuiz(type, levelId) {
  if (type !== LEVEL_QUIZ_TYPE.CLEAR && type !== LEVEL_QUIZ_TYPE.ANSWER) return;
  const value = Number(levelId);
  if (!Number.isFinite(value) || value < 1) return;
  timesByType[type] += 1;
  const times = timesByType[type];
  try {
    Track.track('$LevelQuiz', { type, value, times });
    console.log('[LevelQuiz]', { type, value, times });
  } catch (err) {
    console.warn('[LevelQuiz] track failed', err);
  }
}

export default {
  LEVEL_QUIZ_TYPE,
  reportLevelQuiz,
};
