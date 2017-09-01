var pStevedore = {

personalBuildingTrade: function(buildingNum) {

	// 1st, Extract Building Information (Type, Location, Owner)

	// Building Type
	pShoreStatus.name = pTargetFrame.getElementsByTagName('B')[0].textContent;
	if (buildingNum < 29) pShoreStatus.number = Stevedore.index(pBuilding, pShoreStatus.name);

	// Building Owner
	pShoreStatus.owner = "You";

	// Building's ID No.
	pShoreStatus.tileID = pTargetFrame.getElementsByTagName('SCRIPT')[0].textContent;
	pShoreStatus.tileID = pShoreStatus.tileID.slice(pShoreStatus.tileID.lastIndexOf(' ') + 1, pShoreStatus.tileID.lastIndexOf(';'));

	// reset building tracking commodity list according to tracked buildings
	pShipStatus.commodityList = new Array();

	// Reset Commodities info
	Stevedore.resetCommodities();
	
	// Get info from ship side and store
	for (indexNo=0; indexNo<pCommodity.length; indexNo++) {
		if (pCommodity[indexNo] && pTargetFrame.getElementById(indexNo + '_ship')) {
			pShipStatus.commodityList.push(indexNo);
			var cell = pTargetFrame.getElementById(indexNo + '_ship');
			pCommodity[indexNo].shipStock = Stevedore.scrubData(cell.parentNode.previousSibling.textContent);
			//alert (pCommodity[indexNo].name + ' ' + pCommodity[indexNo].shipStock);
			
			// insert id tag into commodity name cell
			cell = cell.parentNode.previousSibling.previousSibling;
			var tagString = "<a id = 'ship" + indexNo + "'>" + cell.textContent + "</a>";
			cell.innerHTML = cell.innerHTML.replace(cell.textContent, tagString);
		}
	}


	// Ship's Free Space Location
	pShipStatus.freeSpaceLocation = pTargetFrame.getElementsByTagName('B')[2].firstChild;


	// Account for mag scoop
	if (pShipStatus.freeSpaceLocation.textContent.indexOf('+') != - 1) {
		var cell = pShipStatus.freeSpaceLocation;
		pShipStatus.hasMagScoop = true;
		pShipStatus.freeSpace = Stevedore.scrubData(cell.textContent.substr(20, cell.textContent.indexOf('+') - 21));
	        pShipStatus.magScoopSpace = Stevedore.scrubData(cell.textContent.substring(cell.textContent.indexOf('+') + 2, cell.textContent.length - 1));
	} else {
		var cell = pShipStatus.freeSpaceLocation;
		pShipStatus.hasMagScoop = false;
	       	pShipStatus.freeSpace = Stevedore.scrubData(cell.textContent.substr(20, cell.textContent.length - 21));
		pShipStatus.magScoopSpace = 0;
	}


	// -------- get info from shore side stock and store

	// get info from building side
	pShoreStatus.commodityList = new Array();

	for (indexNo=0; indexNo<pCommodity.length; indexNo++) {
		if (pCommodity[indexNo]) {
			pCommodity[indexNo].shoreStock = 0;
			pCommodity[indexNo].shoreComm = 0;
			pCommodity[indexNo].shoreMin = 0;
			pCommodity[indexNo].shoreMax = 0;
		}
		
		// Get info from Stock Column
		if (pTargetFrame.getElementById(indexNo + '_stock')) {

			var cell = pTargetFrame.getElementById(indexNo + '_stock');
			pCommodity[indexNo].shoreStock = Stevedore.scrubData(cell.parentNode.previousSibling.textContent);

			pShoreStatus.commodityList.push(indexNo);
		}

		// get info Commodities column
		if (pTargetFrame.getElementById(indexNo + '_comm')) {
			var cell = pTargetFrame.getElementById(indexNo + '_comm');
			pCommodity[indexNo].shoreComm = Stevedore.scrubData(cell.parentNode.previousSibling.textContent);;

			if (pShoreStatus.commodityList.indexOf(indexNo) == -1) pShoreStatus.commodityList.push(indexNo);

			// insert id tag into commodity name cell
			cell = cell.parentNode.previousSibling.previousSibling;
			var tagString = "<a id = 'comm" + indexNo + "'>" + cell.textContent + "</a>";
			cell.innerHTML = cell.innerHTML.replace(cell.textContent, tagString);
		}
	}

	// Get Shore Free Space
	pShoreStatus.freeSpaceLocation = pShipStatus.freeSpaceLocation.nextSibling.nextSibling;
	pShoreStatus.freeSpace = Stevedore.scrubData(pShoreStatus.freeSpaceLocation.textContent.substr(24, pShoreStatus.freeSpaceLocation.textContent.length - 25));


	// Update Building Tracker
	buildingTracker.updatePersonalBuilding();
		

	//-------- Misc Doodads ----------//
	// Add listener to table for keyboard entries and original click fillers
	pTargetFrame.addEventListener('keyup', pStevedore.updateSpace, true);
	pTargetFrame.addEventListener('keypress', pStevedore.keyStroke, true);
	pTargetFrame.addEventListener('click', pStevedore.pauseUpdate, true);


	pStevedore.calcTradeValues();
	if (pOptions[pShoreStatus.universe].displayButtons) pStevedore.insertButtons();
},


// Insert the Buttons
insertButtons: function() {
	// code buttons

	pShoreStatus.buttonList = TradeButtons.getList(pShoreStatus.universe, pShoreStatus.tileID);
	
	buttons = pTargetFrame.createElement("div");
	var name;
	if (pShipStatus.hasMagScoop) buttons.innerHTML += '<br><input type="checkbox" id="useMagScoop">Use Magscoop';
	buttons.innerHTML += '<br><input type="checkbox" id="autoUnload" checked = true>Unload Ship';
	for (ibButton = 0; ibButton < pShoreStatus.buttonList.length; ibButton++) {
		name = pShoreStatus.buttonList[ibButton].name;
		if (pOptions[pShoreStatus.universe].displayHotKey) name = '(' + pShoreStatus.buttonList[ibButton].hotKey + ') ' + name;
		buttons.innerHTML += '<br><input type="button" id="button' + ibButton + '" value = "' + name +'"><br>';
	}

	// insert reset button
	name = 'Reset Form';
	if (pOptions[pShoreStatus.universe].displayHotKey) name = '(r) ' + name;
	buttons.innerHTML += '<br><input type="button" id="reset" value = "' + name + '"><br>';

	// insert buttons after transfer button
	for(var i = 0; i < pTargetFrame.getElementsByTagName('input').length; i++) {
		var placeButtons = pTargetFrame.getElementsByTagName('input')[i];
		if (placeButtons.value == '<- Transfer ->') placeButtons.parentNode.appendChild(buttons);
	}


	// Add listeners to new buttons
	for (tbi=0; tbi<pShoreStatus.buttonList.length; tbi++) {
		if (pTargetFrame.getElementById('button' + tbi)) pTargetFrame.getElementById('button' + tbi).addEventListener('click', pStevedore.executeCommandButton, true);
	}


	if (pTargetFrame.getElementById('reset')) pTargetFrame.getElementById('reset').addEventListener('click', pStevedore.resetForm, true);

	// Add listeners to inserted tags for commodity clicking
	for (com = 0; com < pCommodity.length; com ++ ) {
		if (pTargetFrame.getElementById('ship' + com)) pTargetFrame.getElementById('ship' + com).addEventListener('click', pStevedore.sellMaxCommodity, true);
		if (pTargetFrame.getElementById('comm' + com)) pTargetFrame.getElementById('comm' + com).addEventListener('click', pStevedore.buyMaxCommodity, true);
	}
},

// Calculate Max Trade Values for commodity buying/selling
calcTradeValues: function() {
	for (com=0; com<pCommodity.length; com++) {
		if (pCommodity[com]) {
			var sell = pCommodity[com].shoreMax - (pCommodity[com].shoreStock + pCommodity[com].shoreComm);
			if (sell < 0) sell = 0;
			if (sell > pCommodity[com].shipStock) sell = pCommodity[com].shipStock;
			pCommodity[com].sellMax = sell;
			pCommodity[com].buyMax = pCommodity[com].shoreComm;
		}
	}
},	

// -----------------------------------------------------------------------//
// ----------------------- Button Activation Functions -------------------//
// -----------------------------------------------------------------------//

// Click on Button
executeCommandButton: function(buttonClicked) {
	var buttonNumber = buttonClicked.target.id.substr(6, buttonClicked.target.id.length);
	pStevedore.executeCommand(buttonNumber);
},


// hotKey shortcut
keyStroke: function(keypressed) {
	var key = keypressed.charCode;
	key = String.fromCharCode(key);
	key = key.toLowerCase();
	for (keyCheck = 0; keyCheck<pShoreStatus.buttonList.length; keyCheck++) {
		if (key == pShoreStatus.buttonList[keyCheck].hotKey.toLowerCase()) pStevedore.executeCommand(keyCheck);
	}
	if (key == 'r') pStevedore.resetForm();
},

// Execute command
executeCommand: function(buttonNumber){
	pShipStatus.holdSpace = 0;
	pShoreStatus.holdSpace = 0;
	var commandList = pShoreStatus.buttonList[buttonNumber].commands;
	var commodityNumber, amount;
	for (tbk = 0; tbk < commandList.length; tbk++) {
//		alert('Command: ' + commandList[tbk].destination + ' ' + commandList[tbk].transaction + ' ' + commandList[tbk].amount + ' ' + commandList[tbk].commodity);
		amount = commandList[tbk].amount;
		destination = commandList[tbk].destination;
		commodityNumber = Stevedore.index(pCommodity, commandList[tbk].commodity);
		if (commodityNumber == 0) pStevedore.tradeAll(destination, commandList[tbk].transaction, amount);
		else {
			if (commandList[tbk].transaction == 'transfer') pStevedore.transferCommodity(destination, commodityNumber, amount);
			if (commandList[tbk].transaction == 'fillTo') pStevedore.fillTo(destination, commodityNumber, amount);
			if (commandList[tbk].transaction == 'maintain') pStevedore.maintainCommodity(destination, commodityNumber, amount);
		}
	}
	pShipStatus.holdSpace = 0;
	pShoreStatus.holdSpace = 0;
},

// -----------------------------------------------------------------------//
// ----------------------------- Trading Functions -----------------------//
// -----------------------------------------------------------------------//

// Buy commodity with commodity name clicking
buyMaxCommodity: function(commodity) {
	var commodityNumber = commodity.target.id.substr(4, commodity.target.id.length);
	pTargetFrame.getElementById(commodityNumber + '_comm').value == "";
	pStevedore.buyCommodity(commodityNumber, pCommodity[commodityNumber].buyMax);
},

// Sell commodity with commodity name clicking
sellMaxCommodity: function(commodity) {
	var commodityNumber = commodity.target.id.substr(4, commodity.target.id.length)
	var selling = pTargetFrame.getElementById(commodityNumber + '_ship').value * 1;
	pTargetFrame.getElementById(commodityNumber + '_ship').value = "";
	if (selling == pCommodity[commodityNumber].sellMax) selling = pCommodity[commodityNumber].shipStock;
	else selling = pCommodity[commodityNumber].sellMax;
	pStevedore.sellCommodity(commodityNumber, selling);
},

// Buy a given amount of commodity based on available space and building settings
buyCommodity: function (commodityNumber, amount) {
	if (pTargetFrame.getElementById(commodityNumber + '_comm')) {
		var formSpace = pTargetFrame.getElementById(commodityNumber + '_comm');
		var freeSpace = pStevedore.freeShipSpace();

		amount += formSpace.value*1;
		if (amount > pCommodity[commodityNumber].buyMax) amount = pCommodity[commodityNumber].buyMax;
		if (amount > freeSpace) amount = freeSpace;
		if (amount > 0) formSpace.value = amount;
				
		pStevedore.checkInputValues(commodityNumber);
	}
},

// Sell a given amount of commodity based on available space and building settings
sellCommodity: function(commodityNumber, amount) {
	if (pTargetFrame.getElementById(commodityNumber + '_ship')) {
		var formSpace = pTargetFrame.getElementById(commodityNumber + '_ship');
		var freeSpace = pStevedore.freeShoreSpace();

		amount += formSpace.value*1;
		if (amount > pCommodity[commodityNumber].shipStock) amount = pCommodity[commodityNumber].shipStock;
		if (amount > freeSpace) amount = freeSpace;
		if (amount > 0) formSpace.value = amount;

		pStevedore.checkInputValues(commodityNumber);
	}
},

// Buy all commodities produced and Sell all commodities Consumed.
tradeAll: function(destination, transaction, amount) {

	// fill in the 'sell' side except for commodities that are produced there
	var tradeAmount = amount;
	if (destination == 'shore') {
		if (pTargetFrame.getElementById('autoUnload').checked) {
			for (taComNum = 1; taComNum < pCommodity.length; taComNum++) {
				if (pTargetFrame.getElementById(taComNum + '_ship')
				 && pTargetFrame.getElementById(taComNum + '_ship').value == ""
				 && (pBuilding[pShoreStatus.number].consumes.indexOf(taComNum) != -1
				  || pBuilding[pShoreStatus.number].consumes.indexOf(0) != -1)
				 && (taComNum != 16 || pShoreStatus.number == 25)) {
					if (transaction == 'transfer') pStevedore.transferCommodity('shore', taComNum, tradeAmount);
					if (transaction == 'fillTo') pStevedore.fillTo('shore', taComNum, tradeAmount);
					if (transaction == 'maintain') pStevedore.maintainCommodity('shore', taComNum, tradeAmount);
				}
			}
		}
	}

	// fill in the buy side for each produced commodity only
	if (destination == 'ship') {
		for (taComNum = 1; taComNum < pCommodity.length; taComNum++) {
			if (pTargetFrame.getElementById(taComNum + '_comm')
			 && pTargetFrame.getElementById(taComNum + '_comm').value == ''
			 && (pBuilding[pShoreStatus.number].produces.indexOf(taComNum) != -1
			  || pBuilding[pShoreStatus.number].produces.indexOf(0) != -1)) {
					if (transaction == 'transfer') pStevedore.transferCommodity('ship', taComNum, tradeAmount);
					if (transaction == 'fillTo') pStevedore.fillTo('ship', taComNum, tradeAmount);
					if (transaction == 'maintain') pStevedore.maintainCommodity('ship', taComNum, tradeAmount);
			}
		}
	}
},

// Transfer a commodity to either ship or shore
transferCommodity: function(destination, commodityNumber, amount) {
	var units = amount.slice(amount.length - 1);
	amount = amount.slice(0, amount.length - 1) * 1;

	if (destination == 'ship') {
		if (units == '%') {
			if (pTargetFrame.getElementById(commodityNumber + '_ship')) pTargetFrame.getElementById(commodityNumber + '_ship').value = '';
			if (pTargetFrame.getElementById(commodityNumber + '_comm')) pTargetFrame.getElementById(commodityNumber + '_comm').value = '';
			amount = Math.round(pCommodity[commodityNumber].shoreComm*amount/100);
		}
		if (amount > 0)	pStevedore.buyCommodity(commodityNumber, amount);
	}

	if (destination == 'shore') {
		if (units == '%') {
			if (pTargetFrame.getElementById(commodityNumber + '_ship')) pTargetFrame.getElementById(commodityNumber + '_ship').value = '';
			if (pTargetFrame.getElementById(commodityNumber + '_comm')) pTargetFrame.getElementById(commodityNumber + '_comm').value = '';
			amount = Math.round(pCommodity[commodityNumber].shipStock*amount/100);
		}
		if (amount > 0)	pStevedore.sellCommodity(commodityNumber, amount);
	}
},

// Fill Ship or shore to specified level
fillTo: function(destination, commodityNumber, amount) {

	var units = amount.slice(amount.length - 1);
	amount = amount.slice(0, amount.length - 1) * 1;

	if (destination == 'ship') {
		var selling = 0;
		if (units == '%') amount = Math.round((pStevedore.freeShipSpace() + pCommodity[commodityNumber].shipStock)*amount/100) - pCommodity[commodityNumber].shipStock;
		if (units == 't') amount -= pCommodity[commodityNumber].shipStock;
		if (pTargetFrame.getElementById(commodityNumber + '_comm')) pTargetFrame.getElementById(commodityNumber + '_comm').value = '';
		if (pTargetFrame.getElementById(commodityNumber + '_ship')) selling = pTargetFrame.getElementById(commodityNumber + '_ship').value * 1;
		amount += selling
		if (amount > 0) pStevedore.buyCommodity(commodityNumber, amount);
	}

	if (destination == 'shore') {
		var buying = 0;
		if (units == '%') amount = Math.round(pCommodity[commodityNumber].shoreMax*amount/100) - pCommodity[commodityNumber].shoreStock;
		if (units == 't') amount -= pCommodity[commodityNumber].shoreStock;
		if (pTargetFrame.getElementById(commodityNumber + '_ship')) pTargetFrame.getElementById(commodityNumber + '_ship').value = '';
		if (pTargetFrame.getElementById(commodityNumber + '_comm')) buying = pTargetFrame.getElementById(commodityNumber + '_comm').value * 1;
		amount += buying;
		if (amount > 0) pStevedore.sellCommodity(commodityNumber, amount);
	}
},


// If available, buy amount, if not, hold space for it.
maintainCommodity: function(destination, commodityNumber, amount) {

	var selling = 0, buying = 0, net = 0, have = 0;
	var units = amount.slice(amount.length - 1);
	amount = amount.slice(0, amount.length - 1) * 1;


	if (destination == 'ship') {
		if (units == '%') amount = Math.round(pCommodity[commodityNumber].shipStock*amount/100);
	
		have = pCommodity[commodityNumber].shipStock;

		if (pTargetFrame.getElementById(commodityNumber + '_ship')) pTargetFrame.getElementById(commodityNumber + '_ship').value = '';
		if (pTargetFrame.getElementById(commodityNumber + '_comm')) pTargetFrame.getElementById(commodityNumber + '_comm').value = '';

		net = have - amount;

		if (net < 0) pStevedore.buyCommodity(commodityNumber, -net);
		if (net > 0) pStevedore.sellCommodity(commodityNumber, net);

		if (pTargetFrame.getElementById(commodityNumber + '_ship')) selling = pTargetFrame.getElementById(commodityNumber + '_ship').value*1;
		if (pTargetFrame.getElementById(commodityNumber + '_comm')) buying = pTargetFrame.getElementById(commodityNumber + '_comm').value*1;

		net = (have - amount + buying - selling);
		if (net < 0) pShipStatus.holdSpace -= net;
	}

	if (destination == 'shore') {
		if (units == '%') amount = Math.round(pCommodity[commodityNumber].shoreMax*amount/100);
	
		have = pCommodity[commodityNumber].shoreStock + pCommodity[commodityNumber].shoreComm;
		if (pTargetFrame.getElementById(commodityNumber + '_ship')) pTargetFrame.getElementById(commodityNumber + '_ship').value = '';
		if (pTargetFrame.getElementById(commodityNumber + '_comm')) pTargetFrame.getElementById(commodityNumber + '_comm').value = '';

		net = have - amount;

		if (net < 0) pStevedore.sellCommodity(commodityNumber, -net);
		if (net > 0) pStevedore.buyCommodity(commodityNumber, net);

		if (pTargetFrame.getElementById(commodityNumber + '_ship')) selling = pTargetFrame.getElementById(commodityNumber + '_ship').value*1;
		if (pTargetFrame.getElementById(commodityNumber + '_comm')) buying = pTargetFrame.getElementById(commodityNumber + '_comm').value*1;
	
		net = (have - amount + buying - selling);
		if (net < 0) pShoreStatus.holdSpace -= net;
	}
},

// check for numbers in both buying and selling and reduce to net in proper position
checkInputValues: function(commodityNumber) {
	if (pTargetFrame.getElementById(commodityNumber + '_ship')
	 && pTargetFrame.getElementById(commodityNumber + '_ship').value != ''
	 && pTargetFrame.getElementById(commodityNumber + '_comm')
	 && pTargetFrame.getElementById(commodityNumber + '_comm').value != '') {
		var selling = pTargetFrame.getElementById(commodityNumber + '_ship').value;
		var buying = pTargetFrame.getElementById(commodityNumber + '_comm').value;
		pTargetFrame.getElementById(commodityNumber + '_ship').value  = '';
		pTargetFrame.getElementById(commodityNumber + '_comm').value  = '';
		var net = buying - selling;
		if (net < 0) pStevedore.sellCommodity(commodityNumber, -net);
		else if (net > 0) pStevedore.buyCommodity(commodityNumber, net);
	}
	pStevedore.updateSpace();
},

// Sets all form values to blank
resetForm: function() {
	for(com=0; com<pCommodity.length; com++) {
		if (pTargetFrame.getElementById(com + '_ship')) pTargetFrame.getElementById(com + '_ship').value = '';
		if (pTargetFrame.getElementById(com + '_stock')) pTargetFrame.getElementById(com + '_stock').value = '';
		if (pTargetFrame.getElementById(com + '_comm')) pTargetFrame.getElementById(com + '_comm').value = '';
	}
	pStevedore.updateSpace();
},


// -----------------------------------------------------------------------//
// ------------------------- Space Management Functions ------------------//
// -----------------------------------------------------------------------//

// calculate final ship / building space and display on form
updateSpace: function() {
	var finalShipSpace = pShipStatus.freeSpace + pShipStatus.magScoopSpace;
	var finalShoreSpace = pShoreStatus.freeSpace;
	var spaceString;

	for (com=0; com<pCommodity.length; com++) {
		if (pTargetFrame.getElementById(com + '_ship')) {
			finalShoreSpace = finalShoreSpace - pTargetFrame.getElementById(com + '_ship').value * 1;
			finalShipSpace = finalShipSpace + pTargetFrame.getElementById(com + '_ship').value * 1;
		}
		if (pTargetFrame.getElementById(com + '_stock'))
			finalShipSpace = finalShipSpace - pTargetFrame.getElementById(com + '_stock').value * 1;
		if (pTargetFrame.getElementById(com + '_comm')) 
			finalShipSpace = finalShipSpace - pTargetFrame.getElementById(com + '_comm').value * 1;
	}

	if (pShipStatus.hasMagScoop) {
		if (finalShipSpace < 0) spaceString = finalShipSpace + 't + 0t';
		if (finalShipSpace < 150) spaceString = '0t + ' + finalShipSpace + 't';
		if (finalShipSpace >= 150) spaceString = (finalShipSpace - 150) + 't + 150t';
	} else {
		spaceString = finalShipSpace + 't';
	}

	pShipStatus.freeSpaceLocation.textContent = 'Ship Free Space: ' + spaceString;
	pShoreStatus.freeSpaceLocation.textContent = 'Building Free Space: ' + finalShoreSpace + 't';
},

// determine amount of free ship space available including current tansaction values
freeShipSpace: function() {
	var finalShipSpace = pShipStatus.freeSpace - pShipStatus.holdSpace;

	if (pShipStatus.hasMagScoop) {
		if (pTargetFrame.getElementById('useMagScoop').checked) {
			 finalShipSpace = finalShipSpace + pShipStatus.magScoopSpace;
		} else {
			finalShipSpace = finalShipSpace - 150 + pShipStatus.magScoopSpace;
		}
	}

	for (com = 0; com < pCommodity.length; com++ ) {
		if (pTargetFrame.getElementById(com + '_ship'))
			finalShipSpace += pTargetFrame.getElementById(com + '_ship').value * 1;
		if (pTargetFrame.getElementById(com + '_stock'))
			finalShipSpace -= pTargetFrame.getElementById(com + '_stock').value * 1;
		if (pTargetFrame.getElementById(com + '_comm'))
			finalShipSpace -= pTargetFrame.getElementById(com + '_comm').value * 1;
	}
	return finalShipSpace*1;
},


// Determine amount of free shore space including current transactions
freeShoreSpace: function() {

	var finalShoreSpace = pShoreStatus.freeSpace - pShoreStatus.holdSpace;
	for (com = 0; com < pCommodity.length; com ++ ) {
		if (pTargetFrame.getElementById(com + '_ship')) finalShoreSpace -= pTargetFrame.getElementById(com + '_ship').value * 1;
	}
	return finalShoreSpace*1;
},

// Short pause, then update space numbers when using original commodity form filler
pauseUpdate: function() { var t = setTimeout(pStevedore.updateSpace, 100); },


};