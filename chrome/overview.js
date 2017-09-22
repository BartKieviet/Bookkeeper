// This is a content script.  It runs on overview_buildings.php.

var Universe; // from universe.js
var Building; // from building.js
var Commodities; // from commodity.js
var CalendarNames; // from functions.js
var Sector; // from sector.js

var BUILDING_SORT_FUNCTIONS = {
	loc: function( a, b ) {
		// XXX - is this enough? Should we sort by (sector, y, x) instead?
		return a.loc - b.loc;
	},
	type: function( a, b ) {
		return a.stype.localeCompare( b.stype );
	},
	owner: function( a, b ) {
		return a.owner.localeCompare( b.owner );
	},
	level: function( a, b ) {
		return a.level - b.level;
	},
	time: function( a, b ) {
		return a.time - b.time;
	},
	ticks: function( a, b ) {
		return a.ticks - b.ticks;
	},
	tleft: function( a, b ) {
		return a.ticks_left - b.ticks_left;
	}
};

var credits_img = "<img src='//static.pardus.at/img/stdhq/credits_16x16.png' alt='Credits' width='16' height='16' style='vertical-align: middle;'>",
    universe = Universe.fromDocument( document ),
    sortCritKey = universe.name + 'OverviewSortCrit',
    sortAscKey = universe.name + 'OverviewSortAsc',
    grayIconSrc = chrome.extension.getURL( 'icons/mingray.svg' ),
    iconSrc = chrome.extension.getURL( 'icons/minus.svg' );

var buildingList; // fetched from storage eventually
var ownEntries = parseOwnBuildings();

console.log( 'ownEntries', ownEntries );

// Start the ball.
chrome.storage.sync.get( universe.key, showOverview );

// End of content script execution

function showOverview( syncData ) {
	buildingList = syncData[ universe.key ];
	if ( !buildingList ) {
		// No buildings yet?
		buildingList = [];
	}

	addOwnBuildings( showOverviewStep2 );
	//showOverviewStep2();
}

function showOverviewStep2() {
	chrome.storage.local.get(
		[sortCritKey, sortAscKey], showOverviewStep3 );
}

function showOverviewStep3( data ) {
	var keys, callback, i, end;

	keys = [];
	callback = showOverviewBuildings.bind(
		null,
		data[sortCritKey],
		data[sortAscKey]
	);

	// Build an array of storage keys that we'll need to display the overview.
	for ( i = 0, end = buildingList.length; i < end; i++ )
		keys.push( universe.key + buildingList[i] );

	// Query the buildings
	chrome.storage.sync.get( keys, callback );
}

// Produce an array of buildings from data coming from chrome.storage.
//
// `data` is an object with attributes of the form "universeBuildingNNN", where
// universe is 'artemis', 'orion', 'pegasus'; and NNN is the id of the tile on
// which the building is located.  The content of each of these attributes is a
// single JSON string encoding a building object.
//
// This function deserialises each building object, and normalises it for our
// requirements here.  The whole collection of loaded buildings is returned in
// an array.  The order of the array should not be relied upon.

function loadBuildings( data ) {
	var key, b, stype,
	    buildings = [];

	for ( key in data ) {
		b = Building.createFromStorage( key, data[key] );
		buildings.push( b );
	}

	return buildings;
}

function showOverviewBuildings( sort, ascending, data ) {

	var buildings, b, ckey, commodity, container, end, h1, i, img, inUse,
	    key, table, tbody, thead, tr;

	if ( !sort )
		sort = 'time';
	if ( typeof ascending != 'boolean' )
		ascending = true;
	delete data[ sortCritKey ];
	delete data[ sortAscKey ];

	// Parse each building.
	buildings = loadBuildings( data );
	data = null; // don't need this anymore, may be garbage collected
	inUse = getCommoditiesInUse( buildings );

	// Build the table and headers
	container = document.createElement( 'div' );
	container.id = 'bookkeeper-overview';

	table = document.createElement( 'table' );
	thead = document.createElement( 'thead' );

	tr = document.createElement( 'tr' );
	addTH( tr, 'Location', 'sort', 'bookkeeper-hdr-loc' );
	addTH( tr, 'Type', 'sort', 'bookkeeper-hdr-type' );
	addTH( tr, 'Owner', 'sort', 'bookkeeper-hdr-owner' );
	addTH( tr, 'Lvl', 'sort', 'bookkeeper-hdr-level' );

	for ( i = 0, end = inUse.length; i < end; i++ ) {
		ckey = inUse[i];
		commodity = Commodities.getCommodity( ckey );
		img = document.createElement( 'img' );
		img.src = '//static.pardus.at/img/stdhq/res/'
			+ commodity.i + '.png';
		img.title = commodity.n;
		addTH( tr, img, 'c' );
	}

	addTH( tr, 'Updated', 'sort', 'bookkeeper-hdr-time' );
	addTH( tr, 'Ticks', 'sort', 'bookkeeper-hdr-ticks' );
	addTH( tr, 'Left', 'sort', 'bookkeeper-hdr-tleft' );

	addTH( tr, '' ); // the bin icon column
	thead.appendChild( tr );
	thead.addEventListener( 'click', onHeaderClick, false );
	table.appendChild( thead );

	// Now add the rows
	tbody = document.createElement( 'tbody' );
	fillTBody( tbody, inUse, buildings, sort, ascending );
	table.appendChild( tbody );

	table.style.background = "url(//static.pardus.at/img/stdhq/bgdark.gif)";
	container.appendChild( table );
	var anchor = document.getElementsByTagName('h1')[0];

	h1 = document.createElement( 'h1' );
	h1.className = 'bookkeeper';
	img = document.createElement( 'img' );
	img.src = chrome.extension.getURL( 'icons/24.png' );
	img.title = 'Pardus Bookkeeper';
	h1.appendChild( img );
	h1.appendChild( document.createTextNode('Bookkeeping') );

	anchor.parentNode.insertBefore( h1, anchor );
	anchor.parentNode.insertBefore( container, anchor );

	function onHeaderClick( event ) {
		var target = event.target;
		if ( target.id && target.id.startsWith( 'bookkeeper-hdr-' ) ) {
			event.stopPropagation();
			var newsort = target.id.substr( 15 );
			if ( newsort == sort )
				ascending = !ascending;
			else {
				sort = newsort;
				ascending = true;
			}

			var items = {};
			items[ sortCritKey ] = sort;
			items[ sortAscKey ] = ascending;
			chrome.storage.local.set( items );

			fillTBody( tbody, inUse, buildings, sort, ascending );
		}
	}
}

function fillTBody( tbody, in_use, buildings, sort, ascending ) {
	var key, building, tr, cell, img, ckey, n, s, i , end, j, jend, commodity,
	    sortfn, fn, className, deleteIconUri;

	sortfn = BUILDING_SORT_FUNCTIONS[ sort ];
	if ( sortfn ) {
		if ( ascending )
			fn = sortfn;
		else
			fn = function( a, b ) { return -sortfn( a, b ); };
		buildings.sort( fn );
	}

	while ( tbody.hasChildNodes() )
		tbody.removeChild( tbody.firstChild );

	deleteIconUri = chrome.extension.getURL('icons/minusbw.svg');

	for ( i = 0, end = buildings.length; i < end; i++ ) {
		building = buildings[ i ];
		tr = document.createElement( 'tr' );

		addTD( tr, humanCoords( building ) );
		cell = addTD( tr, building.getTypeShortName() );
		cell.title = building.getTypeName();
		addTD( tr, building.owner || 'need update' );
		addTD( tr, isNaN(building.level) ? '?' : String(building.level), 'right' );

		for ( j = 0, jend = in_use.length; j < jend; j++ ) {
			ckey = in_use[j];
			commodity = Commodities.getCommodity( ckey );

			if ( building.toBuy[ckey] !== undefined ) {
				n = -building.toBuy[ckey];
				s = String( n );
			}
			else if ( building.forSale[ckey] !== undefined ) {
				n = building.forSale[ckey];
			}
			else
				// Should never happen
				s = n = null;

			cell = addTD( tr, s );
			if ( s !== null ) {
				cell.title = commodity.n;
				cell.className = 'c';
				if ( n > 0 )
					cell.classList.add( 'lime' );
				else if ( n < 0 )
					cell.classList.add( 'pink' );
			}
		}

		cell = makeTimeTD( building.time * 1000 );
		tr.appendChild( cell );

		addTD( tr, building.ticksLeft === undefined ? '?' : String(building.ticksLeft), 'r' );

		if ( building.ticksLeft !== undefined ) {
			className = null;
			var ticksNow = building.ticksLeft - ticksPassed( building.time );
			if ( ticksNow < 0 )
				ticksNow = 0;
			if ( ticksNow < 1 )
				className = 'red';
			else if ( ticksNow < 2 )
				className = 'yellow';
			cell = addTD( tr, String(ticksNow), 'r' );
			if ( className )
				cell.classList.add( className );
		}
		else
			addTD( tr, '?', 'r' );

		// This is showing the same as above?

		addTD( tr, makeRemoveButton(building.loc) );

		tbody.appendChild( tr );
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

function makeTimeTD( timestamp ) {
	var t = new Date( timestamp ),
	    now = Date.now(),
	    s, td;

	// If the date is old, we just display the day and month.
	// 432000000 is the number of milliseconds in five days.
	if ( now - timestamp > 432000000 ) {
		s = CalendarNames.MONTHS[ t.getMonth() ] + ' ' + t.getDate();
	}
	else {
		now = new Date( now );
		if ( now.getDate() == t.getDate() )
			// This is today.  Just the time will do.
			// We'll add seconds because why not.
			s = twoDigits( t.getHours() )
			  + ':' + twoDigits( t.getMinutes() )
			  + ':' + twoDigits( t.getSeconds() );
		else
			// Show weekday and time.
			s = CalendarNames.WEEKDAYS[ t.getDay() ] + ' '
			  + twoDigits( t.getHours() )
			  + ':' + twoDigits( t.getMinutes() );
	}

	td = document.createElement( 'td' );
	td.appendChild( document.createTextNode(s) );
	td.className = 'r';
	td.title = t.toLocaleString();

	return td;

	function twoDigits( n ) {
		n = String(n);
		return n.length < 2 ? '0' + n : n;
	}
}

// Return an array of commodities actually in use by the collection of buildings
// given.
function getCommoditiesInUse( buildings ) {
	var inUse, i, end, commodity;

	inUse = {};

	buildings.forEach(
		function( building ) {
			building.getCommoditiesInUse().forEach( markInUse );
		}
	);


	return Object.keys( inUse ).map( toInt ).sort( compareAsInt );

	function markInUse( id ) { inUse[ id ] = true; }
	function toInt( id ) { return parseInt(id); }
	function compareAsInt( a, b ) {
		return parseInt(a) - parseInt(b);
	}
}

function humanCoords( building ) {
	var coords = Sector.getCoords( building.sectorId, building.loc );
	return Sector.getName(building.sectorId) + ' [' + coords.x + ',' + coords.y + ']';
}

// Shorthands we use above.
function addTH( tr, content, className, id ) {
	return addChild( tr, 'th', content, className, id );
}
function addTD( tr, content, className, id ) {
	return addChild( tr, 'td', content, className, id );
}
function addChild( parent, tagname, content, className, id ) {
	var elt = document.createElement( tagname );
	if ( className )
		elt.className = className;
	if ( id )
		elt.id = id;
	if ( typeof content == 'string' )
		content = document.createTextNode( String(content) );
	if ( content )
		elt.appendChild( content );
	parent.appendChild( elt );
	return elt;
}

function ticksPassed( timeSecs ) {
	var timeToTick = 6 * 3600 - (timeSecs - 5100) % (6 * 3600);
	var timePassed = Math.floor(Date.now()/1000) - timeSecs;

	var ticksPassed = 0;
	if ( timePassed > timeToTick ) {
		ticksPassed += 1;
	}
	ticksPassed += Math.floor( timePassed / (6 * 3600) );
	return ticksPassed;
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
		if ( entry === null )
			return null;
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

	now = Math.floor( Date.now() / 1000 );

	// We track if we actually made changes to the building list.  Because
	// if we didn't, we don't actually need to store it again.
	updatedBuildingList = false;

	storedBuildings = {};

	// Add the new IDs to the building list.
	for ( key in buildingData ) {
		stored = Building.createFromStorage( key, buildingData[key] );
		storedBuildings[ stored.loc ] = stored;
	}

	console.log( 'storedBuildings', storedBuildings );

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
			console.log( 'creating', own );

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

	console.log( 'storeData', storeData );

	// Finally, store everything we need to store.  If you need to comment
	// out this line, for debugging, insert a call to callback() in its
	// place.  This is needed so that the rest of the overview code gets a
	// chance to run.

	chrome.storage.sync.set( storeData, callback );
	// callback();
}

// XXX these two may need to be in building.js
//
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
