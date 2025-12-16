const $ = (selector) => document.querySelectorAll(selector);

var json;
var clonedOrders;
var fileHandle;
var orders = [];
var conditionJustCopied = false;
var currentHoverOrder = null;
var copiedCondition = null;
var autoSave = false;
var autoRead = false;
var displayedTab = "raw";
var ordersTable = $(".ordersTable")[0];
var isShiftPressed = false;
var mustRead = false;
var mustWrite = false;
var headerReady = false;
var allPaused = false;
var waitForOperation = false;
var autoFillSource = {};
var errorCallback;
var stockReadcompleted = false;
const PAUSECHANNEL_ALLSTASKS = -2;
const PAUSECHANNEL_FROMTASK = -1;
const PAUSECHANNEL_ONETASK = 0;
const PAUSECHANNEL_ANY = -99;
const pauseAll = GetPauseCondition(PAUSECHANNEL_ALLSTASKS);
const pauseFrom = GetPauseCondition(PAUSECHANNEL_FROMTASK);
const pauseOne = GetPauseCondition(PAUSECHANNEL_ONETASK);
var fuses = [];
var currendFuseInput;
var previousSizeMode;
var removeOptionalRows = false;
var wantedProduction = {};
const DELAY_BETWEEN_FILE_OPS_MS = 2500;
var multiFill = false;
var editedConditionsOrder;
var editedConditionsIndex;
var lastFileAccess;
var readingStocks = false;
var isCraftingMaterials = [];
var boardDisplayedMaterials = [];
var boardSelectedMaterials = [];
var boardStaticHeader;
var boardStaticHeaderCorner;
var oldStocks;
var stocks = [];
var tempStocks = [];
var stocksMaterials = [];
var jobs = null;
var _jobsReady = false;
var gameInfo = {};
var sortedItemNames = [];
var abortInit = false;

var sideA;
var sideB;


setInterval(ReloadCss, 2500);
setInterval(ReadWriteWatcher, 333);

function cl(msg) { console.log(msg); }

document.addEventListener("keyup", (e) => {
    if (!e.shiftKey)
        isShiftPressed = false;

    var key = e.key.toLocaleLowerCase();
    if (key == "s") {
        //save
        if (e.ctrlKey) {
            e.preventDefault();
            if (e.shiftKey) {
                ToggleAutoSave();
            } else {
                WriteOrders();
            }
        }
    }
    if (key == "r") {
        //read
        if (e.ctrlKey) {
            e.preventDefault();
            if (e.shiftKey) {
                ToggleAutoRead();
            } else {
                ReadOrders();
            }
        }
    }

    if (key == " ") {
        //pause/resume
        if (e.ctrlKey) {
            if (currentHoverOrder) {
                if (e.shiftKey) {
                    e.preventDefault();
                    PauseAllTasksFrom(currentHoverOrder);
                } else {
                    e.preventDefault();
                    if (IsTaskPaused(currentHoverOrder, PAUSECHANNEL_ONETASK)) {
                        ResumeTask(currentHoverOrder, PAUSECHANNEL_ONETASK);
                    } else {
                        PauseTask(currentHoverOrder, PAUSECHANNEL_ONETASK);
                    }
                    UpdateTable();
                }
            }
        }
    }

    if (key == "x") {
        //delete
        if (e.ctrlKey) {
            e.preventDefault();
            DeleteTask(currentHoverOrder);
        }
    }
    if (key == "z") {
        //cancel changes
        if (e.ctrlKey) {
            e.preventDefault();
            CancelChanges()
        }
    }
    if (key == "w") {
        //switch tab
        if (e.ctrlKey) {
            e.preventDefault();
            if (displayedTab == "board") {
                SetTab("stocks");
            } else {
                SetTab("board");
            }
        }
    }

    if (key == "d") {
        //duplicate
        if (e.ctrlKey) {
            if (currentHoverOrder) {
                e.preventDefault();
                var newOrder = CreateNewOrder(currentHoverOrder)
                AddNewOrder(newOrder, currentHoverOrder);
            }
        }
    }
    if (key == "c") {
        //create
        if (e.ctrlKey) {
            e.preventDefault();
            EditOrder(CreateNewOrder());
        }
    }
    if (key == "e") {
        //edit
        if (e.ctrlKey) {
            if (currentHoverOrder) {
                e.preventDefault();
                EditOrder(currentHoverOrder);
            }
        }
    }

    if (key == "a") {
        //stop all
        if (e.ctrlKey) {
            e.preventDefault();
            PauseAllTasks();
        }
    }

    if (key == "q") {
        //zoom
        if (e.ctrlKey) {
            e.preventDefault();
            CycleSizeMode()
        }
    }

    if (key == "f") {
        //extra cols
        if (e.ctrlKey) {
            e.preventDefault();
            ToggleOption("lessColumns");
        }
    }

    if (key == "g") {
        //swap tool side
        if (e.ctrlKey) {
            e.preventDefault();
            ToggleOption("toolsSide");
        }
    }

    if (key == "escape") {
        CloseAllPopups();
    }
});

document.addEventListener("DOMContentLoaded", async (event) => {
    fileHandle = await window.api.GetFileHandle();

    await InitData();
    /*
    data["items"] = await window.api.GetGameDefs("data/vanilla/vanilla_items/objects/");
    data["materials"] = await window.api.GetGameDefs("data/vanilla/vanilla_materials/objects/");
    data["materials"].push("INORGANIC");
    data["reactions"] = await window.api.GetGameDefs("data/vanilla/vanilla_reactions/objects/");
    
    var itemTypes = data["items"].concat(data["types"]);
    fuses["itemTypes"] = new Fuse(itemTypes);
    fuses["materials"] = new Fuse(data["materials"]);
    fuses["reactions"] = new Fuse(data["reactions"]);
    fuses["flags"] = new Fuse(data["flags"]);
    fuses["types"] = new Fuse(data["types"]);
    */

    boardStaticHeader = $(".boardTableHeader")[0];
    $("body")[0].addEventListener("mouseup", (e) => { BackgroundClicked() });
    $("body")[0].addEventListener("keydown", (e) => { OnGeneralKeyDown(e) });
    $("#boardMaterialsFilter")[0].addEventListener("mouseup", (e) => { e.stopPropagation(); });
    $(".boardMaterialsPicker")[0].addEventListener("mouseup", (e) => { e.stopPropagation(); });
    $(".boardBody")[0].addEventListener("scroll", (e) => {
        boardStaticHeader.style.transform = `translateX(-${e.target.scrollLeft}px)`;
        boardStaticHeaderCorner ??= $(".boardTableHeader .corner")[0];
        if (boardStaticHeaderCorner)
            boardStaticHeaderCorner.style.transform = `translateX(${e.target.scrollLeft}px)`;
    });
    sideA = $(".boardBody .itemsSide")[0];
    sideB = $(".boardBody .valuesSide")[0];

    PrepareInput($("input#conditionValue")[0]);
    InitStockTable()
    SetTab("raw");
});

async function InitData() {

    errorCallback = InitData;
    await GetGameInfos();
    if (abortInit)
        return;

    GetSetBoardSelectedMaterials();
    if (abortInit)
        return;

    await ToggleBoardMaterialSelected("!0ALL");
    if (abortInit)
        return;

    await CycleSizeMode(true);
    if (abortInit)
        return;

    await ToggleOption("lessColumns", true);
    if (abortInit)
        return;

    await ReadOrders();
    if (abortInit)
        return;

    ReadStocksBatch();

    errorCallback = null;
}

function CheckError(data) {
    if (data == null) {
        //output error to console
        console.error("No data received from main process.");


        PopInfo("Error", "No data received from main process.");
        return true;
    }
    if (data.error != undefined) {
        PopInfo(data.error.title, data.error.msg, data.context, data.buttons, errorCallback);
        return true;
    }
}

async function GetSetBoardSelectedMaterials(newSelection) {
    boardSelectedMaterials = await window.api.BoardSelectedMaterials(newSelection);
    if (CheckError(boardSelectedMaterials))
        return;
}

async function GetGameInfos() {
    gameInfo = await window.api.GetGameInfos();
    if (CheckError(gameInfo))
        return;

    sortedItemNames = Object.keys(gameInfo.items).map(key => gameInfo.items[key].name);
    sortedItemNames.sort((a, b) => {
        return a.localeCompare(b);
    });
    //remove duplicates
    sortedItemNames = [...new Set(sortedItemNames)];

    Object.keys(gameInfo.reactions).forEach(key => {
        var reaction = gameInfo.reactions[key];
        reaction.reagents.forEach(reagent => {
            reagent.itemName = gameInfo.itemTypes[reagent.itemType] ?? ""
            reagent.material = gameInfo.materials[reagent.mat_index] ?? ""
        })
    });
}

var propertiesInfos = [
    {
        name: "id",
        displayName: "ID",
        visible: false,
        numeric: true,
    },
    {
        name: "is_active",
        displayName: "⚙", //gear icon
        visible: true,
        compactable: true,
        yesno: true,
    },
    {
        name: "is_validated",
        displayName: "✔",
        visible: true,
        compactable: true,
        yesno: true,
    },
    {
        name: "job",
        displayName: "Job",
        visible: true,
        search: true,
    },
    {
        name: "reaction",
        displayName: "Job",
        visible: false,
    },
    {
        name: "item_subtype",
        displayName: "Item",
        visible: false,
    },
    {
        name: "material",
        displayName: "Material",
        visible: true,
    },
    {
        name: "material_category",
        displayName: "Material Category",
        visible: false,
    },

    {
        name: "amount_left",
        displayName: "Left",
        isInput: true,
        visible: true,
        numeric: true,
    },
    {
        name: "amount_total",
        displayName: "Goal",
        isInput: true,
        visible: true,
        numeric: true,
    },
    {
        name: "frequency",
        displayName: "Check freq.",
        visible: true,
        compactable: true,
    },
    {
        name: "item_conditions",
        displayName: "Conds.",
        visible: true,
    },
    {
        name: "max_workshops",
        displayName: "Wrk",
        visible: true,
        isInput: true,
        numeric: true,
    },

]

function DragStart(e) {
    e.dataTransfer.setData("text/plain", null);
    var from = Array.from(e.target.parentElement.children);
    e.dataTransfer.setData("orderIndex", from.indexOf(e.target));
}

function DragOver(e) {
    e.preventDefault();
    e.target.parentElement.classList.add("dragOver");
}

function DragLeave(e) {
    e.preventDefault();
    $(".dragOver").forEach(el => el.classList.remove("dragOver"));
}

function DragDrop(e) {
    e.preventDefault();
    $(".dragOver").forEach(el => el.classList.remove("dragOver"));
    const fromIndex = e.dataTransfer.getData("orderIndex") - 1;
    const toIndex = Array.from(ordersTable.children).indexOf(e.target.parentElement) - 1;
    if (fromIndex === toIndex)
        return;
    const movedOrder = orders.splice(fromIndex, 1)[0];

    orders.splice(toIndex, 0, movedOrder);

    if (toIndex > fromIndex) {
        ordersTable.insertBefore(ordersTable.children[fromIndex + 1], ordersTable.children[toIndex + 2]);
    } else {
        ordersTable.insertBefore(ordersTable.children[fromIndex + 1], ordersTable.children[toIndex + 1]);
    }
    if (autoSave)
        MarkForSave(true);
}


function UpdateTable(forceRedrawConditions = false) {
    var orderlines = $(".ordersTable .orderRow")
    orderlines.forEach(line => {
        //dont delete the header line
        if (line.classList.contains("header"))
            return;
        if (orders.find(o => o.id == line.getAttribute("orderId")) == null)
            line.remove()
    });
    ordersTable = $(".ordersTable")[0];


    if (!headerReady) {
        newLine = document.createElement("div");
        newLine.classList.add("orderRow", "header");
        propertiesInfos.forEach(prop => {
            if (prop.visible === false)
                return;
            var cell = document.createElement("div");
            cell.classList.add("property", "head", prop.name);
            if (prop.compactable)
                cell.classList.add("optionalCol");

            if (prop.numeric)
                cell.classList.add("num");

            if (prop.yesno)
                cell.classList.add("yesno");

            cell.textContent = prop.displayName;

            if (prop.search) {
                var input = document.createElement("input");
                input.type = "text";
                input.classList.add("searchInput", prop.name, "autofocus");
                input.placeholder = "Search...";
                input.addEventListener("keyup", (e) => {
                    var searchTerm = e.target.value.toLowerCase();
                    FilterJobs(searchTerm);
                });
                input.addEventListener("focus", (e) => {
                    e.target.value = "";
                });
                cell.appendChild(input);
            }

            newLine.appendChild(cell);
        });

        var toolZone = document.createElement("div");
        toolZone.classList.add("toolZone", "head");
        newLine.appendChild(toolZone);

        headerReady = true;
        ordersTable.appendChild(newLine);
    }

    orders.forEach(order => {

        if (order.conditionsHovered)
            return;

        var editedLine = ordersTable.querySelector(`div[orderId='${order.id}']`);
        var orderIndex = orders.indexOf(order);

        if (editedLine == null) {
            editedLine = document.createElement("div");
            editedLine.classList.add("orderRow");
            editedLine.draggable = true;
            editedLine.setAttribute("orderId", order.id);

            editedLine.addEventListener("dragstart", (e) => { DragStart(e); });
            editedLine.addEventListener("dragover", (e) => { DragOver(e); });
            editedLine.addEventListener("dragleave", (e) => { DragLeave(e); });
            editedLine.addEventListener("drop", (e) => { DragDrop(e); });
            editedLine.addEventListener("mouseenter", (e) => { currentHoverOrder = GetOrderFromElement(e.currentTarget); });
            editedLine.addEventListener("mousemove", (e) => { currentHoverOrder = GetOrderFromElement(e.currentTarget); });
            editedLine.addEventListener("mouseleave", (e) => { currentHoverOrder = null; });

            var toolZone = document.createElement("div");
            toolZone.classList.add("toolZone");
            editedLine.appendChild(toolZone);

            button = CreateRowButton(["btnToggleMe"], "⏹", (e) => {
                myOrder = GetOrderFromElement(e.currentTarget);
                if (IsTaskPaused(myOrder, PAUSECHANNEL_ONETASK)) {
                    ResumeTask(myOrder, PAUSECHANNEL_ONETASK);
                    UpdateTable();
                } else {
                    PauseTask(myOrder, PAUSECHANNEL_ONETASK);
                    UpdateTable();
                }
            });
            AddKeyInfo(button, "(CTRL+SPACE)");
            toolZone.appendChild(button);

            button = CreateRowButton(["btnStopAllAfter"], "⏹⇓", (e) => {
                myOrder = GetOrderFromElement(e.currentTarget);
                PauseAllTasksFrom(myOrder);
            });
            AddKeyInfo(button, "(CTRL+SHIFT+SPACE)");
            toolZone.appendChild(button);

            button = CreateRowButton(["btnDuplicate"], "⧉", (e) => {
                myOrder = GetOrderFromElement(e.currentTarget);
                var newOrder = CreateNewOrder(myOrder)
                AddNewOrder(newOrder, myOrder);
            });
            toolZone.appendChild(button);
            AddKeyInfo(button, "(CTRL+D)");

            button = CreateRowButton(["btnMax", "optionalCol"], "⇈", (e) => {
                myOrder = GetOrderFromElement(e.currentTarget);
                orders = orders.filter(o => o.id !== myOrder.id);
                orders.unshift(myOrder);
                MarkEdited(myOrder);
                if (autoSave)
                    MarkForSave();
                UpdateTable();
            });
            AddKeyInfo(button, "(CTRL+V)");
            toolZone.appendChild(button);

            button = CreateRowButton(["btnMin", "optionalCol"], "⇊", (e) => {
                myOrder = GetOrderFromElement(e.currentTarget);
                orders = orders.filter(o => o.id !== myOrder.id);
                orders.push(myOrder);
                MarkEdited(myOrder);
                if (autoSave)
                    MarkForSave();
                UpdateTable();
            });
            AddKeyInfo(button, "(CTRL+B)");
            toolZone.appendChild(button);

            button = CreateRowButton(["btnDelete"], "✖", (e) => {
                myOrder = GetOrderFromElement(e.currentTarget);
                DeleteTask(myOrder);
            });
            AddKeyInfo(button, "(CTRL+X)");
            toolZone.appendChild(button);

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

        if (order.material === undefined)
            order.material = "";

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

            if (propInfo.compactable)
                cell.classList.add("optionalCol");

            if (propInfo.isToggle) {
                cell.classList.add("toggleable");
                cell.addEventListener("mouseup", (e) => {
                    e.stopPropagation();

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

                var progressBar = editedLine.querySelector(`.property.${property} .progressBar`);
                if (!progressBar) {
                    progressBar = document.createElement("div");
                    progressBar.classList.add("progressBar");
                    progressBar.text = "."
                    cell.appendChild(progressBar);
                }
                progressBar.style.width = ((order.amount_total - order.amount_left) / order.amount_total * 100) + "%";
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

                var input = editedLine.querySelector(`.property.${property} .inputNumber`);
                if (!input) {
                    input = CreateInputRaw(InputChangeCallback_PropertyValue, order, property, -1);
                    cell.appendChild(input);
                }
                input.value = order[property];

            } else if (property == "item_conditions") {

                var i = 0;

                var numDiv = editedLine.querySelector(`.property.${property} .conditionsNum`);
                if (!numDiv) {
                    numDiv = document.createElement("div");
                    numDiv.classList.add("conditionsNum");
                    numDiv.addEventListener("mouseenter", (e) => { ConditionEditHover(e); });
                    numDiv.addEventListener("mouseleave", (e) => { ConditionEditLeave(e); });
                    cell.appendChild(numDiv);
                }

                var conditions = order[property];

                //remove all conditions that correspond to a PauseCondition object
                conditions = conditions.filter(cond => !(cond.condition === pauseAll.condition && cond.value === pauseAll.value));
                conditions = conditions.filter(cond => !(cond.condition === pauseFrom.condition && cond.value === pauseFrom.value));
                conditions = conditions.filter(cond => !(cond.condition === pauseOne.condition && cond.value === pauseOne.value));

                numDiv.textContent = conditions.length > 0 ? conditions.length + " cond." : "-";

                //remove container if exists
                container = editedLine.querySelector(`.property.${property} .conditionsContainer`);
                if (!container || forceRedrawConditions) {
                    if (container)
                        container.remove();

                    container = document.createElement("div");
                    container.classList.add("conditionsContainer");
                    cell.appendChild(container);
                }

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
                            CopyCondition(order, conditions.indexOf(condition));
                        });
                        partsHost.appendChild(delButton);

                        var delButton = document.createElement("button");
                        delButton.classList.add("btnDelete");
                        delButton.textContent = "✖";
                        delButton.addEventListener("mouseup", (e) => {
                            e.stopPropagation();
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
                                input = CreateInputRaw(InputChangeCallback_ConditionValue, order, property, i);
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
                                        ShowConditionEditor(order, index);
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
                        PasteCondition(order);
                    });
                    buts.appendChild(button);
                } else {
                    buts.appendChild(pasteCondButton[0]);
                }
                var addCondButton = container.querySelectorAll(".btnAddCondition");
                if (addCondButton.length == 0) {
                    var button = document.createElement("button");
                    button.textContent = "+";
                    button.classList.add("btnAddCondition");
                    button.addEventListener("mouseup", (e) => {
                        e.stopPropagation();
                        AddCondition(order);
                    });
                    buts.appendChild(button);
                } else {
                    buts.appendChild(addCondButton[0]);
                }

                container.appendChild(buts);
                container.querySelectorAll(".btnPaste")[0].classList.toggle("disabled", copiedCondition == null);

            } else {

                cell.innerHTML = "<div>" + cellText + "</div>";

                if (property == "job") {
                    var progressBar = editedLine.querySelector(`.property.${property} .progressBar`);
                    if (!progressBar) {
                        progressBar = document.createElement("div");
                        progressBar.classList.add("progressBar");
                        progressBar.text = "."
                        cell.appendChild(progressBar);
                    }
                    progressBar.style.width = ((order.amount_total - order.amount_left) / order.amount_total * 100) + "%";
                }

            }

            possibleProperties = possibleProperties.filter(prop => prop.name !== property);
        }

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
        if (IsTaskPaused(order, PAUSECHANNEL_ONETASK)) {
            ordersTable.querySelector(`div[orderId='${order.id}']`).classList.add("pauseOne");
        } else {
            ordersTable.querySelector(`div[orderId='${order.id}']`).classList.remove("pauseOne");
        }

        if (IsTaskPaused(order, PAUSECHANNEL_FROMTASK)) {
            ordersTable.querySelector(`div[orderId='${order.id}']`).classList.add("pauseFrom");
        } else {
            ordersTable.querySelector(`div[orderId='${order.id}']`).classList.remove("pauseFrom");
        }

        if (IsTaskPaused(order, PAUSECHANNEL_ALLSTASKS)) {
            ordersTable.querySelector(`div[orderId='${order.id}']`).classList.add("pauseAll");
        } else {
            ordersTable.querySelector(`div[orderId='${order.id}']`).classList.remove("pauseAll");
        }
    });

}

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
    if (autoSave)
        MarkForSave(true);

    UpdateTable();
    ShowConditionEditor(order, order.item_conditions.length - 1);
}

function DeleteCondition(order, conditionIndex) {
    order.item_conditions.splice(conditionIndex, 1);
    MarkEdited(order);
    UpdateTable(true);

    if (autoSave)
        MarkForSave();
}

function CopyCondition(order, conditionIndex) {
    copiedCondition = order.item_conditions[conditionIndex];
    conditionJustCopied = true;
}

function PasteCondition(order) {
    if (copiedCondition == null)
        return;

    order.item_conditions.push(copiedCondition);
    MarkEdited(order);
    UpdateTable(true);
    if (autoSave)
        MarkForSave(true);
}

function ShowConditionEditor(order, conditionIndex) {
    if (conditionJustCopied) {
        conditionJustCopied = false;
        return;
    }

    condition = order.item_conditions[conditionIndex];
    if (!condition)
        return;
    editedConditionsOrder = order;
    editedConditionsIndex = conditionIndex;
    var editor = $(".conditionEditor")[0];

    $("#conditionEditorTitle")[0].textContent = GetOrderJobLabel(order) + " : " + GetOrderMaterialLabel(order);

    editor.querySelector("#itemType").value = condition.item_subtype ? condition.item_subtype : condition.item_type;
    editor.querySelector("#itemFlag").value = condition.flags ? condition.flags.join(",") : "";
    editor.querySelector("#itemMaterial").value = condition.material ? condition.material : "";
    editor.querySelector("#itemReactable").value = condition.reaction_product ? condition.reaction_product : "";
    editor.querySelector("#operator").value = condition.condition;
    editor.querySelector("#conditionValue").value = condition.value;
    Show($(".conditionEditor"));
}


function MarkForSave(immediate = false) {
    mustWrite = true;
    if (immediate)
        WriteOrders();
}

async function ReadWriteWatcher() {
    var currentFileAccess = Date.now();
    if (lastFileAccess == undefined)
        lastFileAccess = currentFileAccess;

    var timePassed = currentFileAccess - lastFileAccess;
    if (timePassed < DELAY_BETWEEN_FILE_OPS_MS) {
        return;
    }

    //check if any condition editor is opened
    var hovered = editedConditionsOrder != null || document.querySelector(".conditionEditor:hover") || document.querySelector(".item_conditions:hover");
    if (hovered != null || waitForOperation)
        return;

    if (mustWrite) {
        mustWrite = false;
        cl("Sending update...");
        lastFileAccess = Date.now();
        await WriteOrders();
        lastFileAccess = Date.now();
    } else if (mustRead || autoRead) {
        mustRead = false;
        cl("Requesting update...");
        lastFileAccess = Date.now();
        await ReadOrders();
        lastFileAccess = Date.now();
    }

}

function CancelChanges() {
    orders = [];
    ReadOrders();
}

async function ReadOrders() {
    waitForOperation = true;

    json = await window.api.ReadFile();
    if (CheckError(json))
        return;

    if (json == undefined) {
        waitForOperation = false;
        $("body")[0].classList.add("noFileSelected");
        return;
    }

    $("body")[0].classList.remove("noFileSelected");
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
                        if (prop.name === "item_conditions" && editedConditionsOrder != null && editedConditionsOrder.id == oldLine.id)
                            BackgroundClicked();
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

    UpdateWantedProduction();

    UpdateTable();
    waitForOperation = false;
}

async function WriteOrders() {
    //check if any new, edited or deleted orders exist
    var hasChanges = orders.some(o => o.edited === true || o.deleted === true || o.isNew === true);
    if (!hasChanges)
        return;

    fileHandle ??= await window.api.GetFileHandle();
    if (!fileHandle) {
        $("body")[0].classList.add("noFileSelected");
        return;
    }
    $("body")[0].classList.remove("noFileSelected");

    waitForOperation = true;

    //remove deleted
    orders = orders.filter(o => o.deleted !== true);

    //clear edited flags
    //remove "edited" property from all orders
    orders.forEach(order => { if (order.edited) delete order.edited; });

    //remove empty properties
    clonedOrders = CloneOrdersNoDom(orders);
    clonedOrders.forEach(order => {
        DeleteEmptyKeys(order);
    });

    await window.api.WriteFile(JSON.stringify(clonedOrders, null, 2));
    waitForOperation = false;
    UpdateTable();
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
            const v = CloneOrdersNoDom(orders[k]);
            if (v !== undefined)
                out[k] = v;
        }
        return out;
    }

    return orders;
}

onmessage = async (e) => {
    // Retrieve message sent to work from main script
    const message = e.data;

    // Get handle to draft file
    const root = await navigator.storage.getDirectory();
    const draftHandle = await root.getFileHandle("draft.txt", { create: true });
    // Get sync access handle
    const accessHandle = await draftHandle.createSyncAccessHandle();

    // Get size of the file.
    const fileSize = accessHandle.getSize();
    // Read file content to a buffer.
    const buffer = new DataView(new ArrayBuffer(fileSize));
    const readBuffer = accessHandle.read(buffer, { at: 0 });

    // Write the message to the end of the file.
    const encoder = new TextEncoder();
    const encodedMessage = encoder.encode(message);
    const writeBuffer = accessHandle.write(encodedMessage, { at: readBuffer });

    // Persist changes to disk.
    accessHandle.flush();

    // Always close FileSystemSyncAccessHandle if done.
    accessHandle.close();
};


function ReloadCss() {
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

function ToggleAutoSave() {
    autoSave = !autoSave;
    const autoSaveBtn = document.getElementById("autoSave");
    autoSaveBtn.classList.toggle("active", autoSave);

    if (autoSave)
        MarkForSave();
}

function ToggleAutoRead() {
    autoRead = !autoRead;
    const autoReadBtn = document.getElementById("autoRead");
    autoReadBtn.classList.toggle("active", autoRead);
}

function CreateInputRaw(onChangeCallback, orderObject, affectedProperty, conditionIndex = -1) {
    input = document.createElement("input");
    input.type = "number";
    input.value = conditionIndex > -1 ? orderObject["item_conditions"][conditionIndex].value : orderObject[affectedProperty];
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
    input.addEventListener("wheel", (e) => {
        e.preventDefault();
        var delta = Math.sign(e.deltaY);
        if (isShiftPressed)
            delta *= 5;
        var curVal = e.target.value;
        curVal = curVal === "" ? 0 : curVal;
        var newValue = Math.max(0, parseInt(curVal) - delta);
        e.target.value = newValue;
        var event = new Event('change');
        e.target.dispatchEvent(event);
    });

    if (onChangeCallback != null) {
        input.addEventListener("change", (e) => { onChangeCallback(e); });
    }
}

function InputChangeCallback_PropertyValue(e) {
    var id = e.target.getAttribute("orderId");
    var order = orders.find(o => o.id == id);

    MarkEdited(order);
    var prop = e.target.getAttribute("affectedProp");
    order[prop] = parseInt(e.target.value);
    order[prop + "_cell"].childNodes[0].nodeValue = order[prop];
    if (autoSave)
        MarkForSave();
}

function InputChangeCallback_ConditionValue(e) {
    var id = e.target.getAttribute("orderId");
    var order = orders.find(o => o.id == id);
    var condIndex = e.target.getAttribute("conditionIndex");

    MarkEdited(order);
    var condition = order["item_conditions"][condIndex];
    condition.value = parseInt(e.target.value);
    condition.value_element.value = condition.value;
    if (autoSave)
        MarkForSave();
}

function MarkEdited(order) {
    order.edited = true;
    var line = ordersTable.querySelector(`div[orderId='${order.id}']`);
    if (line)
        line.classList.add("edited");
}


function GetOrderFromElement(element) {
    var id = element.closest(".orderRow")?.getAttribute("orderId");;
    return orders.find(o => o.id == id);
}


function PauseAllTasks() {
    allPaused = !allPaused;
    const pauseAllBtn = document.getElementById("pauseAll");
    pauseAllBtn.classList.toggle("active", allPaused);

    orders.forEach(order => {
        if (allPaused) {
            PauseTask(order, PAUSECHANNEL_ALLSTASKS);
        } else {
            ResumeTask(order, PAUSECHANNEL_ALLSTASKS);
        }
    });
    UpdateTable();
}

function PauseAllTasksFrom(myOrder) {
    var index = orders.findIndex(o => o.id === myOrder.id);

    if (index === -1)
        return;

    var paused = IsTaskPaused(myOrder, PAUSECHANNEL_FROMTASK);

    for (let i = index; i < orders.length; i++) {
        var order = orders[i];
        if (paused) {
            ResumeTask(order, PAUSECHANNEL_FROMTASK);
        } else {
            PauseTask(order, PAUSECHANNEL_FROMTASK);
        }
    }
    UpdateTable();
}

function PauseTask(order, stopChannel = 0) {
    var pauseCondition = GetPauseCondition(stopChannel);

    if (!order.item_conditions)
        order.item_conditions = [];

    if (order.item_conditions.findIndex(cond => cond.condition === pauseCondition.condition && cond.value === pauseCondition.value) === -1) {
        order.item_conditions.push(pauseCondition);
    }

    MarkEdited(order);
    if (autoSave)
        MarkForSave();
}

function ResumeTask(order, stopChannel = 0) {
    var pauseCondition = GetPauseCondition(stopChannel);

    if (!order.item_conditions)
        order.item_conditions = [];
    order.item_conditions = order.item_conditions.filter(cond => !(cond.condition === pauseCondition.condition && cond.value === pauseCondition.value));

    MarkEdited(order);
    if (autoSave)
        MarkForSave();
}

function IsTaskPaused(order, stopChannel = 0) {
    if (stopChannel === PAUSECHANNEL_ANY)
        return order.item_conditions.findIndex(cond => cond.condition === pauseCondition.condition && cond.value <= 0) !== -1;

    var pauseCondition = GetPauseCondition(stopChannel);

    if (!order.item_conditions)
        return false;
    return order.item_conditions.findIndex(cond => cond.condition === pauseCondition.condition && cond.value === pauseCondition.value) !== -1;
}

function GetPauseCondition(stopChannel = 0) {
    return {
        condition: "LessThan",
        value: stopChannel
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

function FilterJobs(searchTerm) {
    var orderLines = $(".ordersTable .orderRow");
    orderLines.forEach(line => {
        if (line.classList.contains("header"))
            return;
        var jobCell = line.querySelector(".property.job");
        var jobName = jobCell ? jobCell.textContent.toLowerCase() : "";
        if (jobName.includes(searchTerm)) {
            line.classList.remove("hidden");
        } else {
            line.classList.add("hidden");
        }
    });
}


function SetAutoFill(input, category, allowMultiples) {
    $(".autocompleteList").forEach(el => el.innerHTML = "");

    multiFill = allowMultiples;
    autoFillSource[input.getAttribute("id")] = category;
    currendFuseInput = input;
    if (currendFuseInput != null)
        currendFuseInput.removeEventListener("input", AutoFillFieldChanged);
    currendFuseInput.addEventListener("input", AutoFillFieldChanged);
}

function AutoFillFieldChanged(event) {
    var input = event.target;
    var id = input.getAttribute("id");
    var data = autoFillSource[input.getAttribute("id")];
    fuses[id] ??= new Fuse(data);
    var tags = input.value.split(",");
    var results = fuses[id].search(tags[tags.length - 1].trim());
    var list = input.nextElementSibling;
    list.innerHTML = "";
    results.slice(0, 10).forEach(result => {
        var line = document.createElement("div");
        line.classList.add("autocompleteItem");
        line.textContent = result.item;
        list.appendChild(line);
        line.addEventListener("mouseup", (e) => {
            e.stopPropagation();
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
    var category = input.getAttribute("category");

    if (input.getAttribute("tagsMode")) {
        var tags = input.value.split(",");
        tags = tags.map(t => t.trim());
        tags = tags.filter(t => t !== "");
        tags = [...new Set(tags)];

        var validTags = [];
        if (tags) {
            tags.forEach(tag => {
                if (data[category].findIndex(v => v == tag) != -1) {
                    validTags.push(tag);
                    if (!multiFill)
                        return;
                }
            });
        }

        input.value = validTags.join(",");
    }
    var event = new Event("change");
    input.dispatchEvent(event);

}


function ConditionEdited(elem) {
    var order = editedConditionsOrder;
    var condition = order.item_conditions[editedConditionsIndex];
    var property = elem.getAttribute("property");
    MarkEdited(order);

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

    if (autoSave)
        MarkForSave();
}

function ConditionEditHover(e) {
    var order = GetOrderFromElement(e.currentTarget);
    order.conditionsHovered = true;
}

function ConditionEditLeave(e) {
    var order = GetOrderFromElement(e.currentTarget);
    order.conditionsHovered = false;
}

function CloseConditionEditor() {
    $(".conditionEditor")[0].classList.add("hidden");

    if (editedConditionsOrder != null)
        UpdateTable();

    editedConditionsOrder = null;
}

function CreateNewOrder(orderToDuplicate = null) {
    var myOrder;
    if (orderToDuplicate = null) {
        //clone current hover order
        myOrder = JSON.parse(JSON.stringify(orderToDuplicate = null));
        myOrder.isNew = true;
        myOrder.edited = true;
        myOrder.amount_left = myOrder.amount_total;
    } else {
        myOrder = {
            job: "",
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
    }

    return myOrder;
}

function AddNewOrder(newOrder, afterOrder = null) {
    if (afterOrder) {
        //insert after hovered order (for duplications)
        var index = orders.findIndex(o => o.id === afterOrder.id);
        orders.splice(index + 1, 0, newOrder);
    } else {
        orders.push(newOrder);
    }

    newOrder.id = orders.reduce((maxId, o) => Math.max(maxId, o.id), 0) + 1;
    MarkEdited(newOrder);

    UpdateTable();

    if (autoSave)
        MarkForSave();

    //scroll to new order
    setTimeout(() => {
        var newLine = ordersTable.querySelector(`div[orderId='${newOrder.id}']`);
        newLine.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
}

async function ToggleOption(name, noSwitch = false) {
    option = await window.api.ToggleOption(name, noSwitch);
    if (CheckError(option))
        return;
    $("body")[0].classList.toggle("option_" + name, option);
}


function DeleteTask(order) {
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
    if (autoSave)
        MarkForSave();
    UpdateTable();
}



function SetTab(tab) {
    displayedTab = tab;

    $("#tabBoard")[0].classList.remove("active");
    $("#tabRaw")[0].classList.remove("active");
    $(".boardMode")[0].classList.add("hidden");
    $(".rawMode")[0].classList.add("hidden");

    switch (tab) {
        case "board":
            $("#tabBoard")[0].classList.add("active");
            $(".boardMode")[0].classList.remove("hidden");
            break;

        default:
            $("#tabRaw")[0].classList.add("active");
            $(".rawMode")[0].classList.remove("hidden");
            break;
    }
}

function BackgroundClicked() {

    switch (displayedTab) {
        case "board":
            var picker = $(".boardMaterialsPickerHost")[0];
            if (!picker.classList.contains("hidden")) {
                picker.classList.add("hidden");
            } else {
                $(".boardTableHeader .corner input")[0].value = ''
                $(".boardTableHeader .corner input")[0].focus();
                UpdateBoardItemFilter('');
            }
            break;

        case "raw":
            var searchInput = $(".ordersTable .searchInput")[0];
            if (searchInput) {
                searchInput.focus();
                FilterJobs("");
            }
            break;

    }
}

async function CycleSizeMode(noChange) {
    if (previousSizeMode != undefined) {
        $("body")[0].classList.remove("sizemode_" + previousSizeMode);
    }
    var size = await window.api.CycleSizeMode(noChange);
    if (CheckError(size))
        return;

    $("body")[0].classList.add("sizemode_" + size);
    previousSizeMode = size;
}

function CreateRowButton(classes, text, callback) {
    var buttonHost = document.createElement("button");
    buttonHost.classList.add("rowTool");
    classes.forEach(c => buttonHost.classList.add(c));

    var button = document.createElement("div");
    button.textContent = text;
    buttonHost.appendChild(button);

    buttonHost.addEventListener("mouseup", (e) => {
        e.stopPropagation();
        callback(e)
    });

    return buttonHost;
}

function GetOrderJobLabel(order) {
    var text = order["reaction"] ? order["reaction"] : order["job"];
    if (text.startsWith("Make") && order["item_subtype"] != undefined)
        text = order["item_subtype"];

    if (text == "PrepareMeal")
        text += " (" + order.meal_ingredients + " ingredients)";

    return text;
}

function GetOrderMaterialLabel(order) {
    var text = "";
    if (order["material_category"] != null) {
        text = order["material_category"].toString();
    } else {
        text = order["material"];
    }
    text = text.toLocaleLowerCase();
    text = text.replace("native_", "");
    text = text.replace("inorganic:", "");
    text = text.replace("inorganic", "Rock (Inorganic)");

    return text;
}



function ChangeWantedProduction(e) {
    /*
    var item = e.target.getAttribute("itemType");
    var mat = e.target.getAttribute("material");
    if (!wantedProduction[item])
        wantedProduction[item] = {};
    wantedProduction[item][mat] = parseInt(e.target.value);
    var cell = e.target.closest(".boardCell");
    cell.setAttribute("totalVal", (stocks[item][mat] ? stocks[item][mat] : 0) + wantedProduction[item][mat]);
    */
}


function ItemLabelNoGroup(itemName) {
    itemName = itemName.replace("ITEM_", "");
    itemName = itemName.replace(/_/g, " ");
    itemName = itemName.split(":")
    return itemName[itemName.length - 1];
}

function ItemLabelGroup(itemName) {
    itemName = itemName.replace("ITEM_", "");
    itemName = itemName.replace(/_/g, " ");
    return itemName;
}

async function ReadJobsBatch() {
    if (readingStocks)
        return;

    readingStocks = true;
    await window.api.GetJobsInfos().then((data) => {

        if (data == null) {
            cl("error: null data");
            _jobsReady = true;
        } else if (jobs == null) {
            jobs = data;
        } else {
            data.jobs.forEach(job => {
                jobs.jobs.push(job);
            });
        }
        if (data.completed) {
            _jobsReady = true;
            jobs = jobs.jobs;

            jobs.forEach(job => {
                job.reaction = gameInfo.reactions[job.reactionName];
                job.jobTypeName = gameInfo.job_type[job.jobType];
                job.mat_name = gameInfo.materials[job.mat_index] != null ? gameInfo.materials[job.mat_index] : "";
                if (job.reaction != null) {
                    if (job.reaction.products != null) {
                        job.reaction.products.forEach(prod => {
                            prod.itemTypeName = gameInfo.itemTypes[prod.itemType] || "ANY";
                        });
                    }
                    if (job.reaction.reagents != null) {
                        job.reaction.reagents.forEach(reagent => {
                            reagent.itemTypeName = gameInfo.itemTypes[reagent.itemType] || "ANY";
                            reagent.flags = [];
                        });
                    }
                }
            });
        }

    }).catch((err) => {

        cl("error reading jobs: " + err);
        readingStocks = false;
        _jobsReady = true;

    }).finally(() => {

        readingStocks = false;
    });
}

async function ReadStocksBatch() {
    if (readingStocks)
        return;

    readingStocks = true;
    await window.api.GetStocks().then((data) => {
        Object.keys(data.stocks).forEach(key => {
            var itemName = key.split("@")[0];
            var matName = key.split("@")[1];
            var quantity = data.stocks[key];
            tempStocks[itemName] ??= {};
            tempStocks[itemName][matName] = quantity;
        });

        if (data.completed) {
            stockReadcompleted = true;
        };
    }).finally(() => {
        readingStocks = false;

        if (!stockReadcompleted) {
            setTimeout(() => {
                ReadStocksBatch();
            }, 100);
        } else {
            stockReadcompleted = false
            stocksMaterials = [];
            stockArray = []
            for (const item in tempStocks) {
                stockArray.push({ item: item, mats: tempStocks[item] });
            }
            stockArray.sort((a, b) => {
                return ItemLabelGroup(a.item).localeCompare(ItemLabelGroup(b.item));
            });

            ClearGeneralStocks();

            stockArray.forEach(obj => {
                ProcessStockLine(obj.item, obj.mats);
            });

            FinalizeStock();

            ApplyBoardMaterialFilters()
            tempStocks = {};
            setTimeout(() => {
                ReadStocksBatch();
            }, 100);

        }
    });
}

function FinalizeStock() {
    if (oldStocks == null)
        oldStocks = {};
    
    Object.keys(stocks).forEach(item => {
        stock = stocks[item];
        if (oldStocks[item] == null)
            oldStocks[item] = {};

        Object.keys(stock).forEach(mat => {
            if (oldStocks[item][mat] == null)
                oldStocks[item][mat] = 0;

            var diff = stock[mat] - oldStocks[item][mat];
            if (diff != 0) {
                cl(diff)
                var cell = GetStockCell(item, mat);
                FlashCellChange(cell, diff);
            }
            oldStocks[item][mat] = stock[mat];

        });
    });
}

function ClearGeneralStocks() {
    if (stocksMaterials.indexOf("!0ALL") == -1)
        stocksMaterials.push("!0ALL");
    if (stocksMaterials.indexOf("!1WOODLOG") == -1)
        stocksMaterials.push("!1WOODLOG");
    if (stocksMaterials.indexOf("!2ROCKMETAL") == -1)
        stocksMaterials.push("!2ROCKMETAL");
    if (stocksMaterials.indexOf("!3BONES") == -1)
        stocksMaterials.push("!3BONES");
    if (stocksMaterials.indexOf("!4LEATHER") == -1)
        stocksMaterials.push("!4LEATHER");
    if (stocksMaterials.indexOf("!5PLANTS") == -1)
        stocksMaterials.push("!5PLANTS");

    Object.keys(stocks).forEach(key => {
        var matList = stocks[key];
        matList["!0ALL"] = 0;
        matList["!1WOODLOG"] = 0;
        matList["!2ROCKMETAL"] = 0;
        matList["!3BONES"] = 0;
        matList["!4LEATHER"] = 0;
        matList["!5PLANTS"] = 0;
    });
}

function ProcessStockLine(item, matsQtts) {

    var newInfo = false;

    if (!stocks[item]) {
        stocks[item] = {}
        newInfo = true;
    }

    Object.keys(matsQtts).forEach(mat => {

        qtt = matsQtts[mat];

        if (!stocks[item][mat]) {
            stocks[item][mat] = 0;
            newInfo = true;
        }
        if (!stocks[item]["!0ALL"]) {
            stocks[item]["!0ALL"] = 0;
            newInfo = true;
        }

        if (stocksMaterials.indexOf(mat) == -1)
            stocksMaterials.push(mat);

        var oldStock = stocks[item][mat];

        stock = stocks[item];
        stock[mat] = qtt;
        stock["!0ALL"] += qtt;

        var matCell = GetStockCell(item, mat);

        var group = ""
        if (mat.endsWith(":WOOD")) {
            group = "!1WOODLOG";
        } else if (mat.startsWith("INORGANIC:")) {
            group = "!2ROCKMETAL";
        } else if (mat.endsWith(":BONE")) {
            group = "!3BONES";
        } else if (mat.endsWith(":LEATHER")) {
            group = "!4LEATHER";
        } else if (mat.startsWith("PLANT:")) {
            group = "!5PLANTS";
        }

        if (group != "") {
            newInfo = false
            if (!stock[group]) {
                stock[group] = 0;
                newInfo = true;
            }

            stock[group] = qtt;
        }
    });
}

function CreateEmptyStocksCells() {
    Object.keys(stocks).forEach(item => {
        stocksMaterials.forEach(mat => {
            if (boardSelectedMaterials.indexOf(mat) == -1)
                return;
            GetStockCell(item, mat);
        });
    });
}


function GetStockCell(item, mat) {
    var total = stocks[item]["!0ALL"] + WantedProduction(item, null);

    //side header
    var itemIndex = Object.keys(stocks).indexOf(item);
    var myLabel = sideA.querySelector(".itemType[item='" + item + "']");
    if (!myLabel) {
        myLabel = document.createElement("div");
        myLabel.classList.add("boardCell", "itemType");
        myLabel.textContent = ItemLabelNoGroup(item);
        myLabel.setAttribute("item", item.toUpperCase());

        myLabel.style.order = itemIndex
        sideA.appendChild(myLabel);
    }
    myLabel.setAttribute("totalVal", total)

    var tableHeader = $(".boardTableHeader")[0];
    var header = tableHeader.querySelector(`.header[material='${mat}']`);

    //is mat to display?
    var index = boardSelectedMaterials.indexOf(mat)
    if (!header) {
        header = document.createElement("div");
        header.classList.add("boardCell", "header");;
        header.setAttribute("material", mat);
        header.innerHTML = DisplayableMaterialName(mat);
        boardStaticHeader.appendChild(header);

        tableHeader.appendChild(header);
    }
    header.style.order = index;

    var myMatCol = sideB.querySelector(".materialCol[material='" + mat + "']");
    //mat col
    if (!myMatCol) {
        myMatCol = document.createElement("div");
        myMatCol.classList.add("boardCol", "materialCol");
        myMatCol.setAttribute("material", mat);
        sideB.appendChild(myMatCol);

    }
    myMatCol.style.order = boardSelectedMaterials.indexOf(mat);

    var matCell = myMatCol.querySelector(`.boardCell[item='${item}']`);
    if (!matCell) {
        matCell = document.createElement("div");
        matCell.classList.add("boardCell", "editable");
        matCell.setAttribute("item", item);
        var stockDiv = document.createElement("div");
        stockDiv.classList.add("stock");
        matCell.appendChild(stockDiv);

        myMatCol.appendChild(matCell);
    }
    matCell.style.order = itemIndex

    var stocked = 0;
    if (stocks[item] && stocks[item][mat])
        stocked = stocks[item][mat];

    matCell.setAttribute("totalVal", stocked + WantedProduction(item, mat));

    var stockDiv = matCell.querySelector("div.stock");
    stockDiv.textContent = GetKiloValue(stocked);

    return matCell;
}

function InitStockTable() {
    var body = $(".boardBody")[0];


    //create corner cell
    var cornerDiv = $(".boardTableHeader .itemType.corner")[0];
    if (!cornerDiv) {
        cornerDiv = document.createElement("div");
        cornerDiv.classList.add("boardCell", "itemType", "corner");

        var input = document.createElement("input");
        //add event listeners for focus and change
        input.addEventListener("focus", (e) => { e.target.value = ''; UpdateBoardItemFilter(''); });
        input.addEventListener("mouseup", (e) => {
            e.stopPropagation();
            e.target.value = ''; UpdateBoardItemFilter('');
        });
        input.addEventListener("change", (e) => { UpdateBoardItemFilter(e.target.value); });
        input.addEventListener("keyup", (e) => { UpdateBoardItemFilter(e.target.value); });
        input.setAttribute("placeholder", "Item ▼");
        input.classList.add("autofocus");
        cornerDiv.appendChild(input);

        var button = document.createElement("button");
        button.addEventListener("mouseup", (e) => {
            e.stopPropagation();
            UpdateBoardMaterialsPicker();
            $(".boardMaterialsPickerHost")[0].classList.remove("hidden");
            var input = $(".boardMaterialsPickerHost input")[0];
            input.value = '';
            input.focus();
            var event = new Event("change");
            input.dispatchEvent(event);
        });
        button.textContent = "Materials ►";
        cornerDiv.appendChild(button);

        boardStaticHeader.appendChild(cornerDiv);
    }
}

function AddBoardCellInput(cell, itemName, mat, onChangeCallback) {
    input = document.createElement("input");
    input.type = "number";
    input.classList.add("inputNumber", "wanted");
    input.setAttribute("itemType", itemName);
    input.setAttribute("material", mat);
    input.value = wantedProduction[itemName] ? wantedProduction[itemName][mat] ? wantedProduction[itemName][mat] : 0 : 0;
    PrepareInput(input, onChangeCallback);
    cell.appendChild(input);
}

function FlashCellChange(cell, diff) {
    if (!cell)
        return;
    if (diff > 0) {
        cell.classList.add("popUp");
    } else if (diff < 0) {
        cell.classList.add("popDown");
    }

    setTimeout(() => {
        const c = cell;
        c.classList.remove("popUp");
        c.classList.remove("popDown");
    }, 500);
}

function UpdateBoardMaterialsPicker() {
    var picker = $(".boardMaterialsPicker")[0];

    stocksMaterials.forEach(mat => {
        if (!IsCraftingMaterial(mat))
            return;

        var option = picker.querySelector(`button.materialOption[material='${mat}']`);
        if (!option) {
            option = document.createElement("button");
            option.classList.add("materialOption");
            option.setAttribute("material", mat);
            option.addEventListener("mouseup", (e) => {
                e.stopPropagation();
                ToggleBoardMaterialSelected(e.currentTarget.getAttribute("material"));
            });

            var labelPreDiv = document.createElement("div");
            var labelDiv = document.createElement("div");
            labelDiv.classList.add("label");
            labelDiv.innerHTML = DisplayableMaterialName(mat);
            labelPreDiv.appendChild(labelDiv);

            option.appendChild(labelPreDiv);

            picker.appendChild(option);
        }

        if (boardSelectedMaterials.includes(mat)) {
            option.classList.add("selected");
        } else {
            option.classList.remove("selected");
        }
    });

    allOptions = picker.querySelectorAll(".materialOption");
    allOptions.forEach(option => {
        var mat = option.getAttribute("material");
        if (stocksMaterials.indexOf(mat) == -1) {
            //remove option
            option.remove();
        }
    });

    SortBoardPicker();
}

async function ToggleBoardMaterialSelected(mat) {
    var option = $(".boardMaterialsPicker .materialOption[material='" + mat + "']")[0];

    var change = false;
    if (boardSelectedMaterials.indexOf(mat) == -1) {
        boardSelectedMaterials.push(mat);
        change = true;
        if (option)
            option.classList.add("selected");
    } else {
        if (mat != "!0ALL") {
            boardSelectedMaterials = boardSelectedMaterials.filter(m => m != mat);
            change = true;
            if (option)
                option.classList.remove("selected");
        }
    }

    if (change) {
        GetSetBoardSelectedMaterials(boardSelectedMaterials);
        SortBoardPicker();
        ApplyBoardMaterialFilters()
    }
}

function ApplyBoardMaterialFilters() {
    $(".boardTable .materialCol").forEach(cell => {
        var mat = cell.getAttribute("material");
        if (boardSelectedMaterials.includes(mat)) {
            cell.classList.remove("hidden");
        } else {
            cell.classList.add("hidden");
        }
    });
    $(".boardTableHeader .boardCell.header").forEach(cell => {
        var mat = cell.getAttribute("material");
        if (boardSelectedMaterials.includes(mat)) {
            cell.classList.remove("hidden");
        } else {
            cell.classList.add("hidden");
        }

        cell.style.order = boardSelectedMaterials.indexOf(mat);
    });
    CreateEmptyStocksCells()

    UpdateBoardItemFilter();
}


function ClearMatName(mat) {
    return mat.replace(/ /g, "_");
}

function IsCraftingMaterial(mat) {
    if (!isCraftingMaterials[mat])
        isCraftingMaterials[mat] = mat.startsWith("!") || mat.startsWith("INORGANIC:") || mat.startsWith("GLASS") || mat.endsWith(":WOOD") || mat.endsWith(":BONE") || mat.endsWith(":LEATHER");

    return isCraftingMaterials[mat];
}

function DisplayableMaterialName(mat) {
    mat = mat.replace("CREATURE:", "");
    if (mat.startsWith("INORGANIC:")) {
        mat = mat.replace("INORGANIC:", "");
        mat += " <span>(Rock/Metal)</span><span class='tag inorganic'>Rock/Metal</span>";
    }
    if (mat.endsWith(":WOOD")) {
        mat = mat.replace(":WOOD", " <span>(Log)</span><span class='tag wood'></span>");
        mat = mat.replace("PLANT:", "");
    } else {
        mat = mat.replace("PLANT:", " <span>(Plant)</span><span class='tag plant'>Plant</span> ");
    }
    mat = mat.replace(":BONE", " <span>(Bone)</span><span class='tag bone'>Bone</span>");
    mat = mat.replace(":LEATHER", " <span>(Leather)</span><span class='tag leather'>Leather</span>");

    mat = mat.replace("!0ALL", "<b>Total</b>");
    mat = mat.replace("!1WOODLOG", "<b>Wood/Logs</b>");
    mat = mat.replace("!2ROCKMETAL", "<b>Rock/Metal</b>");
    mat = mat.replace("!3BONES", "<b>Bone</b>");
    mat = mat.replace("!4LEATHER", "<b>Leather</b>");
    mat = mat.replace("!5PLANTS", "<b>Plants</b>");
    /*
    mat = mat.replace("!0INORGANIC", "Any <b>Rock</b>");
    mat = mat.replace("!1WOOD", "Any <b>Wood</b>");
    mat = mat.replace("!2LEATHER", "Any <b>Leather</b>");
    mat = mat.replace("!3CLOTH", "Any <b>Cloth</b>");
    mat = mat.replace("!4BONE", "Any <b>Bone</b>");
    */
    mat = mat.replace(/_/g, " ");
    return mat;
}

function GetKiloValue(value) {
    value = parseInt(value);

    var unit = "";
    /*
    if (value >= 1000000) {
        value = (value / 1000000).toFixed(2);
        unit = "M";
    } else if (value >= 1000) {
        value = (value / 1000).toFixed(2);
        unit = "K";
    } else {
        return value.toString();
    }
    */
    //format to add commas
    value = value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");

    return value + unit;
}

function BoardMaterialsFilterChanged(filterValue) {
    $(".boardMaterialsPicker .materialOption").forEach(option => {
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
    SortBoardPicker();
}

function SortBoardPicker() {
    //sort elements by .selcted
    var picker = $(".boardMaterialsPicker")[0];
    var options = Array.from(picker.querySelectorAll(".materialOption"));
    options.sort((a, b) => {
        var aSelected = a.classList.contains("selected") ? 0 : 1;
        var bSelected = b.classList.contains("selected") ? 0 : 1;
        return aSelected - bSelected || SortableMaterialName(a.getAttribute("material")).localeCompare(SortableMaterialName(b.getAttribute("material")));
    });

    var i = 0;
    options.forEach(option => {
        option.style.order = i;
        i++;
    });
}

function UpdateBoardItemFilter(search) {
    var itemCells = $(".boardCell[item]");
    itemCells.forEach(cell => {
        var itemName = cell.getAttribute("item").toLowerCase();
        if (!search || search == '' || itemName.includes(search.toLowerCase())) {
            cell.classList.remove("hidden");
        } else {
            cell.classList.add("hidden");
        }
    });
}

function EditOrder(order) {
    $(".orderEditor")[0].classList.remove("hidden");
    editedOrder = order;

}

function OrderEdited(elem) {
    var input = elem;
}

function WantedProduction(item, mat) {
    return 0;
    /*
    if (wantedProduction[item] && wantedProduction[item][mat])
        return wantedProduction[item][mat];
    */
}


function UpdateWantedProduction() {
    wantedProduction = {};
    /*
    orders.forEach(order => {
        var jobTypeName = order.job;
        var job = jobs.find(j => j.jobTypeName === jobTypeName);
        if (job.reaction) {
            if (job.reaction.products) {
                job.reaction.products.forEach(prod => {
                    var itemTypeName = prod.itemTypeName;
                });
            }
        }
 
    });
    */
}


function OnGeneralKeyDown(e) {
    if (e.shiftKey)
        isShiftPressed = true;

    if ($(".conditionEditor:not(.hidden)")[0])
        return;
    if ($(".orderEditor:not(.hidden)")[0])
        return;
    if (document.activeElement && document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "TEXTAREA")
        return;

    if (!e.ctrlKey) {
        var searchers = $("input.autofocus");
        //convert searchers to array
        searchers = Array.from(searchers);
        //filter out element with offsetParent null (not visible)
        searchers = searchers.filter(s => s.offsetParent !== null);
        if (searchers.length > 0) {
            searchers.sort(CompareDepth);
            searchers[0].focus();
            searchers[0].select();
        }
    }
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

function PopInfo(title, message, sub, buttons = null, closeCallback = null) {

    abortInit = true;

    var infoBox = document.createElement("div");
    infoBox.classList.add("infoBox");
    infoBox.innerHTML = `<div class='window'><div class='title'></div><div class='context'></div><div class='message'></div><div class='buttons'></div></div>`;
    infoBox.querySelector(".title").textContent = title;
    infoBox.querySelector(".message").innerHTML = message;
    cl(buttons);
    if (buttons) {
        buttons.forEach(btn => {
            var button = document.createElement("button");
            button.textContent = btn;
            switch (btn) {
                case "RESET APP PATHS":
                    cl("reset app paths");
                    errorCallback = null;
                    button.addEventListener("click", (e) => {
                        e.stopPropagation();
                        ResetAppPaths();
                        document.querySelector(".infoBox").remove();
                    });
                    break;
            }
            infoBox.querySelector(".buttons").appendChild(button);
        });
    }
    infoBox.querySelector(".context").innerHTML = sub;
    $("body")[0].appendChild(infoBox);

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

function ResetAppPaths() {
    window.api.ResetAppPaths();
};


function AddKeyInfo(button, string) {

    var keyInfo = button.querySelector("span.keyInfo")
    if (!keyInfo) {
        keyInfo = document.createElement("span");
        keyInfo.classList.add("keyInfo");
        button.appendChild(keyInfo);
    }
    keyInfo.textContent = string;
}

function CloseAllPopups() {
    $(".infoBox").forEach(box => box.remove());
    $(".boardMaterialsPickerHost")[0].classList.add("hidden");
    $(".conditionEditor")[0].classList.add("hidden");
    $(".orderEditor")[0].classList.add("hidden");
}

function SortableMaterialName(mat) {
    if (mat.endsWith(":WOOD")) {
        mat = "1WOOD:" + mat;
    } else if (mat.startsWith("INORGANIC:")) {
        mat = "2" + mat;
    } else if (mat.endsWith(":BONE")) {
        mat = "3BONE:" + mat;
    } else if (mat.endsWith(":LEATHER")) {
        mat = "4LEATHER:" + mat;
    } else if (mat.startsWith("PLANT:")) {
        mat = "5" + mat
    }
    return mat;
}