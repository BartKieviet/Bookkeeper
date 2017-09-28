var Building; // from building.js
var Commodities; // from commodity.js
var CalendarNames; // from functions.js
var Sector; // from sector.js



// This is an almost generic sortable and filterable table controller.  It's
// still specific to sorting Building instances, but, if some day we need to
// make a table of something else, I'll go the last mile here and make it truly
// generic, a table of things.  ~V



var Overview = (function() {


// ## 1. Private definitions

// This below is a catalogue of _column specifications_ for the overview.  A
// column specification is an object with these properties:
//
// `header`: a function that sets up the TH for the title of the column.  This
// function receives the TH element already created, and should set its
// textContent, and possibly className and whatever else is needed.  It will be
// called once when creating the table's header.
//
// `cell`: a function that sets up the TD for this column's cell in a row.  When
// called, this function receives TWO parameters: the Building instance that is
// being displayed in the row, and the TD element already created.  It should
// set the TD's textContent, className, whatever else is needed.  This function
// is called once for every row in the table.
//
// `sortKey` is an optional string.  If given, the column is sortable, and this
// column's criterion can be selected by passing the key to
// Overview.prototype.sort.
//
// `sort` is a function that compares two Building instances, according to this
// column's sort criterion.  Return negative, zero, or positive, as usual.
//
// `initDesc` is an optional flag that specifies that, when sorting by this
// column for the first time, the order should be descending.  Further sorts by
// the same column will switch direction as usual, this just sets the initial
// direction.
//
// All callbacks in the spec are called with `this` set to the Overview
// instance.  One can e.g. refer to `this.now` within them, and get the time at
// which the overview table refresh started.
//
// Not every item in this catalogue is used every time.  The Overview table
// chooses the appropriate ones at refresh, depending on the current filtering
// and mode, and that determines completely the layout of the table.
//
// Commodity columns get synthesised specs, they don't appear in this catalogue.

var ROWSPEC = {
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
			td.textContent = formatTime( t, this.dateNow );
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
		cell: rCell( function( b ) { return b.ticksNow( this.now ); } ),
		sortKey: 'now',
		sort: function( a, b ) {
			return a.ticksNow(this.now) - b.ticksNow(this.now);
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



// ## 2. Methods



// Constructor.
//
// Options is an object with a property `ukey` that should be 'A', 'O', 'P' as
// usual.  An optional `mode` property sets specific behaviour that I'll
// document later.

function Overview( options ) {
	this.ukey = options.ukey;
	this.mode = options.mode;

	if ( this.mode === 'nav-embedded' ) {
		this.sortCritKey = this.ukey + 'NavOverviewSortCrit';
		this.sortAscKey = this.ukey + 'NavOverviewSortAsc';
	}
	else {
		this.sortCritKey = this.ukey + 'OverviewSortCrit';
		this.sortAscKey = this.ukey + 'OverviewSortAsc';
	}
}

// This associates the Overview instance with a particular document.  A
// reference to this document is kept by this instance for all further DOM
// operations.  Basic DOM elements for the table are created here, too, but they
// are NOT attached to the document's DOM.  That should be done after this call,
// with something like:
//
//   someNode.appendChild( overviewInstance.elements.container ).

Overview.prototype.bindToDocument = function( doc ) {
	var elements;

	if ( this.doc !== undefined )
		throw 'Overview instance already bound!';

	this.doc = doc;

	elements = {
		container: this.doc.createElement('div'),
		table: this.doc.createElement('table'),
		head: this.doc.createElement('thead'),
		rows: this.doc.createElement('tbody'),
		foot: this.doc.createElement('tfoot')
	};

	elements.container.id = 'overview';

	elements.table.appendChild( elements.head );
	elements.table.appendChild( elements.rows );
	elements.table.appendChild( elements.foot );
	elements.container.appendChild( elements.table );

	elements.head.addEventListener(
		'click', onHeaderClick.bind(this), false );

	this.elements = elements;
}

// Fetches configuration and data from storage and recomputes the whole table.
// Call this when the filter changes.  This does not redisplay the table yet,
// that happens in `sort` below.
//
// This returns immediately, then the callback is called when ready to display.
// It may take a bit.

Overview.prototype.refresh = function( callback ) {
	var keys, list;

	// First, get data from local storage.

	keys = [ 'sector', this.sortCritKey, this.sortAscKey ];
	chrome.storage.local.get( keys, onStorageLocalData.bind(this) );

	function onStorageLocalData( data ) {
		var sckey = data[ this.sortCritKey ];
		if ( ROWSPEC[sckey] === null )
			this.sortCrit = 'time';
		else
			this.sortCrit = sckey;
		this.sortAsc = !!data[ this.sortAscKey ];
		this.sector = data.sector;
		this.sectorId = Sector.getId( this.sector );

		// Now get the building list from sync

		chrome.storage.sync.get( this.ukey, onHaveListData.bind(this) );
	}

	function onHaveListData( data ) {

		// Now fetch all buildings
		list = data[ this.ukey ];
		if ( list && list.length > 0 ) {
			list = list.map( bkey.bind(this) );
			chrome.storage.sync.get( list, onHaveBuildingData.bind(this) );
		}
		// XXX - should show something, "no elements to display" or whatever

		function bkey( loc ) { return this.ukey + loc; }
	}

	function onHaveBuildingData( data ) {
		var key, bldgs;

		bldgs = [];
		for ( key in data ) {
			// XXX - we'll insert the filter here
			bldgs.push(
				Building.createFromStorage(key, data[key]) );
		}

		this.list = list;
		this.buildings = bldgs;
		this.needFoot = true;
		this.now = Building.now();

		// Set this so we don't have spec functions creating thousands
		// of these if they need it.
		this.dateNow = new Date( this.now * 1000 );

		clearElement( this.elements.rows );
		clearElement( this.elements.foot );
		clearElement( this.elements.head );

		makeRowSpec.call( this );
		makeHead.call( this );

		if ( callback )
			callback();
	}
}

// Sort the table and redisplay it.  This is the actual function that creates a
// visible table.  `asc` is optional.

Overview.prototype.sort = function( sortKey, asc ) {
	var sort, fn;

	if ( this.sortKey !== undefined )
		this.sorts[ this.sortKey ].th.classList.remove( 'asc', 'dsc' );

	sort = this.sorts[ sortKey ];

	if ( asc === undefined ) {
		if ( this.sortKey === sortKey )
			this.sortAsc = !this.sortAsc;
		else
			this.sortAsc = sort.initAsc;
	}
	else
		this.sortAsc = asc;
	this.sortKey = sortKey;

	if ( this.sortAsc ) {
		fn = sort.fn;
		sort.th.classList.add( 'asc' );
	}
	else {
		fn = function(a, b) { return -sort.fn.call(this, a, b) };
		sort.th.classList.add( 'dsc' );
	}

	this.buildings.sort( fn.bind(this) );

	clearElement( this.elements.rows );
	makeRows.call( this );
	if ( this.needFoot )
		makeFoot.call( this );
}



// ## 3. Private functions and stuff.
//
// Functions below using `this` are called in the context of an Overview
// instance.



function makeRowSpec() {
	// XXX - we'll change this when filtering

	this.rowSpec = [];
	this.commodities = getCommoditiesInUse( this.buildings );
	this.sorts = {};
	this.totals = [];

	this.rowSpec.push(
		ROWSPEC.coords, ROWSPEC.type, ROWSPEC.owner, ROWSPEC.level );
	this.commodities.forEach( pushComm.bind(this) );
	this.rowSpec.push(
		ROWSPEC.time, ROWSPEC.ticksLeft, ROWSPEC.ticksNow );

	// XXX - don't really have a clean abstract way of dealing with totals,
	// sadly.  It means there are 4 columns before the commodities.
	this.totalsSpanBefore = 4;
	this.totalsSpanAfter = 3;

	function pushComm( commId ) {
		this.rowSpec.push( {
			header: makeCommHeaderFn( commId ),
			cell: makeCommCellFn( commId ),
			sortKey: commId,
			sort: makeCommSortFn( commId ),
			initDesc: true
		} );
	}
}

// Another function that constructs a function.  This one makes the `header`
// function for the spec of a commodity column.

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

// And another.  This one makes the `cell` function for the spec of a commodity.

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

// One more.  Makes the `sort` function for the spec of a commodity.

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

// Make the single row of the table header.  Assume thead is already empty.

function makeHead() {
	var tr =  this.doc.createElement( 'tr' );
	this.rowSpec.forEach( makeTH.bind(this) );
	this.elements.head.appendChild( tr );

	function makeTH( spec ) {
		var th, sortKey;

		th = this.doc.createElement( 'th' );
		spec.header.call( this, th );

		if ( spec.sort ) {
			th.dataset.sort = spec.sortKey;
			this.sorts[ spec.sortKey ] = {
				th: th,
				fn: spec.sort.bind( this ),
				initAsc: !spec.initDesc
			}
		}

		tr.appendChild( th );
	}
}

// Make a row per building, and TD elements for each row according to spec.
// Assume tbody is already empty.

function makeRows() {
	var doc, rows;

	this.buildings.forEach( addRow.bind(this) );

	function addRow( building ) {
		var tr =  this.doc.createElement( 'tr' );
		tr.dataset.loc = building.loc;
		this.rowSpec.forEach( makeTD.bind(this) );
		this.elements.rows.appendChild( tr );

		function makeTD( spec ) {
			var td = this.doc.createElement( 'td' );
			spec.cell.call( this, building, td );
			tr.appendChild( td );
		}
	}
}

// Make the one or two rows in the table footer.  Assume tfoot is already empty.

function makeFoot() {
	var append, first, last, tr, cell, i, end, total, id;

	// save typing
	append = (function( tagName, className ) {
		       cell = document.createElement( tagName );
		       if ( className ) cell.className = className;
		       tr.appendChild( cell );
	       }).bind(this);

	first = this.totalsSpanBefore;
	last = this.rowSpec.length - this.totalsSpanAfter;

	tr = this.doc.createElement( 'tr' );
	append( 'td', 'r' );
	cell.colSpan = first;
	for ( i = first, end = last; i < end; i++ ) {
		append( 'td' );
		id = this.commodities[i-first];
		total = this.totals[ id ];
		if ( total !== undefined )
			setCommodityTD(
				cell, id, total );
	}
	append( 'td' );
	cell.colSpan = this.totalsSpanAfter;
	this.elements.foot.appendChild( tr );

	// Arbitrary limit
	if ( this.buildings.length > 24 ) {
		tr = this.doc.createElement( 'tr' );
		for ( i = 0, end = this.rowSpec.length; i < end; i++ ) {
			append( 'th' )
			this.rowSpec[ i ].header.call( this, cell );
		}
		this.elements.foot.appendChild( tr );
	}

	// Don't do this again until the next refresh.
	this.needFoot = false;
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

function onHeaderClick( event ) {
	var target, sort;

	// The target may be the TH, or it may be the IMG we tuck inside the
	// TH.

	target = event.target;
	while ( (sort = target.dataset.sort) === undefined &&
		target !== event.currentTarget &&
		target.parentElement !== null ) {
		target = target.parentElement;
	}

	if ( sort === undefined )
		return;

	event.stopPropagation();
	this.sort( sort );
}

function clearElement( element ) {
	while ( element.firstChild )
		element.removeChild( element.firstChild );
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

return Overview;

})();

// start of script execution (XXX we should move the above to its own file)

document.addEventListener( 'DOMContentLoaded', onDOM, false );

// end of script execution

function onDOM() {
	chrome.runtime.sendMessage( { op: 'queryPopUpData' }, onHaveOptions );
}

function onHaveOptions( opts ) {
	var overview = new Overview( opts );

	overview.bindToDocument( document );
	document.body.appendChild( overview.elements.container );
	overview.refresh( onFresh );

	function onFresh() {
		overview.sort( 'loc' );
	}
}
