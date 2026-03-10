/**
 * 数字人壁纸 - GitHub 更新和资源管理
 */

const GITHUB_REPO = 'MMXC/digital-wallpaper';
export const CURRENT_VERSION = '0.1.0';

let broadcast = null;

/**
 * 设置广播函数
 */
export function setBroadcast(fn) {
  broadcast = fn;
}

/**
 * 启动时自动检查更新
 */
export async function autoCheckUpdate() {
  const result = await checkForUpdates();
  
  if (result.needsUpdate && broadcast) {
    broadcast({
      type: 'update_available',
      data: {
        current: result.current,
        latest: result.latest,
        releaseUrl: result.releaseUrl,
        downloadUrl: result.downloadUrl
      }
    });
    console.log(`🔄 发现新版本: v${result.latest} (当前: v${result.current})`);
  } else {
    console.log(`✅ 已是最新版本: v${CURRENT_VERSION}`);
  }
  
  return result;
}

/**
 * 获取最新 release 信息
 */
export async function checkForUpdates() {
  try {
    const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
      headers: {
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'Digital-Wallpaper'
      }
    });
    
    if (!response.ok) {
      return { error: '无法检查更新' };
    }
    
    const data = await response.json();
    const latestVersion = data.tag_name?.replace('v', '') || '0.0.0';
    
    const needsUpdate = compareVersions(latestVersion, CURRENT_VERSION) > 0;
    
    return {
      current: CURRENT_VERSION,
      latest: latestVersion,
      needsUpdate,
      releaseUrl: data.html_url,
      downloadUrl: data.assets?.[0]?.browser_download_url,
      publishedAt: data.published_at,
      body: data.body
    };
  } catch (e) {
    return { error: e.message };
  }
}

/**
 * 获取资源列表
 */
export async function getResources() {
  // 内置资源
  const builtIn = {
    environments: [
      { id: 'city', name: '城市', preset: 'city', type: 'builtin' },
      { id: 'sunset', name: '日落', preset: 'sunset', type: 'builtin' },
      { id: 'night', name: '夜晚', preset: 'night', type: 'builtin' },
      { id: 'forest', name: '森林', preset: 'forest', type: 'builtin' },
      { id: 'dawn', name: '黎明', preset: 'dawn', type: 'builtin' },
      { id: 'studio', name: '工作室', preset: 'studio', type: 'builtin' },
      { id: 'park', name: '公园', preset: 'park', type: 'builtin' },
      { id: 'lobby', name: '大堂', preset: 'lobby', type: 'builtin' },
    ],
    effects: [
      { id: 'confetti', name: '彩带', type: 'builtin' },
      { id: 'rain', name: '雨', type: 'builtin' },
      { id: 'snow', name: '雪', type: 'builtin' },
      { id: 'fireworks', name: '烟花', type: 'builtin' },
      { id: 'sparkle', name: '闪光', type: 'builtin' },
    ]
  };
  
  // 从 GitHub 获取自定义资源
  let custom = { environments: [], effects: [] };
  
  try {
    const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/resources`, {
      headers: { 'User-Agent': 'Digital-Wallpaper' }
    });
    
    if (response.ok) {
      const files = await response.json();
      for (const file of files) {
        if (file.name.endsWith('.json')) {
          // 可以扩展自定义资源
        }
      }
    }
  } catch (e) {
    // 忽略资源加载错误
  }
  
  return { builtIn, custom };
}

/**
 * 版本比较
 */
function compareVersions(v1, v2) {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }
  return 0;
}

export default { checkForUpdates, getResources };
