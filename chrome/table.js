// This is a generic sortable and filterable table controller.  It separates the
// DOM handling faff from our code that actually deals with data.

var BKTable = (function() {

// Constructor.
//
// Create a BKTable instance and associates it with a particular document.  A
// reference to the document is kept in the `doc` instance property.  Basic DOM
// elements for the table are created here, too, and references are kept in the
// `elements` instance property.  These are not attached to the document,
// though; that should be done after the table is created, with something like:
//
//   someNode.appendChild( tableInstance.elements.container ).
//
// `options`, if supplied, is an object.  Options property `defaultSortId`
// provides a fallback id to use by BKTable.prototype.sort in case the id passed
// there is not recognised.  Options properties `id` and `className` set the DOM
// id and class name of the container element.  Options property `noFooter`, if
// true, specifies that a table footer will never be needed so no TFOOT element
// should be created.
//
// A reference to the options object is kept in the `options` instance property,
// so it may be accessed by spec functions (see below).
//
// After the table is created, property `onRefresh' may be set directly on the
// instance, containing a function to be called when the table refreshes (before
// any spec functions are called).  Propery `onSort` may be set on the instance,
// containing a function to be called after the table is sorted.  Additional
// instance properties may be set so that spec functions may access them.

function BKTable( document, options ) {
	var elements;

	this.options = options || {};
	this.doc = document;

	elements = {
		container: this.doc.createElement('div'),
		table: this.doc.createElement('table'),
		head: this.doc.createElement('thead'),
		rows: this.doc.createElement('tbody')
	};

	if( this.options.id )
		elements.container.id = this.options.id;
	if( this.options.className )
		elements.container.className = this.options.className;

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

// Prepares the table to display a collection of items.  This does not construct
// the DOM table yet, that happens in BKTable.prototype.sort.
//
// `spec` is an object one or two properties: `columns`, an array of column
// specifications; and an optional `foot`, a function that canstructs a table
// footer.  `items` is an array of arbitrary objects.
//
// Column specifications are objects with the following properties:
//
// `header`: a function that sets up the TH element for the title of the column.
// This function receives the TH element already created, and should set its
// textContent, and possibly className and whatever else is needed.  It will be
// called once when creating the table's header.
//
// `cell`: a function that sets up the TD for this column's cell in a row.  When
// called, this function receives TWO parameters: the item that is being
// displayed in the row, and the TD element already created.  It should set the
// TD's textContent, className, whatever else is needed.  This function is
// called once for every row in the table.
//
// `sortId` is an optional string.  If given, the column is sortable, and this
// column's criterion can be selected by passing the key to
// BKTable.prototype.sort.
//
// `sort` is a function that compares two Building instances, according to this
// column's sort criterion.  Return negative, zero, or positive, as usual.
//
// `initDesc` is an optional flag that specifies that, when sorting by this
// column for the first time, the order should be descending.  Further sorts by
// the same column will switch direction as usual, this just sets the initial
// direction.
//
// All functions in the spec are called with `this` set to the BKTable instance.
// So one can set custom properties in the BKTable instance, and refer to them
// from the various spec functions.

// XXX - move makeHead to sort
// XXX - filters go here

BKTable.prototype.refresh = function( spec, items ) {
	this.items = items;
	this.spec = spec;
	this.sorts = {};
	this.needFoot = !!spec.foot;

	clearElement( this.elements.rows );
	clearElement( this.elements.head );
	if ( !this.options.noFooter )
		clearElement( this.elements.foot );

	if ( this.onRefresh )
		this.onRefresh.call( this );

	makeHead.call( this );
}

// Sort the table and rebuild its DOM.  This is the actual function that creates
// a visible table.  `asc` is optional.

BKTable.prototype.sort = function( sortId, asc ) {
	var sort, fn;

	if ( this.sortId !== undefined )
		this.sorts[ this.sortId ].th.classList.remove( 'asc', 'dsc' );

	sort = this.sorts[ sortId ];
	if ( sort === undefined ) {
		sortId = this.options.defaultSortId;
		sort = this.sorts[ sortId ];
	}

	if ( asc === undefined ) {
		if ( this.sortId === sortId )
			this.sortAsc = !this.sortAsc;
		else
			this.sortAsc = sort.initAsc;
	}
	else
		this.sortAsc = asc;
	this.sortId = sortId;

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



// Private functions and utilities.
//
// Functions below using `this` are called in the context of a BKTable instance.



// Make the single row of the table header.  Assume thead is already empty.

function makeHead() {
	var tr =  this.doc.createElement( 'tr' );
	this.spec.columns.forEach( makeTH.bind(this) );
	this.elements.head.appendChild( tr );

	function makeTH( spec ) {
		var th, sortId;

		th = this.doc.createElement( 'th' );
		spec.header.call( this, th );

		if ( spec.sortId ) {
			th.classList.add( 'sort' );
			th.dataset.sort = spec.sortId;
			this.sorts[ spec.sortId ] = {
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
	var target, sortId;

	// The target may be the TH, or it may be the IMG we tuck inside the
	// TH.

	target = event.target;
	while ( (sortId = target.dataset.sort) === undefined &&
		target !== event.currentTarget &&
		target.parentElement !== null ) {
		target = target.parentElement;
	}

	if ( sortId === undefined )
		return;

	event.stopPropagation();
	this.sort( sortId );
	if ( this.onSort )
		this.onSort.call( this );
}

function clearElement( element ) {
	while ( element.firstChild )
		element.removeChild( element.firstChild );
}

return BKTable;

})();
