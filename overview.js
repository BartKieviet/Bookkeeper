// -*- js3-indent-level: 8; js3-indent-tabs-mode: t -*-

(function (){

// Data taken from Pardus. 'i' is the icon, minus the image pack prefix and the
// .png suffix. 'n' is the proper name of a commodity.  These specific ID
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

var BUILDING_SHORTNAMES = {
	'Alliance Command Station': 'ACS',
	'Asteroid Mine': 'AM',
	'Battleweapons Factory': 'BWF',
	'Brewery': 'Br',
	'Chemical Laboratory': 'CL',
	'Clod Generator': 'CG',
	'Dark Dome': 'DD',
	'Droid Assembly Complex': 'DAC',
	'Drug Station': 'DS',
	'Electronics Facility': 'EF',
	'Energy Well': 'EW',
	'Fuel Collector': 'FC',
	'Gas Collector': 'GC',
	'Handweapons Factory': 'HWF',
	'Leech Nursery': 'LN',
	'Medical Laboratory': 'ML',
	'Military Outpost': 'MO',
	'Nebula Plant': 'NP',
	'Neural Laboratory': 'NL',
	'Optics Research Center': 'ORC',
	'Plastics Facility': 'PF',
	'Radiation Collector': 'RC',
	'Recyclotron': 'Rcy',
	'Robot Factory': 'RF',
	'Slave Camp': 'SC',
	'Smelting Facility': 'Sm',
	'Space Farm': 'SF',
	'Stim Chip Mill': 'SCM'
};

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
	}
};

function compareAsInt( a, b ) {
	return parseInt(a) - parseInt(b);
}

var credits_img = "<img src='//static.pardus.at/img/stdhq/credits_16x16.png' alt='Credits' width='16' height='16' style='vertical-align: middle;'>",
    universe = getUniverse(),
    buildingListId = universe + "BuildingList",
    sortCritKey = universe + 'OverviewSortCrit',
    sortAscKey = universe + 'OverviewSortAsc';

function showOverview( data ) {
	// Data contains a property whose name we computed and stored in the
	// buildingListId variable.  Its value is an array of location IDs of
	// every building tracked.
	var buildingList = data[ buildingListId ];

	if( !buildingList )
		// No configuration, odd. Do nothing.
		return;

	var prefix = universe + "Building",
	    keys = [ sortCritKey, sortAscKey ],
	    i, end;

	// Build an array of storage keys that we'll need to display the overview.
	for( i = 0, end = buildingList.length; i < end; i++ ) {
		keys.push( prefix + buildingList[i] );
	}

	// Query everything in one swoop.
	chrome.storage.local.get( keys, showOverviewBuildings );
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
		b = JSON.parse( data[key] );
		if( !b.level )
			b.level = -1;
		b.stype = BUILDING_SHORTNAMES[ b.type ] || '???';
		b.ticks = numberOfTicks( b );
		buildings.push( b );
	}

	return buildings;
}

function showOverviewBuildings( data ) {
	var buildings, b, ckey, commodity, container, end, h1, i, img, in_use,
	    key, table, tbody, thead, tr, sort, ascending;

	// Get the sorting keys
	sort = data[ sortCritKey ];
	ascending = data[ sortAscKey ];
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
	container.id = 'copilot-overview';

	table = document.createElement( 'table' );
	thead = document.createElement( 'thead' );

	tr = document.createElement( 'tr' );
	addTH( tr, 'Location', 'sort', 'copilot-hdr-loc' );
	addTH( tr, 'Type', 'sort', 'copilot-hdr-type' );
	addTH( tr, 'Owner', 'sort', 'copilot-hdr-owner' );
	addTH( tr, 'Lvl', 'sort', 'copilot-hdr-level' );
	for( i = 0, end = in_use.length; i < end; i++ ) {
		ckey = in_use[i];
		commodity = COMMODITIES[ckey];
		img = document.createElement( 'img' );
		img.src = '//static.pardus.at/img/stdhq/res/'
			+ commodity.i + '.png';
		img.title = commodity.n;
		addTH( tr, img, 'c' );
	}

	addTH( tr, 'Updated', 'sort', 'copilot-hdr-time' );
	addTH( tr, 'Ticks', 'sort', 'copilot-hdr-ticks' );

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
	h1.className = 'copilot';
	img = document.createElement( 'img' );
	img.src = chrome.extension.getURL( 'icons/24.png' );
	h1.appendChild( img );
	h1.appendChild( document.createTextNode('Copilot Overview') );

	anchor.parentNode.insertBefore( h1, anchor );
	anchor.parentNode.insertBefore( container, anchor );

	function onHeaderClick( event ) {
		var target = event.target;
		if( target.id && target.id.startsWith( 'copilot-hdr-' ) ) {
			event.stopPropagation();
			var newsort = target.id.substr( 12 );
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
	var key, building, tr, cell, img, ckey, n, i , end, j, jend, commodity, sortfn, fn;

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
		if( building.type )
			cell.title = building.type;
		addTD( tr, building.owner || 'need update' );
		addTD( tr, building.level > 0 ? String(building.level) : '??', 'right' );

		for( j = 0, jend = in_use.length; j < jend; j++ ) {
			ckey = in_use[j];
			commodity = COMMODITIES[ckey];

			// If upkeep we do amount - min, else we do max - amount and make it negative..
			if( building.res_upkeep[ckey] )
				n = String( -(building.amount_max[ckey] - building.amount[ckey]) );
			else if( building.res_production[ckey] )
				n = String( building.amount[ckey] - building.amount_min[ckey] );
			else
				n = null;

			cell = addTD( tr, n );
			if( n ) {
				cell.title = commodity.n;
				cell.className = 'c';
			}
		}

		cell = makeTimeTD( building.time );
		tr.appendChild( cell );

		addTD( tr, building.ticks < Infinity ? String(building.ticks) : '??', 'r' );

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
	if( building.sector ) {
		return building.sector + ' [' +
			(typeof building.x == 'number' ? building.x : '?') + ',' +
			(typeof building.y == 'number' ? building.y : '?') + ']';
	}
	return 'need update';
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

chrome.storage.local.get(buildingListId,showOverview);

// To do
// * Sum all rows of a single column.
// * Add option to allow own buildings to be added.

})();
