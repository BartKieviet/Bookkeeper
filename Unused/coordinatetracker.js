var coordinateTracker = {

universe: '',
coordList: '',

// loads tracker file and parses it into array for useage.
loadData: function() {
	coordinateTracker.coordList = new Array();

	var loadList = Components.classes["@mozilla.org/preferences-service;1"]
			.getService(Components.interfaces.nsIPrefService)
			.getBranch("extensions.parduscopilot.")
			.getCharPref('coordinates');
	
	if (loadList == '') {
			newCoordinate = new coordinateTracker.tileObject();
			newCoordinate.tileID = 0;
			newCoordinate.sector = 'Sector';
			newCoordinate.coords = '[0,0]';
	} else {
		var loadedList = new Array();
		loadedList = loadList.split('.')
		while (loadedList.length > 0) {
			coordinateTracker.coordList.push(new coordinateTracker.tileObject(loadedList.shift(), loadedList.shift(), loadedList.shift()));
		}
	}
},

// Save data to stored file
saveData: function() {
	var saveList = "";
	
	for (rec = 0; rec < coordinateTracker.coordList.length; rec++) {
		saveList += coordinateTracker.coordList[rec].tileID + '.';
		saveList += coordinateTracker.coordList[rec].sector + '.';
		saveList += coordinateTracker.coordList[rec].coords + '.';
	}

	saveList = saveList.slice(0, saveList.length - 1);

	Components.classes["@mozilla.org/preferences-service;1"]
		.getService(Components.interfaces.nsIPrefService)
		.getBranch("extensions.parduscopilot.")
		.setCharPref('coordinates', saveList);
},

// Add a tile
addTile: function() {

	var sector = pTargetFrame.getElementById('sector').textContent;
	var coords = pTargetFrame.getElementById('coords').textContent;
//	alert ('Adding tile: ' + pShoreStatus.tileID + ' ' + sector + ' ' + coords);

	coordinateTracker.coordList.push(new coordinateTracker.tileObject(pShoreStatus.tileID, sector, coords));
	coordinateTracker.saveData();
},


trackCoordinates: function() {
	if (buildingTracker.IDindex(pShoreStatus.tileID) != -1) {
		if (coordinateTracker.IDindex(pShoreStatus.tileID) == -1) coordinateTracker.addTile();
	}
},

getLocation: function(tileID) {
	var gcIndex = coordinateTracker.IDindex(tileID);
	var coordString = "";
	if (gcIndex != -1) {
		coordString = coordinateTracker.coordList[gcIndex].sector;
		coordString += ' ' + coordinateTracker.coordList[gcIndex].coords;
	}
	return coordString;
},

getTileID: function(sector, coords) {
	var tileID = -1;
	for (record = 0; record < coordinateTracker.coordList.length; record++) {
		if (coordinateTracker.coordList[record].sector == sector
		 && coordinateTracker.coordList[record].coords == coords)
			tileID = coordinateTracker.coordList[record].tileID;
	}
	return tileID;
},

getSector: function(tileID) {
	var gcIndex = coordinateTracker.IDindex(tileID);
	var coordString = "";
	if (gcIndex != -1) coordString = coordinateTracker.coordList[gcIndex].sector;
	return coordString;
},

getCoords: function(tileID) {
	var gcIndex = coordinateTracker.IDindex(tileID);
	var coordString = "";
	if (gcIndex != -1) coordString = coordinateTracker.coordList[gcIndex].coords;
	return coordString;
},
		
tileObject: function(tileID, sector, coords) { 
	this.tileID = tileID;
	this.sector = sector;
	this.coords = coords;
},

// return index of building ID
IDindex: function(tileID) {
	var indexNo = -1;
	for (record = 0; record < coordinateTracker.coordList.length; record++) {
		if (coordinateTracker.coordList[record].tileID == tileID) indexNo = record;
	}
	return indexNo;
},


};






