// -*- js3-indent-level: 8; js3-indent-tabs-mode: t -*-

(function( doc ) {

var COORDS_RX = /\[(\d+),(\d+)\]/;

configure();

// End of execution; content script returns here.  Below are function definitions.

function configure() {
	// Insert a bit of script to execute in the page's context and
	// send us what we need. And add a listener to receive the call.
	var window = doc.defaultView;
	window.addEventListener( 'message', onMessage, false );
	var script = doc.createElement( 'script' );
	script.type = 'text/javascript';
	script.textContent = "(function() {var fn=function(){window.postMessage({bookkeeper:2,loc:typeof(userloc)=='undefined'?null:userloc},window.location.origin);};if(typeof(addUserFunction)=='function') addUserFunction(fn);fn();})();";
	doc.body.appendChild(script);
}

function onMessage( event ) {
	var element, sector, m, x, y,
	    data = event.data;

	if( data.bookkeeper != 2 )
		return;

	event.stopPropagation();
	element = doc.getElementById( 'tdStatusSector' );
	if( element )
		sector = element.textContent.trim();
	element = doc.getElementById( 'tdStatusCoords' );
	if( element ) {
		m = COORDS_RX.exec( element.textContent );
		if( m ) {
			x = parseInt( m[1] );
			y = parseInt( m[2] );
		}
	}

	chrome.storage.local.set({ sector: sector, x: x, y: y });
}

})( document );