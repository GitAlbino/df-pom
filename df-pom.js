const $ = (selector) => document.querySelectorAll(selector);

var json;
var clonedOrders;
var fileHandle;
var orders = [];
var config = {}

var conditionJustCopied = false;
var currentHoverOrder = null;
var copiedCondition = null;

var mustReadOrders = false;
var mustWriteOrders = false;
var mustReadStocks = false;
var lastError;

var ordersTable;
var allOrdersPaused = false;
var waitForOrdersOperation = false;
var autoFillSource = {};
var errorCallback;
var autoReadStocks = false;

var lastFilterChange = 0;
var filterDelayer = null;
var hoveredNumInput = null;
var hoveredConditionsOrder;
var gameStatus;
var lastGameStatusCheck = 0;
var lastPopData;
var lastFavorites;
var modificationsPending;
var initDone = false;
let graphBoxes = {};

var itemJob = [];
var itemHasJob = {};
var jobSortedNames = [];
var itemTypesRequiringSubtypes = [];
var itemMatStockChanges = [];
var itemsWithCapacity = [];
var itemWithDimensions = {
    "BAR": 150,
    "CLOTH": 10000,
    "THREAD": 15000
}

let noGraphs = false;
let initToast;
var emptyCellsCreated = false;
var wasShiftPressed = false;
var wasCtrlPressed = false;
var lastToastMessage = ""
const PAUSECHANNEL_ALLSTASKS = -2;
const PAUSECHANNEL_FROMTASK = -1;
const PAUSECHANNEL_ONETASK = 0;
const PAUSECHANNEL_ANY = -99;
const MAX_MATERIALS_COLS = 20;
const pauseAll = GetPauseCondition(PAUSECHANNEL_ALLSTASKS);
const pauseFrom = GetPauseCondition(PAUSECHANNEL_FROMTASK);
const pauseOne = GetPauseCondition(PAUSECHANNEL_ONETASK);

var showWriteOrderToast = false;
var showReadOrderToast = false;
var showReadStockToast = false;
var generalFilter = ""
var currendFuseInput;
var previousSizeMode;
var fuses = [];
var keysDown = [];
let keyedToasts = {};
let nextGraphSave = 0;
let stocksHistory = {}

var ligniteCokeJob;
var bituminousToCokeJob;
var brewFromFruit;
var brewFromPlants;
var setComboOrderNoLoop;

var lastOrderRead = 0;
var lastOrdersAccess = 0;
const ORDER_ACCESS_MIN_DELAY = 250;
const ORDER_READ_UPDATE_INTERVAL = 3500;

var multiFill = false;
var forceAllItemsVisible = false;
var openedConditionsOrder;
var openedConditionsIndex;
var readingStocks = false;
var readingJobs = false;
var itemsTypesAndSubtypes = {};
var inventoryDisplayedMaterials = [];
var inventoryStaticHeader;
var inventoryStaticHeaderCorner;
var pleaseWait;
var oldStocks;
var stocks = [];
var tempStocks = [];
var jobs = null;
var tempJobs = [];
var gm = {};
var qqq;
var editedOrder;
var editedOrderIsNew;
var itemsHumanNamesToItem = {}
var sortedItemSubTypesIds = [];
var sortedJobTypes = [];
var itemTypesMembers = {};
var stockCellsLabels = {}
var stockCellsHeaders = {}
var stockMatCols = {}
var stockCells = {}

var materials = []
var stocksMaterials = []
var jobsMaterials = []

const min_graphsRed = 0;
const max_graphsRed = 1;
const min_graphsSpan = 3;
const max_graphsSpan = 1000;
const min_graphsRate = 1;
const max_graphsRate = 1200 * 30;
const min_graphsHeight = 30;
const max_graphsHeight = 1000;
const min_graphsWidth = 100;
const max_graphsWidth = 1000;

let materialsGroups = [
    "ALL",
    "BONE",
    "CERAMIC",
    "CLOTH",
    "FUEL",
    "GEM",
    "GLASS",
    "LEATHER",
    "METAL",
    "OTHER",
    "STONE",
    "THREAD",
    "WOOD",
]



var sideA;
var sideB;

var cl = console.log

document.addEventListener("DOMContentLoaded", async (event) => { InitDOM() });
document.addEventListener("mouseover", function (e) {
    hoveredNumInput = null;
    hoveredNumInputTime = Date.now();
    if (e.target instanceof HTMLInputElement && e.target.getAttribute("type") == "number")
        hoveredNumInput = e.target;
});

async function InitDOM() {
    await GetConfig();
    $("ver").forEach(el => el.textContent = "v" + config.version);
    fileHandle = await window.api.GetFileHandle();

    if (!(config.toggleTabInventory || config.toggleTabOrders || config.toggleTabJobs || config.toggleTabGraphs))
        SetTab("inventory");

    sideA = $(".inventoryBody .itemsSide")[0];
    sideB = $(".inventoryBody .valuesSide")[0];
    inventoryStaticHeader = $(".inventoryTableHeader")[0];
    ordersTable = $(".ordersTable")[0];

    document.addEventListener("keydown", (e) => { OnGeneralKeyDown(e) });
    document.addEventListener("keyup", (e) => { OnGeneralKeyUp(e) });
    $("#inventoryMaterialsFilter")[0].addEventListener("mouseup", (e) => { e.stopPropagation(); });
    $(".inventoryMaterialsPicker")[0].addEventListener("mouseup", (e) => { e.stopPropagation(); });
    $(".inventoryTable")[0].addEventListener("scroll", (e) => {
        inventoryStaticHeader.style.transform = `translateX(-${e.target.scrollLeft}px)`;
        inventoryStaticHeaderCorner ??= $(".inventoryTableHeader .corner")[0];
        if (inventoryStaticHeaderCorner)
            inventoryStaticHeaderCorner.style.transform = `translateX(${e.target.scrollLeft}px)`;
    });
    window.addEventListener("focus", (event) => { ClearKeys() });
    PrepareInput($("input#conditionValue")[0]);

    await InitData();
}

async function InitData() {

    pleaseWait = true;
    $(".pleaseWait")[0].classList.remove("hidden");

    initToast = Toast("<i>Initializing...</i>", true);
    try {
        if (!config.disclaimerAccepted)
            ShowDisclaimer();

        var lastVersion = config.lastSeenChangelogVersion;
        var newVersion = config.version;

        if (lastVersion != newVersion)
            ShowChangelog();

        ApplyConfigClasses();

        let ok = false;
        while (!ok) {
            ok = await GetGameStatus();
            if (!ok)
                await pause(300);
        }

        ok = false;
        while (!ok) {
            let toast = Toast("Getting game infos...", true);
            ok = await GetGameInfos();
            if (!ok)
                await pause(300);
            ClearToast(toast);
        }

        ok = false;
        while (!ok) {
            let toast = Toast("Reading orders...", true);
            ok = await ReadJobs();
            if (!ok)
                await pause(300);
            ClearToast(toast);
        }

        initDone = true;

        await QueueOrdersRead(true, true);
        await QueueStocksRead(true, true);
        RefreshStocksFilter()
        CreateSmeltingButtons()
    } catch (e) {
        ClearToast(initToast);
    }

    RedrawGraphs();
    await DataAutoUpdater();

}

function QueueOrdersRead(immediate = false, showToast = false) {
    showReadOrderToast = showToast;
    mustReadOrders = true;
}

function QueueOrdersSave(immediate = false, showToast = false) {
    showWriteOrderToast = showToast;
    mustWriteOrders = true;
}

function QueueStocksRead(immediate = false, showToast = false) {
    showReadStockToast = showToast;
    mustReadStocks = true;
    if (immediate)
        TryReadStocks();
}

let m_autoUpdateRunning = false;

async function DataAutoUpdater() {
    // Prevent concurrent execution
    if (m_autoUpdateRunning)
        return;

    m_autoUpdateRunning = true;

    try {
        if (initDone) {
            // Check game status every 1500ms
            if (lastGameStatusCheck < Date.now() - 1500) {
                lastGameStatusCheck = Date.now();
                const ok = await GetGameStatus();
                if (!ok) {
                    return; // Skip operations if game status check fails
                }
            }

            await TryReadWriteOrders();
            await TryReadStocks();
        }
    } catch (e) {
        console.error("Error in DataAutoUpdater:", e);
    } finally {
        m_autoUpdateRunning = false;
    }

    // Schedule next cycle 150ms after THIS cycle completes
    setTimeout(DataAutoUpdater, 150);
}

function ResetApp() {
    cl("Resetting app data...");
    Trace("Resetting app data...");
    window.api.ResetApp();
    gm = {};
    orders = [];
    stocks = [];

    allOrdersPaused = false;
    wasShiftPressed = false;
    wasCtrlPressed = false;

    currendFuseInput = null;
    fuses = [];
    keysDown = [];
    openedConditionsOrder = null;
    openedConditionsIndex = 0;
    lastOrdersAccess = 0;
    readingStocks = false;
    readingJobs = false;
    inventoryDisplayedMaterials = [];
    oldStocks = {};
    stocks = [];
    tempStocks = [];
    jobs = null;
    tempJobs = [];
    gm = {};
    sortedItemSubTypesIds = [];
    sortedJobTypes = [];
    itemTypesMembers = {};

    ordersTable.innerHTML = $(".ordersTable .help")[0].outerHTML;

    ClearStockTable();
    InitData();
}

function ClearStockTable() {
    itemMatStockChanges = [];
    stockCellsLabels = {}
    stockCellsHeaders = {}
    stockMatCols = {}
    stockCells = {}
    emptyCellsCreated = false;

    $(".inventoryTableHeader")[0].innerHTML = "";
    $(".inventoryBody .itemsSide")[0].innerHTML = "";
    $(".inventoryBody .valuesSide")[0].innerHTML = "";
}

async function TryReadWriteOrders() {
    var timePassed = Date.now() - lastOrdersAccess;
    if (timePassed < ORDER_ACCESS_MIN_DELAY)
        return;
    lastOrdersAccess = Date.now();

    var conditionEdited = openedConditionsOrder != null || document.querySelector(".conditionEditor:hover") || document.querySelector(".item_conditions:hover");
    if (!conditionEdited) {

        if (mustWriteOrders) {

            let toast = null;
            if (showWriteOrderToast)
                toast = Toast("Saving orders...", true);
            showWriteOrderToast = false;

            await WriteOrders();

            ClearToast(toast);

            await pause(100);
            PostWriteOrders();

        } else if (!modificationsPending && (mustReadOrders || config.toggleAutoReadOrders)) {

            timePassed = Date.now() - lastOrderRead;
            if (timePassed < ORDER_READ_UPDATE_INTERVAL)
                return;
            lastOrderRead = Date.now();

            let toast = null;
            if (showReadOrderToast)
                toast = Toast("Reading orders...", true);
            showReadOrderToast = false;

            mustReadOrders = false;
            await ReadOrders();

            ClearToast(toast);

        }
    }
}



document.addEventListener("wheel", e => {
    if (hoveredNumInput != null) { // && TimeSinceInputHovered() > 300
        e.preventDefault();

        var delta = Math.sign(e.deltaY);
        if (IsCtrlPressed())
            delta *= 5;
        var curVal = e.target.value;
        curVal = curVal === "" ? 0 : curVal;
        let min = 0;
        if (e.target.classList.contains("graphScale"))
            min = -1;
        var newValue = Math.max(min, parseInt(curVal) - delta);
        e.target.value = newValue;
        var event = new Event('change');
        e.target.dispatchEvent(event);

        return;
    }

    if (IsShiftPressed() || IsCtrlPressed())
        return false;

    var host = e.target.closest(".hozScroll");
    if (!host)
        return;

    e.preventDefault();
    host.scrollLeft += e.deltaY;

}, { passive: false });

function TimeSinceInputHovered() {
    return Date.now() - hoveredNumInputTime;
}

function CheckError(data, waitingToken) {
    if (data == "wait")
        return true;

    if (data == null) {
        //output error to console
        console.error("No data received from main process.");

        PopInfo("Error", "No data received from main process.");
        return true;
    }

    if (data.error != undefined) {
        setTimeout(() => {
            const d = data.error;
            const cb = errorCallback;
            const wt = waitingToken;
            PopInfo(d.title, d.msg, d.context, d.buttons, errorCallback, wt, d.icon);
        });
        lastError = data.error;
        return true;
    }

    return false;
}

async function GetGameStatus() {
    Trace("Checking game status...");
    gameStatus = await window.api.GetGameStatus();

    if (CheckError(gameStatus, "GetGameStatus"))
        return false;

    var status = "";
    if (!gameStatus.isFortress) {
        status = "The current Dwarf Fortress mode is not Fortress Mode.";
    } else if (gameStatus.site == "nil") {
        status = "No fortress site is currently loaded in Dwarf Fortress.";
    }

    if (status != "") {
        PopInfo("Game not ready", status + "<br><br> Waiting for a fortress to be loaded...", "", [], null, "GetGameStatus");
        return false;
    }

    ClosePopInfoWaiting("GetGameStatus")
    return true
}

async function GetGameInfos() {
    gm = await window.api.GetGameInfos();

    if (CheckError(gm, "GetGameInfo"))
        return false;
    ClosePopInfoWaiting("GetGameInfo");

    sortedItemSubTypesIds = Object.keys(gm.items);
    sortedItemSubTypesIds.sort((a, b) => { return a.localeCompare(b); });

    itemsTypesAndSubtypes = Object.values(gm.items).map(item => item.typeName);
    itemsTypesAndSubtypes.push(...Object.values(gm.items).map(item => item.subtypeName));
    itemsTypesAndSubtypes = [...new Set(itemsTypesAndSubtypes)];

    //rename all gm.items objects keys by removing the "!" contained in the key name



    Object.keys(gm.items).forEach((itemId) => {
        var item = gm.items[itemId];
        itemsHumanNamesToItem[item.name] = item;
        if (item.name == "box") {
            itemsHumanNamesToItem["crate"] = item;
            itemsHumanNamesToItem["chest"] = item;
            itemsHumanNamesToItem["coffer"] = item;
        } else if (item.name == "gobelet") {
            itemsHumanNamesToItem["mug"] = item;
            itemsHumanNamesToItem["cup"] = item;
        } else if (item.name == "pipe_section") {
            itemsHumanNamesToItem["tube"] = item;
        }
    })


    gm["material_types"] = {}

    gm.materials["GLASS_GREEN"] = { Types: ["GLASS"] };
    gm.materials["GLASS_CLEAR"] = { Types: ["GLASS"] };
    gm.materials["GLASS_CRYSTAL"] = { Types: ["GLASS"] };
    gm.materials["COAL:CHARCOAL"] = { Types: ["FUEL"] };
    gm.materials["COAL:COKE"] = { Types: ["FUEL"] };
    gm.materials["CLOTH"] = { Types: ["CLOTH"] };
    gm.materials["THREAD"] = { Types: ["THREAD"] };
    gm.materials["SILK"] = { Types: ["SILK"] };
    Object.keys(gm.materials).forEach((mat) => {
        matI = gm.materials[mat]

        if (!matI.Types)
            matI.Types = [];

        matI.id = mat;
        matI.Types.forEach((mt) => {
            if (!gm.material_types[mt])
                gm.material_types[mt] = []
            gm.material_types[mt].push(mat)
        });
        gm.materials[mat] = matI;
    });

    itemTypesRequiringSubtypes = []
    Object.keys(gm.items).forEach((itemId) => {
        var item = gm.items[itemId];
        var group = item.typeName.toUpperCase();
        itemTypesMembers[group] = itemTypesMembers[group] || [];
        itemTypesMembers[group].push(item);
        itemTypesRequiringSubtypes.push(item.typeName);
    });
    itemTypesRequiringSubtypes = [...new Set(itemTypesRequiringSubtypes)];

    Object.values(gm.item_types).forEach((itemType) => {
        if (!itemTypesMembers[itemType]) {
            gm.items[itemType] = {
                subtypeName: "",
                typeName: itemType,
                name: itemType.toLowerCase(),
                isTypeOnly: true
            };
        }
    });

    gm.items["CRAFTS"] = {
        name: "crafts",
        subtypeName: "",
        typeName: "CRAFTS",
        isTypeOnly: true
    };

    gm.items["FOOD!"] = {
        name: "food",
        subtypeName: "",
        typeName: "FOOD"
    };


    var flags = [];
    Object.keys(gm.job_item_flags1).forEach(key => { flags.push(gm.job_item_flags1[key]) });
    Object.keys(gm.job_item_flags2).forEach(key => { flags.push(gm.job_item_flags2[key]) });
    Object.keys(gm.job_item_flags3).forEach(key => { flags.push(gm.job_item_flags3[key]) });
    flags = [...new Set(flags)];
    gm.itemFlags = flags.filter(f => f != "nil");

    //mark hard coded items that have capacity
    capacityItems.forEach(itemName => {
        if (Object.keys(gm.items).includes(itemName.toUpperCase()))
            gm.items[itemName.toUpperCase()].container_capacity = 1;
    });

    return true;
}


async function ReadJobs() {

    let ok = false;
    readJobsCompleted = false;

    Trace("Reading jobs...");
    while (!ok) {
        ok = await ReadJobsBatch();
        if (!ok)
            await pause(100);
    }
    Trace("Reading jobs: completed.");

    return true;
}


async function ReadJobsBatch() {
    data = await window.api.GetJobsInfos();

    //check if data has a "completed" property
    if (data == null) {
        cl("error: null data");
        return false;
    }

    if (CheckError(data, "Jobs")) {
        await pause(2500);
        return false;
    }
    ClosePopInfoWaiting("Jobs");

    if (data.completed === undefined) {
        Trace("Erroneous jobs reading: missing 'completed' property");
        await pause(400);
        return false;
    }

    data.jobs.forEach(job => {
        tempJobs.push(job);
    });

    if (data.jobs.length == 0) {
        await pause(400);
        return false;
    }

    if (data.completed) {
        jobs = tempJobs;
        FinalizeJobsData();
        return true;
    }

    return false;
}

function DragStart(e) {
    e.dataTransfer.setData("text/plain", null);
    var myRow = e.target.closest(".orderRow");
    if (myRow) {
        var siblings = Array.from(myRow.parentElement.children);
        e.dataTransfer.setData("orderIndex", siblings.indexOf(myRow) - 1);
        setTimeout(() => { $("body")[0].classList.add("dragging") }, 10);
    } else {
        //cancel drag
        e.preventDefault();
    }
}

function DragOver(e) {
    e.preventDefault();
    var myRow = e.target.closest(".orderRow");
    if (myRow)
        myRow.classList.add("dragOver");
}

function DragLeave(e) {
    e.preventDefault();
    $(".dragOver").forEach(el => el.classList.remove("dragOver"));
}

function DragEnd(e) {
    setTimeout(() => { $("body")[0].classList.remove("dragging") }, 10);

}

function DragDrop(e) {
    e.preventDefault();
    $(".dragOver").forEach(el => el.classList.remove("dragOver"));

    var targetRow = e.target.closest(".orderRow");
    if (!targetRow)
        return;

    const fromIndex = e.dataTransfer.getData("orderIndex");
    const toIndex = Array.from(ordersTable.children).indexOf(targetRow) - 1;
    if (fromIndex === toIndex)
        return;

    const movedOrder = orders.splice(fromIndex, 1)[0];

    orders.splice(toIndex, 0, movedOrder);

    MarkEdited(movedOrder);
    UpdateOrdersTable();

}


function UpdateOrdersTable(updateSmeltingButtons = true) {
    if (!ordersTable)
        return;

    var orderlines = ordersTable.querySelectorAll(".orderRow")
    orderlines.forEach(line => {
        var id = line.getAttribute("orderId");
        var order = orders.find(o => o.id == id);
        if (order == null)
            line.remove()
    });

    orders.forEach(order => {

        var editedLine = ordersTable.querySelector(`div[orderId='${order.id}']`);
        var orderIndex = orders.indexOf(order);

        if (editedLine == null) {
            editedLine = document.createElement("div");
            editedLine.classList.add("orderRow");
            editedLine.draggable = true;
            editedLine.setAttribute("orderId", order.id);

            editedLine.addEventListener("click", (e) => { const o = order; EditOrder(o); });
            editedLine.addEventListener("dragstart", (e) => { DragStart(e); });
            editedLine.addEventListener("dragover", (e) => { DragOver(e); });
            editedLine.addEventListener("dragleave", (e) => { DragLeave(e); });
            editedLine.addEventListener("drop", (e) => { DragDrop(e); });
            editedLine.addEventListener("dragend", (e) => { DragEnd(e); });
            editedLine.addEventListener("mouseenter", (e) => { currentHoverOrder = GetOrderFromElement(e.currentTarget); ShowOrderTools(e.currentTarget); });
            editedLine.addEventListener("mousemove", (e) => { currentHoverOrder = GetOrderFromElement(e.currentTarget); ShowOrderTools(e.currentTarget); });
            editedLine.addEventListener("mouseleave", (e) => { currentHoverOrder = null;; ShowOrderTools(null) });

            //place edited line at the right order in parent
            const referenceNode = ordersTable.children[orderIndex + 1]; //+1 to skip header
            if (referenceNode) {
                ordersTable.insertBefore(editedLine, referenceNode);
            } else {
                ordersTable.appendChild(editedLine);
            }
        }

        if (order.deleted) {
            editedLine.classList.add("deleted");
        } else {
            editedLine.classList.remove("deleted");
        }

        if (order.edited) {
            editedLine.classList.add("edited");
        } else {
            editedLine.classList.remove("edited");
        }

        if (order.isNew) {
            editedLine.classList.add("new");
        } else {
            editedLine.classList.remove("new");
        }

        if (order.is_active) {
            editedLine.classList.add("active");
        } else {
            editedLine.classList.remove("active");
        }

        if (order.is_validated) {
            editedLine.classList.add("validated");
        } else {
            editedLine.classList.remove("validated");
        }


        if (order.max_workshops === undefined)
            order.max_workshops = 0;

        if (order.item_conditions === undefined)
            order.item_conditions = [];

        order.pom_targetQtt = GetOrderTargetQtt(order);
        if (order.pom_targetQtt > 0 && OrderIsRepeating(order)) {
            editedLine.classList.add("hasTargetQtt");
        } else {
            editedLine.classList.remove("hasTargetQtt");
        }

        var progressBar = editedLine.querySelector(`.progressBar`);
        if (!progressBar) {
            progressBar = document.createElement("div");
            progressBar.classList.add("progressBar");
            progressBar.text = "."
            editedLine.appendChild(progressBar);
        }
        var pc = GetOrderProgressPercent(order);
        progressBar.style.width = pc + "%";
        if (pc == 100) {
            progressBar.classList.add("full");
        } else {
            progressBar.classList.remove("full");
        }

        var possibleProperties = propertiesInfos.filter(prop => prop.visible);
        for (const property in order) {

            if (property.endsWith("_cell"))
                continue;

            var propInfo = propertiesInfos.find(prop => prop.name === property);
            if (propInfo == null || !propInfo.visible)
                continue;

            var cell = editedLine.querySelector(`.property.${property}`);
            if (!cell) {
                cell = document.createElement("div");
                cell.classList.add("property", property);
                if (propInfo.numeric) {
                    cell.classList.add("num");
                } else {
                    cell.classList.remove("num");
                }
                if (propInfo.yesno) {
                    cell.classList.add("yesno");
                } else {
                    cell.classList.remove("yesno");
                }

                editedLine.appendChild(cell);
            }

            cell.setAttribute("title", propInfo.displayName);

            if (propInfo.compactable)
                cell.classList.add("optionalCol");

            if (propInfo.isToggle) {
                cell.classList.add("toggleable");
                cell.addEventListener("mouseup", (e) => {
                    e.stopPropagation();
                    if (e.button != 0)
                        return;

                    order[property] = !order[property];
                    if (order[property] === true) {
                        order[property + "_cell"].textContent = "YES";
                        order[property + "_cell"].classList.add("isTrue");
                        order[property + "_cell"].classList.remove("isFalse");
                    } else {
                        order[property + "_cell"].textContent = "NO";
                        order[property + "_cell"].classList.add("isFalse");
                        order[property + "_cell"].classList.remove("isTrue");
                    }
                });
            }

            var cellText = order[property];

            if (property == "job") {
                cellText = GetOrderJobLabel(order);
            }

            if (property === "material") {
                cellText = GetOrderMaterialLabel(order);
            }

            if (cellText === true) {
                cellText = "YES";
                cell.classList.add("isTrue");
            } else if (cellText === false) {
                cellText = "NO";
                cell.classList.add("isFalse");
            }

            order[property + "_cell"] = cell;

            if (propInfo && propInfo.isInput) {

                let input = editedLine.querySelector(`.property.${property} .inputNumber`);
                if (!input) {
                    input = CreateInputForOrders(InputChangeCallback_PropertyValue, order, property, -1);
                    if (property != "amount_total")
                        input.setAttribute("tabindex", "-1");

                    cell.appendChild(input);

                }
                input.value = isNaN(order[property]) ? 0 : order[property];

            } else if (property == "item_conditions") {


                var numDiv = editedLine.querySelector(`.property.${property} .conditionsNum`);
                if (!numDiv) {
                    numDiv = document.createElement("div");
                    numDiv.classList.add("conditionsNum");
                    numDiv.addEventListener("mouseenter", (e) => { ConditionEditHover(e); });
                    cell.appendChild(numDiv);
                }

                UpdateConditionsContainer(order);

            } else {

                cell.innerHTML = "<div>" + cellText + "</div>";

            }

            possibleProperties = possibleProperties.filter(prop => prop.name !== property);
        }

        //create cells for properties that are not present in this order object
        possibleProperties.forEach(prop => {
            var cell = editedLine.querySelector(`.property.${prop.name}`);
            if (!cell) {
                cell = document.createElement("div");
                cell.classList.add("property", prop.name);
                editedLine.appendChild(cell);
            }
            cell.textContent = "";
        });

    });


    //sort the table so that non-header rows respect the orders array order
    Array.from(ordersTable.children)
        .filter(row => !row.classList.contains("header"))
        .sort((a, b) => {
            const idA = parseInt(a.getAttribute("orderId"));
            const idB = parseInt(b.getAttribute("orderId"));
            const indexA = orders.findIndex(o => o.id === idA);
            const indexB = orders.findIndex(o => o.id === idB);
            return indexA - indexB;
        })
        .forEach(row => ordersTable.appendChild(row));


    orders.forEach(order => {
        const row = ordersTable.querySelector(`div[orderId='${order.id}']`);
        if (row) {
            row.classList.toggle("pauseOne", IsTaskPaused(order, PAUSECHANNEL_ONETASK));
            row.classList.toggle("pauseFrom", IsTaskPaused(order, PAUSECHANNEL_FROMTASK));
            row.classList.toggle("pauseAll", IsTaskPaused(order, PAUSECHANNEL_ALLSTASKS));
        }
    });

    if (updateSmeltingButtons)
        CheckSmeltingJobs();

    ordersTable.classList.toggle("empty", orders.length == 0);
    FilterJobs()
}


function CheckSmeltingJobs() {
    config.smeltOrders = []

    orders.forEach(order => {
        if (order.deleted)
            return;

        smeltingOrders.forEach(smelting => {
            if ((smelting.job == order.job && (smelting.material && smelting.material == order.material))
                || (order.reaction != null && smelting.reaction == order.reaction)) {
                config.smeltOrders.push(smelting.id + "");
            }
        });
    });

    UpdateSmeltingButtons();
}


function GetOrderConditions(order) {
    var conditions = order.item_conditions;
    //remove all conditions that correspond to a PauseCondition object
    if (!conditions) {
        cl("No conditions found for order id " + order.id);
        cl(order)
        return [];
    }
    conditions = conditions.filter(cond => !(cond.condition === pauseAll.condition && cond.value === pauseAll.value));
    conditions = conditions.filter(cond => !(cond.condition === pauseFrom.condition && cond.value === pauseFrom.value));
    conditions = conditions.filter(cond => !(cond.condition === pauseOne.condition && cond.value === pauseOne.value));
    return conditions;
}

function UpdateConditionsContainer(order) {
    //condition editor disabled
    return;

    if (!order)
        return;

    var conditions = GetOrderConditions(order);
    var editedLine = ordersTable.querySelector(`div[orderId='${order.id}']`);
    if (!editedLine) {
        cl("No edited line found for order id " + order.id);
        cl(order);
        return;
    }

    var cell = editedLine.querySelector(`.property.item_conditions`);
    if (!cell)
        return;

    var property = "item_conditions"
    //remove container if exists
    container = editedLine.querySelector(`.property.${property} .conditionsContainer`);

    if (container)
        container.remove();

    container = document.createElement("div");
    container.classList.add("conditionsContainer");
    cell.appendChild(container);

    var i = 0;
    conditions.forEach(condition => {
        var conditionElement = editedLine.querySelector(`.property.${property} .conditionsContainer .condition[conditionIndex='${i}']`);
        if (!conditionElement) {
            conditionElement = document.createElement("div");
            conditionElement.classList.add("condition");
            conditionElement.setAttribute("conditionIndex", i);
            container.appendChild(conditionElement);
        }

        var partsHost = editedLine.querySelector(`.property.${property} .conditionsContainer .condition[conditionIndex='${i}'] .conditionPartsHost`);
        if (!partsHost) {
            partsHost = document.createElement("div");
            partsHost.classList.add("conditionPartsHost");
            partsHost.setAttribute("conditionIndex", conditions.indexOf(condition));

            var delButton = document.createElement("button");
            delButton.classList.add("btnCopy");
            delButton.textContent = "📋";
            delButton.addEventListener("mouseup", (e) => {
                e.stopPropagation();
                if (e.button == 0)
                    CopyCondition(order, conditions.indexOf(condition));
            });
            partsHost.appendChild(delButton);

            var delButton = document.createElement("button");
            delButton.classList.add("btnDelete");
            delButton.textContent = "✖";
            delButton.addEventListener("mouseup", (e) => {
                e.stopPropagation();
                if (e.button == 0)
                    DeleteCondition(order, conditions.indexOf(condition));
            });
            partsHost.appendChild(delButton);
            conditionElement.appendChild(partsHost);
        }


        for (const key of conditionParts) {
            if (key.endsWith("_element"))
                continue;

            condPartElement = editedLine.querySelector(`.property.${property} .conditionsContainer .condition[conditionIndex='${i}'] .conditionPartsHost .conditionPart.cond_${key}`);
            var mustAddListener = false;
            if (!condPartElement) {
                condPartElement = document.createElement("div");
                condPartElement.classList.add("conditionPart", "cond_" + key);
                mustAddListener = true;
                partsHost.appendChild(condPartElement);
            }

            var value = condition[key] ?? "";

            if (key == "value") {
                var input = editedLine.querySelector(`.property.${property} .conditionsContainer .condition[conditionIndex='${i}'] .conditionPartsHost .conditionPart.cond_value input`);
                if (!input) {
                    input = CreateInputForOrders(InputChangeCallback_ConditionValue, order, property, i);
                    condPartElement.appendChild(input);
                }
                condition.value_element = input;
            } else {
                if (key == "condition") {
                    condPartElement.textContent = condOperators.find(op => op.name === condition[key]).symbol;
                } else {
                    condPartElement.textContent = value;
                }
                if (mustAddListener)
                    (function (order, index) {
                        condPartElement.addEventListener("mouseup", (e) => {
                            e.stopPropagation();
                            if (e.button == 0)
                                OpenConditionEditor(order, index);
                        });
                    })(order, conditions.indexOf(condition));

            }
        };
        if (condition.item_type == undefined) {
            var condPartElement = editedLine.querySelector(`.property.${property} .conditionsContainer .condition[conditionIndex='${i}'] .conditionPartsHost .conditionPart.cond_item_type`);

            if (!condPartElement) {
                condPartElement = document.createElement("div");
                condPartElement.classList.add("conditionPart", "cond_item_type");
                partsHost.appendChild(condPartElement);
            }
            condPartElement.textContent = "ANY_ITEM";
        }
        i++;
    });

    var buts = container.querySelectorAll(".buttons");
    if (buts.length == 0) {
        buts = document.createElement("div");
        buts.classList.add("buttons");
    } else {
        buts = buts[0];
    }

    var pasteCondButton = container.querySelectorAll(".btnAddCondition");
    if (pasteCondButton.length == 0) {
        var button = document.createElement("button");
        button.textContent = "Paste";
        button.classList.add("btnPaste");
        button.addEventListener("mouseup", (e) => {
            e.stopPropagation();
            if (e.button == 0)
                PasteCondition(order);
        });
        buts.appendChild(button);
    } else {
        buts.appendChild(pasteCondButton[0]);
    }
    var addCondButton = container.querySelectorAll(".btnAddCondition");
    if (addCondButton.length == 0) {
        var button = document.createElement("button");
        button.textContent = "Add";
        button.classList.add("btnAddCondition");
        button.addEventListener("mouseup", (e) => {
            e.stopPropagation();
            if (e.button == 0) AddCondition(order);
        });
        buts.appendChild(button);
    } else {
        buts.appendChild(addCondButton[0]);
    }

    var numDiv = editedLine.querySelector(`.conditionsNum`);
    numDiv.textContent = conditions.length > 0 ? "" + conditions.length + "c" : "-";

    container.appendChild(buts);
    container.querySelectorAll(".btnPaste")[0].classList.toggle("disabled", copiedCondition == null);
}

function UpdateOrdersLabels() {
    var labels = document.querySelectorAll(".orderRow .property.job");
    labels.forEach(label => {
        let order = GetOrderFromElement(label.closest(".orderRow"));
        if (order)
            label.innerHTML = GetOrderJobLabel(order);
    });
}


/*
function AddCondition(order) {
    condition = {
        "condition": "GreaterThan",
        "flags": [""],
        "item_type": "",
        "reaction_id": "",
        "material": "INORGANIC",
        "reaction_product": "",
        "value": 10
    }
    order.item_conditions.push(condition);

    MarkEdited(order);
    UpdateOrdersTable();
    OpenConditionEditor(order, order.item_conditions.length - 1);
}
*/

function DeleteCondition(order, conditionIndex) {
    order.item_conditions.splice(conditionIndex, 1);
    MarkEdited(order);
}

function CopyCondition(order, conditionIndex) {
    copiedCondition = order.item_conditions[conditionIndex];
    conditionJustCopied = true;
    UpdateConditionsContainer(order);
}

function PasteCondition(order) {
    if (copiedCondition == null)
        return;

    order.item_conditions.push(copiedCondition);
    MarkEdited(order);
}



function CancelOrderChanges() {
    orders = [];
    Toast("Cleared changes");
    ReadOrders();
}

async function ReadOrders() {
    if (waitForOrdersOperation)
        return;

    waitForOrdersOperation = true;

    Trace("Reading orders...");

    json = await window.api.ReadOrdersFile();

    if (json == null || json == "") {
        waitForOrdersOperation = false;
        Trace("Reading orders: null/empty.");
        return;
    }

    if (json[0] != "[") {
        waitForOrdersOperation = false;
        Trace("Reading orders: invalid format.");
        return;
    }

    if (CheckError(json, "ReadOrders")) {
        waitForOrdersOperation = false;
        Trace("Reading orders: error.");
        return;
    }
    ClosePopInfoWaiting("ReadOrders");

    newOrders = JSON.parse(json);
    if (orders != null && orders.length > 0) {
        //update old lines
        orders.forEach(oldLine => {
            var matchingNewLine = newOrders.find(nl => nl.id == oldLine.id);
            if (matchingNewLine == null) {
                //remove obsolete line
                if (!oldLine.isNew && !oldLine.edited)
                    orders = orders.filter(ol => ol.id != oldLine.id);
            } else {
                //dont update values on edited lines
                if (oldLine.edited)
                    return;

                //update values
                propertiesInfos.forEach(prop => {
                    if (JSON.stringify(oldLine[prop.name]) != JSON.stringify(matchingNewLine[prop.name])) {
                        oldLine[prop.name] = matchingNewLine[prop.name];
                        if (prop.name === "item_conditions" && openedConditionsOrder != null && openedConditionsOrder.id == oldLine.id) {
                            //order conditions have changed game side, close condition editor if open
                            BackgroundClicked();
                        }
                    }
                });
            }
        });
        //add new lines
        newOrders.forEach(newLine => {
            var matchingOldLine = orders.find(ol => ol.id == newLine.id);
            if (matchingOldLine == null) {
                //insert at proper index
                var index = newOrders.indexOf(newLine);
                orders.splice(index, 0, newLine);
            }
        });
    } else {
        orders = newOrders;
    }

    orders.forEach(order => {
        GetJobFromOrder(order)
        if (order.item_subtype == "ITEM_ARMOR_ROBE")
            order.item_subtype = "ITEM_ARMOR_DRESS";
    });

    UpdateOrdersTable();
    UpdateStocksWanted();

    Trace("Reading orders: completed.");
    waitForOrdersOperation = false;
}

function UpdateStocksWanted() {
    //update cells with wanted qtt (update value or remove wanted flag if job no longer exists)

    let itemsToUpdate = []
    var cellsWanted = $(".cell.editable.hasJob[want]")
    cellsWanted.forEach(cell => {
        var jobId = parseInt(cell.getAttribute("jobId"));
        var job = jobs[jobId];
        if (!job)
            return;

        let item = GetJobItem(job);
        if (!item) {
            cl("No item found for job id " + jobId);
            cl(job);
        } else {
            itemsToUpdate.push(item);
        }
    });

    orders.forEach(order => {
        if (order.jobInfo)
            itemsToUpdate.push(GetJobItem(order.jobInfo));
    });

    itemsToUpdate = [...new Set(itemsToUpdate)];
    itemsToUpdate.forEach(item => {
        UpdateStockItemLine(item);
    });
}

async function WriteOrders() {
    //check frequency / condition

    orders.forEach(order => {
        if (OrderIsRepeating(order)) {
            if (order.frequency != "Daily") {
                order.frequency = "Daily"
                MarkEdited(order);
            }
        } else {
            if (order.frequency != "OneTime") {
                MarkEdited(order);
                order.frequency = "OneTime"
            }
        }
    });

    //check if any new, edited or deleted orders exist
    var hasChanges = orders.some(o => o.edited === true || o.deleted === true || o.isNew === true);
    if (!hasChanges)
        return;

    await GetGameStatus();
    let toast = null;
    while (gameStatus.workOrderConditionOpen == "true") {
        toast = Toast("Cannot save modifications while work order conditions are being edited in-game as this could crash the game.<br><b>Please close the Order Conditions Editor in-game</b> to save changes.")
        await pause(500);
        await GetGameStatus();
    }
    if (toast)
        ClearToast(toast);

    Trace("Writing orders...");

    fileHandle ??= await window.api.GetFileHandle();
    if (!fileHandle) {
        $("body")[0].classList.add("noFileSelected");
        return;
    }
    $("body")[0].classList.remove("noFileSelected");

    waitForOrdersOperation = true;

    //remove deleted
    orders = orders.filter(o => o.deleted !== true);

    //clear edited flags
    //remove "edited" property from all orders
    orders.forEach(order => { if (order.edited) delete order.edited; });
    orders.forEach(order => { if (order.isNew) delete order.isNew; });

    //remove empty properties
    clonedOrders = CloneOrdersNoDom(orders);
    clonedOrders.forEach(order => {
        DeleteEmptyKeys(order);
    });

    if (config.debugNoWrite) {
        cl(JSON.stringify(clonedOrders, null, 2));
    } else {
        await window.api.WriteOrdersFile(JSON.stringify(clonedOrders, null, 2));
    }
    Trace("Writing orders: completed.");
    waitForOrdersOperation = false;
}

function PostWriteOrders() {
    QueueOrdersRead(true);
    orders.filter(o => o.isNew).forEach(o => orders.splice(orders.indexOf(o), 1));
    $(".orderRow.new").forEach(el => el.remove());
    $(".editable.updating").forEach(el => el.classList.remove("updating"));
    CleanupDuplicateOrders(false)
    UpdateOrdersTable();

    mustWriteOrders = false;
    modificationsPending = false;
}

function DeleteEmptyKeys(obj) {
    //go recursively through object properties and delete all properties with no, null, or empty string values
    for (const key in obj) {
        if (obj[key] && typeof obj[key] === "object") {
            DeleteEmptyKeys(obj[key]);
            //if object is now empty, delete it
            if (Object.keys(obj[key]).length === 0) {
                delete obj[key];
            }
        } else if (obj[key] === null || obj[key] === "") {
            delete obj[key];
        }
    }
}

function CloneOrdersNoDom(orders) {
    if (Array.isArray(orders)) {
        return orders
            .map(CloneOrdersNoDom)
            .filter(v => v !== undefined);
    }

    if (orders && typeof orders === "object") {
        const out = {};
        for (const k in orders) {
            if (k.endsWith("_cell") || k.endsWith("_element"))
                continue;
            if (k == "isNew" || k == "orderHovered" || k == "jobInfo" || k == "edited" || k == "pom_targetQtt")
                continue;
            if (k == "max_workshops" && orders[k] === 0)
                continue;
            const v = CloneOrdersNoDom(orders[k]);
            if (v !== undefined)
                out[k] = v;
        }
        return out;
    }

    return orders;
}

function ReloadCSS() {
    const links = document.getElementsByTagName('link');
    const timestamp = Date.now();

    for (let i = 0; i < links.length; i++) {
        const link = links[i];

        // Check if the link is a stylesheet
        if (link.rel === 'stylesheet') {
            let href = link.href.replace(/(\?.*)|(#.*)/g, ''); // Remove existing query/hash

            // Append the unique timestamp as a query parameter
            link.href = `${href}?v=${timestamp}`;
        }
    }
}


function CreateInputForOrders(onChangeCallback, orderObject, affectedProperty, conditionIndex = -1) {
    let input = document.createElement("input");
    input.type = "number";
    input.value = conditionIndex > -1 ? orderObject.item_conditions[conditionIndex].value : orderObject[affectedProperty];
    input.classList.add("inputNumber");

    input.setAttribute("orderId", orderObject.id);
    input.setAttribute("affectedProp", affectedProperty);
    input.setAttribute("conditionIndex", conditionIndex);

    PrepareInput(input, onChangeCallback);
    return input;
}

function PrepareInput(input, onChangeCallback) {
    input.addEventListener("focus", (e) => {
        e.target.select();
    });

    input.addEventListener("keydown", (e) => {
        if (e.key === " ") {
            e.preventDefault();
            const formElements = Array.from(document.querySelectorAll("input.inputNumber"));
            const currentIndex = formElements.indexOf(e.target);
            const nextIndex = (currentIndex + 1) % formElements.length;
            formElements[nextIndex].focus();
        }
    });
    input.addEventListener("mouseup", (e) => {
        e.stopPropagation();
    });

    if (onChangeCallback != null) {
        input.addEventListener("change", (e) => { onChangeCallback(e); });
        input.addEventListener("blur", (e) => { onChangeCallback(e); });
    }
}

function InputChangeCallback_PropertyValue(e) {
    var id = e.target.getAttribute("orderId");
    var order = GetOrderById(id);

    MarkEdited(order);
    var prop = e.target.getAttribute("affectedProp");

    if (prop == "pom_targetQtt") {
        SetOrderTargetQtt(order, parseInt(e.target.value));
    } else {
        order[prop] = parseInt(e.target.value);
        order[prop + "_cell"].childNodes[0].nodeValue = order[prop];
        if (prop == "amount_left") {
            if (order[prop] == 0)
                ToggleDeleteOrder(order);

            order.amount_total = order.amount_left;
        }
    }
}

function InputChangeCallback_ConditionValue(e) {
    var id = e.target.getAttribute("orderId");
    var order = GetOrderById(id);
    var condIndex = e.target.getAttribute("conditionIndex");

    MarkEdited(order);
    var condition = order.item_conditions[condIndex];
    condition.value = parseInt(e.target.value);
    condition.value_element.value = condition.value;
}

function MarkEdited(order) {
    order.edited = true;
    modificationsPending = true;
    var line = ordersTable.querySelector(`div[orderId='${order.id}']`);

    if (line)
        line.classList.add("edited");

    var outItem = GetJobItem(order.jobInfo);
    if (outItem)
        UpdateStockItemLine(outItem);

    UpdateConditionsContainer(order);

    if (config.toggleAutoSaveOrders)
        QueueOrdersSave(false);
}

function PauseAllTasks() {
    allOrdersPaused = !allOrdersPaused;
    const pauseAllBtn = document.getElementById("pauseAll");
    pauseAllBtn.classList.toggle("active", allOrdersPaused);

    orders.forEach(order => {
        if (allOrdersPaused) {
            PauseTask(order, PAUSECHANNEL_ALLSTASKS);
        } else {
            ResumeTask(order, PAUSECHANNEL_ALLSTASKS);
        }
    });
    UpdateOrdersTable();
}

function PauseAllTasksFrom(myOrder) {
    var index = orders.findIndex(o => o.id === myOrder.id);

    if (index === -1)
        return;

    var paused = IsTaskPaused(myOrder, PAUSECHANNEL_FROMTASK);

    for (let i = index; i < orders.length; i++) {
        let order = orders[i];
        if (paused) {
            ResumeTask(order, PAUSECHANNEL_FROMTASK);
        } else {
            PauseTask(order, PAUSECHANNEL_FROMTASK);
        }
    }
    UpdateOrdersTable();
}

function PauseTask(order, stopChannel = 0) {
    var pauseCondition = GetPauseCondition(stopChannel);

    order.item_conditions ??= [];

    if (order.item_conditions.findIndex(cond => cond.condition === pauseCondition.condition && cond.value === pauseCondition.value) === -1) {
        order.item_conditions.push(pauseCondition);
    }

    MarkEdited(order);
}

function ResumeTask(order, stopChannel = 0) {
    var pauseCondition = GetPauseCondition(stopChannel);

    order.item_conditions ??= [];
    order.item_conditions = order.item_conditions.filter(cond => !(cond.condition === pauseCondition.condition && cond.value === pauseCondition.value));

    MarkEdited(order);
}

function IsTaskPaused(order, stopChannel = 0) {
    var pauseCondition = GetPauseCondition(stopChannel);

    if (stopChannel === PAUSECHANNEL_ANY)
        return order.item_conditions.findIndex(cond => cond.condition === pauseCondition.condition && cond.value <= 0) !== -1;

    if (!order.item_conditions)
        return false;
    return order.item_conditions.findIndex(cond => cond.condition === pauseCondition.condition && cond.value === pauseCondition.value) !== -1;
}

function GetPauseCondition(stopChannel = 0) {
    return {
        condition: "LessThan",
        value: stopChannel - 10
    };
}

function Hide(elements) {
    elements.forEach(el => {
        el.classList.add("hidden");
    });
}

function Show(elements) {
    elements.forEach(el => {
        el.classList.remove("hidden");
    });
}


function OnRightClickOrEscape() {
    var stockMatPicker = $(".inventoryMaterialsPickerHost:not(.hidden)")[0];
    if (stockMatPicker) {
        var pickerInput = $("#inventoryMaterialsFilter")[0];
        if (pickerInput.value != "") {
            pickerInput.value = "";
            pickerInput.dispatchEvent(new Event("change"));
            return;
        }
        stockMatPicker.classList.add("hidden");
        ApplyInventoryMaterialFilters();
    }

    var conditionEditor = $(".conditionEditor:not(.hidden)")[0];
    if (conditionEditor) {
        CloseConditionEditor();
        return;
    }

    var orderEditor = $(".orderEditor:not(.hidden)")[0];
    if (orderEditor) {
        CloseOrderEditor();
        return;
    }

    $("#generalFilter")[0].value = "";
    $("#generalFilter")[0].dispatchEvent(new Event("change"));

}

function FilterChanged(search) {
    var timeSinceLastchange = Date.now() - lastFilterChange;
    if (timeSinceLastchange < 300) {
        //debounce
        if (filterDelayer)
            clearTimeout(filterDelayer);
        filterDelayer = setTimeout(() => { FilterChanged(search); }, 300 - timeSinceLastchange);
        return;
    }
    search = search.toLowerCase();
    generalFilter = search;

    if (search != '') {
        if (!forceAllItemsVisible) {
            forceAllItemsVisible = true;
            RefreshStocksFilter();
        }
    } else {
        if (forceAllItemsVisible) {
            forceAllItemsVisible = false;
            RefreshStocksFilter();
        }
    }

    FilterJobs();
    FilterItems();
    lastFilterChange = Date.now();
}


function FilterItems() {
    let search = generalFilter;
    var itemCells = $(".inventoryBody .cell[item]");

    itemCells.forEach(cell => {
        cell.classList.remove("forceShow");
        if (search == "") {
            cell.classList.remove("hidden");
        } else {
            cell.classList.add("hidden");
        }
    });

    var terms = search.toUpperCase().split(" ");
    terms.forEach(term => {
        term = term.trim();
        if (!term)
            return;
        itemCells.forEach(cell => {
            //var itemName = cell.getAttribute("item").toUpperCase();
            var itemName = cell.getAttribute("itemLabel").toUpperCase();
            if (itemName.indexOf(term) > -1) {
                cell.classList.remove("hidden");
                cell.classList.add("forceShow");
            }
        });
    });
}


function FilterJobs() {
    search = generalFilter;
    var orderLines = ordersTable.querySelectorAll(".orderRow");
    orderLines.forEach(line => {
        var jobCell = line.querySelector(".property.job");
        var jobName = jobCell ? jobCell.textContent.toLowerCase() : "";
        if (jobName.includes(search)) {
            line.classList.remove("hidden");
        } else {
            line.classList.add("hidden");
        }
    });
}


function SetAutoFill(input, sourceData, allowMultiples) {
    $(".autocompleteList").forEach(el => el.innerHTML = "");

    multiFill = allowMultiples;
    autoFillSource[input.getAttribute("id")] = sourceData;
    fuses[input.getAttribute("id")] = new Fuse(sourceData);

    if (currendFuseInput != null)
        currendFuseInput.removeEventListener("input", AutoFillFieldChangedEvent);

    currendFuseInput = input;
    currendFuseInput.addEventListener("input", AutoFillFieldChangedEvent);
}

function AutoFillFieldChangedEvent(event) {
    var input = event.target;
    AutoFillFieldChanged(input);
}

function AutoFillFieldChanged(input) {
    var id = input.getAttribute("id");
    var data = autoFillSource[input.getAttribute("id")];
    var tags = input.value.split(",");
    var results = fuses[id].search(tags[tags.length - 1].trim());
    var list = input.nextElementSibling;
    list.innerHTML = "";
    results.slice(0, 10).forEach(result => {
        var line = document.createElement("div");
        line.classList.add("autocompleteItem");
        line.textContent = result.item;
        list.appendChild(line);
        line.addEventListener("mousedown", (e) => {
            e.stopPropagation();
            if (e.button != 0)
                return;

            if (multiFill && input.value.trim() != "") {
                input.value += "," + result.item;
            } else {
                input.value = result.item;
            }
            list.innerHTML = "";
            var event = new Event("change");
            input.dispatchEvent(event);
        });
    });
    list.style.display = results.length > 0 ? "block" : "none";


}

function CloseAutoFill(input) {
    var sourceData = autoFillSource[input.getAttribute("id")];

    var list = input.nextElementSibling;
    if (input.getAttribute("pickOnBlur")) {
        var firstItem = list.querySelector(".autocompleteItem");
        if (firstItem) {
            if (multiFill && input.value.trim() != "") {
                input.value += "," + firstItem.textContent;
            } else {
                input.value = firstItem.textContent;
            }
        }
    }

    if (input.getAttribute("tagsMode")) {
        var tags = input.value.split(",");
        tags = tags.map(t => t.trim());
        tags = tags.filter(t => t !== "");
        tags = [...new Set(tags)];

        var validTags = [];

        if (tags) {
            tags.forEach(tag => {
                if (sourceData.findIndex(v => v == tag) != -1) {
                    validTags.push(tag);
                    if (!multiFill)
                        return;
                }
            });
        }

        input.value = validTags.join(",");
    }
    list.innerHTML = "";
    var event = new Event("change");
    input.dispatchEvent(event);

}


function ConditionEdited(elem) {
    var order = openedConditionsOrder;
    var condition = order.item_conditions[openedConditionsIndex];
    var property = elem.getAttribute("property");

    if (property == "flags") {
        if (elem.value != "") {
            var elems = elem.value.split(",");
            elems = elems.map(e => e.trim());
            condition[property] = elems;
        }
    } else if (property == "value") {
        condition[property] = parseInt(elem.value);
    } else {
        condition[property] = elem.value;
    }

    MarkEdited(order);
}

function ConditionEditHover(e) {
    var order = GetOrderFromElement(e.currentTarget);

    hoveredConditionsOrder = order;
    UpdateConditionsContainer(order);
}

function OpenConditionEditor(order, conditionIndex) {
    if (conditionJustCopied) {
        conditionJustCopied = false;
        return;
    }

    condition = order.item_conditions[conditionIndex];
    if (!condition)
        return;
    openedConditionsOrder = order;
    openedConditionsIndex = conditionIndex;
    var editor = $(".conditionEditor")[0];

    $("#conditionEditorTitle")[0].textContent = GetOrderJobLabel(order) + " : " + GetOrderMaterialLabel(order);

    editor.querySelector("#itemType").value = condition.item_subtype ? condition.item_subtype : condition.item_type ?? "";
    editor.querySelector("#itemFlag").value = condition.flags ? condition.flags.join(",") : "";
    editor.querySelector("#itemMaterial").value = condition.material ? condition.material : "";
    editor.querySelector("#itemReactable").value = condition.reaction_product ? condition.reaction_product : "";
    editor.querySelector("#operator").value = condition.condition;
    editor.querySelector("#conditionValue").value = condition.value;
    Show($(".conditionEditor"));
}

function CloseConditionEditor() {
    $(".conditionEditor")[0].classList.add("hidden");

    if (openedConditionsOrder != null)
        UpdateOrdersTable();

    openedConditionsOrder = null;
}

function CreateNewOrder(fromJob = null, orderToDuplicate = null) {
    var newOrder;
    editedOrder = null;
    editedOrderIsNew = true;

    if (orderToDuplicate != null) {
        //clone current hover order
        newOrder = JSON.parse(JSON.stringify(orderToDuplicate));
        newOrder.isNew = true;
        newOrder.edited = true;
        newOrder.amount_left = newOrder.amount_total;
    } else {
        newOrder = {
            job: fromJob?.jobTypeName,
            amount_left: 10,
            amount_total: 10,
            material_category: [],
            material: "",
            frequency: "OneTime",
            max_workshops: 0,
            is_active: false,
            is_validated: false,
            isNew: true,
            edited: true,
        }

        SetupOrderFromJob(newOrder, fromJob)
    }

    return newOrder;
}

function AddNewOrder(newOrder, afterOrder = null) {
    if (afterOrder) {
        //insert after hovered order (for duplications)
        var index = orders.findIndex(o => o.id === afterOrder.id);
        orders.splice(index + 1, 0, newOrder);
    } else {
        orders.push(newOrder);
    }

    newOrder.id = Math.max(...orders.filter(o => o.id != null).map(o => o.id), 10) + 1;
    if (isNaN(newOrder.id))
        newOrder.id = orders.length + 1;

    MarkEdited(newOrder);
    UpdateOrdersTable();
    return newOrder
}

async function GetConfig() {

    await CallGetSetConfig();

    var mustSave = false;
    if (config.selectedStocksMaterialsCols == undefined) {
        config.selectedStocksMaterialsCols = [
            'ALL', 'WOOD', 'STONE', 'LEATHER', 'INORGANIC:BRONZE', 'INORGANIC:COPPER', 'INORGANIC:IRON', 'INORGANIC:STEEL'
        ];
        mustSave = true;
    }

    if (config.minResourcesForSmelting == undefined) {
        config.minResourcesForSmelting = 5;
        mustSave = true;
    }

    if (!config.selectedStocksMaterialsCols.includes("ALL")) {
        config.selectedStocksMaterialsCols.unshift("ALL");
        mustSave = true;
    }

    if (config.selectedStocksMaterialsCols.length > MAX_MATERIALS_COLS) {
        config.selectedStocksMaterialsCols = config.selectedStocksMaterialsCols.slice(0, MAX_MATERIALS_COLS);
    }

    if (mustSave)
        CallGetSetConfig(config);

    return true;
}

async function SaveConfig() {
    await CallGetSetConfig(config);
    return config;
}


async function CallGetSetConfig(newConfig) {
    config = await window.api.GetSetConfig(newConfig);

    Object.entries(config).forEach((entry) => {
        let key = entry[0];
        value = entry[1];
        $("input[id='config_" + key + "']").forEach(input => {
            if (input.type == "checkbox") {
                input.checked = value == 1;
            } else {
                input.value = value;
            }
        });
    });
}

async function ToggleOption(name, noSwitch = false) {
    name = name.charAt(0).toUpperCase() + name.slice(1);
    name = "toggle" + name;

    await GetConfig();

    if (!config[name]) {
        config[name] = true;
    } else if (!noSwitch) {
        config[name] = !config[name];
    }

    if (CheckError(config))
        return;


    if (name == "toggleAutoReadOrders" && config.toggleAutoReadOrders)
        mustReadOrders = true

    if (name == "toggleAutoSaveOrders" && config.toggleAutoSaveOrders)
        QueueOrdersSave(true);

    await SaveConfig();

    ApplyConfigClasses()
}

async function ApplyConfigClasses() {
    //remove all toggle classes from body
    var togClasses = Array.from($("body")[0].classList).filter(c => c.startsWith("toggle_"));
    togClasses.forEach(c => $("body")[0].classList.remove(c));

    Object.keys(config).forEach(optionName => {
        if (optionName.startsWith("toggle"))
            $("body")[0].classList.toggle(optionName, config[optionName] === true);
    });

    await CycleSizeMode(true);
}

function ToggleAutoRead() {
    config.autoReadWorkOrders = !config.autoReadWorkOrders;
    const autoReadBtn = document.getElementById("autoRead");
    autoReadBtn.classList.toggle("active", config.autoReadWorkOrders);
}



function DeleteOrder(order) {
    order.deleted = false;
    ToggleDeleteOrder(order);
}

function ToggleDeleteOrder(order, skipUpdate = false) {
    if (!order)
        return;

    if (order.deleted) {
        //remove property
        delete order.deleted;
    }
    else {
        if (order.isNew) {
            //remove from orders array
            orders = orders.filter(o => o.id !== order.id);
        } else {
            order.deleted = true;
        }
    }
    MarkEdited(order);

    if (!skipUpdate)
        UpdateOrdersTable();
}


function SetTab(tab) {
    tab = tab.charAt(0).toUpperCase() + tab.slice(1);
    ToggleOption("tab" + tab);
}

async function CycleSizeMode(noChange) {
    if (previousSizeMode != undefined)
        $("body")[0].classList.remove("sizemode_" + previousSizeMode);

    await GetConfig();
    if (!noChange) {
        config.sizeMode++;
        if (config.sizeMode > 3)
            config.sizeMode = 0;
        SaveConfig();
    }

    $("body")[0].classList.add("sizemode_" + config.sizeMode);
    previousSizeMode = config.sizeMode;
}

function CreateRowButton(classes, text, callback) {
    var buttonHost = document.createElement("button");
    buttonHost.classList.add("rowTool");
    classes.forEach(c => buttonHost.classList.add(c));

    var button = document.createElement("div");
    var span = document.createElement("span");
    span.textContent = text;
    button.appendChild(span);
    buttonHost.appendChild(button);

    buttonHost.addEventListener("mouseup", (e) => {
        if (e.button != 0)
            return;
        e.stopPropagation();
        callback(e)
    });

    return buttonHost;
}


function GetOrderMaterialName(order) {
    return order.material ?? order.material_category?.toString() ?? "";
}

function GetOrderMaterialLabel(order) {
    var text = "";
    if (order.material_category != null) {
        text = order.material_category.toString();
    } else {
        text = order.material ?? "";
    }
    text = text.toLocaleLowerCase();
    text = text.replace("native_", "");
    text = text.replace("inorganic:", "");
    text = text.replace("inorganic", "Rock (Inorganic)");

    return text;
}



function ChangeItemStockTarget(e) {

    var input = e.target;
    var qttDesired = parseInt(input.value);
    var cell = input.closest(".editable");
    var jobId = cell.getAttribute("jobId");

    cell.classList.add("updating");
    cell.setAttribute("totalWant", qttDesired);

    var job = jobs[jobId];
    if (!job) {
        cl("Unknown job: " + jobId);
        return;
    }
    SetJobTargetQtt(job, qttDesired);
}

function SetJobTargetQtt(job, qttDesired) {
    var matchingOrders = FindOrdersForJob(job);

    var ord;
    if (matchingOrders.length > 0) {

        ord = matchingOrders[0];

        //delete extra orders
        for (var i = 1; i < matchingOrders.length; i++) {
            //remove other matching orders
            DeleteOrder(matchingOrders[i]);
        }

    } else {
        if (qttDesired <= 0)
            return;

        ord = CreateNewOrder(job);
        AddNewOrder(ord);
    }

    SetOrderTargetQtt(ord, qttDesired);
}


function SetupOrderFromJob(order, job) {
    if (job == null) {
        Trace("SetupOrderFromJob: job is null");
        return;
    }

    order.jobInfo = job;
    order.job = job.jobTypeName;

    if (job.material_category)
        order.material_category = job.material_category;

    if (job.material)
        order.material = job.material;

    if (job.reactionName)
        order.reaction = job.reactionName;

    if (job.jobTypeName == "PrepareMeal")
        order.meal_ingredients = parseInt(job.mat_type);

    if (job.item_typeName)
        order.item_subtype = job.item_typeName;

    /*
    if (item && item.subtypeName)
        newOrder.item_subtype = item.subtypeName;
    */

    order.item_conditions = [];
    job.io.in.forEach(inp => {
        var condition = {
            "condition": "GreaterThan",
            "value": 0
        }

        Object.keys(inp).forEach(key => {
            if (key == "item") {
                var item = inp[key];
                if (item) {
                    if (item.typeName)
                        condition.item_type = SometimesNoS(item.typeName);
                    if (item.subtypeName)
                        condition.item_subtype = item.subtypeName;
                    if (item.flags)
                        condition.flags = item.flags;
                }
                return;
            }

            if (key == "quantity") {
                return;
            } else {
                condition[key] = inp[key];
            }
        });

        if (itemWithDimensions[condition.item_type] > 0)
            condition.min_dimension = itemWithDimensions[condition.item_type];

        order.item_conditions.push(condition);
    });

    if (job.isCrafts) {
        craftTypes.forEach(craftType => {
            var condition = {
                "condition": "LessThan",
                "item_type": craftType.toUpperCase(),
                "value": 0,
            }
            if (job.material)
                condition.material = job.material;
            if (job.material_category && job.material_category.length > 0)
                condition.material_category = job.material_category;
            order.item_conditions.push(condition);
        });
    } else {
        job.io.out.forEach(outp => {
            var condition = {
                "condition": "LessThan",
                "value": 0
            }
            var item = outp.item;
            if (item.typeName)
                condition.item_type = SometimesNoS(item.typeName);

            //condition.item_type"] = NoS(item.typeName.toUpperCase());
            if (item.subtypeName)
                condition.item_subtype = item.subtypeName;
            if (item.material) {
                condition.material = item.material;
            } else if (outp.material) {
                condition.material = outp.material;
            } else if (job.material) {
                condition.material = job.material;
            }

            if (condition.item_type == "BLOCKS" && job.material_category?.includes("wood")) {
                condition.flags ??= [];
                condition.flags.push("plant");
            }

            if (item.container_capacity > 0) {
                condition.flags ??= [];
                condition.flags.push("empty");
            }
            if (condition.item_type == "FOOD") {
                condition.flags ??= [];
                condition.flags.push("unrotten");
                condition.value = GetOrderBatchSize();
            }

            //cl(condition)

            order.item_conditions.push(condition);
        });
    }


    /*
    if (job.jobTypeName == "PrepareMeal") {
        condition = {
            "condition": "LessThan",
            "item_type": "FOOD",
            "value": GetOrderBatchSize(),
            "flags": ["unrotten"]
        }
        order.item_conditions.push(condition);
    }
        */

    return order
}


function GetOrderBatchSize() {
    if (!Number.isInteger(parseInt(config.orderBatchSize)) || config.orderBatchSize < 1) {
        config.orderBatchSize = 3;
        SaveConfig();
    }
    return parseInt(config.orderBatchSize);
}

function GetDefaultGraphMax() {
    if (!Number.isInteger(parseInt(config.defaultGraphMax)) || config.defaultGraphMax < 1) {
        config.defaultGraphMax = 100;
        SaveConfig();
    }
    return parseInt(config.defaultGraphMax);
}

function FindOrdersForJob(job) {
    if (!job)
        return [];

    return orders.filter(o => {
        if (o.job != job.jobTypeName)
            return false;

        if (!OrderIsRepeating(o))
            return false;

        if ((o.reaction || '') != (job.reactionName || ''))
            return false;

        if (job.item_subtype > -1 && (o.item_subtype ?? '') != (job.item_typeName ?? ''))
            return false;

        if (o.material_category != null && o.material_category.length > 0) {
            if (!job.material_category || job.material_category.length == 0 || (o.material_category[0] != job.material_category[0]))
                return false;
        }

        if (o.meal_ingredients > 0 && job.mat_type != o.meal_ingredients)
            return false;

        if (o.material != null && o.material != job.material)
            return false;

        return true;
    });
}

function CleanupDuplicateOrders(showToast = true) {
    var totalMerges = 0;
    Object.values(orders).forEach(orderA => {
        if (orderA.deleted)
            return;

        let targetCount = orderA.amount_total;
        let leftCount = orderA.amount_left;
        let mergeds = [];

        Object.values(orders).forEach(orderB => {
            if (orderB.deleted)
                return;

            if (orderA.id == orderB.id)
                return;

            if (orderA.job != orderB.job
                || orderA.material != orderB.material
                || (orderA.material_category && orderB.material_category && orderA.material_category.toString() != orderB.material_category.toString())
                || orderA.item_type != orderB.item_type
                || orderA.item_subtype != orderB.item_subtype
                || orderA.reaction != orderB.reaction)
                return;

            targetCount += orderB.amount_total;
            leftCount += orderB.amount_left;
            totalMerges++;
            ToggleDeleteOrder(orderB, true);
            mergeds.push(orderB.id)
        });

        if (orderA.amount_total != targetCount || orderA.amount_left != leftCount) {
            if (OrderIsRepeating(orderA)) {
                orderA.amount_left = Math.min(orderA.amount_left, GetOrderBatchSize());
                orderA.amount_total = Math.min(orderA.amount_total, GetOrderBatchSize());
            } else {
                orderA.amount_total = Math.ceil(targetCount / (totalMerges + 1));
                orderA.amount_left = Math.ceil(leftCount / (totalMerges + 1));
            }
            MarkEdited(orderA);
        }

        if (mergeds.length > 0) {
            Trace("Merged " + mergeds.length + " '" + orderA.id + "' order(s)");
        }
    });

    if (totalMerges > 0) {
        if (showToast)
            Toast("Merged " + totalMerges + " duplicate(s)");
        UpdateOrdersTable();
    } else {
        if (showToast)
            Toast("No duplicate orders found");
    }
}


function StockEntryLabel(itemName, noGroup = false) {
    var item = gm.items[itemName]
    if (!item) {
        cl("Unknown item: " + itemName);
        return itemName;
    }

    let labelName = itemName.split("!").last();
    labelName = item.name.toUpperCase();
    labelName = labelName.replace("ITEM_", "");
    labelName = labelName.replace("WEAPON_", "");
    labelName = labelName.replace("TOOL_", "");
    labelName = labelName.replace("AMMO_", "");
    labelName = labelName.replace("ARMOR_", "");
    labelName = labelName.replace("HELM_", "");
    labelName = labelName.replace("PANTS_", "");
    labelName = labelName.replace("SHIELD_", "");
    labelName = labelName.replace("SHOES_", "");
    labelName = labelName.replace("SIEGEAMMO_", "");
    labelName = labelName.replace(/_/g, " ");
    labelName = labelName.charAt(0).toUpperCase() + labelName.slice(1).toLowerCase();

    if (labelName == "Goblet")
        labelName = "Goblet / Mug / Cup";

    if (labelName == "Biscuits")
        labelName = "Food (easy) / Biscuits";

    if (labelName == "Stew")
        labelName = "Food (fine) / Stew";

    if (labelName == "Roast")
        labelName = "Food (lavish) / Roast";

    if (labelName == "Plant growth")
        labelName = "Plant growth / Fruit";

    if (labelName == "Box")
        labelName = "Box / Chest / Coffers";

    if (labelName == "Chair")
        labelName = "Chair / Throne"

    if (labelName == "Armorstand")
        labelName = "Armor stand"

    if (labelName == "Weaponrack")
        labelName = "Weapon rack"

    if (labelName == "Chain")
        labelName = "Chain / Rope"

    if (labelName == "Corpsepiece")
        labelName = "Corpse part"

    if (labelName == "Flask")
        labelName = "Flask / Waterskin"

    if (labelName == "Rough")
        labelName = "Gem (rough)"

    if (labelName == "Trapparts")
        labelName = "Mechanism / Trap part"

    if (labelName == "Trapparts")
        labelName = "Mechanism / Trap part"

    if (labelName == "Wood")
        labelName = "Wood log"

    if (!item.isTypeOnly && !noGroup) {
        let groupName = ItemGroupName(item);
        return (groupName != "" ? "<b>" + groupName + "</b>" : "") + labelName;
    } else {
        return labelName;
    }

}

function ItemGroupName(item) {
    let name = item.typeName;
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
}


function ItemNameWithoutPrefix(itemName) {
    itemName = itemName.replace("ITEM_", "");
    itemName = itemName.replace(/_/g, " ");
    return itemName;
}

function FinalizeJobsData() {

    sortedJobTypes = [];
    Object.values(gm.job_type).forEach(jobType => {
        sortedJobTypes.push(jobType);
    });
    sortedJobTypes.sort();

    itemJob = []
    jobSortedNames = []
    jobsMaterials = [...materialsGroups];
    var i = 0;
    jobs.forEach(job => {
        CompleteJobInfos(job);

        jobSortedNames.push(job.name);

        var mat = GetJobMaterial(job);
        RegisterRawMaterial(mat, "job");

        job.index = i;
        i++;
    });
    jobSortedNames.sort();
    ligniteCokeJob = jobs.find(j => j.reactionName == "LIGNITE_TO_COKE");
    bituminousToCokeJob = jobs.find(j => j.reactionName == "BITUMINOUS_COAL_TO_COKE");
    brewFromFruit = jobs.find(j => j.reactionName == "BREW_DRINK_FROM_PLANT");
    brewFromPlants = jobs.find(j => j.reactionName == "BREW_DRINK_FROM_PLANT");

    //CheckJobsValidity();
}

async function TryReadStocks() {
    if (!config.toggleAutoReadStocks && !mustReadStocks)
        return;

    if (readingStocks)
        return;

    mustReadStocks = false;
    readingStocks = true;
    tempStocks = {};

    let ok = false;

    let toast;
    if (showReadStockToast)
        toast = Toast("Reading stocks...", true);
    showReadStockToast = false;

    while (!ok) {
        ok = await ReadStocksBatch();
        if (!ok)
            await pause(150);
    }
    ClearToast(toast);
    await pause(500);
    readingStocks = false;
}

async function ReadStocksBatch() {
    data = await window.api.GetStocks()

    if (data == null)
        return false;

    if (CheckError(data, "Stocks")) {
        await pause(1500);
        return false;
    }
    ClosePopInfoWaiting("Stocks");

    Object.keys(data.stocks).forEach(key => {
        var itemName = key.split("@")[0];
        var matName = key.split("@")[1];
        var quantity = data.stocks[key];
        tempStocks[itemName] ??= {};
        tempStocks[itemName][matName] = quantity;

        if (TypeIsCraft(itemName)) {
            tempStocks["CRAFTS"] ??= {};
            tempStocks["CRAFTS"][matName] = quantity;
        }
    });

    if (data.completed) {
        Trace("Stocks updated.");

        if (pleaseWait) {
            pleaseWait = false;
            Toast("<b>Ready</b>");
            ClearToast(initToast);
            $(".pleaseWait")[0].classList.add("hidden");
        }
        FinalizeStocksData();
        FillStocksTable();
        return true;
    }

    return false;
}

function ResetStocksDisplay() {
    emptyCellsCreated = false;
    ClearStockTable();
}

function FinalizeStocksData() {
    stockArray = []
    stocksMaterials = [...materialsGroups];

    for (const item in tempStocks)
        stockArray.push({ item: item, mats: tempStocks[item] });

    stockArray.sort((a, b) => {
        return ItemNameWithoutPrefix(a.item).localeCompare(ItemNameWithoutPrefix(b.item));
    });

    stocks = {};
    stockArray.forEach(obj => {
        ProcessStockLine(obj.item, obj.mats);
    });

    gm.craftableMaterials = Object.keys(gm.materials).filter(mat => {
        return CraftableMaterialName(mat) != "";
    });

    if (oldStocks == null)
        oldStocks = {};

    //count regrouped materials qtt for each item (-> 12 Metal Axes, -> 8 Wooden Door)
    Object.keys(stocks).forEach(item => {
        materialsGroups.forEach(group => {
            stocks[item][group] = 0;
        });

        Object.keys(stocks[item]).forEach(itemMat => {
            if (materialsGroups.indexOf(itemMat) != -1)
                return;

            var itemMaterialGroups = GetMaterialTypes(itemMat);

            qtt = stocks[item][itemMat];
            stocks[item]["ALL"] += stocks[item][itemMat];
            itemMaterialGroups.forEach(groupName => {
                stocks[item][groupName] += qtt;
            });
        });
    });


    var pool = GetStockPool();

    //manages cells flashing on stock changes
    pool.forEach(itemName => {
        if (!itemName)
            return;

        stock = stocks[itemName];
        if (oldStocks[itemName] == null)
            oldStocks[itemName] = {};

        var stock = stocks[itemName] ?? [];

        var stockKeys = Object.keys(stock)
        if (stockKeys.length > 0) {
            stockKeys.forEach(mat => {
                if (oldStocks[itemName][mat] == null)
                    oldStocks[itemName][mat] = 0;

                var diff = stock[mat] - oldStocks[itemName][mat];
                if (diff != 0) {
                    StockCellChanged(itemName, mat, diff);
                    itemMatStockChanges.push(itemName + "_" + mat);
                }
                oldStocks[itemName][mat] = stock[mat];

                if (mat == "STONE")
                    mat = "INORGANIC"
            });
        }
    });

    let graphRate = parseInt(GetGraphsRate());
    gm.year = data.year;
    gm.yearTick = data.yearTick;
    gm.dayNumber = data.year * 336 + Math.floor(gm.yearTick / graphRate);
    gm.totalTicks = gm.year * 336 * 1200 + gm.yearTick;

    if (nextGraphSave <= gm.totalTicks) {
        Object.keys(stocks).forEach(itemName => {
            Object.keys(stocks[itemName]).forEach(mat => {
                let key = itemName + "@" + mat;
                config.graphs = config.graphs ?? {};
                if (Object.keys(config.graphs).includes(key)) {
                    stocksHistory[key] = stocksHistory[key] ?? [];
                    stocksHistory[key].push(stocks[itemName][mat]);
                }
            });
        });
        nextGraphSave = gm.totalTicks + graphRate;
        RedrawGraphs();
    }

    itemsWithCapacity = Object.values(gm.items).filter(i => i.container_capacity > 0).map(i => i.subtypeName != "" ? i.subtypeName : i.typeName);
}

function ProcessStockLine(itemKey, matsQtts) {

    if (!stocks[itemKey])
        stocks[itemKey] = {}

    Object.keys(matsQtts).forEach(mat => {

        RegisterRawMaterial(mat, "stock");

        if (stocks[itemKey][mat] == null)
            stocks[itemKey][mat] = 0;

        if (stocks[itemKey]["ALL"] == null)
            stocks[itemKey]["ALL"] = 0;

        let cmat = CraftableMaterialName(mat);

        stock = stocks[itemKey];
        qtt = matsQtts[mat];
        stock[cmat] = qtt;
        stock["ALL"] += qtt;

    });
}


function FillStocksTable() {

    $(".inventoryTable")[0].style.display = "none"

    var itemsPool = GetStockPool();
    itemsPool.forEach(itemName => {
        let item = gm.items[itemName];
        if (!item) {
            cl("Unknown stock item: " + itemName);
            return;
        }
        UpdateStockItemLine(item);
    })

    $(".inventoryTable")[0].style.display = "flex"

    ApplyInventoryMaterialFilters();
    UpdateFavoriteItemsButtons();

    CheckSmeltingJobs();
}

function UpdateStockItemLine(item) {
    CreateStockCell(item, "ALL");

    var mats = config.selectedStocksMaterialsCols;
    mats.forEach(material => {
        CreateStockCell(item, material);
    });
}


function CreateStockCell(item, material) {
    if (material == "")
        return;

    var itemName = GetItemTypeAndSubName(item);
    if (itemName == "")
        return;

    var itemStockKey = itemName;
    if (itemStockKey.includes("!")) {
        itemStockKey = NoS(itemStockKey.split("!")[0]) + "!" + itemStockKey.split("!")[1]
    }

    var totalStockWant = (stocks[itemStockKey]?.["ALL"] > 0 ? 1 : 0) + GetWantedProduction(item, "ALL");
    var buildable = itemHasJob[itemName] ? 1 : 0;
    //cl("Creating stock cell for " + stockEntry + " / " + material + " (totalWant: " + totalStockWant + ", buildable: " + buildable + ")");

    //side header
    if (itemName == null || material == null || itemName == undefined)
        console.log("QUOI LA BAISE!?");

    var myLabel = stockCellsLabels[itemName];
    if (!myLabel) {
        myLabel = document.createElement("div");
        myLabel.classList.add("cell", "itemType", "gameButton");
        var label = StockEntryLabel(itemName);
        myLabel.innerHTML = "<fav onclick='ToggleFavoriteItem(\"" + itemName + "\")'>★</fav>" + label;
        myLabel.setAttribute("item", itemName.toUpperCase());
        myLabel.setAttribute("itemLabel", label);

        /*
        let button = document.createElement("button");
        let span = document.createElement("span");
        span.textContent = "/";
        button.appendChild(span);
        button.classList.add("rowTool", "graphButton");
        button.addEventListener("mouseup", (e) => {
            e.stopPropagation();
            ToggleDisplayedGraph(item);
        });
        */
        stockCellsLabels[itemName] = myLabel;
        sideA.appendChild(myLabel);
    }
    myLabel.setAttribute("totalStockWant", totalStockWant)
    myLabel.setAttribute("buildable", buildable)


    var tableHeader = $(".inventoryTableHeader")[0];
    var header = stockCellsHeaders[material];
    var index = config.selectedStocksMaterialsCols.indexOf(material)
    if (!header) {
        header = document.createElement("div");
        header.classList.add("cell", "header", "gameButtonL", "inventoryCol");
        header.setAttribute("material", material);

        if (materialsGroups.indexOf(material) != -1)
            header.setAttribute("mainCat", 1);

        header.innerHTML = "<div title=\"" + DisplayableMaterialName(material, 2) + "\">" + DisplayableMaterialName(material, 1) + "</div>";
        inventoryStaticHeader.appendChild(header);

        tableHeader.appendChild(header);
        stockCellsHeaders[material] = header;
    }
    header.style.order = index;

    var myMatCol = stockMatCols[material];
    //mat col
    if (!myMatCol) {
        myMatCol = document.createElement("div");
        myMatCol.classList.add("inventoryCol");
        myMatCol.setAttribute("material", material);
        sideB.appendChild(myMatCol);
        stockMatCols[material] = myMatCol;
    }
    myMatCol.style.order = config.selectedStocksMaterialsCols.indexOf(material);

    var matCell = stockCells[material + "_" + itemName];
    if (!matCell) {
        matCell = document.createElement("div");
        matCell.classList.add("cell", "editable");
        matCell.setAttribute("item", itemName);
        matCell.setAttribute("itemLabel", StockEntryLabel(itemName));
        var stockDiv = document.createElement("div");
        stockDiv.classList.add("stock");
        stockDiv.title = "Current stock quantity";
        let graphKey = itemName + "@" + material
        var key = itemName + "/" + (material == "STONE" ? "INORGANIC" : material);

        stockDiv.classList.toggle("graphed", Object.keys(config.graphs).includes(graphKey));
        stockDiv.addEventListener("click", (e) => {
            const k = key;
            e.stopPropagation();
            cl(itemJob[k] ? GetOrderTargetQtt(FindOrdersForJob(itemJob[k])[0]) : null);
            ToggleDisplayGraph(graphKey, null);
        });

        if (!itemJob[key]) {
            //cl("Missing job for " + key);
        }

        matCell.classList.toggle("hasJob", false);
        if (itemJob[key]) {
            matCell.classList.toggle("hasJob", true);
            matCell.setAttribute("jobId", itemJob[key] != null ? itemJob[key].index : "")
            AddInventoryCellInput(matCell, itemName, material, ChangeItemStockTarget);
            myMatCol.classList.add("colHasJob");
            $(".cell.inventoryCol.header[material='" + material + "']")[0].classList.add("colHasJob");
        }

        matCell.appendChild(stockDiv);
        myMatCol.appendChild(matCell);
        stockCells[material + "_" + itemName] = matCell;
    }

    var input = matCell.querySelector("input.wanted");
    //update input value unless its being edited
    var wanted = GetWantedProduction(item, material);
    if (input && document.activeElement != input)
        input.value = wanted;

    var stocked = 0;
    if (stocks[itemStockKey] && stocks[itemStockKey][material])
        stocked = stocks[itemStockKey][material];

    matCell.setAttribute("stockWant", stocked + wanted);
    matCell.setAttribute("want", wanted);
    matCell.setAttribute("totalStockWant", totalStockWant);
    matCell.setAttribute("buildable", buildable);

    var stockDiv = matCell.querySelector("div.stock");
    stockDiv.textContent = GetKiloValue(stocked);
    if (stocked == 0) {
        stockDiv.classList.add("empty");
    } else {
        stockDiv.classList.remove("empty");
    }

    return matCell;
}

function AddInventoryCellInput(cell, itemName, mat, onChangeCallback) {
    input = document.createElement("input");
    input.type = "number";
    input.classList.add("inputNumber", "wanted");
    input.setAttribute("itemType", itemName);
    input.setAttribute("material", mat);
    input.title = "Desired quantity in stocks - affects productions orders";
    PrepareInput(input, onChangeCallback);
    cell.appendChild(input);
}

function StockCellChanged(itemName, matName, diff) {
    var cell = stockCells[matName + "_" + itemName];
    if (!cell) {
        return;
    }

    if (diff > 0) {
        cell.classList.add("popUp");
    } else if (diff < 0) {
        cell.classList.add("popDown");
    }

    setTimeout(() => {
        const c = cell;
        c.classList.remove("popUp");
        c.classList.remove("popDown");
    }, 100);
}



function CloseMaterialsPicker() {
    $(".inventoryMaterialsPickerHost ")[0].classList.add("hidden");
    UpdateInventoryMaterialsPicker();
    ApplyInventoryMaterialFilters()
    RefreshStocksFilter();
}

function OpenMaterialsPicker() {
    UpdateInventoryMaterialsPicker();
    $(".inventoryMaterialsPickerHost ")[0].classList.remove("hidden");
    $(".inventoryMaterialsPickerHost input")[0].value = ''
    $(".inventoryMaterialsPickerHost input")[0].focus();

}

function UpdateInventoryMaterialsPicker() {
    var pickerList = $(".inventoryMaterialsPicker .materialsList")[0];

    var materialOptions = GetDisplaybaleMaterialsPool();

    materialOptions.forEach(mat => {
        var option = pickerList.querySelector("button.materialOption[material='" + mat + "']");
        if (!option) {
            option = document.createElement("button");
            option.classList.add("materialOption", "gameButton");
            option.setAttribute("material", mat);
            option.addEventListener("mouseup", (e) => {
                e.stopPropagation();
                if (e.button == 0)
                    ToggleInventoryMaterialSelected(e.currentTarget.getAttribute("material"));
            });

            var labelPreDiv = document.createElement("div");
            var labelDiv = document.createElement("div");
            labelDiv.classList.add("label");
            labelDiv.innerHTML = DisplayableMaterialName(mat, 1);
            labelDiv.setAttribute("title", DisplayableMaterialName(mat, 3));
            labelPreDiv.appendChild(labelDiv);

            option.appendChild(labelPreDiv);

            var mainCat = materialsGroups.indexOf(mat);
            option.setAttribute("maincat", mainCat);

            var types = GetMaterialTypes(mat);
            var order = 10000;
            types.forEach(matGroup => {
                var matGroup = materialsGroups.indexOf(matGroup);
                if (matGroup > -1 && matGroup < order)
                    order = matGroup;
            });

            option.setAttribute("groupOrder", order);

            pickerList.appendChild(option);
        }

        if (config.selectedStocksMaterialsCols.includes(mat)) {
            option.classList.add("selected");
        } else {
            option.classList.remove("selected");
        }
    });

    allOptions = Array.from(pickerList.querySelectorAll("button.materialOption"));

    allOptions.forEach(option => {
        var mat = option.getAttribute("material");
        if (materialOptions.indexOf(mat) == -1) {
            //remove option
            option.remove();
            return;
        }
    });

    SortInventoryMaterialPicker();
}

function ToggleInventoryMaterialSelected(mat, noBuild) {
    var option = $(".inventoryMaterialsPicker .materialOption[material='" + mat + "']")[0];
    var change = false;
    if (config.selectedStocksMaterialsCols.indexOf(mat) == -1) {
        if (config.selectedStocksMaterialsCols.length >= MAX_MATERIALS_COLS) {
            return;
        } else {
            config.selectedStocksMaterialsCols.push(mat);
            change = true;
            if (option)
                option.classList.add("selected");
        }
    } else {
        if (mat != "ALL") {
            config.selectedStocksMaterialsCols = config.selectedStocksMaterialsCols.filter(m => m != mat);
            change = true;
            if (option)
                option.classList.remove("selected");
        }
    }

    if (change && !noBuild) {
        SaveConfig();
        SortInventoryMaterialPicker();
    }
}

function SetMaterialSelectedState(mat, selected) {
    if (mat == "ALL")
        return;

    if (selected) {
        config.selectedStocksMaterialsCols.push(mat);
    } else {
        config.selectedStocksMaterialsCols = config.selectedStocksMaterialsCols.filter(m => m != mat);
    }

    config.selectedStocksMaterialsCols = [...new Set(config.selectedStocksMaterialsCols)];
    SaveConfig();
}

function ApplyInventoryMaterialFilters() {
    $(".inventoryCol").forEach(col => {
        var mat = col.getAttribute("material");
        if (config.selectedStocksMaterialsCols.includes(mat)) {
            col.classList.remove("hidden");
        } else {
            col.classList.add("hidden");
        }
    });
    $(".inventoryTableHeader .inventoryCell.header").forEach(cell => {
        var mat = cell.getAttribute("material");
        if (config.selectedStocksMaterialsCols.includes(mat)) {
            cell.classList.remove("hidden");
        } else {
            cell.classList.add("hidden");
        }

        cell.style.order = config.selectedStocksMaterialsCols.indexOf(mat);
    });
    FilterItems();
    SortStockCells();
}

function SortStockCells() {
    var itemSortKey = {};

    var itemTypeCells = $(".inventoryTable .cell.itemType[item]");
    itemTypeCells.forEach(cell => {
        let sorter = "";

        if (cell.classList.contains("favorite"))
            sorter += "000";

        if (config.toggleStockSorting) {
            var bold = cell.querySelector("b");
            if (bold)
                sorter += bold.innerHTML;
        }

        sorter += CellLabelRaw(cell.innerHTML);
        itemSortKey[cell.getAttribute("item")] = sorter;
    });

    // Build sorted order map (avoids indexOf in loop)
    var sortedItems = Object.entries(itemSortKey).sort((a, b) => a[1].localeCompare(b[1]));
    var orderMap = {};
    sortedItems.forEach((entry, index) => {
        orderMap[entry[0]] = index;
    });

    // Apply to all cells with [item]
    $(".inventoryTable .cell[item]").forEach(cell => {
        var itemName = cell.getAttribute("item");
        cell.style.order = orderMap[itemName] ?? 9999;
    });
}

function CellLabelRaw(label) {
    //remove all html tags and their content
    return label.replace(/<[^>]*>.*?<\/[^>]*>/g, '');
}


function ClearMatName(mat) {
    return mat.replace(/ /g, "_");
}


function DisplayableMaterialName(mat, tagMode = 0) {
    if (mat.endsWith("_PEWTER")) {
        mat = mat.replace("_PEWTER", "");
        mat = mat.replace(":", ":PEWTER_");
    }

    var matString = mat;

    matString = matString.replace("COAL:", "");
    matString = matString.replace("CREATURE:", "");
    matString = matString.replace("INORGANIC:", "");
    matString = matString.replace(":WOOD", "");
    matString = matString.replace("PLANT:", "");
    matString = matString.replace(":BONE", " ");
    matString = matString.replace(":LEATHER", "");
    matString = matString.replace(":DRINK", " DRINK");
    matString = matString.replace(":", " ");
    matString = matString.replace(/_/g, " ");

    switch (tagMode) {
        case 0:
            var groups = GetMaterialTypes(mat);
            groups.forEach(t => {
                matString += " <span class='tag'>" + t + "</span>";
            });
            break;

        case 1:
            matString = "<div class='mat'>" + matString + "</div>";
            types = GetMaterialTypes(mat);
            if (types.length > 0) {
                matString += "<div class='tags'> "
                types.forEach(t => {
                    matString += "<span class='f_" + t + "'>" + t + "</span>";
                });
                matString += "</div>";
            };
            break;

        case 2:
            return matString.charAt(0).toUpperCase() + matString.slice(1).toLowerCase();

        case 3:
            types = GetMaterialTypes(mat);
            return types.length > 0 ? types.join(", ") : ""
    }

    matString = matString.replace("ALL", "TOTAL");

    if (materialsGroups.indexOf(mat) == -1) {
        var matInfo = gm.materials[mat];
        if (!matInfo) {
            cl("missing material info for " + mat);
        } else {
            matInfo.Types.forEach(type => {
                if (matString == type)
                    matString = "All <b>" + type + "</b>";
            });
        }

    }

    matString = matString.replace(/_/g, " ");
    return matString;
}

function GetKiloValue(value) {
    value = parseInt(value);
    if (value > 9999) {
        value = Math.floor(value / 1000);
        return value + "K";
    }
    return value;
}

function InventoryMaterialsFilterEnter(filterValue) {
    if (filterValue != '') {
        if (IsShiftPressed()) {
            var visibles = $(".inventoryMaterialsPicker .materialOption:not(.hidden)");
            if (visibles.length > 0) {
                if (visibles.length > 20) {
                    alert("Too many visible materials to toggle selection at once (max 20). Please refine your filter.");
                    return;
                }

                var firstVisible = Array.from(visibles).reduce((prev, curr) => {
                    if (prev.getAttribute("material") == "ALL")
                        return curr;
                    if (curr.getAttribute("material") == "ALL")
                        return prev;
                    return (parseInt(prev.style.order) < parseInt(curr.style.order)) ? prev : curr;
                });
                var isSelected = config.selectedStocksMaterialsCols.indexOf(firstVisible.getAttribute("material")) != -1;

                visibles.forEach(option => {
                    SetMaterialSelectedState(option.getAttribute("material"), !isSelected);
                });
            }
        } else {
            var firstVisible = $(".inventoryMaterialsPicker .materialOption:not(.hidden)")[0];
            if (firstVisible)
                ToggleInventoryMaterialSelected(firstVisible.getAttribute("material"), true);
        }
        $(".inventoryMaterialsPicker input")[0].value = '';
        InventoryMaterialsFilterChanged('');
    }

    SaveConfig();
    UpdateInventoryMaterialsPicker();
    ApplyInventoryMaterialFilters()
}

function InventoryMaterialsFilterChanged(filterValue) {
    $(".inventoryMaterialsPicker .materialOption").forEach(option => {
        var mat = option.textContent.toLowerCase();
        var words = filterValue.toLowerCase().split(" ");

        if (filterValue == '') {
            option.classList.remove("hidden");
        } else {
            if (words.every(word => mat.includes(word))) {
                option.classList.remove("hidden");
            } else
                option.classList.add("hidden");
        }
    });
    SortInventoryMaterialPicker();
}

function SortInventoryMaterialPicker() {
    //filter invalids out
    config.selectedStocksMaterialsCols = config.selectedStocksMaterialsCols.filter(mat =>
        mat == "ALL"
        || mat == "BONE"
        || mat == "LEATHER"
        || mat == "OTHER"
        || Object.keys(gm.materials).includes(mat)
        || Object.keys(gm.material_types).includes(mat)
    )


    //sort elements by .selcted
    var picker = $(".inventoryMaterialsPicker")[0];
    var options = Array.from(picker.querySelectorAll(".materialOption"));
    options.sort((a, b) => {
        var selectedA = a.classList.contains("selected") ? 1 : 0;
        var selectedB = b.classList.contains("selected") ? 1 : 0;

        if (selectedA != selectedB) {
            return selectedB - selectedA;
        } else {
            if (selectedA == 1)
                return config.selectedStocksMaterialsCols.indexOf(a.getAttribute("material")) - config.selectedStocksMaterialsCols.indexOf(b.getAttribute("material"));
        }

        var mainA = parseInt(a.getAttribute("mainCat")) ?? 0;
        var mainB = parseInt(b.getAttribute("mainCat")) ?? 0;

        if (mainA == -1 && mainB > -1)
            return 1;

        if (mainA > -1 && mainB == -1)
            return -1;

        if (mainA > -1 && mainB > -1)
            return mainA - mainB;

        var orderA = parseInt(a.getAttribute("groupOrder"));
        var orderB = parseInt(b.getAttribute("groupOrder"));

        if (orderA != orderB)
            return orderA - orderB;

        var labelA = DisplayableMaterialName(a.getAttribute("material"), 0)
        var labelB = DisplayableMaterialName(b.getAttribute("material"), 0)

        return labelA.localeCompare(labelB);
    });


    var i = 0;
    options.forEach(option => {
        option.style.order = i;
        i++;
    });
}


function EditOrder(order) {
    if (!order)
        return;

    $(".orderEditor")[0].classList.remove("hidden");
    var input = $(".orderEditor input")[0];
    input.value = '';
    editedOrder = order;

    if (order.jobInfo) {
        input.value = order.jobInfo.name;
        OrderEdited('job')
    }
    input.focus();
    $(".interpretedConditions")[0].innerHTML = "";
    $("#conditionCode")[0].value = "";
    $(".outputConditions")[0].innerHTML = "";

    if (editedOrderIsNew) {
        $(".orderEditor .buttons.newOrder")[0].classList.remove("hidden");
        $(".orderEditor .buttons.oldOrder")[0].classList.add("hidden");
    } else {
        $(".orderEditor .buttons.newOrder")[0].classList.add("hidden");
        $(".orderEditor .buttons.oldOrder")[0].classList.remove("hidden");
    }

    input.dispatchEvent(new Event('change'));

}

function OrderEdited(tag) {
    let job = null;
    switch (tag) {
        case "job":
            let jobName = $(".orderEditor #jobName")[0].value;
            job = jobs.find(j => j.name == jobName);
            if (job != null) {
                $(".orderEditor #jobName")[0].classList.remove("error");
                editedOrder.item_conditions = SetupOrderFromJob(editedOrder, job);
                delete editedOrder.material
                delete editedOrder.material_category

                //cl(job);

                var code = "10\n";

                if (job.io?.out?.length > 0) {
                    let item = job.io.out[0].item;
                    var flags = job.io.out[0].flags ?? [];
                    if (item && (itemsWithCapacity.includes(item.typeName) || itemsWithCapacity.includes(item.subtypeName) || item.container_capacity > 0))
                        flags.push("empty");

                    if (flags.length > 0) {
                        var fs = ""
                        flags.forEach(flag => {
                            fs += ":" + flag + " ";
                        });
                        code = fs + GetItemSimpleName(item) + " < " + code;
                    }
                }

                if (job.name.endsWith(" meal")) {
                    code = ":unrotten FOOD <100\n"
                    code += ":unrotten :cookable :solid >" + GetOrderBatchSize() + "\n"
                } else {
                    if (job.io?.in?.length > 0) {
                        job.io.in.forEach(input => {
                            if (input.flags) {
                                input.flags.forEach(flag => {
                                    code += ":" + flag + " ";
                                });
                            }
                            var item = input.item;
                            if (item) {
                                var inMat = item.material ?? (item.material_category && item.material_category.length > 0 ? item.material_category[0] : null) ?? input.material;
                                if (inMat)
                                    code += "!" + inMat + " ";

                                code += GetItemSubtypeOrType(item)
                            }
                            code += " > " + GetOrderBatchSize() + "\n";
                        });
                    }
                }

                if (job.material != "")
                    editedOrder.material = job.material;

                if (job.material_category && job.material_category.length > 0)
                    editedOrder.material_category = job.material_category;

                if (job.item_typeName && job.item_typeName != "")
                    editedOrder.item_subtype = job.item_typeName;

                $("#conditionCode")[0].value = code;
                OrderEdited("cond");
            } else {
                $(".orderEditor #jobName")[0].classList.add("error");
            }
            break;

        case "qtt":
            editedOrder.amount_left = parseInt($(".orderEditor #itemQtt")[0].value);
            editedOrder.amount_total = parseInt($(".orderEditor #itemQtt")[0].value);
            break;

        case "cond":
            var lines = $("#conditionCode")[0].value.split("\n");

            var inter = $(".interpretedConditions")[0];
            var out = $(".outputConditions")[0];
            inter.textContent = "";
            var basicLineDone = false;
            editedOrder.item_conditions = []
            job = editedOrder.jobInfo;

            fuseItemNames = new Fuse(Object.keys(itemsHumanNamesToItem));
            fuseMats = new Fuse(Object.keys(gm.materials));
            fuseFlags = new Fuse(gm.itemFlags);

            lines.forEach((line) => {

                if (line.trim() == "")
                    return;

                var mat = "";
                var codeLine = "";
                var value = parseInt(line.trim());
                var flags = [];
                var operator = "";
                let scriptOperator = "";
                var itemSelected = null;

                if (line.trim() == value.toString()) {

                    if (basicLineDone)
                        return;
                    codeLine = ""
                    basicLineDone = true;

                    var itemSelected = job.io?.out[0].item;
                    $(".orderEditor #itemQtt")[0].value = Math.min(GetOrderBatchSize(), value)

                    if (itemSelected != null) {
                        scriptOperator = "LessThan";
                        mat = job.io?.out[0].material ?? job.material;
                        codeLine = "Stocks of <b>" + (mat ? "(" + mat + ") " : "") + itemSelected.name + "</b> < <b>" + value + "</b>"
                    } else {
                        codeLine = "<u>[Job's produced item not found]</u>";
                    }

                } else {
                    if (line.includes("!"))
                        mat = line.split("!")[1].split(" ")[0].trim();
                    line = line.replace("!" + mat, "");

                    while (line.includes(":")) {
                        var flag = line.split(":")[1].split(" ")[0].trim();
                        line = line.replace(":" + flag, "").trim();
                        flags.push(flag);
                    }
                    //find position of first characters among < > = !
                    var operators = ["<", ">", "==", "=", "~=", "<=", ">="];
                    var operatorPos = -1;
                    operators.forEach(op => {
                        var pos = line.indexOf(op);
                        if (pos != -1 && (operatorPos == -1 || pos < operatorPos)) {
                            operator = op;
                            operatorPos = pos;
                        }
                    });
                    line = line.replace(operator, "");

                    if (operator == "=")
                        operator = "==";

                    if (operator == "")
                        operator = ">";

                    if (operator == "~=")
                        operator = "!="

                    //position of the first digit
                    var firstDigit = line.search(/\d/);
                    if (firstDigit == -1) {

                        value = -1

                    } else {

                        value = parseInt(line.substr(firstDigit).trim());

                        line = line.replace(value, "");

                        if (value == NaN || value <= -1)
                            value = -1
                    }

                    for (var i = 0; i < flags.length; i++) {
                        var fuseFlag = fuseFlags.search(flags[i], { limit: 1 })[0];
                        flags[i] = fuseFlag ? fuseFlag.item : "?" + flags[i] + "?";
                    };

                    var nameTyped = line.trim();
                    var itemSelected = null;

                    if (nameTyped == "") {
                        nameTyped = "items"
                    } else {

                        itemSelected = FindItemByName(nameTyped);
                        if (!itemSelected) {
                            var itemItemName = fuseItemNames.search(nameTyped, { limit: 1 })?.[0].item;
                            if (itemItemName)
                                itemSelected = itemsHumanNamesToItem[itemItemName];
                        }
                    }

                    if (mat != "") {
                        var fuseMat = fuseMats.search(mat, { limit: 1 })[0];
                        mat = fuseMat ? fuseMat.item : "?" + mat + "?";
                    }

                    codeLine = ""

                    if (flags.length > 0) {
                        flags.forEach(t => {
                            if (codeLine != "")
                                codeLine += ", ";

                            if (t[0] == "?") {
                                codeLine += "<u>" + t.replace("?", "") + "</u>";
                            }
                            else {
                                codeLine += "<b>" + t + "</b>";
                            }
                        });
                    }

                    if (mat != "") {
                        var tmat = mat;
                        if (tmat[0] == "?") {
                            tmat = "<u>" + tmat.replace("?", "") + "</u>";
                        } else {
                            tmat = "<b>" + tmat + "</b>";
                        }
                        if (codeLine != "") {
                            codeLine += ", (" + tmat + ")";
                        }
                        else {
                            codeLine += "(" + tmat + ")";
                        }
                    }

                    if (codeLine != "")
                        codeLine += " ";

                    if (nameTyped == "items") {
                        codeLine += "<b>items</b>";
                    } else {
                        if (!itemSelected) {
                            codeLine += "<u>?" + nameTyped + "?</u> ";
                        } else {
                            codeLine += "<b>" + itemSelected.name + "</b> ";
                        }
                    }

                    if (operator == "~=")
                        operator = "!="

                    if (codeLine != "")
                        codeLine += " ";

                    codeLine += operator + " " + (value >= 0 ? "<b>" + value + "</b>" : "<u>[invalid value]</u>") + "\n";

                    scriptOperator = Object.values(condOperators).find(cnd => { return cnd.symbol == operator }).name ?? "??";
                }

                let condition = {
                    "condition": scriptOperator,
                    "value": value,
                }

                if (mat != "")
                    condition.material = mat;

                if (itemSelected)
                    condition.item_type = GetItemSimpleName(itemSelected);

                if (itemWithDimensions[condition.item_type] > 0)
                    condition.min_dimension = itemWithDimensions[condition.item_type];

                if (flags.length > 0) {
                    condition.flags = flags;
                }

                inter.innerHTML += codeLine + "<br/>";
                if (value >= 0 && (condition.item_type != null || flags.length > 0))
                    editedOrder.item_conditions.push(condition);

                if (job.name.endsWith(" meal")) {
                    if (job.name.indexOf("lavish") != -1) {
                        editedOrder.meal_ingredients = 4;
                    } else if (job.name.indexOf("fine") != -1) {
                        editedOrder.meal_ingredients = 3;
                    } else {
                        editedOrder.meal_ingredients = 2;
                    }
                }

                if (job.reactionName)
                    editedOrder.reaction = job.reactionName;
            });

            out.textContent = JSON.stringify(CloneOrdersNoDom(editedOrder), null, 2);
            break;
    }

}

function GetWantedProduction(item, mat) {
    if (!item) {
        cl("GetWantedProduction called with no item!");
        return 0;
    }
    if (!mat) {
        cl("GetWantedProduction called with no material!");
        return 0;
    }

    mat = mat.toUpperCase()
    if (mat == "STONE")
        mat = "INORGANIC"

    var key = GetItemTypeAndSubName(item) + "/" + (mat ?? "ALL");
    var job = itemJob[key];
    if (!job)
        return 0;

    let myOrders = FindOrdersForJob(job);
    myOrders = myOrders.filter(order => OrderIsRepeating(order));

    if (myOrders.length == 0)
        return 0;

    var prodConditions = GetOrderOutputItemConditions(myOrders[0]);
    if (prodConditions.length > 0)
        return prodConditions[0].value;

    return myOrders[0].amount_total;
}


function IsShiftPressed() {
    return wasShiftPressed && keysDown.length != 0;
}

function IsCtrlPressed() {
    return wasCtrlPressed && keysDown.length != 0;
}

function OnGeneralKeyDown(e) {
    keysDown.push(e.key);

    if (e.key == "Shift")
        wasShiftPressed = true;

    if (e.key == "Control")
        wasCtrlPressed = true;

    var inputActive = document.activeElement && document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "TEXTAREA";

    if (e.key == "a" && wasCtrlPressed && !inputActive)
        e.preventDefault();

    if (IsCtrlPressed() || IsShiftPressed())
        $("body")[0].classList.add("ctrlOrShift");

    var stockMatPicker = $(".inventoryMaterialsPickerHost:not(.hidden)")[0];
    if (stockMatPicker) {
        var pickerInput = stockMatPicker.querySelector("input");
        if (document.activeElement === pickerInput)
            return;
        pickerInput.focus();
        pickerInput.select();
        return;
    }

    if ($(".conditionEditor:not(.hidden)")[0])
        return;
    if ($(".orderEditor:not(.hidden)")[0])
        return;

    if (!IsCtrlPressed() && !IsShiftPressed() && e.key.match("^[a-zA-Z]$")) {
        var autoFocusables = $("input.autofocus");
        autoFocusables = Array.from(autoFocusables);

        //filter out element with offsetParent null (not visible)
        autoFocusables = autoFocusables.filter(s => s.offsetParent !== null);
        if (autoFocusables.length > 0) {
            autoFocusables.sort(CompareDepth);
            if (document.activeElement !== autoFocusables[0]) {
                autoFocusables[0].focus();
                autoFocusables[0].select();
            }
        }
    }
}

function OnGeneralKeyUp(e) {

    if (PopInfoActive())
        return;

    var key = e.key.toLocaleLowerCase();

    if (key == "escape") {
        e.preventDefault();
        OnRightClickOrEscape();
        KeyUpEnd(e);
        return;
    }

    if ($(".inventoryMaterialsPickerHost:not(.hidden)")[0]) {
        if (e.key == "Enter")
            InventoryMaterialsFilterEnter()
        KeyUpEnd(e);
        return;
    }

    if (e.key == "Enter" && (IsShiftPressed() || IsCtrlPressed())) {
        if ($(".orderEditor:not(.hidden)")[0]) {
            e.preventDefault();
            $("#jobName")[0].blur();
            if (IsShiftPressed()) {
                SaveSimpleOrder();
            } else if (IsCtrlPressed()) {
                SaveDailyOrder();
            }
        } else {
            EditOrder(CreateNewOrder());
            var orderIn = $(".orderEditor #jobName")[0]
            $(".orderEditor #jobName")[0].value = $("#generalFilter")[0].value;

            $("#generalFilter")[0].value = "";
            var event = new Event('change');
            $("#generalFilter")[0].dispatchEvent(event);

            SetAutoFill(orderIn, jobSortedNames)
            AutoFillFieldChanged(orderIn);
            OrderEdited('job')
            CloseAutoFill(orderIn);
        }
        KeyUpEnd(e);
        return;
    }


    //space
    if (key == " ") {
        if (currentHoverOrder) {
            if (IsShiftPressed() && IsCtrlPressed()) {
                e.preventDefault();
                OrderToolStopAllAfter();
            } else {
                e.preventDefault();
                OrderToolStopMe();
            }
        }
    }


    if (IsCtrlPressed() || IsShiftPressed()) {

        var double = IsCtrlPressed() && IsShiftPressed();

        if (key == "a") {
            e.preventDefault();
            PauseAllTasks();
        }

        if (key == "z") {
            //cancel changes
            e.preventDefault();
            CancelOrderChanges()
        }

        if (key == "e") {
            e.preventDefault();
            if (!forceAllItemsVisible)
                ToggleOption("hideMissingItems");
        }

        if (key == "r") {
            e.preventDefault();
            if (double) {
                ToggleOption("AutoReadOrders");
            } else {
                QueueOrdersRead(true, true);
            }
        }

        if (key == "t") {
            e.preventDefault();
            if (double) {
                ToggleOption("AutoReadStocks");
            } else {
                QueueStocksRead(true, true);
            }
        }

        if (key == "q") {
            e.preventDefault();
            OpenMaterialsPicker();
        }

        if (key == "s") {
            e.preventDefault();
            if (double) {
                ToggleOption("AutoSaveOrders");
            } else {
                QueueOrdersSave(true, true);
            }
        }

        if (key == "d") {
            e.preventDefault();
            OrderToolDuplicate()
        }

        if (key == "f") {
            e.preventDefault();
            CleanupDuplicateOrders()
        }


        if (key == "g") {
            e.preventDefault();
            ToggleGrouping()
        }




        if (key == "w") {
            e.preventDefault();
            ToggleOption('LessColumns')
        }

        if (key == "x") {
            //delete
            e.preventDefault();

            if (document.querySelector(".inventoryMaterialsPickerHost:not(.hidden)") != null) {
                ClearStocksMaterialsFilter();
            } else if (currentHoverOrder) {
                ToggleDeleteOrder(currentHoverOrder)
            }
        }

        if (key == "c") {
            //reload css (dev)
            ReloadCSS();
        }

        if (key == "v") {
            e.preventDefault();
            OrderToolMax();
        }

        if (key == "b") {
            e.preventDefault();
            OrderToolMin();
        }


        if (key == "1" || key == "&") {
            e.preventDefault();
            SetTab("orders");
        }

        if (key == "2" || key == "é") {
            e.preventDefault();
            SetTab("inventory");
        }

        if (key == "3" || key == "\"") {
            e.preventDefault();
            SetTab("smelting");
        }

        if (key == "4" || key == "'") {
            e.preventDefault();
            SetTab("graphs");
        }

        if (key == "5" || key == "(") {
            e.preventDefault();
            SetTab("settings");
        }

        if (key == "l") {
            //L not 1
            e.preventDefault();
            ToggleOption('HideLogs')
        }



        /*
        if (key == "tab") {
            e.preventDefault();
            if (displayedTab == "inventory") {
                SetTab("orders");
            } else if (displayedTab == "orders") {
                SetTab("smelting");
            } else {
                SetTab("inventory");
            }
        }
        */

        e.stopPropagation();
    }
    KeyUpEnd(e);
}


function SaveSimpleOrder() {
    if (editedOrderIsNew) {
        delete editedOrder.item_conditions;
        editedOrder.frequency = "OneTime";
        AddNewOrder(editedOrder);
    } else {
        MarkEdited(editedOrder);
    }

    CloseOrderEditor();
}

function SaveDailyOrder() {
    if (editedOrderIsNew) {
        editedOrder.frequency = "Daily";
        AddNewOrder(editedOrder);
    } else {
        MarkEdited(editedOrder);
    }

    CloseOrderEditor();
}

function CloseOrderEditor() {
    editedOrderIsNew = false;
    document.activeElement.blur();
    $(".orderEditor")[0].classList.add("hidden");
}


function KeyUpEnd(e) {
    keysDown = keysDown.filter(k => k != e.key);

    if (keysDown.length == 0) {
        wasCtrlPressed = false;
        wasShiftPressed = false;
        $("body")[0].classList.remove("ctrlOrShift");
    }
}

function ClearKeys() {
    $("body")[0].classList.remove("ctrlOrShift");
    keysDown = [];
    wasCtrlPressed = false;
    wasShiftPressed = false;
}



function CompareDepth(a, b) {
    if (a === b)
        return 0;

    var position = a.compareDocumentPosition(b);

    if (position & Node.DOCUMENT_POSITION_FOLLOWING || position & Node.DOCUMENT_POSITION_CONTAINED_BY) {
        return -1;
    } else if (position & Node.DOCUMENT_POSITION_PRECEDING || position & Node.DOCUMENT_POSITION_CONTAINS) {
        return 1;
    } else {
        return 0;
    }
}

function PopInfo(title, message, sub, buttons = null, closeCallback = null, waitingToken = "", icon = null) {

    var newPop = title + message + sub + buttons?.join(",");
    if (newPop == lastPopData && document.querySelector(".infoBox") != null)
        return;
    lastPopData = newPop;

    var infoBox = document.createElement("div");
    infoBox.classList.add("infoBox");
    infoBox.innerHTML = `<div class='window'><div class='title'></div><div class='context'></div><div class='message'></div><div class='buttons'></div></div>`;
    infoBox.setAttribute("waitingToken", waitingToken);
    infoBox.querySelector(".title").textContent = title;
    if (icon) {
        infoBox.querySelector(".message").innerHTML = "<div class='withIcon'><img src='" + icon + "'> <div>" + message + "</div></div>";
    } else {
        infoBox.querySelector(".message").innerHTML = message;
    }

    infoBox.querySelector(".context").innerHTML = sub;

    if (buttons) {
        buttons.forEach(btn => {
            var button = document.createElement("button");
            button.textContent = btn;

            switch (btn) {
                case "WAIT":
                    var prevBox = document.querySelector(".infoBox.wait");
                    if (prevBox)
                        prevBox.remove();
                    infoBox.classList.add("wait");
                    if (closeCallback != null) {
                        setTimeout(() => {
                            const c = closeCallback
                            c();
                        }, 500);
                    }
                    break;

                case "SET DFHACK PATH":
                    Trace("Resetting paths.");
                    button.addEventListener("click", async (e) => {
                        e.stopPropagation();
                        result = await window.api.SetDFHackPath();
                        GetConfig();
                    });
                    break;

                default:
                    button.addEventListener("click", (e) => {
                        const callback = closeCallback;
                        e.stopPropagation();
                        if (callback != null)
                            callback();
                        document.querySelector(".infoBox").remove();
                    });
                    break;

            }
            infoBox.querySelector(".buttons").appendChild(button);
        });
    }

    $("body")[0].appendChild(infoBox);

    if (buttons != null) {
        setTimeout(() => {
            infoBox.addEventListener("click", () => {
                const box = infoBox;
                //remove infobox
                box.remove();
                if (closeCallback)
                    closeCallback();
            });
        }, 500);
    }
}

function PopInfoActive() {
    return document.querySelector(".infoBox") != null;
}

function ClosePopInfoWaiting(token) {
    boxes = document.querySelectorAll(".infoBox[waitingtoken='" + token + "']");
    boxes.forEach(box => {
        box.remove();
    });
}

function AddKeyInfo(button, string) {

    var keyInfo = button.querySelector("span.keyInfo")
    if (!keyInfo) {
        keyInfo = document.createElement("span");
        keyInfo.classList.add("keyInfo");
        button.appendChild(keyInfo);
    }
    keyInfo.textContent = string;
}

function GetMaterialTypes(mat) {
    if (!gm.materials[mat])
        return [];

    return gm.materials[mat].Types;
}


function Trace(msg) {
    var pop = document.createElement("div");
    pop.classList.add("traceActivity");
    pop.innerHTML = msg;

    var firstChild = $(".traces")[0].firstChild;
    $(".traces")[0].insertBefore(pop, firstChild);

    if (firstChild.textContent == msg)
        firstChild.remove();

    setTimeout(() => {
        const p = pop;
        if (p?.parentElement)
            p.parentElement.removeChild(p);
    }, 3000);
}

function ClearToast(toastInfo) {
    if (toastInfo)
        QuickClearToast(toastInfo);
}

function Toast(msg, stay = false) {
    if (msg == "") {
        //clear all toasts
        Object.values(keyedToasts).forEach(toastData => {
            clearTimeout(toastData.timeoutId);
            if (toastData.toast?.parentElement)
                toastData.toast.parentElement.removeChild(toastData.toast);
        });
        keyedToasts = {};
        return;
    }


    let pop;
    let key = msg;

    let toastInfo = keyedToasts[key];
    if (!toastInfo) {

        pop = document.createElement("div");
        pop.innerHTML = msg;

        let firstChild = $(".toasts")[0].firstChild;
        $(".toasts")[0].insertBefore(pop, firstChild);

        keyedToasts[key] = {
            key: key,
            toast: pop,
            timeoutId: 0
        }
        toastInfo = keyedToasts[key];

    }

    if (stay) {
        toastInfo.toast.classList.add("repeat");
    } else {
        SlowClearToast(keyedToasts[key]);
    }

    return toastInfo;
}

function SlowClearToast(toast) {
    toast.timeoutId = setTimeout(() => {
        const p = toast.toast;
        const k = toast.key;
        if (p?.parentElement)
            p.parentElement.removeChild(p);
        delete keyedToasts[k];
    }, 5000)
}

function QuickClearToast(toast) {
    toast.toast.classList.add("quickClear");
    toast.timeoutId = setTimeout(() => {
        const p = toast.toast;
        const k = toast.key;
        if (p?.parentElement)
            p.parentElement.removeChild(p);
        delete keyedToasts[k];
    }, 1000)
}


function ClearStocksMaterialsFilter() {
    config.selectedStocksMaterialsCols = ["ALL"];
    SaveConfig();
    UpdateInventoryMaterialsPicker();
    ApplyInventoryMaterialFilters();
}

async function pause(milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
}


function FixItemTypeName(name) {
    //get last character of prod.item_typeName
    if (name == "SIEGE_AMMO")
        return name;
    var lastChar = name.charAt(name.length - 1);
    if (lastChar != "S")
        return name + "S";
    return name;
}

function DebugJobs() {
    jobs.forEach(job => {
        if (job.reaction) {
            cl("Job #" + jobs.indexOf(job) + " " + job.name + " in/outs:");
            job.io.in.forEach(inp => {
                var mat = inp.material ? "(" + inp.material + ") " : "";
                var flags = inp.flags ? "(" + inp.flags.join(",") + ") " : "";
                var item = inp.item_subtypeName ? "ST " + inp.item_subtypeName : null;
                item ??= inp.item_typeName ? "IT " + inp.item_typeName : "";
                cl("   <- Input: " + inp.quantity + "x " + flags + mat + item);
            });
            job.io.out.forEach(outp => {
                var mat = outp.material ? "(" + outp.material + ") " : "";
                var item = outp.item_subtypeName ? "ST " + outp.item_subtypeName : null;
                item ??= outp.item_typeName ? "IT " + outp.item_typeName : "";
                cl("     -> Output: " + outp.count + "x " + mat + item);
            });
        }
    });
}

function GetMaterialNameFromIndex(index) {
    return Object.keys(gm.materials).find(matName => {
        if (gm.materials[matName].Index == index) {
            return matName;
        }
    });
}


if (!Array.prototype.last) {
    Array.prototype.last = function () {
        return this[this.length - 1];
    };
};

function FindJobsWith(name) {
    var low = name.toLocaleLowerCase();
    return jobs.filter(j => j.name.toLocaleLowerCase().includes(low) || j.jobTypeName.toLocaleLowerCase().includes(low) || j.reactionName?.toLocaleLowerCase().includes(low));
}

function FindStocksWith(name) {
    return Object.entries(stocks).filter(([key, value]) => key.includes(name));
}

function CraftableMaterialName(mat) {
    if (mat.startsWith("CREATURE:")) {
        if (mat.endsWith(":LEATHER") || mat.endsWith(":BONE") || mat.endsWith(":SHELL"))
            return mat;
        return "";
    }
    return mat;
}

function GetJobMaterial(job) {
    return job.material || job.material_category?.[0] || job.io?.in?.[0]?.material || "";
}


function CompleteJobInfos(job) {
    //determine job item type, subtype, material...

    job.jobTypeName = gm.job_type[job.jobType];
    job.isCrafts = job.jobTypeName == "MakeCrafts"

    var seekNameUp = GetMaterialNameFromIndex(job.mat_index);
    job.material = seekNameUp ? seekNameUp : "";

    job.reaction = job.reactionName ? gm.reactions[job.reactionName] : null;
    job.io = { in: [], out: [] };

    if (job.reaction != null) {
        //by reactions (easy mode)

        if (job.reactionName == "BREW_DRINK_FROM_PLANT") {
            key = "DRINK!PLANT/ALL";
            itemJob[key] = job;
            itemHasJob["DRINK!PLANT"] = true;
            gm.items["DRINK!PLANT"] = JSON.parse(JSON.stringify(gm.items["DRINK"]))
            gm.items["DRINK!PLANT"].isTypeOnly = false;
            gm.items["DRINK!PLANT"].subtypeName = "PLANT";
            gm.items["DRINK!PLANT"].name = "Drink (from plants)"
        } else if (job.reactionName == "BREW_DRINK_FROM_PLANT_GROWTH") {
            key = "DRINK!FRUIT/ALL";
            itemJob[key] = job;
            itemHasJob["DRINK!FRUIT"] = true;
            gm.items["DRINK!FRUIT"] = JSON.parse(JSON.stringify(gm.items["DRINK"]))
            gm.items["DRINK!FRUIT"].isTypeOnly = false;
            gm.items["DRINK!FRUIT"].subtypeName = "FRUIT";
            gm.items["DRINK!FRUIT"].name = "Drink (from fruits)"
        }

        if (job.reaction.products != null) {
            var first = true;
            job.reaction.products.forEach(p => {
                if (p.item_type > -1) {
                    let item = gm.items[gm.item_types[p.item_type]];

                    if (job.reactionName.endsWith("_COKE"))
                        job.material = "COAL:COKE";

                    job.io.out.push({
                        "item": item,
                        "material": job.material,
                        "material_index": job.mat_index,
                        "count": p.count ? p.count : 1
                    });
                    if (first && item) {
                        job.item_typeName = item.subtypeName;
                        first = false;
                    }
                }
            });
        }

        if (job.reaction.reagents != null) {
            job.reaction.reagents.forEach(r => {
                r.flags = r.flags1.concat(r.flags2).concat(r.flags3);
                r.material = GetMaterialNameFromIndex(r.mat_index);
                let item = null;
                if (r.item_type > -1)
                    item = gm.items[gm.item_types[r.item_type]];

                job.io.in.push({
                    "item": item,
                    "material": r.material,
                    "material_index": r.mat_index,
                    "count": r.count ? r.count : 1,
                    "flags": r.flags,
                    "reaction_product": r.reaction_product
                });
            });
        }

    } else {

        //by guesswork (hard mode)

        //create job output

        var jn = job.name;
        var jtn = job.jobTypeName;
        let noInItem = false;

        var newOut = {
            item: null,
            count: 1,
        }
        var newIn = {
            item: null,
            quantity: 1,
        };

        (function () {

            if (jtn == "ConstructChest") {
                newOut.item = gm.items["BOX"];
                return;
            }

            if (jtn == "MakePants") {

                var info = pantsInfos[jn];
                if (info) {
                    newOut.item = gm.items[info.item];
                    if (info.material != "") {
                        newIn.material = info.material;
                    } else {
                        newIn.material_category = [info.material_category];
                        job.material_category = [info.material_category];
                    }
                    return;
                }
                cl("Unknown pants job name: " + jn);
            }

            if (jtn == "MakeGloves") {
                if (jn.endsWith("gloves")) {
                    newOut.item = gm.items["GLOVES!ITEM_GLOVES_GLOVES"];
                } else if (jn.endsWith("mittens")) {
                    newOut.item = gm.items["GLOVES!ITEM_GLOVES_MITTENS"];
                } else if (jn.endsWith("gauntlets")) {
                    newOut.item = gm.items["GLOVES!ITEM_GLOVES_GAUNTLETS"];
                }
                return;
            }

            if (jtn == "MakeArmor") {
                if (jn.endsWith("breastplate")) {
                    newOut.item = gm.items["ARMOR!ITEM_ARMOR_BREASTPLATE"];
                } else if (jn.endsWith("cape")) {
                    newOut.item = gm.items["ARMOR!ITEM_ARMOR_CAPE"];
                } else if (jn.endsWith("cloak")) {
                    newOut.item = gm.items["ARMOR!ITEM_ARMOR_CLOAK"];
                } else if (jn.endsWith("coat")) {
                    newOut.item = gm.items["ARMOR!ITEM_ARMOR_COAT"];
                } else if (jn.endsWith("robe")) {
                    newOut.item = gm.items["ARMOR!ITEM_ARMOR_DRESS"];
                } else if (jn.endsWith("dress")) {
                    newOut.item = gm.items["ARMOR!ITEM_ARMOR_DRESS"];
                } else if (jn.endsWith("leather")) {
                    newOut.item = gm.items["ARMOR!ITEM_ARMOR_LEATHER"];
                } else if (jn.endsWith("mail shirt")) {
                    newOut.item = gm.items["ARMOR!ITEM_ARMOR_MAIL_SHIRT"];
                } else if (jn.endsWith("robe")) {
                    newOut.item = gm.items["ARMOR!ITEM_ARMOR_ROBE"];
                } else if (jn.endsWith("shirt")) {
                    newOut.item = gm.items["ARMOR!ITEM_ARMOR_SHIRT"];
                } else if (jn.endsWith("toga")) {
                    newOut.item = gm.items["ARMOR!ITEM_ARMOR_TOGA"];
                } else if (jn.endsWith("tunic")) {
                    newOut.item = gm.items["ARMOR!ITEM_ARMOR_TUNIC"];
                } else if (jn.endsWith("vest")) {
                    newOut.item = gm.items["ARMOR!ITEM_ARMOR_VEST"];
                }
            }

            if (jtn == "MakeShoes") {
                if (jn.endsWith("high boots")) {
                    newOut.item = gm.items["SHOES!ITEM_SHOES_BOOTS"];
                } else if (jn.endsWith("shoes")) {
                    newOut.item = gm.items["SHOES!ITEM_SHOES_SHOES"];
                } else if (jn.endsWith("socks")) {
                    newOut.item = gm.items["SHOES!ITEM_SHOES_SOCKS"];
                } else if (jn.endsWith("sandals")) {
                    newOut.item = gm.items["SHOES!ITEM_SHOES_SANDAL"];
                } else if (jn.endsWith("chausse")) {
                    newOut.item = gm.items["SHOES!ITEM_SHOES_CHAUSSE"];
                } else if (jn.endsWith("low boots")) {
                    newOut.item = gm.items["SHOES!ITEM_SHOES_BOOTS_LOW"];
                }
            }


            if (jtn == "MakeCheese") {
                newOut.item = gm.items["MakeCheese"];
                newIn.flags = ["unrotten", "milk"];
                key = "CHEESE/ALL";
                itemJob[key] = job;
                itemHasJob["CHEESE"] = true;
                return;
            }

            if (jtn == "PrepareMeal") {
                newIn.flags = ["unrotten", "cookable", "solid"];
                noInItem = true;

                switch (job.mat_type) {
                    case "2":
                        key = "FOOD!ITEM_FOOD_BISCUITS/ALL";
                        itemJob[key] = job;
                        itemHasJob["FOOD!ITEM_FOOD_BISCUITS"] = true;
                        newOut.item = gm.items["FOOD!ITEM_FOOD_BISCUITS"];
                        return;
                    case "3":
                        key = "FOOD!ITEM_FOOD_STEW/ALL";
                        itemJob[key] = job;
                        itemHasJob["FOOD!ITEM_FOOD_STEW"] = true;
                        newOut.item = gm.items["FOOD!ITEM_FOOD_STEW"];
                        return;
                    case "4":
                        key = "FOOD!ITEM_FOOD_ROAST/ALL";
                        itemJob[key] = job;
                        itemHasJob["FOOD!ITEM_FOOD_ROAST"] = true;
                        newOut.item = gm.items["FOOD!ITEM_FOOD_ROAST"];
                        return;
                }
            }

            if (jn == "Weave thread into cloth") {
                newIn.item = gm.items["THREAD"];
                newIn.flags = ["collected", "plant"];

                newOut.item = gm.items["CLOTH"];

                job.material = ""
                job.material_category = ["plant"];
                return;
            }

            if (jn == "Weave thread into silk") {
                newIn.item = gm.items["THREAD"];
                newIn.flags = ["collected", "silk"];

                newOut.item = gm.items["CLOTH"];

                job.material = ""
                job.material_category = ["silk"];
                return;
            }

            if (jn == "Weave yarn into cloth") {
                newIn.item = gm.items["THREAD"];
                newIn.flags = ["collected", "yarn"];

                newOut.item = gm.items["CLOTH"];

                job.material = ""
                job.material_category = ["yarn"];
                return;
            }

            if (jn == "Make bolt thrower parts") {
                newIn.item = gm.items["WOOD"];

                newOut.item = gm.items["BOLT_THROWER_PARTS"];
                newOut.material_category = ["wood"];
                job.material_category = ["wood"];
                return;
            }

            if (jn == "Make adamantine bolt thrower parts") {
                newIn.item = gm.items["BAR"];
                newIn.material = "INORGANIC:ADAMANTINE";

                newOut.item = gm.items["BOLT_THROWER_PARTS"];
                newOut.material = "INORGANIC:ADAMANTINE";
                job.material = "INORGANIC:ADAMANTINE";
                return;
            }

            if (jn.endsWith("bolts")) {
                newOut.item = gm.items["AMMO!ITEM_AMMO_BOLTS"];
                return;
            }

            if (jn.endsWith(" blocks")) {
                newOut.item = gm.items["BLOCKS"];
                newOut.flags = ["plant"]
                return;
            }

            if (jn.indexOf(" mugs") > -1 || jn.indexOf(" cups") > -1 || jn.indexOf(" goblets") > -1) {
                newOut.item = gm.items["GOBLET"];
                return;
            }

            if (jn == "Make charcoal") {
                newIn.item = gm.items["WOOD"];
                newOut.item = gm.items["BAR"];
                newOut.material = "COAL:CHARCOAL";
                job.material = "COAL:CHARCOAL";
                return;
            }

            var jnl = job.name.toLowerCase();


            if (jnl.includes(" throne ") || jnl.includes(" chair ")) {
                newOut.item = gm.items["CHAIR"];
                return;
            }

            if (jnl.includes(" barrel ")) {
                newOut.item = gm.items["BARREL"];
                return;
            }

            if (jnl == "make bed") {
                newOut.item = gm.items["BED"];
                return;
            }

            if (jnl.includes(" chain")) {
                newOut.item = gm.items["CHAIN"];
                return;
            }


            if (jnl.includes(" quiver")) {
                newOut.item = gm.items["QUIVER"];
                return;
            }

            if (jnl.includes(" weapon rack")) {
                newOut.item = gm.items["WEAPONRACK"];
                return;
            }

            if (jnl.includes(" armor stand")) {
                newOut.item = gm.items["ARMORSTAND"];
                return;
            }

            if (jnl.includes(" bucket")) {
                newOut.item = gm.items["BUCKET"];
                return;
            }

            if (jnl.includes(" pipe section")) {
                newOut.item = gm.items["PIPE_SECTION"];
                return;
            }

            if (jnl.includes(" anvil")) {
                newOut.item = gm.items["ANVIL"];
                return;
            }

            if (jnl.includes(" wheelbarrow")) {
                newOut.item = gm.items["ITEM_TOOL_WHEELBARROW"];
                return;
            }

            if (jnl.includes(" casket")) {
                newOut.item = gm.items["COFFIN"];
                return;
            }

            if (jnl.includes(" sarcophagus")) {
                newOut.item = gm.items["COFFIN"];
                return;
            }

            if (jnl.includes(" hatch cover")) {
                newOut.item = gm.items["HATCH_COVER"];
                return;
            }

            if (jnl.includes(" rope")) {
                newOut.item = gm.items["CHAIN"];
                return;
            }

            if (jnl.includes(" traction bench")) {
                newOut.item = gm.items["TRACTION_BENCH"];
                return;
            }

            if (jnl.includes(" animal trap")) {
                newOut.item = gm.items["ANIMALTRAP"];
                return;
            }

            if (jnl.includes(" bolts")) {
                newOut.item = gm.items["ITEM_AMMO_BOLTS"];
                return;
            }

            if (jnl.includes(" ballista arrow head")) {
                newOut.item = gm.items["BALLISTAARROWHEAD"];
                return;
            }

            if (jnl.includes(" ballista parts")) {
                newOut.item = gm.items["BALLISTAPARTS"];
                if (jnl.includes("adamantine")) {
                    job.material = "INORGANIC:ADAMANTINE"
                } else {
                    job.material_category = ["WOOD"]
                }
                return;
            }

            if (jnl.includes(" catapult parts")) {
                newOut.item = gm.items["CATAPULTPARTS"];
                if (jnl.includes("adamantine")) {
                    job.material = "INORGANIC:ADAMANTINE"
                } else {
                    job.material_category = ["WOOD"]
                }
                return;
            }

            if (jnl.includes(" bolt thrower parts")) {
                newOut.item = gm.items["BOLT_THROWER_PARTS"];
                job.material_category = ["WOOD"]
                return;
            }

            if (jnl.endsWith(" ash")) {
                newOut.item = gm.items["BAR"];
                job.material = "ASH";
                return;
            }

            if (jnl.includes(" potash ")) {
                newOut.item = gm.items["BAR"];
                job.material = "POTASH";
                return;
            }

            if (jnl.endsWith(" lye")) {
                newOut.item = gm.items["BAR"];
                job.material = "LYE";
                return;
            }

            if (jnl == "make raw clear glass") {
                newOut.item = gm.items["ROUGH"];
                job.material = "GLASS_CLEAR"
                return;
            }

            if (jnl == "make raw green glass") {
                newOut.item = gm.items["ROUGH"];
                job.material = "GLASS_GREEN"
                return;
            }

            if (jnl == "make raw crystal glass") {
                newOut.item = gm.items["ROUGH"];
                job.material = "GLASS_CRYSTAL";
                return;
            }

            if (jnl.endsWith(" portal")) {
                newOut.item = gm.items["DOOR"];
                return;
            }

            if (jnl.endsWith(" terrarium")) {
                newOut.item = gm.items["CAGE"];
                return;
            }

            if (jnl.endsWith(" tube")) {
                newOut.item = gm.items["PIPE_SECTION"];
                return;
            }

            if (jnl.endsWith(" vial")) {
                newOut.item = gm.items["FLASK"];
                return;
            }

            if (jnl.endsWith(" waterskin")) {
                newOut.item = gm.items["FLASK"];
                return;
            }


            if (jnl.endsWith(" mug") || jnl.endsWith(" mugs")) {
                newOut.item = gm.items["GOBLET"];
                return;
            }

            if (jnl.endsWith(" cup") || jnl.endsWith(" cups")) {
                newOut.item = gm.items["GOBLET"];
                return;
            }


            if (jnl.endsWith(" vial") || jnl.endsWith(" vials")) {
                newOut.item = gm.items["FLASK"];
                return;
            }

            if (jnl.endsWith(" waterskin") || jnl.endsWith(" waterskins")) {
                newOut.item = gm.items["FLASK"];
                return;
            }

            if (job.name.startsWith("Make wooden training")) {
                var weapon = job.name.split(" ").last();
                switch (weapon) {
                    case "sword":
                        newOut.item = gm.items["ITEM_WEAPON_SWORD_SHORT_TRAINING"];
                        break;
                    case "axe":
                        newOut.item = gm.items["ITEM_WEAPON_AXE_TRAINING"];
                        break;
                    case "mace":
                        newOut.item = gm.items["ITEM_WEAPON_MACE_TRAINING"];
                        break;
                }
                return;
            }

            var parts = jn.toUpperCase().split(" ");
            while (parts.length > 0 && newOut.item == null) {
                var itm = parts.join(" ").toLowerCase();
                if (itm == "")
                    continue;

                newOut.item = FindItemBySubtype(itm) ?? FindItemByName(itm) ?? FindItem(itm);
                if (newOut.item != null)
                    return;

                parts.shift(1)
            }

            if (newOut.item == null) {
                switch (job.jobTypeName) {
                    case "ConstructChest":
                        newOut.item = gm.items["BOX"];
                        newOut.condition = { flags: ["empty"], };
                        break;
                    case "ConstructThrone":
                        newOut.item = gm.items["CHAIR"];
                        break;
                    case "ConstructMechanisms":
                        newOut.item = gm.items["TRAPPARTS"];
                        break;
                    case "MakeAsh":
                        newOut.item = gm.items["ASH"];
                        break;
                    case "MakeLye":
                        newOut.item = gm.items["LYE"];
                        break;
                    case "MakePotashFromAsh":
                        newOut.item = gm.items["POTASH"];
                        break;
                    case "MakePotashFromLye":
                        newOut.item = gm.items["POTASH"];
                        break;
                    case "MakeRawGlass":
                        newOut.item = gm.items["GLASS"];
                        break;
                    case "SmeltOre":
                        newOut.item = gm.items["BAR"];
                        break;
                    case "MakeCrafts":
                        newOut.item = -1;
                        break;
                    case "MintCoins":
                        newOut.item = gm.items["COIN"];
                        break;
                }
            }
        })();


        //create job inputs
        if (!newIn.item && !noInItem) {
            newIn.material = job.material;
            var materialType = gm.materials[job.material]?.Types[0] ?? job.material_category?.[0]?.toUpperCase() ?? "";
            switch (materialType) {
                case "STONE":
                    newIn.item = gm.items["BOULDER"];
                    break;
                case "METAL":
                    newIn.item = gm.items["BAR"];
                    break;
                case "GEM":
                    newIn.item = gm.items["SMALLGEM"];
                    break;
                //case "COAL":
                case "FUEL":
                    newIn.item = gm.items["BAR"];
                    break;
                case "WOOD":
                    newIn.item = gm.items["WOOD"];
                    break;
                case "LEATHER":
                    newIn.item = gm.items["SKIN_TANNED"];
                    break;
                case "GLASS":
                    newIn.item = gm.items["ROUGH"];
                    break;
                case "BONE":
                    newIn = {
                        "flags":
                            [
                                "unrotten",
                                "bone",
                                "body_part"
                            ]
                    };
                    break;

                default:
                    if (job.name.includes(" wooden ")) {
                        newIn.item = gm.items["WOOD"];

                    } else if (job.name.includes(" rock ")) {
                        newIn.material = "INORGANIC";
                        newIn.item = gm.items["BOULDER"];
                        newIn.flags = ["hard", "non_economic"];

                    } else if (job.name.includes(" leather")) {
                        newIn.item = gm.items['SKIN_TANNED'];

                    } else if (job.name.includes(" silk")) {
                        newIn.flags = ['silk'];
                        newIn.item = gm.items["CLOTH"];

                    } else if (job.name.includes(" yarn")) {
                        newIn.flags = ['yarn'];
                        newIn.item = gm.items["CLOTH"];

                    } else if (job.name.includes(" cloth")) {
                        newIn.flags = ['plant'];
                        newIn.item = gm.items["CLOTH"];

                    } else if (job.name == "Make bed") {
                        newIn.item = gm.items["WOOD"];
                    }
                    break;
            }
        }

        var seekOutItem = true
        if (job.name.startsWith("Collect ")
            || job.name.startsWith("Cut ")
            || job.name.startsWith("Decorate ")
            || job.name.startsWith("Dye ")
            || job.name.startsWith("Extract ")
            || job.name.startsWith("Encrust ")
            || job.name.startsWith("Mix ")
            || job.name.startsWith("Polish ")
            || job.name.startsWith("Sew ")
            || job.name.startsWith("Stud ")) {
            seekOutItem = false;
        }

        var removeS = false;
        if (job.name.indexOf("pair of ") > -1 || job.name.indexOf(" three ") > -1)
            removeS = true;

        if (seekOutItem && newOut.item == null) {
            //try auto resolve
            var cutName = job.name.toLowerCase();
            if (gm.materials[newOut.material])
                cutName = cutName.replace(gm.materials[newOut.material].name.toLocaleLowerCase(), "")
            if (newOut.material_category)
                cutName = cutName.replace(newOut.material_category[0].toLocaleLowerCase(), "")
            cutName = cutName.replace("contruct", "")
            cutName = cutName.replace("make", "")
            cutName = cutName.replace("forge", "")
            cutName = cutName.replace("cut", "")
            cutName = cutName.replace("assemble", "")
            cutName = cutName.replace("pair of ", " ")
            cutName = cutName.replace("three ", " ")

            //replace uppercase letters with _ + letter except first
            cutName = cutName[0].toLowerCase() + cutName.slice(1);
            cutName = cutName.replace(/([A-Z])/g, '_$1');
            cutName = cutName.toLocaleLowerCase().trim();

            if (removeS && cutName.endsWith("s"))
                cutName = cutName.slice(0, -1);

            newOut.item = FindItemByName(cutName.trim());
            var cuterName = cutName;
            while (newOut.item == null && cuterName.includes(" ")) {
                //remove first word
                var parts = cuterName.split(" ");
                parts.shift(1);
                cuterName = parts.join(" ");
                newOut.item = FindItemByName(cuterName.trim());
            }

            if (newOut.item == null) {
                //cl("-- Could not auto-resolve output item for job #" + jobs.indexOf(job) + " '" + job.name + "' using '" + cutName + "'");
            }

            if (newOut.item != null) {
                //cl("+++ Auto-resolved job #" + jobs.indexOf(job) + " '" + job.name + "' to item " + newOut.item.name + " using '" + cutName + "'");
            }
        }

        job.material ??= "";
        job.material_category ??= "";
        if (newOut.item != null && job.material == "" && job.material_category == "") {
            //search job name (without item name) for material
            var jn = job.name.replace(newOut.item.name, "");

            if (newOut.item != -1)
                jn = jn.toUpperCase().replace(newOut.item.name.toUpperCase(), "")

            let parts = jn.toUpperCase().trim().split(" ");

            while (parts.length > 0) {
                parts.shift(1)
                var seekNameUp = parts.join(" ")

                var matName = FindMaterialByName(seekNameUp);

                if (matName) {
                    job.material = matName;
                    break;
                } else {
                    if (materialsGroups.indexOf(seekNameUp) >= 0) {
                        job.material_category = [seekNameUp];
                    }
                    break;
                }
            }

            if (job.material == "" && job.material_category == "") {
                if (job.name.includes(" leather "))
                    job.material_category = ["LEATHER"];

                if (job.name.includes(" rock "))
                    job.material = "INORGANIC";

                if (job.name.includes(" bone "))
                    job.material_category = ["BONE"];

                if (job.name.includes(" cloth "))
                    job.material_category = ["CLOTH"];

                if (job.name.includes("ivory/tooth"))
                    job.material_category = ["TOOTH"];

                if (job.name.includes("shell"))
                    job.material_category = ["shell"];

                if (job.name.includes("pearl"))
                    job.material_category = ["PEARL"];

                if (job.name.includes(" wooden "))
                    job.material_category = ["WOOD"];

                if (job.name.includes(" wood "))
                    job.material_category = ["WOOD"];

                if (job.name.includes(" yarn "))
                    job.material_category = ["YARN"];

                if (job.name.includes(" horn "))
                    job.material_category = ["HORN"];

                if (job.name.includes(" glass"))
                    job.material_category = ["HORN"];

                if (job.name == "Make bed")
                    job.material_category = ["WOOD"];
            }
        }

        if (newOut.item) {
            job.item_typeName = newOut.item.subtypeName;
        }

        if (newIn.item != null || newIn.flags)
            job.io.in.push(newIn);

        if (newOut.item != null) {
            job.io.out.push(newOut);
        } else {
            //cl("Could not auto-resolve output item for job #" + jobs.indexOf(job) + " '" + job.name + "'");
        }

        if (job.material && materialsGroups.includes(job.material)) {
            job.material_category = [job.material];
            job.material = "";
        }

        if (job.material_category?.length > 0)
            job.material_category[0] = job.material_category[0].toLocaleLowerCase();

    }

    let matKey = ''
    if (job.material != "") {
        matKey = "/" + job.material;
    } else if (job.material_category != null && job.material_category.length > 0) {
        matKey = "/" + job.material_category[0].toUpperCase();
    };

    if (matKey == '')
        return;

    if (job.isCrafts) {
        key = 'CRAFTS' + matKey;
        itemJob[key] = job;
        itemHasJob["CRAFTS"] = true;
        return;
    }

    if (job.io.out == null || job.io.out.length == 0)
        return;

    job.io.out.forEach(outInfo => {
        if (!outInfo.item) {

            //cl("Job #" + jobs.indexOf(job) + " " + job.name + " has no output item defined.");
            return;
        }

        key = ''

        var item = outInfo.item;
        ok = false;

        if (item.typeName == undefined && item.subtypeName != undefined) {
            cl(" !!! Item has no typeName defined, but a subtypeName: " + item.subtypeName);
        }

        if (item.typeName == undefined && item.subtypeName == undefined) {
            return;
        }

        key = GetItemTypeAndSubName(item)//(item.isTypeOnly ? item.typeName : item.typeName + "!" + item.subtypeName).toUpperCase();
        itemHasJob[key] = true;
        var fullKey = key + matKey;

        itemJob[fullKey] = job;
        /*
        var allKey = key + "/ALL";
        itemJob[allKey] = job;
        */
    });
}

function GetOrderJobLabel(order) {
    if (order.job == "PrepareMeal") {
        var ret = "Prepare meal (";
        if (order.meal_ingredients == 2) {
            ret += "easy)";
        } else if (order.meal_ingredients == 3) {
            ret += "fine)";
        } else if (order.meal_ingredients == 4) {
            ret += "lavish)";
        } else {
            ret += order.meal_ingredients + " ingredients)";
        }
        return ret;
    }

    order.meal_ingredients + " ingredients)";



    let job = GetJobFromOrder(order);
    if (!job)
        return "Unknown job! " + order.job

    //cl(order);
    if (config.toggleStockSorting) {
        let item = GetJobItem(job);

        let name = "";

        if (job.jobTypeName == "MakeCrafts") {
            name = "<b>Make Crafts</b> ";
        } else {
            var gname = item && item != -1 ? ItemGroupName(item) : '';
            if (gname != "")
                name = "<b>" + gname + "</b> ";

            if (item && item != -1 && item.name.toLocaleLowerCase() != gname.toLocaleLowerCase()) {
                name += item.name + " ";
            } else {
                name = job.name + " ";
            }
        }

        if (job.material_category)
            name += "<i>(" + DisplayableMaterialName(job.material_category[0], 2) + ")</i>";
        else if (job.material)
            name += "<i>(" + DisplayableMaterialName(job.material, 2) + ")</i>";

        return name.trim();

    } else {
        return job.name;

    }
}


function FindItem(search) {
    search = search.toLowerCase().trim();
    var res = Object.entries(gm.items).find(([key, itm]) => { return key.toLowerCase().includes(search) || itm.name.toLowerCase().includes(search) || itm.typeName.toLowerCase().includes(search) || itm.subtypeName.toLowerCase().includes(search) })
    return res ? res[1] : null;
}

function FindItemByName(search) {
    search = search.toLowerCase().trim();
    return Object.values(gm.items).find(itm => itm.name == search);
}

function FindItemsByType(search) {
    search = search.toLowerCase().trim();
    return Object.values(gm.items).filter(itm => itm.typeName == search);
}

function FindItemBySubtype(search) {
    search = search.toUpperCase().trim();
    return Object.values(gm.items).find(itm => itm.subtypeName == search);
}

function FindItems(search) {
    search = search.toLowerCase().trim();
    return Object.entries(gm.items).filter(([key, item]) => { return key.includes(search) || item.name.includes(search) || item.typeName.includes(search) || item.subtypeName.includes(search) });
}

function FindMaterialByName(materialName) {
    materialName = materialName.toLowerCase().trim();
    let materialNameKey = materialName.replaceAll(" ", "_").toUpperCase();

    if (materialNameKey.includes("GLASS")) {
        let parts = materialNameKey.split("_");
        //reverse parts
        parts = parts.reverse();
        materialNameKey = parts.join("_");
    }

    return Object.entries(gm.materials).find(([key, matInfo]) => {
        if (matInfo.name && matInfo.name == materialName)
            return true;
        if (key == materialNameKey)
            return true;
    })?.[0]
}

function FindMaterialIncluding(materialName) {
    materialName = materialName.toLowerCase().trim();
    return Object.entries(gm.materials).filter(([key, matInfo]) => {
        if (matInfo.name?.toLocaleLowerCase().includes(materialName))
            return true;
        if (key.toLowerCase().includes(materialName))
            return true;
    })
}

function CheckJobsValidity() {
    jobs.forEach(job => {
        if (job.item_typeName != '') {
            if (job.io.in.length == 0)
                cl("Warning: Job #" + jobs.indexOf(job) + " " + job.name + " has no <-input defined.");
            if (job.io.out.length == 0)
                cl("Warning: Job #" + jobs.indexOf(job) + " " + job.name + " has no output-> defined.");
        }
    });
}

function NoS(str) {
    if (str.endsWith("S") || str.endsWith("s"))
        return str.substr(0, str.length - 1);
    return str;
}

function SometimesNoS(str) {
    //Dwarf fortress naming unconventions shenanigans...
    if (str == "BLOCKS")
        return str;

    if (str == "SIEGE_AMMO")
        return "SIEGEAMMO"

    if (str.startsWith("TRAPPART"))
        return "TRAPPARTS"

    if (str == "PANTS")
        return "PANTS"

    if (str == "GLOVES")
        return "GLOVES"

    if (str == "BOLT_THROWER_PARTS")
        return "BOLT_THROWER_PARTS"

    if (str.startsWith("BALLISTAPART"))
        return "BALLISTAPARTS"

    if (str.endsWith("S") || str.endsWith("s"))
        return str.substr(0, str.length - 1);

    return str;
}

function GetJobFromOrder(order) {
    var jbs = jobs.filter(j => j.jobTypeName == order.job);

    if (order.reaction)
        jbs = jbs.filter(j => j.reactionName == order.reaction);

    if (order.material_category && order.material_category.length > 0)
        jbs = jbs.filter(j => {
            let jmat = (j.material_category && j.material_category.length > 0) ? j.material_category[0] : j.material;
            let omat = (order.material_category && order.material_category.length > 0) ? order.material_category[0] : order.material;
            return jmat.toLocaleLowerCase() == omat.toLocaleLowerCase();
        })

    if (order.meal_ingredients > 0) {
        jbs = jbs.filter(j => { return j.mat_type == order.meal_ingredients; });
    }

    if (order.item_subtype) {
        jbs = jbs.filter(j => j.item_typeName == order.item_subtype || GetJobItem(j)?.typeName == order.item_subtype);
    }

    if (order.job == "PrepareMeal") {
        switch (order.meal_ingredients) {
            case 2:
                jbs = jbs.filter(j => j.name == "Prepare easy meal");
                break;
            case 3:
                jbs = jbs.filter(j => j.name == "Prepare fine meal");
                break;
            case 4:
                jbs = jbs.filter(j => j.name == "Prepare lavish meal");
                break;
            default:
                jbs = [];
        }
    } else if (order.job == "SmeltOre") {
        var caillou = order.material.split(":")[1].toLocaleLowerCase().replace("_", " ");
        jbs = jbs.filter(j => j.name.includes(caillou));
    } else {
        if (order.material) {
            jbs = jbs.filter(j => j.material == order.material || j.material_category && j.material_category.includes(order.material.toLowerCase()));
        } else if (order.material_category && order.material_category.length > 0) {
            jbs = jbs.filter(j => j.material_category && j.material_category.includes(order.material_category[0].toLowerCase()));
        }
    }

    if (jbs.length == 1) {
        order.jobInfo = jbs[0];
        return jbs[0];
    }

    return null;
}

function TypeIsCraft(typeName) {
    return craftTypes.includes(typeName);
}

function ShowOrderTools(element) {
    var tools = $("#orderTools")[0];
    if (!tools) {
        //duplicate template dom element
        var template = $("#orderToolsTemplate")[0];
        tools = template.cloneNode(true);
        tools.id = "orderTools";
        tools.classList.remove("hidden");
        $("body")[0].appendChild(tools);
    }
    if (element != null) {
        tools.classList.remove("hidden");
        element.appendChild(tools);
    } else {
        tools.classList.add("hidden");
    }
}


function OrderToolStopMe() {
    if (!currentHoverOrder)
        return;

    if (IsTaskPaused(currentHoverOrder, PAUSECHANNEL_ANY)) {
        ResumeTask(currentHoverOrder, PAUSECHANNEL_ONETASK);
        ResumeTask(currentHoverOrder, PAUSECHANNEL_ALLSTASKS);
    } else {
        PauseTask(currentHoverOrder, PAUSECHANNEL_ONETASK);
    }
    UpdateOrdersTable();
}

function OrderToolStopAllAfter() {
    if (!currentHoverOrder)
        return;

    PauseAllTasksFrom(currentHoverOrder);
}

function OrderToolMin() {
    if (!currentHoverOrder)
        return;

    orders = orders.filter(o => o.id !== currentHoverOrder.id);
    orders.push(currentHoverOrder);
    MarkEdited(currentHoverOrder);
    UpdateOrdersTable();
}

function OrderToolMax() {
    if (!currentHoverOrder)
        return;

    orders = orders.filter(o => o.id !== currentHoverOrder.id);
    orders.unshift(currentHoverOrder);
    MarkEdited(currentHoverOrder);
    UpdateOrdersTable();
}

function OrderToolDuplicate() {
    if (!currentHoverOrder)
        return;

    var newOrder = CreateNewOrder(null, currentHoverOrder)
    AddNewOrder(newOrder, currentHoverOrder);
}


function OrderToolDelete() {
    if (!currentHoverOrder)
        return;

    ToggleDeleteOrder(currentHoverOrder);
}

function ToggleGrouping() {
    ToggleOption('stockSorting');
    UpdateOrdersLabels()
    SortStockCells();
}

function ConditionCoderFocused() {
    //select first line of textarea
    $("#conditionCode")[0].select();

    var area = $("#conditionCode")[0];
    var end = area.value.indexOf('\n');

    area.focus();
    area.setSelectionRange(0, end === -1 ? area.value.length : end);
}

function GetJobItem(job) {
    if (!job) {
        Trace("GetJobItem: job is null");
        return null;
    }
    return job.io?.out?.[0]?.item;
}

function GetJobItemName(job) {
    var item = GetJobItem(job);
    if (!item)
        return "";

    return (NoS(item.typeName) + (item.subtypeName ? "!" + item.subtypeName : "")).toUpperCase();
}

function JobMaterialName(job) {
    return (job.material != "" ? job.material : (job.material_category != null && job.material_category.length > 0 ? job.material_category[0] : "ALL")).toUpperCase();
}

function RegisterRawMaterial(mat, domain) {
    if (mat == null || mat == "")
        return false;

    mat = mat.toUpperCase();

    if (materialsGroups.indexOf(mat) != -1)
        return;

    if (materials.indexOf(mat) != -1)
        return;

    gm.materials[mat] ??= {};
    gm.materials[mat].Types ??= [];

    if (mat.endsWith(":WOOD")) {
        gm.materials[mat].Types.push("WOOD");
    } else if (mat.endsWith(":BONE")) {
        gm.materials[mat].Types.push("BONE");
    } else if (mat.endsWith(":LEATHER")) {
        gm.materials[mat].Types.push("LEATHER");
    } else if (mat.startsWith("GLASS")) {
        gm.materials[mat].Types.push("GLASS");
    } else if (mat.startsWith("COAL:")) {
        gm.materials[mat].Types.push("FUEL");
    } else if (mat.endsWith(":DRINK")) {
        gm.materials[mat].Types.push("DRINK");
    } else if (mat.endsWith(":CLOTH")) {
        gm.materials[mat].Types.push("CLOTH");
    } else if (mat.endsWith(":THREAD")) {
        gm.materials[mat].Types.push("THREAD");
    } else if (gm.materials[mat].Types.length == 0) {
        if (materialsGroups.indexOf(mat) == -1)
            gm.materials[mat].Types.push("OTHER");
    }

    gm.materials[mat].Types = [...new Set(gm.materials[mat].Types)];

    switch (domain) {
        case "stock":
            if (!stocksMaterials.includes(mat))
                stocksMaterials.push(mat);
            break;

        case "job":
            if (!jobsMaterials.includes(mat))
                jobsMaterials.push(mat);
            break;
    }

}

function GetStockPool() {
    let pool = [];
    Object.values(gm.items).forEach(item => {
        if (itemTypesRequiringSubtypes.indexOf(item.typeName) != -1 && !item.subtypeName)
            return;

        var key = GetItemTypeAndSubName(item)// (item.isTypeOnly ? item.typeName : item.typeName + "!" + item.subtypeName).toUpperCase();
        if (config.toggleHideMissingItems && !forceAllItemsVisible) {

            if (itemHasJob[key] != true && (!stocks[key] || stocks[key]["ALL"] == 0)) {
                if (config.favoriteStockItems.indexOf(item.typeName) == -1
                    && config.favoriteStockItems.indexOf(item.subtypeName) == -1
                    && config.favoriteStockItems.indexOf(key) == -1) {
                    return;
                }
            }

        }
        pool.push(key.toUpperCase());
    });
    return pool;
}


function GetDisplaybaleMaterialsPool() {
    var mats = [...stocksMaterials];
    //if (!config.toggleHideMissingItems || forceAllItemsVisible)
    mats.push(...jobsMaterials);

    mats = Array.from(new Set(mats));

    return mats.sort((a, b) => {
        var nameA = DisplayableMaterialName(a, 2).toUpperCase();
        var nameB = DisplayableMaterialName(b, 2).toUpperCase();
    });
}



function ToggleMissingItems() {
    ToggleOption('hideMissingItems')
    RefreshStocksFilter();
}

function RefreshStocksFilter() {
    FillStocksTable();
    UpdateInventoryMaterialsPicker();
    FilterItems();
}

function GetItemSubtypeOrType(item) {
    if (item.subtypeName)
        return item.subtypeName;
    return item.typeName;
}

function ToggleFavoriteItem(itemName) {
    config.favoriteStockItems ??= [];
    var index = config.favoriteStockItems.indexOf(itemName);
    if (index >= 0) {
        config.favoriteStockItems.splice(index, 1);
    } else {
        config.favoriteStockItems.push(itemName);
    }
    SaveConfig();

    UpdateFavoriteItemsButtons();
}

function UpdateFavoriteItemsButtons() {
    config.favoriteStockItems ??= [];
    var cells = document.querySelectorAll(".cell")
    cells.forEach(cell => {
        if (cell.classList.contains("favorite"))
            cell.classList.remove("favorite");
    });
    config.favoriteStockItems.forEach(favItemName => {
        $(".cell[item='" + favItemName + "']:not(.favorite)").forEach(cell => {
            cell.classList.add("favorite");
        });
    });
    lastFavorites = config.favoriteStockItems;
    SortStockCells();
}

function CloseDisclaimer() {
    $(".disclaimer")[0].classList.add("hidden");
    config.disclaimerAccepted = true;
    SaveConfig();
}

function ShowDisclaimer() {
    $(".disclaimer")[0].classList.remove("hidden");
}

async function ShowChangelog() {
    await fetch("./CHANGELOG.md").then(async r => {
        var changelog = $(".changelog")[0]
        changelog.querySelector(".versions").innerHTML = "";
        var versionsBlocks = (await r.text()).split("## ");

        versionsBlocks.shift();
        versionsBlocks = versionsBlocks.reverse();

        versionsBlocks.forEach(block => {
            var lines = block.split("\n");
            var version = lines.shift().trim();
            var div = document.createElement("div");
            div.classList.add("versionBlock");
            var details = document.createElement("div");
            details.classList.add("details");
            lines = lines.filter(line => line.trim() != "");
            details.innerHTML = lines.join("<br>\n");
            var versionHeader = document.createElement("h2");
            versionHeader.innerText = version;

            div.appendChild(versionHeader);
            div.appendChild(details);
            changelog.querySelector(".versions").appendChild(div);
        });

        changelog.classList.remove("hidden");
        config.lastSeenChangelogVersion = config.version;
        SaveConfig();
    });
}


function CloseChangelog() {
    $(".changelog")[0].classList.add("hidden");
}

function CloseUpdateInfo() {
    $(".updateInfo")[0].classList.add("hidden");
}


function ToggleSmelting(element, forceRemove) {
    var smid = element.getAttribute("data-smid");
    config["smeltOrders"] ??= [];

    var index = config["smeltOrders"].indexOf(smid);
    var remove = index != -1 || forceRemove

    if (!remove) {
        config["smeltOrders"].push(smid);
    } else {
        config["smeltOrders"].splice(index, 1);
    }

    config["smeltOrders"] = Array.from(new Set(config["smeltOrders"]));

    SaveConfig();
    UpdateSmeltingButtons(true);
}

function CreateSmeltingButtons() {
    smeltingOrders.forEach(order => {
        var mat = order.material;
        if (!mat) {
            reaction = gm.reactions[order.reaction];
            if (reaction) {
                mat = reaction.name;
                mat = mat.replace("make ", "")
                mat = mat.split("bars")[0].trim().toUpperCase();
                mat = "INORGANIC:" + mat.toUpperCase().replaceAll(" ", "_");
            }
        }
        if (mat) {
            order.materialName = DisplayableMaterialName(mat);
        } else {
            cl("Could not determine material name for smelting order:")
            cl(order);
        }

        order.amount_left = 2;
        order.amount_total = 2;

        order.item_conditions.forEach(cond => {
            if (cond.condition == "AtLeast")
                cond.value = config.minResourcesForSmelting;
        });
    })

    var hostSmelt = $(".smeltingTab .oreSmelting .content")[0];
    var hostAlloy = $(".smeltingTab .alloySmelting .content")[0];
    hostSmelt.innerHTML = "";
    hostAlloy.innerHTML = "";

    smeltingOrders.forEach(order => {
        var button = document.createElement("button");
        button.classList.add("smeltButton");
        button.setAttribute("data-smid", order.id);
        button.setAttribute("onclick", "ToggleSmelting(this)");

        var name = "";
        if (order.job == "SmeltOre") {
            name = order.materialName;
            hostSmelt.appendChild(button);
        } else {
            var name = gm.reactions[order.reaction]?.name
            name ??= gm.material;
            name = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
            hostAlloy.appendChild(button);
        }
        name = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
        button.innerHTML = name + "<div class='qtt' title='Available resources'>0</div>";
    });
}

function UpdateSmeltingButtons(updateSmeltingOrders = false) {

    config.smeltOrders ??= [];
    $(".smeltingTab button").forEach(btn => {
        var smid = btn.getAttribute("data-smid");
        if (config.smeltOrders.indexOf(smid) == -1) {
            btn.classList.remove("enabled");
        } else {
            btn.classList.add("enabled");
        }
        let order = smeltingOrders.find(o => o.id == smid);
        if (order) {
            var qtt = 0;
            if (order.job == "SmeltOre") {
                qtt = stocks["BOULDER"]?.[order.material] ?? 0;
            } else {
                var reaction = gm.reactions[order.reaction];
                reaction.reagents.forEach(reac => {
                    if (reac.material) {
                        if (reac.item_type == 0) {
                            //stone
                            qtt += stocks["BOULDER"]?.[reac.material] ?? 0;
                        } else {
                            //bar
                            qtt += stocks["BAR"]?.[reac.material] ?? 0;
                        }
                    }
                });
            }
            var qttLabel = btn.querySelector(".qtt")
            qttLabel.innerText = qtt > 99 ? "99+" : qtt;
        }
    });

    UpdateSmeltingOrders(updateSmeltingOrders);
}

function UpdateSmeltingOrders(doUpdateTable = false) {
    var buttons = $(".smeltingTab button");
    var modified = false;

    config.smeltOrders = [...new Set(config.smeltOrders)];

    buttons.forEach(button => {
        var id = button.getAttribute("data-smid");
        var smeltingOrder = smeltingOrders.find(o => o.id == id);
        if (!smeltingOrder) {
            return;
        }

        var mustAdd = config.smeltOrders.indexOf(id) != -1;

        var existings = orders.filter(order => order.job == smeltingOrder.job
            && ((order.reaction && order.reaction == smeltingOrder.reaction) || (order.material && order.material == smeltingOrder.material)));

        if (!mustAdd) {
            existings.forEach(existing => {
                if (!existing.deleted) {
                    ToggleDeleteOrder(existing, true);
                    modified = true;
                }
            })
        } else if (mustAdd) {
            if (existings.length == 0) {
                newOrder = AddNewOrder(JSON.parse(JSON.stringify(smeltingOrder)));
                newOrder.isNew = true;
                modified = true;
            } else {
                firstDeleted = existings.find(e => e.deleted)
                if (firstDeleted)
                    ToggleDeleteOrder(firstDeleted, true);
            }
        }
    });

    if (doUpdateTable)
        UpdateOrdersTable(false);
}

function GetOrderFromElement(element) {
    var id = element.closest(".orderRow")?.getAttribute("orderId");;
    return GetOrderById(id);
}

function GetOrderById(id) {
    return orders.find(o => o.id == id);
}

function GetOrderProducedItem(order) {
    if (!order)
        return null;

    var job = GetJobFromOrder(order);
    if (!job) {
        Trace("GetOrderProducedItem: could not find job for order id " + order.id);
        return null;
    }

    if (job.reactionName) {
        if (job.reactionName == "BREW_DRINK_FROM_PLANT_GROWTH") {
            return gm.items["DRINK!FRUIT"];
        } else if (job.reactionName == "BREW_DRINK_FROM_PLANT") {
            return gm.items["DRINK!PLANT"];
        }
    }

    if (!job)
        return null;

    if (job.jobTypeName == "PrepareMeal") {
        switch (order.meal_ingredients) {
            case 2:
                return gm.items["FOOD!ITEM_FOOD_BISCUITS"];
            case 3:
                return gm.items["FOOD!ITEM_FOOD_STEW"];
            case 4:
                return gm.items["FOOD!ITEM_FOOD_ROAST"];
        }
    }

    return GetJobItem(job) || null;
}


function SetOrderTargetQtt(order, qttDesired) {

    if (qttDesired <= 0)
        qttDesired = 0;

    if (OrderIsRepeating(order)) {
        var producedItemConditions = GetOrderOutputItemConditions(order)

        if (!producedItemConditions) {
            Trace("Repeating order: could not find condition for output item.");
            return;
        }

        producedItemConditions.forEach(cond => {
            cond.value = qttDesired;
        });
    }

    let min = Math.min(GetOrderBatchSize(), qttDesired);
    order.amount_total = min;
    order.amount_left = min;
    order.item_conditions.forEach(cond => {
        if (cond.condition == "GreaterThan")
            cond.value = min;
    });

    if (!setComboOrderNoLoop) {
        if (order.jobInfo == ligniteCokeJob) {
            setComboOrderNoLoop = true;
            SetJobTargetQtt(bituminousToCokeJob, min);
        }
        if (order.jobInfo == bituminousToCokeJob) {
            setComboOrderNoLoop = true;
            SetJobTargetQtt(ligniteCokeJob, min);
        }
    }
    setComboOrderNoLoop = false;

    UpdateChangedJobQtt(order);
}

function UpdateChangedJobQtt(order) {
    var orderLine = ordersTable.querySelector(`div[orderId='${order.id}']`);
    var qttDesired = GetOrderTargetQtt(order);
    var changed = false;
    if (orderLine) {
        changed = orderLine.querySelector(".property.amount_left .inputNumber").value != qttDesired;
        orderLine.querySelector(".property.amount_left .inputNumber").value = qttDesired;
        orderLine.querySelector(".property.pom_targetQtt .inputNumber").value = qttDesired;
    }

    var job = GetJobFromOrder(order);
    if (!job) {
        cl("Unknown job for order id: " + order.id);
    } else {
        let item = GetJobItem(job);

        if (order.jobInfo?.reactionName == "BREW_DRINK_FROM_PLANT_GROWTH") {
            item = gm.items["DRINK!FRUIT"];
        } else if (order.jobInfo?.reactionName == "BREW_DRINK_FROM_PLANT") {
            item = gm.items["DRINK!PLANT"];
        }
        if (!item) {
            cl("Unknown item for job: " + job.jobTypeName);
        } else {
            UpdateStockItemLine(item);
        }
    }

    if (qttDesired == 0) {
        DeleteOrder(order);
    } else {
        if (order.deleted)
            ToggleDeleteOrder(order)
        if (changed)
            MarkEdited(order);
    }
}

function GetOrderTargetQtt(order) {
    if (!order)
        return 0;

    var item = GetOrderProducedItem(order);
    if (!item)
        return 0;

    var mat = order.material || order.material_category?.[0] || "ALL";
    mat = mat.toUpperCase();

    wanted = GetWantedProduction(item, mat);
    return wanted;
}

function GetOrderProgressPercent(order) {
    var k = 0;
    if (!OrderIsRepeating(order)) {
        k = order.amount_total > 0 ? (order.amount_total - order.amount_left) / order.amount_total : 0;
    } else {
        k = GetOrderCurrentStocks(order) / GetOrderTargetQtt(order);
    }
    return Math.min(1, Math.max(0, k)) * 100;
}

function GetOrderCurrentStocks(order) {
    var item = GetOrderProducedItem(order);
    if (!item)
        return 0;

    var key = GetItemTypeAndSubName(item);
    var mat = GetOrderMaterialName(order).toUpperCase();
    return stocks[key]?.[mat] || 0;
}

function GetItemSimpleName(item) {
    return item.subtypeName ? item.subtypeName : item.typeName;
}

function GetItemTypeAndSubName(item) {
    if (item == undefined)
        return "";

    var key = item.typeName ? item.typeName + "!" + item.subtypeName : item.subtypeName;
    if (item.isTypeOnly)
        key = item.typeName;
    key = key.toUpperCase();
    return key;
}

function OrderIsRepeating(order) {
    return order.item_conditions != null && order.item_conditions.length > 0 && order.item_conditions.some(cond => cond.condition == "LessThan");
}

function GetOrderOutputItemConditions(order) {

    GetJobFromOrder(order);
    if (!order.jobInfo) {
        cl("Cannot set target qtt for order id " + order.id + " because job is unknown.");
        return;
    }

    var job = order.jobInfo
    var outItem = GetJobItem(job);
    if (!outItem) {
        cl("Cannot set target qtt for order id " + order.id + " because output item is unknown.");
        return;
    }

    var isFood = job.jobTypeName == "PrepareMeal"
    if (!order.item_conditions)
        return null;

    return order.item_conditions.filter(cond =>
        cond.condition == "LessThan"
        &&
        (
            (isFood && cond.item_type == "FOOD")
            ||
            (job.isCrafts && craftTypes.includes(cond.item_type))
            ||
            (
                ((cond.item_subtype?.toUpperCase() ?? "") == (outItem.subtypeName?.toUpperCase() ?? ""))
                &&
                ((cond.item_type?.toUpperCase() ?? "") == (SometimesNoS(outItem.typeName?.toUpperCase() ?? "")))
            )
        )
    )
}

function OpenLink(link) {
    window.api.OpenLink(link);
}


function SaveSetting(name, value) {
    config[name] = value;

    switch (name) {
        case "orderBatchSize":
            orders.forEach(order => {
                SetOrderTargetQtt(order, GetOrderTargetQtt(order));
            });
            break;

        case "graphsRedBackground":
            config[name] = value ? 1 : 0;
            RedrawGraphs();
            break;

        case "graphsSpan":
            config[name] = Math.max(min_graphsSpan, Math.min(max_graphsSpan, parseInt(value) || 0));
            RedrawGraphs();
            SetGraphsSpanLabel();
            break;

        case "graphsRate":
            config[name] = Math.max(min_graphsRate, Math.min(max_graphsRate, parseInt(value) || 0));
            nextGraphSave = 0;
            SetGraphsSpanLabel();
            break;

        case "graphsHeight":
            config[name] = Math.max(min_graphsHeight, Math.min(max_graphsHeight, parseInt(value) || 0));
            RedrawGraphs();
            break;

        case "graphsWidth":
            config[name] = Math.max(min_graphsWidth, Math.min(max_graphsWidth, parseInt(value) || 0));
            RedrawGraphs();
            break;
    }
    SaveConfig();
}


function CreateGraph(key, maxValue = null) {
    if (graphBoxes[key])
        return graphBoxes[key];

    let parts = key.split("@");
    let itemName = StockEntryLabel(parts[0], true);

    let div = document.createElement("div");
    {
        div.setAttribute("title", itemName);
        div.classList.add("graph");
        div.setAttribute("data-graphKey", key);

        let svgHost = document.createElement("div");
        svgHost.classList.add("svgHost");
        div.appendChild(svgHost);

        let p = document.createElement("p");
        div.appendChild(p);
        {
            p.classList.add("dataName");
            if (parts.length > 1) {
                p.innerHTML = itemName + " <i>" + parts[1] + "</i>";
            } else {
                p.innerHTML = itemName;
            }
            p.onclick = () => {
                $("#generalFilter")[0].value = itemName;
                $("#generalFilter")[0].dispatchEvent(new Event("change"));
            };
        }

        let span = document.createElement("span");
        div.appendChild(span);
        span.classList.add("qtt");

        span = document.createElement("span");
        div.appendChild(span);
        {
            span.classList.add("max");
            let input = document.createElement("input");
            span.appendChild(input);
            {
                input.type = "number";
                input.classList.add("inputNumber", "graphScale");
                input.addEventListener("keyup", (e) => { SetGraphMax(key, e.target.value); });
                input.addEventListener("change", (e) => { SetGraphMax(key, e.target.value); });
                input.addEventListener("mousedown", (e) => { setTimeout(() => { e.target.select(); }, 25); });
                input.setAttribute("title", "Set the maximum value of the graph. If the stock values exceed this value, the graph will display a dashed line.");
            }
        }

        span = document.createElement("span");
        div.appendChild(span);
        span.classList.add("keyInfo");
        span.innerText = "^CLICK = DELETE";
        div.onclick = () => {
            const k = key;
            if (IsCtrlPressed() || IsShiftPressed())
                ToggleDisplayGraph(k);
        };
    }
    document.querySelector(".graphsContent").appendChild(div);

    SetGraphMax(key, maxValue, false);
    SaveConfig();

    graphBoxes[key] = div;
    return graphBoxes[key];
}

function RedrawGraphs() {
    if (!CheckNoGraphs()) {
        Object.keys(config.graphs).forEach(key => {
            DrawGraph(key);
        });
    }

    document.querySelector(".graphsSpan").style.maxWidth = (GetGraphWidth() + 6) + "px";
    document.querySelector(".graphsSpan").style.minWidth = (GetGraphWidth() + 6) + "px";
}

function CheckNoGraphs() {
    if (config.graphs == null || Object.keys(config.graphs).length == 0) {
        $(".graphsContent")[0].innerHTML = "<div class='noGraphs'>No graphs to display.<br>To add a graph, click on the right side of stock cell (where the stock quantity is).</div>";
        graphBoxes = {};
        config.graphs = {};
        noGraphs = true;
    } else {
        if (noGraphs && $(".graphsContent .noGraphs")[0])
            $(".graphsContent .noGraphs")[0].remove()
        noGraphs = false;
    }
    return noGraphs;
}

function DrawGraph(key) {

    var graph = config.graphs[key];
    let svgHost = CreateGraph(key, graph ? graph.max : null)?.querySelector(".svgHost");
    if (!svgHost) {
        Trace("Could not find graph " + key);
        return;
    }

    let sHisto = stocksHistory[key];
    let noHisto = false;
    if (!stocksHistory[key]) {
        sHisto = [-10];
        noHisto = true;
    }

    //prepend history with -1 values if history is shorter than graphsSpan
    let length = GetGraphsSpan();
    let drawnPoints = Array.from(sHisto);
    while (drawnPoints.length < length)
        drawnPoints.unshift(-10);

    //remove old points if history is longer than graphsSpan
    while (drawnPoints.length > length)
        drawnPoints.shift();

    var graphDiv = graphBoxes[key];
    let max = graph.max;
    graphDiv.querySelector(".graphScale").value = max;

    graphDiv.classList.toggle("autoHeight", max < 0);
    if (max < 0)
        max = drawnPoints.length > 0 ? Math.max(...drawnPoints) : 1;
    max = Math.max(1, max);

    let w = GetGraphWidth();
    let h = GetGraphHeight();
    let solid = true;
    var points = drawnPoints.map((value, index) => {
        var x = ((index / (config.graphsSpan - 1)) * w).toFixed(2);
        var y = Math.max(0, h - (value / max) * h).toFixed(2);
        if (value > max)
            solid = false;
        return { x, y };
    });

    let lastRatio = 0;
    if (config.graphsRedBackground) {
        lastRatio = 1 - Math.min(1, Math.max(0, sHisto[sHisto.length - 1] / max));
        lastRatio -= 0.6;
        lastRatio = Math.max(0, Math.min(1, lastRatio * 2.5));
    }

    var pathData = points.map((point, index) => {
        return (index === 0 ? "M " : "L ") + point.x + " " + point.y;
    }).join(" ");

    graphDiv.style.minWidth = (w + 6) + "px";
    graphDiv.style.maxWidth = (w + 6) + "px";
    graphDiv.style.background = "rgba(" + Interpolate(34, 120, lastRatio) + "," + Interpolate(34, 0, lastRatio) + "," + Interpolate(34, 0, lastRatio) + ",0.6)"
    svgHost.style.height = (h + 12) + "px";
    //if not solid make dashed line
    graphDiv.querySelector(".qtt").innerText = Math.max(0, sHisto.last());

    let strokeDasharray = solid ? "none" : "5 5";

    if (noHisto) {
        svgHost.innerHTML = "<p>Waiting for data...</p>";
    } else {
        svgHost.innerHTML = "<svg viewbox='0 0 " + w + " " + h + "' style='width:" + w + "px;height:" + h + "px' "
            + "xmlns='http://www.w3.org/2000/svg' preserveAspectRatio='none'>"
            + " <path d='" + pathData + "' fill='none' stroke='white' stroke-width='2' stroke-dasharray='" + strokeDasharray + "' /></svg > ";
    }
}


function ToggleDisplayGraph(key, maxValue = null) {
    config.graphs ??= {};

    if (!config.graphs[key]) {
        CreateGraph(key, maxValue);
    } else {
        if (graphBoxes[key])
            graphBoxes[key].remove();
        delete (graphBoxes[key])
        delete (config.graphs[key]);
        SaveConfig();
    }
    RedrawGraphs()
}

function SetGraphMax(key, value, redraw = true) {

    if (value == null) {
        if (config.graphsDefaultAutoHeight) {
            value = -1;
        } else {
            value = GetDefaultGraphMax();
        }
    }
    value = Math.max(-1, value);

    config.graphs[key] = config.graphs[key] || {};
    config.graphs[key].max = value;

    SaveConfig();
    if (redraw)
        DrawGraph(key);
}

function GetGraphsSpan() {
    let old = config.graphsSpan;
    config.graphsSpan = Math.max(min_graphsSpan, Math.min(max_graphsSpan, parseInt(config.graphsSpan) || 10));
    if (old != config.graphsSpan)
        SaveConfig();
    return parseInt(config.graphsSpan);
}

function GetGraphsRate() {
    let old = config.graphsRate;
    config.graphsRate = Math.max(min_graphsRate, Math.min(max_graphsRate, parseInt(config.graphsRate) || 300));
    if (old != config.graphsRate)
        SaveConfig();
    return parseInt(config.graphsRate);
}

function GetGraphHeight() {
    let old = config.graphsHeight;
    config.graphsHeight = Math.max(min_graphsHeight, Math.min(max_graphsHeight, parseInt(config.graphsHeight) || 100));
    if (old != config.graphsHeight)
        SaveConfig();
    return parseInt(config.graphsHeight);
}

function GetGraphWidth() {
    let old = config.graphsWidth;
    config.graphsWidth = Math.max(min_graphsWidth, Math.min(max_graphsWidth, parseInt(config.graphsWidth) || 150));
    if (old != config.graphsWidth)
        SaveConfig();
    return parseInt(config.graphsWidth);
}


function SetGraphsSpanLabel() {
    let spanText = $(".graphsTab .spanTotal")[0];
    var totalTickSpan = config.graphsRate * config.graphsSpan;

    let day = 1200;
    let hour = day / 24;
    let minute = hour / 60;
    if (totalTickSpan <= hour) {
        totalTickSpan = totalTickSpan / minute;
        spanText.innerText = totalTickSpan.toFixed(0) + " minutes";
        return;
    }

    if (totalTickSpan <= day) {
        totalTickSpan = totalTickSpan / hour;
        spanText.innerText = totalTickSpan.toFixed(0) + " hours";
        return;
    }

    totalTickSpan = totalTickSpan / day;
    spanText.innerText = totalTickSpan.toFixed(0) + " days";
}

function Interpolate(min, max, ratio) {
    ratio = Math.max(0, Math.min(1, ratio));
    return min + (max - min) * ratio;
}

window.api.UpdateAvailable(() => {
    $(".updateInfo")[0].classList.remove("hidden");
});

async function ResetPath() {
    result = await window.api.SetDFHackPath();
}