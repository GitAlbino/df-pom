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
local IGNORED_ITEMS = {'IGNORED_ITEMS_LIST'};
local fullItemName = ''

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

output = output ..'\"item_types\" : {'
for i = 0, df.item_type._last_item do
    output = output .. '\"' .. tostring(i) .. '\":' .. '\"' .. tostring(df.item_type[i]) .. '\",'
end
output = output .. '},'

output = output ..'\"items\" : {'
for groupKey,group in pairs(df.global.world.raws.itemdefs) do
    if groupKey == 'all' or groupKey == 'tools_by_type' or string.find(groupKey, 'graphics') or string.find(groupKey, 'texpos') then
        goto continue
    end


    for itemIndex, item in pairs(group) do

        for _, exp in ipairs(IGNORED_ITEMS) do
            if exp ~= '' and string.match(tostring(item.id), exp) then
                print('IGNORING ' .. item.id)
                goto continue
            end
        end

        groupKey = tostring(groupKey):upper()
        fullItemName = groupKey
        if tostring(item.id) ~= groupKey then
            fullItemName = groupKey .. '!' .. tostring(item.id)
        end
        output = output .. '\"' .. fullItemName .. '\":{'
        output = output .. '\"subtypeName\":\"'..tostring(item.id)..'\",'
        output = output .. '\"subtype\":\"'..tostring(item.subtype)..'\",'
        output = output .. '\"name\":\"'..tostring(item.name)..'\",'
        output = output .. '\"typeName\":\"'..groupKey..'\",'
        local success, capacity = pcall(function() return item.container_capacity end)
        if success and capacity ~= nil then
            output = output .. '\"container_capacity\":\"'..tostring(item.container_capacity)..'\",'
        else 
            output = output .. '\"container_capacity\":\"0\",'
        end
        
        local mt = getmetatable(item)
        if mt and mt.__index then
            if  mt.__index.name_plural ~= nil then
                output = output .. '\"name_plural\":\"'..tostring(item.name_plural)..'\",'
            end

            if  mt.__index.ammo_class ~= nil then
                output = output .. '\"ammo_class\":\"'..tostring(item.ammo_class)..'\",'
            end

        end

        output = output .. '},'
    end

    ::continue::
end
output = output .. '},'

output = output ..'\"materials\" : {'
for index,mat in ipairs(df.global.world.raws.inorganics.all) do
--[[
     if mat.id:find('DIVINE') then 
        goto continue2
    end
    if mat.id:find('EVIL') then 
        goto continue2
    end
    if mat.id:find('MYTHICAL') then 
        goto continue2
    end
--]]

    output = output .. '\"INORGANIC:' .. tostring(mat.id) .. '\":{'
    output = output .. '\"Index\":\"'.. tostring(index) ..'\",'
    output = output .. '\"name\":\"'.. tostring(mat.material.state_name.Solid) ..'\",'

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

    ::continue2::
end

for index,mat in ipairs(df.global.world.raws.plants.all) do
    output = output .. '\"PLANT:' .. tostring(mat.id) .. '\":{'
    output = output .. '\"Types\":['
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
for index,v in pairs(df.global.world.raws.reactions.reactions) do
    output = output .. '\"' .. tostring(v.code) .. '\":{'
    output = output .. '\"name\":\"'..tostring(v.name)..'\",'
    output = output .. '\"index\":\"'..tostring(index)..'\",'

    output = output .. '\"reagents\":['
    for _,reagent in ipairs(v.reagents) do
        if reagent._type == df.reaction_reagent_itemst then
            output = output .. '{'
            output = output .. '\"item_type\":\"' .. tostring(reagent.item_type) .. '\",'
            output = output .. '\"item_subtype\":\"' .. tostring(reagent.item_subtype) .. '\",'
            output = output .. '\"reaction_class\":\"' .. tostring(reagent.reaction_class) .. '\",'
            output = output .. '\"mat_type\":\"' .. tostring(reagent.mat_type) .. '\",'
            output = output .. '\"mat_index\":\"' .. tostring(reagent.mat_index) .. '\",'
            output = output .. '\"quantity\":\"' .. tostring(reagent.quantity) .. '\",'
            output = output .. '\"reaction_product\":\"' .. tostring(reagent.has_material_reaction_product) .. '\",'

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
                output = output .. '\"item_type\":\"' .. tostring(prod.item_type) .. '\",'
            end
            if prod.item_subtype ~= nil then
                output = output .. '\"item_subtype\":\"' .. tostring(prod.item_subtype) .. '\",'
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

print("DFPOM_GAMEINFO_JSON:" .. output)
-- Safely attempt clipboard write (may fail on some DFHack versions)
if dfhack.internal and dfhack.internal.setClipboardTextCp437 then
	dfhack.internal.setClipboardTextCp437(output)
end

