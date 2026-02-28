const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
    ReadOrdersFile: () => ipcRenderer.invoke("ReadOrdersFile"),
    GetGameInfos: () => ipcRenderer.invoke("GetGameInfos"),
    GetFileHandle: () => ipcRenderer.invoke("GetFileHandle"),
    WriteOrdersFile: (content) => ipcRenderer.invoke("WriteOrdersFile", content),
    GetSetConfig: (optionsObj) => ipcRenderer.invoke("GetSetConfig", optionsObj),
    GetStocks: () => ipcRenderer.invoke("GetStocks"),
    GetJobsInfos: () => ipcRenderer.invoke("GetJobsInfos"),
    GetGameStatus: () => ipcRenderer.invoke("GetGameStatus"),
    ResetApp: () => ipcRenderer.invoke("ResetApp"),
    SetDFHackPath: () => ipcRenderer.invoke("SetDFHackPath"),
    OpenLink: (link) => ipcRenderer.invoke("OpenLink", link),
    UpdateAvailable: (handler) => ipcRenderer.on("UpdateAvailable", handler),
    ReadStocksArchive: () => ipcRenderer.invoke("ReadStocksArchive"),
    SaveStocksArchive: (stocksHistory) => ipcRenderer.invoke("SaveStocksArchive", stocksHistory)
});