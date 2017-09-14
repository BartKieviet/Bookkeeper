// -*- js3-indent-level: 8; js3-indent-tabs-mode: t -*-

// Contains functions used in both files.

function removeBuilding( loc, universe, callback ) {
	//chrome.storage.local.get(null,function(result){console.log(result)});
	chrome.storage.sync.get( universe.key, removeBuildingData );

	function removeBuildingData( data ) {
		var list = data[ universe.key ],
		    index = list.indexOf( loc );

		list.splice( index, 1 );
		data = {};
		data[ universe.key ] = list;

		chrome.storage.sync.remove( universe.key + loc )
		chrome.storage.sync.set( data, callback );
	}
}
