var buildingTracker = {

originalContent: '',
universe: '',



// Displays Building Summary on Building>overview Page
displaySummary: function() {
	buildingTracker.personalBuildingStatus();
	var locateTable = pTargetFrame.getElementsByTagName('P')[0];
	pTargetFrame.getElementsByTagName('P')[0].innerHTML = buildingTracker.originalContent + buildingTracker.displayBuildingData();
	buildingTracker.addListeners();		
},


// If building is tracked, update info and return true, otherwise, returns false.
updateBuilding: function() {
	var indexNo = buildingTracker.IDindex(pShoreStatus.tileID);
	if (indexNo != -1) {
		pcpTrackList[indexNo].type = pShoreStatus.number;
		pcpTrackList[indexNo].owner = pShoreStatus.owner;
		pcpTrackList[indexNo].timeStamp = pShoreStatus.timeStamp;
		pcpTrackList[indexNo].commodity = new Array();
		for (com=0; com<pShoreStatus.commodityList.length; com++) {
			var number = pShoreStatus.commodityList[com];
			var min = pCommodity[number].shoreMin;
			var max = pCommodity[number].shoreMax;
			var amount = pCommodity[number].shoreStock;
			if (pcpTrackList[indexNo].owner == "You") amount += pCommodity[number].shoreComm;
			pcpTrackList[indexNo].commodity.push(new buildingTracker.commodityObject(number, min, max, amount));
		}
		buildingTracker.saveData();
		return true;
	} else return false;
},

// Update info from Building Index Screen
buildingIndexUpdate: function() {
	// Determine Sector
	var sector = pTargetFrame.getElementsByTagName('h1')[0].textContent;
	sector = sector.slice(0, sector.search(' Building Index'));

	var lastUpdate = Date.parse(pTargetFrame.getElementsByTagName('span')[0].lastChild.textContent);// - time.getTimezoneOffset()*60*1000;

	// Go building by building and update Tracked Buildings
	for (coordSearch = 0; coordSearch < pTargetFrame.getElementsByTagName('td').length; coordSearch++) {
		if (pTargetFrame.getElementsByTagName('td')[coordSearch].textContent[0] == '[') {
			var coords = pTargetFrame.getElementsByTagName('td')[coordSearch].textContent;
			var bldIndex = buildingTracker.IDindex(coordinateTracker.getTileID(sector, coords));
			var searchRow = pTargetFrame.getElementsByTagName('td')[coordSearch].parentNode;
//			if (bldIndex > 0) alert (Math.floor(lastUpdate/(1000*60)) + ' ' + Math.floor(pShoreStatus.timeStamp/(1000*60)));

			if (bldIndex > 0 && lastUpdate > pcpTrackList[bldIndex].timeStamp) {
				pcpTrackList[bldIndex].timeStamp = lastUpdate;
				for (imageNum = 1; imageNum < searchRow.getElementsByTagName('img').length; imageNum++) {
					var commodity = searchRow.getElementsByTagName('img')[imageNum].alt;
					var comNet = searchRow.getElementsByTagName('img')[imageNum].nextSibling.textContent;
					comNet = comNet.slice(comNet.lastIndexOf(' '), comNet.length) * 1;

					var comIndex = buildingTracker.comIndex(pcpTrackList[bldIndex].commodity, commodity);
					if (comIndex != -1) {
						//alert(pcpTrackList[bldIndex].type + ' ' + commodity);
						if (Stevedore.buildingConsumes(pcpTrackList[bldIndex].type, commodity))
							pcpTrackList[bldIndex].commodity[comIndex].amount = pcpTrackList[bldIndex].commodity[comIndex].max - comNet;
						else pcpTrackList[bldIndex].commodity[comIndex].amount = pcpTrackList[bldIndex].commodity[comIndex].min + comNet;
					}					
				}
			}
		}
	}
},

updatePersonalBuilding: function() {
	var indexNo = buildingTracker.IDindex(pShoreStatus.tileID);
	if (indexNo != -1) {
//		alert('Updating Personal Building');
		var com, max, listIndex;

		// Load all consumed commodities maxes into pCommodity Array
		for (index = 0; index<pcpTrackList[indexNo].commodity.length; index++) {
			com = pcpTrackList[indexNo].commodity[index].number;
			pCommodity[com].shoreMax = pcpTrackList[indexNo].commodity[index].max;
//			alert(pCommodity[com].name + " : " + pCommodity[com].shoreMax);
		}
	

		// Add missing consumed commodities to list
		for (index = 0; index<pBuilding[pcpTrackList[indexNo].type].consumes.length; index++) {
			com = pBuilding[pcpTrackList[indexNo].type].consumes[index];
			listIndex = pShoreStatus.commodityList.indexOf(com);
			if (listIndex == -1) pShoreStatus.commodityList.push(com);
		}

		// Update Master List
		buildingTracker.updateBuilding();
	}
},

	
// Building Settings (personal building extraction of trade settings).
updatePersonalMaxSettings: function() {

	// Determine Building's ID No.
	pShoreStatus.tileID = pTargetFrame.getElementsByTagName('Form')[0].action;
	pShoreStatus.tileID = pShoreStatus.tileID.slice(pShoreStatus.tileID.lastIndexOf('=') + 1, pShoreStatus.tileID.length);

	// Building Type
	for (ele = 0; ele < pTargetFrame.getElementsByTagName('B').length; ele++ ) {
		var type = pTargetFrame.getElementsByTagName('B')[ele].innerHTML;
		var number = Stevedore.index(pBuilding, type);
		if (number != -1) pShoreStatus.number = number;
	}

	pShoreStatus.owner = 'You';

	// info extraction
	pShoreStatus.commodityList = new Array();
	for (cell = 0; cell < pTargetFrame.getElementsByTagName('input').length; cell++ ) {
		var com, cellName;
		if (pTargetFrame.getElementsByTagName('input')[cell].name) {
			cellName = pTargetFrame.getElementsByTagName('input')[cell].name;
			if (cellName.search('_amount_max') != -1) {
				com = cellName.substring(0, cellName.indexOf('_'));
				pCommodity[com].shoreMax = pTargetFrame.getElementsByTagName('input')[cell].value*1;
				pCommodity[com].shoreMin = 0;
				pCommodity[com].shoreStock = 0;
				pCommodity[com].shoreComm = 0;
//				alert(pCommodity[com].name + " : " + pCommodity[com].shoreMax);

				pShoreStatus.commodityList.push(com);
			}
		}
	}
	
	// If missing, add, if there, update info
	if (!buildingTracker.updateBuilding()) buildingTracker.addBuilding();
},


// extract personal Building Info from Building>overiew Page
personalBuildingStatus: function() {

	if (buildingTracker.universe != pShoreStatus.universe) buildingTracker.loadData();

	var table;

	// locate table containing information
	for (th = 0; th < pTargetFrame.getElementsByTagName('TH').length; th++ ) {
		if (pTargetFrame.getElementsByTagName('TH')[th].innerHTML == 'Building')
			table = pTargetFrame.getElementsByTagName('TH')[th].parentNode.parentNode;
	}

	// go building by building and extract building data
	var row = table.firstChild.nextSibling.nextSibling;

	while (row != null) {
		// Extract Building ID, location, and Owner data
		pShoreStatus.tileID = row.getElementsByTagName('A')[0].href;
		pShoreStatus.tileID = pShoreStatus.tileID.substring(pShoreStatus.tileID.indexOf('=') + 1, pShoreStatus.tileID.length);

		pShoreStatus.number = Stevedore.index(pBuilding, row.getElementsByTagName('A')[0].textContent);
		pShoreStatus.owner = 'You';

		pShoreStatus.commodityList = new Array();

		var column = row.firstChild;
		for (col = 0; col < 8; col++ ) column = column.nextSibling;
		var number, index, amount = 0, min = 0, max = 0;

		// Determine how much stock commodities available and put in format for building updating
		for (item = 0; item < column.getElementsByTagName('TD').length; item++) {
			number = Stevedore.index(pCommodity, column.getElementsByTagName('IMG')[item].alt);
			amount = column.getElementsByTagName('TD')[item].textContent;
			amount = amount.substring(2, amount.length) * 1;
			pCommodity[number].shoreStock = amount;
			pCommodity[number].shoreComm = 0;
			pShoreStatus.commodityList.push(number);
		}

		// Determine available commodities
		column = column.nextSibling;

		for (item = 0; item < column.getElementsByTagName('IMG').length; item++) {
			number = Stevedore.index(pCommodity, column.getElementsByTagName('IMG')[item].alt);
			amount = column.getElementsByTagName('TD')[item].textContent;
			amount = amount.substring(2, amount.length) * 1;
			pCommodity[number].shoreComm = amount;

			// only add new commodity if it is not upkeep stock.
			if (pShoreStatus.commodityList.indexOf(number) == -1) {
				pShoreStatus.commodityList.push(number);
				pCommodity[number].shoreStock = 0;
				pCommodity[number].shoreMin = 0;
				pCommodity[number].shoreMax = 0;
			}
		}

		buildingTracker.updatePersonalBuilding();
		row = row.nextSibling;
	}
},


// loads tracker file and parses it into array for useage.
loadData: function() {
	if (pShoreStatus.universe) {
		buildingTracker.universe = pShoreStatus.universe;
	
		pcpTrackList = new Array;
		var loadList = Components.classes["@mozilla.org/preferences-service;1"]
				.getService(Components.interfaces.nsIPrefService)
				.getBranch("extensions.parduscopilot.")
				.getCharPref('buildings' + buildingTracker.universe);
	
		if (loadList == '') {
				newBuilding = new buildingTracker.buildingObject();
				newBuilding.tileID = 0;
				newBuilding.type = 'Building';
				newBuilding.owner = 'Owner';
				newBuilding.timeStamp = 0;
				newBuilding.include = new Array(1,1,1,1);
				pcpTrackList.push(newBuilding);
				buildingTracker.saveData();
		} else {
			var loadedList = new Array();
			loadedList = loadList.split('.');
			for (rec = 0; rec < loadedList.length; rec++) {
				var building = new Array();
				building = loadedList[rec].split(',');
				newBuilding = new buildingTracker.buildingObject();
				newBuilding.tileID = building.shift();
				newBuilding.type = building.shift();
				newBuilding.owner = building.shift();
				newBuilding.timeStamp = building.shift();
				newBuilding.include = new Array(building.shift(), building.shift(), building.shift(), building.shift());
				while (building.length > 1) {
					newBuilding.commodity.push(new buildingTracker.commodityObject(building.shift(), building.shift(), building.shift(), building.shift()));
				}
				if (!newBuilding.commodity) newBuilding.commodity.push(new buildingTracker.commodityObject(1,0,0,0));
				pcpTrackList.push(newBuilding);
			}
		}
	}
},

// Save data to stored file
saveData: function() {
	if (buildingTracker.universe == pShoreStatus.universe) {
		var buildingList = "";
		buildingList += pcpTrackList[0].tileID;
		buildingList += ',' + pcpTrackList[0].type;
		buildingList += ',' + pcpTrackList[0].owner;
		buildingList += ',' + pcpTrackList[0].timeStamp;
		buildingList += ',' + pcpTrackList[0].include[0];
		buildingList += ',' + pcpTrackList[0].include[1];
		buildingList += ',' + pcpTrackList[0].include[2];
		buildingList += ',' + pcpTrackList[0].include[3];
		buildingList += ',' + '0,0,0,0';
		if (pcpTrackList.length > 1) buildingList += '.';
	
		for (rec = 1; rec < pcpTrackList.length; rec++) {
			buildingList += pcpTrackList[rec].tileID;
			buildingList += ',' + pcpTrackList[rec].type;
			buildingList += ',' + pcpTrackList[rec].owner;
			buildingList += ',' + pcpTrackList[rec].timeStamp;
			buildingList += ',' + pcpTrackList[rec].include[0];
			buildingList += ',' + pcpTrackList[rec].include[1];
			buildingList += ',' + pcpTrackList[rec].include[2];
			buildingList += ',' + pcpTrackList[rec].include[3];
			for (com = 0; com < pcpTrackList[rec].commodity.length; com++) {
				buildingList += ',' + pcpTrackList[rec].commodity[com].number;
				buildingList += ',' + pcpTrackList[rec].commodity[com].min;
				buildingList += ',' + pcpTrackList[rec].commodity[com].max;
				buildingList += ',' + pcpTrackList[rec].commodity[com].amount;
			}
			if (rec < pcpTrackList.length - 1) buildingList += '.';
		}

		Components.classes["@mozilla.org/preferences-service;1"]
			.getService(Components.interfaces.nsIPrefService)
			.getBranch("extensions.parduscopilot.")
			.setCharPref('buildings' + buildingTracker.universe, buildingList);
	}
	else buildingTracker.loadData();
},



// ------------------------------------------------------
// ------------- Data Recording Functions ---------------
// ------------------------------------------------------

// Add a building
addBuilding: function() {
	if (pShoreStatus.number < 28 && buildingTracker.IDindex(pShoreStatus.tileID) == -1) {
//		alert('Adding Building: ' + pShoreStatus.tileID);
		newBuilding = new buildingTracker.buildingObject();
		newBuilding.tileID = pShoreStatus.tileID;
		newBuilding.owner = pShoreStatus.owner;
		newBuilding.type = pShoreStatus.number;
		newBuilding.timeStamp = pShoreStatus.timeStamp;
		newBuilding.include = new Array(1,0,0,0);
		for (com=0; com<pShoreStatus.commodityList.length; com++) {
			var number = pShoreStatus.commodityList[com];
			var min = pCommodity[number].shoreMin;
			var max = pCommodity[number].shoreMax;
			var amount = pCommodity[number].shoreStock;
			newBuilding.commodity.push(new buildingTracker.commodityObject(number, min, max, amount));
		}
		pcpTrackList.push(newBuilding);
		buildingTracker.saveData();
	}
},

overviewRemoveBuilding: function(ident) {
	var index = ident.target.id.substring(6,ident.target.id.length);
	buildingTracker.removeBuilding(index);
	buildingTracker.displaySummary();
},


tradeRemoveBuilding: function(ident) {
	var index = buildingTracker.IDindex(ident.target.id);
	buildingTracker.removeBuilding(index);
},

// Remove a building from the list
removeBuilding: function(index) {
	if (index != -1) {
//		alert('Removing Building: ' + pShoreStatus.tileID);
		pcpTrackList.splice(index, 1);
		buildingTracker.saveData();
	}
},

toggleInclude: function(ident) {
	var index = ident.target.id.substring(8,ident.target.id.length);
	var toggleNo = ident.target.id.substring(7, 8);
	if (index != -1) {
		if (pcpTrackList[index].include[toggleNo] == 1) pcpTrackList[index].include[toggleNo] = 0;
		else pcpTrackList[index].include[toggleNo] = 1;
		buildingTracker.saveData();
		buildingTracker.displaySummary();
	}
},

upBuilding: function(ident) {
	var index = ident.target.id.substring(2,ident.target.id.length);
	if (index > 1) {
		var tempBuilding = pcpTrackList[index];
		pcpTrackList.splice(index, 1);
		pcpTrackList.splice(index - 1, 0, tempBuilding);
		buildingTracker.saveData();
		buildingTracker.displaySummary();
	} 
},

dnBuilding:  function(ident) {
	var index = ident.target.id.substring(2,ident.target.id.length) * 1;
	if ((index > 0) && (index < pcpTrackList.length - 1)) {
		var tempBuilding = pcpTrackList[index];
		pcpTrackList.splice(index, 1);
		pcpTrackList.splice(index + 1, 0, tempBuilding);
		buildingTracker.saveData();
		buildingTracker.displaySummary();
	}
},

// Display Table of info
displayBuildingData: function() {
	buildingTracker.loadData();
	var includeCommodity = new Array();
	var root = 'http://static.pardus.at/images/res/';


	// Record zero serves as a storage for summary info
	// Set all commodities values in record zero to '0'
	pcpTrackList[0].commodity = new Array();
	for (com = 0; com < pCommodity.length; com++) {
		pcpTrackList[0].commodity.push(new buildingTracker.commodityObject(com, 0, 0, 0));
	}

	var min, max, net;
	// calculate net info and store for all included commodities
	for (rec = 1; rec < pcpTrackList.length; rec ++) {
		for (com = 0; com < pcpTrackList[rec].commodity.length; com++) {
			net = 0; min = 0; max = 0;
			if (pBuilding[pcpTrackList[rec].type].consumes.indexOf(pcpTrackList[rec].commodity[com].number * 1) != -1) {
				net = pcpTrackList[rec].commodity[com].amount - pcpTrackList[rec].commodity[com].max;
				if (net > 0) net=0;
				min = net;
			} else {
				net = pcpTrackList[rec].commodity[com].amount - pcpTrackList[rec].commodity[com].min;
				if (net < 0) net=0;
				max = net;
			}
			pcpTrackList[rec].commodity[com].net = net;
			if (buildingTracker.include(rec)) {
				var index = buildingTracker.comIndex(pcpTrackList[0].commodity, pcpTrackList[rec].commodity[com].number);
				pcpTrackList[0].commodity[index].net += net;
				pcpTrackList[0].commodity[index].min += min;
				pcpTrackList[0].commodity[index].max += max;
			}
		}
	}


	// abreviate shown commodities to needed/have items
	for (com = 1; com < pcpTrackList[0].commodity.length; com ++) {
		if ((pcpTrackList[0].commodity[com].min && pcpTrackList[0].commodity[com].min != 0)
		 || (pcpTrackList[0].commodity[com].max && pcpTrackList[0].commodity[com].max != 0)) {
			includeCommodity.push(com);
		}
	}


	// Code the table
	var inclNeg = '#cc3300', inclPos = '#99ff00', exclNeg = '#660000', exclPos = '#006600', zero = '#000000';
	var useColor, useNeg, usePos;

	var tableCode = '<br><table background="http://static.pardus.at/images/bgdark.gif" class="messagestyle" align="center">';
	var includedBuildings = "";
	var satisfiedBuildings = "";
	var excludedBuildings = "";

	var imageRow = "";
	var incHeaderRow = '<tr>';
	var headerRow = '';
	var satHeaderRow = '<tr><td align="center">Satisfied</td>';
	var excHeaderRow = '<tr><td align="center">Excluded</td>';

	// Build Header row
	var blankCols = 1; 
	
	// Building Column
	if (pardusCopilot.checkOption('tableBuildingType')) {
		blankCols ++;
		headerRow += '<td align="center">' + pcpTrackList[0].type + '</td>';
	}

	// Owner Column
	if (pardusCopilot.checkOption('tableOwnerName')) {
		blankCols ++;
		headerRow += '<td align="center">' + pcpTrackList[0].owner + '</td>';
	}

	// Location Column
	if (pardusCopilot.checkOption('tableSector') || pardusCopilot.checkOption('tableCoords')) {
		blankCols ++;
		headerRow += '<td align="center">Location</td>';
	}

	// Ticks since info update Column
	if (pardusCopilot.checkOption('tableTicks')) {
		blankCols ++;
		headerRow += '<td align="center">Ticks Old</td>';
	}

	blankCols --;

	// insert Net Row
	tableCode += '<tr><td colspan=' + blankCols + '></td><td align = right>Net:</td>';
	for (com = 0; com < includeCommodity.length; com++) {
		tableCode += '<td align = center>';
		var index = buildingTracker.comIndex(pcpTrackList[0].commodity, includeCommodity[com]);
		var showValue = pcpTrackList[0].commodity[index].net;
		if (showValue < 0) useColor = inclNeg;
		else if (showValue == 0) useColor = zero;
		else useColor = inclPos;
		tableCode += '<font color = "' + useColor + '">' + Math.abs(showValue) + '</font></td>';
	}
	tableCode += '</tr>';

	// insert Avalilable row
	tableCode += '<tr><td colspan=' + blankCols + '></td><td align = right>Available:</td>';
	for (com = 0; com < includeCommodity.length; com++) {
		tableCode += '<td align = center>';
		var comIndex = buildingTracker.comIndex(pcpTrackList[0].commodity, includeCommodity[com]);
		var showValue = pcpTrackList[0].commodity[comIndex].max;
		if (showValue == 0) useColor = zero;
		else useColor = inclPos;
		tableCode += '<font color = "' + useColor + '">' + Math.abs(showValue) + '</font></td>';
	}
	tableCode += '</tr>';

	// insert needed row
	tableCode += '<tr><td colspan=' + blankCols + '></td><td align = right>Required:</td>';
	for (com = 0; com < includeCommodity.length; com++) {
		tableCode += '<td align = center>';
		var comIndex = buildingTracker.comIndex(pcpTrackList[0].commodity, includeCommodity[com]);
		var showValue = pcpTrackList[0].commodity[comIndex].min;
		if (showValue < 0) useColor = inclNeg;
		else useColor = zero;
		tableCode += '<font color = "' + useColor + '">' + Math.abs(showValue) + '</font></td>';
	}
	tableCode += '</tr>';

	// Commodity Images
	for (com = 0; com < includeCommodity.length; com++ ) imageRow += '<td align="center"><img src="' + root + pCommodity[includeCommodity[com]].imagePath + '"</img></td>';
	imageRow += '</tr>';

	// Assemble Included Header
	incHeaderRow += '<td align="center">';
	for (inc = 0; inc < pcpTrackList[0].include.length; inc++ ) incHeaderRow += '<input type="checkbox" id="include' + inc + '0' + '">';
	incHeaderRow += '</td>' + headerRow + imageRow;

	satHeaderRow += headerRow + imageRow;
	excHeaderRow += headerRow + imageRow;

	// Insert Buildings
	for (rec = 1; rec < pcpTrackList.length; rec++) {
		var buildingRow = '';
		var satisfied = true;
		var include = buildingTracker.include(rec);

		buildingRow += '<tr><td align="center"	width="80">';
		for (inc = 0; inc < pcpTrackList[rec].include.length; inc++ ) {
			buildingRow += '<input type="checkbox" id="include' + inc + rec + '">';
		}
		buildingRow += '</td>';

		if (pardusCopilot.checkOption('tableBuildingType')) buildingRow += '<td align="center">' + pBuilding[pcpTrackList[rec].type].nameAbrev + '</td>';
		if (pardusCopilot.checkOption('tableOwnerName')) buildingRow += '<td align="center">' + pcpTrackList[rec].owner + '</td>';
		if (pardusCopilot.checkOption('tableSector') || pardusCopilot.checkOption('tableCoords')) {
			buildingRow += '<td align="center">'
			if (pardusCopilot.checkOption('tableSector')) buildingRow += coordinateTracker.getSector(pcpTrackList[rec].tileID) + ' ';
			if (pardusCopilot.checkOption('tableCoords')) buildingRow += coordinateTracker.getCoords(pcpTrackList[rec].tileID);
			buildingRow += '</td>';
		}
		if (pardusCopilot.checkOption('tableTicks')) buildingRow += '<td align="center">' + buildingTracker.getTicks(pcpTrackList[rec].timeStamp) + '</td>';

		if (include) { usePos = inclPos; useNeg = inclNeg; }
		else { usePos = exclPos; useNeg = exclNeg; }

		for (com = 0; com < includeCommodity.length; com++ ) {
			buildingRow += '<td align="center">';
			var comIndex = buildingTracker.comIndex(pcpTrackList[rec].commodity, includeCommodity[com]);
			if (comIndex != -1) {
				var showValue = pcpTrackList[rec].commodity[comIndex].net;
				if (showValue < 0) useColor = useNeg;
				else if (showValue == 0) useColor = zero;
				else useColor = usePos;
				buildingRow += '<font color = "' + useColor + '">' + Math.abs(showValue) + '</font>';
				if (showValue != 0) satisfied = false;
			}
			buildingRow += '</td>';
		}

		// Add Control Buttons
		if (!satisfied) {
			buildingRow += '<td align="center"><input style="width:15px;height:22px" type="button" id="up' + rec + '" value = "^"></td>';
			buildingRow += '<td><input style="width:15px;height:22px" type="button" id="dn' + rec + '" value = "v"></td>';
		} else { buildingRow += '<td></td><td></td>'; }
		buildingRow += '<td align="center"><input type="button" id="remove' + rec + '" value = "Rem"></td></tr>';

		
		if (satisfied) satisfiedBuildings += buildingRow;
		else if (include) includedBuildings += buildingRow;
		else excludedBuildings += buildingRow;
	}

	tableCode += incHeaderRow + includedBuildings;
//	alert (excludedBuildings);
//	alert (satisfiedBuildings);
	if (excludedBuildings != "") tableCode += excHeaderRow + excludedBuildings;
	if (satisfiedBuildings != "") tableCode += satHeaderRow + satisfiedBuildings;
	tableCode += '<tr><td></td>' + headerRow + imageRow;
	tableCode += '</table>';

	return tableCode;
},

// Displays overview status on each building on main screen
displayMainScreen: function() {
	if (buildingTracker.universe != pShoreStatus.universe) buildingTracker.loadData();
	for (indexNo = 1; indexNo < pcpTrackList.length; indexNo++) {
		if (buildingTracker.include(indexNo) && pTargetFrame.getElementById('tileID' + pcpTrackList[indexNo].tileID)) {
			var cellAnchor = pTargetFrame.getElementById('tileID' + pcpTrackList[indexNo].tileID);
			// Calculate values to show
			comArray = new Array();
			netArray = new Array();

			for (com = 0; com < pcpTrackList[indexNo].commodity.length; com++) {
				var net = 0;
				if (Stevedore.buildingConsumes(pcpTrackList[indexNo].type, pcpTrackList[indexNo].commodity[com].number * 1)) {
					net = pcpTrackList[indexNo].commodity[com].amount - pcpTrackList[indexNo].commodity[com].max;
					if (net > 0) net = 0;
				} else {
					net = pcpTrackList[indexNo].commodity[com].amount - pcpTrackList[indexNo].commodity[com].min;
					if (net < 0) net = 0;
				}

				netArray.push(net);
				comArray.push(pcpTrackList[indexNo].commodity[com].number * 1);
			}

			var inclNeg = '#cc3300', inclPos = '#99ff00', useColor = inclNeg;
			var tableCoding = '<table border="0" cellpadding="0" cellspacing="0" width="64" height="64" ';
			tableCoding += 'background="' + cellAnchor.getElementsByTagName('IMG')[0].src + '")>';
			tableCoding += '<tr>';
			var cellCoding = "";
				
			for (row = 0; row<3; row++) {
				for (col=1; col<4; col++) {
					tableCoding += '<td>';
					cellCoding = '.';
					if ((row == 0 && comArray[0] == col) || (row > 0)) {
						if (comArray[0]) var letter = pCommodity[comArray[0]].name[0];
						if  (netArray[0] < 0) cellCoding = '<font size="1" color = "' + inclNeg + '">' + letter;
						if  (netArray[0] > 0) cellCoding = '<font size="1" color = "' + inclPos + '">' + letter;
						comArray.splice(0,1); netArray.splice(0,1);
					}
					tableCoding += (cellCoding + '<td>');
				}
				tableCoding += '</tr><tr>';
			}

			tableCoding += '</tr></table>';
			cellAnchor.innerHTML = tableCoding;
			cellAnchor.addEventListener('click', pardusCopilot.getDynamicID, false);
		}
	}
},

// Add event listeners to the buttons
addListeners: function() {
	for (rec = 0; rec < pcpTrackList.length; rec++) {
		for (incl = 0; incl < pcpTrackList[rec].include.length; incl++) {
			if (pcpTrackList[rec].include[incl] == 1)
				pTargetFrame.getElementById('include' + incl + rec).checked = true;
			pTargetFrame.getElementById('include' + incl + rec).addEventListener('click', buildingTracker.toggleInclude, true);
		}
		if (pTargetFrame.getElementById('remove' + rec))
			pTargetFrame.getElementById('remove' + rec).addEventListener('click', buildingTracker.overviewRemoveBuilding, true);
		if (pTargetFrame.getElementById('up' + rec))
			pTargetFrame.getElementById('up' + rec).addEventListener('click', buildingTracker.upBuilding, true);
		if (pTargetFrame.getElementById('dn' + rec))
			pTargetFrame.getElementById('dn' + rec).addEventListener('click', buildingTracker.dnBuilding, true);
	}
},


// Building Object
copyBuildingObject: function(original) {
	copy = new buildingObject(original.tileID, original.type, original.owner)
	copy.timeStamp = original.timeStamp;
	copy.include = original.include;
	copy.commodityNumber = original.commodityNumber;
	copy.commodityAmount = original.commodityAmount;
},

buildingObject: function() { 
	this.tileID = '';
	this.owner = '';
	this.type = '';
	this.timeStamp = 0;
	this.commodity = new Array();
},

commodityObject: function(commodityNumber, min, max, amount) {
	this.number = commodityNumber;
	this.min = min;
	this.max = max;
	this.amount = amount;
	this.net = 0;	
},

include: function(indexNo) {
	var includeBldg = false;
	if (pcpTrackList[indexNo]) {
		for (col = 0; col < 4; col++) {
			if (pcpTrackList[0].include[col] == 1 && pcpTrackList[indexNo].include[col] == 1) includeBldg = true;
		}
	}
	return includeBldg;
},

// return index of building ID
IDindex: function(tileID) {
	if (buildingTracker.universe != pShoreStatus.universe) buildingTracker.loadData();

	var indexNo = -1;
	for (record = 1; record < pcpTrackList.length; record++) {
		//alert (pcpTrackList[record].tileID + ' : *' + tileID);

		if (pcpTrackList[record].tileID == tileID) indexNo = record;
	}
	return indexNo;
},

comIndex: function(commodityObjectArray, commodity) {
	var indexNo = -1;
	if (isNaN(commodity * 1)) commodity = Stevedore.index(pCommodity, commodity);
	for (ciIndex = 0; ciIndex < commodityObjectArray.length; ciIndex++) {
		if (commodityObjectArray[ciIndex].number == commodity) indexNo = ciIndex;
	}
	return indexNo;
},

getTicks: function(timeStamp){
	var currentTick = Math.floor((pShoreStatus.timeStamp/(1000*60) - 85)/360);
	var updateTick = Math.floor((timeStamp/(1000*60) - 85)/360);
	var ticksSinceUpdate = currentTick - updateTick;
	return (ticksSinceUpdate);
	var today=new Date();
	var h=today.getHours();
	var m=today.getMinutes();
	var time = h + ':' + m + ' ';
	today.setTime(timeStamp);
	h = today.getHours();
	m = today.getMinutes();
//	return (time + h + ':' + m);
	return (ticksSinceUpdate);
}

};






