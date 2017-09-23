// This is a content script, runs index_buildings.php

var Universe,    // from universe.js
    Sector,      // from sector.js
    Building,    // from building.js
    Commodities; // from commodity.js

var CalendarNames, ToggleMaker; // from functions.js

// These are initialised in setup() and the callbacks triggered from there.
var universe, sectorId, now, pageData;

setup();

// Script execution ends here.  Function definitions below.

function setup() {
	var h1, m, buildingsTable, entries,
	    i, end, entry, keys;

	universe = Universe.fromDocument( document );

	// Get the sector from the H1 header

	h1 = document.evaluate(
		'//h1[contains(text(),"Building Index")]',
		document, null, XPathResult.FIRST_ORDERED_NODE_TYPE,
		null).singleNodeValue;
	if ( !h1 )
		return;
	m = /^(.*) Building Index$/.exec( h1.textContent );
	if ( !m )
		return;
	sectorId = Sector.getId( m[1] );
	if ( sectorId === undefined )
		return;

	// Get the timestamp.  This will be in the same TD that contains the H1
	// header, inside a SPAN of class 'cached', inside a DIV.

	now = document.evaluate(
		'//td[h1[contains(text(),"Building Index")]]/div/span[@class="cached"]',
		document, null, XPathResult.FIRST_ORDERED_NODE_TYPE,
		null).singleNodeValue;
	if ( !now )
		return;
	// Pardus' timestamp format *in this page* is
	// "Tue Sep 19 19:41:39 GMT 2017"
	m = /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d?\d) (\d?\d):(\d\d):(\d\d) GMT (\d\d\d\d)/.exec( now.textContent );
	if ( !m )
		return;
	now = Date.UTC(
		m[6], // year
		// month - yes inefficient search, bleh
		CalendarNames.MONTHS.indexOf(m[1]),
		m[2], // day
		m[3], // hour
		m[4], // minute
		m[5]  // second
	);
	if ( isNaN(now) )
		return;
	now = Building.seconds( now );

	// Find the table with the buildings. We look for a table with a TH
	// "Automatic Info"
	buildingsTable = document.evaluate(
		'//table[tbody/tr/th[text() = "Automatic Info"]]', document,
		null, XPathResult.ANY_UNORDERED_NODE_TYPE,
		null).singleNodeValue;
	if ( !buildingsTable )
		return;
	entries = parsePage( buildingsTable );
	if ( entries.length < 1 )
		return;

	// Now add our UI.
	// The first entry is the row with the table headers.
	addBookkeeperHeader( entries.shift() );

	// The rest are rows. This adds the extra TD and a button for trackable
	// buildings (a reference to which is added to the entry).
	addBookkeeperRowCells( entries );

	// Now build the global pageData object.  This is an object keyed by
	// location IDs, containing entries of trackable buildings in the page.
	// While we're at it, construct the array of keys to query storage for.

	pageData = {};
	keys = [];
	for ( i = 0, end = entries.length; i < end; i++ ) {
		entry = entries[ i ];
		if ( entry.trackable ) {
			pageData[ entry.loc ] = entry;
			keys.push( universe.key + entry.loc );
		}
	}

	// Finally, fetch the trackable buildings from storage.  We're not done
	// yet, of course; buildings that are already tracked will need more
	// work.  But we're done in this function.

	chrome.storage.sync.get( keys, onBuildingData );
}

function parsePage( buildingsTable ) {
	var entries, rows, tr, entry,
	    iconxp, ownerxp, sellxp, buyxp, tickxp;

	entries = [];

	// Find all TRs in the buildings table.
	rows = document.evaluate(
		'./tbody/tr', buildingsTable, null,
		XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null);

	// We'll execute these repeatedly; worth to compile
	iconxp = document.createExpression( './td[position()=1]/img/@src', null );
	ownerxp = document.createExpression( './td[position()=3]/a/text()', null );
	sellxp = document.createExpression(
		'./td[position()=4]/table/tbody/tr/td[i[text()="selling:"]]/following-sibling::td',
		null );
	buyxp = document.createExpression(
		'./td[position()=4]/table/tbody/tr/td[i[text()="buying:"]]/following-sibling::td',
		null );
	tickxp = document.createExpression(
		'./td[position()=4]/table/tbody/tr/td[i[text()="supplied for:"]]/following-sibling::td',
		null );

	while ( (tr = rows.iterateNext()) !== null ) {
		// the JS engine is happier if we declare the object's final
		// form upfront.
		entry = parseRow();
		if ( entry === null )
			entry = { tr: tr, trackable: false };
		entries.push( entry );
	}

	return entries;

	function parseRow() {
		var m, s, xpr,
		    loc, typeId, owner, selling, buying, ticksLeft;

		// Get the x,y coords from the onmouseover attribute.  We could
		// get them from the Coord. column, too, but that'd be another
		// XPath lookup.
		m = /markField\('y(\d+)x(\d+)/.exec(
			tr.getAttribute('onmouseover') );
		if ( !m )
			return null;
		loc = Sector.getLocation(
			sectorId, parseInt(m[2]), parseInt(m[1]) );

		// Get the typeId from the icon
		s = iconxp.evaluate(
			tr, XPathResult.STRING_TYPE, null ).stringValue;
		m = /\/([^/]+)\.png$/.exec( s );
		if ( !m )
			return null;
		typeId = Building.getTypeIdByIcon( m[1] );
		if ( typeId === undefined )
			return null;

		// Get the owner
		s = ownerxp.evaluate(
			tr, XPathResult.STRING_TYPE, null ).stringValue.trim();
		if ( s === '' )
			return null;
		owner = s;

		xpr = sellxp.evaluate(
			tr, XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null );
		selling = parseCommodityTDs( xpr );

		xpr = buyxp.evaluate(
			tr, XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null );
		buying = parseCommodityTDs( xpr );

		xpr = tickxp.evaluate(
			tr, XPathResult.ANY_UNORDERED_NODE_TYPE,
			null ).singleNodeValue;
		if ( xpr === null )
			return null;
		m = /(\d+) production round/.exec( xpr.textContent );
		if ( !m )
			return null;
		ticksLeft = parseInt( m[1] );

		// Done, phew.

		return {
			tr: tr,
			trackable: true,
			tracked: false,
			loc: loc,
			typeId: typeId,
			owner: owner,
			ticksLeft: ticksLeft,
			buying: buying,
			selling: selling,
			ui: undefined,
			building: undefined
		};
	}

	function parseCommodityTDs( xpr ) {
		var r, td, img, m, id;

		r = [];
		while ( (td = xpr.iterateNext()) !== null ) {

			// Get the commodity id from its icon.
			img = td.firstElementChild;
			if ( !img || img.tagName != 'IMG' )
				continue;
			m = /\/([^/]+)\.png$/.exec( img.src );
			if ( !m )
				continue;
			id = Commodities.getId( m[1] );
			if ( id === undefined )
				continue;

			// Get the amount.
			// Could get the price here too, but we don't care now.
			m = /× (\d+)/.exec( td.textContent );
			if ( !m )
				continue;

			r[ id ] = parseInt( m[1] );
		}

		return r;
	}
}

function addBookkeeperHeader( entry ) {
	var td = document.createElement( 'th' );
	td.textContent = 'BK';
	entry.tr.appendChild( td );
}

function addBookkeeperRowCells( entries ) {
	var i, end, entry, td, toggle, input, src;

	for ( i = 0, end = entries.length; i < end; i++ ) {
		entry = entries[ i ];
		td = document.createElement( 'td' );

		if ( entry.trackable ) {
			toggle = ToggleMaker.make();
			input = toggle.firstElementChild;
			input.dataset.bookkeeperLoc = entry.loc;
			td.appendChild( toggle );

			// Wanted this to be 'input' not 'click' but that
			// doesn't seem to work in chrome...
			input.addEventListener( 'click', onToggle, false );

			entry.ui = input;
		}

		entry.tr.appendChild( td );
	}
}

function onBuildingData( data ) {
	var key, building, entry, updates, updateCount;

	updates = {};
	updateCount = 0;

	for ( key in data ) {
		building = Building.createFromStorage( key, data[key] );
		entry = pageData[ building.loc ];
		entry.tracked = true;
		entry.building = building;
		entry.ui.checked = true;
		if ( building.time < now ) {
			updates[ key ] = entry;
			updateCount++;
		}
	}

	updates = computeUpdates( updates );

	if ( updateCount > 0 )
		chrome.storage.sync.set( updates, notifyUpdated );

	function notifyUpdated() {
		var op, text;

		if ( updateCount === 1 )
			text = 'Updated 1 building';
		else
			text = 'Updated ' + updateCount + ' buildings';
		text += ' in ' + Sector.getName( sectorId );

		op = {
			op: 'showNotification',
			text: text
		}

		chrome.runtime.sendMessage( op );
	}
}

function computeUpdates( updates ) {
	var r, key, entry;

	r = {}
	for ( key in updates ) {
		entry = updates[key];
		updateBuildingFromEntry( entry );
		r[ key ] = entry.building.toStorage();
	}

	return r;
}

function updateBuildingFromEntry( entry ) {
	var building = entry.building;
	building.typeId = entry.typeId;
	building.time = now;
	building.owner = entry.owner;
	building.ticksLeft = entry.ticksLeft;
	building.forSale = entry.selling;
	building.toBuy = entry.buying;
}

// When the user asks us to track a building from this page, we kinda have a
// problem, because we don't have all the information we have from the trade
// screen.  Specifically, we don't have the building level, maxes and mins,
// production and upkeep, and full prices.  But we'll do a best effort.

function inferBuildingFromEntry( entry ) {
	entry.building = new Building( entry.loc, sectorId );
	updateBuildingFromEntry( entry );
}

function onToggle( event ) {
	var target, loc, entry;

	target = event.target;
	loc = target.dataset.bookkeeperLoc;
	if ( !loc )
		return;

	entry = pageData[ loc ];
	if ( entry.tracked === target.checked )
		return;

	if ( entry.tracked )
		untrackBuilding( entry );
	else
		trackBuilding( entry );
}

function trackBuilding( entry ) {
	if ( !entry.building )
		inferBuildingFromEntry( entry );

	chrome.storage.sync.get( universe.key, onBuildingList );

	function onBuildingList( data ) {
		var list, index;
		list = data[ universe.key ];
		index = list.indexOf( entry.loc );
		if ( index === -1 )
			list.push( entry.loc );
		data[ universe.key + entry.loc ] = entry.building.toStorage();
		chrome.storage.sync.set( data, onAdded );
	}

	function onAdded() {
		entry.tracked = true;
		entry.ui.checked = true;
	}
}

function untrackBuilding( entry ) {
	entry.building.removeStorage( universe.key, onRemoved );

	function onRemoved() {
		// Note we DON'T remove entry.building, even though it isn't
		// stored any more.  This is because, if the user clicks the
		// button again, we already have the building, likely with
		// better data than inferBuildingFromEntry() can come up with,
		// so in that case we'll just re-add it.
		entry.tracked = false;
		entry.ui.checked = false;
	}
}
