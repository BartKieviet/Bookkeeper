var PriceGuard = {

price: new Object(),


// save price array into data string
saveData: function() {
	var data = '';
	
	for (var universe in PriceGuard.price) {
		for (var commodity in PriceGuard.price[universe].maxPrice) {
			data += commodity + ',' + PriceGuard.price[universe].maxPrice[commodity] + ',';
		}
		data = data.substring(0, data.length - 1);
		data += '.';
	}
	data = data.substring(0, data.length - 1);

	Components.classes["@mozilla.org/preferences-service;1"]
		.getService(Components.interfaces.nsIPrefService)
		.getBranch("extensions.parduscopilot.")
		.setCharPref('priceguard', data);
},

// load saved prices into arrays
loadData: function() {

	var loadList = Components.classes["@mozilla.org/preferences-service;1"]
			.getService(Components.interfaces.nsIPrefService)
			.getBranch("extensions.parduscopilot.")
			.getCharPref('priceguard');

	if (loadList == '') PriceGuard.fillList();

	else {
		var universeList = new Array();
		universeList = loadList.split('.');
		for (uni = 0; uni < universeList.length; uni++) {
			var universe;
			if (uni == 0) universe = 'orion';
			if (uni == 1) universe = 'pegasus';
			if (uni == 2) universe = 'artemis';

			PriceGuard.price[universe] = new Object();
			PriceGuard.price[universe].maxPrice = new Array();

			var commodities = new Array();
			commodities = universeList[uni].split(',');
			while (commodities.length > 1) {
				var commodity = commodities.shift();
				var maxPrice = commodities.shift();
				PriceGuard.price[universe].maxPrice[commodity] = maxPrice;
			}
		}
	}
},

fillList: function() {
	universeNames = new Array('orion', 'pegasus', 'artemis');
	var sizeCheck = 0;

	for (uniNum = 0; uniNum < universeNames.length; uniNum++) {

		universe = universeNames[uniNum];
		PriceGuard.price[universe] = new Object;
		PriceGuard.price[universe].maxPrice = new Array();

		PriceGuard.price[universe].maxPrice[0] = 0;
		PriceGuard.price[universe].maxPrice[1] = 300;
		PriceGuard.price[universe].maxPrice[2] = 200;
		PriceGuard.price[universe].maxPrice[3] = 300;
		PriceGuard.price[universe].maxPrice[4] = 50;
		PriceGuard.price[universe].maxPrice[5] = 200;
		PriceGuard.price[universe].maxPrice[6] = 1200;
		PriceGuard.price[universe].maxPrice[7] = 1500;
		PriceGuard.price[universe].maxPrice[8] = 6000;
		PriceGuard.price[universe].maxPrice[9] = 1000;
		PriceGuard.price[universe].maxPrice[10] = 4000;
		PriceGuard.price[universe].maxPrice[11] = 1500;
		PriceGuard.price[universe].maxPrice[12] = 400;
		PriceGuard.price[universe].maxPrice[13] = 400;
		PriceGuard.price[universe].maxPrice[14] = 100;
		PriceGuard.price[universe].maxPrice[15] = 1500;
		PriceGuard.price[universe].maxPrice[16] = 200;
		PriceGuard.price[universe].maxPrice[17] = 1400;
		PriceGuard.price[universe].maxPrice[18] = 500;
		PriceGuard.price[universe].maxPrice[19] = 500;
		PriceGuard.price[universe].maxPrice[20] = 15000;
		PriceGuard.price[universe].maxPrice[21] = 200;
		PriceGuard.price[universe].maxPrice[22] = 100000;
		PriceGuard.price[universe].maxPrice[23] = 200;
		PriceGuard.price[universe].maxPrice[24] = 30000;
		PriceGuard.price[universe].maxPrice[25] = 100000;
		PriceGuard.price[universe].maxPrice[26] = 100000;
		PriceGuard.price[universe].maxPrice[27] = 6000;
		PriceGuard.price[universe].maxPrice[28] = 300;
		PriceGuard.price[universe].maxPrice[29] = 10000;
		PriceGuard.price[universe].maxPrice[50] = 5000;
		PriceGuard.price[universe].maxPrice[51] = 20000;
		PriceGuard.price[universe].maxPrice[100] = 0;
		PriceGuard.price[universe].maxPrice[101] = 0;
		PriceGuard.price[universe].maxPrice[102] = 0;
		PriceGuard.price[universe].maxPrice[103] = 0;
		PriceGuard.price[universe].maxPrice[104] = 0;
		PriceGuard.price[universe].maxPrice[105] = 0;
		PriceGuard.price[universe].maxPrice[201] = 5000;
		PriceGuard.price[universe].maxPrice[202] = 5000;
		PriceGuard.price[universe].maxPrice[203] = 5000;
		PriceGuard.price[universe].maxPrice[204] = 5000;
		PriceGuard.price[universe].maxPrice[150] = 50000;
		PriceGuard.price[universe].maxPrice[211] = 1000;
		PriceGuard.price[universe].maxPrice[212] = 1000;
		PriceGuard.price[universe].maxPrice[213] = 1000;
	}
	PriceGuard.saveData();
},



};