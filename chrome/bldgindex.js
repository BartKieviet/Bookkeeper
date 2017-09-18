// This is a content script, runs index_buildings.php

var Universe,    // from universe.js
    Sector,      // from sector.js
    Building,    // from building.js
    Commodities; // from commodity.js

(function() {

// Regular expressions, XPath expressions and other stuff we use repeatedly.
var IMGRX = /([^/]*)\.png$/,
    COORDSRX = /\[(\d+),(\d+)\]/,
    OWNERRX = /^sendmsg\('(.*)'\)$/,
    AMTRX = /^\s*×\s*(\d+)/,
    CREDICONRX = /.*\/credits\.png$/,
    TDS_XPATH = document.createExpression( './td', null ),
    INFOROW_XPATH = document.createExpression(
	    './table/tbody/tr[td[position()=1]/i]', null ),
    INFOROW_PARSERS = {
	'selling:': parseSellTDs,
	'buying:': parseBuyTDs
    };

// These are initialised in setup() and the callbacks triggered from there.
var universe, sectorId, sector, now, pageData;

setup();

// Script execution ends here.  Function definitions below.

function setup() {
	var sectorrx = /^(.*) Building Index$/,
	    h1, m, buildingsTable, entries, i, end, entry, keys;

	universe = Universe.fromDocument( document );

	// Get the sector from the H1 header

	h1 = document.evaluate(
		'//h1[contains(text(),"Building Index")]',
		document, null, XPathResult.FIRST_ORDERED_NODE_TYPE,
		null).singleNodeValue;
	if( !h1 )
		return;
	m = sectorrx.exec( h1.textContent );
	if( !m )
		return;
	sectorId = Sector.getId( m[1] );
	if( !sectorId )
		return;
	sector = Sector.createFromId( sectorId );

	// Get the timestamp.  This will be in the same TD that contains the H1
	// header, inside a SPAN of class 'cached', inside a DIV.
	now = document.evaluate(
		'//td[h1[contains(text(),"Building Index")]]/div/span[@class="cached"]',
		document, null, XPathResult.FIRST_ORDERED_NODE_TYPE,
		null).singleNodeValue;
	if( !now )
		return;
	now = Date.parse( now.textContent );
	if( isNaN(now) )
		return;
	now = Math.floor( now / 1000 );

	// Find the table with the buildings. We look for a table with a TH
	// "Automatic Info"
	buildingsTable = document.evaluate(
		'//table[tbody/tr/th[text() = "Automatic Info"]]', document,
		null, XPathResult.ANY_UNORDERED_NODE_TYPE,
		null).singleNodeValue;
	if( !buildingsTable )
		return;

	// Phew. We're all set now. Go.
	entries = parsePage( buildingsTable );

	if( entries.length < 2 )
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
	for( i = 0, end = entries.length; i < end; i++ ) {
		entry = entries[ i ];
		if( entry.trackable ) {
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
	var entries, xpr, trh, tr, idx, building, entry;

	entries = [];

	// Find the TR with the headers
	tr = document.evaluate(
		'./tbody/tr[th]', buildingsTable, null,
		XPathResult.FIRST_ORDERED_NODE_TYPE,
		null).singleNodeValue;
	if( !tr )
		return entries;

	// Iterate over all TRs, fetching
	xpr = document.evaluate(
		'./tbody/tr', buildingsTable, null,
		XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null);

	while( (tr = xpr.iterateNext()) !== null ) {
		entry = trToEntry( tr );
		if( entry )
			entries.push( entry );
	}

	return entries;
}

function trToEntry( tr, building ) {
	var entry, xpr, imgtd, coordtd, ownertd, infotd, x, y;

	// This may not get all its attributes, but the JS engine is happier if
	// we declare the object's final form upfront.
	entry = {
		tr: tr,
		trackable: false,
		tracked: false,
		x: -1,
		y: -1,
		loc: -1,
		type_id: -1,
		owner: '',
		buying: undefined,
		selling: undefined,
		ui: undefined,
		building: undefined
	}

	xpr = TDS_XPATH.evaluate( tr, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null );
	if( parseIconTd(entry, xpr.iterateNext()) &&
	    parseCoordTd(entry, xpr.iterateNext()) &&
	    parseOwnerTd(entry, xpr.iterateNext()) &&
	    parseInfoTd(entry, xpr.iterateNext()) ) {
		entry.trackable = true;
		return entry;
	}

	return entry;
}

function parseIconTd( entry, td ) {
	var img, m, id;
	if( !td )
		return false;

	img = td.firstElementChild;
	if( !img || img.tagName !== 'IMG' )
		return false;

	m = IMGRX.exec( img.src );
	if( !m )
		return false;
	id = Building.getTypeIdByIcon( m[1] );
	if( !id )
		return false;
	entry.type_id = id;

	return true;
}

function parseCoordTd( entry, td ) {
	var m, x, y;
	if( !td )
		return false;

	m = COORDSRX.exec( td.textContent );
	if( !m )
		return false;

	entry.x = parseInt(m[1]);
	entry.y = parseInt(m[2]);
	entry.loc = sector.getLocation( entry.x, entry.y );

	return true;
}

function parseOwnerTd( entry, td ) {
	var a, m;
	if( !td )
		return false;

	a = td.firstElementChild;
	if( !a || a.tagName !== 'A' ||
	    !a.href.startsWith("javascript:sendmsg(") )
		return false;

	entry.owner = a.textContent.trim();
	return true;
}

function parseInfoTd( entry, td ) {
	var xpr, tr, row, rowtd, parse;

	if( !td )
		return false;

	// The "automatic info" table contains up to 4 tables, each of a single
	// row.  We identify the rows by the label in the first cell: selling,
	// buying, free capacity, and supplied for.

	xpr = INFOROW_XPATH.evaluate( td, XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null );
	while( (tr = xpr.iterateNext()) != null ) {
		rowtd = tr.firstElementChild;
		parse = INFOROW_PARSERS[ rowtd.textContent ];
		if( parse ) {
			if( !parse(entry, rowtd.nextElementSibling) )
				return false;
		}
		// else ignore row
	}

	return true;
}

function parseSellTDs( entry, firstTD ) {
	var row = parseCommoditiesRow( firstTD );
	if( !row )
		return false;
	entry.selling = row;
	return true;
}

function parseBuyTDs( entry, firstTD ) {
	var row = parseCommoditiesRow( firstTD );
	if( !row )
		return false;
	entry.buying = row;
	return true;
}

function parseCommoditiesRow( td ) {
	var r = { amount: {}, price: {} };

	while( td ) {
		if( !parseCommodityTd( r, td ) )
			return null;
		td = td.nextElementSibling;
	}

	return r;
}

function parseCommodityTd( r, td ) {
	var nodes, icon, id, amount, span, m, price;

	// Here's what we expect: exactly 4 child nodes. First is an IMG element
	// with the icon of a commodity.  Second is a text node with content ' ×
	// NN' where NN is the amount.  Third is a BR element.  Fourth is a SPAN
	// element.

	nodes = td.childNodes;
	if( nodes.length < 4 )
		return false;
	icon = nodes[0];
	amount = nodes[1];
	span = nodes[3];

	if( icon.nodeType !== Node.ELEMENT_NODE ||
	    icon.tagName !== 'IMG' ||
	    amount.nodeType !== Node.TEXT_NODE ||
	    span.nodeType !== Node.ELEMENT_NODE ||
	    span.tagName !== 'SPAN' )
		return false;

	m = IMGRX.exec( icon.src );
	if( !m )
		return false;
	icon = m[1];
	id = Commodities.getId( icon );
	if( !id )
		return false;

	m = AMTRX.exec( amount.textContent );
	if( !m )
		return false;
	amount = parseInt( m[1] );

	nodes = span.childNodes;
	if( nodes.length < 2 )
		return false;
	icon = nodes[0];
	price = nodes[1];

	if( icon.nodeType !== Node.ELEMENT_NODE ||
	    icon.tagName !== 'IMG' ||
	    !CREDICONRX.test(icon.src) ||
	    price.nodeType !== Node.TEXT_NODE )
		return false;
	price = parseInt( price.textContent );

	r.amount[ id ] = amount;
	r.price[ id ] = price;
	return true;
}

function addBookkeeperHeader( entry ) {
	var td = document.createElement( 'th' );
	td.textContent = 'BK';
	entry.tr.appendChild( td );
}

function addBookkeeperRowCells( entries ) {
	var i, end, entry, td, a;

	for( i = 0, end = entries.length; i < end; i++ ) {
		entry = entries[ i ];
		td = document.createElement( 'td' );

		if( entry.trackable ) {
			a = document.createElement( 'a' );
			a.className = 'bookkeeper-addbut';
			a.dataset.bookkeeperLoc = entry.loc;
			a.addEventListener( 'click', onAddRemClick, false );
			td.appendChild( a );
			entry.ui = a;
		}

		entry.tr.appendChild( td );
	}
}

function onBuildingData( data ) {
	var key, building, entry, updates, updateCount;

	updates = {};
	updateCount = 0;

	for( key in data ) {
		building = Building.createFromStorage( key, data[key] );
		entry = pageData[ building.loc ];
		entry.tracked = true;
		entry.building = building;
		entry.ui.className = 'bookkeeper-rembut';
		if( building.time < now ) {
			updates[ key ] = entry;
			updateCount++;
		}
	}

	updates = computeUpdates( updates );

	if( updateCount > 0 )
		chrome.storage.sync.set( updates, notifyUpdated );

	function notifyUpdated() {
		var op, text;

		if( updateCount === 1 )
			text = 'Updated 1 building';
		else
			text = 'Updated ' + updateCount + ' buildings';
		text += ' in ' + sector.name;

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
	for( key in updates ) {
		entry = updates[key];
		updateBuildingFromEntry( entry );
		r[ key ] = entry.building.toStorage();
	}

	return r;
}

function updateBuildingFromEntry( entry ) {
	var building, key, n, m;

	building = entry.building;

	building.type_id = entry.type_id;
	building.owner = entry.owner;
	building.time = now;

	if( entry.selling ) {
		for( key in entry.selling.amount ) {

			// If a building is *selling* N of a thing, it means
			// that it has N above its minimum for the thing.

			m = building.amount_min[ key ];
			if( typeof m === 'number' ) {
				n = entry.selling.amount[ key ];
				building.amount[ key ] = m + n;
			}
		}

		// Note the inversion: entry.selling contains the prices for
		// which the building sells commodities.  These are the prices
		// for which a trader would BUY from the building, and are
		// stored as such in our persistent data.

		Object.assign( building.buy_price, entry.selling.price );
	}

	if( entry.buying ) {
		for( key in entry.buying.amount ) {

			// If a building is *buying* N of a thing, it means that
			// it has N below its maximum for the thing.

			m = building.amount_max[ key ];
			if( typeof m === 'number' ) {
				n = entry.buying.amount[ key ];
				building.amount[ key ] = m - n;
			}
		}

		// Note the inversion: entry.buying contains the prices for
		// which the building buys commodities.  These are the prices
		// for which a trader would SELL to the building, and are stored
		// as such in our persistent data.

		Object.assign( building.sell_price, entry.buying.price );
	}
}

// When the user asks us to track a building from this page, we kinda have a
// problem, because we don't have all the information we have from the trade
// screen.  Specifically, we don't have the building level, maxes and mins,
// production and upkeep, and full prices.  But we'll do a best effort.

function inferBuildingFromEntry( entry ) {
	var key, n, amount, amount_max, amount_min, buy_price, sell_price,
	    res_production, res_upkeep;

	amount = {};
	amount_max = {};
	amount_min = {};
	res_production = {};
	res_upkeep = {};

	if( entry.selling ) {
		// If a building is *selling* N of a thing, we'll assume it has
		// N and its minimum is zero.
		for( key in entry.selling.amount ) {
			n = entry.selling.amount[ key ];
			amount[ key ] = n;
			amount_min[ key ] = 0;

			// We assume this is building production.  We have no
			// idea how much it produces per tick, but we need to
			// fill something here so that overview paints the
			// amount positive.
			res_production[ key ] = 9;
		}

		// As per updateBuildingFromEntry(), this sets the *buy* prices.
		buy_price = entry.selling.price;
	}
	else
		buy_price = {};

	if( entry.buying ) {
		// If a building is *buying* N of a thing, we'll assume it has
		// zero and its maximum is N.
		for( key in entry.buying.amount ) {
			n = entry.buying.amount[ key ];
			amount[ key ] = 0;
			amount_max[ key ] = n;

			// We assume this is building upkeep.  We have no idea
			// how much it consumes per tick, but we need to fill
			// something here so that overview paints the amount
			// pink and negative.
			res_upkeep[ key ] = 9;
		}

		// As per updateBuildingFromEntry(), this sets the *sell*
		// prices.
		sell_price = entry.buying.price;
	}
	else sell_price = {};

	return new Building(
		entry.loc,
		now,
		sectorId,
		entry.x,
		entry.y,
		entry.type_id,
		-1, // level
		entry.owner,
		amount,
		amount_max,
		amount_min,
		res_production,
		res_upkeep,
		buy_price,
		sell_price
	);
}

function onAddRemClick( event ) {
	var target, loc, entry;

	target = event.target;
	loc = target.dataset.bookkeeperLoc;
	if( !loc )
		return;

	event.preventDefault();
	entry = pageData[ loc ];
	if( entry.tracked )
		untrackBuilding( entry );
	else
		trackBuilding( entry );
}

function trackBuilding( entry ) {
	if( !entry.building )
		entry.building = inferBuildingFromEntry( entry );

	chrome.storage.sync.get( universe.key, onBuildingList );

	function onBuildingList( data ) {
		var list, index;
		list = data[ universe.key ];
		index = list.indexOf( entry.loc );
		if( index === -1 )
			list.push( entry.loc );
		data[ universe.key + entry.loc ] = entry.building.toStorage();
		console.log( 'storing', data );
		chrome.storage.sync.set( data, onAdded );
	}

	function onAdded() {
		entry.tracked = true;
		entry.ui.className = 'bookkeeper-rembut';
		console.log( 'tracked', entry );
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
		entry.ui.className = 'bookkeeper-addbut';
		console.log( 'untracked', entry );
	}
}

})();
