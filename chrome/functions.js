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

var Universe = (function() {

var UNIVERSE_KEYS = {
	artemis: 'A',
	orion: 'O',
	pegasus: 'P'
};

function Universe( universe_name ) {
	var key = UNIVERSE_KEYS[ universe_name ];
	if( !key )
		throw( 'Unsupported universe ' + universe_name );
	this.name = universe_name;
	this.key = key;
}

Universe.fromDocument = function( doc ) {
	var m = /^([^.]+)\.pardus\.at$/.exec( document.location.hostname );
	if ( m )
		return new Universe( m[1] );
	return null;
}

return Universe;

})();

var WEEKDAYS = [ 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat' ];
var MONTHS = [ 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
	       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec' ];
