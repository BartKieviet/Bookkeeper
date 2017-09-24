// This is a content script.  It runs on building_trade.php.

var Universe; // in universe.js
var Building; // in building.js

//Global variables.
var configured = false;
var userloc, res_upkeep, res_production, amount_max, amount_min, buy_price, sell_price, time, amount;
var universe = Universe.fromDocument( document );
var buildingKey;
//var buildingList = new Object();

configure();

// End of content script execution.

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

	buildingKey = universe.key + userloc;

	// Now check if the building is tracked
	chrome.storage.sync.get( buildingKey, onBuildingData );
}

function onBuildingData( data ) {
	var building;
	if ( data[buildingKey] ) {
		// Building is tracked.
		building = Building.createFromStorage(
			buildingKey, data[buildingKey] );
		updateBuilding( {}, building, function() {} );
		addButton( 'Untrack', onTrackButtonClick );
	}
	else {
		addButton( 'Track', onTrackButtonClick );
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

	if( this.value == "Track" ) {
		// Fetch the universe list and the building again -- it could
		// have been updated in another tab.
		chrome.storage.sync.get(
			[ universe.key, buildingKey ], onTrackingBuilding );
	}
	else {
		Building.removeStorage( userloc, universe.key, onBuildingUntracked );
	}

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
	var tds, nameline, typeId;

	tds = document.getElementsByTagName("td");
	for (var i =0; i<tds.length;i++){
		// so Pardus has this specific color for two TDs, pilot and building owner.
		if (tds[i].style.color === "rgb(221, 221, 255)"){
			nameline = tds[i].firstChild.innerHTML;
		}
	}

	// XXX - this may break for owners whose name ends in 's', review later.
	nameline = nameline.split(/'s /);
	typeId = Building.getTypeId( nameline[1] );
	if ( typeId === undefined )
		return null;

	return {
		owner: nameline[ 0 ],
		typeId: typeId
	};
}

function guessLevel() {
	var perCommodity, levelEst, level, key;

	perCommodity = new Object();
	levelEst = new Object();
	level = 0;

	for (key in amount_max) {
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
	for (key in res_upkeep) {
		levelCheck += Math.round(res_upkeep[key]*(1+0.4*(level - 1))) + perCommodity[key];
	}

	if (levelCheck === 0) {
		return level;
	}

	return undefined;
}

// This computation should be accurate for any building, including bonused farms
// and TSS drug stations and whatever.  This is because, rather than trying to
// compute the amounts consumed per tick, from guessed level and base upkeep
// figures and whatever funky rules for this particular building, we lift the
// actual value off the page, where Killer Queen helpfully gave it to us in her
// recent update.

function getRealUpkeep() {
	var r, trs, tr, trxp, td, id, m, val;

	trs = document.evaluate(
		'.//tr[starts-with(@id, "baserow")]',
		document.forms.building_trade, null,
		XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null);
	trxp = document.createExpression( './td[position() = 4]', null );
	r = [];

	while ( (tr = trs.iterateNext()) ) {
		id = parseInt( tr.id.substr(7) ); // 7 == 'baserow'.length
		if ( isNaN(id) )
			continue;
		td = trxp.evaluate(
			tr, XPathResult.ANY_UNORDERED_NODE_TYPE,
			null).singleNodeValue;

		// MOs show things like "-5 to -15" here.  We could be smarter
		// for those, and probably will soon to fully close #32, but for
		// now we'll just assume the higher value applies.
		m = /-(\d+)(:?\s+to\s+-(\d+))?/.exec( td.textContent );
		if ( !m )
			continue;

		r[ id ] = parseInt( m[2] ? m[2] : m[1] );
	}

	return r;
}

function computeTicksLeft() {
	var least = Infinity;

	getRealUpkeep().forEach( computeRow );

	return least < Infinity ? least : undefined;

	function computeRow( upkeep, id ) {
		var amt, ticks;

		amt = parseInt( amount[ id ] );
		if ( isNaN(amt) )
			// That was weird
			return;

		ticks = Math.floor( amt / upkeep );
		if ( ticks < least )
			least = ticks;
	}
}

function onTrackingBuilding( data ) {
	var buildingList, building, storeItems;

	buildingList = data[ universe.key ];
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

	if ( data[buildingKey] ) {
		// We already had a building? Weird. May have been another tab.
		building = Building.createFromStorage( buildingKey, data[buildingKey] );
		updateBuilding( storeItems, building, onBuildingTracked );
	}
	else {
		// Get the current sector, finish when available.  The building
		// list already goes inside storeItems.
		chrome.storage.local.get(
			'sector',
			finishSaveBuilding.bind(null, storeItems, onBuildingTracked) );
	}
}

function finishSaveBuilding( items, callback, data ) {
	var buildingId, info, building, sectorId;

	sectorId = Sector.getId( data.sector );
	if ( sectorId === undefined ) {
		// Oops, currently can't save without this.  How did this happen?
		// XXX - also, should tell the user we failed somehow
		callback();
	}
	else {
		building = new Building( userloc, sectorId );
		updateBuilding( items, building, callback );
	}
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

function updateBuilding( items, building, callback ) {
	var info, id, amt, max, min;

	info = parseInfo();
	if ( !info )
		return;

	building.typeId = info.typeId;
	building.time = Building.seconds( time );
	building.owner = info.owner;
	building.level = guessLevel();
	building.ticksLeft = computeTicksLeft();

	building.forSale.length = 0;
	building.toBuy.length = 0;

	for ( id in amount ) {
		amt = amount[ id ];
		max = amount_max[ id ];
		min = amount_min[ id ];

		building.forSale[ id ] = Math.max( 0, amt - min );
		building.toBuy[ id ] = Math.max( 0, max - amt );
	}

	items[ buildingKey ] = building.toStorage();

	chrome.storage.sync.set( items, callback );
}
