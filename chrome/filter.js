// From other files
var Building, Sector;

var Filter = (function() {

// Lazily initialised by getBuildingTypeId
var BUILDING_IDS;

function Filter() {
	reset.call(this);
	this.filtering = false;
}



// Methods.



// Utility function to compute Manhattan distances between two points.  If you
// need to do that, might as well use this and know you're doing it just like
// the filter (not that this is a hard function to implement, ha).

Filter.distance = function( x1, y1, x2, y2 ) {
	return Math.max( Math.abs(x2 - x1), Math.abs(y2 - y1) );
}



// Instance methods.



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

	if ( !this.filtering )
		result = buildings;
	else
		result = buildings.filter( testBuilding.bind(this) );

	this.resultCount = result.length;
	this.matchedOwners = dedupe( this.matchedOwners );
	this.matchedSectors = dedupe( this.matchedSectors );
	this.singleSector = singleSector( result );
	if ( !this.singleSector )
		this.coords = undefined;

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
			match = testStrings.call( this );

		// Include the building if it was accepted by some rule.

		return match;

		function testStrings() {
			var sector, ownerMatch, sectorMatch;

			sector = Sector.getName(building.sectorId);
			this.strings.forEach( testString.bind(this) );

			return ownerMatch || sectorMatch;

			function testString( s ) {
				if ( building.owner !== undefined &&
				     building.owner.toLowerCase().includes(s) ) {
					this.matchedOwners.push(building.owner);
					ownerMatch = true;
				}

				if ( sector !== undefined &&
				     sector.toLowerCase().includes(s) ) {
					this.matchedSectors.push( sector );
					sectorMatch = true;
				}
			}
		}

	}
}

// Construct an English description of the last filter operation.

Filter.prototype.makeHumanDescription = function() {
	var parts;

	if ( !this.filtering )
		return 'Showing all tracked buildings.';

	parts = [ 'Showing' ];

	if ( this.btypes.length === 0 )
		parts.push( 'buildings' );
	else
		parts.push( humanBTypes(this.btypes) );

	if ( this.resultCount > 0 ) {
		// If we found results, and there were strings to match, then
		// each string must have matched at least one sector or
		// building.
		if ( this.strings.length > 0 )
			parts.push( ownerSectorPart.call(this) );
	}
	else {
		// If nothing matched, and there were strings to search, then
		// add that so the user knows why their query had no matches.
		if ( this.strings.length > 0 ) {
			parts.push( 'matching '
				  + humanEnumeration(
					  this.strings.map(
						  function(s) {
							  return quote(s);
						  } ) )
				  );
		}
	}

	if ( this.ticks !== undefined )
		parts.push( humanTicks(this.ticks) );

	return parts.join( ' ' ) + '.';

	function ownerSectorPart() {
		var parts = [];

		// XXX this will change with coords
		if ( this.matchedSectors.length > 0 ) {
			parts.push( 'in '
				  + humanEnumeration(
					  this.matchedSectors, 'or') );
		}

		if ( this.matchedOwners.length > 0 ) {
			parts.push( 'owned by '
				  + humanEnumeration(
					  this.matchedOwners, 'or') );
		}

		return parts.join( ' or ' );
	}
}

// If the Filter has coordinates, then return the Manhattan distance from the
// filter coords to the given point.  It'll error if no coords, so check first.

Filter.prototype.distance = function( x, y ) {
	return Filter.distance( this.coords.x, this.coords.y, x, y );
}



// Private methods and utilities.




// Set all instance properties to initial values.  Except `filtering`, that one
// is set in either constructor or parseQuery.

function reset() {
	this.coords = undefined;
	this.ticks = undefined;
	this.tags = [];
	this.btypes = [];
	this.strings = [];
	this.matchedSectors = [];
	this.matchedOwners = [];
	this.resultCount = NaN;
	this.singleSector = undefined;
}

function humanBTypes( btypes ) {
	return humanEnumeration( btypes.map(pluralName) );

	function pluralName( typeId ) {
		return plural( Building.getTypeName(typeId) );
	}
}

function humanTicks( n ) {
	if ( n === 0 )
		return 'without upkeep';
	if ( n === 1 )
		return 'without upkeep or with one tick of upkeep remaining';
	return 'with ' + n + ' or fewer ticks of upkeep remaining';
}

function humanEnumeration( things, conjunction ) {
	if ( things.length === 0 )
		return null;

	if ( things.length === 1 )
		return things[0];

	if ( conjunction === undefined )
		conjunction = ' and ';
	else
		conjunction = ' ' + conjunction + ' ';

	if ( things.length === 2 )
		return things.join( conjunction );
	return [ things.slice(0, -1).join(', '), things[things.length-1] ].
		join( ',' + conjunction );
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

// Test if all buildings in the collection are in the same sector.

function singleSector( buildings ) {
	var id;

	if ( buildings.length === 0 )
		return false;

	id = buildings[0].sectorId;
	return buildings.every( function(b) { return b.sectorId === id } );
}

// Remove duplicates from an array.

function dedupe( a ) {
	var dic = {};
	a.forEach( function( item ) { dic[ item ] = true; } );
	return Object.keys( dic );
}

// Add quotes to a string. This is flaky and just for display, don't rely on it.
function quote( s ) {
	var q = s.indexOf( '"' ) === -1 ? '"' : "'";
	return q + s + q;
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

function plural( s ) {
	var p = PLURALS[s];
	if ( p )
		return p;
	return s + 's';
}

return Filter;

})();
