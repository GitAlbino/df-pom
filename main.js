const { app, BrowserWindow, shell, autoUpdater, ipcMain, dialog, globalShortcut } = require("electron");
const log = require('electron-log');
const { version } = require('./package.json');
console.log('App version:', version);

log.info('App starting, version:', version);

const path = require("path");
const fs = require("fs");
const { runInThisContext } = require("vm");
const sqlite3 = require('sqlite3').verbose();
const CONFIG_NAME = "dfpom-config.json";
const ORDERS_NAME = "dfpom-orders.json";
const CONFIG_PATH = path.join(app.getPath("userData"), CONFIG_NAME);
const DB_PATH = path.join(app.getPath("userData"), "dfpom-data.db");
const { execFile } = require('node:child_process');
let config = {};
var mainWindow;
var saveWindowsPosTimeout = null;
var stocksReaderStartIndex = 0;
var stocksReaderMaxScans = 10000;
var readingStuff = false;
var jobsInfosStartIndex = 0;
var jobsInfosMaxScans = 1000;
let db = null;
let dbInsertCount = 0;

// ============ PERFORMANCE MONITORING ============
let processSpawnLog = [];
let processSpawnCount = 0;
let spawnCountInWindow = 0;
let lastLogDump = Date.now();
const LOG_DUMP_INTERVAL = 10000; // Dump log every 10 seconds

function LogProcessSpawn(scriptName, context) {
	const now = Date.now();
	processSpawnCount++;
	spawnCountInWindow++;
	const entry = {
		timestamp: new Date().toISOString(),
		script: scriptName,
		context: context,
		count: processSpawnCount
	};
	processSpawnLog.push(entry);

	// Keep only last 100 entries for the recent-rate warning check
	if (processSpawnLog.length > 100) {
		processSpawnLog.shift();
	}

	// Periodically dump stats to console
	if (now - lastLogDump > LOG_DUMP_INTERVAL) {
		const elapsed = (now - lastLogDump) / 1000;
		const spawnRate = (spawnCountInWindow / elapsed).toFixed(1);
		console.log(`[PERF] Process spawns in last ${elapsed.toFixed(0)}s: ${spawnCountInWindow} | Rate: ${spawnRate}/sec`);
		lastLogDump = now;
		spawnCountInWindow = 0;
	}

	// Warn if spawn rate is excessive (more than 10/sec)
	const recentCount = processSpawnLog.filter(e => now - new Date(e.timestamp) < 1000).length;
	if (recentCount > 10) {
		console.warn(`⚠️  HIGH PROCESS SPAWN RATE DETECTED! (${recentCount}/sec)`);
	}
}

// ============ DATABASE INITIALIZATION ============

function InitializeDatabase() {
	return new Promise((resolve, reject) => {
		db = new sqlite3.Database(DB_PATH, (err) => {
			if (err) {
				console.error("Database error:", err);
				reject(err);
				return;
			}
			console.log("Database connected at:", DB_PATH);
			
			db.serialize(() => {
				// Create tables
				db.run(`CREATE TABLE IF NOT EXISTS game_status (
					id INTEGER PRIMARY KEY AUTOINCREMENT,
					timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
					data_json TEXT NOT NULL
				)`);

				db.run(`CREATE TABLE IF NOT EXISTS game_infos (
					id INTEGER PRIMARY KEY AUTOINCREMENT,
					timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
					data_json TEXT NOT NULL
				)`);

				db.run(`CREATE TABLE IF NOT EXISTS job_infos (
					id INTEGER PRIMARY KEY AUTOINCREMENT,
					timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
					data_json TEXT NOT NULL
				)`);

				db.run(`CREATE TABLE IF NOT EXISTS stocks (
					id INTEGER PRIMARY KEY AUTOINCREMENT,
					timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
					data_json TEXT NOT NULL
				)`);

					db.run("SELECT 1", (err) => {
					if (err) {
						reject(err);
					} else {
						console.log("Database tables initialized successfully");
						resolve();
					}
				});
			});
		});
	});
}

// DB Write/Read helpers
function PeriodicDbCleanup() {
	db.run("DELETE FROM stocks WHERE id NOT IN (SELECT id FROM stocks ORDER BY id DESC LIMIT 1000)");
	db.run("DELETE FROM game_status WHERE id NOT IN (SELECT id FROM game_status ORDER BY id DESC LIMIT 2000)");
	db.run("DELETE FROM game_infos WHERE id NOT IN (SELECT id FROM game_infos ORDER BY id DESC LIMIT 2000)");
	db.run("DELETE FROM job_infos WHERE id NOT IN (SELECT id FROM job_infos ORDER BY id DESC LIMIT 2000)");
}

function InsertGameStatus(data) {
	return new Promise((resolve, reject) => {
		if (!db) reject(new Error("Database not initialized"));
		db.run("INSERT INTO game_status (data_json) VALUES (?)", [JSON.stringify(data)], function(err) {
			if (err) reject(err);
			else {
				if (++dbInsertCount % 100 === 0) PeriodicDbCleanup();
				resolve(this.lastID);
			}
		});
	});
}

function InsertGameInfos(data) {
	return new Promise((resolve, reject) => {
		if (!db) reject(new Error("Database not initialized"));
		db.run("INSERT INTO game_infos (data_json) VALUES (?)", [JSON.stringify(data)], function(err) {
			if (err) reject(err);
			else {
				if (++dbInsertCount % 100 === 0) PeriodicDbCleanup();
				resolve(this.lastID);
			}
		});
	});
}

function InsertJobInfos(data) {
	return new Promise((resolve, reject) => {
		if (!db) reject(new Error("Database not initialized"));
		db.run("INSERT INTO job_infos (data_json) VALUES (?)", [JSON.stringify(data)], function(err) {
			if (err) reject(err);
			else {
				if (++dbInsertCount % 100 === 0) PeriodicDbCleanup();
				resolve(this.lastID);
			}
		});
	});
}

function InsertStocks(data) {
	return new Promise((resolve, reject) => {
		if (!db) reject(new Error("Database not initialized"));
		db.run("INSERT INTO stocks (data_json) VALUES (?)", [JSON.stringify(data)], function(err) {
			if (err) reject(err);
			else {
				if (++dbInsertCount % 100 === 0) PeriodicDbCleanup();
				resolve(this.lastID);
			}
		});
	});
}

function GetLatestGameStatus() {
	return new Promise((resolve, reject) => {
		if (!db) reject(new Error("Database not initialized"));
		db.get("SELECT data_json FROM game_status ORDER BY timestamp DESC LIMIT 1", (err, row) => {
			if (err) reject(err);
			else resolve(row ? JSON.parse(row.data_json) : null);
		});
	});
}

function GetLatestGameInfos() {
	return new Promise((resolve, reject) => {
		if (!db) reject(new Error("Database not initialized"));
		db.get("SELECT data_json FROM game_infos ORDER BY timestamp DESC LIMIT 1", (err, row) => {
			if (err) reject(err);
			else resolve(row ? JSON.parse(row.data_json) : null);
		});
	});
}

function GetLatestJobInfos() {
	return new Promise((resolve, reject) => {
		if (!db) reject(new Error("Database not initialized"));
		db.get("SELECT data_json FROM job_infos ORDER BY timestamp DESC LIMIT 1", (err, row) => {
			if (err) reject(err);
			else resolve(row ? JSON.parse(row.data_json) : null);
		});
	});
}

function GetLatestStocks() {
	return new Promise((resolve, reject) => {
		if (!db) reject(new Error("Database not initialized"));
		db.get("SELECT data_json FROM stocks ORDER BY timestamp DESC LIMIT 1", (err, row) => {
			if (err) reject(err);
			else resolve(row ? JSON.parse(row.data_json) : null);
		});
	});
}

var missingDFHackError = {
    error: {
        title: "DFHack required",
        msg: "This app requires access to DFHack / 'dfhack-run'.",
        context: "GetGameStatus1",
        buttons: ["SET DFHACK PATH"]
    }
};


function cl(msg) { console.log(msg); }


function DFHackRunName() {
    return process.platform === 'win32' ? 'dfhack-run.exe' : 'dfhack-run';
}


if (handleSquirrelEvent()) {
    app.quit();
}

function handleSquirrelEvent() {
    if (process.platform !== "win32")
        return false;

    const squirrelEvent = process.argv[1];
    if (!squirrelEvent)
        return false;

    const appFolder = path.resolve(process.execPath, "..");
    const rootFolder = path.resolve(appFolder, "..");
    const updateExe = path.join(rootFolder, "Update.exe");
    const exeName = path.basename(process.execPath);

    const spawnUpdate = (args) => {
        try {
            return require("child_process").spawn(updateExe, args, { detached: true });
        } catch (e) {
            cl("Squirrel spawn error: " + e);
            return null;
        }
    };

    switch (squirrelEvent) {
        case "--squirrel-install":
        case "--squirrel-updated":
            // Create Desktop and Start Menu shortcuts
            spawnUpdate(["--createShortcut", exeName, "--shortcut-locations", "Desktop,StartMenu"]);
            app.quit();
            return true;

        case "--squirrel-uninstall":
            // Remove shortcuts
            spawnUpdate(["--removeShortcut", exeName]);
            app.quit();
            return true;

        case "--squirrel-obsolete":
            // Called when a newer version has been installed - just quit
            app.quit();
            return true;

        case "--squirrel-firstrun":
            // Called on first run after install - can be used for first-run setup
            return false;
    }

    return false;
}


function GetMissingDFHackError(context) {
    missingDFHackError.error.context = context;
    return missingDFHackError;
}

app.whenReady().then(async () => {

	//read config file if exists
	await ReadConfig();
	
	// Initialize database
	try {
		await InitializeDatabase();
	} catch (err) {
		console.error("Failed to initialize database:", err);
		// Continue anyway - app can still function with stdout data extraction
	}
	
	await CreateWindow();

    mainWindow.webContents.once('did-finish-load', () => {
        mainWindow.setTitle("DF-Pom | v" + version);

        if (config.autoUpdate) {
            log.info('Auto-update enabled, configuring...');

            const server = 'https://update.electronjs.org';
            const feedURL = `${server}/GitAlbino/df-pom/${process.platform}-${process.arch}/${version}`;
            autoUpdater.setFeedURL(feedURL);
            log.info('Feed URL set to:', feedURL);

            autoUpdater.on('error', (err) => {
                log.error('AutoUpdater error:', err);
            });

            autoUpdater.on('update-available', () => {
                log.info('Update available, downloading...');
                mainWindow.webContents.send('UpdateAvailable');
            });

            autoUpdater.on('update-not-available', () => {
                log.info('No update available');
            });

            autoUpdater.on('update-downloaded', () => {
                log.info('Update downloaded, will install on quit');
                autoUpdater.quitAndInstall();
            });

            log.info('Checking for updates...');
            autoUpdater.checkForUpdates();
        }
    });


})


ipcMain.handle("GetFileHandle", async () => {
    return config.ordersFilePath;
});

async function ReadConfig() {
    if (fs.existsSync(CONFIG_PATH)) {
        cl("Reading existing config...");
        const configData = fs.readFileSync(CONFIG_PATH, "utf-8");
        try {
            config = JSON.parse(configData);
            config.version = version;
        } catch (e) {
            CreateConfigFile();
        }
    } else {
        cl("Creating new config...");
        CreateConfigFile();
    }

    if (!config.ignoredItems) {
        config.ignoredItems = ["ENT%d", "HF%d"];
        SaveConfig()
    }
}

async function SaveConfig() {
    cl("Saving config...");
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config));
}

function CreateConfigFile() {
    cl("/!\\ Creating default config file /!\\");
    config = {};
    config.ordersFilePath = "";
    config.dwarfPath = "";
    config.autoUpdate = true;
    config.graphsDefaultAutoHeight = true;
    config.favoriteStockItems = [
        "BED",
        "TABLE",
        "CHAIR",
        "DOOR",
        "BOX",
        "CABINET",
        "BARREL",
        "DRINK",
        "BLOCKS",
        "TOOLS!ITEM_TOOL_WHEELBARROW",
        "FOOD!ITEM_FOOD_BISCUITS",
        "FOOD!ITEM_FOOD_STEW",
        "FOOD!ITEM_FOOD_ROAST",
        "DRINK",
        "DRINK!FRUIT",
        "DRINK!PLANT"
    ];
    config.selectedStocksMaterialsCols = [
        "ALL",
        "STONE",
        "WOOD",
        "INORGANIC:COPPER",
        "INORGANIC:IRON"
    ];
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config));
}

ipcMain.handle("ResetApp", async (e) => {
    jobsInfosStartIndex = 0;
    readingStuff = false;
    stocksReaderStartIndex = 0;
});

ipcMain.handle("OpenLink", (e, link) => {
    shell.openExternal(link)
});

ipcMain.handle("SetDFHackPath", async () => {
    return new Promise(async (resolve, reject) => {
        resolve(await SetPath());
    });
});

async function SetPath() {
    const { canceled, filePaths } = await dialog.showOpenDialog({
        title: "Select Dwarf Fortress folder (must contain " + DFHackRunName() + ")",
        properties: ["openDirectory"]
    });

    if (canceled || filePaths.length == 0)
        return false;

    cl("Selected DFHack path: " + filePaths[0]);
    var pathError = GetPathsReadyError();
    if (pathError) {
        cl(pathError);
        resolve(pathError);
        return;
    }

    config.dwarfPath = canceled ? null : filePaths[0];
    config.ordersFilePath = path.join(config.dwarfPath, "dfhack-config", "orders", ORDERS_NAME);
    await SaveConfig();
    return true;
}

function parseJsonData(rawData) {
    // Parse JSON data from stdout
    if (!rawData || rawData.trim() === "") {
        throw new Error("No data received from DFHack. Is Dwarf Fortress running?");
    }
    
    // Check for stock data format first (more specific)
    if (/^lastIndex=\d+\/year=\d+\/yearTick=\d+\//.test(rawData)) {
        return ProcessStockData(rawData);
    }
    
    // Try JSON parsing
    try {
        rawData = rawData.replace(/(,)+}/g, "}");
        rawData = rawData.replace(/(,)+]/g, "]");
        return JSON.parse(rawData);
    } catch (e) {
        throw new Error("Data is not valid JSON: " + e.message);
    }
}

ipcMain.handle("GetGameStatus", async (e) => {
    return new Promise(async (resolve, reject) => {
        var pathError = GetPathsReadyError();
        if (pathError) {
            resolve(pathError);
            return;
        }

        let dfhackPath = path.join(config.dwarfPath, DFHackRunName());

        let luaScriptPath = path.join(GetDataPath(), "lua", "gameStatus.lua");
        let args = ["lua", "-f", luaScriptPath];
        
        LogProcessSpawn("gameStatus.lua", "GetGameStatus");

        fs.access(dfhackPath, fs.constants.F_OK | fs.constants.X_OK, (err) => {
            if (err) {
                resolve(GetMissingDFHackError("GetGameStatus1"));
                return;
            }

            execFile(dfhackPath, args, async (error, stdout, stderr) => {
                // Extract data from stdout (marked with DFPOM_STATUS_JSON:)
                let data = null;
                if (stdout && stdout.includes("DFPOM_STATUS_JSON:")) {
                    let lines = stdout.split("\n");
                    for (let line of lines) {
                        if (line.includes("DFPOM_STATUS_JSON:")) {
                            data = line.substring(line.indexOf("DFPOM_STATUS_JSON:") + "DFPOM_STATUS_JSON:".length).trim();
                            break;
                        }
                    }
                }

                if (error) {
                    data = {
                        error: {
                            title: "Waiting for Dwarf Fortress...",
                            msg: "Please start the game and load a Fortress.",
                            context: "GetGameStatus2",
                            buttons: ["WAIT"],
                            errorObj: error
                        }
                    };
                    cl(data);
                    resolve(data);
                    return;
                }

                try {
                    data = parseJsonData(data);
                    
                    // Write to database if successful
                    if (data && !data.error) {
                        InsertGameStatus(data).catch(err => console.error("DB write error (game_status):", err));
                    }
                    
                    resolve(data);

                } catch (e) {
                    // If no data available, return waiting status instead of error
                    if (!data) {
                        data = {
                            isFortress: false,
                            site: "nil",
                            paused: false,
                            workOrderConditionOpen: false
                        };
                        resolve(data);
                        return;
                    }
                    
                    data = {
                        error: {
                            title: "Data parsing error",
                            msg: "An error occurred while parsing data pulled from Dwarf Fortress. <br>" + e + "<br><br>" + data,
                            context: "GetGameStatus3",
                            buttons: ["CONTINUE"]
                        }
                    };
                    readingStuff = false;
                    cl(data);
                    resolve(data);
                }
            });

        });

    }).finally(() => {
        readingStuff = false;
    });

});


ipcMain.handle("GetGameInfos", async (e) => {
    if (readingStuff)
        return "wait"
    readingStuff = true;

    return new Promise(async (resolve, reject) => {
        var pathError = GetPathsReadyError();
        if (pathError) {
            resolve(pathError);
            return;
        }
        let dfhackPath = path.join(config.dwarfPath, DFHackRunName());

        let luaScriptPath = path.join(GetDataPath(), "lua", "gameInfo.lua");
        cl("Executing dfhack-run... " + luaScriptPath);
        let args = ["lua", "-f", luaScriptPath, (config.ignoredItems || []).join(",")];

        fs.access(dfhackPath, fs.constants.F_OK | fs.constants.X_OK, (err) => {
            if (err) {
                resolve(GetMissingDFHackError("GetGameInfos1"));
                return;
            }

            execFile(dfhackPath, args, (error, stdout, _stderr) => {
                if (error) {
                    data = {
                        error: {
                            title: "Waiting for Dwarf Fortress...",
                            msg: "Please start the game and load a Fortress.",
                            context: "GetGameInfos2",
                            buttons: ["WAIT"]
                        }
                    };
                    cl(data);
                    resolve(data);
                    return;
                }

                try {
                    // Extract data from stdout (marked with DFPOM_GAMEINFO_JSON:)
                    let data = null;
                    if (stdout && stdout.includes("DFPOM_GAMEINFO_JSON:")) {
                        let lines = stdout.split("\n");
                        for (let line of lines) {
                            if (line.includes("DFPOM_GAMEINFO_JSON:")) {
                                data = line.substring(line.indexOf("DFPOM_GAMEINFO_JSON:") + "DFPOM_GAMEINFO_JSON:".length).trim();
                                break;
                            }
                        }
                    }
                    
                    // Parse JSON data (remove ",}" and "," ]" artifacts)
                    data = parseJsonData(data);
                    
                    // Write to database if successful
                    if (data && !data.error) {
                        InsertGameInfos(data).catch(err => console.error("DB write error (game_infos):", err));
                    }
                    
                    resolve(data);

                } catch (e) {
                    // If no data available, return "wait" instead of error to avoid triggering reset
                    if (!data) {
                        resolve("wait");
                        return;
                    }
                    
                    data = {
                        error: {
                            title: "Data parsing error",
                            msg: "An error occurred while parsing data pulled from Dwarf Fortress. <br>" + e,
                            context: "GetGameInfos3",
                            buttons: ["CONTINUE"]
                        }
                    };
                    readingStuff = false;
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
    if (readingStuff)
        return "wait"

    readingStuff = true;

    return new Promise(async (resolve, reject) => {
        var pathError = GetPathsReadyError();
        if (pathError) {
            resolve(pathError);
            return;
        }
        let dfhackPath = path.join(config.dwarfPath, DFHackRunName());

        let luaScriptPath = path.join(GetDataPath(), "lua", "jobInfos.lua");
        cl("Executing dfhack-run... " + luaScriptPath);
        cl("> Getting job infos from index " + jobsInfosStartIndex);
        let args = ["lua", "-f", luaScriptPath, String(jobsInfosStartIndex), String(jobsInfosMaxScans)];

        fs.access(dfhackPath, fs.constants.F_OK | fs.constants.X_OK, (err) => {
            if (err) {
                resolve(GetMissingDFHackError("GetJobsInfos1"));
                return;
            }

            execFile(dfhackPath, args, (error, stdout, _stderr) => {
                if (error) {
                    data = {
                        error: {
                            title: "Waiting for Dwarf Fortress...",
                            msg: "Please open the 'Job Orders > Create Task' menu once to allow data extraction.",
                            context: "GetJobsInfos2a",
                            icon: "orders icon.png"
                        }
                    };
                    cl(data);
                    resolve(data);
                    return;
                }

                try {
                    // Extract data from stdout (marked with DFPOM_JOBINFOS_JSON:)
                    let data = null;
                    if (stdout && stdout.includes("DFPOM_JOBINFOS_JSON:")) {
                        let lines = stdout.split("\n");
                        for (let line of lines) {
                            if (line.includes("DFPOM_JOBINFOS_JSON:")) {
                                data = line.substring(line.indexOf("DFPOM_JOBINFOS_JSON:") + "DFPOM_JOBINFOS_JSON:".length).trim();
                                break;
                            }
                        }
                    }
                    
                    data = data.replace(/,}/g, "}");
                    data = data.replace(/,]/g, "]");

                    data = JSON.parse(data);

                    // Write to database on every successful DFHack response
                    InsertJobInfos(data).catch(err => console.error("DB write error (job_infos):", err));

                    if (data.jobs.length == 0 && data.completed == false) {
                        data = {
                            error: {
                                title: "Waiting for Job Orders",
                                msg: "Please open the 'Job Orders > Create Task' menu once to allow data extraction.",
                                icon: "orders icon.png",
                                context: "GetJobsInfos2b"
                            }
                        };
                        cl(data);
                        resolve(data);
                        return;
                    }
                    jobsInfosStartIndex = data.pauseAtIndex;
                    
                    resolve(data);

                } catch (e) {
                    data = "wait"
                    cl(data);
                    resolve(data);
                    readingStuff = false;
                    return;

                }
            });
        });

    }).finally(() => {
        readingStuff = false;
    });
});



ipcMain.handle("GetStocks", async () => {
    if (readingStuff)
        return "wait"
    readingStuff = true;

    return new Promise(async (resolve, reject) => {
        var pathError = GetPathsReadyError();
        if (pathError) {
            resolve(pathError);
            return;
        }
        let dfhackPath = path.join(config.dwarfPath, DFHackRunName());

        let luaScriptPath = path.join(GetDataPath(), "lua", "exportStocks.lua");
        let args = ["lua", "-f", luaScriptPath, String(stocksReaderStartIndex), String(stocksReaderMaxScans)];

        LogProcessSpawn("exportStocks.lua", "GetStocks");

        fs.access(dfhackPath, fs.constants.F_OK | fs.constants.X_OK, (err) => {
            if (err) {
                resolve(GetMissingDFHackError("GetStocks1"));
                return;
            }

            execFile(dfhackPath, args, (error, stdout, _stderr) => {
                if (error) {
                    data = {
                        error: {
                            title: "Waiting for Dwarf Fortress...",
                            msg: "Please start the game and load a Fortress.",
                            context: "GetStocks2",
                            buttons: ["WAIT"]
                        }
                    };
                    cl(data);
                    resolve(data);
                    return;
                }

                try {
                    // Extract data from stdout (marked with DFPOM_STOCKS:)
                    let rawData = null;
                    if (stdout && stdout.includes("DFPOM_STOCKS:")) {
                        let lines = stdout.split("\n");
                        for (let line of lines) {
                            if (line.includes("DFPOM_STOCKS:")) {
                                rawData = line.substring(line.indexOf("DFPOM_STOCKS:") + "DFPOM_STOCKS:".length).trim();
                                break;
                            }
                        }
                    }
                    
                    let data = ProcessStockData(rawData)

                    // Write to database on every successful DFHack response
                    InsertStocks(data).catch(err => console.error("DB write error (stocks):", err));

                    if (Object.keys(data.stocks).length == 0) {
                        data = {
                            error: {
                                title: "Waiting for Dwarf Fortress...",
                                msg: "Please start the game and load a Fortress.",
                                context: "GetStocks3a",
                                buttons: ["WAIT"]
                            }
                        };
                        cl(data);
                        readingStuff = false;
                        resolve(data);
                        return;
                    }
                    
                    resolve(data);

                } catch (e) {
                    // If no data available, return "wait" instead of error/reject
                    if (e.message.includes("No data received")) {
                        readingStuff = false;
                        resolve("wait");
                        return;
                    }
                    
                    if (error) {
                        data = {
                            error: {
                                title: "Waiting for Dwarf Fortress...",
                                msg: "Please start the game and load a Fortress.",
                                context: "GetStocks3b",
                                buttons: ["WAIT"]
                            }
                        };
                        cl(data);
                        readingStuff = false;
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


ipcMain.handle("ReadOrdersFile", async () => {
    if (readingStuff)
        return "wait"

    readingStuff = true;

    cl("Reading orders file...");
    
    LogProcessSpawn("orders-export", "ReadOrdersFile");

    return new Promise((resolve, reject) => {
        var pathError = GetPathsReadyError();
        if (pathError) {
            resolve(pathError);
            return;
        }
        let dfhackPath = path.join(config.dwarfPath, DFHackRunName());
        let filename = path.basename(config.ordersFilePath, '.json');
        let args = ["orders", "export", filename];

        fs.access(dfhackPath, fs.constants.F_OK | fs.constants.X_OK, (err) => {
            if (err) {
                resolve(GetMissingDFHackError("ReadFile1"));
                readingStuff = false
                return;
            }

            execFile(dfhackPath, args, (error) => {
                if (error) {
                    data = {
                        error: {
                            title: "Waiting for Dwarf Fortress...",
                            msg: "Please start the game and load a Fortress.",
                            context: "ReadFile2",
                            buttons: ["WAIT"]
                        }
                    };
                    cl(data);
                    resolve(data);
                    return;
                }

                try {
                    const data = fs.readFileSync(config.ordersFilePath, "utf-8");
                    resolve(data);
                } catch (e) {
                    data = {
                        error: {
                            title: "Execution error",
                            msg: "An error occurred while trying to read exported orders." + e,
                            context: "ReadFile3",
                        }
                    };
                    readingStuff = false;
                    cl(data);
                    reject(e);
                }
            });
        });
    }).finally(() => {
        readingStuff = false;
    });
});



ipcMain.handle("WriteOrdersFile", async (e, content) => {
    const fs = require("fs").promises;
    cl("Writing orders file...");
    var exportPath = config.ordersFilePath.replace(".json", "_out.json");
    if (config.ordersFilePath) {
        await fs.writeFile(exportPath, content, "utf-8");
        await SendToDF();
    }
});

async function SendToDF() {
    if (readingStuff)
        return "wait"

    readingStuff = true;
    
    LogProcessSpawn("orders-import", "SendToDF");

    var pathError = GetPathsReadyError();
    if (pathError) {
        readingStuff = false;
        return pathError;
    }

    let dfhackPath = path.join(config.dwarfPath, DFHackRunName());
    let filename = path.basename(config.ordersFilePath, '.json');
    let args1 = ["orders", "clear"];
    let args2 = ["orders", "import", filename + "_out"];

    try {
        fs.access(dfhackPath, fs.constants.F_OK | fs.constants.X_OK, (err) => {
            if (err) {
                resolve(GetMissingDFHackError("SendToDF1"));
                return;
            }

            //clear orders command
            execFile(dfhackPath, args1, (error) => {
                if (error) {
                    data = {
                        error: {
                            title: "Execution error",
                            msg: "An error occurred while executing " + DFHackRunName() + ". Check if DFHack installed and if a Fortress mode game is running.",
                            context: "SendToDF2",
                            buttons: ["CONTINUE"]
                        }
                    };
                    cl(data);
                    resolve(data);
                    readingStuff = false;
                    return;
                }

                //import orders command
                execFile(dfhackPath, args2, (error) => {
                    if (error) {
                        data = {
                            error: {
                                title: "Execution error",
                                msg: "An error occurred while executing " + DFHackRunName() + ". Check if DFHack installed and if a Fortress mode game is running.\n" + error,
                                context: "SendToDF3",
                                buttons: ["CONTINUE"]
                            }
                        };
                        cl(data);
                        resolve(data);
                        readingStuff = false;
                        return;
                    }
                    readingStuff = false;
                });

            })

        });
    } catch (e) {
        cl(e);
        readingStuff = false;
    }
}

ipcMain.handle("GetSetConfig", async (e, newConfig) => {
    await ReadConfig();

    if (newConfig != null) {
        config = newConfig;
        await SaveConfig();
    }

    return config;
});


function GetPathsReadyError() {
    if (!config.dwarfPath || config.dwarfPath.length == 0)
        return false;

    var data = null;

    var requiredFile = path.join(config.dwarfPath, DwarfFortressExeName());
    if (!fs.existsSync(requiredFile)) {
        cl(DwarfFortressExeName() + " not found in " + config.dwarfPath);
        return GetMissingDFHackError("Paths1 (missing '" + DwarfFortressExeName() + "')");
    }

    requiredFile = path.join(config.dwarfPath, DFHackRunName());
    if (!fs.existsSync(requiredFile)) {
        cl(DFHackRunName() + " not found in " + config.dwarfPath);
        return GetMissingDFHackError("Paths2 (missing '" + DFHackRunName() + "')");
    }

    return null;
}


async function CreateWindow() {
    mainWindow = new BrowserWindow({
        width: config.windowPosition ? config.windowPosition.width : 1000,
        height: config.windowPosition ? config.windowPosition.height : 800,
        x: config.windowPosition ? config.windowPosition.x : undefined,
        y: config.windowPosition ? config.windowPosition.y : undefined,
        nodeIntegration: false,
        autoHideMenuBar: true,
        webPreferences: {
            preload: path.join(__dirname, "preload.js")
        }
    })

    if (config?.windowState === "maximized") {
        mainWindow.once("ready-to-show", () => {
            mainWindow.maximize()
        });
    }

    globalShortcut.register("CommandOrControl+R", () => { });
    globalShortcut.register("CommandOrControl+Shift+R", () => { });
    globalShortcut.register("CommandOrControl+W", () => { });
    globalShortcut.register("F5", () => { });

    mainWindow.loadFile('index.html')


    mainWindow.on('new-window', function (e, url) {
        e.preventDefault();
        cl(url);
        shell.openExternal(url);
    });

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
    let year = 0;
    let yearTick = 0;
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
        if (part.startsWith("yearTick=")) {
            let indexPart = part.replace("yearTick=", "");
            yearTick = parseInt(indexPart);
            return;
        }
        if (part.startsWith("year=")) {
            let indexPart = part.replace("year=", "");
            year = parseInt(indexPart);
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

    var response = { completed: completed, yearTick: yearTick, year: year, nextIndex: stocksReaderStartIndex, batchSize: stocksReaderMaxScans, stocks: stocks };
    return response;
}


function GetDataPath() {
    if (app.isPackaged)
        return path.join(path.dirname(process.execPath), "resources");
    return __dirname;
}

function DwarfFortressExeName() {
    return process.platform === 'win32' ? 'Dwarf Fortress.exe' : 'dwarfort';
}
