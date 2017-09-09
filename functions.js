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
