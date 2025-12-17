local startJobIndex = 69420;
local maxJobs = 69421;
local getBase = 69422;
local output = '{';
local readObject;
local readField;
local readFieldResult = ''
local flags = ''
local IS_WOOD_FLAG = 78
local IS_LEATHER_FLAG = 29
local IS_DYE_FLAG = 33
local IS_METAL_FLAG = 47
local IS_GEM_FLAG = 48
local IS_GLASS_FLAG = 49
local IS_STONE_FLAG = 60
local IS_CERAMIC_FLAG = 74

output = output .. '\"job_material_category\" : {'
for i = 0, df.job_material_category._last_item do
    output = output .. '\"' .. tostring(i) .. '\":' .. '\"' .. tostring(df.job_material_category[i]) .. '\",'
end
output = output .. '},'

output = output ..'\"job_type\" : {'
for i = 0, df.job_type._last_item do
    output = output .. '\"' .. tostring(i) .. '\":' .. '\"' .. tostring(df.job_type[i]) .. '\",'
end
output = output .. '},'

output = output ..'\"itemTypes\" : {'
for i = 0, df.item_type._last_item do
    output = output .. '\"' .. tostring(i) .. '\":' .. '\"' .. tostring(df.item_type[i]) .. '\",'
end
output = output .. '},'

output = output ..'\"items\" : {'
for k,v in pairs(df.global.world.raws.itemdefs.all) do
    output = output .. '\"' .. tostring(v.id) .. '\":{'
    output = output .. '\"id\":\"'..tostring(v.id)..'\",'
    output = output .. '\"index\":\"'..tostring(k)..'\",'
    output = output .. '\"subtype\":\"'..tostring(v.subtype)..'\",'
    output = output .. '\"name\":\"'..tostring(v.name)..'\",'

    local mt = getmetatable(v)
    if mt and mt.__index then
        if  mt.__index.name_plural ~= nil then
            output = output .. '\"name_plural\":\"'..tostring(v.name_plural)..'\",'
        end

        if  mt.__index.ammo_class ~= nil then
            output = output .. '\"ammo_class\":\"'..tostring(v.ammo_class)..'\",'
        end
    end
    output = output .. '},'
end
output = output .. '},'

output = output ..'\"materials\" : {'
for index,mat in ipairs(df.global.world.raws.inorganics.all) do
    output = output .. '\"INORGANIC:' .. tostring(mat.id) .. '\":{'
    output = output .. '\"Types\":['
    if (mat.material.flags[IS_LEATHER_FLAG]) then
        output = output .. '\"LEATHER\",'
    end
    if (mat.material.flags[IS_DYE_FLAG]) then
        output = output .. '\"DYE\",'
    end
    if (mat.material.flags[IS_METAL_FLAG]) then
        output = output .. '\"METAL\",'
    end
    if (mat.material.flags[IS_GEM_FLAG]) then
        output = output .. '\"GEM\",'
    end
    if (mat.material.flags[IS_GLASS_FLAG]) then
        output = output .. '\"GLASS\",'
    end
    if (mat.material.flags[IS_STONE_FLAG]) then
        output = output .. '\"STONE\",'
    end
    if (mat.material.flags[IS_CERAMIC_FLAG]) then
        output = output .. '\"CERAMIC\",'
    end
    output = output .. '],'
    output = output .. '},'
end
for index,mat in ipairs(df.global.world.raws.plants.all) do
    output = output .. '\"PLANT:' .. tostring(mat.id) .. '\":{\"Types\":['
    if (mat.flags[IS_WOOD_FLAG]) then
        output = output .. '\"WOOD\",'
    end
    output = output .. ']},'
end

output = output .. '},'



output = output ..'\"material_flags\" : {'
for i = 0, df.material_flags._last_item do
    output = output .. '\"' .. tostring(i) .. '\":' .. '\"' .. tostring(df.material_flags[i]) .. '\",'
end
output = output .. '},'

output = output ..'\"job_item_flags1\" : {'
for i = 0, df.job_item_flags1._last_item do
    output = output .. '\"' .. tostring(i) .. '\":' .. '\"' .. tostring(df.job_item_flags1[i]) .. '\",'
end
output = output .. '},'

output = output ..'\"job_item_flags2\" : {'
for i = 0, df.job_item_flags2._last_item do
    output = output .. '\"' .. tostring(i) .. '\":' .. '\"' .. tostring(df.job_item_flags2[i]) .. '\",'
end
output = output .. '},'

output = output ..'\"job_item_flags3\" : {'
for i = 0, df.job_item_flags3._last_item do
    output = output .. '\"' .. tostring(i) .. '\":' .. '\"' .. tostring(df.job_item_flags3[i]) .. '\",'
end
output = output .. '},'


output = output ..'\"reactions\" : {'
for k,v in pairs(df.global.world.raws.reactions.reactions) do
    output = output .. '\"' .. tostring(v.code) .. '\":{'
    output = output .. '\"name\":\"'..tostring(v.name)..'\",'

    output = output .. '\"reagents\":['
    for _,reagent in ipairs(v.reagents) do
        if reagent._type == df.reaction_reagent_itemst then
            output = output .. '{'
            output = output .. '\"itemType\":\"' .. tostring(reagent.item_type) .. '\",'
            output = output .. '\"item_subtype\":\"' .. tostring(reagent.item_subtype) .. '\",'
            output = output .. '\"reaction_class\":\"' .. tostring(reagent.reaction_class) .. '\",'
            output = output .. '\"mat_type\":\"' .. tostring(reagent.mat_type) .. '\",'
            output = output .. '\"mat_index\":\"' .. tostring(reagent.mat_index) .. '\",'
            output = output .. '\"quantity\":\"' .. tostring(reagent.quantity) .. '\",'

            flags = ''
            for k,p in pairs(reagent.flags1) do
                if p then
                    flags = flags .. '\"' .. k .. '\",'
                end
            end
            output = output .. '\"flags1\":[' .. flags .. '],'

            flags = ''
            for k,p in pairs(reagent.flags2) do
                if p then
                    flags = flags .. '\"' .. k .. '\",'
                end
            end
            output = output .. '\"flags2\":[' .. flags .. '],'

            flags = ''
            for k,p in pairs(reagent.flags3) do
                if p then
                    flags = flags .. '\"' .. k .. '\",'
                end
            end
            output = output .. '\"flags3\":[' .. flags .. '],'

            output = output .. '},'
        end
    end
    output = output .. '],'

    output = output .. '\"products\":['
    for _,prod in ipairs(v.products) do
        if prod._type == df.reaction_product_itemst then
            output = output .. '{'
            if prod.item_type ~= nil then
                output = output .. '\"itemType\":\"' .. tostring(prod.item_type) .. '\",'
            end
            output = output .. '\"count\":\"' .. tostring(prod.count) .. '\",'
            output = output .. '\"probability\":\"' .. tostring(prod.probability) .. '\",'
            output = output .. '},'
        end
    end
    output = output .. '],'

    output = output .. '},'
end
output = output .. '},'


output = output .. '}'

function getField() 
    local mt = getmetatable(readObject)
    if mt and mt.__index and mt.__index[readField] ~= nil then
        readFieldResult = tostring(readObject[readField])
    end
    readFieldResult = ''
end

dfhack.internal.setClipboardTextCp437(output)

