// This is a content script.  It runs on building_trade.php.

// From other sources
var Universe, Sector, Building;

//Global variables.
var universe, configured, userloc, buildingKey, time, pageData;

configure();

// End of content script execution.

function configure() {
	var script;
	if ( !configured ) {
		universe = Universe.fromDocument( document );
		window.addEventListener( 'message', onGameMessage );
		script = document.createElement( 'script' );
		script.type = 'text/javascript';
		script.textContent = "(function(){var fn=function(){window.postMessage({pardus_bookkeeper:1,loc:typeof(userloc)==='undefined'?null:userloc,time:typeof(milliTime)==='undefined'?null:milliTime,player_buy_price:typeof(player_buy_price)==='undefined'?null:player_buy_price,player_sell_price:typeof(player_sell_price)==='undefined'?null:player_sell_price,amount:typeof(amount)==='undefined'?null:amount,amount_max:typeof(amount_max)==='undefined'?null:amount_max,amount_min:typeof(amount_min)==='undefined'?null:amount_min},window.location.origin);};if(typeof(addUserFunction)==='function')addUserFunction(fn);fn();})();";
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
	time = data.time;
	buildingKey = universe.key + userloc;
	pageData = parsePage();
	pageData.amount = data.amount;
	pageData.buyAtPrices = data.player_buy_price;
	pageData.sellAtPrices = data.player_sell_price;
	pageData.max = data.amount_max
	pageData.min = data.amount_min;
	
	overflowGuard();
	
	// Now check if the building is tracked
	chrome.storage.sync.get( buildingKey, onBuildingData );
	chrome.storage.sync.get( 'BookkeeperOptions', addKeyPress );
}

function addKeyPress( data ) {
	let Options = data [ 'BookkeeperOptions' ];
	if ( !Options || !Options[ 'enableAutoKey'] || document.getElementsByTagName( 'h1' )[0].firstElementChild.src.indexOf( 'Trading Outpost' ) !== -1 )
		return; //Trade outpost screws this up somehow
	window.addEventListener( 'keypress', clickAuto.bind( this, Options ) );
}		

function clickAuto( Options, evt ) {
	if ( evt.keyCode === Options[ 'autoKey' ] ) { 
		document.getElementById( 'quickButtonSellAndBuy' ).click();
	}
}

function onBuildingData( data ) {
	var building;

	if ( data[buildingKey] ) {
		// Building is tracked.
		building = Building.createFromStorage(
			buildingKey, data[buildingKey] );
		if ( building.typeId == 17 ) {
			buildMODOM( building );
		}
		updateBuilding( {}, building );
		addButton( 'Untrack', onTrackButtonClick );
	}
	else
		addButton( 'Track', onTrackButtonClick );
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

// Function finds the transfer button since Pardus sadly gave it neither ID nor
// name, so we have to check all input elements for the value '<- Transfer ->'
function findTransferButton() {
	var inputs, i, end, input;
	inputs = document.forms.building_trade.elements;
	for ( i = 0, end = inputs.length; i < end ; i++ ) {
		input = inputs[ i ];
		if ( input.type === 'submit' &&
		     input.value === '<- Transfer ->' )
			return input;
	}
	return null;
}

function onTrackButtonClick() {
	this.disabled = true;

	if( this.value == "Track" ) {
		// Fetch the universe list and the building again -- it could
		// have been updated in another tab.
		chrome.storage.sync.get(
			[ universe.key, buildingKey ], onTrackingBuilding );
	}
	else
		Building.removeStorage(
			userloc, universe.key, onBuildingUntracked );

	// Don't toggle or enable here.  We'll toggle when Chrome tells us the
	// building is saved (it can fail if we're over quota) or removed.
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
		building = Building.createFromStorage(
			buildingKey, data[buildingKey] );
		updateBuilding( storeItems, building, onBuildingTracked );
	}
	else {
		// Get the current sector, finish when available.  The building
		// list already goes inside storeItems.
		chrome.storage.local.get(
			'sector',
			finishSaveBuilding.bind(
				null, storeItems, onBuildingTracked) );
	}
}

function finishSaveBuilding( items, callback, data ) {
	var buildingId, info, building, sectorId;

	sectorId = Sector.getId( data.sector );
	if ( sectorId === undefined ) {
		// Oops, currently can't save without this.  How did this
		// happen?  XXX - also, should tell the user we failed somehow
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
		btn.value = 'Untrack';
}

function onBuildingUntracked() {
	var btn = document.getElementById( 'bookkeeper-track' );
	btn.disabled = false;
	btn.value = 'Track';
}

function parsePage() {
	var typeName, typeId, owner, buying, selling,
	    baseUpkeep, baseProduction, upkeep, production, ticksLeft,
	    s, a, trs, tr, credits, freeSpace;

	typeName = document.evaluate(
		'//h1', document, null, XPathResult.STRING_TYPE,
		null).stringValue.trim();
	typeId = Building.getTypeId( typeName );

	if ( typeId === undefined )
		return null;
	baseUpkeep = Building.getBaseUpkeep( typeId );
	baseProduction = Building.getBaseProduction( typeId );

	s = document.evaluate('./table/tbody/tr[position()=1]/td[position()=3]',
			      document.forms.building_trade, null,
			      XPathResult.STRING_TYPE, null).stringValue.trim();
	a = s.split( "'", 2 );

	if ( a[1] !== 's ' + typeName )
		return null;
	owner = a[0];

	buying = [];
	selling = [];
	upkeep = [];
	production = [];
	ticksLeft = [];
	trs = document.evaluate(
		'./table/tbody/tr[position()=2]/td[position()=3]/table/tbody/tr[starts-with(@id, "baserow")]',
		document.forms.building_trade, null,
		XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null);

	// Loop over each commodity row

	while ( (tr = trs.iterateNext()) !== null )
		parseRow( tr );

	// XXX - get the free space here, for #49
	freeSpace = document.evaluate(
		'//td[contains(text(),"space")]',
		document.forms.building_trade, null,
		XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null );
	freeSpace.iterateNext();
	freeSpace = freeSpace.iterateNext();
	freeSpace = parseInt( freeSpace.nextElementSibling.textContent.replace( /t|,/g, '' ) );

	// Get credits
	credits = document.evaluate(
		'//td[contains(text(),"credits")]',
		document.forms.building_trade, null,
		XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null );
	credits.iterateNext();
	credits = credits.iterateNext();
	credits = parseInt( credits.nextElementSibling.textContent.replace( /,/g, '' ) );

	return {
		typeName,
		typeId,
		owner,
		buying,
		selling,
		upkeep,
		production,
		baseUpkeep,
		baseProduction,
		ticksLeft: Math.min.apply( null, ticksLeft ),
		credits,
		freeSpace
	};

	function parseRow( tr ) {
		var cid, amt, m, bal, lim;

		// Id - We can get the commodity from the id of the row, from
		// the icon in column zero, or the name in column 1.  I Don't
		// think one of these is particularly better or safer, so I'll
		// go with the easiest.  If we fail parsing a row, we'll ignore
		// it but keep trying.

		cid = parseInt( tr.id.substr(7) ); // 7 == 'baserow'.length
		if ( !(cid > 0) )
			return;

		// Amount

		amt = parseInt( tr.children[2].textContent.replace(/[, ]+/g, "") );
		if ( isNaN(amt) )
			return;

		// Balance (upkeep/production)
		// MOs show things like "-5 to -15" here.  We could be smarter
		// for those, and probably will soon to fully close #32, but for
		// now we'll just assume the higher value applies.

		m = tr.children[3].textContent;
		if ( !m )
			return;

		if ( typeId == 17 ) { // MO	
			bal = parseInt( m.split(/ /g)[2] );
		} else {
			bal = parseInt( m );
		}

		if ( baseProduction[cid] ) {
			if ( !(bal > 0) )
				// What is this? :S
				return;

			// Minimum
			lim = parseInt( tr.children[4].textContent );
			if ( isNaN(lim) )
				return;

			selling[ cid ] = amt > lim ? amt - lim : 0;
			production[ cid ] = bal;
		}
		else if ( cid in baseUpkeep ) {
			if ( !(bal < 0) )
				// What is this? :S
				return;
			bal = -bal;

			// Maximum
			lim = parseInt( tr.children[5].textContent );
			if ( isNaN(lim) )
				return;

			buying[ cid ] = amt < lim ? lim - amt : 0;
			upkeep[ cid ] = bal;
			ticksLeft.push( Math.floor(amt / bal) );
		}
	}
}

// `storeItems` is a hash containing keys we want to store along with the
// building.

function updateBuilding( storeItems, building, callback ) {
	var level, abnormal;

	level = infallibleLevelEstimator(
		pageData.baseUpkeep, pageData.baseProduction,
		pageData.upkeep, pageData.production );

	building.setType( pageData.typeId );
	building.setTime( Building.seconds(time) );
	building.setOwner( pageData.owner );
	building.setLevel( level );
	building.setTicksLeft( pageData.ticksLeft );
	building.setBuying( pageData.buying );
	building.setSelling( pageData.selling );
	building.setCredits( pageData.credits );
	
	if ( Building.getTypeShortName( building.typeId ) === 'TO' ) {
		building.setPSB( true );
		building.level = 0;
		for ( var key in pageData.buyAtPrices ) {
			let id = parseInt( key );
			building.amount[ id ] = pageData.amount[ key ];
			building.buyAtPrices[ id ] = pageData.buyAtPrices[ key ];
			building.sellAtPrices[ id ] = pageData.sellAtPrices[ key ];
			building.maximum[ id ] = pageData.max[ key ];
			building.minimum[ id ] = pageData.min[ key ];
			building.buying[ id ] = pageData.max[ key ] - pageData.amount[ key ] < 0 ? 0 : pageData.max[ key ] - pageData.amount[ key ];
			building.selling[ id ] = pageData.amount[ key ] - pageData.min[ key ] < 0 ? 0 : pageData.amount[ key ] - pageData.min[ key ];
			}
		}
	
	if ( level === undefined ||
	     !arrayEquals(
		Building.getNormalUpkeep(pageData.typeId, level),
			pageData.upkeep) ||
	     !arrayEquals(
		Building.getNormalProduction(pageData.typeId, level),
			pageData.production) ) {
		// The infallible estimator failed [LIES].
		building.setLevel( undefined );
		building.setUpkeep( pageData.upkeep );
		building.setProduction( pageData.production );
		
		if (building.typeId == 17) { // MO. We basically redo our upkeep/ticksleft based on the entered grid strength, 15 at default.
			if (!document.getElementById( 'bookkeeper-grid' )) 
				buildMODOM( building );
			
			building.level = parseInt( document.getElementById( 'bookkeeper-grid' ).value );
			
			let upkeepMO = {
				2: Math.min(15, 5 + building.level),
				16: Math.min(15, 5 + building.level),
				19: Math.max( Math.max(0, building.level - 10) + Math.max(0, building.level - 15) )
			};	
			
			let cidlist = [2, 16, 19], upklist = [], ticksLeft = [];
			cidlist.forEach ( function( cid ) {
				upklist[ cid ] = upkeepMO[ cid ];
				if (upklist[ cid ] > 0) 
					ticksLeft.push( Math.floor(pageData.amount[cid] / upkeepMO[ cid ] ) );
			} );
			
			building.setUpkeep( upklist );
			building.setTicksLeft( Math.min( ...ticksLeft ) );
		}
	}
	else {
		building.setUpkeep( undefined );
		building.setProduction( undefined );
	}

	storeItems[ buildingKey ] = building.toStorage();

	chrome.storage.sync.set( storeItems, callback );

	function arrayEquals( a, b ) {
		return a.length === b.length &&
			a.every( function(v, id) { return v === b[ id ]; } );
	}
}

function infallibleLevelEstimator(
	baseUpkeep, baseProduction, seenUpkeep, seenProduction )
{
	var cid, base, factor, seen;

	// Find the best commodity to test on.  See devnotes for the rationale
	// behind this code.

	cid = best( baseUpkeep );
	if ( cid !== undefined && baseUpkeep[cid] > 2 ) {	
		base = baseUpkeep[ cid ];
		seen = seenUpkeep[ cid ];
		factor = 0.4;
	}
	else {
		cid = best( baseProduction );
		base = baseProduction[ cid ];
		seen = seenProduction[ cid ];
		factor = 0.5;
	}

	return Math.round( 1 + (seen / base - 1) / factor );

	// Given a dictionary `dict` of commodity ids to values, return the id
	// of the commodity with the largest value.
	function best( dict ) {
		var id, result, max = -Infinity;
		for ( id in dict ) {
			if ( dict[id] > max ) {
				result = id;
				max = dict[ id ];
			}
		}
		return result;
	}

}

function overflowGuard() {
	// Lets user know if and when the building overflows.
	let perTick = 0, L;
	
	pageData.upkeep.length < pageData.production.length ? L = pageData.production.length : L = pageData.upkeep.length;
	for ( var i = 0; i < L ; i++ ) {
		if ( pageData.upkeep[ i ] )
			perTick -= pageData.upkeep[ i ];
		if ( pageData.production[ i ] )
			perTick += pageData.production[ i ];
	}
	
	if ( pageData.freeSpace < pageData.ticksLeft * perTick ) {
		let div = document.createElement( 'div' );
		let transferButton = findTransferButton();
		transferButton.parentNode.appendChild( document.createElement( 'br' ) );
		div.textContent = 'Overflows in ' + ( Math.floor( pageData.freeSpace / perTick ) + 1 ) + ' ticks.';
		transferButton.parentNode.appendChild( div );
	}
}

function buildMODOM( building ) {
	let creditsTR = a = document.evaluate(
		'./table/tbody/tr[position()=2]/td[position()=3]/table/tbody/tr[contains(td,"credits")]/..',
		document.forms.building_trade, null,
		XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null).iterateNext();
	let tr = document.createElement( 'tr' );
	let td = document.createElement( 'td' );
	td.setAttribute( 'colspan', '4');
	td.textContent = 'Grid strength';
	tr.appendChild(td);
	td = document.createElement( 'td' );
	let gridInput = document.createElement( 'input' );
	gridInput.type = 'textarea';
	gridInput.size = '1';
	gridInput.id = 'bookkeeper-grid';
	building.level ? gridInput.value = building.level : gridInput.value = 15;
	td.setAttribute( 'colspan', '4' );
	td.setAttribute( 'align', 'right' );
	td.appendChild( gridInput );
	tr.appendChild( td );
	tr.setAttribute( 'style', 'background-color:#003040' );
	creditsTR.appendChild( tr );
	gridInput.addEventListener('change', 
		function() { 
			updateBuilding( {}, building );
		} );
}
