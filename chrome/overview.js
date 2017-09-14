// -*- js3-indent-level: 8; js3-indent-tabs-mode: t -*-

// This is a content script.  It runs on overview_buildings.php.

var Universe; // in universe.js
var Building; // in building.js

(function (){

// Data taken from Pardus. 'i' is the icon, minus the image pack prefix and the
// .png suffix. 'n' is the proper name of a commodity.	These specific ID
// numbers, and the inconsistent capitalisation of names, should both stay like
// this exactly (we need to match the game).

var COMMODITIES = {
	1: { i: 'food',
	     n: 'Food' },
	2: { i: 'energy',
	     n: 'Energy' },
	3: { i: 'water',
	     n: 'Water' },
	4: { i: 'animal_embryos',
	     n: 'Animal embryos' },
	5: { i: 'ore',
	     n: 'Ore' },
	6: { i: 'metal',
	     n: 'Metal' },
	7: { i: 'electronics',
	     n: 'Electronics' },
	8: { i: 'robots',
	     n: 'Robots' },
	9: { i: 'heavy-plastics',
	     n: 'Heavy plastics' },
	10: { i: 'hand-weapons',
	      n: 'Hand weapons' },
	11: { i: 'medicines',
	      n: 'Medicines' },
	12: { i: 'nebula-gas',
	      n: 'Nebula gas' },
	13: { i: 'chemical-supplies',
	      n: 'Chemical supplies' },
	14: { i: 'gem-stones',
	      n: 'Gem stones' },
	15: { i: 'liquor',
	      n: 'Liquor' },
	16: { i: 'hydrogen-fuel',
	      n: 'Hydrogen fuel' },
	17: { i: 'exotic_matter',
	      n: 'Exotic matter' },
	18: { i: 'optical_components',
	      n: 'Optical components' },
	19: { i: 'radioactive_cells',
	      n: 'Radioactive cells' },
	20: { i: 'droid_modules',
	      n: 'Droid modules' },
	21: { i: 'biowaste',
	      n: 'Bio-waste' },
	22: { i: 'leech_baby',
	      n: 'Leech baby' },
	23: { i: 'nutrient_clods',
	      n: 'Nutrient clods' },
	24: { i: 'cybernetic_x993_parts',
	      n: 'Cybernetic X-993 Parts' },
	25: { i: 'x993_repairdrone',
	      n: 'X-993 Repair-Drone' },
	26: { i: 'neural_stimulator',
	      n: 'Neural Stimulator' },
	27: { i: 'battleweapon_parts',
	      n: 'Battleweapon Parts' },
	28: { i: 'neural_tissue',
	      n: 'Neural Tissue' },
	29: { i: 'stim_chip',
	      n: 'Stim Chip' },
	30: { i: 'stim_chip_fed',
	      n: 'Capri Stim' },
	31: { i: 'stim_chip_emp',
	      n: 'Crimson Stim' },
	32: { i: 'stim_chip_uni',
	      n: 'Amber Stim' },
	50: { i: 'slaves',
	      n: 'Slaves' },
	51: { i: 'drugs',
	      n: 'Drugs' },
	100: { i: 'package',
	       n: 'Package' },
	101: { i: 'package_faction',
	       n: 'Faction package' },
	102: { i: 'explosives',
	       n: 'Explosives' },
	103: { i: 'vip',
	       n: 'VIP' },
	104: { i: 'christmas_glitter',
	       n: 'Christmas Glitter' },
	105: { i: 'explosives_military',
	       n: 'Military Explosives' },
	150: { i: 'exotic_crystal',
	       n: 'Exotic Crystal' },
	151: { i: 'feral_egg',
	       n: 'Feral Egg' },
	201: { i: 'human_intestines',
	       n: 'Human intestines' },
	202: { i: 'skaari_limbs',
	       n: 'Skaari limbs' },
	203: { i: 'keldon_brains',
	       n: 'Keldon brains' },
	204: { i: 'rashkir_bones',
	       n: 'Rashkir bones' },
	211: { i: 'jewels_fed',
	       n: 'Blue Sapphire jewels' },
	212: { i: 'jewels_emp',
	       n: 'Ruby jewels' },
	213: { i: 'jewels_uni',
	       n: 'Golden Beryl jewels' }
};

// An array of indices into the catalogue above.  Used to preserve order when
// traversing.

var COMMODITY_INDICES = Object.keys( COMMODITIES ).sort( compareAsInt );

var WEEKDAYS = [ 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat' ];
var MONTHS = [ 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
	       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec' ];

var BUILDING_SORT_FUNCTIONS = {
	loc: function( a, b ) {
		// XXX - is this enough? Should we sort by (sector, y, x) instead?
		return a.loc - b.loc;
	},
	type: function( a, b ) {
		return a.stype.localeCompare( b.stype );
	},
	owner: function( a, b ) {
		return a.owner.localeCompare( b.owner );
	},
	level: function( a, b ) {
		return a.level - b.level;
	},
	time: function( a, b ) {
		return a.time - b.time;
	},
	ticks: function( a, b ) {
		return a.ticks - b.ticks;
	},
	tleft: function( a, b ) {
		return a.ticks_left - b.ticks_left;
	}
};

function compareAsInt( a, b ) {
	return parseInt(a) - parseInt(b);
}

var credits_img = "<img src='//static.pardus.at/img/stdhq/credits_16x16.png' alt='Credits' width='16' height='16' style='vertical-align: middle;'>",
    universe = Universe.fromDocument( document ),
    sortCritKey = universe.name + 'OverviewSortCrit',
    sortAscKey = universe.name + 'OverviewSortAsc';

function showOverview( syncData ) {
	// Data contains a property whose name we computed and stored in the
	// buildingListId variable.  Its value is an array of location IDs of
	// every building tracked.
	var buildingList = syncData[ universe.key ];

	if( !buildingList )
		// No configuration, odd. Do nothing.
		return;

	chrome.storage.local.get( [sortCritKey, sortAscKey],
				  showOverviewStep2.bind(null, buildingList) );
}

function showOverviewStep2( buildingList, data ) {
	var keys = [],
	    callback = showOverviewBuildings.bind(
		    null,
		    data[sortCritKey],
		    data[sortAscKey]
	    ),
	    i, end;

	// Build an array of storage keys that we'll need to display the overview.
	for( i = 0, end = buildingList.length; i < end; i++ )
		keys.push( universe.key + buildingList[i] );

	// Query the buildings
	chrome.storage.sync.get( keys, callback );
}

// Return an array of commodities actually in use by the collection of buildings
// given.
function getCommoditiesInUse( buildings ) {
	var in_use = new Object(),
	    i, end, commodity;

	for( i = 0, end = buildings.length; i < end; i++ ) {
		// XXX - do we need to check something other than `amount` ?
		for( commodity in buildings[i].amount )
			in_use[commodity] = true;
	}

	return Object.keys( in_use ).sort( compareAsInt );
}

// Produce an array of buildings from data coming from chrome.storage.
//
// `data` is an object with attributes of the form "universeBuildingNNN", where
// universe is 'artemis', 'orion', 'pegasus'; and NNN is the id of the tile on
// which the building is located.  The content of each of these attributes is a
// single JSON string encoding a building object.
//
// This function deserialises each building object, and normalises it for our
// requirements here.  The whole collection of loaded buildings is returned in
// an array.  The order of the array should not be relied upon.

function loadBuildings( data ) {
	var key, b, stype,
	    buildings = [];

	for( key in data ) {
		b = Building.createFromStorage( key, data[key] );
		buildings.push( b );
	}

	return buildings;
}

function showOverviewBuildings( sort, ascending, data ) {
	var buildings, b, ckey, commodity, container, end, h1, i, img, in_use,
	    key, table, tbody, thead, tr;

	if( !sort )
		sort = 'time';
	if( typeof ascending != 'boolean' )
		ascending = true;
	delete data[ sortCritKey ];
	delete data[ sortAscKey ];

	// Parse each building.
	buildings = loadBuildings( data );
	data = null; // don't need this anymore, may be garbage collected
	in_use = getCommoditiesInUse( buildings );

	// Build the table and headers
	container = document.createElement( 'div' );
	container.id = 'bookkeeper-overview';

	table = document.createElement( 'table' );
	thead = document.createElement( 'thead' );

	tr = document.createElement( 'tr' );
	addTH( tr, 'Location', 'sort', 'bookkeeper-hdr-loc' );
	addTH( tr, 'Type', 'sort', 'bookkeeper-hdr-type' );
	addTH( tr, 'Owner', 'sort', 'bookkeeper-hdr-owner' );
	addTH( tr, 'Lvl', 'sort', 'bookkeeper-hdr-level' );

	for( i = 0, end = in_use.length; i < end; i++ ) {
		ckey = in_use[i];
		commodity = COMMODITIES[ckey];
		img = document.createElement( 'img' );
		img.src = '//static.pardus.at/img/stdhq/res/'
			+ commodity.i + '.png';
		img.title = commodity.n;
		addTH( tr, img, 'c' );
	}

	addTH( tr, 'Updated', 'sort', 'bookkeeper-hdr-time' );
	addTH( tr, 'Ticks', 'sort', 'bookkeeper-hdr-ticks' );
	addTH( tr, 'Left', 'sort', 'bookkeeper-hdr-tleft' );

	addTH( tr, '' ); // the bin icon column
	thead.appendChild( tr );
	thead.addEventListener( 'click', onHeaderClick, false );
	table.appendChild( thead );

	// Now add the rows
	tbody = document.createElement( 'tbody' );
	fillTBody( tbody, in_use, buildings, sort, ascending );
	table.appendChild( tbody );

	table.style.background = "url(//static.pardus.at/img/stdhq/bgdark.gif)";
	container.appendChild( table );
	var anchor = document.getElementsByTagName('h1')[0];

	h1 = document.createElement( 'h1' );
	h1.className = 'bookkeeper';
	img = document.createElement( 'img' );
	img.src = chrome.extension.getURL( 'icons/24.png' );
	img.title = 'Pardus Bookkeeper';
	h1.appendChild( img );
	h1.appendChild( document.createTextNode('Bookkeeping') );

	anchor.parentNode.insertBefore( h1, anchor );
	anchor.parentNode.insertBefore( container, anchor );

	function onHeaderClick( event ) {
		var target = event.target;
		if( target.id && target.id.startsWith( 'bookkeeper-hdr-' ) ) {
			event.stopPropagation();
			var newsort = target.id.substr( 15 );
			if( newsort == sort )
				ascending = !ascending;
			else {
				sort = newsort;
				ascending = true;
			}

			var items = {};
			items[ sortCritKey ] = sort;
			items[ sortAscKey ] = ascending;
			chrome.storage.local.set( items );

			fillTBody( tbody, in_use, buildings, sort, ascending );
		}
	}
}

function fillTBody( tbody, in_use, buildings, sort, ascending ) {
	var key, building, tr, cell, img, ckey, n, s, i , end, j, jend, commodity,
	    sortfn, fn, className;

	sortfn = BUILDING_SORT_FUNCTIONS[ sort ];
	if( sortfn ) {
		if( ascending )
			fn = sortfn;
		else
			fn = function( a, b ) { return -sortfn( a, b ); };
		buildings.sort( fn );
	}

	while( tbody.hasChildNodes() )
		tbody.removeChild( tbody.firstChild );

	for( i = 0, end = buildings.length; i < end; i++ ) {
		building = buildings[ i ];
		tr = document.createElement( 'tr' );

		addTD( tr, humanCoords( building ) );
		cell = addTD( tr, building.stype );
		cell.title = building.type;
		addTD( tr, building.owner || 'need update' );
		addTD( tr, building.level > 0 ? String(building.level) : '??', 'right' );

		for( j = 0, jend = in_use.length; j < jend; j++ ) {
			ckey = in_use[j];
			commodity = COMMODITIES[ckey];

			// If upkeep we do amount - min, else we do max - amount and make it negative..
			if( building.res_upkeep[ckey] ) {
				n = -(building.amount_max[ckey] - building.amount[ckey]);
				s = String( n );
			}
			else if( building.res_production[ckey] ) {
				n = building.amount[ckey] - building.amount_min[ckey];
				s = String( n );
			}
			else
				s = n = null;

			cell = addTD( tr, s );
			if( s ) {
				cell.title = commodity.n;
				cell.className = 'c';
				if( n > 0 )
					cell.classList.add( 'lime' );
				else if( n < 0 )
					cell.classList.add( 'pink' );
			}
		}

		cell = makeTimeTD( building.time * 1000 );
		tr.appendChild( cell );

		addTD( tr, building.ticks < Infinity ? String(building.ticks) : '??', 'r' );

		className = null;
		if (building.ticks_left < Infinity) {
			// Not pretty but fast according to:
			// https://stackoverflow.com/questions/6665997/switch-statement-for-greater-than-less-than
			if( building.ticks_left < 1 )
				className = 'red';
			else if( building.ticks_left < 2 )
				className = 'yellow';
		}

		cell = addTD( tr,
			      building.ticks_left < Infinity ? String(building.ticks_left) : '??',
			      'r' );
		if( className )
			cell.classList.add( className );

		img = document.createElement("img");
		img.src = "http://static.pardus.at/img/stdhq/ui_trash.png";
		img.onclick = function() {
			removeBuilding( building.loc, universe );
			tr.style.display = "none";
		};
		addTD( tr, img );

		tbody.appendChild( tr );
	}
}

function makeTimeTD( timestamp ) {
	var t = new Date( timestamp ),
	    now = Date.now(),
	    s, td;

	// If the date is old, we just display the day and month.
	// 432000000 is the number of milliseconds in five days.
	if( now - timestamp > 432000000 ) {
		s = MONTHS[ t.getMonth() ] + ' ' + t.getDate();
	}
	else {
		now = new Date( now );
		if( now.getDate() == t.getDate() )
			// This is today.  Just the time will do.
			// We'll add seconds because why not.
			s = twoDigits( t.getHours() )
			  + ':' + twoDigits( t.getMinutes() )
			  + ':' + twoDigits( t.getSeconds() );
		else
			// Show weekday and time.
			s = WEEKDAYS[ t.getDay() ] + ' '
			  + twoDigits( t.getHours() )
			  + ':' + twoDigits( t.getMinutes() );
	}

	td = document.createElement( 'td' );
	td.appendChild( document.createTextNode(s) );
	td.className = 'r';
	td.title = t.toLocaleString();

	return td;

	function twoDigits( n ) {
		n = String(n);
		return n.length < 2 ? '0' + n : n;
	}
}

function humanCoords( building ) {
	if( building.sector_id ) {
		return building.getSectorName() + ' [' +
			(typeof building.x == 'number' ? building.x : '?') + ',' +
			(typeof building.y == 'number' ? building.y : '?') + ']';
	}
	return 'need update';
}

// Shorthands we use above.
function addTH( tr, content, className, id ) {
	return addChild( tr, 'th', content, className, id );
}
function addTD( tr, content, className, id ) {
	return addChild( tr, 'td', content, className, id );
}
function addChild( parent, tagname, content, className, id ) {
	var elt = document.createElement( tagname );
	if( className )
		elt.className = className;
	if( id )
		elt.id = id;
	if( typeof content == 'string' )
		content = document.createTextNode( String(content) );
	if( content )
		elt.appendChild( content );
	parent.appendChild( elt );
	return elt;
}

chrome.storage.sync.get( universe.key, showOverview );

// To do
// * Sum all rows of a single column.
// * Add option to allow own buildings to be added.

})();
