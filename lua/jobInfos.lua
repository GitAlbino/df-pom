local startJobIndex = 69420;
local maxJobs = 69421;

local output = '{ \"jobs\":['

local jobs = df.global.game.main_interface.create_work_order.jminfo_master;
local i = 0;
for k,v in pairs(jobs) do
    if (i >= startJobIndex) then
        output = output .. '{'
        output = output .. '\"jobType\":' .. '\"' .. tostring(v.job_type) .. '\",'
        output = output .. '\"name\":' ..  '\"' .. tostring(v.name) .. '\",'
        output = output .. '\"reactionName\":' ..  '\"' .. tostring(v.reaction_name) .. '\",'
        output = output .. '\"item_subtype\":' .. '\"' .. tostring(v.item_subtype) .. '\",'
        output = output .. '\"mat_type\":' .. '\"' .. tostring(v.mat_type) .. '\",'
        output = output .. '\"mat_index\":' .. '\"' .. tostring(v.mat_index) .. '\",'
        
        local matCat = ''
        if df.job_material_category[v.material_category] ~= nil then
            matCat = tostring(df.job_material_category[v.material_category])
        end
        output = output .. '\"material_category\":' .. '\"' .. matCat .. '\",'
        output = output .. '},'
    end

    i=i+1;
    if (i >= startJobIndex + maxJobs) then
        break
    end
end

local completed = i < (startJobIndex + maxJobs) and i > 0;
output = output .. '],\"pauseAtIndex\":' .. tostring(i) .. ', \"completed\":' .. tostring(completed) .. '}'; 
print("DFPOM_JOBINFOS_JSON:" .. output)
-- Safely attempt clipboard write (may fail on some DFHack versions)
if dfhack.internal and dfhack.internal.setClipboardTextCp437 then
	dfhack.internal.setClipboardTextCp437(output)
end

