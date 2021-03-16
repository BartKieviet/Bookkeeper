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

	// Add population estimate to planet section, if available.
	if ( document.getElementsByClassName( 'pad2' )[ 0 ].firstElementChild.src.indexOf( 'planet' ) !== -1 ) {
		// let's get the data we need from the page.
		let pTypeId = Building.getTypeIdByIcon( document.getElementsByClassName( 'pad2' )[ 0 ].firstElementChild.src.split( /\/([^/]+)\.png$/ )[ 1 ] );
		let pBuy = document.getElementsByClassName( 'pad2' )[ 1 ].getElementsByTagName( 'table' )[ 1 ];
		let pImg = pBuy.getElementsByTagName( 'img' );
		let pToSell = parseInt( pImg[0].nextSibling.textContent.split( / × /g)[ 1 ] );
		let pPrice = parseInt( pImg[1].nextSibling.textContent );
		let pUpkeep = Building.getBaseUpkeep( pTypeId );
		let pComm = Commodities.getId( pImg[ 0 ].src.split( /\/([^/]+)\.png$/ )[ 1 ] );
		let pBase = { 
			1: 200,
			2: 120,
			3: 160 
		} // All thrives on these three
		
		let pop = ( pToSell / ( Math.log10( pPrice / pBase[ pComm ] ) + 1 ) - 20 ) / ( 20 * pUpkeep [ pComm ] ) ;
		// The derivation of the above formula is left as an exercise for the reader ( https://abstrusegoose.com/12 )
		
		// Right, we got the population estimate. Time to display it.
		let tab = document.createElement( 'table' );
		let tr = document.createElement( 'tr' );
		let td = document.createElement( 'td' );
		let i = document.createElement( 'i' );
		i.textContent = 'Population estimate: ';
		td.appendChild( i );
		tr.appendChild( td );
		td = document.createElement( 'td' );
		td.textContent = Math.round( pop * 1000 );
		tr.appendChild( td );

		tab.appendChild( tr );
		pBuy.parentNode.appendChild( tab );
	}

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
	// "Automatic Info".

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

	iconxp = document.createExpression(
		'./td[position()=1]/img/@src', null );
	ownerxp = document.createExpression(
		'./td[position()=3]/a/text()', null );
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

		// Get the selling and buying lists

		xpr = sellxp.evaluate(
			tr, XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null );
		selling = parseCommodityTDs( xpr );
		xpr = buyxp.evaluate(
			tr, XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null );
		buying = parseCommodityTDs( xpr );

		// Get the ticks left

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
	var btn = document.createElement( 'button' );
	td.textContent = 'BK';
	btn.textContent = 'all';
	entry.tr.appendChild( td );
	btn.addEventListener( 'click', function() {chrome.storage.sync.get( universe.key, trackAllBuildings ); });
	td.appendChild( btn );
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
	building.setType( entry.typeId );
	building.setTime( now );
	building.setOwner( entry.owner );
	if (!building.typeId == 17) // Grid setting is not taken into account in the b-index.
		building.setTicksLeft( entry.ticksLeft );
	building.setSelling( entry.selling );
	building.setBuying( entry.buying );
}

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

	// If the building wasn't being tracked, then there will be no
	// entry.building.  We create a new one then.  Otherwise, reuse the
	// building instance we already have.  This keeps the level and owner of
	// buildings that were already tracked, just were untracked and tracked
	// again without reloading the page.

	if ( !entry.building ) {
		entry.building = new Building( entry.loc, sectorId );
		updateBuildingFromEntry( entry );
	}

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

function trackAllBuildings( data ) {
	var list = list = data[ universe.key ];
	
	for (key in pageData ) {
		if (!pageData[ key ].tracked) {
			entry = pageData[ key ];
			
			if ( !entry.building ) {
				entry.building = new Building( entry.loc, sectorId );
				updateBuildingFromEntry( entry );
			}
			let index;
			index = list.indexOf( entry.loc );
			if ( index === -1 )
			list.push( entry.loc );
			data[ universe.key + entry.loc ] = entry.building.toStorage();
			entry.tracked = true;
			entry.ui.checked = true;
		}
	}
	data[ universe.key ] = list;
	chrome.storage.sync.set( data );
}

function untrackBuilding( entry ) {
	entry.building.removeStorage( universe.key, onRemoved );

	function onRemoved() {

		// Note we DON'T remove entry.building, even though it isn't
		// stored any more.  This is because, if the user clicks the
		// button again, we already have the building and in that case
		// we'll just re-add it.

		entry.tracked = false;
		entry.ui.checked = false;
	}
}
