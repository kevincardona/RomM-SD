export async function authenticate(url, username, password) {
  const baseUrl = url.replace(/\/$/, '');
  const token = 'Basic ' + btoa(`${username}:${password}`);

  const response = await fetch(`${baseUrl}/api/roms`, {
    headers: {
      'Authorization': token
    }
  });
  
  if (!response.ok) {
    let errText = response.statusText;
    try { const t = await response.text(); if (t) errText = t; } catch(e){}
    throw new Error(`Auth failed (${response.status}): ${errText}`);
  }
  
  return token; // Return the full 'Basic ...' string
}

const platformFolderMap = {
  'nintendo 64': 'n64',
  'n64': 'n64',
  'nintendo ds': 'nds',
  'nds': 'nds',
  'nintendo 3ds': 'n3ds',
  '3ds': 'n3ds',
  'nintendo gamecube': 'gc',
  'gamecube': 'gc',
  'gc': 'gc',
  'game boy': 'gb',
  'gb': 'gb',
  'game boy advance': 'gba',
  'gba': 'gba',
  'game boy color': 'gbc',
  'gbc': 'gbc',
  'nintendo entertainment system': 'nes',
  'nes': 'nes',
  'super nintendo': 'snes',
  'super nintendo entertainment system': 'snes',
  'snes': 'snes',
  'playstation': 'psx',
  'psx': 'psx',
  'ps1': 'psx',
  'playstation 2': 'ps2',
  'ps2': 'ps2',
  'playstation 3': 'ps3',
  'ps3': 'ps3',
  'playstation 4': 'ps4',
  'ps4': 'ps4',
  'playstation portable': 'psp',
  'psp': 'psp',
  'playstation vita': 'psvita',
  'psvita': 'psvita',
  'sega genesis': 'megadrive',
  'genesis': 'megadrive',
  'megadrive': 'megadrive',
  'sega dreamcast': 'dreamcast',
  'dreamcast': 'dreamcast',
  'dc': 'dreamcast',
  'nintendo wii': 'wii',
  'wii': 'wii',
  'nintendo wii u': 'wiiu',
  'wiiu': 'wiiu',
  'nintendo switch': 'switch',
  'switch': 'switch',
  'sega saturn': 'saturn',
  'saturn': 'saturn',
  'sega cd': 'segacd',
  'sega 32x': 'sega32x',
  'atari 2600': '2600',
  'atari 5200': '5200',
  'atari 7800': '7800',
  'lynx': 'lynx',
  'game gear': 'gamegear',
  'ms-dos': 'dos',
  'dos': 'dos',
  'arcade': 'arcade',
  'mame': 'mame',
  'neogeo': 'neogeo',
  'neo geo': 'neogeo',
  'pc engine': 'pcengine',
  'turbografx-16': 'pcengine',
  'wonderswan': 'wonderswan',
  'virtual boy': 'virtualboy',
};

export async function fetchLibrary(url, token) {
  const baseUrl = url.replace(/\/$/, '');
  
  const response = await fetch(`${baseUrl}/api/roms?limit=10000`, {
    headers: {
      'Authorization': token // Token already includes 'Basic' or 'Bearer'
    }
  });
  
  if (!response.ok) {
    let errText = response.statusText;
    try { const t = await response.text(); if (t) errText = t; } catch(e){}
    throw new Error(`Fetch failed (${response.status}): ${errText}`);
  }
  
  const data = await response.json();
  const roms = Array.isArray(data) ? data : (data.items || data.roms || []);
  
  const library = { platforms: {}, collections: {}, all: [] };
  
  roms.forEach(rom => {
    const platform = rom.platform_display_name || rom.system?.name || rom.platform || 'Unknown';
    if (!library.platforms[platform]) library.platforms[platform] = [];
    
    const coverUrlRaw = rom.path_cover_large || rom.path_cover_small || rom.url_cover;
    const coverUrl = coverUrlRaw ? `${baseUrl}${coverUrlRaw}` : null;
    
    const emuFolder = platformFolderMap[platform.toLowerCase()] || platform.toLowerCase();
    
    const game = {
      id: rom.id || rom.hash || rom.name,
      title: rom.name || rom.title,
      platform: platform,
      emuFolder: emuFolder,
      coverUrl: coverUrl,
      downloadUrl: `${baseUrl}/api/roms/${rom.id}/content/${encodeURIComponent(rom.fs_name || rom.filename || `${rom.name || 'game'}.rom`)}`,
      filename: rom.fs_name || rom.filename || `${rom.name || 'game'}.rom`
    };
    
    library.platforms[platform].push(game);
    library.all.push(game);
    
    const collections = rom.metadatum?.collections || rom.collections || [];
    collections.forEach(c => {
      if (!library.collections[c]) library.collections[c] = [];
      library.collections[c].push(game);
    });
  });
  
  return library;
}

export async function fetchFirmware(url, token) {
  const baseUrl = url.replace(/\/$/, '');
  const result = [];

  // Per the RomM OpenAPI spec, /api/firmware only accepts a platform_id query
  // parameter and returns firmware for a single platform. Platforms themselves
  // include their `firmware` array, so we paginate platforms and collect all
  // firmware while preserving the platform association (slug, fs_slug, id).
  let offset = 0;
  const limit = 200;
  try {
    while (true) {
      const response = await fetch(`${baseUrl}/api/platforms?limit=${limit}&offset=${offset}`, {
        headers: { 'Authorization': token }
      });
      if (!response.ok) break;
      const data = await response.json();
      const list = Array.isArray(data) ? data : (data.items || []);
      if (list.length === 0) break;

      for (const p of list) {
        const firmwares = Array.isArray(p.firmware) ? p.firmware : [];
        for (const fw of firmwares) {
          result.push({
            ...fw,
            platform_id: fw.platform_id ?? p.id,
            platform_slug: fw.platform_slug || p.slug,
            platform_fs_slug: p.fs_slug || fw.platform_fs_slug,
            platform_display_name: p.display_name || p.name,
            platform: {
              id: p.id,
              slug: p.slug,
              fs_slug: p.fs_slug,
              display_name: p.display_name,
              name: p.name,
            },
          });
        }
      }

      if (list.length < limit) break;
      offset += limit;
      if (offset > 5000) break;
    }
  } catch (e) {
    console.warn('fetchFirmware via platforms failed:', e.message);
  }
  return result;
}

export async function fetchPlatforms(url, token) {
  const baseUrl = url.replace(/\/$/, '');
  const byId = {};
  const bySlug = {};
  const byFsSlug = {};
  try {
    let offset = 0;
    const limit = 200;
    while (true) {
      const response = await fetch(`${baseUrl}/api/platforms?limit=${limit}&offset=${offset}&with_extra=false`, {
        headers: { 'Authorization': token }
      });
      if (!response.ok) break;
      const data = await response.json();
      const list = Array.isArray(data) ? data : (data.items || []);
      if (list.length === 0) break;

      for (const p of list) {
        const display = p.display_name || p.name || p.slug || `Platform ${p.id ?? ''}`;
        const slug = p.slug || (typeof p.id === 'string' ? p.id : null);
        const fsSlug = p.fs_slug || slug;
        const iconRel = p.path_icon || p.url_icon || p.icon || null;
        const iconUrl = iconRel ? (iconRel.startsWith('http') ? iconRel : `${baseUrl}${iconRel.startsWith('/') ? '' : '/'}${iconRel}`) : null;
        const entry = { display, slug, fsSlug, name: p.name, iconUrl, raw: p };
        if (p.id != null) byId[String(p.id)] = entry;
        if (slug) bySlug[String(slug).toLowerCase()] = entry;
        if (fsSlug) byFsSlug[String(fsSlug).toLowerCase()] = entry;
      }

      if (list.length < limit) break;
      offset += limit;
      if (offset > 5000) break;
    }
  } catch (e) {
    console.warn('fetchPlatforms failed:', e.message);
  }
  return { byId, bySlug, byFsSlug };
}
