var Building; // from building.js
var Commodities; // from commodity.js
var CalendarNames; // from functions.js
var Sector; // from sector.js

var Overview = (function() {

var ROWSPEC = {
	location: {
		header: simpleHeader( 'loc', 'Location' ),
		cell: simpleCell( function( b ) {
			var coords = Sector.getCoords( b.sectorId, b.loc );
			return Sector.getName( b.sectorId ) +
				' [' + coords.x + ',' + coords.y + ']';
		} )
	},

	locationNav: {
		// This one is useful when we filtered by sector: show only coords.
		header: simpleHeader( 'loc', 'Loc' ),
		cell: rCell( function( b ) {
			var coords = Sector.getCoords( b.sectorId, b.loc );
			return coords.x + ',' + coords.y;
		} )
	},

	type: {
		header: simpleHeader( 'typ', 'Type' ),
		cell: simpleCell( function( b ) { return b.getTypeShortName() } )
	},
	owner: {
		header: simpleHeader( 'own', 'Owner' ),
		cell: simpleCell( function( b ) { return b.owner } )
	},
	level: {
		header: simpleHeader( 'lvl', 'Lvl' ),
		cell: rCell( function( b ) { return b.level || '?' } )
	},
	time: {
		header: simpleHeader( 'tm', 'Time' ),
		cell: rCell( function( b ) { return formatTime( b.time * 1000 ); } )
	},
	ticksLeft: {
		header: simpleHeader( 'tk', 'Tick' ),
		cell: rCell( function( b ) { return b.ticksLeft; } )
	},
	ticksNow: {
		header: simpleHeader( 'now', 'Now' ),
		cell: rCell( function( b, now ) { return b.ticksNow( now ); } )
	}
}

// The following three funcs are used in the initialisation of the catalogue
// above.  These are functions that construct functions.  Yes, I know, black
// magic, I'm sorry :(

function simpleHeader( key, legend ) {
	return function( th ) {
		th.textContent = legend;
		th.dataset.col = key;
	};
}

function simpleCell( fn ) {
	return function( now, building, td ) {
		td.textContent = fn.call( this, building );
	}
}

function rCell( fn ) {
	return function( now, building, td ) {
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

Overview.prototype.bindToDocument = function( doc, callback ) {
	var keys;

	if ( this.doc !== undefined )
		throw 'Overview instance already bound!';

	this.doc = doc;

	keys = [ this.sortCritKey, this.sortAscKey ];

	// If we're embedded in nav, then we won't show a location column by
	// default; rather, we'll fetch the current sector from storage.
	if ( this.mode === 'nav-embedded' )
		keys.push( 'sector' );

	chrome.storage.local.get( keys, onStorageData.bind(this) );

	function onStorageData( data ) {
		var sckey = data[ this.sortCritKey ];
		if ( ROWSPEC[sckey] === null )
			this.sortCrit = 'time';
		else
			this.sortCrit = sckey;
		this.sortAsc = !!data[ this.sortAscKey ];
		this.sector = data.sector;
		this.sectorId = Sector.getId( this.sector );
		makeUI.call( this );
		callback();
	}
}

Overview.prototype.refresh = function( callback ) {
	var list;

	// First, get fresh data from storage.
	chrome.storage.sync.get( this.ukey, onHaveListData.bind(this) );

	function onHaveListData( data ) {
		list = data[ this.ukey ].map( bkey.bind(this) );
		// Fetch all buildings
		chrome.storage.sync.get( list, onHaveBuildingData.bind(this) );
	}

	function bkey( loc ) {
		return this.ukey + loc;
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

		clearElement( this.elements.rows );
		clearElement( this.elements.foot );
		clearElement( this.elements.head );

		makeRowSpec.call( this );
		makeHead.call( this );
		makeRows.call( this );

		if ( callback )
			callback();
	}
}

function makeRowSpec() {
	var rowSpec;

	// XXX - we'll change this when filtering

	rowSpec = [];
	this.rowSpec = rowSpec;
	this.commodities = getCommoditiesInUse( this.buildings );

	rowSpec.push(
		ROWSPEC.locationNav, ROWSPEC.type, ROWSPEC.owner, ROWSPEC.level );
	this.commodities.forEach( pushComm );
	rowSpec.push( /*ROWSPEC.time,*/ ROWSPEC.ticksLeft, ROWSPEC.ticksNow );

	function pushComm( commId ) {
		rowSpec.push( {
			header: makeCommHeaderFn( commId ),
			cell: makeCommCellFn( commId )
		} );
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
	}
}

// And another.  The returned function will be called whenever overview wants to
// render a commodity cell.  It will be called with `this` set to the Overview
// instance.

function makeCommCellFn( commId ) {
	return function( now, building, td ) {
		var comm, n;

		comm = Commodities.getCommodity( commId );

		if ( building.isUpkeep( commId ) &&
		     building.toBuy[commId] !== undefined ) {
			n = -building.toBuy[ commId ];
		}
		else if ( building.forSale[commId] !== undefined ) {
			n = building.forSale[ commId ];
		}

		if ( n !== undefined ) {
			td.textContent = n;
			td.title = comm.n;
			td.className = 'c';
			if ( n > 0 )
				td.classList.add( 'lime' );
			else if ( n < 0 )
				td.classList.add( 'pink' );

			//sums [j] += parseInt(n);
		}
	};
}

// Called with `this` set as an Overview instance
function makeUI() {
	var elements = {
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

	this.elements = elements;
}

// Construct the TH elements in the table head.  Assume the row is already empty.
// Called with `this` set as an Overview instance
function makeHead() {
	var tr =  this.doc.createElement( 'tr' );
	this.rowSpec.forEach( makeTH.bind(this) );
	this.elements.head.appendChild( tr );

	function makeTH( spec ) {
		var th = this.doc.createElement( 'th' );
		spec.header.call( this, th );
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
			spec.cell.call( this, now, building, td );
			tr.appendChild( td );
		}
	}
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

	overview.bindToDocument( document, function() {
		document.body.appendChild( overview.elements.container );
		overview.refresh();
		console.log( 'overview bound', overview );
	} );
}
