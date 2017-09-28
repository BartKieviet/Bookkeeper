// This is a generic sortable and filterable table controller.  It separates the
// DOM handling faff from our code that actually deals with data.

var BKTable = (function() {



// ## 1. Methods



// Constructor.
//
// Options is an object with a property `ukey` that should be 'A', 'O', 'P' as
// usual.  An optional `mode` property sets specific behaviour that I'll
// document later.
//
// This associates the BKTable instance with a particular document.  A reference
// to this document is kept by this instance for all further DOM operations.
// Basic DOM elements for the table are created here, too, but they are NOT
// attached to the document's DOM.  That should be done after the table is
// created, with something like:
//
//   someNode.appendChild( tableInstance.elements.container ).

// XXX

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

// XXX document options.id, options.defaultSortKey

function BKTable( options, document ) {
	var elements;

	this.options = options;
	this.doc = document;

	elements = {
		container: this.doc.createElement('div'),
		table: this.doc.createElement('table'),
		head: this.doc.createElement('thead'),
		rows: this.doc.createElement('tbody')
	};

	if( this.options.id )
		elements.container.id = this.options.id;

	elements.table.appendChild( elements.head );
	elements.table.appendChild( elements.rows );
	if( !this.options.noFooter ) {
		elements.foot = this.doc.createElement('tfoot')
		elements.table.appendChild( elements.foot );
	}
	elements.container.appendChild( elements.table );

	elements.head.addEventListener(
		'click', onHeaderClick.bind(this), false );

	this.elements = elements;
}

// Fetches configuration and data from storage and recomputes the whole table.
// Call this when the filter changes.  This does not redisplay the table yet,
// that happens in `sort` below.

// XXX - filters go here

BKTable.prototype.refresh = function( spec, items ) {
	this.items = items;
	this.spec = spec;
	this.sorts = {};
	this.now = new Date();
	this.needFoot = !!spec.foot;

	clearElement( this.elements.rows );
	clearElement( this.elements.head );
	if ( !this.options.noFooter )
		clearElement( this.elements.foot );

	makeHead.call( this );
}

// Sort the table and redisplay it.  This is the actual function that creates a
// visible table.  `asc` is optional.

BKTable.prototype.sort = function( sortKey, asc ) {
	var sort, fn;

	if ( this.sortKey !== undefined )
		this.sorts[ this.sortKey ].th.classList.remove( 'asc', 'dsc' );

	sort = this.sorts[ sortKey ];
	if ( sort === undefined ) {
		sortKey = this.options.defaultSortKey;
		sort = this.sorts[ sortKey ];
	}

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

	this.items.sort( fn.bind(this) );

	clearElement( this.elements.rows );
	makeRows.call( this );

	if ( this.needFoot ) {
		this.spec.foot.call( this );
		this.needFoot = false;
	}
}



// ## 3. Private functions and stuff.
//
// Functions below using `this` are called in the context of an BKTable
// instance.



// Make the single row of the table header.  Assume thead is already empty.

function makeHead() {
	var tr =  this.doc.createElement( 'tr' );
	this.spec.columns.forEach( makeTH.bind(this) );
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

// Make a row per item, and TD elements for each row according to spec.  Assume
// tbody is already empty.

function makeRows() {
	var doc, rows;

	this.items.forEach( addRow.bind(this) );

	function addRow( item ) {
		var tr =  this.doc.createElement( 'tr' );
		//tr.dataset.loc = building.loc; // XXX
		this.spec.columns.forEach( makeTD.bind(this) );
		this.elements.rows.appendChild( tr );

		function makeTD( colspec ) {
			var td = this.doc.createElement( 'td' );
			colspec.cell.call( this, item, td );
			tr.appendChild( td );
		}
	}
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

return BKTable;

})();
