// -*- js3-indent-level: 8; js3-indent-tabs-mode: t -*-

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
