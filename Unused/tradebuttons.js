var TradeButtons = {

// Return a list of commands for the current tile
getList: function(universe, tileID) {
	buttonList = new Array();
	for (glIndexNo = 0; glIndexNo < pcpButtonList.length; glIndexNo++) {
//		alert("'" + universe + "' '" + pcpButtonList[glIndexNo].universe + "'    '" + tileID + "' '" + pcpButtonList[glIndexNo].tileID + "'");
		if (pcpButtonList[glIndexNo].tileID == tileID
		 && pcpButtonList[glIndexNo].universe == universe) {
			buttonList.push(TradeButtons.copyButtonObject(pcpButtonList[glIndexNo]));
		}
	}

	if (buttonList.length < 1) {
		var location;	
		if (pShoreStatus.number <= 28) location = 'Buildings';
		if (pShoreStatus.number == 29) location = 'Starbases';
		if (pShoreStatus.number == 30) location = 'Planets';
		if (pShoreStatus.number == 31) location = 'Starbases';
		for (glIndexNo = 0; glIndexNo < pcpButtonList.length; glIndexNo++) {
			if (pcpButtonList[glIndexNo].tileID == location) {
				buttonList.push(TradeButtons.copyButtonObject(pcpButtonList[glIndexNo]));
			}
		}
	}
	return buttonList;
},

// Adds new list of buttons, or Replaces all buttons for specific location with given list
addButtonList: function(newList) {
	if (newList.length > 0) {
		var universe = newList[0].universe;
		var tileID = newList[0].tileID;
		
		// first clear all buttons from tile
		TradeButtons.clearTile(universe, tileID);

		// Add new buttons to list
		for (ablIndexNo = 0; ablIndexNo < newList.length; ablIndexNo++) pcpButtonList.push(newList[ablIndexNo]);

		TradeButtons.saveData();
	}
},

// Clears all buttons on a given tile and universe
clearTile: function(universe, tileID) {
	for (ctIndexNo = pcpButtonList.length - 1; ctIndexNo >= 0; ctIndexNo--) {
		if (pcpButtonList[ctIndexNo]
		 && pcpButtonList[ctIndexNo].universe == universe
		 && pcpButtonList[ctIndexNo].tileID == tileID) {
			TradeButtons.removeButton(pcpButtonList[ctIndexNo]);
		}
	}
},

// Resets Standard Button List to pre-defined standard
resetStandardList: function(listName){
	standardList = new Array();
	if (listName == 'Starbases') standardList = TradeButtons.starbaseButtons();
	if (listName == 'Planets') standardList = TradeButtons.planetButtons();
	if (listName == 'Buildings') standardList = TradeButtons.buildingButtons();
	TradeButtons.addButtonList(standardList);
},

// ------------------------------------------------------
// ------------- Data Manipulating Functions ---------------
// ------------------------------------------------------


// loads button file and parses it into array for useage.
loadData: function() {
	pcpButtonList = new Array;
	var loadList = Components.classes["@mozilla.org/preferences-service;1"]
			.getService(Components.interfaces.nsIPrefService)
			.getBranch("extensions.parduscopilot.")
			.getCharPref('buttons');
	if (loadList != '') {
		var loadedList = loadList.split('.');
		while (loadedList.length > 0) {
			var button = loadedList.shift();
			button = button.split(',');
			newButton = new TradeButtons.buttonObject();
			newButton.universe = button.shift();
			newButton.tileID = button.shift();
			newButton.name = button.shift();
			newButton.hotKey = button.shift();
			newButton.commands = new Array();
			while (button.length > 0) newButton.commands.push(new TradeButtons.commandObject(button.shift(), button.shift(), button.shift(), pCommodity[button.shift()].name));
			pcpButtonList.push(newButton);
		}
	} else {
	// Create New List with Hard Wired Standard button Lists
		TradeButtons.addButtonList(TradeButtons.buildingButtons());
		TradeButtons.addButtonList(TradeButtons.starbaseButtons());
		TradeButtons.addButtonList(TradeButtons.planetButtons());
		TradeButtons.saveData();
	}
},

// Save data to stored file
saveData: function() {
	var buttonList = "";
	for (sdIndexNo = 0; sdIndexNo < pcpButtonList.length; sdIndexNo++) {
		var commodityNumber;
		buttonList += pcpButtonList[sdIndexNo].universe + ',';
		buttonList += pcpButtonList[sdIndexNo].tileID + ',';
		buttonList += pcpButtonList[sdIndexNo].name + ',';
		buttonList += pcpButtonList[sdIndexNo].hotKey + ',';
		for (act = 0; act < pcpButtonList[sdIndexNo].commands.length; act++) {
			commodityNumber = Stevedore.index(pCommodity, pcpButtonList[sdIndexNo].commands[act].commodity);
			buttonList += pcpButtonList[sdIndexNo].commands[act].destination + ',';
			buttonList += pcpButtonList[sdIndexNo].commands[act].transaction + ',';
			buttonList += pcpButtonList[sdIndexNo].commands[act].amount + ',';
			buttonList += commodityNumber + ',';
		}
		buttonList = buttonList.slice(0, buttonList.length - 1);
		buttonList += '.';
	}
	buttonList = buttonList.slice(0, buttonList.length - 1);
	Components.classes["@mozilla.org/preferences-service;1"]
		.getService(Components.interfaces.nsIPrefService)
		.getBranch("extensions.parduscopilot.")
		.setCharPref('buttons', buttonList);
},

// Add a building
addButton: function(newButton) {
	alert('Adding Button: ' + newButton.name);
	pcpButtonList.push(newButton);
	TradeButtons.saveData();
},


// Remove a building from the list
removeButton: function(removeButton) {
	var indexNo = TradeButtons.buttonIndex(removeButton);
	if (indexNo != -1) {
//		alert('Removing Button: ' + pcpButtonList[indexNo].name);
		pcpButtonList.splice(indexNo,  1);
		TradeButtons.saveData();
	}
},

// Copy Button Object
copyButtonObject: function(original) {
	var universe = original.universe;
	var tileID = original.tileID;
	var name = original.name;
	var hotKey = original.hotKey;
	var commands = new Array();
	commands = original.commands.slice(0);
	copy = new TradeButtons.buttonObject(universe, tileID, name, hotKey, commands);
	return copy;
},

// Button object
buttonObject: function(universe, tileID, name, hotKey, commands) {
	this.universe = universe;
	this.tileID = tileID;
	this.name = name;
	this.hotKey = hotKey;
	this.commands = commands;
},

commandObject: function(destination, transaction, amount, commodityNumber) {
	this.destination = destination;
	this.transaction = transaction;
	this.amount = amount;
	this.commodity = commodityNumber;
},


// return index of building ID
buttonIndex: function(findButton) {
	var index = -1;
	for (biIndexNo = 0; biIndexNo < pcpButtonList.length; biIndexNo++) {
		if (findButton.universe == pcpButtonList[biIndexNo].universe
		 && findButton.tileID == pcpButtonList[biIndexNo].tileID
		 && findButton.name == pcpButtonList[biIndexNo].name) {
			index = biIndexNo;
		}
	}
	return index;
},


// ------------------------------------------------------
// ------------- Pre Defined Standard Buttons -----------
// ------------------------------------------------------

buildingButtons: function() {
	// Service Building Buttons

	var buttonList = new Array();

	var commands0 = new Array;
	commands0.push(new TradeButtons.commandObject('shore', 'fillTo', '100%', 'All'));
	commands0.push(new TradeButtons.commandObject('ship', 'transfer', '100%', 'All'));
	buttonList.push(new TradeButtons.buttonObject('All', 'Buildings', 'Easy Button', 'e', commands0));

	// Sell all
	var commands1 = new Array;
	commands1.push(new TradeButtons.commandObject('shore', 'fillTo', '100%', 'All'));
	buttonList.push(new TradeButtons.buttonObject('All', 'Buildings', 'Sell All', 's', commands1));

	// Buy all
	var commands2 = new Array;
	commands2.push(new TradeButtons.commandObject('ship', 'transfer', '100%', 'All'));
	buttonList.push(new TradeButtons.buttonObject('All', 'Buildings', 'Buy All', 'b', commands2));

	return buttonList;
},

starbaseButtons: function() {
	// Service Starbase Buttons
	var buttonList = new Array();

	// Planet Run
	var commands0 = new Array;
	commands0.push(new TradeButtons.commandObject('shore', 'transfer', '100%', 'All'));
	commands0.push(new TradeButtons.commandObject('ship', 'maintain', '5t', 'Hydrogen fuel'));
	commands0.push(new TradeButtons.commandObject('ship', 'transfer', '100%', 'Energy'));
	buttonList.push(new TradeButtons.buttonObject('All', 'Starbases', 'Planet Run', 's', commands0));

	// Unload Ship
	var commands1 = new Array;
	commands1.push(new TradeButtons.commandObject('shore', 'transfer', '100%', 'All'));
	buttonList.push(new TradeButtons.buttonObject('All', 'Starbases', 'Unload Ship', 'u', commands1));

	return buttonList;
},


planetButtons: function() {
	var buttonList = new Array();

	// Starbase Run
	var commands0 = new Array;
	commands0.push(new TradeButtons.commandObject('shore', 'transfer', '100%', 'All'));
	commands0.push(new TradeButtons.commandObject('ship', 'maintain', '5t', 'Hydrogen fuel'));
	commands0.push(new TradeButtons.commandObject('ship', 'fillTo', '60%', 'Food'));
	commands0.push(new TradeButtons.commandObject('ship', 'fillTo', '100%', 'Water'));
	buttonList.push(new TradeButtons.buttonObject('All', 'Planets', 'Starbase Run', 's', commands0));

	// Building Stock Run
	var commands1 = new Array;
	commands1.push(new TradeButtons.commandObject('shore', 'transfer', '100%', 'All'));
	commands1.push(new TradeButtons.commandObject('ship', 'maintain', '5t', 'Hydrogen fuel'));
	commands1.push(new TradeButtons.commandObject('ship', 'fillTo', '50%', 'Food'));
	commands1.push(new TradeButtons.commandObject('ship', 'fillTo', '100%', 'Water'));
	buttonList.push(new TradeButtons.buttonObject('All', 'Planets', 'Stock Run', 'b',  commands1));

	// Food Run
	var commands2 = new Array;
	commands2.push(new TradeButtons.commandObject('shore', 'transfer', '100%', 'All'));
	commands2.push(new TradeButtons.commandObject('ship', 'maintain', '5t', 'Hydrogen fuel'));
	commands2.push(new TradeButtons.commandObject('ship', 'fillTo', '100%', 'Food'));
	buttonList.push(new TradeButtons.buttonObject('All', 'Planets', 'Food Run', 'f',  commands2));

	// Water Run
	var commands3 = new Array;
	commands3.push(new TradeButtons.commandObject('shore', 'transfer', '100%', 'All'));
	commands3.push(new TradeButtons.commandObject('ship', 'maintain', '5t', 'Hydrogen fuel'));
	commands3.push(new TradeButtons.commandObject('ship', 'fillTo', '100%', 'Water'));
	buttonList.push(new TradeButtons.buttonObject('All', 'Planets', 'Water Run', 'w', commands3));

	// Unload Ship
	var commands4 = new Array;
	commands4.push(new TradeButtons.commandObject('shore', 'transfer', '100%', 'All'));
	buttonList.push(new TradeButtons.buttonObject('All', 'Planets', 'Unload Ship', 'u',  commands4));

	return buttonList;
},


};