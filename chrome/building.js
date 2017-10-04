// Instances of Building represent Pardus buildings.
//
// This script is self-contained; it doesn't rely on any other source.

var Building = (function() {

// Lazily initialised by getTypeId and getTypeIdByIcon

var NAME_IDS, ICON_IDS;

// Construct a new Building instance.
//
// You can supply as many parameters as you have data for, and/or use undefined
// for missing data.  Note though: the building will not be fully usable (some
// instance methods may fail) until at least properties `loc`, `sectorId`, and
// `typeId`, have been set.
//
// `loc`, `sectorId`, `typeId`, `time`, `level`, and `ticksLeft`, if provided,
// should be integers.
//
// `owner`, if provided, should be a string.
//
// `selling`, `buying`, `minimum`, and `maximum`, if provided, can be arrays or
// objects.  See makeCommodityArray below.
//
// Note that `time` is expected as a Unix timestamp in *seconds*, not
// milliseconds.  You can use Building.seconds to convert the result of
// Date.now().
//
// If you don't initialise the instance fully here, you can assign the missing
// properties to the instance later using the same names as these parameters.

function Building( loc, sectorId, typeId, time, owner, level, ticksLeft,
		   selling, buying, minimum, maximum ) {
	this.loc = loc;
	this.sectorId = sectorId;
	this.typeId = typeId;
	this.time = time || Building.now();
	this.owner = owner;
	this.level = level;
	this.ticksLeft = ticksLeft;
	this.selling = Building.makeCommodityArray( selling );
	this.buying = Building.makeCommodityArray( buying );
	this.minimum = Building.makeCommodityArray( minimum );
	this.maximum = Building.makeCommodityArray( maximum );
}



// 1. Properties and methods of the Building object.



// All the building types we care about.
//
// Don't change the order of this array; add new types at the bottom.  The index
// of each object in the array is actually a type ID already kept in
// chrome.storage, so changing this would make a mess of current users' data.
//
// `n` is the building name, `s` is the building short name, `i` is the URL of
// the building image without the image pack prefix and the '.png' suffix.  `bu`
// is the base upkeep for buildings of this type, `bp` is the base production.

Building.CATALOGUE = [
	, // unused index 0
	{ n: 'Alliance Command Station', s: 'ACS',
	  i: 'alliance_command_station', bu: {2:6,19:2}, bp: {} },
	{ n: 'Asteroid Mine', s: 'AM', i: 'asteroid_mine',
	  bu: {1:1,2:1,3:1}, bp: {5:9,14:2} },
	{ n: 'Battleweapons Factory', s: 'BWF', i: 'battleweapons_factory',
	  bu: {1:1,2:2,3:1,6:3,7:3,18:4}, bp: {27:2} },
	{ n: 'Brewery', s: 'Br', i: 'brewery',
	  bu: {1:2,2:2,3:2,13:4}, bp: {15:4} },
	{ n: 'Chemical Laboratory', s: 'CL', i: 'chemical_laboratory',
	  bu: {1:1,2:3,3:1}, bp: {13:9} },
	{ n: 'Clod Generator', s: 'CG', i: 'clod_generator',
	  bu: {2:4,13:4,21:18}, bp: {23:5} },
	{ n: 'Dark Dome', s: 'DD', i: 'dark_dome',
	  bu: {2:1,50:2}, bp: {21:4,203:12} },
	{ n: 'Droid Assembly Complex', s: 'DAC', i: 'droid_assembly_complex',
	  bu: {1:1,2:3,3:1,8:2,19:3}, bp: {20:1} },
	{ n: 'Drug Station', s: 'DS', i: 'drug_station',
	  bu: {1:3,2:1,3:3,17:3,50:3}, bp: {51:1} },
	{ n: 'Electronics Facility', s: 'EF', i: 'electronics_facility',
	  bu: {1:1,2:4,3:1,6:3,9:2}, bp: {7:6} },
	{ n: 'Energy Well', s: 'EW', i: 'energy_well',
	  bu: {1:1,3:1}, bp: {2:6} },
	{ n: 'Fuel Collector', s: 'FC', i: 'fuel_collector',
	  bu: {2:4,13:1}, bp: {16:30} },
	{ n: 'Gas Collector', s: 'GC', i: 'gas_collector',
	  bu: {1:2,2:2,3:2}, bp: {12:20} },
	{ n: 'Handweapons Factory', s: 'HWF', i: 'handweapons_factory',
	  bu: {1:1,2:2,3:1,7:3,9:3,18:3}, bp: {10:2} },
	{ n: 'Leech Nursery', s: 'LN', i: 'leech_nursery',
	  bu: {1:2,2:6,3:10,19:6,23:40}, bp: {21:3,22:1} },
	{ n: 'Medical Laboratory', s: 'ML', i: 'medical_laboratory',
	  bu: {1:2,2:2,3:2,12:7}, bp: {11:4} },
	{ n: 'Military Outpost', s: 'MO', i: 'military_outpost',
	  bu: {2:5,16:5}, bp: {} },
	{ n: 'Nebula Plant', s: 'NP', i: 'nebula_plant',
	  bu: {1:2,3:2,17:3}, bp: {2:35,12:4} },
	{ n: 'Neural Laboratory', s: 'NL', i: 'neural_laboratory',
	  bu: {1:2,2:2,3:2,4:12,11:2}, bp: {28:16} },
	{ n: 'Optics Research Center', s: 'ORC', i: 'optics_research_center',
	  bu: {1:1,2:3,3:1,14:2}, bp: {18:10} },
	{ n: 'Plastics Facility', s: 'PF', i: 'plastics_facility',
	  bu: {1:2,2:2,3:2,12:3,13:3}, bp: {9:6} },
	{ n: 'Radiation Collector', s: 'RC', i: 'radiation_collector',
	  bu: {1:1,2:3,3:1}, bp: {19:6} },
	{ n: 'Recyclotron', s: 'Rcy', i: 'recyclotron',
	  bu: {2:3,13:1,21:5}, bp: {1:7,3:5} },
	{ n: 'Robot Factory', s: 'RF', i: 'robot_factory',
	  bu: {1:2,2:2,3:2,6:1,7:4,18:2}, bp: {8:3} },
	{ n: 'Slave Camp', s: 'SC', i: 'slave_camp',
	  bu: {1:3,2:1,3:3,11:2,15:2}, bp: {50:3} },
	{ n: 'Smelting Facility', s: 'Sm', i: 'smelting_facility',
	  bu: {1:2,2:2,3:2,5:4}, bp: {6:6} },
	{ n: 'Space Farm', s: 'SF', i: 'space_farm',
	  bu: {2:4,4:5}, bp: {1:8,3:2,21:1} },
	{ n: 'Stim Chip Mill', s: 'SCM', i: 'stim_chip_mill',
	  bu: {1:3,3:3,7:2,17:2,28:44}, bp: {29:2} }
];

// Convenience for the current time in seconds, so K's heart doesn't break that
// hard...

Building.now = function() {
	return Building.seconds( Date.now() );
}

// Convert a time in milliseconds, like Date uses, to seconds, like Building
// wants.

Building.seconds = function( millis ) {
	return Math.floor( millis / 1000 );
}

// Get the type spec object for the given typeId.  Most likely you'll want to
// use the instance's methods instead, getTypeName etc.

Building.getType = function( typeId ) {
	return Building.CATALOGUE[ typeId ];
}

// If you have the name of a building type (e.g. "Medical Laboratory"), this
// gives you the type id for it.  If the name isn't recognisable, returns
// undefined.

Building.getTypeId = function( name ) {
	if ( NAME_IDS === undefined ) {
		NAME_IDS = Building.CATALOGUE.reduce(
			function( name_ids, data, id ) {
				name_ids[ data.n ] = id;
				return name_ids;
			},
			{}
		);
	}

	return NAME_IDS[ name ];
}

// If you have the URL of the building's image, strip the prefix up to the last
// slash, and the '.png' suffix, then call this for the type id.

Building.getTypeIdByIcon = function( icon ) {
	if ( ICON_IDS === undefined ) {
		ICON_IDS = Building.CATALOGUE.reduce(
			function( icon_ids, data, id ) {
				icon_ids[ data.i ] = id;
				return icon_ids;
			},
			{}
		);
	}

	return ICON_IDS[ icon ];
}

// Get the type name from a type id.

Building.getTypeName = function( typeId ) {
	var t = Building.getType( typeId );
	return t !== undefined ? t.n : undefined;
}

// Get the type short name from a type id (e.g. ACS, DAC, etc.).

Building.getTypeShortName = function( typeId ) {
	var t = Building.getType( typeId );
	return t !== undefined ? t.s : undefined;
}

// Get the base upkeep for "normal" buildings of the given type.  Return an
// object where keys are commodity ids, and values are integers encoded as
// strings.

Building.getBaseUpkeep = function( typeId ) {
	var t = Building.getType( typeId );
	return t !== undefined ? t.bu : undefined;
}

// Get the base production for "normal" buildings of the given type.  Return an
// object where keys are commodity ids, and values are integers encoded as
// strings.

Building.getBaseProduction = function( typeId ) {
	var t = Building.getType( typeId );
	return t !== undefined ? t.bp : undefined;
}

// Get an array of commodity ids that buildings of the given type consume.  Note
// you get an array of strings; map to integers and sort, if you care about
// order.

Building.getUpkeepCommodities = function( typeId ) {
	var t = Building.getType( typeId );
	return t !== undefined ? Object.keys(t.bu) : undefined;
}

// Get an array of commodity ids that buildings of the given type consume.  Note
// you get an array of strings; map to integers and sort if you care about
// order.  Note also that stim chip mills and dark domes (XXX - only those?) can
// produce things not listed in these values.

Building.getProductionCommodities = function( typeId ) {
	var t = Building.getType( typeId );
	return t !== undefined ? Object.keys(t.bp) : undefined;
}

// Get the "normal" upkeep of a building of the given type and bonus.  This may
// not match the actual upkeep seen in the wild, because of AT bonuses, special
// events, and TSS membership status.  Return an object where keys are commodity
// ids, and values are integers encoded as strings.

Building.getNormalUpkeep = function( typeId, level ) {
	return computeUpPr( Building.getType(typeId), 'bu', level, 0.4 );
}

// Get the "normal" production of a building of the given type and bonus.  This
// may not match the actual production because of AT bonuses, special events.
// Return an object where keys are commodity ids, and values are integers
// encoded as strings.

Building.getNormalProduction = function( typeId, level ) {
	return computeUpPr( Building.getType(typeId), 'bp', level, 0.5 );
}

// Return true if the given commodity id is consumed by buildings of the given
// type.

Building.isUpkeep = function( typeId, commodityId ) {
	var t = Building.getType( typeId );
	return t !== undefined ? t.bu[commodityId] !== undefined : undefined;
}

// Return true if the given commodity id is produced by buildings of the given
// type (with the SCM, DD caveats).

Building.isProduction = function( typeId, commodityId ) {
	var t = Building.getType( typeId );
	return t !== undefined ? t.bp[commodityId] !== undefined : undefined;
}

// Compute the storage key of a building at the given location and universe.

Building.storageKey = function( universeKey, location ) {
	return universeKey + location;
}

// Create a Building instance from data obtained from storage. `key` is the
// storage key used to retrieve the building; `a` is data retrieved from
// storage.
//
// Do not use building data from storage directly; always create an instance
// with this function, manipulate that, and use its toStorage method if you need
// to store it back.  This lets us change the storage format without having to
// modify the app anywhere but here.

Building.createFromStorage = function( key, a ) {
	// V2.1 format is a 3- to 10-element array.
	var loc = parseInt( key.substr(1) );
	return new Building(
		loc,
		a[0], // sectorId
		a[1], // typeId
		a[2], // timeSecs
		a[3], // owner
		a[4], // level
		a[5], // ticksLeft
		a[6], // selling
		a[7], // buying
		a[8], // minimum
		a[9]  // maximum
	);
}

// The number of production ticks elapsed from Unix timestamp `time` to `now`.
// Both are given in seconds past the epoch.  If the latter is omitted, it
// defaults to the current time.

Building.ticksPassed = function( time, now ) {
	var timeToTick, timePassed, ticksPassed;

	if ( now === undefined )
		now = Building.now();

	timeToTick = 6 * 3600 - (time - 5100) % (6 * 3600);
	timePassed = now - time;
	ticksPassed = ( timePassed > timeToTick ) ? 1 : 0;
	ticksPassed += Math.floor( timePassed / (6 * 3600) );
	return ticksPassed;
}

// Building instances store lists of commodity values as sparse arrays, not
// objects; see dev notes for a discussion on this.  This utility converts to
// object any of the arrays held by the Building instance (`selling`, `buying`,
// `minimum`, `maximum`).

Building.makeDictionary = function( array ) {
	return array.reduce(
		function( o, n, id ) {
			o[ id ] = n;
			return o;
		},
		{}
	);
}

// Converts commodity data (associative collections of commodity id to integer)
// into the sparse arrays that we hold in Building instances.  You can use it to
// set the `selling`, `buying`, `minimum`, `maximum` properties of an instance:
//
// ```
// building.buying = Building.makeCommodityArray( {1:50, 3:80} );
// ```
//
// `arg` can be one of:
//
//  * An array: we assume `arg` contains an even number of integer items: the
//    first a commodity id, the second a value, the third another commodity id,
//    and so forth.  This form is used to load objects from storage, which needs
//    to run fast (sometimes we're just constructing an instance to look at some
//    stored datum, not because we need the full Building functionality.  So no
//    checking is performed here, for speed.
//
//  * An object: we expect the enumerable keys of `arg` to be commodity ids, and
//    the associated values, integers.  Return a sparse array with the exact
//    same keys the given object had (only as integers not strings).  This
//    doesn't need to run that fast, instead we want correctness, so we do
//    validate a few things.
//
//  * null or undefined: return an empty array.
//
// Any other type will throw an error, because that's useful for debugging.

Building.makeCommodityArray = function( arg ) {
	var a, i, end, key, val;

	if ( arg === null || arg === undefined )
		return [];

	if ( arg instanceof Array ) {
		for ( a = [], i = 0, end = arg.length; i < end; i += 2 )
			a[ arg[i] ] = arg[ i + 1 ];
		return a;
	}

	if ( typeof arg !== 'object' )
		throw 'Invalid commodity map: ' + JSON.stringify(arg);

	a = [];
	for ( key in arg ) {
		key = parseInt( key );
		val = parseInt( arg[key] );
		if ( isNaN(key) || isNaN(val) ) {
			throw 'Invalid commodity map pair: ' +
				JSON.stringify( key ) + ' -> ' +
				JSON.stringify( arg[key] );
		}
		a[ key ] = val;
	}
	return a;
}

// Removes the building at location `loc` from storage.  `ukey` is the universe
// key (a single uppercase letter: A, O, P).
//
// This is an unusual function that actually updates `chrome.storage.sync`.
// Added because removing a single building is in fact a common operation.

Building.removeStorage = function( loc, ukey, callback ) {
	loc = parseInt( loc );
	if ( isNaN(loc) )
		return;

	chrome.storage.sync.get( ukey, removeBuildingListEntry );

	function removeBuildingListEntry( data ) {
		var list, index;

		list = data[ ukey ];
		index = list.indexOf( loc );
		if ( index === -1 )
			removeBuildingData();
		else {
			list.splice( index, 1 );
			chrome.storage.sync.set( data, removeBuildingData );
		}
	}

	function removeBuildingData() {
		chrome.storage.sync.remove( ukey + loc, callback )
	}
}



// 2.  Methods of Building instances.



// The following methods do the same as the Building ones, only for the
// instance.

Building.prototype.getType = function() {
	return Building.getType( this.typeId );
}

Building.prototype.getTypeName = function() {
	return Building.getTypeName( this.typeId );
}

Building.prototype.getTypeShortName = function() {
	return Building.getTypeShortName( this.typeId );
}

Building.prototype.getBaseUpkeep = function( typeId ) {
	return Building.getBaseUpkeep( this.typeId );
}

Building.prototype.getBaseProduction = function( typeId ) {
	return Building.getBaseProduction( this.typeId );
}

Building.prototype.getUpkeepCommodities = function( typeId ) {
	return Building.getUpkeepCommodities( this.typeId );
}

Building.prototype.getProductionCommodities = function( typeId ) {
	return Building.getProductionCommodities( this.typeId );
}

Building.prototype.getNormalUpkeep = function( typeId ) {
	return Building.getNormalUpkeep( this.typeId, this.level );
}

Building.prototype.getNormalProduction = function( typeId ) {
	return Building.getNormalProduction( this.typeId, this.level );
}

Building.prototype.isUpkeep = function( commodityId ) {
	return Building.isUpkeep( this.typeId, commodityId );
}

Building.prototype.isProduction = function( commodityId ) {
	return Building.isProduction( this.typeId, commodityId );
}

// Check if this building stores minimums and maximums.  That is not often the
// case: currently bookie only stores that for your own buildings, when it
// watches you set the limits in the "trade settings" page.

Building.prototype.hasMinMax = function() {
	return this.minimum.length > 0 && this.maximum.length > 0;
}

// Compute how many ticks of upkeep remain at time `now`, which should be after
// the last time the building was updated.  If omitted, it defaults to the
// current time.  `now` is a timestamp in seconds past the epoch.
//
// If remaining ticks were unknown at the time the building was last updated,
// this function will return undefined.

Building.prototype.ticksNow = function( now ) {
	if ( this.ticksLeft === undefined )
		return undefined;

	 return Math.max(
		 0, this.ticksLeft - Building.ticksPassed(this.time, now) );
}

// Compute the storage key that you'd use to store this building in the given
// universe.

Building.prototype.storageKey = function( universeKey ) {
	return universeKey + this.loc;
}

// Create the object that gets sent to storage when we store a Building.  Do not
// store building data directly; always create a Building instance, use this
// function to obtain the data to store, and send that to storage.  This lets us
// change the storage format when needed, without having to modify the app
// anywhere but here.

Building.prototype.toStorage = function() {
	// V2.1 format is a 3 to 10-element array.
	var a = [
		this.sectorId,
		this.typeId,
		this.time,
		this.owner,
		this.level,
		this.ticksLeft,
		storageCommodityMap(this.selling),
		storageCommodityMap(this.buying),
		storageCommodityMap(this.minimum),
		storageCommodityMap(this.maximum)
	];

	// Shave off the last undefined elements of this.  a.length should never
	// go below 3 here, but we'll check just in case because if we're wrong
	// thing would get ugly.
	while ( a.length > 3 && a[ a.length - 1 ] === undefined )
		a.length = a.length - 1;

	return a;
}

// Return an array of commodity ids for commodities that appear in either
// this.buying or this.selling, in numeric order.  Note this is not exactly
// equivalent to getUpkeepCommodities + getProductionCommodities, because things
// like stim chip mills and dark domes produce commodities that are not actually
// listed in the type's base figures.

Building.prototype.getCommoditiesInUse = function() {
	var seen = [], r = [];

	if ( this.buying )
		this.buying.forEach( pushc );
	if ( this.selling )
		this.selling.forEach( pushc );
	return r.sort( compare );

	function pushc( v, i ) {
		if ( !seen[ i ] ) {
			seen[ i ] = true;
			r.push( i );
		}
	}
	function compare( a, b ) { return a - b; }
}

// Remove this building from storage.  This updates `chrome.storage.sync`.

Building.prototype.removeStorage = function( ukey, callback ) {
	Building.removeStorage( this.loc, ukey, callback );
}

// Return true if the building was fully stocked at the time it was last
// updated.  This means that it won't buy any of the commodities it consumes.
// However, if we don't see it buying any commodities at all, then we haven't
// actually recorded it's stocks, so we can't know if it's fully stocked.

Building.prototype.isFullyStocked = function() {

	// * this.getUpkeepCommodities() returns an array of commodity ids.
	// * find runs the anonymous function for each commodity, with `this`
	//   set as the the building's `buying`; returns a commodity id if there
	//   is one for which buying is greater than zero, or undefined if there
	//   are none.
	// * isFullyStocked returns true if find returns undefined.

	return this.buying.length > 0 &&
		this.getUpkeepCommodities().find(
			function( commId ) { return this[commId] > 0; },
			this.buying
		) === undefined;
}



// 3. Private functions.



function storageCommodityMap( a ) {
	if ( a.length === 0 )
		return undefined;
	return a.reduce(
		function(scm, val, id) {
			scm.push( id, val );
			return scm;
		},
		[]
	);
}

// Compute a normal building upkeep/production from base values and level, using
// formulae from http://www.pardus.at/index.php?section=manual_ref020

function computeUpPr( spec, prop, level, factor ) {
	var base, k, r;
	if ( spec === undefined || level === undefined )
		return undefined;
	base = spec[ prop ];
	r = {};
	for ( k in base )
		r[ k ] = Math.round( base[k] * ( 1 + factor * (level - 1) ) );
	return r;
}


return Building;

})();
