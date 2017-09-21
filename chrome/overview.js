// -*- js3-indent-level: 8; js3-indent-tabs-mode: t -*-

// This is a content script.  It runs on overview_buildings.php.

var Universe; // from universe.js
var Building; // from building.js
var Commodities; // from commodity.js
var CalendarNames; // from functions.js

(function (){

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
    sortAscKey = universe.name + 'OverviewSortAsc',
    grayIconSrc = chrome.extension.getURL( 'icons/mingray.svg' ),
    iconSrc = chrome.extension.getURL( 'icons/minus.svg' );

function showOverview( syncData ) {
	// Data contains a property whose name we computed and stored in the
	// buildingListId variable.  Its value is an array of location IDs of
	// every building tracked.
	var buildingList = syncData[ universe.key ];

	if( !buildingList ) {
		// No buildings yet?
		buildingList = [];
	}

	// Note for K:
	//
	// The bind() method of Function creates a new function that, when
	// called, has its `this` keyword set to the provided value, with a
	// given sequence of arguments preceding any provided when the new
	// function is called.
	//
	// See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/bind
	//
	// So the actual function that will be executed when addOwnBuildings
	// returns is one that will call showOverviewStep2 passing buildingList
	// as its first parameter (and with `this` set to null then, too, but we
	// don't care about that).
	//
	// We need to do this because buildingList is a *local* variable here,
	// which would ordinarily be destroyed as soon as this function returns.
	// And we have no idea when addOwnBuildings will call its callback --
	// may be long after we're dead.  Keeping a reference this way keeps the
	// variable alive.
	//
	// We could avoid these shenanigans, and maybe should, by just declaring
	// buildingList global, so all our callbacks can share it.

	addOwnBuildings( buildingList, showOverviewStep2.bind(null, buildingList) );
}

function showOverviewStep2( buildingList ) {
	chrome.storage.local.get( [sortCritKey, sortAscKey],
				  showOverviewStep3.bind(null, buildingList) );
}

function showOverviewStep3( buildingList, data ) {
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
	if( !loc )
		return;

	event.preventDefault();

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
		s = CalendarNames.MONTHS[ t.getMonth() ] + ' ' + t.getDate();
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

// This used to fetch the building list from storage.  However, that's the first
// thing that the script does, so we avoid the second query by calling this from
// `showOverview()`, waay above.
//
// Also, this may change the list, so we want the rest of the overview stuff to
// wait until we're done.  So we take a callback.  We call back before we return
// (or arrange for chrome to call it back, if we need to store stuff).  The
// callback receives the (possibly updated) buildingList, so stuff above may
// resume.

function addOwnBuildings( buildingList, callback ) {
	var ownBuildingTable, ownNumberOfBuildings, ownBuildings, i, end, building, m;

	ownBuildingTable = document.getElementById( "mToggle" ).parentNode.parentNode.parentNode;
	if ( !ownBuildingTable ) {
		// Nothing to do, proceed.
		onFinished();
		return;
	}

	ownNumberOfBuildings = ownBuildingTable.children.length - 1;
	ownBuildings = [];

	for ( i = 0; i < ownNumberOfBuildings; i++ ) {
		var firstLink = ownBuildingTable.children[i+1].getElementsByTagName("a")[0];

		if (firstLink.textContent === "Trading Outpost" || firstLink.textContent === "Military Outpost") {
			//TOs and MOs don't play by the rules.
			continue;
		} else {
			// Some of this parsing is a bit flaky.  I see for
			// instance the original code expected an
			// ownBuildingLocation array with the sector name at
			// index 0, x at index 2, y at index 3.  However, that
			// failed for me because i have buildings in Cor Caroli,
			// which was getting split as "Cor" and "Caroli" by
			// split(/[: ,]/g).

			var loc = parseInt(firstLink.href.split("=")[1]);
			var ownBuildingData = ownBuildingTable.children[i+1].getElementsByTagName( "table" );

			// The expression
			//   ownBuildingTable.children[i+1].getElementsByTagName('td')[1].textContent
			// evaluates to something like "Cor Caroli: 7,28".
			m = /(.*): (\d+),(\d)/.exec(
				ownBuildingTable.children[i+1].getElementsByTagName('td')[1].textContent );
			var sectorName = m[1];
			var x = m[2];
			var y = m[3]

			var ownBuildingAmount = {};
			for (var tableNumber = 3; tableNumber < 5; tableNumber++) {
				//3 and 4 are upkeep and stock.
				var stock_img = ownBuildingData[tableNumber].getElementsByTagName("img");
				for (var j = 0; j < stock_img.length ; j++) {
					var key = Commodities.getId(stock_img[j].src.split(/[./]/g)[8]);
					var value = stock_img[j].parentNode.textContent.split( " " )[1];
					ownBuildingAmount[key] = value;
				}
			}

			// This used to create a building calling new Building()
			// with an empty parameter list.  But that's a bit of a
			// waste, we can skip the empty initialisation by just
			// giving it the values it should have.

			// DO NOTE: from my experience in blgdindex.js,
			// res_production and res_upkeep *must* be set; they are
			// used by the overview table render code to decide if
			// an amount should be coloured lime, or pink and
			// negative.

			// ALSO NOTE: I have a building with miscellaneous
			// trinkets stored in it (drugs, crystals, whatever).
			// All these are getting added to building.amount, which
			// is very weird and wrong.  I think what needs be done
			// is:
			//
			// 1. Parse the Upkeep and Production columns first and
			//    get res_production and res_upkeep from them.
			//
			// 2. Parse the Commodities column, but only add
			//    commodities mentioned in either Production or
			//    Upkeep.
			//
			// Parsing a building should probably be a separate
			// function, it's already complicated and will probably
			// get even more.

			building = new Building(
				loc, // loc,
				Math.floor(Date.now()/1000), // time,
				Sector.getId(sectorName), //sector_id,
				parseInt(x), //x,
				parseInt(y), //y,
				Building.getTypeId(firstLink.textContent), //type_id,
				parseInt(ownBuildingData[0].textContent), //level,
				"You", //owner,
				ownBuildingAmount, //amount,
				{}, // amount_max
				{}, // amount_min
				{}, // res_production
				{}, // res_upkeep
				{}, // buy_price
				{} // sell_price
			);

			ownBuildings.push( building );
		}
	}

	if ( ownBuildings.length === 0 ) {
		// bloke had only TOs or something?
		onFinished();
		return;
	}

//	console.log( 'ownBuildings', ownBuildings );

	// Code below used to be finishAddBuildings, run when the building list
	// was available. But now we already have the list, so just fall through
	// executing.
	var ownBuildingList = [];
	for (var i = 0; i < ownBuildings.length ; i++) {
		ownBuildingList.push ( universe.key + ownBuildings[i].loc );
	}

	chrome.storage.sync.get ( ownBuildingList, finishAddBuildings.bind(null, ownBuildings, buildingList));
	function finishAddBuildings ( ownBuildings, buildingList, buildingData) {

	// We track if we actually made changes to the building list.  Because
	// if we didn't, we don't actually need to store it again.
		var buildings = {};

		for (var key in buildingData) {
			buildings [ key ] = Building.createFromStorage(key, buildingData[ key ] );
		}

		var updatedBuildingList = false;

		// Add the new IDs to the building list.
		for ( i = 0, end = ownBuildings.length; i < end; i++ ) {

			if ( buildingList.indexOf(ownBuildings[ i ].loc) === -1 ) {
				buildingList.push( ownBuildings[ i ].loc );
				updatedBuildingList = true;
			} else {
				var keylist = {	"amount_max":0,
								"amount_min":0,
								"res_production":0,
								"res_upkeep":0,
								"buy_price":0,
								"sell_price":0
								}

				for (var key in keylist) {
					ownBuildings[ i ][ key ] = buildings [ universe.key + ownBuildings[ i ].loc ] [ key ];
				}
			}
		}

		//console.log( 'buildingList', buildingList, updatedBuildingList );
		// Compute the data to store.
		var storeData = {};

		if ( updatedBuildingList ) {
			storeData[ universe.key ] = buildingList;
		}

		for ( i = 0, end = ownBuildings.length; i < end; i++ ) {
			building = ownBuildings[ i ];

			storeData[ universe.key + building.loc ] = building.toStorage();
		}

		//console.log( 'storeData', storeData );

		// Finally, store everything we need to store.  If you need to comment
		// out this line, for debugging, insert a call to onFinished() in its
		// place.  This is needed so that the rest of the overview code gets a
		// chance to run.

		chrome.storage.sync.set( storeData, onFinished );
		// onFinished();
	}

	function onFinished() {
		// Call back with the possibly updated building list
		callback( buildingList );
	}
}

chrome.storage.sync.get( universe.key, showOverview );

})();
