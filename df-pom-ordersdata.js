

var propertiesInfos = [
    {
        name: "id",
        displayName: "ID",
        visible: false,
        numeric: true,
    },
    {
        name: "is_active",
        displayName: "Active?", //gear icon
        visible: false,
        compactable: true,
        yesno: true,
    },
    {
        name: "is_validated",
        displayName: "Validated?",
        visible: false,
        compactable: true,
        yesno: true,
    },
    {
        name: "job",
        displayName: "Job name",
        visible: true,
        search: true,
    },
    {
        name: "reaction",
        displayName: "Reaction name",
        visible: false,
    },
    {
        name: "item_subtype",
        displayName: "Item built",
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
        displayName: "One-time order: Amount left to do before the order is closed and removed",
        isInput: true,
        visible: true,
        numeric: true,
    },
    {
        name: "amount_total",
        displayName: "Total to do",
        isInput: true,
        visible: false,
        numeric: true,
    },
    {
        name: "pom_targetQtt",
        displayName: "Target stocks quantity: try to have this amount available at all times",
        isInput: true,
        visible: true,
        numeric: true,
    },
    {
        name: "frequency",
        displayName: "Check frequency",
        visible: true,
        compactable: true,
    },
    {
        name: "item_conditions",
        displayName: "Conditions",
        visible: false,
    },
    {
        name: "max_workshops",
        displayName: "Max workshops assigned",
        visible: true,
        isInput: true,
        numeric: true,
        compactable: true,
    },

]

var conditionParts = [
    "condition",
    "item_type",
    "item_subtype",
    "material",
    "flags",
    "value"
]
var condOperators = [
    {
        name: "Not",
        symbol: "!=",
    },
    {
        name: "AtLeast",
        symbol: ">=",
    },
    {
        name: "AtMost",
        symbol: "<=",
    },
    {
        name: "GreaterThan",
        symbol: ">",
    },
    {
        name: "LessThan",
        symbol: "<",
    },
    {
        name: "Exactly",
        symbol: "==",
    }
]

var craftTypes = [
    "CRAFT",
    "SCEPTER",
    "CROWN",
    "FIGURINE",
    "AMULET",
    "TOTEM"
]

var capacityItems = [
    "BARREL",
    "FLASK",
    "GOBLET",
    "BIN",
    "BAG",
    "BOX",
    "CABINET",
    "BUCKET",
    "BACKPACK",
    "QUIVER",
    "CAGE",
    "ANIMALTRAP",
]


var pantsInfos = {
    "Forge adamantine greaves": { item: "PANTS!ITEM_PANTS_GREAVES", material: "adamantine greaves", material_category: "" },
    "Forge adamantine leggings": { item: "PANTS!ITEM_PANTS_LEGGINGS", material: "adamantine leggings", material_category: "" },
    "Forge adamantine loincloth": { item: "PANTS!ITEM_PANTS_LOINCLOTH", material: "adamantine loincloth", material_category: "" },
    "Forge adamantine trousers": { item: "PANTS!ITEM_PANTS_PANTS", material: "adamantine trousers", material_category: "" },
    "Forge bismuth bronze greaves": { item: "PANTS!ITEM_PANTS_GREAVES", material: "bismuth bronze", material_category: "" },
    "Forge bismuth bronze leggings": { item: "PANTS!ITEM_PANTS_LEGGINGS", material: "bismuth bronze", material_category: "" },
    "Forge black metal greaves": { item: "PANTS!ITEM_PANTS_GREAVES", material: "black metal", material_category: "" },
    "Forge black metal leggings": { item: "PANTS!ITEM_PANTS_LEGGINGS", material: "black metal", material_category: "" },
    "Forge blazing metal greaves": { item: "PANTS!ITEM_PANTS_GREAVES", material: "blazing metal", material_category: "" },
    "Forge blazing metal leggings": { item: "PANTS!ITEM_PANTS_LEGGINGS", material: "blazing metal", material_category: "" },
    "Forge bronze greaves": { item: "PANTS!ITEM_PANTS_GREAVES", material: "bronze greaves", material_category: "" },
    "Forge bronze leggings": { item: "PANTS!ITEM_PANTS_LEGGINGS", material: "bronze leggings", material_category: "" },
    "Forge copper greaves": { item: "PANTS!ITEM_PANTS_GREAVES", material: "copper greaves", material_category: "" },
    "Forge copper leggings": { item: "PANTS!ITEM_PANTS_LEGGINGS", material: "copper leggings", material_category: "" },
    "Forge faceted metal greaves": { item: "PANTS!ITEM_PANTS_GREAVES", material: "faceted metal", material_category: "" },
    "Forge faceted metal leggings": { item: "PANTS!ITEM_PANTS_LEGGINGS", material: "faceted metal", material_category: "" },
    "Forge frosty metal greaves": { item: "PANTS!ITEM_PANTS_GREAVES", material: "frosty metal", material_category: "" },
    "Forge frosty metal leggings": { item: "PANTS!ITEM_PANTS_LEGGINGS", material: "frosty metal", material_category: "" },
    "Forge glowing metal greaves": { item: "PANTS!ITEM_PANTS_GREAVES", material: "glowing metal", material_category: "" },
    "Forge glowing metal leggings": { item: "PANTS!ITEM_PANTS_LEGGINGS", material: "glowing metal", material_category: "" },
    "Forge iron greaves": { item: "PANTS!ITEM_PANTS_GREAVES", material: "iron greaves", material_category: "" },
    "Forge iron leggings": { item: "PANTS!ITEM_PANTS_LEGGINGS", material: "iron leggings", material_category: "" },
    "Forge pock-marked metal greaves": { item: "PANTS!ITEM_PANTS_GREAVES", material: "pock-marked", material_category: "" },
    "Forge pock-marked metal leggings": { item: "PANTS!ITEM_PANTS_LEGGINGS", material: "pock-marked", material_category: "" },
    "Forge ruddy metal greaves": { item: "PANTS!ITEM_PANTS_GREAVES", material: "ruddy metal", material_category: "" },
    "Forge ruddy metal leggings": { item: "PANTS!ITEM_PANTS_LEGGINGS", material: "ruddy metal", material_category: "" },
    "Forge rusted metal greaves": { item: "PANTS!ITEM_PANTS_GREAVES", material: "rusted metal", material_category: "" },
    "Forge rusted metal leggings": { item: "PANTS!ITEM_PANTS_LEGGINGS", material: "rusted metal", material_category: "" },
    "Forge steel greaves": { item: "PANTS!ITEM_PANTS_GREAVES", material: "steel greaves", material_category: "" },
    "Forge steel leggings": { item: "PANTS!ITEM_PANTS_LEGGINGS", material: "steel leggings", material_category: "" },
    "Forge translucent metal greaves": { item: "PANTS!ITEM_PANTS_GREAVES", material: "translucent metal", material_category: "" },
    "Forge translucent metal leggings": { item: "PANTS!ITEM_PANTS_LEGGINGS", material: "translucent metal", material_category: "" },
    "Forge twinkling metal greaves": { item: "PANTS!ITEM_PANTS_GREAVES", material: "twinkling metal", material_category: "" },
    "Forge twinkling metal leggings": { item: "PANTS!ITEM_PANTS_LEGGINGS", material: "twinkling metal", material_category: "" },
    "Make bone greaves": { item: "PANTS!ITEM_PANTS_GREAVES", material: "", material_category: "bone greaves" },
    "Make bone leggings": { item: "PANTS!ITEM_PANTS_LEGGINGS", material: "", material_category: "bone" },
    "Make cloth loincloth": { item: "PANTS!ITEM_PANS_LOINCLOTH", material: "", material_category: "cloth" },
    "Make cloth trousers": { item: "PANTS!ITEM_PANTS_PANTS", material: "", material_category: "cloth" },
    "Make leather leggings": { item: "PANTS!ITEM_PANTS_LEGGINGS", material: "", material_category: "leather" },
    "Make leather loincloth": { item: "PANTS!ITEM_PANS_LOINCLOTH", material: "", material_category: "leather" },
    "Make leather trousers": { item: "PANTS!ITEM_PANTS_PANTS", material: "", material_category: "leather" },
    "Make shell leggings": { item: "PANTS!ITEM_PANTS_LEGGINGS", material: "", material_category: "shell" },
    "Make silk loincloth": { item: "PANTS!ITEM_PANS_LOINCLOTH", material: "", material_category: "silk" },
    "Make silk trousers": { item: "PANTS!ITEM_PANTS_PANTS", material: "", material_category: "silk" },
    "Make yarn loincloth": { item: "PANTS!ITEM_PANS_LOINCLOTH", material: "", material_category: "yarn" },
    "Make yarn trousers": { item: "PANTS!ITEM_PANTS_PANTS", material: "", material_category: "yarn" }
}