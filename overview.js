(function (){

// Data taken from Pardus. 'i' is the icon, minus the image pack prefix and the
// .png suffix. 'n' is the proper name of a commodity.

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
// This is handy to preserve order
var COMMODITY_INDICES = Object.keys( COMMODITIES ).sort( compareAsInt );

var BUILDING_SHORTNAMES = {
	'Alliance Command Station': 'ACS',
	'Asteroid Mine': 'AM',
	'Battleweapons Factory': 'BWF',
	'Brewery': 'Brew',
	'Chemical Laboratory': 'CL',
	'Clod Generator': 'Clod',
	'Dark Dome': 'Dome',
	'Droid Assembly Complex': 'DAC',
	'Drug Station': 'DS',
	'Electronics Facility': 'EF',
	'Energy Well': 'Ewell',
	'Fuel Collector': 'FC',
	'Gas Collector': 'GC',
	'Handweapons Factory': 'HWF',
	'Leech Nursery': 'Leech',
	'Medical Laboratory': 'ML',
	'Nebula Plant': 'NP',
	'Neural Laboratory': 'Neur',
	'Optics Research Center': 'ORC',
	'Plastics Facility': 'PF',
	'Radiation Collector': 'RC',
	'Recyclotron': 'Recyc',
	'Robots Factory': 'RF',
	'Slave Camp': 'SC',
	'Smelting Facility': 'Smelt',
	'Space Farm': 'Farm',
	'Stim Chip Mill': 'SCM'
};

var WEEKDAYS = [ 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat' ];
var MONTHS = [ 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
	       'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec' ];

function compareAsInt( a, b ) {
	return parseInt(a) - parseInt(b);
}

var credits_img = "<img src='//static.pardus.at/img/stdhq/credits_16x16.png' alt='Credits' width='16' height='16' style='vertical-align: middle;'>";
var universe = getUniverse();
var buildingListId = universe + "BuildingList";

function showOverview( data ) {
	// Data contains a property named as the contents of the buildingListId
	// variable.  This is an array of location IDs of every building tracked.
	var buildingList = data[ buildingListId ],
	    prefix = universe + "Building",
	    buildingKeys = [],
	    i, end;

	// Build an array of storage keys that we'll need to display the overview.
	for( i = 0, end = buildingList.length; i < end; i++ ) {
		buildingKeys.push( prefix + buildingList[i] );
	}

	// Query everything in one swoop.
	chrome.storage.local.get( buildingKeys, showOverviewBuildings );
}

// Return an array of commodities actually in use by the collection of buildings
// given.
function getCommoditiesInUse( buildingData ) {
	// Now figure out which commodities are actually in use by at least one building.
	var in_use = new Object(),
	    key, commodity;

	for( key in buildingData ) {
		// XXX - do we need to check something other than `amount` ?
		for( commodity in buildingData[key].amount )
			in_use[commodity] = true;
	}

	return Object.keys( in_use ).sort( compareAsInt );
}

function showOverviewBuildings( buildingData ) {
	var in_use, key, ckey, i, end, commodity, table, tr, cell, img, building, n;

	// Parse each building.
	for( key in buildingData )
		buildingData[key] = JSON.parse( buildingData[key] );

	in_use = getCommoditiesInUse( buildingData );

	// Build the table and headers
	table = document.createElement( 'table' );

	tr = document.createElement( 'tr' );
	addTH( tr, 'Location' );
	addTH( tr, 'Owner' );
	addTH( tr, 'Type' );
	addTH( tr, 'Lvl' );
	for( i = 0, end = in_use.length; i < end; i++ ) {
		ckey = in_use[i];
		commodity = COMMODITIES[ckey];
		img = document.createElement( 'img' );
		img.src = '//static.pardus.at/img/stdhq/res/'
			+ commodity.i + '.png';
		img.title = commodity.n;
		addTH( tr, img );
	}
	addTH( tr, 'Updated' );
	addTH( tr, '' ); // the bin icon column
	table.appendChild( tr );

	// Now add a row per building
	for( key in buildingData ) {
		building = buildingData[ key ];
		tr = document.createElement( 'tr' );

		addTD( tr, String(building.loc) );
		addTD( tr, building.owner || 'need update' );
		if( building.type ) {
			cell = addTD( tr, BUILDING_SHORTNAMES[building.type] || building.type );
			cell.title = building.type;
		}
		else
			addTD( tr, 'need update' );
		addTD( tr, building.level ? String(building.level) : '?');

		for( i = 0, end = in_use.length; i < end; i++ ) {
			ckey = in_use[i];
			commodity = COMMODITIES[ckey];

			// If upkeep we do amount - min, else we do max - amount and make it negative..
			if( building.res_upkeep[ckey] )
				n = String( -(building.amount_max[ckey] - building.amount[ckey]) );
			else if( building.res_production[ckey] )
				n = String( building.amount[ckey] - building.amount_min[ckey] );
			else
				n = null;

			cell = addTD( tr, n );
			if( n )
				cell.title = commodity.n;
		}

		cell = makeTimeTD( building.time );
		tr.appendChild( cell );

		img = document.createElement("img");
		img.src = "http://static.pardus.at/img/stdhq/ui_trash.png";
		img.onclick = function() {
			removeBuilding( building.loc, universe );
			row.style.display = "none";
		};
		addTD( tr, img );
		table.appendChild( tr );
	}

	table.style.background = "url(//static.pardus.at/img/stdhq/bgdark.gif)";
	table.setAttribute("class" , "messagestyle");
	table.align = "center"
	document.getElementsByTagName("h1")[0].parentNode.appendChild(table);

	// Shorthands we use above..
	function addTH( tr, content ) { return addChild( tr, 'th', content ); }
	function addTD( tr, content ) { return addChild( tr, 'td', content ); }
	function addChild( parent, tagname, content ) {
		if( typeof content == 'string' )
			content = document.createTextNode( String(content) );
		var elt = document.createElement( tagname );
		if( content )
			elt.appendChild( content );
		parent.appendChild( elt );
		return elt;
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
	td.title = t.toLocaleString();

	return td;

	function twoDigits( n ) {
		n = String(n);
		return n.length < 2 ? '0' + n : n;
	}
}

//chrome.storage.local.get(null,function (data){console.log(JSON.stringify(data))});

chrome.storage.local.get(buildingListId,showOverview);

// To do
// X Make universe specific. -> added on 4 sept '17
// * Add owner (since it is in the building_trade html).
// * Add type based on res_upkeep or res_production (or from building trade html)
// * Sum all rows of a single column.
// * Add building delete button.
// * Add option to allow own buildings to be added.
// * Find a way to convert location number to Sector [x,y].

})();
