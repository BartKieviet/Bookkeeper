// Stuff for making overview tables of all forms and shapes.

// From other scripts:
var Building, Commodities, CalendarNames, Sector, BKTable;

var Overview = (function() {

// This is a catalogue of "column specifications", as expected by BKTable.

var COLUMN_SPECS = {
	location: {
		header: simpleHeader( 'Location' ),
		cell: simpleCell( function( b ) {
			var coords = Sector.getCoords( b.sectorId, b.loc );
			return Sector.getName( b.sectorId ) +
				' [' + coords.x + ',' + coords.y + ']';
		} ),
		sortId: 'loc',
		sort: function( a, b ) {
			var c = compare(
				Sector.getName(a.sectorId),
				Sector.getName(b.sectorId) );
			if ( c === 0 )
				return a.loc - b.loc;
			return c;
		}
	},

	// This one is useful when the overview is filtered by sector: show only
	// coords, and don't bother with sector name comparisons.
	coords: {
		header: simpleHeader( 'Loc' ),
		cell: rCell( function( b ) {
			var coords = Sector.getCoords( b.sectorId, b.loc );
			return coords.x + ',' + coords.y;
		} ),
		sortId: 'loc',
		sort: function( a, b ) { return a.loc - b.loc; }
	},

	type: {
		header: simpleHeader( 'Type' ),
		cell: simpleCell(
			function( b ) { return b.getTypeShortName() } ),
		sortId: 'type',
		sort: function( a, b ) {
			return compare(
				a.getTypeShortName(), b.getTypeShortName() );
		}
	},

	owner: {
		header: simpleHeader( 'Owner' ),
		cell: simpleCell( function( b ) { return b.owner } ),
		sortId: 'owner',
		sort: function( a, b ) { return compare( a.owner, b.owner ); }
	},

	level: {
		header: simpleHeader( 'Lvl' ),
		cell: rCell( function( b ) { return b.level || '?' } ),
		sortId: 'level',
		sort: function( a, b ) { return a.level - b.level; },
		initDesc: true
	},

	time: {
		header: function( th ) {
			th.textContent = 'Time';
			// we want these to pick a special style
			th.classList.add( 'r', 'time' );
		},
		cell: function( b, td ) {
			var t = new Date( b.time * 1000 );
			td.textContent = formatTime( t, this.now );
			td.className = 'r';
			td.title = t.toLocaleString();
		},
		sortId: 'time',
		sort: function( a, b ) { return a.time - b.time; },
		initDesc: true
	},

	ticksLeft: {
		header: simpleHeader( 'Ticks' ),
		cell: rCell( function( b ) { return b.ticksLeft; } ),
		sortId: 'tick',
		sort: function( a, b ) { return a.ticksLeft - b.ticksLeft; }
	},

	ticksNow: {
		header: simpleHeader( 'Now' ),
		cell: rCell( function( b ) {
			      return b.ticksNow( this.nowSecs );
		      } ),
		sortId: 'now',
		sort: function( a, b ) {
			return a.ticksNow( this.nowSecs )
			     - b.ticksNow( this.nowSecs );
		}
	},

	remove: {
		header: function() {},
		cell: removeCell
	}
};

// The following three funcs are used in the initialisation of the catalogue
// above.  These are functions that create functions.  Yes, I know, black magic,
// I'm sorry :(

function simpleHeader( legend ) {
	return function( th ) {
		th.textContent = legend;
	};
}

function simpleCell( fn ) {
	return function( building, td ) {
		td.textContent = fn.call( this, building );
	}
}

function rCell( fn ) {
	return function( building, td ) {
		td.textContent = fn.call( this, building );
		td.className = 'r';
	}
}

var Overview = {};

var grayIconSrc = chrome.extension.getURL( 'icons/mingray.svg' ),
    iconSrc = chrome.extension.getURL( 'icons/minus.svg' );

// Fetches configuration and data from storage, and creates a table with it.
// This returns immediately, then the callback is called when ready to display.
// It may take a bit.
//
// `ukey` that should be 'A', 'O', 'P' as usual.

Overview.make = function( ukey, document, callback ) {
	make( ukey, document, '', undefined, makeFullSpec, callback );
}

// As above, but make it nav-style.
//
// XXX The nav overview should be a bit less detailed still, to avoid clutter?

Overview.makeForNav = function( ukey, document, callback ) {
	make( ukey, document, 'Nav', 'nav', makeNavSpec, callback );
}

// Private functions and utilities.

function make( ukey, document, classname, storageKey, makeSpec, callback ) {
	var options, keys, list, sortId, sortAsc, sector, sectorId;

	// XXX - rename the "key" options so it's clear which are storage keys
	options = {
		id: 'bookkeeper-overview',
		className: 'nav',
		ukey: ukey,
		sortIdKey: ukey + storageKey + 'OverviewSortCrit',
		sortAscKey: ukey + storageKey + 'OverviewSortAsc',
		defaultSortId: 'time'
	}

	// Get data from local storage

	keys = [ 'sector', options.sortIdKey, options.sortAscKey ];
	chrome.storage.local.get( keys, onStorageLocalData );

	function onStorageLocalData( data ) {
		sortId = data[ options.sortIdKey ];
		sortAsc = !!data[ options.sortAscKey ];
		sector = data.sector;
		sectorId = Sector.getId( sector );

		// Now get the building list from sync

		chrome.storage.sync.get( ukey, onHaveListData );
	}

	function onHaveListData( data ) {

		// Now fetch all buildings

		list = data[ ukey ];
		if ( list && list.length > 0 ) {
			list = list.map( function( loc ) { return ukey + loc; } );
			chrome.storage.sync.get( list, onHaveBuildingData );
		}
		// XXX - else should show something, "no elements to display" or
		// whatever
	}

	function onHaveBuildingData( data ) {
		var key, buildings, spec, table;

		buildings = [];
		for ( key in data ) {
			// XXX - we'll insert the filter here
			buildings.push(
				Building.createFromStorage(key, data[key]) );
		}

		table = new BKTable( options, document );
		table.onSort = onSort;

		spec = makeSpec( table, buildings );
		table.refresh( spec, buildings );
		// Add this so our spec handlers can refer to it:
		table.nowSecs = Building.seconds( table.now.getTime() );

		table.sort( sortId, sortAsc );
		callback( table );
	}
}

// Create the spec for  overview.

function makeFullSpec( table, buildings ) {
	return makeSpec(
		table, buildings,
		[ COLUMN_SPECS.location, COLUMN_SPECS.type,
		  COLUMN_SPECS.owner, COLUMN_SPECS.level ],
		[ COLUMN_SPECS.time, COLUMN_SPECS.ticksLeft,
		  COLUMN_SPECS.ticksNow, COLUMN_SPECS.remove ] );
}

// Create the spec for nav-style overview.

function makeNavSpec( table, buildings ) {
	return makeSpec(
		table, buildings,
		[ COLUMN_SPECS.coords, COLUMN_SPECS.type,
		  COLUMN_SPECS.owner ],
		[ COLUMN_SPECS.time, COLUMN_SPECS.ticksNow ] );
}

function makeSpec( table, buildings, before, after ) {
	var spec = {
		columns: [],
		foot: foot
	};

	// Properties for use in spec functions
	table.totals = [];
	table.beforeTotals = before.length;
	table.afterTotals = after.length;
	table.commodities = getCommoditiesInUse( buildings );

	Array.prototype.push.apply( spec.columns, before );
	table.commodities.forEach( pushComm );
	Array.prototype.push.apply( spec.columns, after );

	return spec;

	function pushComm( commId ) {
		spec.columns.push( {
			header: makeCommHeaderFn( commId ),
			cell: makeCommCellFn( commId ),
			sortId: commId,
			sort: makeCommSortFn( commId ),
			initDesc: true
		} );
	}
}

// Another three functs that construct functions.  They synthesise the spec
// callbacks for each commodity.

function makeCommHeaderFn( commId ) {
	return function( th ) {
		var comm, img;

		comm = Commodities.getCommodity( commId );
		img = this.doc.createElement( 'img' );

		// XXX should we have fetched the protocol (HTTP or
		// HTTPS) from the Pardus page, to use the same here?
		img.src = 'http://static.pardus.at/img/stdhq/res/'
			+ comm.i + '.png';
		img.title = comm.n;
		th.className = 'c';
		th.appendChild( img );
		th.dataset.sort = commId;
	}
}

function makeCommCellFn( commId ) {
	return function( building, td ) {
		var n = overviewFigure( building, commId );
		if ( n !== undefined ) {
			setCommodityTD( td, commId, n );
			this.totals[ commId ] =
				( this.totals[commId] || 0 ) + n;
		}
	};
}

function makeCommSortFn( commId ) {
	return function( a, b ) {
		a = sortval( overviewFigure(a, commId) );
		b = sortval( overviewFigure(b, commId) );
		return a - b;
	}

	function sortval( n ) {
		return n === undefined ? -Infinity : n;
	}
}

// grayIconSrc = chrome.extension.getURL( 'icons/mingray.svg' ),
// iconSrc = chrome.extension.getURL( 'icons/minus.svg' );

function removeCell( building, td ) {
	var button;

	button = this.doc.createElement( 'img' );
	button.className = 'bookkeeper-small-button';
	button.src = grayIconSrc;
	button.dataset.loc = building.loc;
	button.addEventListener( 'click', onRemoveClick.bind(this) );
	button.addEventListener( 'mouseover', onRemoveMouseOver );
	button.addEventListener( 'mouseout', onRemoveMouseOut );
	td.appendChild( button );
}

function onRemoveClick( event ) {
	var target, loc, index;

	target = event.target;
	loc = parseInt( target.dataset.loc );
	index = this.items.findIndex(
		function(b) { return b.loc === loc; } );
	if ( index === -1 )
		return;

	event.preventDefault();

	var tr = target.parentElement;
	while ( tr.tagName != 'TR' )
		tr = tr.parentElement;
	tr.remove();
	this.items.splice( index, 1 );
	Building.removeStorage( loc, this.options.ukey );
}
function onRemoveMouseOver( event ) { event.target.src = iconSrc; }
function onRemoveMouseOut( event ) { event.target.src = grayIconSrc; }

// The spec.footer function, added as is (it's already a closure, accesses
// variables defined above.
function foot() {
	var columns, append, lastComm, tr, cell, i, end, total, id;

	// save typing
	columns = this.spec.columns;
	append = (function( tagName, className ) {
			  cell = document.createElement( tagName );
			  if ( className ) cell.className = className;
			  tr.appendChild( cell );
		  }).bind(this);

	lastComm = columns.length - this.afterTotals;

	tr = this.doc.createElement( 'tr' );
	append( 'td', 'r' );
	cell.colSpan = this.beforeTotals;
	for ( i = this.beforeTotals, end = lastComm; i < end; i++ ) {
		append( 'td' );
		id = this.commodities[ i - this.beforeTotals ];
		total = this.totals[ id ];
		if ( total !== undefined )
			setCommodityTD( cell, id, total );
		}
	append( 'td' );
	cell.colSpan = this.afterTotals;
	this.elements.foot.appendChild( tr );

	// Arbitrary limit
	if ( this.items.length > 24 ) {
		tr = this.doc.createElement( 'tr' );
		for ( i = 0, end = columns.length; i < end; i++ ) {
			append( 'th' )
			columns[ i ].header.call( this, cell );
		}
		this.elements.foot.appendChild( tr );
	}
}

function setCommodityTD( td, commId, n ) {
	td.textContent = n;
	td.title = Commodities.getCommodity( commId ).n;
	td.className = 'c';
	if ( n > 0 )
		td.classList.add( 'lime' );
	else if ( n < 0 )
		td.classList.add( 'pink' );
}

// Given a building and commodity id, return the number to display in the
// overview table: negative upkeep, positive production, zero, or undefined if
// the building doesn't trade in that commodity.

function overviewFigure( building, commId ) {
	if ( building.isUpkeep( commId ) &&
	     building.toBuy[commId] !== undefined )
		return -building.toBuy[ commId ];

	if ( building.forSale[commId] !== undefined )
		return building.forSale[ commId ];

	return undefined;
}

// Return an array of ids of commodities that are consumed or produced by at
// least one building in the collection given.

function getCommoditiesInUse( buildings ) {
	var inUse, i, end, commodity;

	inUse = [];

	// For each building...

	buildings.forEach( function( building ) {

		// ... get the ids of the commodities it uses, and mark each of
		// these ids in the inUse[] sparse array.

		building.getCommoditiesInUse().forEach( function( id ) {
			inUse[ id ] = true;
		} );
	} );

	// Create a new array that contains each id in inUse, which were the
	// ones we marked because they were used by at least one building.

	return inUse.reduce(
		function( r, x, id ) { r.push(id); return r; }, [] );
}

// Format a timestamp in a way that's short and readable.  Parameter `timestamp`
// is the time to format, parameter `now` is the current time.  Both are
// instances of Date, not numeric timestamps like we use everywhere else.
//
// XXX - should we try things like "seconds ago", "2 hours ago" etc.?

function formatTime( t, now ) {

	// If the date is old, use the day and month.  432000000 is the number
	// of milliseconds in five days.

	if ( now.getTime() - t.getTime() > 432000000 ) {
		return CalendarNames.MONTHS[ t.getMonth() ] + ' ' + t.getDate();
	}

	if ( now.getDate() === t.getDate() ) {

		// This is today.  Just the time will do.  We'll add seconds
		// because why not.

		return twoDigits( t.getHours() )
		     + ':' + twoDigits( t.getMinutes() )
		     + ':' + twoDigits( t.getSeconds() );
	}

	// Weekday and time.

	return CalendarNames.WEEKDAYS[ t.getDay() ] + ' '
	     + twoDigits( t.getHours() )
	     + ':' + twoDigits( t.getMinutes() );

	function twoDigits( n ) {
		n = String(n);
		return n.length < 2 ? '0' + n : n;
	}
}

// Compare things that can be compared with === and <, like strings
// (also numbers, but for those a simple `a - b` is easier.

function compare( a, b ) {
	if ( a === b )
		return 0;
	if ( a < b )
		return -1;
	return 1;
}

// Called when the table is re-sorted, in the context of the BKTable instance.

function onSort() {
	var items = {};
	items[ this.options.sortIdKey ] = this.sortId;
	items[ this.options.sortAscKey ] = this.sortAsc;
	chrome.storage.local.set( items );
}

return Overview;

})();
