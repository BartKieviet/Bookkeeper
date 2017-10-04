// This is a content script. It runs on building_trade_settings.php?object=<id>
//
// It extracts maximums and minimums for this building.  It could get more
// things (type and amount, thus selling and buying), but we don't need that:
// the building will only be updated if it is already in storage, and in that
// case it will have those things already (or will get them from overview.js).

var universe = Universe.fromDocument( document );
var loc = parseInt( document.location.search.split('=')[1] );
var buildingID;

if ( loc !== null ) {
	buildingID = universe.key + loc;
	chrome.storage.sync.get( buildingID, storeBuilding );
}

// End of script execution.

function buildingLoc() {
	var m = /object=(\d+)/.exec( document.location.search );
	if ( !m )
		return null;
	return parseInt( m[1] );
}

function storeBuilding( data ) {
	var elements, i, end, id, c, input, m, val, building;

	if ( !data[buildingID] )
		return;
	building = Building.createFromStorage( buildingID, data[buildingID] );

	elements = document.forms.tradesettings.elements;
	for ( i = 0, end = elements.length; i < end; i++ ) {
		input = elements[ i ];
		m = /^(\d+)_(amount_max|amount_min)$/.exec( input.name );
		if ( !m )
			continue;
		id = parseInt( m[1] );
		val = parseInt( input.value );
		if ( isNaN(val) )
			// Bail out, who knows what's in this form and we don't
			// want corrupt data.
			return;

		if ( m[2] === 'amount_max' )
			building.maximum[ id ] = val;
		else
			building.minimum[ id ] = val;
	}

	data = {};
	data[ buildingID ] = building.toStorage();
	chrome.storage.sync.set( data );
}
