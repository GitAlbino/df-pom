local status = '{'
status = status .. '\"isFortress\":\"' .. tostring(dfhack.world.isFortressMode()) .. '\",'
status = status .. '\"site\":\"' .. tostring(dfhack.world.getCurrentSite()) .. '\",'
status = status .. '\"paused\":\"' .. tostring(dfhack.world.ReadPauseState()) .. '\",'
status = status .. '\"workOrderConditionOpen\":\"' .. tostring(df.global.game.main_interface.info.work_orders.conditions.open) .. '\"'
status = status .. '}'
print("DFPOM_STATUS_JSON:" .. status)
