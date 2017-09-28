var Building; // from building.js
var Commodities; // from commodity.js
var CalendarNames; // from functions.js
var Sector; // from sector.js
var BKTable; // from table.js



// Stuff for making overview tables of all forms and shapes.



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
		sortKey: 'loc',
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
		sortKey: 'loc',
		sort: function( a, b ) { return a.loc - b.loc; }
	},

	type: {
		header: simpleHeader( 'Type' ),
		cell: simpleCell(
			function( b ) { return b.getTypeShortName() } ),
		sortKey: 'type',
		sort: function( a, b ) {
			return compare(
				a.getTypeShortName(), b.getTypeShortName() );
		}
	},

	owner: {
		header: simpleHeader( 'Owner' ),
		cell: simpleCell( function( b ) { return b.owner } ),
		sortKey: 'owner',
		sort: function( a, b ) { return compare( a.owner, b.owner ); }
	},

	level: {
		header: simpleHeader( 'Lvl' ),
		cell: rCell( function( b ) { return b.level || '?' } ),
		sortKey: 'level',
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
		sortKey: 'time',
		sort: function( a, b ) { return a.time - b.time; },
		initDesc: true
	},

	ticksLeft: {
		header: simpleHeader( 'Tick' ),
		cell: rCell( function( b ) { return b.ticksLeft; } ),
		sortKey: 'tick',
		sort: function( a, b ) { return a.ticksLeft - b.ticksLeft; }
	},

	ticksNow: {
		header: simpleHeader( 'Now' ),
		cell: rCell( function( b ) {
			      return b.ticksNow( this.nowSecs );
		      } ),
		sortKey: 'now',
		sort: function( a, b ) {
			return a.ticksNow( this.nowSecs )
			     - b.ticksNow( this.nowSecs );
		}
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

// Fetches configuration and data from storage, and creates a table with it.
// This returns immediately, then the callback is called when ready to display.
// It may take a bit.
//
// `ukey` that should be 'A', 'O', 'P' as usual.
//
// XXX The nav overview should be a bit less detailed than the full one, to avoid
// clutter?

Overview.makeNavOverview = function( ukey, document, callback ) {
	var options, keys, list, sortKey, sortAsc, sector, sectorId;

	// XXX - rename the "key" options so it's clear which are storage keys
	options = {
		id: 'overview',
		ukey: ukey,
		sortCritKey: ukey + 'NavOverviewSortCrit',
		sortAscKey: ukey + 'NavOverviewSortAsc',
		defaultSortKey: 'time'
	}

	// Get data from local storage

	keys = [ 'sector', options.sortCritKey, options.sortAscKey ];
	chrome.storage.local.get( keys, onStorageLocalData );

	function onStorageLocalData( data ) {
		sortKey = data[ options.sortCritKey ];
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
		spec = makeNavColSpec( table, buildings );
		table.refresh( spec, buildings );

		// Add this so our spec handlers can refer to it:
		table.nowSecs = Building.seconds( table.now.getTime() );

		callback( table );
	}
}

// Private functions and utilities.

function makeNavColSpec( table, buildings ) {
	var columns, commodities, totals, beforeTotals, afterTotals;

	// XXX - we'll change this when filtering

	columns = [];
	totals = [];
	commodities = getCommoditiesInUse( buildings );

	columns.push(
		COLUMN_SPECS.coords, COLUMN_SPECS.type,
		COLUMN_SPECS.owner, COLUMN_SPECS.level );
	commodities.forEach( pushComm );
	columns.push(
		COLUMN_SPECS.time, // COLUMN_SPECS.ticksLeft,
		COLUMN_SPECS.ticksNow );

	// Sync these with above
	beforeTotals = 4;
	afterTotals = 2;

	return {
		columns: columns,
		foot: foot
	}

	// end of makeNavColSpec, below are function defs

	function pushComm( commId ) {
		columns.push( {
			header: makeCommHeaderFn( commId ),
			cell: makeCommCellFn( commId ),
			sortKey: commId,
			sort: makeCommSortFn( commId ),
			initDesc: true
		} );
	}

	// Another three functs that construct functions.  They synthesise the
	// spec callbacks for each commodity.

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
				totals[ commId ] =
					( totals[commId] || 0 ) + n;
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

	// The spec.footer function, added as is (it's already a closure,
	// accesses variables defined above.
	function foot() {
		var append, lastComm, tr, cell, i, end, total, id;

		// save typing
		append = (function( tagName, className ) {
				  cell = document.createElement( tagName );
				  if ( className ) cell.className = className;
				  tr.appendChild( cell );
			  }).bind(this);

		lastComm = columns.length - afterTotals;

		tr = this.doc.createElement( 'tr' );
		append( 'td', 'r' );
		cell.colSpan = beforeTotals;
		for ( i = beforeTotals, end = lastComm; i < end; i++ ) {
			append( 'td' );
			id = commodities[ i - beforeTotals ];
			total = totals[ id ];
			if ( total !== undefined )
				setCommodityTD( cell, id, total );
		}
		append( 'td' );
		cell.colSpan = afterTotals;
		this.elements.foot.appendChild( tr );

		// Arbitrary limit
		if ( buildings.length > 24 ) {
			tr = this.doc.createElement( 'tr' );
			for ( i = 0, end = columns.length; i < end; i++ ) {
				append( 'th' )
				columns[ i ].header.call( this, cell );
			}
			this.elements.foot.appendChild( tr );
		}
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

return Overview;

})();

// start of script execution (XXX we should move the above to its own file)

document.addEventListener( 'DOMContentLoaded', onDOM, false );

// end of script execution

function onDOM() {
	chrome.runtime.sendMessage( { op: 'queryPopUpData' }, onHaveOptions );
}

function onHaveOptions( opts ) {
	Overview.makeNavOverview( opts.ukey, document, onReady );

	function onReady( table ) {
		document.body.appendChild( table.elements.container );
		table.sort( 'loc' );
	}
}
