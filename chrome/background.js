// -*- js3-indent-level: 8; js3-indent-tabs-mode: t -*-

var Sector; // from sector.js
var Building; // from building.js

chrome.runtime.onInstalled.addListener( onInstall );
chrome.runtime.onMessage.addListener( onMessage );

// End of script execution, function definitions below.

function onInstall( details ) {
	// 1.8.1 is the version when we switched from storage.local to storage.sync
	if( details.reason == 'update' &&
	    details.previousVersion < '1.8.1' )
		migrateV18Storage();
}

// Start a migration from storage.local to storage.sync.  Also migrate the
// original storage format (v1.8 and previous) to the new, more compact one used
// in v1.9.
//
// V1.8 storage format:
//
// There are three storage items containing lists of buildings.  The keys are:
// `artemisBuildingList`, `orionBuildingList`, `pegasusBuildingList`.  Each
// contains an array of integer tile IDs, one per building tracked.
//
// There is one storage item per building, with key `universeBuildingID`, with
// universe and ID being what you'd expect (e.g. `pegasusBuilding142040`).  Each
// item contains a single JSON string which decodes to an object with keys as
// follows:
//
//   amount - comm dict
//   amount_max - comm dict
//   amount_min - comm dict
//   buy_price - comm dict
//   level - number, may be missing
//   loc - number
//   owner - string, may be missing
//   res_production - comm dict
//   res_upkeep - comm dict
//   sector - string
//   sell_price - comm dict
//   time - number (js style timestamp , like Unix but in millisecs)
//   type - string (e.g. "Space Farm")
//   x - number
//   y - number
//
// "comm dict" means a dictionary of commodities: an object whose keys are
// commodity IDs, and values are numbers.
//
// V1.9 storage format:
//
// The list item keys are `A`, `O`, `P`.
//
// Building keys are `XNNN` where X is `A`, `O`, or `P`, and NNN is the ID
// (e.g. `P142040`).  Each item contains a 14-element array representing:
//
//   0 - time (number, Unix timestamp in seconds)
//   1 - sector_id (number, as per Sector.getId)
//   2 - x (number)
//   3 - y (number)
//   4 - type_id (number, as per Building.getTypeId)
//   5 - level (number, may be -1 if unavailable)
//   6 - owner (string)
//   7-13 - Seven comm dicts for amount, amount_max, amount_min,
//          res_production, res_upkeep, buy_price, sell_price.
//          In that order.
//
// Commodity dictionaries are stored as arrays of numbers: the first being a
// commodity ID; the second, the value for that commodity, and so on.

function migrateV18Storage() {
	chrome.storage.local.get( [ 'artemisBuildingList',
				    'orionBuildingList',
				    'pegasusBuildingList' ],
				  onLocalConfiguration );

	function onLocalConfiguration( buildingLists ) {
		var rx = /^(.*)BuildingList$/,
		    lists = {},
		    keys = [],
		    key, universe, buildings, i, end, id;

		for( key in buildingLists ) {
			universe = rx.exec(key)[1];
			buildings = buildingLists[ key ];
			lists[ universe ] = buildings;
			for( i = 0, end = buildings.length; i < end; i++ ) {
				id = buildings[ i ];
				keys.push( universe + 'Building' + id );
			}
		}

		chrome.storage.local.get( keys, onLocalBuildings );
	}

	function onLocalBuildings( buildings ) {
		var universe_keys = { artemis: 'A', orion: 'O', pegasus: 'P' },
		    rx = /^(.*)Building(\d+)$/,
		    newitems = {
			    A: [],
			    O: [],
			    P: []
		    },
		    key, m, u, id, b;

		for( key in buildings ) {
			m = rx.exec( key );
			u = universe_keys[ m[1] ];
			id = parseInt( m[2] );
			b = convertV18Building( JSON.parse(buildings[key]) );
			if( b ) {
				newitems[ u ].push( id );
				newitems[ u + id ] = b;
			}
		}

		if( newitems[ 'A' ].length == 0 )
			delete newitems[ 'A' ];
		if( newitems[ 'O' ].length == 0 )
			delete newitems[ 'O' ];
		if( newitems[ 'P' ].length == 0 )
			delete newitems[ 'P' ];

		//console.log( 'storing to sync', newitems );
		chrome.storage.sync.set( newitems, onV19Stored );
	}

	function onV19Stored() {
		if( chrome.runtime.lastError ) {
			// Balls. What else to do?  We won't delete local
			// storage, hopefully another update will migrate it.
			console.log( 'Bookkeeper ERROR: Cannot migrate V1.8 storage: ' +
				     chrome.runtime.lastError.message );
			return;
		}

		// We're good. Nuke the local storage. This will delete entries
		// for current sector and coordinates, and the last sort
		// criterion and order for the overview.  But none of those are
		// really important.
		chrome.storage.local.clear();
		//console.log( 'Migrated to V1.9!' );
	}

	function convertV18Building( b ) {
		if( !b )
			return null;

		var type_id = Building.getTypeId( b.type );
		if( !type_id )
			return null;

		var sector_id = Sector.getId( b.sector );
		if( !sector_id )
			return null;

		var level = b.level;
		if( !(level > 0) )
			level = -1;

		return [
			Math.floor( b.time / 1000 ),
			sector_id,
			b.x,
			b.y,
			type_id,
			level,
			b.owner,
			convertNumericDict( b.amount ),
			convertNumericDict( b.amount_max ),
			convertNumericDict( b.amount_min ),
			convertNumericDict( b.res_production ),
			convertNumericDict( b.res_upkeep ),
			convertNumericDict( b.buy_price ),
			convertNumericDict( b.sell_price )
		];
	}

	function convertNumericDict( d ) {
		var r = [], key;

		for( key in d )
			r.push( parseInt(key), d[key] );

		return r;
	}
} // function function migrateV18Storage()

// This is called when a content script asks us to do some work for them.

function onMessage( message, sender, sendResponse ) {
	var handler;

	//console.log( 'received message', message, sender );
	handler = OpHandlers[ message.op ];
	if( handler )
		return handler( message, sendResponse );
	return false;
}

// Op handlers below.

var OpHandlers = {};

OpHandlers.showNotification = function( message ) {
	var options;

	options = {
		type: 'basic',
		title: 'Pardus Bookkeeper',
		message: message.text,
		iconUrl: 'icons/48.png'
	};

	chrome.notifications.create( message.id, options );

	return false;
}
