var pardusCopilot = {

// Is copilot initialized?
initialized: false,

// initialization code
onLoad: function() {
	URLwatch = document.getElementById("content").browsers[0].contentWindow.document.URL;
	gBrowser.addEventListener("DOMContentLoaded", this.scanURL, false);
},

// Command activated through menu (launches popup window)
onMenuItemCommand: function() {
	if (!pardusCopilot.initialized) pardusCopilot.initialize();
	pardusCopilot.pcpPopupWindow = window.open("chrome://parduscopilot/content/copilotpopup.xul", "Pardus Copilot", "chrome");
},

scanURL: function(event) {
	var eventSource = event.originalTarget.location;
	if (eventSource.toString().search('pardus.at') != -1) {


		if (!pardusCopilot.initialized)	pardusCopilot.initialize();

		if (eventSource.toString().search('building_trade.php') != -1) {
			pTargetFrame = event.originalTarget;
			pardusCopilot.setUniverse();
			Stevedore.buildingTrade(0);
		}

		if (eventSource.toString().search('planet_trade.php') != -1) {
			pTargetFrame = event.originalTarget;
			pardusCopilot.setUniverse();
			Stevedore.buildingTrade(30);
		}

		if (eventSource.toString().search('starbase_trade.php') != -1) {
			pTargetFrame = event.originalTarget;
			pardusCopilot.setUniverse();
			Stevedore.buildingTrade(29);
		}

		if (eventSource.toString().search('building_management.php') != -1) {
			pTargetFrame = event.originalTarget;
			pardusCopilot.setUniverse();
			pStevedore.personalBuildingTrade(0);
		}

		if (eventSource.toString().search('building_trade_settings.php') != -1) {
			pTargetFrame = event.originalTarget;
			pardusCopilot.setUniverse();
			buildingTracker.updatePersonalMaxSettings();
		}


		if (eventSource.toString().search('overview_buildings.php') != -1) {
			pTargetFrame = event.originalTarget;
			pardusCopilot.setUniverse();
			buildingTracker.personalBuildingStatus();
			buildingTracker.originalContent = pTargetFrame.getElementsByTagName('P')[0].innerHTML;
			if (pardusCopilot.checkOption('displayOverviewTable')) buildingTracker.displaySummary();
		}

		if (eventSource.toString().search('index_buildings.php') != -1) {
			pTargetFrame = event.originalTarget;
			pardusCopilot.setUniverse();
			buildingTracker.buildingIndexUpdate();
		}

		if (eventSource.toString().search('main.php') != -1) {
			pTargetFrame = event.originalTarget;
			pardusCopilot.setUniverse();
			pShoreStatus.tileID = pardusCopilot.getStaticID();
			pTargetFrame.getElementById('status').addEventListener('load', pardusCopilot.checkNavLoad, true);
			pardusCopilot.navLoad();
		}
	}
},

checkNavLoad: function() {
	// prevent multiple proccessing of the same page
	if (pTargetFrame.getElementById('coords').textContent != pShoreStatus.coordinates) {
		pShoreStatus.coordinates = pTargetFrame.getElementById('coords').textContent;
		pardusCopilot.navLoad();	
	}
},

navLoad: function() {
	pShoreStatus.sector = pTargetFrame.getElementById('sector').textContent;
	pShoreStatus.coordinates = pTargetFrame.getElementById('coords').textContent;
	pardusCopilot.addAnchorIDs();
	coordinateTracker.trackCoordinates();
	if (pardusCopilot.checkOption('displayNavOverview')) buildingTracker.displayMainScreen();
},

// Set Current Universe
setUniverse: function() {
	var universe = document.getElementById("content").browsers[0].contentWindow.document.URL;
	if (universe.search('orion') != -1) pShoreStatus.universe = 'orion';
	else if (universe.search('artemis') != -1) pShoreStatus.universe = 'artemis';
	else if (universe.search('pegasus') != -1) pShoreStatus.universe = 'pegasus';
	var time = new Date();
	pShoreStatus.timeStamp = time.getTime();
},

// get Center Tile ID from static code
getStaticID: function() {
	var text = pTargetFrame.getElementsByTagName('head')[0].textContent;
	text = text.slice(text.indexOf('userloc = ') + 10, text.indexOf(';', text.indexOf('userloc = ')));
	return text;
},

// get Center Tile ID from nav tile clicked
getDynamicID: function(tileClicked) {
	pShoreStatus.tileID = tileClicked.currentTarget.id.substr(6, tileClicked.currentTarget.id.length);
},

// add id to tile anchors
addAnchorIDs: function() {
	for (linkNum = 0; linkNum < pTargetFrame.getElementsByTagName('A').length; linkNum ++) {
		var linkText = pTargetFrame.getElementsByTagName('A')[linkNum].parentNode.innerHTML;
		if (linkText.search('onclick="nav') != -1) {
			linkText = 'tileID' + linkText.slice(linkText.indexOf('(') + 1, linkText.indexOf(')'));
			if (pTargetFrame.getElementById(linkText)) pTargetFrame.getElementById(linkText).id = '';
			pTargetFrame.getElementsByTagName('A')[linkNum].id = linkText;
			pTargetFrame.getElementById(linkText).addEventListener('click', pardusCopilot.getDynamicID, false);
		}

	}

	// mark center tile with ID
	var navTable = '';
	var linkNum = 0;
	while (navTable == '' && pTargetFrame.getElementsByTagName('A')[linkNum]) {
		var linkText = pTargetFrame.getElementsByTagName('A')[linkNum].id;
		if (linkText.search('tileID') != -1) {
			navTable = pTargetFrame.getElementsByTagName('A')[linkNum].parentNode.parentNode.parentNode;
		}
		linkNum++;
	}

	var centerTile = (navTable.childElementCount - 1)/2;
	navTable.children[centerTile].children[centerTile].getElementsByTagName('A')[0].id = 'tileID' + pShoreStatus.tileID;
},

//Building Trade Screen Stuff
initialize: function() {
        Stevedore.loadCommodities();
	Stevedore.loadBuildings();
	buildingTracker.loadData();
	PriceGuard.loadData();
	TradeButtons.loadData();
	coordinateTracker.loadData();
        pardusCopilot.initialized=true;
	pardusCopilot.loadOptions();
},

loadOptions: function() {
	pOptions = new Object();
	pOptions.orion = new Object();
	pOptions.pegasus = new Object();
	pOptions.artemis = new Object();

	optionsList = new Array('enablePriceGuard',
		'displayButtons',
		'displayHotKey',
		'displayNavOverview',
		'displayOverviewTable',
		'tableBuildingType',
		'tableOwnerName',
		'tableSector',
		'tableCoords',
		'tableTicks',
		'fuelReserveAmount');

	for (var feature in optionsList) {
		pOptions.orion[optionsList[feature]] = '';
		pOptions.pegasus[optionsList[feature]] = '';
		pOptions.artemis[optionsList[feature]] = '';
	}


	var loadData = Components.classes["@mozilla.org/preferences-service;1"]
		.getService(Components.interfaces.nsIPrefService)
		.getBranch("extensions.parduscopilot.")
		.getCharPref('options');

	var loadedData = loadData.split('.');
	var universe = '';

	while (loadedData.length > 0) {
		var id = loadedData.shift();

		if (id == 'orion') universe = 'orion';
		else if (id == 'pegasus') universe = 'pegasus';
		else if (id == 'artemis') universe = 'artemis';
		else {
			var data = loadedData.shift();
			if (!isNaN(data * 1)) data = data * 1;
			pOptions[universe][id] = data;
		}
	}
},

saveOptions: function() {
	var saveString = "";
	for (var universe in pOptions) {
		saveString += universe + '.';
		for (var feature in pOptions[universe]) 
			saveString += feature + '.' + pOptions[universe][feature] + '.';
	}

	saveString = saveString.slice(0, saveString.length-1);

//	alert(saveString);

	Components.classes["@mozilla.org/preferences-service;1"]
		.getService(Components.interfaces.nsIPrefService)
		.getBranch("extensions.parduscopilot.")
		.setCharPref('options', saveString);
},

checkOption: function(feature) {
//	alert (feature + ' ' + pOptions[pShoreStatus.universe][feature]);
	if (pOptions[pShoreStatus.universe][feature] == undefined) return true;
	else if (pOptions[pShoreStatus.universe][feature] > -1) return true;
	else return false;
},
};

// this statement loads script on FireFox loading.
window.addEventListener("load", function(e) { pardusCopilot.onLoad(e); }, false); 

// Global Variables
var pcpTrackList = new Array;	// Building Tracking Array
var pcpButtonList = new Array;	// Button List Array
var pCommodity = new Array;	// Commodity Array
var pBuilding = new Array;	// Building Array
var pButtonList = new Array;	// Button List Array
var pOptions = new Object;	// Options Array
var pShipStatus = new Object;	// Ship Status
var pShoreStatus = new Object;	// Shore Status
var pTargetFrame;		// Main Frame
var pcpPopupWindow;		// Popup Window
