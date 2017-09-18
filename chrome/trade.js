// -*- js3-indent-level: 8; js3-indent-tabs-mode: t -*-

// This is a content script.  It runs on building_trade.php.

var Universe; // in universe.js
var Building; // in building.js

(function () {

'use strict';

//Global variables.
var configured = false;
var userloc, res_upkeep, res_production, amount_max, amount_min, buy_price, sell_price, time, amount;
var universe = Universe.fromDocument( document );
//var buildingList = new Object();

function configure() {
	if (!configured) {
		document.defaultView.addEventListener( 'message', onGameMessage );
		var script = document.createElement( 'script' );
		script.type = 'text/javascript';
		var s = "\
(function() {var fn=function(){window.postMessage({pardus_bookkeeper:1,\
loc:typeof(userloc)=='undefined'?null:userloc,\
res_upkeep:typeof(res_upkeep)=='undefined'?null:res_upkeep,\
res_production:typeof(res_production)=='undefined'?null:res_production,\
amount_max:typeof(amount_max)=='undefined'?null:amount_max,\
amount_min:typeof(amount_min)=='undefined'?null:amount_min,\
player_buy_price:typeof(player_buy_price)=='undefined'?null:player_buy_price,\
player_sell_price:typeof(player_sell_price)=='undefined'?null:player_sell_price,\
time:typeof(milliTime)=='undefined'?null:milliTime,\
amount:typeof(amount)=='undefined'?null:amount,\
},window.location.origin);};\
if(typeof(addUserFunction)=='function')addUserFunction(fn);fn();})();";
		script.textContent = s;
		document.body.appendChild( script );
		configured = true;
	}
}

// Arrival of a message means the page contents were updated.  The
// message contains the value of our variables, too.
function onGameMessage( event ) {
	var data = event.data;

	if ( !data || data.pardus_bookkeeper != 1 ) {
		return;
	}

	userloc = parseInt( data.loc );
	res_upkeep = data.res_upkeep;
	res_production = data.res_production;
	amount_max = data.amount_max;
	amount_min = data.amount_min;
	buy_price = data.player_buy_price;
	sell_price = data.player_sell_price;
	time = data.time;
	amount = data.amount;
}

function addTrackButton() {
	// We need to check if the building is tracked.	 Request the building
	// list from storage, it's probably shorter than the actual building
	// entry.
	chrome.storage.sync.get( universe.key, finishAddTrackButton );
}

function finishAddTrackButton( data ) {
	var buildingList = data[ universe.key ],
	    index = buildingList ? buildingList.indexOf(userloc) : -1;

	if( index == -1 )
		addButton( 'Track', onTrackButtonClick );
	else {
		updateBuilding();
		addButton( 'Untrack', onTrackButtonClick );
	}
}

function addButton( name, listener ) {
	var transferButton = findTransferButton();

	//Adds button below the quickbuttons.
	//Initially there were two, I decided a single track/untrack button was more elegant.
	var new_button = document.createElement("input");
	new_button.id = 'bookkeeper-track';
	new_button.setAttribute('style','width: 175px; height: 35px; margin-left: 3px; margin-right: 3px;');
	new_button.setAttribute('type','button');
	new_button.setAttribute('value',name);
	new_button.addEventListener('click',listener);
	transferButton.parentNode.appendChild(document.createElement('br'));
	transferButton.parentNode.appendChild(document.createElement('br'));
	transferButton.parentNode.appendChild(new_button);
}

function onTrackButtonClick() {
	this.disabled = true;

	if( this.value == "Track" )
		chrome.storage.sync.get( universe.key, trackBuilding );
	else
		removeBuilding( userloc, universe, onBuildingUntracked );

	// Don't toggle or enable here.	 We'll toggle when Chrome tells us the
	// building is saved (it can fail if we're over quota) or removed.
}

function toggleButton( btn ) {
	btn.value = ( btn.value == 'Track' ) ? 'Untrack' : 'Track';
}

function findTransferButton() {
	// Function finds the transfer button since Pardus sadly gave it
	// neither ID nor name, so we have to check all input elements for
	// the value '<- Transfer ->'
	var inputs = document.getElementsByTagName("input");
	var transferButton;
	for (var i = 0; i < inputs.length ; i++) {
		if (inputs[i].value === "<- Transfer ->"){
			transferButton = inputs[i];
		}
	}
	return transferButton;
}

function parseInfo() {
	var tds = document.getElementsByTagName("td"),
	    nameline;

	for (var i =0; i<tds.length;i++){
		// so Pardus has this specific color for two TDs, pilot and building owner.
		if (tds[i].style.color === "rgb(221, 221, 255)"){
			nameline = tds[i].firstChild.innerHTML;
		}
	}

	nameline = nameline.split(/'s /);
	var owner = nameline[0];
	var type = nameline[1];
	return [owner, type];
}

function getLevel() {
	var perCommodity = new Object();
	var levelEst = new Object();
	var level = 0;

	for (var key in amount_max) {
		var fontList = document.getElementById('baserow'+key).getElementsByTagName("font");
		perCommodity[key] = parseInt(fontList[fontList.length-1].innerHTML);
		if (perCommodity[key] > 0) {
			levelEst[key] = ((((perCommodity[key] / res_production[key]) - 1) / 0.5) + 1);
		} else {
			levelEst[key] = ((((-perCommodity[key] / res_upkeep[key]) - 1) / 0.4) + 1);
			// So thanks to Div we only take the upkeep for level determination.
			level += levelEst[key];
		}
	}

	// The average of the estimated levels is most likely correct.
	level = Math.round(level / Object.keys(res_upkeep).length);

	// here we double check the level by calculating the upkeep.
	var levelCheck = 0;
	for (var key in res_upkeep) {
		levelCheck += Math.round(res_upkeep[key]*(1+0.4*(level - 1))) + perCommodity[key];
	}

	if (levelCheck === 0) {
		return level;
	}

	return -1;
}

function trackBuilding( data ) {
	var buildingList = data[ universe.key ],
	    storeItems = {};

	if( buildingList ) {
		// We already had a building list, check again if the building
		// is on it.  It shouldn't be, we wouldn't be executing this if
		// it were (we came here from onTrackButtonClick(), which
		// wouldn't have run if the building were on the list).	 But
		// another tab may have updated the list since we last
		// checked...
		if( buildingList.indexOf( userloc ) == -1 ) {
			buildingList.push( userloc )
			storeItems[ universe.key ] = buildingList;
		}
	}
	else
		// First building, woot
		storeItems[ universe.key ] = [ userloc ];

	// Get the current sector and coords
	chrome.storage.local.get(
		['sector', 'x', 'y'],
		finishSaveBuilding.bind(null, storeItems, onBuildingTracked) );
}

function onBuildingTracked() {
	var btn = document.getElementById( 'bookkeeper-track' );
	btn.disabled = false;
	if( chrome.runtime.lastError )
		alert( "Cannot track more buildings\n" +
		       chrome.runtime.lastError.message );
	else
		toggleButton( btn );
}

function onBuildingUntracked() {
	var btn = document.getElementById( 'bookkeeper-track' );
	btn.disabled = false;
	toggleButton( btn );
}

// When this is called, we know the building is already tracked, so no need to
// update the list.
function updateBuilding() {
	// Get the current sector and coords
	chrome.storage.local.get(
		['sector', 'x', 'y'],
		finishSaveBuilding.bind(null, {}, undefined) );
}

function finishSaveBuilding( items, callback, data ) {
	var buildingId = universe.key + userloc,
	    info = parseInfo(),
	    level = getLevel(),
	    building = Building.createFromPardus(
		    userloc, time, data.sector, data.x, data.y, info[1],
		    level, info[0], amount, amount_max, amount_min,
		    res_production, res_upkeep, buy_price, sell_price );
	items[ buildingId ] = building.toStorage();
	chrome.storage.sync.set( items, callback );
}

configure();
addTrackButton();

})();
