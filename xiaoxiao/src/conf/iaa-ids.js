/**
 * 腾讯 DataNexus 数据源（IAA 回传）。
 * 统一 SDK 实际从 js/sdk/ext.js 的 wxGameCode / wxGameSecretKey 读取，这里与之保持一致，
 * 仅供 shared SDK 兼容迁移时引用。
 * TODO(002)：待运营开通数据源后同步填入 ext.js 与本文件。
 */
import extConfig from '../../js/sdk/ext.js';

const DatanexusConfig = (() => {
  const bag = {};
  bag.enabled = !!(extConfig && extConfig.wxGameCode);
  bag.user_action_set_id = (extConfig && extConfig.wxGameCode) || '';
  bag.secret_key = (extConfig && extConfig.wxGameSecretKey) || '';
  return bag;
})();

export default DatanexusConfig;
