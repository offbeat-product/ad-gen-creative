/**
 * URL から ?job_id=xxx を削除する。
 * 履歴からの誤った自動復元を防ぐためのユーティリティ。
 */
export const clearJobIdFromUrl = () => {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has('job_id')) return;
  url.searchParams.delete('job_id');
  window.history.replaceState({}, '', url.toString());
};
