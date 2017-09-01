
var Stevedore = {

//Building Trade Screen Trading/Tracking
buildingTrade: function(buildingNum) {
	// 1st, Extract Building Information (Type, Location, Owner)


	// Building Type
	pShoreStatus.name = pTargetFrame.links[0].innerHTML;
	pShoreStatus.number = buildingNum;
	if (pShoreStatus.number < 29) pShoreStatus.number = Stevedore.index(pBuilding, pShoreStatus.name);
//	alert('Building Type: ' + pBuilding[pShoreStatus.number].name + ' * ' + pShoreStatus.name);

	// Determine Building's ID No.
	pShoreStatus.tileID = pTargetFrame.getElementsByTagName('SCRIPT')[0].textContent;
	pShoreStatus.tileID = pShoreStatus.tileID.slice(pShoreStatus.tileID.lastIndexOf(' ') + 1, pShoreStatus.tileID.lastIndexOf(';'));
//	alert('Building ID: *' + pShoreStatus.tileID + '*');

	// Determine Building Owner's Name (if in Building)
	if (pShoreStatus.number < 29) {
		for (tba=0; tba<pTargetFrame.getElementsByTagName('B').length; tba++) {
			if (pTargetFrame.getElementsByTagName('B')[tba].textContent.search("'s ") != -1) {
			      pShoreStatus.owner = pTargetFrame.getElementsByTagName('B')[tba].textContent;
			      pShoreStatus.owner = pShoreStatus.owner.substring(0, pShoreStatus.owner.indexOf("'"));
			}
		}
	}

	Stevedore.resetCommodities();
	Stevedore.getShipInfo();
	Stevedore.getShoreInfo();
	Stevedore.calcTradeValues();
	if (pOptions[pShoreStatus.universe].displayButtons) Stevedore.insertButtons();

	//-------- Misc Doodads ----------//
	// Add listener to table for keyboard entries and original click fillers
	pTargetFrame.addEventListener('keyup', Stevedore.updateSpace, true);
	pTargetFrame.addEventListener('keypress', Stevedore.keyStroke, true);
	pTargetFrame.addEventListener('click', Stevedore.pauseUpdate, true);
},





// -----------------------------------------------------------------------//
// ------------------------- Data Collection Functions -------------------//
// -----------------------------------------------------------------------//

// -------------------- Get ship side info from trade table --------------//
getShipInfo: function() {

	// Misc Variables
	var tableSearch, tableLocation, cell;

	// reset building tracking commodity list
	pShipStatus.commodityList = new Array();

	// Locate the "sell" table 
	for(var tbb = 0; tbb < pTargetFrame.getElementsByTagName('TH').length; tbb ++ ) {
		tableSearch = pTargetFrame.getElementsByTagName('TH')[tbb]
		if (tableSearch.innerHTML == 'Price (sell)' || tableSearch.innerHTML == 'Price&nbsp;(sell)') {
			tableLocation = tableSearch.parentNode.parentNode;
		}
	}

	// Get info from ship side table and store into "commodity"
	for (tbc=0; tbc<tableLocation.getElementsByTagName('TR').length; tbc++) {
		row = tableLocation.getElementsByTagName('TR')[tbc];
		if (row.getElementsByTagName('TD')[1]) {
			cell = row.getElementsByTagName('TD')[1];
			indexNo = Stevedore.index(pCommodity, cell.textContent);
			if (indexNo != -1) {
				pShipStatus.commodityList.push(indexNo);
				// insert id tag into commodity name cell
				var tagString = "<a id = 'sell" + indexNo + "'>" + cell.textContent + "</a>";
				cell.innerHTML = cell.innerHTML.replace(cell.textContent, tagString);

				pCommodity[indexNo].shipStock = (Stevedore.scrubData(row.getElementsByTagName('TD')[2].textContent));
				pCommodity[indexNo].sellPrice = (Stevedore.scrubData(row.getElementsByTagName('TD')[3].textContent));
			} else {
				// Ship's Free Space Location
				if (row.getElementsByTagName('TD')[0].innerHTML == 'free&nbsp;space:') {
					pShipStatus.freeSpaceLocation = cell;
					pShipStatus.holdSpace = 0;
					// Account for mag scoop
					if (cell.innerHTML.indexOf('+') != - 1) {
						pShipStatus.hasMagScoop = true;
						pShipStatus.freeSpace = Stevedore.scrubData(cell.innerHTML.substr(0, cell.innerHTML.indexOf('+') - 1));
					        pShipStatus.magScoopSpace = Stevedore.scrubData(cell.innerHTML.substring(cell.innerHTML.indexOf('+') + 2, cell.innerHTML.length - 1));
					} else {
						pShipStatus.hasMagScoop = false;
				        	pShipStatus.freeSpace = Stevedore.scrubData(cell.innerHTML.substr(0, cell.innerHTML.length - 1));
						pShipStatus.magScoopSpace = 0;
					}
				}
			}
		}
	}
},

// -------------------- Get shore side info from trade table --------------//
getShoreInfo: function() {
	// Misc Variables
	var tableSearch, tableLocation, cellLoc, inBuilding = true, inNPC = true;

	// Building Tracking List of Commodities
	pShoreStatus.commodityList = new Array();

	// Locate the "buy" table 
	for(var tbd = 0; tbd < pTargetFrame.getElementsByTagName('TH').length; tbd ++ ) {
		tableSearch = pTargetFrame.getElementsByTagName('TH')[tbd]
		if (tableSearch.innerHTML == 'Price (buy)' || tableSearch.innerHTML == 'Price&nbsp;(buy)')
			tableLocation = tableSearch.parentNode.parentNode;
		if (tableSearch.textContent == 'Bal') inBuilding = false;
		if (tableSearch.textContent == 'Min') inNPC = false;
	}

	// Get info from shore side table and store into "commodity"
	for (tbe=0; tbe<tableLocation.getElementsByTagName('TR').length; tbe++) {
		row = tableLocation.getElementsByTagName('TR')[tbe];
		if (row.getElementsByTagName('TD')[1]) {
			cell = row.getElementsByTagName('TD')[1];
			indexNo = Stevedore.index(pCommodity, cell.textContent);
			if (indexNo != -1) {
				// insert id tag into commodity name cell
				var tagString = "<a id = 'buy" + indexNo + "'>" + cell.textContent + "</a>";
				cell.innerHTML = cell.innerHTML.replace(cell.textContent, tagString);
				pCommodity[indexNo].shoreStock = Stevedore.scrubData(row.getElementsByTagName('TD')[2].textContent);
				if (inNPC || inBuilding) {
					pCommodity[indexNo].shoreMin = (Stevedore.scrubData(row.getElementsByTagName('TD')[3].textContent));
					pCommodity[indexNo].shoreMax = (Stevedore.scrubData(row.getElementsByTagName('TD')[4].textContent));
					pCommodity[indexNo].buyPrice = (Stevedore.scrubData(row.getElementsByTagName('TD')[5].lastChild.textContent));
				} else if (!inNPC && !inBuilding) {
					pCommodity[indexNo].shoreMin = (Stevedore.scrubData(row.getElementsByTagName('TD')[4].textContent));
					pCommodity[indexNo].shoreMax = (Stevedore.scrubData(row.getElementsByTagName('TD')[5].textContent));
					pCommodity[indexNo].buyPrice = (Stevedore.scrubData(row.getElementsByTagName('TD')[6].lastChild.textContent));
				}
				pShoreStatus.commodityList.push(indexNo);

			} else {
				// Shore's Free Space Location
				if (row.getElementsByTagName('TD')[0].innerHTML == 'free&nbsp;space:') {
					pShoreStatus.freeSpaceLocation = cell;
			        	pShoreStatus.freeSpace = Stevedore.scrubData(cell.innerHTML.substr(0, cell.innerHTML.length - 1));
				}
			}
		}
	}

	if (inNPC) {
		pShoreStatus.freeSpace = 1000;
		pShoreStatus.freeSpaceLocation = pTargetFrame.createElement("div");
	}

	// Locate top Ship Free Space on Planets and Starbases
	if (pShoreStatus.number > 28) {
		for (tbf=0; tbf<pTargetFrame.getElementsByTagName('B').length; tbf++) {
			if (pTargetFrame.getElementsByTagName('B')[tbf].textContent == pShoreStatus.name) {
				pShipStatus.topFreeSpaceLocation = pTargetFrame.getElementsByTagName('B')[tbf].parentNode.previousSibling.previousSibling;
				Stevedore.updateSpace();
			}
		}
	}
},


// ------------------------ Button/Clicking Features ---------------------//

// Insert the Buttons
insertButtons: function() {
	// code buttons
	pShoreStatus.buttonList = TradeButtons.getList(pShoreStatus.universe, pShoreStatus.tileID);
	
	var buttons = '';
	var name;
	if (pShipStatus.hasMagScoop) buttons = buttons + '<br><input type="checkbox" id="useMagScoop">Use Magscoop';
	buttons += '<br><input type="checkbox" id="autoUnload" checked = true>Unload Ship';
	for (ibButton = 0; ibButton < pShoreStatus.buttonList.length; ibButton++) {
		name = pShoreStatus.buttonList[ibButton].name;
		if (pOptions[pShoreStatus.universe].displayHotKey) name = '(' + pShoreStatus.buttonList[ibButton].hotKey + ') ' + name;
		buttons = buttons + '<br><input type="button" id="button' + ibButton + '" value = "' + name +'"><br>';
	}

	// insert reset button
	name = 'Reset Form';
	if (pOptions[pShoreStatus.universe].displayHotKey) name = '(r) ' + name;
	buttons = buttons + '<br><input type="button" id="reset" value = "' + name + '"><br>';

	// Add building tracking buttons
	if (pShoreStatus.number < 28) {
		if (buildingTracker.updateBuilding()) buttons = buttons + '<br><input type="button" id="' + pShoreStatus.tileID + '" value = "Untrack"><br>';
		else buttons = buttons + '<br><input type="button" id="' + pShoreStatus.tileID + '" value = "Track"><br>';
	}

	// insert buttons
	for(ibElement = 0; ibElement < pTargetFrame.getElementsByTagName('input').length; ibElement++) {
		var placeButtons = pTargetFrame.getElementsByTagName('input')[ibElement];
		if (placeButtons.value == '<- Transfer ->') {
			// insert buttons after transfer button
			placeButtons.parentNode.innerHTML = placeButtons.parentNode.innerHTML + buttons;
		}
	}

	// Add listeners to new buttons
	for (ibListener=0; ibListener<pShoreStatus.buttonList.length; ibListener++) {
		pTargetFrame.getElementById('button' + ibListener).addEventListener('click', Stevedore.executeCommandButton, true);
	}


	pTargetFrame.getElementById('reset').addEventListener('click', Stevedore.resetForm, true);

	// Add listeners to tracking button
	if (pTargetFrame.getElementById(pShoreStatus.tileID)) {
		if (pTargetFrame.getElementById(pShoreStatus.tileID).value == 'Track')
			pTargetFrame.getElementById(pShoreStatus.tileID).addEventListener('click', buildingTracker.addBuilding, true);
		else pTargetFrame.getElementById(pShoreStatus.tileID).addEventListener('click', buildingTracker.tradeRemoveBuilding, true);
	}

	// Add listeners to inserted tags for commodity clicking
	for (ibListener = 0; ibListener < pCommodity.length; ibListener++ ) {
		if (pTargetFrame.getElementById('buy' + ibListener)) pTargetFrame.getElementById('buy' + ibListener).addEventListener('click', Stevedore.buyMaxCommodity, true);
		if (pTargetFrame.getElementById('sell' + ibListener)) pTargetFrame.getElementById('sell' + ibListener).addEventListener('click', Stevedore.sellMaxCommodity, true);
	}
},	

// Button clicking execution
executeCommandButton: function(buttonClicked) {
	var buttonNumber = buttonClicked.target.id.substr(6, buttonClicked.target.id.length);
	Stevedore.executeCommand(buttonNumber);
},

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
		if (commodityNumber == 0) Stevedore.tradeAll(destination, commandList[tbk].transaction, amount);
		else {
			if (commandList[tbk].transaction == 'transfer') Stevedore.transferCommodity(destination, commodityNumber, amount);
			if (commandList[tbk].transaction == 'fillTo') Stevedore.fillTo(destination, commodityNumber, amount);
			if (commandList[tbk].transaction == 'maintain') Stevedore.maintainCommodity(destination, commodityNumber, amount);
		}
	}
	pShipStatus.holdSpace = 0;
	pShoreStatus.holdSpace = 0;
},


// -----------------------------------------------------------------------//
// ----------------------------- Trading Functions -----------------------//
// -----------------------------------------------------------------------//

// Transfer a commodity to either ship ore shore
transferCommodity: function(destination, commodityNumber, amount) {

	var units = amount.slice(amount.length - 1);
	amount = amount.slice(0, amount.length - 1) * 1;
	
	if (destination == 'ship') {
		if (units == '%') {
			if (pTargetFrame.getElementById('sell_' + commodityNumber)) pTargetFrame.getElementById('sell_' + commodityNumber).value = '';
			if (pTargetFrame.getElementById('buy_' + commodityNumber)) pTargetFrame.getElementById('buy_' + commodityNumber).value = '';
			amount = Math.round((pCommodity[commodityNumber].shoreStock - pCommodity[commodityNumber].shoreMin)*amount/100);
		}
		if (amount > 0)	Stevedore.buyCommodity(commodityNumber, amount);
	}

	if (destination == 'shore') {
		if (units == '%') {
			if (pTargetFrame.getElementById('sell_' + commodityNumber)) pTargetFrame.getElementById('sell_' + commodityNumber).value = '';
			if (pTargetFrame.getElementById('buy_' + commodityNumber)) pTargetFrame.getElementById('buy_' + commodityNumber).value = '';
			amount = Math.round(pCommodity[commodityNumber].shipStock*amount/100);
		}
		if (amount > 0)	Stevedore.sellCommodity(commodityNumber, amount);
	}
},

// Fill Ship or shore to specified level
fillTo: function(destination, commodityNumber, amount) {

	var units = amount.slice(amount.length - 1);
	amount = amount.slice(0, amount.length - 1) * 1;

	if (destination == 'ship') {
		if (units == '%') amount = Math.round((Stevedore.freeShipSpace()*amount/100));
		if (units == 't') amount -= pCommodity[commodityNumber].shipStock;
		if (amount > 0) Stevedore.buyCommodity(commodityNumber, amount);
	}

	if (destination == 'shore') {
		if (units == '%') amount = Math.round(pCommodity[commodityNumber].shoreMax*amount/100) - pCommodity[commodityNumber].shoreStock;
		if (units == 't') amount -= pCommodity[commodityNumber].shoreStock;
		if (pTargetFrame.getElementById('sell_' + commodityNumber)) pTargetFrame.getElementById('sell_' + commodityNumber).value = '';
		if (pTargetFrame.getElementById('buy_' + commodityNumber)) amount += pTargetFrame.getElementById('buy_' + commodityNumber).value * 1;
		if (amount > 0) Stevedore.sellCommodity(commodityNumber, amount);
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

		if (pTargetFrame.getElementById('sell_' + commodityNumber)) pTargetFrame.getElementById('sell_' + commodityNumber).value = '';
		if (pTargetFrame.getElementById('buy_' + commodityNumber)) pTargetFrame.getElementById('buy_' + commodityNumber).value = '';

		net = have - amount;

		if (net < 0) Stevedore.buyCommodity(commodityNumber, -net);
		if (net > 0) Stevedore.sellCommodity(commodityNumber, net);

		if (pTargetFrame.getElementById('sell_' + commodityNumber)) selling = pTargetFrame.getElementById('sell_' + commodityNumber).value*1;
		if (pTargetFrame.getElementById('buy_' + commodityNumber)) buying = pTargetFrame.getElementById('buy_' + commodityNumber).value*1;

		net = (have - amount + buying - selling);
		if (net < 0) pShipStatus.holdSpace -= net;
	}

	if (destination == 'shore') {
		if (units == '%') amount = Math.round(pCommodity[commodityNumber].shoreMax*amount/100);
	
		have = pCommodity[commodityNumber].shoreStock;
		if (pTargetFrame.getElementById('sell_' + commodityNumber)) pTargetFrame.getElementById('sell_' + commodityNumber).value = '';
		if (pTargetFrame.getElementById('buy_' + commodityNumber)) pTargetFrame.getElementById('buy_' + commodityNumber).value = '';

		net = have - amount;

		if (net < 0) Stevedore.sellCommodity(commodityNumber, -net);
		if (net > 0) Stevedore.buyCommodity(commodityNumber, net);

		if (pTargetFrame.getElementById('sell_' + commodityNumber)) selling = pTargetFrame.getElementById('sell_' + commodityNumber).value*1;
		if (pTargetFrame.getElementById('buy_' + commodityNumber)) buying = pTargetFrame.getElementById('buy_' + commodityNumber).value*1;
	
		net = (have - amount + buying - selling);
		if (net < 0) pShoreStatus.holdSpace -= net;
	}
},

// buy / sell max amount of a single commodity
buyMaxCommodity: function(commodity) {
	var commodityNumber = commodity.target.id.substr(3, commodity.target.id.length);
	Stevedore.buyCommodity(commodityNumber, pCommodity[commodityNumber].buyMax);
},

sellMaxCommodity: function(commodity) {
	var commodityNumber = commodity.target.id.substr(4, commodity.target.id.length);
	Stevedore.sellCommodity(commodityNumber, pCommodity[commodityNumber].sellMax);
},

// Sell a given amount of commodity based on available space and building settings
sellCommodity: function(commodityNumber, amount) {
//	alert ('Selling ' + amount + ' of ' + commodityNumber);
	if (pTargetFrame.getElementById('sell_' + commodityNumber)) {
		var formSpace = pTargetFrame.getElementById('sell_' + commodityNumber);
		var freeSpace = Stevedore.freeShoreSpace();

		amount += formSpace.value*1;
		if (amount > pCommodity[commodityNumber].sellMax) amount = pCommodity[commodityNumber].sellMax;
		if (amount > freeSpace) amount = freeSpace;
		if (amount > 0) formSpace.value = amount;

		Stevedore.checkInputValues(commodityNumber);
	}
},

// Buy a given amount of commodity based on available space and building settings
buyCommodity: function (commodityNumber, amount) {
//	alert ('Buying ' + amount + ' of ' + commodityNumber);

	if (pTargetFrame.getElementById('buy_' + commodityNumber)) {
		var formSpace = pTargetFrame.getElementById('buy_' + commodityNumber);
		var freeSpace = Stevedore.freeShipSpace();

		amount += formSpace.value*1;
		if (amount > pCommodity[commodityNumber].buyMax) amount = pCommodity[commodityNumber].buyMax;
		if (amount > freeSpace) amount = freeSpace;
		if (amount > 0) formSpace.value = amount;
				
		Stevedore.checkInputValues(commodityNumber);

		if (pOptions[pShoreStatus.universe].enablePriceGuard
		 && (pCommodity[commodityNumber].buyPrice > PriceGuard.price[pShoreStatus.universe].maxPrice[commodityNumber]))
			alert(pCommodity[commodityNumber].name + ' is expensive!');
	}
},

// check for numbers in both buying and selling and reduce to net in proper position
checkInputValues: function(commodityNumber) {
	if (pTargetFrame.getElementById('sell_' + commodityNumber)
	 && pTargetFrame.getElementById('sell_' + commodityNumber).value != ''
	 && pTargetFrame.getElementById('buy_' + commodityNumber)
	 && pTargetFrame.getElementById('buy_' + commodityNumber).value != '') {
		var selling = pTargetFrame.getElementById('sell_' + commodityNumber).value;
		var buying = pTargetFrame.getElementById('buy_' + commodityNumber).value;
		pTargetFrame.getElementById('sell_' + commodityNumber).value  = '';
		pTargetFrame.getElementById('buy_' + commodityNumber).value  = '';
		var net = buying - selling;
		if (net < 0) Stevedore.sellCommodity(commodityNumber, -net);
		else if (net > 0) Stevedore.buyCommodity(commodityNumber, net);
	}
},

tradeAll: function(destination, transaction, amount) {
	// fill in the 'sell' side except for commodities that are produced there
	var tradeAmount = amount;
	if (destination == 'shore') {
		if (pTargetFrame.getElementById('autoUnload').checked) {
			for (taComNum = 1; taComNum < pCommodity.length; taComNum++) {
				if (pTargetFrame.getElementById('sell_' + taComNum)
				 && pTargetFrame.getElementById('sell_' + taComNum).value == ""
				 && (pBuilding[pShoreStatus.number].consumes.indexOf(taComNum) != -1
				  || pBuilding[pShoreStatus.number].consumes.indexOf(0) != -1)
				 && (taComNum != 16 || pShoreStatus.number == 25)) {
					if (transaction == 'transfer') Stevedore.transferCommodity('shore', taComNum, tradeAmount);
					if (transaction == 'fillTo') Stevedore.fillTo('shore', taComNum, tradeAmount);
					if (transaction == 'maintain') Stevedore.maintainCommodity('shore', taComNum, tradeAmount);
				}
			}
		}
	}

	// fill in the buy side for each produced commodity only
	if (destination == 'ship') {
		for (taComNum = 1; taComNum < pCommodity.length; taComNum++) {
			if (pTargetFrame.getElementById('buy_' + taComNum)
			 && pTargetFrame.getElementById('buy_' + taComNum).value == ''
			 && (pBuilding[pShoreStatus.number].produces.indexOf(taComNum) != -1
			  || pBuilding[pShoreStatus.number].produces.indexOf(0) != -1)) {
					if (transaction == 'transfer') Stevedore.transferCommodity('ship', taComNum, tradeAmount);
					if (transaction == 'fillTo') Stevedore.fillTo('ship', taComNum, tradeAmount);
					if (transaction == 'maintain') Stevedore.maintainCommodity('ship', taComNum, tradeAmount);
			}
		}
	}
},


resetForm: function() {
	for(tbn=0; tbn<pCommodity.length; tbn++) {
		if (pTargetFrame.getElementById('sell_' + tbn)) pTargetFrame.getElementById('sell_' + tbn).value = '';
		if (pTargetFrame.getElementById('buy_' + tbn)) pTargetFrame.getElementById('buy_' + tbn).value = '';
	}
	Stevedore.updateSpace();
},


// -----------------------------------------------------------------------//
// ----------------------------- Support Functions -----------------------//
// -----------------------------------------------------------------------//

// Calculate Max Trade Values for commodity buying/selling
calcTradeValues: function() {
	for (tbo=0; tbo<pCommodity.length; tbo++) {
		if (pCommodity[tbo]) {
			var sell = pCommodity[tbo].shoreMax - pCommodity[tbo].shoreStock;
			if (sell < 0) sell = 0;
			if (sell > pCommodity[tbo].shipStock) sell = pCommodity[tbo].shipStock;
			pCommodity[tbo].sellMax = sell;

			var buy = pCommodity[tbo].shoreStock - pCommodity[tbo].shoreMin;
			if (buy < 0) buy = 0;
			pCommodity[tbo].buyMax = buy;
		}
	}
},		


// calculate final ship / building space and display on form
updateSpace: function() {

	var finalShipSpace = pShipStatus.freeSpace + pShipStatus.magScoopSpace;
	var finalShoreSpace = pShoreStatus.freeSpace;
	var spaceString;

	for (var tbp=0; tbp<pCommodity.length; tbp++) {
		if (pTargetFrame.getElementById('sell_' + tbp)) {
			finalShoreSpace = finalShoreSpace - pTargetFrame.getElementById('sell_' + tbp).value * 1;
			finalShipSpace = finalShipSpace + pTargetFrame.getElementById('sell_' + tbp).value * 1;
		}
		if (pTargetFrame.getElementById('buy_' + tbp)) finalShipSpace = finalShipSpace - pTargetFrame.getElementById('buy_' + tbp).value * 1;
	}

	if (pShipStatus.hasMagScoop) {
		if (finalShipSpace < 0) spaceString = finalShipSpace + 't + 0t';
		if (finalShipSpace < 150) spaceString = '0t + ' + finalShipSpace + 't';
		if (finalShipSpace >= 150) spaceString = (finalShipSpace - 150) + 't + 150t';
	} else spaceString = finalShipSpace + 't';

	pShipStatus.freeSpaceLocation.innerHTML = spaceString;
	if (pShoreStatus.number < 30) pShoreStatus.freeSpaceLocation.innerHTML = finalShoreSpace + 't';
	else pShipStatus.topFreeSpaceLocation.textContent = 'Free Space: ' + spaceString;
},

// determine amount of free ship space available including current tansaction values
freeShipSpace: function() {
	var finalShipSpace = pShipStatus.freeSpace - pShipStatus.holdSpace;

	if (pShipStatus.hasMagScoop) {
		if (pTargetFrame.getElementById('useMagScoop').checked) finalShipSpace = finalShipSpace + pShipStatus.magScoopSpace;
		else finalShipSpace = finalShipSpace - 150 + pShipStatus.magScoopSpace;
	}

	for (tbq = 0; tbq < pCommodity.length; tbq++ ) {
		if (pTargetFrame.getElementById('sell_' + tbq))	finalShipSpace += pTargetFrame.getElementById('sell_' + tbq).value * 1;
		if (pTargetFrame.getElementById('buy_' + tbq)) finalShipSpace -= pTargetFrame.getElementById('buy_' + tbq).value;
	}

	return finalShipSpace;
},

// Determine amount of free shore space including current transactions
freeShoreSpace: function() {
	var finalShoreSpace = pShoreStatus.freeSpace - pShoreStatus.holdSpace;
	for (tbr = 0; tbr < pCommodity.length; tbr ++ ) {
		if (pTargetFrame.getElementById('sell_' + tbr)) finalShoreSpace -= pTargetFrame.getElementById('sell_' + tbr).value * 1;
	}
	return finalShoreSpace;
},

// Short pause, then update space numbers when using original commodity form filler
pauseUpdate: function() { var t = setTimeout(Stevedore.updateSpace, 100); },

// Keystroke shortcuts
keyStroke: function(keypressed) {
	var key = keypressed.charCode;
	key = String.fromCharCode(key);
	key = key.toLowerCase();
	for (keyCheck = 0; keyCheck<pShoreStatus.buttonList.length; keyCheck++) {
		if (key == pShoreStatus.buttonList[keyCheck].hotKey.toLowerCase()) Stevedore.executeCommand(keyCheck);
	}
	if (key == 'r') Stevedore.resetForm();
},

// scrub number data
scrubData: function(data) {
	if (data.search(/,/) != - 1) data = data.replace(/,/, '');
	if (data.search(/\+/g) != - 1) data = 0;
	else if (data.search(/-/) != - 1) data = data.replace('-', '');
	data = data * 1;
	return data;
},

// -----------------------------------------------------------------------//
// ----------------------------- Object Functions ------------------------//
// -----------------------------------------------------------------------//
// building Object
commodityObject: function(commodityNumber, commodityName, commodityImagePath) {
	this.number = commodityNumber;
	this.name = commodityName
	this.imagePath = commodityImagePath;
},

// commodity Object
buildingObject: function(number, name, nameAbrev, consumes, produces) {
	this.number = number;
	this.name = name;
	this.nameAbrev = nameAbrev;
	this.consumes = consumes;
	this.produces = produces;
},


// search object array and return number for name
index: function(checkArray, name) {
	var index = -1;
	for (tbs=0; tbs<checkArray.length; tbs++) if (checkArray[tbs] && checkArray[tbs].name == name) index = tbs;
	return index;
},

// Returns if a commodity is consumed at a building
buildingConsumes: function(building, commodity) {
	if (isNaN(building * 1)) building = Stevedore.index(pBuilding, building);
	if (isNaN(commodity * 1)) commodity = Stevedore.index(pCommodity, commodity);
	if (pBuilding[building].consumes.indexOf(commodity) != -1) return true;
	else return false;
},

// Reset all commodity Numbers
resetCommodities: function() {
	for (comReset = 0; comReset < pCommodity.length; comReset++) {
		if (pCommodity[comReset]) {
			pCommodity[comReset].shoreMin = 0;
			pCommodity[comReset].shoreMax = 0;
			pCommodity[comReset].shoreStock = 0;
			pCommodity[comReset].shoreComm = 0;
			pCommodity[comReset].shipStock = 0;
			pCommodity[comReset].sellPrice = 0;
			pCommodity[comReset].buyPrice = 0;
		}
	}
},

loadCommodities: function() {
	pCommodity[0] = new Stevedore.commodityObject(0, 'All', '');
	pCommodity[1] = new Stevedore.commodityObject(1, 'Food', 'food.png');
	pCommodity[2] = new Stevedore.commodityObject(2, 'Energy', 'energy.png');
	pCommodity[3] = new Stevedore.commodityObject(3, 'Water', 'water.png');
	pCommodity[4] = new Stevedore.commodityObject(4, 'Animal embryos', 'animal_embryos.png');
	pCommodity[5] = new Stevedore.commodityObject(5, 'Ore', 'ore.png');
	pCommodity[6] = new Stevedore.commodityObject(6, 'Metal', 'metal.png');
	pCommodity[7] = new Stevedore.commodityObject(7, 'Electronics', 'electronics.png');
	pCommodity[8] = new Stevedore.commodityObject(8, 'Robots', 'robots.png');
	pCommodity[9] = new Stevedore.commodityObject(9, 'Heavy plastics', 'heavy-plastics.png');
	pCommodity[10] = new Stevedore.commodityObject(10, 'Hand weapons', 'hand-weapons.png');
	pCommodity[11] = new Stevedore.commodityObject(11, 'Medicines', 'medicines.png');
	pCommodity[12] = new Stevedore.commodityObject(12, 'Nebula gas', 'nebula-gas.png');
	pCommodity[13] = new Stevedore.commodityObject(13, 'Chemical supplies', 'chemical-supplies.png');
	pCommodity[14] = new Stevedore.commodityObject(14, 'Gem stones', 'gem-stones.png');
	pCommodity[15] = new Stevedore.commodityObject(15, 'Liquor', 'liquor.png');
	pCommodity[16] = new Stevedore.commodityObject(16, 'Hydrogen fuel', 'hydrogen-fuel.png');
	pCommodity[17] = new Stevedore.commodityObject(17, 'Exotic matter', 'exotic_matter.png');
	pCommodity[18] = new Stevedore.commodityObject(18, 'Optical components', 'optical_components.png');
	pCommodity[19] = new Stevedore.commodityObject(19, 'Radioactive cells', 'radioactive_cells.png');
	pCommodity[20] = new Stevedore.commodityObject(20, 'Droid modules', 'droid_modules.png');
	pCommodity[21] = new Stevedore.commodityObject(21, 'Bio-waste', 'biowaste.png');
	pCommodity[22] = new Stevedore.commodityObject(22, 'Leech baby', 'leech_baby.png');
	pCommodity[23] = new Stevedore.commodityObject(23, 'Nutrient clods', 'nutrient_clods.png');
	pCommodity[24] = new Stevedore.commodityObject(24, 'Cybernetic X-993 Parts', 'cybernetic_x993_parts.png');
	pCommodity[25] = new Stevedore.commodityObject(25, 'X-993 Repair-Drone', 'x993_repairdrone.png');
	pCommodity[26] = new Stevedore.commodityObject(26, 'Neural Stimulator', 'neural_stimulator.png');
	pCommodity[27] = new Stevedore.commodityObject(27, 'Battleweapon Parts', 'battleweapon_parts.png');
	pCommodity[28] = new Stevedore.commodityObject(28, 'Neural Tissue', 'neural_tissue.png');
	pCommodity[29] = new Stevedore.commodityObject(29, 'Stim Chip', 'stim_chip.png');
	pCommodity[50] = new Stevedore.commodityObject(50, 'Slaves', 'slaves.png');
	pCommodity[51] = new Stevedore.commodityObject(51, 'Drugs', 'drugs.png');
	pCommodity[100] = new Stevedore.commodityObject(100, 'Package', 'package.png');
	pCommodity[101] = new Stevedore.commodityObject(101, 'Faction package', 'package_faction.png');
	pCommodity[102] = new Stevedore.commodityObject(102, 'Explosives', 'explosives.png');
	pCommodity[103] = new Stevedore.commodityObject(103, 'VIP', 'vip.png');
	pCommodity[104] = new Stevedore.commodityObject(104, 'Christmas Glitter', '');
	pCommodity[105] = new Stevedore.commodityObject(105, 'Military Explosives', 'explosives_military.png');
	pCommodity[201] = new Stevedore.commodityObject(201, 'Human intestines', 'human_intestines.png');
	pCommodity[202] = new Stevedore.commodityObject(202, 'Skaari limbs', 'skaari_limbs.png');
	pCommodity[203] = new Stevedore.commodityObject(203, 'Keldon brains', 'keldon_brains.png');
	pCommodity[204] = new Stevedore.commodityObject(204, 'Rashkir bones', 'rashkir_bones.png');
	pCommodity[150] = new Stevedore.commodityObject(150, 'Exotic Crystal', 'exotic_crystal.png');
	pCommodity[211] = new Stevedore.commodityObject(211, 'Blue Sapphire jewels', 'jewels_fed.png');
	pCommodity[212] = new Stevedore.commodityObject(212, 'Ruby jewels', 'jewels_emp.png');
	pCommodity[213] = new Stevedore.commodityObject(213, 'Golden Beryl jewels', 'jewels_uni.png');
},

loadBuildings: function() {
	pBuilding[0] = new Stevedore.buildingObject(0, 'Fuel Collector', 'Fuel Col', new Array(2, 13), new Array(16, ''));
	pBuilding[1] = new Stevedore.buildingObject(1, 'Gas Collector', 'Gas Col', new Array(1, 2, 3), new Array(12, ''));
	pBuilding[2] = new Stevedore.buildingObject(2, 'Space Farm', 'Farm', new Array(2, 4), new Array(1, 3, 21));
	pBuilding[3] = new Stevedore.buildingObject(3, 'Energy Well', 'E-well', new Array(1, 3), new Array(2, ''));
	pBuilding[4] = new Stevedore.buildingObject(4, 'Chemical Laboratory', 'Chem Lab', new Array(1, 2, 3), new Array(13, ''));
	pBuilding[5] = new Stevedore.buildingObject(5, 'Asteroid Mine', 'Mine', new Array(1, 2, 3), new Array(5, 14));
	pBuilding[6] = new Stevedore.buildingObject(6, 'Radiation Collector', 'Rad Col', new Array(1, 2, 3), new Array(19, ''));
	pBuilding[7] = new Stevedore.buildingObject(7, 'Medical Laboratory', 'Med Lab', new Array(1, 2, 3, 12), new Array(11, ''));
	pBuilding[8] = new Stevedore.buildingObject(8, 'Brewery', 'Brewery', new Array(1, 2, 3, 13), new Array(15, ''));
	pBuilding[9] = new Stevedore.buildingObject(9, 'Plastics Facility', 'Plastics', new Array(1, 2, 3, 12, 13), new Array(9, ''));
	pBuilding[10] = new Stevedore.buildingObject(10, 'Smelting Facility', 'Smelter', new Array(1, 2, 3, 5), new Array(6, ''));
	pBuilding[11] = new Stevedore.buildingObject(11, 'Optics Research Center', 'Optics', new Array(1, 2, 3, 14), new Array(18, ''));
	pBuilding[12] = new Stevedore.buildingObject(12, 'Slave Camp', 'SC', new Array(1, 2, 3, 11, 15), new Array(50, ''));
	pBuilding[13] = new Stevedore.buildingObject(13, 'Electronics Facility', 'Elects', new Array(1, 2, 3, 6, 9), new Array(7, ''));
	pBuilding[14] = new Stevedore.buildingObject(14, 'Recyclotron', 'Recyclo', new Array(2, 13, 21), new Array(1, 3));
	pBuilding[15] = new Stevedore.buildingObject(15, 'Clod Generator', 'Clod Gen', new Array(2, 13, 21), new Array(23, ''));
	pBuilding[16] = new Stevedore.buildingObject(16, 'Nebula Plant', 'Neb Plant', new Array(1, 3, 17), new Array(2, 12));
	pBuilding[17] = new Stevedore.buildingObject(17, 'Drug Station', 'DS', new Array(1, 2, 3, 17, 50), new Array(51, ''));
	pBuilding[18] = new Stevedore.buildingObject(18, 'Dark Dome', 'Dome', new Array(2, 50), new Array(21, 201, 202, 203, 204));
	pBuilding[19] = new Stevedore.buildingObject(19, 'Handweapons Factory', 'HW Fact', new Array(1, 2, 3, 7, 9, 18), new Array(10, ''));
	pBuilding[20] = new Stevedore.buildingObject(20, 'Battleweapons Factory', 'BW Fact', new Array(1, 2, 3, 6, 7, 18), new Array(27, ''));
	pBuilding[21] = new Stevedore.buildingObject(21, 'Robot Factory', 'Robot Fac', new Array(1, 2, 3, 6, 7, 18), new Array(8, ''));
	pBuilding[22] = new Stevedore.buildingObject(22, 'Droid Assembly Complex', 'DAC', new Array(1, 2, 3, 8, 19), new Array(20, ''));
	pBuilding[23] = new Stevedore.buildingObject(23, 'Leech Nursery', 'Nursery', new Array(1, 2, 3, 19, 23), new Array(22, 21));
	pBuilding[24] = new Stevedore.buildingObject(24, 'Alliance Command Station', 'ACS', new Array(2, 19), new Array(''));
	pBuilding[25] = new Stevedore.buildingObject(25, 'Military Outpost', 'MO', new Array(2, 16), new Array(''));
	pBuilding[26] = new Stevedore.buildingObject(26, 'Neural Laboratory', 'Neu Lab', new Array(1, 2, 3, 4, 11), new Array(28, ''));
	pBuilding[27] = new Stevedore.buildingObject(27, 'Stim Chip Mill', 'Stim Mill', new Array(1, 3, 7, 17, 28), new Array(29, ''));
	pBuilding[28] = new Stevedore.buildingObject(28, 'Trading Outpost', 'TO', new Array(0, ''), new Array(0, ''));
	pBuilding[29] = new Stevedore.buildingObject(29, 'Player Starbase', 'PSB', new Array(0, ''), new Array(0, ''));
	pBuilding[30] = new Stevedore.buildingObject(30, 'Planet', 'Planet', new Array(0, ''), new Array(0, ''));
	pBuilding[31] = new Stevedore.buildingObject(31, 'NPC Starbase', 'NPC SB', new Array(0, ''), new Array(0, ''));
},



};

