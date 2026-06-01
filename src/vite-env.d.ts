/// <reference types="vite/client" />

export interface Config {
  url: string;
  username: string;
  password: string;
  token: string;
  emudeckPath: string;
  gridSize: 'small' | 'medium' | 'large' | string;
  showGameTitles: boolean;
  saveSyncEnabled: boolean;
  browserPlayEnabled: boolean;
  biosLayout: 'emudeck' | 'flat' | 'auto' | string;
}

export interface Game {
  id: string | number;
  title: string;
  platform: string;
  emuFolder: string;
  coverUrl: string | null;
  downloadUrl: string;
  filename: string;
  downloaded?: boolean;
  localPath?: string;
  downloadProgress?: number;
}

export interface Library {
  platforms: Record<string, Game[]>;
  collections: Record<string, Game[]>;
  all: Game[];
}

export type Tab =
  | 'library_all'
  | 'platforms'
  | 'collections'
  | 'downloaded'
  | 'settings'
  | 'firmware'
  | 'savesync';

export interface RumbleSpec {
  low: number;
  high: number;
  duration: number;
}

export interface ControllerButtonEvent {
  button: string;
  state: 'up' | 'down' | string;
}

export interface ControllerAxisEvent {
  axis: string;
  value: number;
}

export interface DownloadProgressEvent {
  id: string | number;
  percent: number;
}

export interface CheckFileResult {
  exists: boolean;
}

export interface CheckBulkFilesResult {
  success: boolean;
  results: boolean[];
}

export interface DownloadRomSpec {
  id: string | number;
  url: string;
  destinationPath: string;
  token: string;
}

export interface DownloadRomResult {
  success: boolean;
  error?: string;
}

export interface LaunchGameSpec {
  localPath: string;
  emuFolder: string;
}

export interface LaunchGameResult {
  success: boolean;
  error?: string;
}

export interface AddToSteamSpec {
  appName: string;
  emuFolder: string;
  localPath?: string;
  coverUrl?: string | null;
}

export interface AddToSteamResult {
  success: boolean;
  error?: string;
}

export interface OpenBrowserPlaySpec {
  serverUrl: string;
  romId: string | number;
  romName: string;
  token: string;
}

export interface OpenBrowserPlayResult {
  success: boolean;
  error?: string;
}

export interface SnapshotGameSpec {
  localPath: string;
  emuFolder: string;
  emudeckPath?: string;
  homeDir: string;
}

export interface StartSaveWatcherSpec {
  gameKey: string;
  localPath: string;
  emuFolder: string;
  emudeckPath?: string;
  homeDir: string;
}

export interface ResolveBiosPathsSpec {
  fsSlug: string;
  slug: string;
  fileName: string;
  emudeckPath?: string;
  layout?: string;
  homeDir: string;
}

export interface BiosPathEntry {
  emulator: string;
  path: string;
  kind?: string;
}

export interface ResolveBiosPathsResult {
  success: boolean;
  paths?: BiosPathEntry[];
}

export interface ListGamesWithSavesSpec {
  library: any;
  homeDir: string;
  emudeckPath: string;
}

export interface PushPullSavesSpec {
  localPath: string;
  emuFolder: string;
  emudeckPath: string;
  homeDir: string;
}

export interface DeleteSaveFileSpec {
  localPath: string;
  emuFolder: string;
  fileName: string;
}

export interface SimpleResult {
  success: boolean;
  error?: string;
}

export interface ElectronAPI {
  ping: () => Promise<string>;
  getConfig: () => Promise<Config | null>;
  getHomeDir: () => Promise<string>;
  getLogs: () => Promise<string>;
  saveConfig: (config: Config) => Promise<void>;
  checkFileExists: (path: string) => Promise<CheckFileResult & { size?: number }>;
  checkBulkFiles: (paths: string[]) => Promise<CheckBulkFilesResult>;
  deleteFile: (path: string) => Promise<void>;
  downloadRom: (spec: DownloadRomSpec) => Promise<DownloadRomResult>;
  onDownloadProgress: (cb: (p: DownloadProgressEvent) => void) => () => void;

  addToSteam: (spec: AddToSteamSpec) => Promise<AddToSteamResult>;
  addSelfToSteam: () => Promise<SimpleResult>;
  launchGame: (spec: LaunchGameSpec) => Promise<LaunchGameResult>;
  openBrowserPlay: (spec: OpenBrowserPlaySpec) => Promise<OpenBrowserPlayResult>;
  closeBrowserPlay: () => Promise<void>;
  showKeyboard: () => void;

  runCloudSync: (action: string) => Promise<any>;
  listGameSaves: (spec: any) => Promise<any>;
  getSaveStatus: (spec: any) => Promise<any>;
  pushSaves: (spec: PushPullSavesSpec) => Promise<any>;
  pullSaves: (spec: PushPullSavesSpec) => Promise<any>;
  deleteCachedSave: (spec: any) => Promise<any>;
  deleteSaveFile: (spec: DeleteSaveFileSpec) => Promise<any>;
  listAllCachedGames: (spec: any) => Promise<any>;
  listGamesWithSaves: (spec: ListGamesWithSavesSpec) => Promise<any>;
  snapshotGame: (spec: SnapshotGameSpec) => Promise<any>;
  startSaveWatcher: (spec: StartSaveWatcherSpec) => Promise<any>;
  stopSaveWatcher: (spec: any) => Promise<any>;

  resolveBiosPaths: (spec: ResolveBiosPathsSpec) => Promise<ResolveBiosPathsResult>;
  getBiosBasePath: (spec: any) => Promise<any>;

  controllerRumble: (spec: RumbleSpec) => void;
  onControllerButton: (cb: (e: ControllerButtonEvent) => void) => () => void;
  onControllerAxis: (cb: (e: ControllerAxisEvent) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
