// From other files
var Building, Sector;

var Filter = (function() {

// Lazily initialised by getBuildingTypeId
var BUILDING_IDS;

function Filter() {
	reset.call(this);
	this.filtering = false;
}

// Parse a query.  Return true if the query was understood.
//
// A query is a string of tokens separated by white space.  Tokens can be:
//
// * A coordinate pair: 8,23.  Spaces are allowed around the comma; it's still a
//   single token.
// * A number: 123.
// * A tag: #x, where x is any sequence of non-space characters.
// * A word: any sequence of non-space characters.
// * A quoted string: "hello world" or 'bla bla'
//
// Words and strings of length one are ignored.
//
// The matching rules are:
//
// * Coordinates don't actually match or reject anything but, if supplied, they
//   can be used by the overview code to display a "distance" column.  Only one
//   coordinate pair is used in a query; if more are given, all but one are
//   ignored.  If a query matches buildings in more than one sector, all
//   coordinates are ignored.
//
// * Numbers are assumed to be a search for buildings with ticks remaining now
//   less or equal than the number.  If more than one number is given, then the
//   largest one is used.
//
// * Searches that include tags match only buildings thusly tagged.
//
// * Strings and words that exactly match the short name of a building type,
//   case insensitive, are assumed to be searches for buildings of that type.
//   If more than one type is given, the filter matches buildings of any of the
//   given types.
//
// * Strings and words that are not building types are assumed to be either
//   sector or owner searches.  The filter will match any building where either
//   the sector name or the owner's name contain any of the given strings, case
//   insensitive.

function reset() {
	this.coords = undefined;
	this.ticks = undefined;
	this.tags = [];
	this.btypes = [];
	this.strings = [];
}

Filter.prototype.parseQuery = function( q ) {
	var m, numbers;

	reset.call( this );
	numbers = [];

	while ( q.length > 0 ) {
		m = /^\s*(?:(\d+)\s*,\s*(\d+)|(\d+)|#(\S+)|"([^"]*)"|'([^']*)'|(\S+))/.exec( q );
		if ( !m )
			break;

		if ( m[1] )
			this.coords = coords( m[1], m[2] );
		else if ( m[3] )
			numbers.push( parseInt(m[3]) );
		else if ( m[4] )
			this.tags.push( m[4] );
		else if ( m[5] )
			pushstr.call( this, m[5] );
		else if ( m[6] )
			pushstr.call( this, m[6] );
		else
			pushstr.call( this, m[7] );

		q = q.substr( m[0].length );
	}

	if ( numbers.length > 0 )
		this.ticks = Math.max.apply( null, numbers );

	this.filtering =
		this.coords !== undefined || this.ticks !== undefined ||
		this.tags.length > 0 || this.btypes.length > 0 ||
		this.strings.length > 0;
	return this.filtering;

	function coords( x, y ) { return { x: parseInt(x), y: parseInt(y) } }
	function pushstr( s ) {
		var id;
		if ( s.length < 2 )
			return;
		s = s.toLowerCase();
		id = getBuildingTypeId( s );
		if ( id !== undefined )
			this.btypes.push( id );
		else
			this.strings.push( s );
	}
}

// Scan a list of buildings and figure out which match the filter.

Filter.prototype.filter = function( buildings, now ) {
	var result;
	if ( this.filtering )
		result = buildings.filter( testBuilding.bind(this) );
	else
		result = buildings;
	return result;

	// end of compute(), below are function defs

	function testBuilding( building ) {
		var match;

		// We check the filter conditions here.  Note we keep looking
		// until we know for sure that a building is rejected.

		if ( this.ticks !== undefined )
			match = building.ticksNow(now) <= this.ticks;
		if ( match !== false && this.tags.length > 0 )
			match = this.tags.includes( building.tag );
		if ( match !== false && this.btypes.length > 0 )
			match = this.btypes.includes( building.typeId );
		if ( match !== false && this.strings.length > 0 )
			match = this.strings.some( checkString.bind(this) );

		// Include the building if it was accepted by some rule.

		return match;

		function checkString( building, s ) {
			var sector;
			if ( building.owner !== undefined &&
			     building.owner.toLowerCase().includes(s) )
				return true;
			sector = Sector.getName(building.sectorId);
			if ( sector !== undefined &&
			     sector.toLowerCase().includes(s) )
				return true;
			return false;
		}
	}
}

// Assume s is lower case.
function plural( s ) {
	var p = PLURALS[s];
	if ( p )
		return p;
	return s + 's';
}

// Search for a building type whose short name is the given string, case
// insensitive.  If a type is found, return its id; otherwise return undefined.
// Assume `s` is lower-case.
//
// This could be a method of Building but, since it's unlikely any other code
// will need it, it's defined here instead.

function getBuildingTypeId( s ) {
	if ( BUILDING_IDS === undefined ) {
		BUILDING_IDS = Building.CATALOGUE.reduce(
			function( dict, btype, id ) {
				dict[ btype.s.toLowerCase() ] = id;
				return dict;
			},
			{}
		);
	}

	return BUILDING_IDS[ s ];
}

// Because we don't want to say factorys in public.

var PLURALS = {
	'Battleweapons Factory': 'Battleweapons Factories',
	'Brewery': 'Breweries',
	'Chemical Laboratory': 'Chemical Laboratories',
	'Droid Assembly Complex': 'Droid Assembly Complexes',
	'Electronics Facility': 'Electronics Facilities',
	'Handweapons Factory': 'Handweapons Factories',
	'Leech Nursery': 'Leech Nurseries',
	'Medical Laboratory': 'Medical Laboratories',
	'Neural Laboratory': 'Neural Laboratories',
	'Plastics Facility': 'Plastics Facilities',
	'Robot Factory': 'Robot Factories',
	'Smelting Facility': 'Smelting Facilities'
};

return Filter;

})();
