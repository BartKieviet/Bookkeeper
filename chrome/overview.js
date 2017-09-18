// -*- js3-indent-level: 8; js3-indent-tabs-mode: t -*-

// This is a content script.  It runs on overview_buildings.php.

var Universe; // from universe.js
var Building; // from building.js
var Commodities; // from commodity.js

(function (){

var WEEKDAYS = [ 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat' ];
var MONTHS = [ 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
	       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec' ];

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

function compareAsInt( a, b ) {
	return parseInt(a) - parseInt(b);
}

var credits_img = "<img src='//static.pardus.at/img/stdhq/credits_16x16.png' alt='Credits' width='16' height='16' style='vertical-align: middle;'>",
    universe = Universe.fromDocument( document ),
    sortCritKey = universe.name + 'OverviewSortCrit',
    sortAscKey = universe.name + 'OverviewSortAsc';

function showOverview( syncData ) {
	// Data contains a property whose name we computed and stored in the
	// buildingListId variable.  Its value is an array of location IDs of
	// every building tracked.
	var buildingList = syncData[ universe.key ];

	if( !buildingList )
		// No configuration, odd. Do nothing.
		return;

	chrome.storage.local.get( [sortCritKey, sortAscKey],
				  showOverviewStep2.bind(null, buildingList) );
}

function showOverviewStep2( buildingList, data ) {
	var keys = [],
	    callback = showOverviewBuildings.bind(
		    null,
		    data[sortCritKey],
		    data[sortAscKey]
	    ),
	    i, end;

	// Build an array of storage keys that we'll need to display the overview.
	for( i = 0, end = buildingList.length; i < end; i++ )
		keys.push( universe.key + buildingList[i] );

	// Query the buildings
	chrome.storage.sync.get( keys, callback );
}

// Return an array of commodities actually in use by the collection of buildings
// given.
function getCommoditiesInUse( buildings ) {
	var in_use = new Object(),
	    i, end, commodity;

	for( i = 0, end = buildings.length; i < end; i++ ) {
		// XXX - do we need to check something other than `amount` ?
		for( commodity in buildings[i].amount )
			in_use[commodity] = true;
	}

	return Object.keys( in_use ).sort( compareAsInt );
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

	for( key in data ) {
		b = Building.createFromStorage( key, data[key] );
		buildings.push( b );
	}

	return buildings;
}

function showOverviewBuildings( sort, ascending, data ) {
	var buildings, b, ckey, commodity, container, end, h1, i, img, in_use,
	    key, table, tbody, thead, tr;

	if( !sort )
		sort = 'time';
	if( typeof ascending != 'boolean' )
		ascending = true;
	delete data[ sortCritKey ];
	delete data[ sortAscKey ];

	// Parse each building.
	buildings = loadBuildings( data );
	data = null; // don't need this anymore, may be garbage collected
	in_use = getCommoditiesInUse( buildings );

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

	for( i = 0, end = in_use.length; i < end; i++ ) {
		ckey = in_use[i];
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
	fillTBody( tbody, in_use, buildings, sort, ascending );
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
		if( target.id && target.id.startsWith( 'bookkeeper-hdr-' ) ) {
			event.stopPropagation();
			var newsort = target.id.substr( 15 );
			if( newsort == sort )
				ascending = !ascending;
			else {
				sort = newsort;
				ascending = true;
			}

			var items = {};
			items[ sortCritKey ] = sort;
			items[ sortAscKey ] = ascending;
			chrome.storage.local.set( items );

			fillTBody( tbody, in_use, buildings, sort, ascending );
		}
	}
}

function fillTBody( tbody, in_use, buildings, sort, ascending ) {
	var key, building, tr, cell, img, ckey, n, s, i , end, j, jend, commodity,
	    sortfn, fn, className, deleteIconUri;

	sortfn = BUILDING_SORT_FUNCTIONS[ sort ];
	if( sortfn ) {
		if( ascending )
			fn = sortfn;
		else
			fn = function( a, b ) { return -sortfn( a, b ); };
		buildings.sort( fn );
	}

	while( tbody.hasChildNodes() )
		tbody.removeChild( tbody.firstChild );

	deleteIconUri = chrome.extension.getURL('icons/minusbw.svg');

	for( i = 0, end = buildings.length; i < end; i++ ) {
		building = buildings[ i ];
		tr = document.createElement( 'tr' );

		addTD( tr, humanCoords( building ) );
		cell = addTD( tr, building.stype );
		cell.title = building.type;
		addTD( tr, building.owner || 'need update' );
		addTD( tr, building.level > 0 ? String(building.level) : '??', 'right' );

		for( j = 0, jend = in_use.length; j < jend; j++ ) {
			ckey = in_use[j];
			commodity = Commodities.getCommodity( ckey );

			// If upkeep we do amount - min, else we do max - amount and make it negative..
			if( building.res_upkeep[ckey] ) {
				n = -(building.amount_max[ckey] - building.amount[ckey]);
				s = String( n );
			}
			else if( building.res_production[ckey] ) {
				n = building.amount[ckey] - building.amount_min[ckey];
				s = String( n );
			}
			else
				s = n = null;

			cell = addTD( tr, s );
			if( s ) {
				cell.title = commodity.n;
				cell.className = 'c';
				if( n > 0 )
					cell.classList.add( 'lime' );
				else if( n < 0 )
					cell.classList.add( 'pink' );
			}
		}

		cell = makeTimeTD( building.time * 1000 );
		tr.appendChild( cell );

		addTD( tr, building.ticks < Infinity ? String(building.ticks) : '??', 'r' );

		className = null;
		if (building.ticks_left < Infinity) {
			// Not pretty but fast according to:
			// https://stackoverflow.com/questions/6665997/switch-statement-for-greater-than-less-than
			if( building.ticks_left < 1 )
				className = 'red';
			else if( building.ticks_left < 2 )
				className = 'yellow';
		}

		cell = addTD( tr,
			      building.ticks_left < Infinity ? String(building.ticks_left) : '??',
			      'r' );
		if( className )
			cell.classList.add( className );

		addTD( tr, makeRemoveButton(building.loc) );

		tbody.appendChild( tr );
	}
}

function makeRemoveButton( loc ) {
	var button;

	button = document.createElement( 'a' );
	button.className = 'bookeeper-addrmv-small';
	button.dataset.bookkeperLoc = loc;
	button.addEventListener( 'click', onRemoveClick );

	return button;
}

function onRemoveClick( event ) {
	var target, loc;

	target = event.target;
	loc = target.dataset.bookkeperLoc;
	if( !loc )
		return;

	Building.removeStorage( loc, universe.key, removeRow );

	function removeRow() {
		var tr = target.parentElement;
		while( tr.tagName != 'TR' )
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
	if( now - timestamp > 432000000 ) {
		s = MONTHS[ t.getMonth() ] + ' ' + t.getDate();
	}
	else {
		now = new Date( now );
		if( now.getDate() == t.getDate() )
			// This is today.  Just the time will do.
			// We'll add seconds because why not.
			s = twoDigits( t.getHours() )
			  + ':' + twoDigits( t.getMinutes() )
			  + ':' + twoDigits( t.getSeconds() );
		else
			// Show weekday and time.
			s = WEEKDAYS[ t.getDay() ] + ' '
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

function humanCoords( building ) {
	if( building.sector_id ) {
		return building.getSectorName() + ' [' +
			(typeof building.x == 'number' ? building.x : '?') + ',' +
			(typeof building.y == 'number' ? building.y : '?') + ']';
	}
	return 'need update';
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
	if( className )
		elt.className = className;
	if( id )
		elt.id = id;
	if( typeof content == 'string' )
		content = document.createTextNode( String(content) );
	if( content )
		elt.appendChild( content );
	parent.appendChild( elt );
	return elt;
}

chrome.storage.sync.get( universe.key, showOverview );

// To do
// * Sum all rows of a single column.
// * Add option to allow own buildings to be added.

})();
