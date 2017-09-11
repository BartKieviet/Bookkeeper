// -*- js3-indent-level: 8; js3-indent-tabs-mode: t -*-

// Contains functions used in both files.

function getUniverse() {
	var match;

	match = /^([^.]+)\.pardus\.at$/.exec( document.location.hostname );
	if ( match ) {
		return match[ 1 ];
	}

	return null;
}

function checkBuildingSaved(data,loc) {
	var index;
	var universe = getUniverse();
	var buildingListId = universe + "BuildingList";
	var saved = false;
	if (!!data[buildingListId]) {
		for (var i = 0; i < data[buildingListId].length; i++) {
			if (data[buildingListId][i] === loc) {
				saved = true;
				index = i;
			}
		}

	}
	// Returns true if we have data of the building.
	return [saved, index];
}

function removeBuilding(loc,universe) {
	chrome.storage.local.get(null,function(result){console.log(result)});
	var buildingListId = universe + "BuildingList";
	chrome.storage.local.get(buildingListId,removeBuildingData)
	function removeBuildingData (data) {
		data[buildingListId].splice(checkBuildingSaved(data,loc)[1],1);
		chrome.storage.local.remove(universe+"Building"+loc.toString())
		chrome.storage.local.set(data);
		chrome.storage.local.get(null,function(result){console.log(result)});
	}
}

function numberOfTicks( building ) {
	if( !(building.level > 0) )
		return Infinity;

	var minAmount = 9999;
	var minKey = "0";

	for (var key in building.res_upkeep) {
		if (building.amount[key]/building.res_upkeep[key] < minAmount) {
			minAmount = building.amount[key];
			minKey = key;
		}
	}
	var tickAmount = ((building.level - 1) * 0.4 + 1) * building.res_upkeep[minKey];
	var ticks = Math.floor(minAmount / tickAmount);
	return ticks;
}

function ticksPassed ( building ) {
	if( !(building.level > 0) )
		return 0;
	
	var timeToTick = 6 * 3600000 - (building.time - 5100000) % (6 * 3600000);
	var timePassed = Date.now() - building.time;
	
	var ticksPassed = 0;
	if (timePassed > timeToTick) {
		ticksPassed += 1;
	}
	ticksPassed += Math.floor(timePassed / (6 * 3600000));
	return ticksPassed;
}