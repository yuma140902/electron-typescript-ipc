/* eslint-disable no-undef */
import {
  contextBridge as originalContextBridge,
  ipcMain as originalIpcMain,
  ipcRenderer as originalIpcRenderer,
  IpcRendererEvent,
  IpcMainInvokeEvent,
  BrowserWindow,
} from 'electron';

export type GetApiType<
  FromRenderer extends Record<string, (...args: any[]) => Promise<any>>,
  FromMain extends Record<string, (...args: any[]) => Promise<any>>,
> = {
  invoke: FromRenderer;
  on: {
    [K in keyof FromMain]: (
      listener: (
        event: IpcRendererEvent,
        ...args: Parameters<FromMain[K]>
      ) => void,
      __originalFunction?: FromMain[K],
    ) => void;
  };
};

type Api = GetApiType<Record<string, any>, Record<string, any>>;

/**
 * @example
 * import { contextBridge, ipcRenderer, GetApiType } from 'electron-typescript-ipc';
 *
 * export type Api = GetApiType<
 *   {
 *     getDataFromStore: (str: string) => Promise<string>;
 *   },
 *   {
 *     showAlert: (text: string, num: number) => Promise<void>;
 *   }
 * >;
 *
 * const api: Api = {
 *   invoke: {
 *     getDataFromStore: async (key: string) => {
 *       return await ipcRenderer.invoke<Api>('getDataFromStore', key);
 *     },
 *   },
 *   on: {
 *     showAlert: (listener) => {
 *       ipcRenderer.on<Api>('showAlert', listener);
 *     },
 *   },
 * };
 *
 * contextBridge.exposeInMainWorld('myAPI', api);
 *
 * declare global {
 *   interface Window {
 *     myAPI: Api;
 *   }
 * }
 */
export const contextBridge = {
  exposeInMainWorld: <T extends GetApiType<any, any>>(
    apiKey: string,
    api: T,
  ) => {
    originalContextBridge.exposeInMainWorld(apiKey, api);
  },
};

export class IpcRenderer<T extends Api> {
  constructor() {}

  invoke<C extends keyof T['invoke']>(
    channel: C,
    ...args: Parameters<T['invoke'][C]>
  ): Promise<ReturnType<T['invoke'][C]>> {
    return originalIpcRenderer.invoke(channel as string, ...args);
  }

  on<C extends keyof T['on']>(
    channel: C,
    listener: (
      event: IpcRendererEvent,
      ...args: Parameters<Parameters<T['on'][C]>['1']>
    ) => void,
  ): void {
    originalIpcRenderer.on(
      channel as string,
      (event: IpcRendererEvent, ...args: unknown[]) => {
        listener(
          event,
          ...(args as Parameters<Parameters<T['on'][C]>['1']>),
        );
      },
    );
  }

  removeListener<C extends keyof T['on']>(
    channel: C,
    listener: (...args: unknown[]) => void,
  ): void {
    originalIpcRenderer.removeListener(channel as string, listener);
  }
}

export class IpcMain<T extends Api> {
  constructor() {}

  handle<C extends keyof T['invoke']>(
    channel: C,
    listener: (
      event: IpcMainInvokeEvent,
      ...args: Parameters<T['invoke'][C]>
    ) => ReturnType<T['invoke'][C]>,
  ): void {
    originalIpcMain.handle(
      channel as string,
      (event: IpcMainInvokeEvent, ...args: unknown[]) => {
        return listener(
          event,
          ...(args as Parameters<T['invoke'][keyof T['invoke']]>),
        );
      },
    );
  }

  send<C extends keyof T['on']>(
    window: BrowserWindow,
    channel: C,
    ...args: Parameters<Parameters<T['on'][C]>['1']>
  ): void {
    window.webContents.send(channel as string, ...args);
  }

  removeHandler<C extends keyof T['invoke']>(channel: C): void {
    originalIpcMain.removeHandler(channel as string);
  }
}
