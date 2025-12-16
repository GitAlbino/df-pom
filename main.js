const { app, BrowserWindow, ipcMain, dialog, globalShortcut, clipboard } = require("electron");
const path = require("path");
const fs = require("fs");
const { runInThisContext } = require("vm");
const CONFIG_NAME = "dfpom-config.json";
const ORDERS_NAME = "dfpom-orders.json";
const CONFIG_PATH = path.join(app.getPath("userData"), CONFIG_NAME);
const { execFile } = require('node:child_process');
const { ref } = require("node:process");
let config = {};
var mainWindow;
var saveWindowsPosTimeout = null;
var stocksReaderStartIndex = 0;
var stocksReaderMaxScans = 5000;
var readingStuff = false;
var jobsInfosStartIndex = 0;
var jobsInfosMaxScans = 1000;

function cl(msg) { console.log(msg); }


ipcMain.handle("GetFileHandle", async () => {
    return config.ordersFilePath;
});


function ReadConfig() {
    if (fs.existsSync(CONFIG_PATH)) {
        const configData = fs.readFileSync(CONFIG_PATH, "utf-8");
        config = JSON.parse(configData);
    } else {
        CreateConfigFile();
    }
}

function SaveConfig() {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config));
}

function CreateConfigFile() {
    config = {};
    config.ordersFilePath = "";
    config.dwarfPath = "";
    config.optionalCols = false;
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config));
}


ipcMain.handle("GetGameInfos", async (e) => {
    if (!PathsReady())
        return;

    if (readingStuff)
        return;
    readingStuff = true;

    return new Promise(async (resolve, reject) => {
        let path = config.dwarfPath + "\\dfhack-run.exe";

        //read template
        let luaScriptPath = app.getAppPath() + "\\gameInfo.lua";

        cl("Executing dfhack-run... " + luaScriptPath);
        let args = ["lua", "-f", luaScriptPath];

        fs.access(path, fs.constants.F_OK | fs.constants.X_OK, (err) => {
            if (err) {
                data = { error: { title: "Could not access dfhack-run.exe", msg: "Cannot access dfhack-run.exe. Please check the Dwarf Fortress path in settings." } };
                data.context = "GetGameInfos1";
                data.buttons = ["CONTINUE", "RESET APP PATHS"];
                resolve(data);
                return;
            }

            var oldClipboard = clipboard.readText();
            execFile(path, args, (error, stdout, stderr) => {
                if (error) {
                    data = { error: { title: "Execution error", msg: "An error occurred while executing dfhack-run.exe. Check if DFHack installed and if a Fortress mode game is running." } };
                    data.context = "GetGameInfos2";
                    data.buttons = ["CONTINUE", "RESET APP PATHS"];
                    cl(data);
                    resolve(data);
                    return;
                }

                try {
                    //read from clipboard file
                    let data = clipboard.readText();
                    clipboard.writeText(oldClipboard);
                    //replace ",}" with "}" to fix invalid JSON
                    data = data.replace(/(,)+}/g, "}");
                    data = data.replace(/(,)+]/g, "]");
                    data = JSON.parse(data);
                    resolve(data);

                } catch (e) {
                    data = { error: { title: "Data parsing error", msg: "An error occurred while parsing data pulled from Dwarf Fortress. <br>" + e } };
                    data.context = "GetGameInfos3";
                    cl(data);
                    resolve(data);
                }
            });
        });

    }).finally(() => {
        readingStuff = false;
    });
});




ipcMain.handle("GetJobsInfos", async () => {
    if (!PathsReady())
        return;

    if (readingStuff)
        return;
    readingStuff = true;

    return new Promise(async (resolve, reject) => {
        let path = config.dwarfPath + "\\dfhack-run.exe";

        //read template
        let luaScriptPath = app.getAppPath() + "\\jobInfos.lua";
        let luaScriptContent = fs.readFileSync(luaScriptPath, "utf-8");
        luaScriptContent = luaScriptContent.replace("69420;", jobsInfosStartIndex + ";");
        luaScriptContent = luaScriptContent.replace("69421;", jobsInfosMaxScans + ";");

        //write used model
        luaScriptPath = app.getAppPath() + "\\jobInfos_use.lua";
        fs.writeFileSync(luaScriptPath, luaScriptContent, "utf-8");

        cl("Executing dfhack-run... " + luaScriptPath);
        cl("> Getting job infos from index " + jobsInfosStartIndex);
        let args = ["lua", "-f", luaScriptPath];

        fs.access(path, fs.constants.F_OK | fs.constants.X_OK, (err) => {
            if (err) {
                data = { error: { title: "Could not access dfhack-run.exe", msg: "Cannot access dfhack-run.exe. Please check the Dwarf Fortress path in settings." } };
                data.context = "GetJobsInfos1";
                data.buttons = ["CONTINUE", "RESET APP PATHS"];
                cl(data)
                resolve(data);
            }

            var oldClipboard = clipboard.readText();
            execFile(path, args, (error) => {
                if (error) {
                    data = { error: { title: "Execution error", msg: "An error occurred while executing dfhack-run.exe. Check if DFHack installed and if a Fortress mode game is running." } };
                    data.context = "GetJobsInfos2";
                    data.buttons = ["CONTINUE", "RESET APP PATHS"];
                    cl(data);
                    resolve(data);
                    return;
                }

                try {
                    //read from clipboard file
                    let data = clipboard.readText();
                    clipboard.writeText(oldClipboard);

                    data = data.replace(/,}/g, "}");
                    data = data.replace(/,]/g, "]");
                    data = JSON.parse(data);
                    jobsInfosStartIndex = data.pauseAtIndex;
                    resolve(data);

                } catch (e) {

                    data = { error: { title: "Data parsing error", msg: "An error occurred while parsing data pulled from Dwarf Fortress.<br>" + e } };
                    data.context = "GetJobsInfos3";
                    cl(data);
                    resolve(data);
                    return;

                }
            });
        });

    }).finally(() => {
        readingStuff = false;
    });
});



ipcMain.handle("GetStocks", async () => {
    if (!PathsReady())
        return;

    if (readingStuff)
        return;
    readingStuff = true;

    return new Promise(async (resolve, reject) => {
        let path = config.dwarfPath + "\\dfhack-run.exe";

        //read template
        let luaScriptPath = app.getAppPath() + "\\exportStocks.lua";
        let luaScriptContent = fs.readFileSync(luaScriptPath, "utf-8");
        luaScriptContent = luaScriptContent.replace("69420;", stocksReaderStartIndex + ";");
        luaScriptContent = luaScriptContent.replace("69421;", stocksReaderMaxScans + ";");
        //write used model
        luaScriptPath = app.getAppPath() + "\\exportStocks_temp.lua";
        fs.writeFileSync(luaScriptPath, luaScriptContent, "utf-8");

        let args = ["lua", "-f", luaScriptPath];

        fs.access(path, fs.constants.F_OK | fs.constants.X_OK, (err) => {
            if (err) {
                data = { error: { title: "Could not access dfhack-run.exe", msg: "Cannot access dfhack-run.exe. Please check the Dwarf Fortress path in settings." } };
                data.context = "GetStocks1";
                data.buttons = ["CONTINUE", "RESET APP PATHS"];
                cl(data)
                resolve(data);
                return;
            }

            var oldClipboard = clipboard.readText();
            execFile(path, args, (error) => {
                if (error) {
                    data = { error: { title: "Execution error", msg: "An error occurred while executing dfhack-run.exe. Check if DFHack installed and if a Fortress mode game is running." } };
                    data.context = "GetStocks2";
                    data.buttons = ["CONTINUE", "RESET APP PATHS"];
                    cl(data);
                    resolve(data);
                    return;
                }

                try {
                    //read from clipboard file
                    let data = ProcessStockData(clipboard.readText())
                    resolve(data);
                    clipboard.writeText(oldClipboard);

                } catch (e) {
                    if (error) {
                        data = { error: { title: "Execution error", msg: "An error occurred while parsing data pulled from Dwarf Fortress.<br>" + e } };
                        data.context = "GetStocks3";
                        cl(data);
                        resolve(data);
                        return;
                    }
                    reject(e);
                }
            });
        });
    }).finally(() => {
        readingStuff = false;
    });
});



ipcMain.handle("ResetAppPaths", async () => {
    ReadConfig();
    config.dwarfPath = "";
    config.ordersFilePath = "";
    SaveConfig();

    while (!PathsReady()) {
        await RequirePaths();
    }
    mainWindow.close();
    mainWindow = null;
    CreateWindow();
});

ipcMain.handle("ReadFile", async () => {
    if (!PathsReady())
        return;

    if (readingStuff)
        return;
    readingStuff = true;

    return new Promise((resolve, reject) => {
        let path = config.dwarfPath + "\\dfhack-run.exe";
        let filename = config.ordersFilePath.substring(
            config.ordersFilePath.lastIndexOf("\\") + 1,
            config.ordersFilePath.length - 5
        );
        let args = ["orders", "export", filename];

        fs.access(path, fs.constants.F_OK | fs.constants.X_OK, (err) => {
            if (err) {
                data = { error: { title: "Could not access dfhack-run.exe", msg: "Cannot access dfhack-run.exe. Please check the Dwarf Fortress path in settings." } };
                data.context = "ReadFile1";
                data.buttons = ["CONTINUE", "RESET APP PATHS"];
                cl(data)
                resolve(data);
                readingStuff = false
                return;
            }

            execFile(path, args, (error) => {
                if (error) {
                    data = { error: { title: "Execution error", msg: "An error occurred while executing dfhack-run.exe. Check if DFHack installed and if a Fortress mode game is running." } };
                    data.context = "ReadFile2";
                    data.buttons = ["CONTINUE", "RESET APP PATHS"];
                    cl(data);
                    resolve(data);
                    return;
                }

                try {
                    const data = fs.readFileSync(config.ordersFilePath, "utf-8");
                    resolve(data);
                } catch (e) {
                    data = { error: { title: "Execution error", msg: "An error occurred while trying to read exported orders." + e } };
                    data.context = "ReadFile3";
                    cl(data);
                    reject(e);
                }
            });
        });
    }).finally(() => {
        readingStuff = false;
    });
});



ipcMain.handle("WriteFile", async (e, content) => {
    const fs = require("fs").promises;
    var exportPath = config.ordersFilePath.replace(".json", "_out.json");
    if (config.ordersFilePath) {
        await fs.writeFile(exportPath, content, "utf-8");
        SendToDF();
    }
});

function SendToDF() {
    if (!PathsReady())
        return;

    if (readingStuff)
        return;
    readingStuff = true;

    let path = config.dwarfPath + "\\dfhack-run.exe";
    let filename = config.ordersFilePath.substring(config.ordersFilePath.lastIndexOf("\\") + 1, config.ordersFilePath.length - 5); //remove .json
    let args1 = ["orders", "clear"];
    let args2 = ["orders", "import", filename + "_out"];

    fs.access(path, fs.constants.F_OK | fs.constants.X_OK, (err) => {
        if (err) {
            data = { error: { title: "Could not access dfhack-run.exe", msg: "Cannot access dfhack-run.exe. Please check the Dwarf Fortress path in settings." } };
            data.context = "SendToDF1";
            data.buttons = ["CONTINUE", "RESET APP PATHS"];
            cl(data)
            resolve(data);
            return;
        }

        //clear orders command
        execFile(path, args1, (error) => {
            if (error) {
                data = { error: { title: "Execution error", msg: "An error occurred while executing dfhack-run.exe. Check if DFHack installed and if a Fortress mode game is running." } };
                data.context = "SendToDF2";
                data.buttons = ["CONTINUE", "RESET APP PATHS"];
                cl(data);
                resolve(data);
                return;
            }

            //import orders command
            execFile(path, args2, (error) => {
                if (error) {
                    data = { error: { title: "Execution error", msg: "An error occurred while executing dfhack-run.exe. Check if DFHack installed and if a Fortress mode game is running." } };
                    data.context = "SendToDF3";
                    data.buttons = ["CONTINUE", "RESET APP PATHS"];
                    cl(data);
                    resolve(data);
                    return;
                }
            });
        })

    });
}

ipcMain.handle("ToggleOption", (e, name, noChange) => {
    cl("Toggle option " + name);
    ReadConfig();

    if (!config.hasOwnProperty(name)) {
        config[name] = false;
        SaveConfig();
    }

    if (!noChange) {
        config[name] = !config[name];
        SaveConfig();
        cl("prout")
    }
    return config[name];
});

ipcMain.handle("CycleSizeMode", (e, noChange) => {
    ReadConfig();

    if (config.sizeMode === undefined) {
        config.sizeMode = 2;
    } else {
        if (!noChange) {
            config.sizeMode++;
            if (config.sizeMode > 3)
                config.sizeMode = 0;
        }
    }
    SaveConfig();
    return config.sizeMode;
});


ipcMain.handle("BoardSelectedMaterials", (e, setMaterials) => {
    ReadConfig();

    if (config.selectedBoardMaterials == null) {
        config.selectedBoardMaterials = [
            "!0ALL",
            "!1WOODLOG",
            "!2ROCKMETAL",
            "!3BONES",
            "!4LEATHER",
            "!5PLANTS",
        ];
    }

    if (setMaterials != null)
        config.selectedBoardMaterials = setMaterials;

    SaveConfig();

    config.selectedBoardMaterials = [...new Set(config.selectedBoardMaterials)];
    return config.selectedBoardMaterials;
});

app.whenReady().then(async () => {

    //read config file if exists
    ReadConfig();

    while (!PathsReady()) {
        await RequirePaths();
    }

    CreateWindow();
})



function PathsReady() {
    var requiredFile = path.join(config.dwarfPath, "Dwarf Fortress.exe");
    if (!fs.existsSync(requiredFile)) {
        cl("Dwarf Fortress.exe not found in " + config.dwarfPath);
        return false;
    }

    requiredFile = path.join(config.dwarfPath, "dfhack-run.exe");
    if (!fs.existsSync(requiredFile)) {
        cl("dfhack-run.exe not found in " + config.dwarfPath);
        return false;
    }
    return true;
}

async function RequirePaths() {
    //prompt user to select Dwarf Fortress folder

    const { canceled, filePaths } = await dialog.showOpenDialog({
        title: "Select Dwarf Fortress exectutable folder (must contain dfhack-run.exe)",
        properties: ["openDirectory"]
    });

    if (canceled)
        app.quit();

    config.dwarfPath = canceled ? null : filePaths[0];
    config.ordersFilePath = path.join(config.dwarfPath, "dfhack-config", "orders", ORDERS_NAME);
    cl(config.ordersFilePath);
    SaveConfig();
}

const CreateWindow = () => {
    mainWindow = new BrowserWindow({
        width: config.windowPosition ? config.windowPosition.width : 1000,
        height: config.windowPosition ? config.windowPosition.height : 800,
        x: config.windowPosition ? config.windowPosition.x : undefined,
        y: config.windowPosition ? config.windowPosition.y : undefined,
        webPreferences: {
            preload: path.join(__dirname, "preload.js")
        }
    })
    if (config?.windowState === "maximized") {
        mainWindow.once("ready-to-show", () => {
            mainWindow.webContents.openDevTools();
            mainWindow.maximize()
        });
    }

    globalShortcut.register("CommandOrControl+R", () => { });
    globalShortcut.register("CommandOrControl+W", () => { });
    globalShortcut.register("F5", () => { });

    mainWindow.loadFile('index.html')

    mainWindow.on("move", () => {
        const b = mainWindow.getBounds();
        SaveWindowPos(b);
    });
    mainWindow.on("resize", () => {
        const b = mainWindow.getBounds();
        SaveWindowPos(b);
    });
    mainWindow.on("maximize", () => {
        const b = mainWindow.getBounds();
        SaveWindowPos(b);
    });
    mainWindow.on("unmaximize", () => {
        const b = mainWindow.getBounds();
        SaveWindowPos(b);
    });
}

function SaveWindowPos(bounds) {
    if (saveWindowsPosTimeout) {
        clearTimeout(saveWindowsPosTimeout);
    }

    saveWindowsPosTimeout = setTimeout(() => {
        config.windowPosition = bounds;
        config.windowState = mainWindow.isMaximized() ? "maximized" : mainWindow.isMinimized() ? "minimized" : "normal";
        SaveConfig();
    }, 500);
}


function DFDataParse(data) {
    //ignore first 4 lines
    var lines = data.split("\n");
    var items = [];
    createNewItem = true;
    lines.forEach(rawLine => {
        var line = rawLine.trim();

        if (line.trim().length == 0) {
            createNewItem = true;
        }

        if (line.indexOf("[") == -1)
            return;

        if (line.startsWith("[OBJECT:"))
            return;

        line = line.replace("[", "");
        line = line.split("]")[0];

        if (createNewItem) {
            items.push(line.split(":")[1]);
            createNewItem = false;
        }

    });
    return items;
}

function ProcessStockData(rawData) {
    let completed = false;
    let stocks = {};
    let parts = rawData.split("/");
    stocksReaderStartIndex = 0;
    parts.forEach(part => {
        if (part.trim().length == 0)
            return;
        if (part.startsWith("lastIndex=")) {
            let indexPart = part.replace("lastIndex=", "");
            let indexParts = indexPart.split("/");
            stocksReaderStartIndex = parseInt(indexParts[0]);
            return;
        }
        if (part == "completed") {
            completed = true;
            return;
        }
        let itemParts = part.split("*");
        let quantity = parseInt(itemParts[0]);
        let itemKey = itemParts[1];
        stocks[itemKey] = quantity;
    });

    var response = { completed: completed, nextIndex: stocksReaderStartIndex, batchSize: stocksReaderMaxScans, stocks: stocks };
    return response;
}
