import path from 'node:path';
import fs from 'node:fs/promises';
import { createWriteStream } from 'node:fs';

export async function downloadRom({ id, url, destinationPath, token, sender }, { logInfo, logError }) {
  try {
    logInfo(`Starting download for ID ${id} to ${destinationPath}`);
    await fs.mkdir(path.dirname(destinationPath), { recursive: true });

    const response = await fetch(url, { headers: { Authorization: token } });
    if (!response.ok) {
      logError(`Download failed with status ${response.status} ${response.statusText}`);
      throw new Error(`Failed to download: ${response.statusText}`);
    }

    const totalBytes = parseInt(response.headers.get('content-length') || '0', 10);
    let downloadedBytes = 0;
    const fileStream = createWriteStream(destinationPath);
    let lastReportTime = 0;
    let lastReportedPercent = 0;

    for await (const chunk of response.body) {
      fileStream.write(chunk);
      downloadedBytes += chunk.length;
      if (totalBytes > 0) {
        const percent = (downloadedBytes / totalBytes) * 100;
        const now = Date.now();
        if (percent - lastReportedPercent >= 1 || now - lastReportTime > 100) {
          sender?.send('download-progress', { id, percent });
          lastReportTime = now;
          lastReportedPercent = percent;
        }
      }
    }
    fileStream.end();

    logInfo(`Finished download for ID ${id}`);
    sender?.send('download-progress', { id, percent: 100 });
    return { success: true };
  } catch (e) {
    logError(`Download exception: ${e.message}`);
    return { success: false, error: e.message };
  }
}
