(function (){
	//chrome.storage.sync.get ( null, function (result) { console.log ( result ) } );
	var universe = Universe.fromDocument ( document ); 	
	var buildingID = universe.key + document.location.search.split("=")[1];	
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
	console.log( buildingAmount_min );
	console.log( buildingAmount_max );
	
})();