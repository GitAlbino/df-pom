const { app, BrowserWindow, shell, autoUpdater, ipcMain, dialog, globalShortcut } = require("electron");
const log = require('electron-log');
const { version } = require('./package.json');
const path = require("path");
const fs = require("fs");
const { runInThisContext } = require("vm");
const CONFIG_NAME = "dfpom-config.json";
const STOCKS_NAME = "dfpom-stocks.json";
const ORDERS_NAME = "dfpom-orders.json";
const CONFIG_PATH = path.join(app.getPath("userData"), CONFIG_NAME);
const STOCKS_PATH = path.join(app.getPath("userData"), STOCKS_NAME);
const { execFile, exec } = require('node:child_process');
const { ref } = require("node:process");
const { resolve } = require("node:dns");

let nodePty = null;
let config = {};
let oldStocks = {};
var mainWindow;
var saveWindowsPosTimeout = null;
var stocksReaderStartIndex = 0;
var stocksReaderMaxScans = 5000;
var readingStuff = false;
var jobsInfosStartIndex = 0;
var jobsInfosMaxScans = 1000;
var gameInfoLuaUpdated = false;
let pathsReady = false;
const tmpLinuxFolderName = "df-pom-3nD0fc1V1l1z4710n";

function pause(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

var missingDFHackError = {
	error: {
		title: "Set DFHack path",
		msg: "Please point to your DFHack folder (ex: 'C:\\Program Files (x86)\\Steam\\steamapps\\common\\DFHack\\')",
		context: "GetGameStatus1",
		buttons: ["SET DFHACK PATH"]
	}
};
var missingDwarfFortressError = {
	error: {
		title: "Set Dwarf Fortress path",
		msg: "Please point to your Dwarf Fortress fortress folder (ex: 'C:\\Program Files (x86)\\Steam\\steamapps\\common\\Dwarf Fortress\\')",
		context: "GetGameStatus1",
		buttons: ["SET DWARF FORTRESS PATH"]
	}
};


function cl(msg) { console.log(msg); }

cl("DF-Pom version: " + version);

process.on('SIGTERM', () => { CleanupOnExit(0); });
process.on('SIGINT', () => { CleanupOnExit(0); });
app.on('before-quit', (e) => { CleanupOnExit(0); });

function DFHackRunName() {
	return process.platform === 'win32' ? 'hack/dfhack-run.exe' : 'hack/dfhack-run';
}

function GetChildEnv() {
	try {
		if (process.platform !== 'linux')
			return process.env;

		const procs = fs.readdirSync('/proc').filter(n => /^\d+$/.test(n));
		for (let pid of procs) {
			try {
				const cmd = fs.readFileSync(path.join('/proc', pid, 'cmdline'), 'utf8');
				if (cmd && cmd.includes('dwarfort')) {
					const envRaw = fs.readFileSync(path.join('/proc', pid, 'environ'), 'utf8');
					const parts = envRaw.split('\0').filter(Boolean);
					const env = Object.assign({}, process.env);
					for (let p of parts) {
						const i = p.indexOf('=');
						if (i > 0)
							env[p.slice(0, i)] = p.slice(i + 1);
					}
					// Remove LD_PRELOAD coming from Steam (often points to 32-bit gameoverlayrenderer)
					// which can crash 64-bit child processes. Keep other vars.
					if (env.LD_PRELOAD)
						delete env.LD_PRELOAD;
					return env;
				}
			} catch (e) {
				// ignore
			}
		}
	} catch (e) {
		// ignore
	}
	return process.env;
}

function shellEscape(s) {
	return "'" + String(s).replace(/'/g, "'\\''") + "'";
}

function ExecDFHack(args, callback) {
	// On Linux, try node-pty for PTY support

	const dfhackPath = path.join(config.dfhackPath, DFHackRunName());
	const workingDir = path.dirname(dfhackPath);
	const options = { cwd: workingDir, env: GetChildEnv() };

	if (!fs.existsSync(dfhackPath)) {
		const err = new Error("DFHack executable not found at: " + dfhackPath);
		err.code = "ENOENT";
		callback(err, "", "");
		cl("DFHack executable not found at: " + dfhackPath);
		return;
	}

	if (!fs.existsSync(workingDir)) {
		const err = new Error("DFHack working directory not found at: " + workingDir);
		err.code = "ENOENT";
		callback(err, "", "");
		cl("DFHack working directory not found at: " + workingDir);
		return;
	}
	if (process.platform === 'linux') {
		if (!nodePty) {
			try {
				nodePty = require('node-pty');
			} catch (e) {
				cl("node-pty not installed, falling back to execFile. Install with 'npm install node-pty' for better PTY support on Linux.");
				// node-pty not installed, fallback to execFile
			}
		}
		if (nodePty) {
			let output = '';
			const ptyProcess = nodePty.spawn(dfhackPath, args, {
				name: 'xterm-color',
				cols: 80,
				rows: 30,
				cwd: options.cwd,
				env: options.env
			});
			ptyProcess.on('data', function (data) {
				output += data;
			});
			ptyProcess.on('exit', function (code, signal) {
				let error = null;
				if (code !== 0) {
					error = new Error('PTY process exited with code ' + code + (signal ? (' signal ' + signal) : ''));
					error.code = code;
					error.signal = signal;
				}
				callback(error, output, '');
			});
			return;
		}
	}
	// Fallback: direct execFile
	try {
		execFile(dfhackPath, args, options, (error, stdout, stderr) => {
			callback(error, stdout, stderr);
		});
	} catch (e) {
		// Fallback to shell execution on unexpected failures
		cl("ExecFile failed, falling back to shell execution: " + e);
		const cmd = [dfhackPath].concat(args || []).map(shellEscape).join(' ');
		exec(cmd, Object.assign({}, options, { shell: true }), (err2, stdout2, stderr2) => {
			callback(err2, stdout2, stderr2);
		});
	}
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


function PrepareMissingDFHackError(context) {
	missingDFHackError.error.context = context;
	return missingDFHackError;
}

function PrepareMissingDwarfFortressError(context) {
	missingDwarfFortressError.error.context = context;
	return missingDwarfFortressError;
}

app.whenReady().then(async () => {

	//read config file if exists
	await PrepareFiles();
	await ReadConfig();
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


async function PrepareFiles() {
	// On Linux, ensure the Lua scripts are in a tmp folder to avoid permission issues with /tmp/.X11-unix
	if (process.platform === 'linux') {
		const tmpDir = path.join(app.getPath('temp'), tmpLinuxFolderName);
		if (!fs.existsSync(tmpDir)) {
			fs.mkdirSync(tmpDir);
			const luaDataPath = GetLuaDataPathOriginal();
			fs.readdirSync(luaDataPath).forEach(file => {
				fs.copyFileSync(path.join(luaDataPath, file), path.join(tmpDir, file));
			});
		}
	}
}


ipcMain.handle("GetFileHandle", async () => {
	return config.ordersFilePath;
});


ipcMain.handle("CheckPaths", async () => {
	if (IsDFHackPathReadyError("api CheckPaths"))
		return PrepareMissingDFHackError("CheckPaths1");

	if (IsDwarfPathReadyError("api CheckPaths"))
		return PrepareMissingDwarfFortressError("CheckPaths2");

	ReadConfig();
	pathsReady = true;
	return true;
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
	config.dfhackPath = "";
	config.autoUpdate = true;
	config.graphsSaveData = true;
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
	CreateConfigFile();
	/*
	jobsInfosStartIndex = 0;
	gameInfoLuaUpdated = false;
	readingStuff = false;
	stocksReaderStartIndex = 0;
	*/
	app.quit();
});

ipcMain.handle("OpenLink", (e, link) => {
	shell.openExternal(link)
});

ipcMain.handle("SetDFHackPath", async () => {
	return new Promise(async (resolve, reject) => {
		resolve(await SetDFHackPath());
	});
});

ipcMain.handle("SetDwarfFortressPath", async () => {
	return new Promise(async (resolve, reject) => {
		resolve(await SetDwarfFortressPath());
	});
});

async function SetDFHackPath() {
	const { canceled, filePaths } = await dialog.showOpenDialog({
		title: "Select DFHack folder (must contain " + DFHackRunName() + ")",
		properties: ["openDirectory"]
	});

	if (canceled || filePaths.length == 0)
		return false;

	config.dfhackPath = canceled ? null : filePaths[0];
	cl("Selected DFHack path: " + config.dfhackPath);

	var pathError = IsDFHackPathReadyError("Set path failed");
	if (pathError) {
		cl("(B) SetDFHackPath pathError " + pathError);
		resolve(pathError);
		return;
	}

	await SaveConfig();
	return true;
}


async function SetDwarfFortressPath() {
	const { canceled, filePaths } = await dialog.showOpenDialog({
		title: "Select Dwarf Fortress folder",
		properties: ["openDirectory"]
	});

	if (canceled || filePaths.length == 0)
		return false;

	config.dwarfPath = canceled ? null : filePaths[0];

	cl("Selected Dwarf Fortress path: " + filePaths[0]);
	var pathError = IsDwarfPathReadyError("Set path failed");
	if (pathError) {
		cl("(B) SetDwarfFortressPath " + pathError);
		resolve(pathError);
		return;
	}

	await SaveConfig();
	return true;
}

/*
function parseClipboardData(rawData) {
	// Check if clipboard is empty
	if (!rawData || rawData.trim() === "") {
		throw new Error("Clipboard is empty - DFHack Lua script did not write data. Is Dwarf Fortress running?");
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
		throw new Error("Data is neither valid JSON nor stock format: " + e.message);
	}
}
*/

function FileAccessError(err) {
	return {
		error: {
			title: "File access error",
			msg: "An error occurred while trying to access a file: " + err.message,
			context: "FileAccessError",
			buttons: ["OK"],
			errorObj: err
		}
	};
}

ipcMain.handle("GetGameStatus", async (e) => {
	return new Promise(async (resolve, reject) => {
		if (GetPathsReadyError())
			resolve(GetPathsReadyError());

		config.dfhackPath ??= "";
		let dfhackPath = path.join(config.dfhackPath, DFHackRunName());


		let luaScriptPath = GetLuaDataPath("gameStatus.lua");
		let args = ["lua", "-f", luaScriptPath];

		fs.access(dfhackPath, fs.constants.F_OK | fs.constants.X_OK, (err) => {
			if (err) {
				cl("File access error: " + err);
				resolve(FileAccessError(err));
				return;
			}

			ExecDFHack(args, async (error, stdout, stderr) => {
				await pause(200);

				let data = null;

				if (error || !stdout || !stdout.includes("DFPOM_STATUS_JSON:")) {
					var errorString = error ? error.toString() : "Unknown error";
					data = {
						error: {
							title: "Waiting for Dwarf Fortress...",
							msg: "Please start the game and load a Fortress.",
							context: "GetGameStatus2 code:" + (error.code || '') + " signal:" + (error.signal || ''),
							buttons: ["WAIT"],
							errorObj: { error: errorString, stdout: stdout, stderr: stderr }
						}
					};
					resolve(data);
					return;

				}

				let lines = stdout.split("\n");
				for (let line of lines) {
					if (line.includes("DFPOM_STATUS_JSON:")) {
						cl("parsing status data...");
						data = JSON.parse(line.substring(line.indexOf("DFPOM_STATUS_JSON:") + "DFPOM_STATUS_JSON:".length).trim());
						cl("status data parsed");
						break;
					}
				}

				try {

					resolve(data);

				} catch (e) {

					data = {
						error: {
							title: "Data parsing error",
							msg: "An error occurred while parsing data pulled from Dwarf Fortress. <br>" + e + "<br><br>" + data,
							context: "GetGameStatus3",
							buttons: ["CONTINUE"]
						}
					};
					readingStuff = false;
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
		if (GetPathsReadyError())
			resolve(GetPathsReadyError());

		let dfhackPath = path.join(config.dfhackPath, DFHackRunName());

		let luaScriptPath = GetLuaDataPath("gameInfo_use.lua");
		if (!gameInfoLuaUpdated) {
			//read template, prepare used model
			let luaScriptPath = GetLuaDataPath("gameInfo.lua");

			let luaScriptContent = fs.readFileSync(luaScriptPath, "utf-8");
			if (!config.ignoredItems)
				config.ignoredItems = [];
			luaScriptContent = luaScriptContent.replace("'IGNORED_ITEMS_LIST'", `'` + config.ignoredItems.join(`','`) + `'`);
			fs.writeFileSync(luaScriptPath, luaScriptContent, "utf-8");
			gameInfoLuaUpdated = true;
		}

		//write used model

		cl("Executing dfhack-run... " + luaScriptPath);
		let args = ["lua", "-f", luaScriptPath];

		fs.access(dfhackPath, fs.constants.F_OK | fs.constants.X_OK, (err) => {
			if (err) {
				cl("File access error: " + err);
				resolve(FileAccessError(err));
				return;
			}

			ExecDFHack(args, async (error, stdout, stderr) => {
				await pause(200);

				let data = null;

				if (error || !stdout || !stdout.includes("DFPOM_GAMEINFO_JSON:")) {
					data = {
						error: {
							title: "Waiting for Dwarf Fortress...",
							msg: "Please start the game and load a Fortress.",
							context: "GetGameInfos2 code:" + (error.code || '') + " signal:" + (error.signal || '') + "rp: " + process.resourcesPath + " / ep: " + process.execPath + " / dn: " + __dirname,
							buttons: ["WAIT"],
							errorObj: { error: error, stdout: stdout, stderr: stderr },
							prout: "rp: " + process.resourcesPath + " / ep: " + process.execPath + " / dn: " + __dirname
						}
					};
					resolve(data);
					return;
				}

				try {
					let lines = stdout.split("\n");
					for (let line of lines) {
						if (line.includes("DFPOM_GAMEINFO_JSON:")) {
							cl("parsing game info data...");
							data = line.substring(line.indexOf("DFPOM_GAMEINFO_JSON:") + "DFPOM_GAMEINFO_JSON:".length).trim();
							data = data.replace(/,}/g, "}");
							data = data.replace(/,]/g, "]");
							data = JSON.parse(data);
							cl("game info data parsed");
							break;
						}
					}

					resolve(data);

				} catch (e) {
					data = {
						error: {
							title: "Data parsing error",
							msg: "An error occurred while parsing data pulled from Dwarf Fortress. <br>" + e,
							context: "GetGameInfos3",
							buttons: ["CONTINUE"]
						}
					};
					readingStuff = false;
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
		if (GetPathsReadyError())
			resolve(GetPathsReadyError());

		let dfhackPath = path.join(config.dfhackPath, DFHackRunName());

		//read template
		let luaScriptPath = GetLuaDataPath("jobInfos.lua");
		let luaScriptContent = fs.readFileSync(luaScriptPath, "utf-8");
		luaScriptContent = luaScriptContent.replace("69420;", jobsInfosStartIndex + ";");
		luaScriptContent = luaScriptContent.replace("69421;", jobsInfosMaxScans + ";");

		//write used model
		luaScriptPath = GetLuaDataPath("jobInfos_use.lua");
		fs.writeFileSync(luaScriptPath, luaScriptContent, "utf-8");

		cl("Executing dfhack-run... " + luaScriptPath);
		cl("> Getting job infos from index " + jobsInfosStartIndex);
		let args = ["lua", "-f", luaScriptPath];

		fs.access(dfhackPath, fs.constants.F_OK | fs.constants.X_OK, (err) => {
			if (err) {
				cl("File access error: " + err);
				resolve(FileAccessError(err));
				return;
			}

			ExecDFHack(args, async (error, stdout, stderr) => {
				await pause(50);

				let data = null;

				if (error || !stdout || !stdout.includes("DFPOM_JOBINFOS_JSON:")) {
					data = {
						error: {
							title: "Waiting for Job Orders",
							msg: "Please open the 'Job Orders > Create Task' menu once to allow data extraction.",
							context: "GetJobsInfos2a code:" + (error.code || '') + " signal:" + (error.signal || ''),
							icon: "orders icon.png",
							errorObj: { error: error, stdout: stdout, stderr: stderr }
						}
					};
					resolve(data);
					return;
				}

				try {
					// Try to extract data from stdout first (marked with DFPOM_JOBINFOS_JSON:)
					let lines = stdout.split("\n");
					for (let line of lines) {
						if (line.includes("DFPOM_JOBINFOS_JSON:")) {
							cl("parsing job infos data...");
							data = line.substring(line.indexOf("DFPOM_JOBINFOS_JSON:") + "DFPOM_JOBINFOS_JSON:".length).trim();
							data = data.replace(/,}/g, "}");
							data = data.replace(/,]/g, "]");
							data = JSON.parse(data);
							cl("job infos data parsed");
							break;
						}
					}

					if (data.jobs.length == 0 && data.completed == false) {
						data = {
							error: {
								title: "Waiting for Job Orders",
								msg: "Please open the 'Job Orders > Create Task' menu once to allow data extraction.",
								icon: "orders icon.png",
								context: "GetJobsInfos2b"
							}
						};
						resolve(data);
						return;
					}
					jobsInfosStartIndex = data.pauseAtIndex;
					resolve(data);

				} catch (e) {
					data = "wait"
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
		if (GetPathsReadyError())
			resolve(GetPathsReadyError());

		let dfhackPath = path.join(config.dfhackPath, DFHackRunName());

		//read template
		let luaScriptPath = GetLuaDataPath("exportStocks.lua");
		let luaScriptContent = fs.readFileSync(luaScriptPath, "utf-8");
		luaScriptContent = luaScriptContent.replace("69420;", stocksReaderStartIndex + ";");
		luaScriptContent = luaScriptContent.replace("69421;", stocksReaderMaxScans + ";");
		//write used model
		luaScriptPath = GetLuaDataPath("exportStocks_temp.lua");
		fs.writeFileSync(luaScriptPath, luaScriptContent, "utf-8");

		let args = ["lua", "-f", luaScriptPath];

		fs.access(dfhackPath, fs.constants.F_OK | fs.constants.X_OK, (err) => {
			if (err) {
				cl("File access error: " + err);
				resolve(FileAccessError(err));
				return;
			}

			ExecDFHack(args, async (error, stdout, stderr) => {
				await pause(50);

				let rawData = null;

				if (error || !stdout || !stdout.includes("DFPOM_STOCKS:")) {
					data = {
						error: {
							title: "Waiting for Dwarf Fortress...",
							msg: "Please start the game and load a Fortress.",
							context: "GetStocks2 code:" + (error.code || '') + " signal:" + (error.signal || ''),
							buttons: ["WAIT"],
							errorObj: { error: error, stdout: stdout, stderr: stderr }
						}
					};
					resolve(data);
					return;
				}

				try {
					// Try to extract data from stdout first (marked with DFPOM_STOCKS:)
					let lines = stdout.split("\n");
					for (let line of lines) {
						if (line.includes("DFPOM_STOCKS:")) {
							rawData = line.substring(line.indexOf("DFPOM_STOCKS:") + "DFPOM_STOCKS:".length).trim();
							break;
						}
					}

					let data = ProcessStockData(rawData)
					if (Object.keys(data.stocks).length == 0) {
						data = {
							error: {
								title: "Waiting for Dwarf Fortress...",
								msg: "Please start the game and load a Fortress.",
								context: "GetStocks3a",
								buttons: ["WAIT"]
							}
						};
						readingStuff = false;
						resolve(data);
						return;
					}
					resolve(data);

				} catch (e) {
					if (error) {
						data = {
							error: {
								title: "Waiting for Dwarf Fortress...",
								msg: "Please start the game and load a Fortress.",
								context: "GetStocks3b",
								buttons: ["WAIT"]
							}
						};
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
	config.ordersFilePath = path.join(config.dwarfPath, "dfhack-config", "orders", ORDERS_NAME);

	cl("Reading orders file...");

	return new Promise((resolve, reject) => {
		if (GetPathsReadyError())
			resolve(GetPathsReadyError());

		let dfhackPath = path.join(config.dfhackPath, DFHackRunName());
		let filename = path.basename(config.ordersFilePath, '.json');
		let args = ["orders", "export", filename];

		fs.access(dfhackPath, fs.constants.F_OK | fs.constants.X_OK, (err) => {
			if (err) {
				cl("File access error: " + err);
				resolve(FileAccessError(err));
				return;
			}

			ExecDFHack(args, (error) => {
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
	config.ordersFilePath = path.join(config.dwarfPath, "dfhack-config", "orders", ORDERS_NAME);
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

	var pathError = GetPathsReadyError();
	if (pathError) {
		readingStuff = false;
		return pathError;
	}

	let dfhackPath = path.join(config.dfhackPath, DFHackRunName());
	let filename = path.basename(config.ordersFilePath, '.json');
	let args1 = ["orders", "clear"];
	let args2 = ["orders", "import", filename + "_out"];

	try {
		fs.access(dfhackPath, fs.constants.F_OK | fs.constants.X_OK, (err) => {
			if (err) {
				cl("File access error: " + err);
				resolve(FileAccessError(err));
				return;
			}

			//clear orders command
			ExecDFHack(args1, (error) => {
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
				ExecDFHack(args2, (error) => {
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


ipcMain.handle("ReadStocksArchive", async () => {
	await ReadStocksArchive();
	return oldStocks;
});

async function ReadStocksArchive() {
	oldStocks = {};
	if (fs.existsSync(STOCKS_PATH)) {
		cl("Reading stocks archive...");
		const stocksData = fs.readFileSync(STOCKS_PATH, "utf-8");
		try {
			oldStocks = JSON.parse(stocksData);
		} catch (e) {
			cl("Error parsing stocks archive: " + e);
		}
	}
	return oldStocks;
}


ipcMain.handle("SaveStocksArchive", async (e, stocksHistory) => {
	await SaveStocksArchive(stocksHistory);
});

async function SaveStocksArchive(stocksHistory) {
	try {
		fs.writeFileSync(STOCKS_PATH, JSON.stringify(stocksHistory));
		oldStocks = stocksHistory;
	} catch (e) {
		cl("Error writing stocks archive: " + e);
	}
}




ipcMain.handle("GetSetConfig", async (e, newConfig) => {
	await ReadConfig();

	if (newConfig != null) {
		if (config.ignoredItems && newConfig.ignoredItems && config.ignoredItems.toString() != newConfig.ignoredItems.toString())
			gameInfoLuaUpdated = false;

		config = newConfig;
		await SaveConfig();
	}

	if (IsDFHackPathReadyError("api GetSetConfig") != null)
		return IsDFHackPathReadyError("api GetSetConfig 1");

	if (IsDwarfPathReadyError("api GetSetConfig") != null)
		return IsDwarfPathReadyError("api GetSetConfig 2");

	return config;
});


function GetPathsReadyError() {
	if (!config.dfhackPath || config.dfhackPath.length == 0)
		return PrepareMissingDFHackError("GetPathsReadyError (missing 'dfhackPath' in config)");

	var badHack = IsDFHackPathReadyError("GetPathsReadyError") != null;
	var badDF = IsDwarfPathReadyError("GetPathsReadyError") != null;
	if (badDF || badHack) {
		return {
			title: "Something's wrong with your " + (badDF ? "Dwarf Fortress" : "DFHack") + " path",
			msg: "Please point to your Dwarf Fortress fortress folder (ex: 'C:\\Program Files (x86)\\Steam\\steamapps\\common\\Dwarf Fortress\\')",
			context: "GetGameStatus1",
			buttons: ["SET DWARF FORTRESS PATH"]
		}
	}
}


function IsDFHackPathReadyError(ctx = "?") {
	if (config.dfhackPath == null)
		return PrepareMissingDFHackError("PathsHack (missing 'dfhackPath' in config), context: " + ctx);

	var requiredFile = path.join(config.dfhackPath, DFHackRunName());
	cl("Checking DFHack path: " + requiredFile);
	if (!fs.existsSync(requiredFile)) {
		cl("(B) " + DFHackRunName() + " not found in " + requiredFile);
		return PrepareMissingDFHackError("Paths2 (missing '" + DFHackRunName() + "' at " + requiredFile + "), context: " + ctx);
	}
	cl(" ---> OK!")
	return null;
}


function IsDwarfPathReadyError(ctx = "?") {
	if (config.dwarfPath == null)
		return PrepareMissingDwarfFortressError("Paths0 (missing 'dwarfPath' in config), context: " + ctx);

	var requiredFile = path.join(config.dwarfPath, DwarfFortressExeName());
	if (!fs.existsSync(requiredFile)) {
		cl("(A) " + DwarfFortressExeName() + " not found in " + requiredFile);
		return PrepareMissingDwarfFortressError("PathsDwarf (missing '" + DwarfFortressExeName() + "' at " + requiredFile + "), context: " + ctx);
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

	/*
	mainWindow.on('new-window', function (e, url) {
		e.preventDefault();
		cl(url);
		shell.openExternal(url);
	});
	*/

	mainWindow.webContents.setWindowOpenHandler(({ url }) => {
		cl(url);
		shell.openExternal(url);
		return { action: 'deny' };
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


async function pause(milliseconds) {
	return new Promise(resolve => setTimeout(resolve, milliseconds));
}


function GetLuaDataPath(fileName) {
	if (process.platform === 'linux')
		return "/tmp/" + tmpLinuxFolderName + "/" + fileName

	if (!app.isPackaged)
		return __dirname + "/lua/" + fileName;

	return process.resourcesPath + "/lua/" + fileName;
}

function GetLuaDataPathOriginal() {
	if (!app.isPackaged)
		return __dirname + "/lua/";

	return process.resourcesPath + "/lua/";
}


function DwarfFortressExeName() {
	return process.platform === 'win32' ? 'Dwarf Fortress.exe' : 'dwarfort';
}


async function CleanupOnExit(code = 0) {
	if (process.platform === 'linux') {
		try {
			const tmpDir = path.join(app.getPath('temp'), tmpLinuxFolderName);
			if (fs.existsSync(tmpDir)) {
				fs.rmSync(tmpDir, { recursive: true, force: true });
			}
		} catch (e) {
			cl('Cleanup error:', e);
		}
	}
	process.exit(code);
}

