# electron-typescript-ipc

Library for type-safe use of contextBridge in Electron.

## Motivation

When we implement ipc using contextBridge in TypeScript, we can't know if the method exists (unsafe).
This library is aimed at making it type-safe to use.

## Install

Install with npm (or you can use your favorite tool).

```shell
npm i @yuma140902/electron-typescript-ipc
```

## Usage

This library replaces `ipcRenderer.invoke`, `ipcRenderer.on`, `ipcRenderer.removeListener`, `ipcMain.handle`, `ipcMain.send`, `ipcMain.removeHandler` with `IpcRenderer<T>` and `IpcMain<T>`.

Then you will need to create the following two files (the directory structure is up to you)

- `api.ts`.
  - Defines what kind of communication will be done between the main process and the render process.
- `preload.ts`.
  - The preload script for using contextBridge.

See the example below for more details.

## Example

### `api.ts`

```typescript
import { GetApiType } from '@yuma140902/electron-typescript-ipc';

export type Api = GetApiType<
  {
    getDataFromStore: (str: string) => Promise<string>;
  },
  {
    showAlert: (text: string, num: number) => Promise<void>;
  }
>;

declare global {
  interface Window {
    myAPI: Api;
  }
}
```

### `preload/preload.ts`

```typescript
import { contextBridge, IpcRenderer } from '@yuma140902/electron-typescript-ipc';
import { Api } from 'path/to/api.ts';

const ipcRenderer = new IpcRenderer<Api>();

const api: Api = {
  invoke: {
    getDataFromStore: async (key: string) => {
      return await ipcRenderer.invoke('getDataFromStore', key);
    },
  },
  on: {
    showAlert: (listener) => {
      ipcRenderer.on('showAlert', listener);
    },
  },
};

contextBridge.exposeInMainWorld('myAPI', api);
```


### `global.d.ts`

```typescript
import { Api } from 'path/to/api.ts';

declare global {
  interface Window {
    myApi: Api;
  }
}
```

### `lib/main.ts`

```typescript
import { IpcMain } from '@yuma140902/electron-typescript-ipc';
import { Api } from 'path/to/api.ts';

const createWindow = (): void => {
  const mainWindow = ...

  mainWindow.on('ready-to-show', () => {
    const ipcMain = new IpcMain<Api>();
    ipcMain.removeHandler('getDataFromStore'); // This is essential in case you are called multiple times.
    ipcMain.handle('getDataFromStore', async (_event, key) => {
      return await store.get(key);
    });
    setInterval(ipcMain.send(mainWindow, 'showAlert', 'Hi'), 10000)
  })
}
```

### `renderer/app.ts`

```typescript
window.myApi.invoke.getDataFromStore('someKey').then(console.log);
window.myApi.on.showAlert((_event, text) => {
  alert(text);
});
```
