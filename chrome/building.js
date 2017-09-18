// -*- js3-indent-level: 8; js3-indent-tabs-mode: t -*-

var Sector; // defined in sector.js

var Building = (function() {

// The order of this array is important: numeric type IDs kept in chrome.storage
// depend on the index of each string here. So DO NOT alter the order.  If
// Pardus ever adds more building types, *append* them to this array then.

var TYPES = [
	'Alliance Command Station',
	'Asteroid Mine',
	'Battleweapons Factory',
	'Brewery',
	'Chemical Laboratory',
	'Clod Generator',
	'Dark Dome',
	'Droid Assembly Complex',
	'Drug Station',
	'Electronics Facility',
	'Energy Well',
	'Fuel Collector',
	'Gas Collector',
	'Handweapons Factory',
	'Leech Nursery',
	'Medical Laboratory',
	'Military Outpost',
	'Nebula Plant',
	'Neural Laboratory',
	'Optics Research Center',
	'Plastics Facility',
	'Radiation Collector',
	'Recyclotron',
	'Robot Factory',
	'Slave Camp',
	'Smelting Facility',
	'Space Farm',
	'Stim Chip Mill'
];
var TYPE_IDS; // lazily initialised in Building.getTypeId

// Keep in sync with TYPES above.

var SHORT_TYPES = [
	'ACS',
	'AM',
	'BWF',
	'Br',
	'CL',
	'CG',
	'DD',
	'DAC',
	'DS',
	'EF',
	'EW',
	'FC',
	'GC',
	'HWF',
	'LN',
	'ML',
	'MO',
	'NP',
	'NL',
	'ORC',
	'PF',
	'RC',
	'Rcy',
	'RF',
	'SC',
	'Sm',
	'SF',
	'SCM'
];

// Keep in sync with TYPES above.
var ICONS = [
	'alliance_command_station',
	'asteroid_mine',
	'battleweapons_factory',
	'brewery',
	'chemical_laboratory',
	'clod_generator',
	'dark_dome',
	'droid_assembly_complex',
	'drug_station',
	'electronics_facility',
	'energy_well',
	'fuel_collector',
	'gas_collector',
	'handweapons_factory',
	'leech_nursery',
	'medical_laboratory',
	'military_outpost',
	'nebula_plant',
	'neural_laboratory',
	'optics_research_center',
	'plastics_facility',
	'radiation_collector',
	'recyclotron',
	'robot_factory',
	'slave_camp',
	'smelting_facility',
	'space_farm',
	'stim_chip_mill'
];
var ICON_TYPE_IDS; // lazily initialised in Building.getTypeIdByIcon

function Building( loc, time_secs, sector_id, x, y, type_id, level, owner,
		   amount, amount_max, amount_min, res_production, res_upkeep,
		   buy_price, sell_price ) {
	this.loc = loc;
	this.time = time_secs;
	this.sector_id = sector_id;
	this.x = x;
	this.y = y;
	this.type_id = type_id;
	this.level = saneLevel( level );
	this.owner = owner;
	this.amount = amount;
	this.amount_max = amount_max;
	this.amount_min = amount_min;
	this.res_production = res_production;
	this.res_upkeep = res_upkeep;
	this.buy_price = buy_price;
	this.sell_price = sell_price;

	this.type = Building.getTypeName( type_id );
	this.stype = Building.getTypeShortName( type_id );
	this.ticks = numberOfTicks( this );
	this.ticks_passed = ticksPassed( this );

	if( this.ticks < Infinity ) {
		if( this.ticks > this.ticks_passed )
			this.ticks_left = this.ticks - this.ticks_passed;
		else
			this.ticks_left = 0;
	}
	else
		this.ticks_left = Infinity;
}

Building.getTypeId = function( name ) {
	if( !TYPE_IDS ) {
		var i, end;
		TYPE_IDS = {};
		for( i = 0, end = TYPES.length; i < end; i++ ) {
			TYPE_IDS[ TYPES[i] ] = i + 1;
		}
	}

	return TYPE_IDS[ name ] || undefined;
}

Building.getTypeIdByIcon = function( icon ) {
	if( !ICON_TYPE_IDS ) {
		var i, end;
		ICON_TYPE_IDS = {};
		for( i = 0, end = ICONS.length; i < end; i++ ) {
			ICON_TYPE_IDS[ ICONS[i] ] = i + 1;
		}
	}

	return ICON_TYPE_IDS[ icon ] || undefined;
}

Building.getTypeName = function( type_id ) {
	return TYPES[ type_id-1 ] || undefined;
}

Building.getTypeShortName = function( type_id ) {
	return SHORT_TYPES[ type_id-1 ] || undefined;
}

// Create a Building from data fetched by a Pardus page.
//
// This adjusts a few parameters to conform to what we need:
//
//  * time is assumed to be milliseconds and converted to seconds
//  * sector is assumed to be a name, and the id is retrieved
//  * type is assumed to be a name, and the id is retrieved

Building.createFromPardus = function(
	loc, time, sector, x, y, type, level, owner,
	amount, amount_max, amount_min, res_production, res_upkeep,
	buy_price, sell_price ) {
	return new Building(
		loc, Math.floor(time/1000) /*<- this breaks my heart Vic*/,
		Sector.getId(sector), x, y, Building.getTypeId(type),
		level, owner, amount, amount_max, amount_min,
		res_production, res_upkeep, buy_price, sell_price);
}

// Create a Building from data obtained from storage. `key` is the storage key
// used to retrieve the building; `a` is data in v1.8 storage format, which
// means a 14-element array.  See function body for positions.
//
// Commodity dictionaries are stored as arrays of numbers.  This function
// converts them to objects keyed by commodity id.

Building.createFromStorage = function( key, a ) {
	var loc = parseInt( key.substr(1) );
	if( isNaN(loc) || !(a instanceof Array) || a.length != 14 )
		throw 'Invalid storage data :' + JSON.stringify([key, a]);

	return new Building(
		loc,
		a[0], // time in seconds
		a[1], // sector_id
		a[2], // x
		a[3], // y
		a[4], // type_id
		saneLevel(a[5]), // level
		a[6], // owner
		commDict(a[7]), // amount
		commDict(a[8]), // amount_max
		commDict(a[9]), // amount_min
		commDict(a[10]), // res_production
		commDict(a[11]), // res_upkeep
		commDict(a[12]), // buy_price
		commDict(a[13])  // sell_price
	);

	function commDict( cd ) {
		var r = {}, i, end;
		for( i = 0, end = cd.length; i < end; i += 2 )
			r[ cd[i] ] = cd[ i + 1 ];
		return r;
	}
}

Building.removeStorage = function( loc, ukey, callback ) {
	loc = parseInt( loc );
	if( isNaN(loc) )
		return;

	chrome.storage.sync.get( ukey, removeBuildingListEntry );

	function removeBuildingListEntry( data ) {
		var list, index;

		list = data[ ukey ];
		index = list.indexOf( loc );
		if( index === -1 )
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


// Create the object that gets sent to storage (14-element array, etc.)

Building.prototype.toStorage = function() {
	return [
		this.time,
		this.sector_id,
		this.x,
		this.y,
		this.type_id,
		this.level > 0 ? this.level : NaN,
		this.owner,
		convertNumericDict( this.amount ),
		convertNumericDict( this.amount_max ),
		convertNumericDict( this.amount_min ),
		convertNumericDict( this.res_production ),
		convertNumericDict( this.res_upkeep ),
		convertNumericDict( this.buy_price ),
		convertNumericDict( this.sell_price )
	];

	function convertNumericDict( d ) {
		var r = [], key;
		for( key in d )
			r.push( parseInt(key), d[key] );
		return r;
	}
}

Building.prototype.getSectorName = function() {
	return Sector.getName( this.sector_id );
}

Building.prototype.removeStorage = function( ukey, callback ) {
	Building.removeStorage( this.loc, ukey, callback );
}

function ticksPassed( building ) {
	if( !(building.level > 0) )
		return 0;

	var timeToTick = 6 * 3600 - (building.time - 5100) % (6 * 3600);
	var timePassed = Math.floor(Date.now()/1000) - building.time;

	var ticksPassed = 0;
	if (timePassed > timeToTick) {
		ticksPassed += 1;
	}
	ticksPassed += Math.floor(timePassed / (6 * 3600));
	return ticksPassed;
}

function numberOfTicks( building ) {
	if( !(building.level > 0) )
		return Infinity;

	var minAmount = 9999;
	var minKey = "0";

	for (var key in building.res_upkeep) {
		if (building.amount[key]/building.res_upkeep[key] < minAmount) {
			minAmount = building.amount[key];
			minKey = key;
		}
	}
	var tickAmount = ((building.level - 1) * 0.4 + 1) * building.res_upkeep[minKey];
	var ticks = Math.floor(minAmount / tickAmount);
	return ticks;
}

function saneLevel( level ) {
	level = parseInt( level );
	if( isNaN(level) || level < 1 )
		level = -1;
	return level;
}


return Building;

})();
