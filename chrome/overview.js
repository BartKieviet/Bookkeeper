// From other scripts:
var Building, Commodities, CalendarNames, Sector, BKTable, Filter;

// Overview is a UI component that contains a Filter and a BKTable, and mediates
// the interaction between those.

var Overview = (function() {

// Construct a new Overview.  This creates the DOM element, but does not attach
// it to the document.  That should be done after the instance is configured,
// with something like:
//
// someNode.appendChild( overviewInstance.containerElement );

var Overview = function( ukey, document, storageKey ) {
	var div, options, tableOptions;

	// XXX we should take an options object, and merge with this:
	this.options = {
		id: 'bookkeeper-overview',
		mode: 'full',
		ukey: ukey,
		filterKey: ukey + storageKey + 'Filter',
		sortIdKey: ukey + storageKey + 'OverviewSortCrit',
		sortAscKey: ukey + storageKey + 'OverviewSortAsc'
	};

	tableOptions = {
		id: this.options.id,
		// className: 'nav',
		ukey: ukey,
		defaultSortId: 'time'
	}

	this.filter = new Filter();

	this.containerElement = document.createElement( 'div' );
	this.containerElement.className = this.options.id + '-container';

	div = document.createElement( 'div' );
	this.filterInput = document.createElement( 'input' )
	div.appendChild( this.filterInput );
	this.containerElement.appendChild( div );

	this.table = new BKTable( document, tableOptions );
	this.table.onRefresh = onTableRefresh;
	this.containerElement.appendChild( this.table.elements.container );
}

// If the list of building ids in this universe is already available (like, it
// was needed for something else and fetched outside this object), then pass it
// here, it'll save a storage query.  Otherwise, we'll ask for it.

Overview.prototype.configure = function( universeList, callback ) {
	var keys, sortId, sortAsc, sector, sectorId;

	// Get data from local storage

	keys = [
		'sector', 'x', 'y',
		this.options.filterKey,
		this.options.sortIdKey,
		this.options.sortAscKey
	];
	chrome.storage.local.get( keys, onStorageLocalData.bind(this) );

	function onStorageLocalData( data ) {
		var query = data[ this.options.filterKey ] || '';
		this.filterInput.value = query;
		this.sortId = data[ this.options.sortIdKey ];
		this.sortAsc = !!data[ this.options.sortAscKey ];
		this.currentSector = data.sector || '';
		this.currentSectorId = Sector.getId( this.currentSector );
		this.filter.parseQuery( query );

		// Build an example query
		this.filterInput.placeholder =
			'SF ' + this.currentSector + ' 3 ' +
			data.x + ',' + data.y;

		applyFilter.call( this, universeList, onReady.bind(this) );
	}

	function onReady() {
		// At this point, the table is sorted by the initial sort.  Now
		// we want to be notified of any re-sorting.
		this.table.onSort = onSort;

		// And we want to know if the user types a filter
		this.filterTimeout = undefined;
		this.filterInput.addEventListener(
			'input', onFilterInput.bind(this), false );

		// Done. Call the caller if they asked for it.
		if ( callback )
			callback( this );
	}
}

function applyFilter( universeList, callback ) {
	if ( universeList === undefined ) {
		// The usual case: get the building list from sync
		chrome.storage.sync.get(
			this.options.ukey, onHaveUniverseData.bind(this) );
	}
	else
		// Skip that sync.get
		fetchBuildingData.call( this );

	// XXX - if no building list we should show something, "no elements to
	// display" or whatever.  Now more important, with filters.
	function onHaveUniverseData( data ) {
		universeList = data[ this.options.ukey ] || [];
		fetchBuildingData.call( this );
	}

	// Now fetch all buildings
	function fetchBuildingData() {
		var keys, ukey;
		ukey = this.options.ukey;
		keys = universeList.map(
			function( loc ) { return ukey + loc; } );
		chrome.storage.sync.get( keys, onHaveBuildingData.bind(this) );
	}

	function onHaveBuildingData( data ) {
		var key, buildings, spec, table;

		buildings = [];
		for ( key in data ) {
			buildings.push(
				Building.createFromStorage(key, data[key]) );
		}

		buildings = this.filter.filter( buildings, Building.now() );
		spec = makeSpec.call( this, buildings );
		this.table.refresh( spec, buildings );
		this.table.sort( this.sortId, this.sortAsc );

		console.log( 'applyFilter', this );

		if ( callback )
			callback( this );
	}
}

// Called in the context of the BKTable.  Set properties nowDate and now, for
// use in spec functions.
function onTableRefresh() {
	this.nowDate = new Date();
	this.now = Building.seconds( this.nowDate.getTime() );
}

function onFilterInput( event ) {

	// Throttle the input: wait until the user hasn't typed anything for a
	// full second, before triggering a filter recompute.

	if ( this.filterTimeout )
		window.clearTimeout( this.filterTimeout );
	this.filterTimeout = window.setTimeout( doIt.bind(this), 1000 );

	function doIt() {
		this.filterTimeout = undefined;
		this.filter.parseQuery( event.target.value );
		applyFilter.call( this );
	}
}



// Private functions and utilities.



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
			td.textContent = formatTime( t, this.nowDate );
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
		cell: rCell( function( b ) { return b.ticksNow( this.now ); } ),
		sortId: 'now',
		sort: function( a, b ) {
			return a.ticksNow( this.now )
			     - b.ticksNow( this.now );
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

var grayIconSrc = chrome.extension.getURL( 'icons/mingray.svg' ),
    iconSrc = chrome.extension.getURL( 'icons/minus.svg' );

// Create the spec for the table, based on the current filter.

function makeSpec( buildings ) {
	var spec, before, after;

	spec = { columns: [] };

	if ( this.options.mode === 'compact' ) {
		before = [
			COLUMN_SPECS.coords, COLUMN_SPECS.type,
			COLUMN_SPECS.owner ],
		after = [ COLUMN_SPECS.time, COLUMN_SPECS.ticksNow ];
	}
	else {
		// Full
		before = [
			COLUMN_SPECS.location, COLUMN_SPECS.type,
			COLUMN_SPECS.owner, COLUMN_SPECS.level
		];
		after = [
			COLUMN_SPECS.time, COLUMN_SPECS.ticksLeft,
			COLUMN_SPECS.ticksNow, COLUMN_SPECS.remove
		];
		spec.foot = foot;
	}

	// Add properties to the table for use in its spec functions
	this.table.totals = [];
	this.table.beforeTotals = before.length;
	this.table.afterTotals = after.length;
	this.table.commodities = getCommoditiesInUse( buildings );

	Array.prototype.push.apply( spec.columns, before );
	this.table.commodities.forEach( pushCommSpec );
	Array.prototype.push.apply( spec.columns, after );

	return spec;

	function pushCommSpec( commId ) {
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
// callbacks for each commodity (see BKTable).

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
