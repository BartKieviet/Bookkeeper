// This is a content script, runs index_buildings.php

var Universe,    // from universe.js
    Sector,      // from sector.js
    Building,    // from building.js
    Commodities; // from commodity.js

(function() {

// Regular expressions, XPath expressions and other stuff we use repeatedly.
var IMGRX = /([^/]*)\.png$/,
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
var universe, sectorId, sectorName, now, updateCount;

setup();

// Script execution ends here.  Function definitions below.

function setup() {
	var sectorrx = /^(.*) Building Index$/,
	    h1, m;

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
	sectorName = m[1];
	sectorId = Sector.getId( sectorName );
	if( !sectorId )
		return;

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

	// Fetch all buildings in storage.  This kinda sucks but, there is no
	// other way: we don't have tile IDs here.
	//
	// XXX - At some point we'll have to come up with a way to resolve
	// sector coords to tile IDs, and then we'll get away with just querying
	// the relevant IDs.  Remember to write about this in a GitHub issue.
	chrome.storage.sync.get( universe.key, onBuildingList );
}

function onBuildingList( data ) {
	var k = universe.key;
	var keys = data[ k ].map( function( loc ) { return k + loc; } );
	chrome.storage.sync.get( keys, onBuildingData );
}

function onBuildingData( data ) {
	var buildings = [], key, building, entries, updates, message;

	for( key in data ) {
		building = Building.createFromStorage(key, data[key])
		if( building.sector_id === sectorId )
			buildings[ coordsToIndex(building.x, building.y) ] = building;
	}

	entries = parsePage( buildings );
	updateCount = entries.length;
	if( updateCount === 0 )
		return;

	updates = computeUpdates( entries );
	chrome.storage.sync.set( updates, notifyUpdated );
}

function computeUpdates( entries ) {
	var updates, i, end, entry, building;

	updates = {};

	for( i = 0, end = entries.length; i < end; i++ ) {
		entry = entries[ i ];
		building = entry.building;
		//var x = building.toStorage();

		building.type_id = entry.type_id;
		building.owner = entry.owner;
		building.time = now;
		Object.assign( entry.building.amount, entry.new_amount );
		if( entry.new_buy_price )
			Object.assign( entry.building.buy_price, entry.new_buy_price );
		if( entry.new_sell_price )
			Object.assign( entry.building.sell_price, entry.new_sell_price );

		updates[ universe.key + building.loc ] = building.toStorage();
	}

	return updates;
}

function notifyUpdated() {
	var op, text;

	if( updateCount === 1 )
		text = 'Updated 1 building';
	else
		text = 'Updated ' + updateCount + ' buildings';
	text += ' in ' + sectorName;

	op = {
		op: 'showNotification',
		text: text
	}

	chrome.runtime.sendMessage( op );
}

// We convert x,y to a single number, so we can index things faster.  This
// relies on pardus never adding a sector wider than 10,000 tiles. Ha.
function coordsToIndex( x, y ) {
	return y*10000 + x;
}

function parsePage( buildings ) {
	var coordsRx, entries, xpr, tr, m, idx, building, entry;

	coordsRx = /^markField\('y(\d+)x(\d+)'\)$/;
	entries = [];
	xpr = document.evaluate(
		'//tr[starts-with(@onmouseover,"markField(\'")]', document, null,
		XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null);

	while( (tr = xpr.iterateNext()) !== null ) {
		m = coordsRx.exec( tr.getAttribute('onmouseover') );
		if( m ) {
			idx = coordsToIndex( parseInt(m[2]), parseInt(m[1]) );
			building = buildings[idx];
			if( building && building.time < now ) {
				entry = trToEntry( tr, building );
				if( entry )
					entries.push( entry );
				else
					// For now we want to know if the
					// extension is rejecting some
					// listings...
					console.log( 'Bookkeeper: rejected building at ' +
						     building.x + ',' + building.y );
			}
		}
	}

	return entries;
}

function trToEntry( tr, building ) {
	var entry, xpr, imgtd, coordtd, ownertd, infotd;

	entry = {
		tr: tr,
		building: building,
		type_id: undefined,
		owner: undefined,
		new_amount: undefined,
		new_buy_price: undefined,
		new_sell_price: undefined
	};

	xpr = TDS_XPATH.evaluate( tr, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null );
	if( parseIconTd(entry, xpr.iterateNext()) &&
	    xpr.iterateNext() && // skip coords, we already have those
	    parseOwnerTd(entry, xpr.iterateNext()) &&
	    parseInfoTd(entry, xpr.iterateNext()) )
		return entry;

	return null;
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

function parseOwnerTd( entry, td ) {
	var a, m;
	if( !td )
		return false;

	a = td.firstElementChild;
	if( !a || a.tagName !== 'A' || !a.href.startsWith("javascript:sendmsg(") )
		return false;

	entry.owner = a.textContent.trim();
	return true;
}

function parseInfoTd( entry, td ) {
	var xpr, tr, row, rowtd, parse;

	if( !td )
		return false;

	entry.new_amount = {};

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
	var row, key, min;

	row = parseCommoditiesRow( firstTD );
	if( !row )
		return false;

	// If a building is *selling* N of a thing, it means that it has N above
	// its minimum for the thing.
	for( key in row.amount ) {
		min = entry.building.amount_min[ key ];
		if( typeof min != 'number' )
			return false;
		entry.new_amount[ key ] = min + row.amount[ key ];
	}

	// Note the inversion: the buildings we're updating have a "buy price"
	// which is the price for which the trader could buy commodities from
	// the building.  This is actually the "sell" price here: the price for
	// which the building sells commodities.
	entry.new_buy_price = row.price;
	return true;
}

function parseBuyTDs( entry, firstTD ) {
	var row, key, max;

	row = parseCommoditiesRow( firstTD );
	if( !row )
		return false;

	// If a building is *buying* N of a thing, it means that it has N below
	// its maximum for the thing.
	for( key in row.amount ) {
		max = entry.building.amount_max[ key ];
		if( typeof max != 'number' )
			return false;
		entry.new_amount[ key ] = max - row.amount[ key ];
	}

	// Note the inversion: the buildings we're updating have a "sell price"
	// which is the price for which the trader could sell commodities to the
	// building.  This is actually the "buy" price here: the price for which
	// the building buys commodities.
	entry.new_sell_price = row.price;
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

})();
