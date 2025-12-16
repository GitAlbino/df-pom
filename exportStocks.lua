	local startIndex = 69420;
	local maxScans = 69421;
	local counts = {}
	local listFields = false
	local isFirst = true
	local index = 0
	local itemType = ''
	local itemSub = ''
	local name = ''
	local mi ='';
	local subDef = nil;

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


		itemType = item:getType()
		itemSub = item:getSubtype()

		subDef = dfhack.items.getSubtypeDef(itemType, itemSub)
		name = df.item_type[itemType]
		
		if subDef ~= nil then
			name = name .. ':' .. subDef.id
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

	for key, value in pairs(counts) do
		output = output .. value.. '*'.. key .. '/'
	end

	dfhack.internal.setClipboardTextCp437(output)
	collectgarbage()
