// Commodities is a utility object to transform

var Commodities = (function() {

// Data taken from Pardus. 'i' is the icon, minus the image pack prefix and the
// .png suffix. 'n' is the proper name of a commodity. These specific ID
// numbers, the inconsistent capitalisation of names, and the inconsistent use
// of dashes and underscores, should all stay like this exactly (we need to
// match the game).

var CATALOGUE = {
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

var CATALOGUE_ARRAY, COMMODITY_IDS; // lazily initialized in Commodity.getId

var Commodities = {};

Commodities.getId = function( icon_name ) {
	if ( COMMODITY_IDS === undefined ) {
		var key;
		COMMODITY_IDS = {};
		for ( key in CATALOGUE )
			COMMODITY_IDS[ CATALOGUE[key].i ] = parseInt( key );
	}

	return COMMODITY_IDS[ icon_name ];
}

Commodities.getCommodity = function( id ) {
	if ( typeof id === 'number' )
		return getCommodityByInt( id );
	return CATALOGUE[ id ];
}

function getCommodityByInt( id ) {
	if ( CATALOGUE_ARRAY === undefined ) {
		var key;
		CATALOGUE_ARRAY = [];
		for ( key in CATALOGUE )
			CATALOGUE_ARRAY[ parseInt(key) ] = CATALOGUE[ key ];
	}

	return CATALOGUE_ARRAY[ id ];
}

return Commodities;

})();
