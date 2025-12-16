const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
    ReadFile: () => ipcRenderer.invoke("ReadFile"),
    GetGameInfos: () => ipcRenderer.invoke("GetGameInfos"),
    GetFileHandle: () => ipcRenderer.invoke("GetFileHandle"),
    WriteFile: (content) => ipcRenderer.invoke("WriteFile", content),
    ToggleOption: (name, noChange) => ipcRenderer.invoke("ToggleOption", name, noChange),
    CycleSizeMode: (noChange) => ipcRenderer.invoke("CycleSizeMode", noChange),
    GetStocks: () => ipcRenderer.invoke("GetStocks"),
    GetJobsInfos: () => ipcRenderer.invoke("GetJobsInfos"),
    BoardSelectedMaterials: (newMaterials) => ipcRenderer.invoke("BoardSelectedMaterials", newMaterials),
    ResetAppPaths: () => ipcRenderer.invoke("ResetAppPaths")
});