// This is a content script.  It runs on overview_buildings.php.

// From other files
var Universe, Building, Commodities, Sector, Overview;

// Global used here XXX K you were right, Universe shouldn't be an object.
var universe = Universe.fromDocument( document );

// Start the ball.
setup();

// End of content script execution

function setup() {
	var ownEntries, overview;

	// Fetch the universe list, we need it for both the Overview component
	// and to update the user's own buildings.
	chrome.storage.sync.get( universe.key, onHaveUniverseListData );

	function onHaveUniverseListData( data ) {
		var universeList = data[ universe.key ] || [];
		ownEntries = parseOwnBuildings();
		addOwnBuildings(
			universeList, ownEntries, onOwnBuildingsAdded );
	}

	function onOwnBuildingsAdded( universeList ) {
		overview = new Overview( universe.key, document );
		overview.configure( universeList );
		overviewsb = new Overview( universe.key, document, { psbFlag : true } );
		overviewsb.configure( universeList, onReady );
	}

	function onReady() {
		var anchor, h1, img;

		anchor = document.evaluate(
			'//h1', document, null,
			XPathResult.FIRST_ORDERED_NODE_TYPE,
			null).singleNodeValue;

		h1 = document.createElement( 'h1' );
		h1.className = 'bookkeeper';
		img = document.createElement( 'img' );
		img.src = chrome.extension.getURL( 'icons/24.png' );
		img.title = 'Pardus Bookkeeper';
		h1.appendChild( img );
		h1.appendChild( document.createTextNode('Bookkeeping') );

		anchor.parentNode.insertBefore( h1, anchor );
		anchor.parentNode.insertBefore( overview.container, anchor );

		if ( overviewsb.sorTable.items.length > 0) {
			h1 = document.createElement( 'h1' );
			h1.className = 'bookkeeper';
			img = document.createElement( 'img' );
			img.src = chrome.extension.getURL( 'icons/24.png' );
			img.title = 'Pardus Bookkeeper';
			h1.appendChild( img );
			h1.appendChild( document.createTextNode('Planets and starbases') );
			anchor.parentNode.insertBefore( h1, anchor );
			anchor.parentNode.insertBefore( overviewsb.container, anchor );
		}
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
		'./td', tr, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
		null );

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

// Add the user's own buildings to storage.  This may change the universeList,
// so we want the rest of the overview stuff to wait until we're done.  So we
// take a callback.  We call before we return (or arrange for chrome to call, if
// we need to store stuff).  The callback receives the (possibly updated) list,
// so stuff above may resume.

// XXX - just thought of this... what happens if you destroy one of your
// buildings?

function addOwnBuildings( universeList, ownEntries, callback ) {
	var ownBuildingIds, updateUniverseList, storedBuildings, now;

	if ( ownEntries.length === 0 ) {
		// Bloke had only TOs or something?  Nothing to do.
		callback( universeList );
		return;
	}

	now = Building.now();
	ownBuildingIds = ownEntries.map(
		function( entry ) { return universe.key + entry.loc; } );
	chrome.storage.sync.get( ownBuildingIds, onHaveOwnBuildings );

	function onHaveOwnBuildings( buildingData ) {
		var key, building, toStore, storeData;

		storedBuildings = {};
		for ( key in buildingData ) {
			building = Building.createFromStorage(
				key, buildingData[key] );
			storedBuildings[ building.loc ] = building;
		}

		// Note makeOwnBuilding updates universeList as a side effect
		toStore = ownEntries.map( makeOwnBuilding );

		storeData = {};
		if ( updateUniverseList )
			storeData[ universe.key ] = universeList;
		toStore.forEach( function( b ) {
			storeData[ b.storageKey(universe.key) ] = b.toStorage();
		});

		chrome.storage.sync.set(
			storeData, callback.bind( null, universeList ) );
	}

	function makeOwnBuilding( entry ) {
		var building;

		// While we're scanning, update uBIds if needed.

		if ( universeList.indexOf(entry.loc) === -1 ) {
			universeList.push( entry.loc );
			updateUniverseList = true;
		}

		building = storedBuildings[ entry.loc ];

		// If the building was already stored, then keep it but update
		// the data we have here.  Otherwise create a new one.

		if ( building ) {
			building.setTime( now );
			building.setType( entry.typeId );
			building.setLevel( entry.level );
			building.setTicksLeft( entry.ticksLeft );
			updateSelling( building, entry.amount );
			updateBuying( building, entry.amount );
		}
		else {
			building = new Building(
				entry.loc, entry.sectorId, entry.typeId, now,
				'You', entry.level, entry.ticksLeft );
		}

		return building;
	}
}

// XXX these two may need to be in building.js
// `amount` is a sparse array of commodity amounts.
function updateSelling( building, amount ) {
	if ( building.minimum.length === 0 )
		return;

	building.selling.length = 0;
	building.minimum.forEach( update );

	function update( min, id ) {
		var amt, n;
		amt = amount[ id ];
		if ( amt !== undefined ) {
			n = amt - min;
			building.selling[ id ] = n > 0 ? n : 0;
		}
	}
}

function updateBuying( building, amount ) {
	if ( building.maximum.length === 0 )
		return;

	building.buying.length = 0;
	building.maximum.forEach( update );

	function update( max, id ) {
		var amt, n;
		amt = amount[ id ];
		if ( amt !== undefined ) {
			n = max - amt;
			building.buying[ id ] = n > 0 ? n : 0;
		}
	}
}
