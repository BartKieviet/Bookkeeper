// This is a content script.  It runs on overview_buildings.php.

// Stuff from other files included before.

var Universe, Building, Commodities, CalendarNames,  Sector,
    BKTable, Overview;


var universe = Universe.fromDocument( document ),
    ownEntries = parseOwnBuildings(),
    buildingList; // fetched from storage eventually

// console.log( 'ownEntries', ownEntries );

// Start the ball.
showOverview();

// End of content script execution

function showOverview() {

	Overview.make( universe.key, document, onReady );

	function onReady( overview ) {
		var h1, anchor, img;

		anchor = document.getElementsByTagName('h1')[0];
		h1 = document.createElement( 'h1' );
		h1.className = 'bookkeeper';
		img = document.createElement( 'img' );
		img.src = chrome.extension.getURL( 'icons/24.png' );
		img.title = 'Pardus Bookkeeper';
		h1.appendChild( img );
		h1.appendChild( document.createTextNode('Bookkeeping') );
		anchor.parentNode.insertBefore( h1, anchor );
		anchor.parentNode.insertBefore(
			overview.elements.container, anchor );
	}
}

function makeRemoveButton( loc ) {
	var button;

	button = document.createElement( 'img' );
	button.className = 'bookkeeper-small-button';
	button.src = grayIconSrc;
	button.dataset.bookkeperLoc = loc;
	button.addEventListener( 'click', onRemoveClick );
	button.addEventListener( 'mouseover', onRemoveMouseOver );
	button.addEventListener( 'mouseout', onRemoveMouseOut );

	return button;
}

function onRemoveMouseOver( event ) { event.target.src = iconSrc; }
function onRemoveMouseOut( event ) { event.target.src = grayIconSrc; }

function onRemoveClick( event ) {
	var target, loc;

	target = event.target;
	loc = target.dataset.bookkeperLoc;
	if ( !loc )
		return;

	event.preventDefault();

	Building.removeStorage( loc, universe.key, removeRow );

	function removeRow() {
		var tr = target.parentElement;
		while ( tr.tagName != 'TR' )
			tr = tr.parentElement;
		tr.remove();
	}
}

// Extract all relevant data from the page.  This doesn't rely on any storage
// queries or anything, just lift what's on the page that Pardus sent, and store
// in a format that's easy to use later on.
function parseOwnBuildings() {
	var table, xpr, row, entries, entry;

	entries = [];

	// Get the own buildings table.  This will be the one below the H1
	// header "Your buildings", that contains a column "Building".
	table = document.evaluate(
		'//td[//h1[text()="Your buildings"]]/table[@class="messagestyle" and tbody/tr/th[text()="Building"]]',
		document, null, XPathResult.FIRST_ORDERED_NODE_TYPE,
		null).singleNodeValue;
	if ( !table )
		return null;

	// Now get the rows of this table (just the ones that contain TDs
	// though, skip the one with THs)
	xpr = document.evaluate(
		'./tbody/tr[td]', table, null,
		XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null );
	while ( (row = xpr.iterateNext()) !== null ) {
		entry = parseBuildingRow( row );
		if ( entry !== null )
			entries.push( entry );
	}

	return entries;
}

function parseBuildingRow( tr ) {
	var xpr, r, i, end, e, m, key, xamount;

	r = {};
	xpr = document.evaluate(
		'./td', tr, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null );

	// The row has 11 columns: Building, Position, Capacity, Condition,
	// Production, Modules, Upkeep, Production, Upkeep stock, Commodities,
	// Info.

	for ( i = 0, end = xpr.snapshotLength; i < end; i++ ) {

		// Get type and loc from col 0, building
		e = xpr.snapshotItem( 0 ).firstElementChild;
		if ( !e )
			return null;
		m = /building_trade_settings\.php\?object=(\d+)/.exec( e.href );
		if ( !m )
			return null;
		r.loc = parseInt( m[1] );
		r.typeId = Building.getTypeId( e.textContent );
		// No MOs yet (type 17)
		if ( r.typeId === undefined || r.typeId === 17 )
			return null;

		// Get position from col 1
		e = xpr.snapshotItem( 1 );
		m = /(.*): \d+,\d/.exec( e.textContent );
		if ( !m )
			return null;
		r.sectorId = Sector.getId( m[1] );
		if ( !r.sectorId )
			return null;

		// Get level from col 4
		e = xpr.snapshotItem( 4 );
		r.level = parseInt( e.textContent );
		if ( isNaN( r.level ) )
			r.level = undefined;

		// Get res_upkeep from col 6
		r.upkeep = parseCommodities( xpr.snapshotItem(6) );
		// Get res_production from col 7
		r.production = parseCommodities( xpr.snapshotItem(7) );
		// Amount from col 8
		r.amount = parseCommodities( xpr.snapshotItem(8) );
		// Merge amount with data from col 9
		xamount = parseCommodities( xpr.snapshotItem(9) );
		for ( key in xamount ) {
			// If you have e.g. energy in a building, but not as
			// upkeep but rather as commodities (e.g. you're in the
			// middle of a building upgrade, using energy for
			// construction), then that's not available for
			// production.  So don't add anything mentioned in
			// upkeep.
			//
			// Otherwise, any commodities stored that are not in
			// res_upkeep, are junk stored by the building owner,
			// not relevant to trade, so don't add either.
			if ( r.upkeep[key] === undefined &&
			     r.production[key] !== undefined )
				r.amount[ key ] = xamount[ key ];
		}

		// Get ticks left from col 10
		e = xpr.snapshotItem( 10 );
		r.ticksLeft = parseInt( e.textContent );
		if ( isNaN(r.ticksLeft) )
			r.ticksLeft = undefined;
	}

	return r;
}

function parseCommodities( td ) {
	var xpr, img, m, r, comm_id;

	r = [];

	// Get all the IMG inside a table directly inside this TD
	xpr = document.evaluate(
		'./table/tbody/tr/td/img', td, null,
		XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null );
	while ( (img = xpr.iterateNext()) !== null ) {
		m = /([^/]+)\.png$/.exec( img.src );
		if ( !m )
			continue;
		comm_id = Commodities.getId( m[1] );
		if ( comm_id === undefined )
			continue;
		m = /: (\d+)/.exec( img.parentElement.textContent );
		if ( !m )
			continue;
		r[ comm_id ] = parseInt( m[1] );
	}

	return r;
}


// This used to fetch the building list from storage.  However, that's the first
// thing that the script does, so we avoid the second query by calling this from
// `showOverview()`, waay above.
//
// Also, this may change the list, so we want the rest of the overview stuff to
// wait until we're done.  So we take a callback.  We call back before we return
// (or arrange for chrome to call it back, if we need to store stuff).  The
// callback receives the (possibly updated) buildingList, so stuff above may
// resume.

// This may change buildingList, so we want the rest of the overview stuff to
// wait until we're done.  So we take a callback.  We call back before we return
// (or arrange for chrome to call it back, if we need to store stuff).

function addOwnBuildings( callback ) {
	var ownBuildingTable, ownNumberOfBuildings, i, end, building, m;

	if ( ownEntries.length === 0 ) {
		// Bloke had only TOs or something?  Nothing to do.
		callback();
		return;
	}

	// Get from storage the buildings we're about to add

	var ownBuildingList = [];
	for ( i = 0, end = ownEntries.length; i < end ; i++ ) {
		ownBuildingList.push ( universe.key + ownEntries[i].loc );
	}

	chrome.storage.sync.get(
		ownBuildingList, finishAddBuildings.bind(null, callback) );
}

function finishAddBuildings( callback, buildingData ) {
	var i, end, key, now, updatedBuildingList, own,
	    storedBuildings, stored, toStore, storeData,
	    min, max, b;

	now = Building.now();

	// We track if we actually made changes to the building list.  Because
	// if we didn't, we don't actually need to store it again.
	updatedBuildingList = false;

	storedBuildings = {};

	// Add the new IDs to the building list.
	for ( key in buildingData ) {
		stored = Building.createFromStorage( key, buildingData[key] );
		storedBuildings[ stored.loc ] = stored;
	}

	// console.log( 'storedBuildings', storedBuildings );

	toStore = [];
	for ( i = 0, end = ownEntries.length; i < end; i++ ) {
		// Note own isn't a Building proper, just a generic
		// Object created by parseOwnBuildings.
		own = ownEntries[i];

		if ( buildingList.indexOf(own.loc) === -1 ) {
			buildingList.push( own.loc );
			updatedBuildingList = true;
		}

		stored = storedBuildings[ own.loc ];
		if ( stored ) {
			// If the building was already stored, then keep
			// it but update the data we have here.
			stored.time = now;
			stored.typeId = own.typeId;
			stored.level = own.level;
			stored.ticksLeft = own.ticksLeft;

			// Update forSale and toBuy if appropriate
			updateForSale( stored, own.amount );
			updateToBuy( stored, own.amount );
			toStore.push( stored );
		}
		else {
			// Create a new building.  In this case, the only data
			// we can add is what we already have.
			b = new Building(
				own.loc,
				own.sectorId,
				own.typeId,
				now,
				'You',
				own.level,
				own.ticksLeft
			);
			toStore.push( b );
		}
	}

	// Compute the data to store.
	storeData = {};

	if ( updatedBuildingList ) {
		storeData[ universe.key ] = buildingList;
	}

	for ( i = 0, end = toStore.length; i < end; i++ ) {
		b = toStore[ i ];
		storeData[ universe.key + b.loc ] = b.toStorage();
	}

	//console.log( 'storeData', storeData );

	// Finally, store everything we need to store.  If you need to comment
	// out this line, for debugging, insert a call to callback() in its
	// place.  This is needed so that the rest of the overview code gets a
	// chance to run.

	chrome.storage.sync.set( storeData, callback );
	// callback();
}

// XXX these two may need to be in building.js
// `amount` is a sparse array of commodity amounts.
function updateForSale( building, amount ) {
	if ( building.minimum.length === 0 )
		return;

	building.forSale.length = 0;
	building.minimum.forEach( update );

	function update( min, id ) {
		var amt, n;
		amt = amount[ id ];
		if ( amt !== undefined ) {
			n = amt - min;
			building.forSale[ id ] = n > 0 ? n : 0;
		}
	}
}

function updateToBuy( building, amount ) {
	if ( building.maximum.length === 0 )
		return;

	building.toBuy.length = 0;
	building.maximum.forEach( update );

	function update( max, id ) {
		var amt, n;
		amt = amount[ id ];
		if ( amt !== undefined ) {
			n = max - amt;
			building.toBuy[ id ] = n > 0 ? n : 0;
		}
	}
}
