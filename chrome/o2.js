var Building; // from building.js
var Commodities; // from commodity.js
var CalendarNames; // from functions.js
var Sector; // from sector.js

var Overview = (function() {

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
	// coords, and don't bother doing the sector name comparison in sort.
	locationNav: {
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
		header: simpleHeader( 'Time' ),
		cell: rCell(
			function( b ) { return formatTime( b.time * 1000 ); } ),
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

// Constructor

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
		this.now = Building.now();

		clearElement( this.elements.rows );
		clearElement( this.elements.foot );
		clearElement( this.elements.head );

		makeRowSpec.call( this );
		makeHead.call( this );

		if ( callback )
			callback();
	}
}

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
}

function makeRowSpec() {
	// XXX - we'll change this when filtering

	this.rowSpec = [];
	this.commodities = getCommoditiesInUse( this.buildings );
	this.sorts = {};

	this.rowSpec.push(
		ROWSPEC.locationNav, ROWSPEC.type, ROWSPEC.owner, ROWSPEC.level );
	this.commodities.forEach( pushComm.bind(this) );
	this.rowSpec.push(
		/*ROWSPEC.time,*/ ROWSPEC.ticksLeft, ROWSPEC.ticksNow );

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

// Construct the TH elements in the table head.  Assume the row is already empty.
// Called with `this` set as an Overview instance
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

// Construct the TD elements in the table row.  Assume the row is already empty.
// Called with `this` set as an Overview instance
function makeRows() {
	var now, doc, rows;

	now = Building.now();
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

// Another function that constructs a function.  The returned function will be
// called whenever overview wants to render the header of a commodity column.
// It will be called with `this` set to the Overview instance.

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

// And another.  The returned function will be called whenever overview wants to
// render a commodity cell.  It will be called with `this` set to the Overview
// instance.

function makeCommCellFn( commId ) {
	return function( building, td ) {
		var n = overviewFigure( building, commId );
		if ( n !== undefined ) {
			td.textContent = n;
			td.title = Commodities.getCommodity( commId ).n;
			td.className = 'c';
			if ( n > 0 )
				td.classList.add( 'lime' );
			else if ( n < 0 )
				td.classList.add( 'pink' );

			//sums [j] += parseInt(n);
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

// Given a building `b` and a commodity `comm`, return the number to display in
// the overview table (negative upkeep, positive production, zero, or undefined
// if the building doesn't trade in that commodity.
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

// Return an object with two properties: `s` is a short form suitable for adding
// to a table cell; `l` is a long one suitable for the cell's title (so it shows
// on mouseover).

function formatTime( timestamp ) {
	var t = new Date( timestamp ),
	    now = Date.now(),
	    s;

	// If the date is old, we just display the day and month.
	// 432000000 is the number of milliseconds in five days.
	if ( now - timestamp > 432000000 ) {
		s = CalendarNames.MONTHS[ t.getMonth() ] + ' ' + t.getDate();
	}
	else {
		now = new Date( now );
		if ( now.getDate() == t.getDate() )
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

	return { s: s, l: t.toLocaleString() }

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
