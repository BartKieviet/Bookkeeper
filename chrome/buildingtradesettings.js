(function (){
	
function storeBuilding ( data ) {
	
	var buildingList = data [ universe.key ]; 

	var buildingAmount_max = {};
	var buildingAmount_min = {};
	var key = "";
	var inputs = document.getElementsByTagName( "input" );

	for ( var i = 0; i < inputs.length ; i++ ) {
		if (inputs[i].name.indexOf ("amount_max") != -1) {
			key = inputs[i].name.split( "_" )[0];
			buildingAmount_max[key] = parseInt( inputs[i].value );
		}

		if (inputs[i].name.indexOf ("amount_min") != -1) {
			key = inputs[i].name.split( "_" )[0];
			buildingAmount_min[key] = parseInt( inputs[i].value );
		}
	}

	var storeData = {};

	// Add the new IDs to the building list.
	if ( !buildingList ) {
		buildingList[ universe.key ] = [];
	}
	if ( buildingList.indexOf( loc ) === -1 ) {
		buildingList.push( loc );
		storeData[ universe.key ] = buildingList;
		var building = new Building();
		building[ loc ] = loc;
		building[ amount_max ] = buildingAmount_max;
		building[ amount_min ] = buildingAmount_min;
		storeData[ buildingID ] = building.toStorage();
		chrome.storage.sync.set( storeData );
	} else { 
		chrome.storage.sync.get ( buildingID , getBuildingData.bind(null, buildingAmount_min, buildingAmount_max , storeData ) );
	}
}

function getBuildingData ( buildingAmount_min, buildingAmount_max, storeData, building ) {
	var newBuilding = Building.createFromStorage ( buildingID, building [ buildingID ] );
	newBuilding [ "amount_max" ] = buildingAmount_max;
	newBuilding [ "amount_min" ] = buildingAmount_min;
	storeData[ buildingID ] = newBuilding.toStorage();
	chrome.storage.sync.set( storeData );
}
	
var universe = Universe.fromDocument ( document );
var loc = parseInt(document.location.search.split("=")[1]);
var buildingID = universe.key + loc;

chrome.storage.sync.get ( universe.key , storeBuilding ); 
})();
