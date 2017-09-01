var buttonUtils = {

initialize: function(popupWindow) {
	buttonUtils.loadCommodities();
	document.getElementById('buttonList').addEventListener('click', buttonUtils.loadSelectedButton, true);
	document.addEventListener('focus', buttonUtils.locationCheck, true);
	buttonUtils.buttonList = new Array();
	document.getElementById('locationSelect').selectedIndex = -1;
	buttonUtils.clearCommandSelect();
},


// If not on proper current location, load current location
locationCheck: function() {
	if (document.getElementById('locationSelect').selectedItem
	 && document.getElementById('locationSelect').selectedItem.getAttribute('id') == 'currentLocation'
	 && document.getElementById('locationTileID').value != window.opener.pShoreStatus.tileID)
		buttonUtils.loadList();
},

// Populates the commodity drop down selector.
loadCommodities: function() {
	for (com=0; com<window.opener.pCommodity.length; com++) {
		if (window.opener.pCommodity[com] != null) {
			document.getElementById('commoditySelect').appendItem(window.opener.pCommodity[com].name, com);
		}
	}
},

// Retrives the current location tileID from the Copilot Data
loadList: function() {
	var location = document.getElementById('locationSelect').selectedItem.getAttribute('id');

	if (location == 'currentLocation') {
		document.getElementById('locationTileID').value = window.opener.pShoreStatus.tileID;
		document.getElementById('locationUniverse').value = window.opener.pShoreStatus.universe;
	} else {
		document.getElementById('locationTileID').value = location;
		document.getElementById('locationUniverse').value = 'All';
	}

	buttonUtils.buttonList = window.opener.TradeButtons.getList(buttonUtils.universe(), buttonUtils.tileID());
	
	buttonUtils.loadButtonList();
	document.getElementById('buttonList').selectedIndex = 0;
	buttonUtils.loadSelectedButton();
},


// Returns the value in the Tile ID textbox
tileID: function() {
	var value = document.getElementById('locationTileID').value;
	value = value.replace(/[^a-z\d ]+/ig,'');
//	alert("TileID: '" + value + "'");
	return value;
},

// Returns the value in the Universe selection
universe: function() {
	var value = document.getElementById('locationUniverse').value;
	value = value.replace(/[^a-z\d ]+/ig,'');
//	alert("Universe: " + value);
	return value;
},

// Returns the value in the button name textbox
name: function() {
	var value = document.getElementById('buttonName').value;
	value = value.replace(/[^a-z\d ]+/ig,'');
//	alert("Name: " + value);
	return value;
},

// Returns the value in the hotKey textbox
hotKey: function() {
	var value = document.getElementById('buttonHotKey').value;
	value = value.replace(/[^a-z\d ]+/ig,'');
//	alert("hotKey: " + value);
	return value;
},


// returns the amount in percent or tons
amount: function() {
	var amount = false;
	if (document.getElementById('amountSelect').selectedIndex != -1) {
		if (document.getElementById('amountSelect').selectedItem.getAttribute('id') == "amountMax") amount = '100%';
		else {
			var amount = document.getElementById('amountValue').value.replace(/[^a-z\d ]+/ig,'') * 1;
			if (isNaN(amount) || amount == '') {
				alert ('Amount must be a number...');
				document.getElementById('amountValue').value = '';
				amount = false;
			}
		
			else if (document.getElementById('amountSelect').selectedItem.getAttribute('id') == "amountPercentage") amount += '%';
			else if (document.getElementById('amountSelect').selectedItem.getAttribute('id') == "amountTons") amount += 't';
		}
	}
	return amount;
},

// Clears button list of all data.
clearButtonList: function() {
	document.getElementById('buttonName').value = '';
	document.getElementById('buttonHotKey').value = '';

	while (document.getElementById('buttonList').itemCount > 0) {
		document.getElementById('buttonList').removeChild(document.getElementById('buttonList').lastChild);
	}
	buttonUtils.clearCommandList();
},

// Clears command list of all data.
clearCommandList: function() {
	while (document.getElementById('commandList').itemCount > 0) {
		document.getElementById('commandList').removeChild(document.getElementById('commandList').lastChild);
	}
	buttonUtils.clearCommandSelect();
},

clearCommandSelect: function() {
	document.getElementById('destinationSelect').selectedIndex = -1;
	document.getElementById('transactionSelect').selectedIndex = -1;
	document.getElementById('amountSelect').selectedIndex = -1;
	document.getElementById('amountValue').value = '';
	document.getElementById('commoditySelect').selectedIndex = -1;
},

// --------------------- Button List Functions ------------------------

// loads the current "buttonList" into the "buttonList" List...
loadButtonList: function() {
	buttonUtils.clearButtonList();
	buttonUtils.clearCommandList();
	buttonUtils.clearCommandSelect();

	// add blank button
	var buttonLine = '   (Blank Button)';
	document.getElementById('buttonList').appendItem(buttonLine);

	// Add Buttons to List
	for (lblButtonNo = 0; lblButtonNo<buttonUtils.buttonList.length; lblButtonNo++) {
		buttonLine = '(' + buttonUtils.buttonList[lblButtonNo].hotKey + ') ' + buttonUtils.buttonList[lblButtonNo].name;
		document.getElementById('buttonList').appendItem(buttonLine);
	}
},

// Saves the current buttonList
saveButtonList: function() {
	for (sblButtonNo = 0; sblButtonNo < buttonUtils.buttonList.length; sblButtonNo++) {
		buttonUtils.buttonList[sblButtonNo].universe = buttonUtils.universe();
		buttonUtils.buttonList[sblButtonNo].tileID = buttonUtils.tileID();
	}
	window.opener.TradeButtons.addButtonList(buttonUtils.buttonList);
	buttonUtils.loadList();
},


// Reverts selected location to Standard button List
revertToStandard: function() {
	window.opener.TradeButtons.clearTile(buttonUtils.universe(), buttonUtils.tileID());
	if (buttonUtils.universe() == 'All') {
		if (buttonUtils.tileID() == 'Starbases') buttonUtils.buttonList = window.opener.TradeButtons.starbaseButtons();
		else if (buttonUtils.tileID() == 'Buildings') buttonUtils.buttonList = window.opener.TradeButtons.buildingButtons();
		else if (buttonUtils.tileID() == 'Planets') buttonUtils.buttonList = window.opener.TradeButtons.planetButtons();
		buttonUtils.saveButtonList();
	}
	buttonUtils.loadList();
},


// ----------------------- Button Functions ----------------------------

// When Button is selected in Button List, automatically loads commands, name, and hotkey.
loadSelectedButton: function() {
	var buttonNo = document.getElementById('buttonList').selectedIndex - 1;
	if (buttonNo == -1) buttonUtils.currentButton = new window.opener.TradeButtons.buttonObject ('','','','', new Array());
	else buttonUtils.currentButton = buttonUtils.buttonList[buttonNo];
	document.getElementById('buttonName').value = buttonUtils.currentButton.name;
	document.getElementById('buttonHotKey').value = buttonUtils.currentButton.hotKey;
	buttonUtils.loadCommandList();
},

// Checks new button info for validity and adds or replaces button as necessary.
saveButton: function() {
	var addButton = true;

	var name = buttonUtils.name();
	var hotKey = buttonUtils.hotKey();
	var universe = buttonUtils.universe();
	var tileID = buttonUtils.tileID();
	var commands = buttonUtils.currentButton.commands;

	var newButton = new Array();
	newButton = new window.opener.TradeButtons.buttonObject(universe, tileID, name, hotKey, commands);

	if (newButton.name == '') {
		alert('Please Add a name for your Button.')
		addButton = false;
	}

	//if (newButton.hotKey == '') {
	//	alert('Please Add a Hot Key')
	//	addButton = false;
	//}

	if (newButton.commands.length < 1) {
		alert ('Please Add some commands to your Button.');
		addButton = false;
	}

	// If button with that name exists, replace, otherwise add it to the end.
	if (addButton == true) {
		var newButtonIndex = -1;
		for (sbButtonNo = 0; sbButtonNo < buttonUtils.buttonList.length; sbButtonNo ++) {
			if (buttonUtils.buttonList[sbButtonNo].name == newButton.name) newButtonIndex = sbButtonNo;
		}

		if (newButtonIndex > -1) buttonUtils.buttonList.splice(newButtonIndex, 1, newButton);
		else buttonUtils.buttonList.push(newButton);
		buttonUtils.loadButtonList();	
	}
},

// moves the selected Button up one position
upButton: function() {
	var indexNo = document.getElementById('buttonList').selectedIndex - 1;

	if (indexNo > 0) {
		var moveButton = buttonUtils.buttonList[indexNo];
		buttonUtils.buttonList.splice(indexNo, 1);
		buttonUtils.buttonList.splice(indexNo - 1, 0, moveButton);
		buttonUtils.loadButtonList();
		document.getElementById('buttonList').selectedIndex = indexNo;
		buttonUtils.loadSelectedButton();
	}
},

// Moves the selected Button down one position
dnButton: function() {
	var indexNo = document.getElementById('buttonList').selectedIndex - 1;

	if (indexNo >= 0 && indexNo < document.getElementById('buttonList').itemCount - 2) {
		var moveButton = buttonUtils.buttonList[indexNo];
		buttonUtils.buttonList.splice(indexNo, 1);
		buttonUtils.buttonList.splice(indexNo + 1, 0, moveButton);
		buttonUtils.loadButtonList();
		document.getElementById('buttonList').selectedIndex = indexNo + 2;
		buttonUtils.loadSelectedButton();
	}
},

// Removes the selected Button
removeButton: function() {
	var indexNo = document.getElementById('buttonList').selectedIndex - 1;

	if (indexNo > -1) {
		buttonUtils.buttonList.splice(indexNo, 1);
		buttonUtils.loadButtonList();
		document.getElementById('buttonList').selectedIndex = 0;
		buttonUtils.loadSelectedButton();
	}
},

// ----------------------- Command List Functions ---------------------------

// Loads List of Commands of the selected Button 		
loadCommandList: function() {
	buttonUtils.clearCommandList();

	for (lclNum = 0; lclNum < buttonUtils.currentButton.commands.length; lclNum++) {
			buttonUtils.addCommand(buttonUtils.currentButton.commands[lclNum]);
	}
},

// Moves selected command up one position
upCommand: function() {
	var ucIndex = document.getElementById('commandList').selectedIndex;
	if (ucIndex > 0 && ucIndex < buttonUtils.currentButton.commands.length) {
		var tempCommand = buttonUtils.currentButton.commands[ucIndex];
		buttonUtils.currentButton.commands.splice(ucIndex, 1);
		buttonUtils.currentButton.commands.splice(ucIndex - 1, 0, tempCommand);
		buttonUtils.loadCommandList();
		document.getElementById('commandList').selectedIndex = ucIndex - 1;
	}

},

// moves selected command down one position
dnCommand: function() {
	var dcIndex = document.getElementById('commandList').selectedIndex;
	if (dcIndex > -1 && dcIndex < buttonUtils.currentButton.commands.length - 1) {
		var tempCommand = buttonUtils.currentButton.commands[dcIndex];
		buttonUtils.currentButton.commands.splice(dcIndex, 1);
		buttonUtils.currentButton.commands.splice(dcIndex + 1, 0, tempCommand);
		buttonUtils.loadCommandList();
		document.getElementById('commandList').selectedIndex = dcIndex + 1;
	}
},

// Removes a command from the Command List
removeCommand: function() {
	var rcIndex = document.getElementById('commandList').selectedIndex;
	if (rcIndex > -1) {
		buttonUtils.currentButton.commands.splice(rcIndex, 1);
		buttonUtils.loadCommandList();
	}
},

// takes User data, washes it, and adds it to the Command List
createCommand: function() {
	var location = document.getElementById('locationSelect').selectedIndex;
	if (location == -1) alert ('Please select a location.');
	else {

		var destination = document.getElementById('destinationSelect').selectedIndex;
		if (destination == -1) alert ('Please select a destination.');
		else destination = document.getElementById('destinationSelect').selectedItem.getAttribute('value');

		var transaction = document.getElementById('transactionSelect').selectedIndex;
		if (transaction == -1) alert ('Please select a transaction type.');
		else transaction = document.getElementById('transactionSelect').selectedItem.getAttribute('value');
	
	
		var amount = buttonUtils.amount();
		if (!amount) alert ('Please select an amount.');
	
		var commodity = document.getElementById('commoditySelect').selectedIndex;;	
		if (commodity == -1) alert ('Please Select a Commodity.');
		else commodity = document.getElementById('commoditySelect').selectedItem.getAttribute('label');
	
	
		if (destination  != -1 && transaction  != -1 && amount && commodity != -1) {
			var newCommand = new window.opener.TradeButtons.commandObject(destination, transaction, amount, commodity);
			buttonUtils.currentButton.commands.push(newCommand);
			buttonUtils.loadCommandList();
		}
	}
},

// adds a defined command to the Command List
addCommand: function(command) {
//	alert ('Adding Command: ' + destination + ' ' + action + ' ' + amount + ' ' + commodity);
	var line = '';
	if (command.transaction == 'transfer') line = 'Transfer ' + command.amount + ' of ' + command.commodity + ' to ' + command.destination;
	if (command.transaction == 'fillTo') line = 'Fill ' + command.destination + ' to ' + command.amount + ' with ' + command.commodity;
	if (command.transaction == 'maintain') line = 'Maintain ' + command.amount + ' of ' + command.commodity + ' on ' + command.destination;

	document.getElementById('commandList').appendItem(line);
}

};

var optionUtils = {

selectTab: function() {
	document.getElementById('optionsUniverseSelect').selectedItem = document.getElementById(window.opener.pShoreStatus.universe);
	optionUtils.loadOptions(document.getElementById('optionsUniverseSelect').selectedItem.id);
},

optionsList: Array('enablePriceGuard',
		'displayButtons',
		'displayHotKey',
		'displayNavOverview',
		'displayOverviewTable',
		'tableBuildingType',
		'tableOwnerName',
		'tableSector',
		'tableCoords',
		'tableTicks'),

loadOptions: function(universe) {
//	alert('Loading Options for ' + universe);
	loOptions = window.opener.pOptions[universe];
	for (var indexNo in optionUtils.optionsList) {
		var feature = optionUtils.optionsList[indexNo];
		if (loOptions[feature] == undefined) loOptions[feature] = true;
		document.getElementById(feature).checked = loOptions[feature];
	}
},

saveOptions: function() {
	var universe = document.getElementById('optionsUniverseSelect').selectedItem.id;
	for (var soIndexNo in optionUtils.optionsList) {
		var feature = optionUtils.optionsList[soIndexNo];
		if (document.getElementById(feature).checked) window.opener.pOptions[universe][feature] = 1;
		else window.opener.pOptions[universe][feature] = 0;
	}
	window.opener.pardusCopilot.saveOptions();
}

};

