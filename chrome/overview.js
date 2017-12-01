// From other scripts:
var Building, Commodities, CalendarNames, Sector, SortableTable, Filter;


// Overview is a UI component that contains a Filter and a SortableTable, and
// mediates the interaction between those.


var Overview = (function() {

// Construct a new Overview.  This creates the DOM element, but does not attach
// it to the document.  That should be done after the instance is configured,
// with something like:
//
//   someNode.appendChild( overviewInstance.container );
//
// `ukey` is a string specifying the one-letter universe key for storage.
// `options`, if supplied, provides some tweakable settings that one day I'll
// document.

var Overview = function( ukey, document, options ) {
	var storageKey, div;

	if ( !options )
		options = {};
	storageKey = options.storageKey || '';
	this.options = {
		ukey: ukey,
		mode: options.mode || 'full',
		storageKey: storageKey,
		filterKey: options.filterKey
			|| ukey + storageKey + 'Filter',
		sortIdKey: options.sortIdKey
			|| ukey + storageKey + 'OverviewSortCrit',
		sortAscKey: options.sortAscKey
			|| ukey + storageKey + 'OverviewSortAsc',
		projectionKey: options.projectionKey
			|| ukey + storageKey + 'Projection',
		psbFlag: options.psbFlag || false,
		amountFlag: options.amountFlag || false,
		buyPriceFlag: options.buyPriceFlag || false,
		sellPriceFlag: options.sellPriceFlag || false,
	};

	this.filter = new Filter();
	this.container = document.createElement( 'div' );
	this.container.className = 'bookkeeper-overview';

	div = document.createElement( 'div' );
	this.curPosIcon = makeIcon.call(
		this, 'pos', 'Set current position', onPosClick );
	div.appendChild( this.curPosIcon );
	this.filterInput = document.createElement( 'input' )
	div.appendChild( this.filterInput );
	this.clearIcon = makeIcon.call(
		this, 'clear', 'Clear filter', onClearClick );
	div.appendChild( this.clearIcon );
	this.projectionIcon = makeIcon.call(
		this, 'projoff', 'Toggle projection mode', onProjClick );
	div.appendChild( this.projectionIcon );
	
	if ( this.options.psbFlag ) {
		this.amountIcon = makeIcon.call(
			this, 'amountoff', 'Toggle amounts', onAmountClick );
		div.appendChild( this.amountIcon );
	}
	
	this.container.appendChild( div );

	this.filterInfo = document.createElement( 'p' );
	this.container.appendChild( this.filterInfo );

	this.sorTable = new SortableTable( document, {defaultSortId: 'time'} );
	this.sorTable.onRefresh = onTableRefresh;
	this.container.appendChild( this.sorTable.table );

	function makeIcon( cmd, title, handler ) {
		var img = document.createElement( 'img' );
		img.dataset.cmd = cmd;
		img.title = title;
		img.addEventListener( 'mouseover', onCmdMouseOver );
		img.addEventListener( 'mouseout', onCmdMouseOut );
		img.addEventListener( 'click', handler.bind(this) );
		setImgSrc( img, true );
		return img;
	}
}

// If the list of building ids in this universe is already available (like, it
// was needed for something else and fetched outside this object), then pass it
// here, it'll save a storage query.  Otherwise, we'll ask for it.

Overview.prototype.configure = function( universeList, callback ) {
	var keys, sortId, sortAsc, sector, sectorId;

	// Get data from local storage

	keys = [
		'sector',
		this.options.filterKey,
		this.options.sortIdKey,
		this.options.sortAscKey,
		this.options.projectionKey
	];
	chrome.storage.local.get( keys, onStorageLocalData.bind(this) );

	function onStorageLocalData( data ) {
		var query, sort;

		query = data[ this.options.filterKey ] || '';
		sort = {
			id: data[ this.options.sortIdKey ],
			asc: !!data[ this.options.sortAscKey ]
		};

		this.filterInput.value = query;
		this.currentSector = data.sector || '';
		this.currentSectorId = Sector.getId( this.currentSector );
		this.filter.parseQuery( query );
		this.projection = data[ this.options.projectionKey ];
		if ( this.projection === undefined )
			// default to on, to show off
			this.projection = true;

		// Build an example query
		this.filterInput.placeholder =
			'Search building types, sectors, owners, ticks' ;

		applyFilter.call(
			this, universeList, sort, onReady.bind(this) );
	}

	function onReady() {
		// At this point, the table is sorted by the initial sort.  Now
		// we want to be notified of any re-sorting.
		this.sorTable.onSort = onSort.bind( this );

		// And we want to know if the user types a filter
		this.filterTimeout = undefined;
		this.filterInput.addEventListener(
			'input', onFilterInput.bind(this), false );

		// Done. Call the caller if they asked for it.
		if ( callback )
			callback( this );
	}
}

function applyFilter( universeList, sort, callback ) {
	if ( universeList === undefined ) {
		// The usual case: get the building list from sync
		chrome.storage.sync.get(
			this.options.ukey, onHaveUniverseData.bind(this) );
	}
	else
		// Skip that sync.get
		fetchBuildingData.call( this );

	if ( sort === undefined )
		sort = { id: this.sorTable.sortId, asc: this.sorTable.sortAsc };

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
		var key, buildings, spec, table, now;

		buildings = [];
		for ( key in data ) {
			var temp = Building.createFromStorage(key, data[key]);

			if ( this.options.psbFlag && temp.psb ) {
				buildings.push( temp ); 
			} else if ( !this.options.psbFlag && !temp.psb ) {
				buildings.push( temp );	
			}
			
		}

		buildings = this.filter.filter( buildings, Building.now() );
		this.filterInfo.textContent =
			this.filter.makeHumanDescription();
		this.sorTable.coords = this.filter.coords;

		if ( this.projection ) {
			this.projectionIcon.dataset.cmd = 'projon';
			now = Building.now();
			buildings.forEach( function(b) { b.project(now); } );
		}
		else
			this.projectionIcon.dataset.cmd = 'projoff';

		if (this.options.psbFlag) {
			this.options.amountFlag ? this.amountIcon.dataset.cmd = 'amounton' : this.amountIcon.dataset.cmd = 'amountoff'; 
		}
		
		setImgSrc( this.projectionIcon );

		spec = makeSpec.call( this, buildings );
		this.sorTable.refresh( spec, buildings );
		this.sorTable.sort( sort.id, sort.asc );

		if ( callback )
			callback( this );
	}
}

// Called in the context of the SortableTable.  Set properties nowDate, now,
// coords, for use in spec functions.
function onTableRefresh() {
	this.nowDate = new Date();
	this.now = Building.seconds( this.nowDate.getTime() );
}

function onFilterInput( event ) {
	// Throttle the input: wait until the user hasn't typed anything for a
	// full second, before triggering a filter recompute.

	if ( this.filterTimeout )
		window.clearTimeout( this.filterTimeout );
	this.filterTimeout = window.setTimeout( setFilter.bind(this), 1000 );
}



// Private functions and utilities.



// Take the value of the filter input, and use it.

function setFilter() {
	var query, storageItems;

	query = this.filterInput.value;
	this.filter.parseQuery( query );
	if ( !this.filter.filtering )
		query = '';

	storageItems = {
		[ this.options.filterKey ]: query,
		[ this.options.projectionKey ]: this.projection,
		[ this.options.amountFlag ]: this.options.amountFlag,
		[ this.options.buyPriceFlag ]: this.options.buyPriceFlag,
		[ this.options.sellPriceFlag ]: this.options.sellPriceFlag
	};
	chrome.storage.local.set( storageItems );

	applyFilter.call( this );
}

// This is a catalogue of "column specifications", as expected by SortableTable.

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
		header: simpleHeader('Lvl'), //this.options.psbFlag ? simpleHeader( 'population') : simpleHeader( 'Lvl' ),
		cell: rCell( function( b ) { return b.level.toLocaleString('en') || '?' } ),
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
	
	credits: {
		header: function( th ) {
			th.textContent = 'Credits'; //insert icon later
			th.classList.add( 'r', 'credits');
		},
		cell: rCell( function ( b ) { return b.credits.toLocaleString('en') } ),
		sortId: 'credits',
		sort: function( a, b ) { return a.credits - b.credits; }
	},

	ticksLeft: {
		header: simpleHeader( 'Ticks' ),
		cell: function(b, td) {
			var n = b.getTicksLeft();
			td.textContent = n;
			td.className = 'r';
			if ( n === 0 )
				td.classList.add( 'red' );
			else if ( n === 1 )
				td.classList.add( 'yellow' );
		},
		sortId: 'tick',
		sort: function( a, b ) {
			return a.getTicksLeft() - b.getTicksLeft();
		}
	},
	
	ticksToDowngrade: {
		header: simpleHeader( 'DG in' ),
		cell: function( b, td ) {
			if ( b.getTypeShortName() === 'P' ) {
				var n = 0;
				if (b.level >= 30000) {
					n = Math.ceil( Math.log( 30000 / ( b.level * 1.012^( b.getTicksLeft() ) ) ) / Math.log( 15 / 16 ))
				} else if (b.level >= 15000) {
					n = Math.ceil( Math.log( 15000 / ( b.level * 1.012^( b.getTicksLeft() ) ) ) / Math.log( 15 / 16 ))
				} else if ( b.level >= 5000 ) {
					n = Math.ceil( Math.log( 5000 / ( b.level * 1.012^( b.getTicksLeft() ) ) ) / Math.log( 15 / 16 ))
				} else {
					n = Math.ceil( Math.log( 500 / ( b.level * 1.012^( b.getTicksLeft() ) ) ) / Math.log( 15 / 16 ))
				}
				td.textContent = n + b.getTicksLeft();
				td.className = 'r';
			}
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

// Create the spec for the table, based on the current filter.

function makeSpec( buildings ) {
	var spec, before, after;

	spec = { columns: [], foot: foot };
	before = [];
	after = [];

	// In compact mode, if all buildings are in the same sector, then we
	// want to show only cooords.
	if ( this.options.mode === 'compact' && this.filter.singleSector )
		before.push( COLUMN_SPECS.coords );
	else
		before.push( COLUMN_SPECS.location );

	// If we have coords, show a "distance" column.
	if ( this.filter.coords )
		before.push( makeDistanceSpec(this.filter) );

	// Always show type and owner.
	before.push( COLUMN_SPECS.type, COLUMN_SPECS.owner );

	// In full mode, show the level, too.
	if ( this.options.mode !== 'compact' )
		before.push( COLUMN_SPECS.level );

	// Always show the time
	after.push( COLUMN_SPECS.time );

	// Always show ticks
	after.push( COLUMN_SPECS.ticksLeft );

	// PSB option
	if ( this.options.psbFlag ) {
		after.push( COLUMN_SPECS.ticksToDowngrade );
		after.push( COLUMN_SPECS.credits );
	}
	
	// In full mode, show the "remove" button
	if ( this.options.mode !== 'compact' )
		after.push( COLUMN_SPECS.remove );
	
	// Add properties to the table for use in its spec functions
	this.sorTable.ukey = this.options.ukey;
	this.sorTable.totals = [];
	this.sorTable.beforeTotals = before.length;
	this.sorTable.afterTotals = after.length;
	this.sorTable.commodities = getCommoditiesInUse( buildings );

	Array.prototype.push.apply( spec.columns, before );
	this.sorTable.commodities.forEach( pushCommSpec.bind( this ) );
	Array.prototype.push.apply( spec.columns, after );

	return spec;

	function pushCommSpec( commId ) {
		spec.columns.push( {
			header: makeCommHeaderFn( commId ),
			cell: makeCommCellFn( commId, this.options ),
			sortId: commId,
			sort: makeCommSortFn( commId ),
			initDesc: true
		} );
	}
}

// Another three functs that construct functions.  They synthesise the spec
// callbacks for each commodity (see SortableTable).

function makeCommHeaderFn( commId ) {
	return function( th ) {
		var comm, img;

		comm = Commodities.getCommodity( commId );
		img = this.doc.createElement( 'img' );

		img.src = '//static.pardus.at/img/stdhq/res/'
			+ comm.i + '.png';
		img.title = comm.n;
		th.className = 'c';
		th.appendChild( img );
		th.dataset.sort = commId;
	}
}

function makeCommCellFn( commId , options ) {
	return function( building, td ) {
		var n = overviewFigure( building, commId, options );
		if ( n !== undefined ) {
			setCommodityTD( td, commId, n );
			if ( Number.isFinite(n) )
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

// Synthesise a "distance" column spec from the given filter

function makeDistanceSpec( filter ) {
	return {
		header: simpleHeader( 'Dis' ),
		cell: rCell( function( b ) {
			      b = Sector.getCoords( b.sectorId, b.loc );
			      return filter.distance( b.x, b.y )
		      } ),
		sortId: 'dst',
		sort: function( a, b ) {
			var r;
			// Sort by distance, then y, then x
			a = Sector.getCoords( a.sectorId, a.loc );
			b = Sector.getCoords( b.sectorId, b.loc );
			r = filter.distance( a.x, a.y ) -
				filter.distance( b.x, b.y );
			if ( r === 0 ) {
				r = a.y - b.y;
				if ( r === 0 )
					r = a.x - b.x;
			}
			return r;
		}
	}
}

function removeCell( building, td ) {
	var button;
	button = this.doc.createElement( 'img' );
	button.className = 'bookkeeper-small-button';
	button.dataset.cmd = 'remove';
	setImgSrc( button, true );
	button.dataset.loc = building.loc;
	button.addEventListener( 'click', onRemoveClick.bind(this) );
	button.addEventListener( 'mouseover', onCmdMouseOver );
	button.addEventListener( 'mouseout', onCmdMouseOut );
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
	Building.removeStorage( loc, this.ukey );
}

function onPosClick() {
	chrome.storage.local.get( [ 'sector', 'x', 'y' ], onData.bind(this) );

	function onData( data ) {
		if ( data.sector === undefined ||
		     data.x === undefined || data.y === undefined )
			return;

		this.filterInput.value = Filter.quoteIfNeeded( data.sector ) +
			' ' + data.x + ',' + data.y;
		setFilter.call( this );
	}
}

function onClearClick() {
	this.filterInput.value = '';
	setFilter.call( this );
}

function onProjClick() {
	this.projection = !this.projection;
	setFilter.call( this );
}

function onAmountClick() {
	this.options.amountFlag = !this.options.amountFlag;
	setFilter.call( this );
}

function onMoneyClick() {
	if (this.buyPriceFlag || this.sellPriceFlag ) {
		this.sellPriceFlag = !this.sellPriceFlag;
		this.buyPriceFlag = !this.buyPriceFlag;
	} else {
		this.sellPriceFlag = !this.sellPriceFlag;
	}
	setFilter.call( this );
}


function onCmdMouseOver( event ) { setImgSrc( event.target, false ); }
function onCmdMouseOut( event ) { setImgSrc( event.target, true ); }

function setImgSrc( img, dim ) {
	var cmd = img.dataset.cmd;
	if ( cmd ) {
		if ( dim )
			cmd += 'dim';
		img.src = chrome.extension.getURL( 'icons/' + cmd + '.svg' );
	}
}

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
	this.tfoot.appendChild( tr );

	// Arbitrary limit
	if ( this.items.length > 24 ) {
		tr = this.doc.createElement( 'tr' );
		for ( i = 0, end = columns.length; i < end; i++ ) {
			append( 'th' )
			columns[ i ].header.call( this, cell );
		}
		this.tfoot.appendChild( tr );
	}
}

function setCommodityTD( td, commId, n ) {
	td.textContent = Number.isFinite(n) ? n.toLocaleString('en') : '?';
	td.title = Commodities.getCommodity( commId ).n;
	td.className = 'c';
	if ( n > 0 )
		td.classList.add( 'lime' );
	else if ( n < 0 )
		td.classList.add( 'pink' );
}

// Given a building and commodity id, return the number to display in the
// overview table: negative upkeep, positive production, zero, or undefined if
// the building doesn't trade in that commodity.  Return -Infinity for upkeep
// values that cannot be projected; +Infinity for production values.  This so
// sorting is somewhat more meaningful, at least not completely broken by NaN.

function overviewFigure( building, commId, options ) {
	var n;
	if ( options.psbFlag ) {
		// PSB / Planet modes
		if ( options.amountFlag ) {
			n = building.getSelling()[ commId ] + building.minimum[ commId ]
		}
		if ( options.sellPriceFlag ) {
			n = building.getSellAtPrices()[ commId ];
		}
		if ( options.buyPriceFlag ) {
			n = building.getBuyAtPrices()[ commId ];
		}
		if ( n ) { 
			return n; 
		}
		
	}
	if ( building.isUpkeep( commId ) &&
	     (n = building.getBuying()[commId]) !== undefined )
		return isNaN(n) ? -Infinity : -n;

	if ( (n = building.getSelling()[commId]) !== undefined )
		return isNaN(n) ? Infinity : n;

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

// Called when the table is re-sorted, in the context of the Overview instance.

function onSort() {
	var items = {};
	items[ this.options.sortIdKey ] = this.sorTable.sortId;
	items[ this.options.sortAscKey ] = this.sorTable.sortAsc;
	chrome.storage.local.set( items );
}

return Overview;

})();
