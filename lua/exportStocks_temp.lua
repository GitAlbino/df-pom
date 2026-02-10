local startIndex = 5000;
local maxScans = 5000;
local counts = {}
local listFields = false
local isFirst = true
local index = 0
local itemType = ''
local itemSub = ''
local name = ''
local mi ='';
local subDef = nil;
local containedItems;

if startIndex == 69420 then
	startIndex = 0
end
if maxScans == 69420 then
	maxScans = 1000
end


for _, item in ipairs(df.global.world.items.other.IN_PLAY) do
	if index < startIndex then
		goto continue
	end

	maxScans = maxScans - 1
	if item.flags.in_building then 
		goto continue
	end

	if item.getType == nil then
		goto continue
	end
	
	containedItems = dfhack.items.getContainedItems(item)
	if containedItems and #containedItems > 0 then
		goto continue
	end

	itemType = item:getType()
	itemSub = item:getSubtype()
	subDef = dfhack.items.getSubtypeDef(itemType, itemSub)
	typeName = df.item_type[itemType]
	name = typeName
	if subDef ~= nil then
		name = typeName .. '!' .. subDef.id
	end

	if name ~= nil then
		mi = dfhack.matinfo.decode(item)
		if mi then
			name = name .. '@' .. mi:getToken()
		end
		counts[name] = (counts[name] or 0) + item.stack_size
	end

	::continue::
	index = index + 1

	if maxScans == 0 then
		break
	end

end

if (maxScans > 0) then
	index = 0
end

local output = 'lastIndex=' .. tostring(index) .. '/'
if index == 0 then
	output = output .. 'completed/'
end
output = output .. 'year=' .. tostring(df.global.cur_year) .. '/'
output = output .. 'yearTick=' .. tostring(df.global.cur_year_tick) .. '/'

for key, value in pairs(counts) do
	output = output .. value.. '*'.. key .. '/'
	print(key .. ': ' .. value)
end

dfhack.internal.setClipboardTextCp437(output)
collectgarbage()
