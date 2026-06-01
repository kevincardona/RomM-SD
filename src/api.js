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
  'nintendo ds': 'nds',
  'nintendo 3ds': 'n3ds',
  'nintendo gamecube': 'gc',
  'gamecube': 'gc',
  'game boy': 'gb',
  'game boy advance': 'gba',
  'game boy color': 'gbc',
  'nintendo entertainment system (nes)': 'nes',
  'super nintendo entertainment system (snes)': 'snes',
  'playstation': 'psx',
  'playstation 2': 'ps2',
  'playstation 3': 'ps3',
  'playstation 4': 'ps4',
  'playstation portable': 'psp',
  'playstation vita': 'psvita',
  'sega genesis': 'megadrive',
  'sega dreamcast': 'dreamcast',
  'nintendo wii': 'wii',
  'nintendo wii u': 'wiiu',
  'nintendo switch': 'switch'
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
  const response = await fetch(`${baseUrl}/api/firmware`, {
    headers: { 'Authorization': token }
  });
  if (!response.ok) return [];
  const data = await response.json();
  return Array.isArray(data) ? data : (data.items || []);
}
