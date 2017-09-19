// This is a content script, it runs on main.php.
//
// Note that this is self-contained, it doesn't include any other script; nav is
// a page that needs to load fast so we try to keep this as small as it can be.
// Any heavy-lifting is sent to the extension's background page if possible.

(function() {

var COORDS_RX = /\[(\d+),(\d+)\]/;

// Fetches A elements in TDs of class "navBuilding"
var BLDGTILE_XPATH = document.createExpression(
	'./tbody/tr/td[@class="navBuilding"]/a', null );

// Match the onclick attribute of a tile.  If partial refresh is enabled, this
// will be ""navAjax(142080)"; if it's disabled, it will be "nav(142080)".
var TILEID_RX = /^nav(?:Ajax)?\((\d+)\)$/;

var bldgTileCache = {};
var userloc;

configure();

// End of execution; content script returns here.  Below are function
// definitions.

function configure() {
	// Insert a bit of script to execute in the page's context and
	// send us what we need. And add a listener to receive the call.
	window.addEventListener( 'message', onMessage, false );
	var script = document.createElement( 'script' );
	script.type = 'text/javascript';
	script.textContent = "(function() {var fn=function(){window.postMessage({bookkeeper:2,loc:typeof(userloc)=='undefined'?null:userloc},window.location.origin);};if(typeof(addUserFunction)=='function') addUserFunction(fn);fn();})();";
	document.body.appendChild(script);
}

// This is called when the page loads, and again whenever a partial refresh
// completes.

function onMessage( event ) {
	var element, sector, m, x, y,
	    data = event.data;

	if ( data.bookkeeper != 2 )
		return;

	event.stopPropagation();
	userloc = data.loc;

	// The stuff below, up to the local.set, shouldn't really be needed
	// anymore, because now we can get coordinates straight from the tile
	// id.  So XXX remove when possible.
	element = document.getElementById( 'tdStatusSector' );
	if ( element )
		sector = element.textContent.trim();
	element = document.getElementById( 'tdStatusCoords' );
	if ( element ) {
		m = COORDS_RX.exec( element.textContent );
		if ( m ) {
			x = parseInt( m[1] );
			y = parseInt( m[2] );
		}
	}

	chrome.storage.local.set( { sector: sector, x: x, y: y } );

	// This is needed.
	displayNavArea();
}

function displayNavArea() {
	var navTable, ukey, newCache, needed, needTicksDisplay, xpr,
	    a, onclkstr, m, loc, td, cached, i, end, op;

	// Yes, Pardus is a mess.
	navTable = document.getElementById( 'navareatransition' );
	if ( !navTable )
		navTable = document.getElementById( 'navarea' );
	if ( !navTable )
		return;

	ukey = document.location.hostname[0].toUpperCase();
	newCache = {};
	needed = [];
	needTicksDisplay = [];

	xpr = BLDGTILE_XPATH.evaluate(
		navTable, XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null );
	while ( (a = xpr.iterateNext()) !== null ) {
		onclkstr = a.getAttribute( 'onclick' );
		if ( onclkstr ) {
			m = TILEID_RX.exec( onclkstr );
			if ( !m )
				continue;
			loc = parseInt( m[1] );
		}
		else if ( a.id == 'stdCommand' ) {
			// If "standard command" is enabled in Pardus settings,
			// then the tile you're on doesn't get an "onclick"
			// thing, but a regular href.  It's still a building,
			// though, and we have the loc.
			loc = userloc;
		}
		else
			continue;

		td = a.parentElement;
		cached = bldgTileCache[ loc ];
		if ( cached ) {
			cached.td = td;
			if ( cached.ticks >= 0 ) {
				// This tile is cached and we already know its
				// ticks, so we won't request it again.  But
				// it's a new element created by Pardus' partial
				// refresh code, so we need to inject our little
				// marker again.
				needTicksDisplay.push( cached );
			}
		}
		else {
			needed.push( loc );
			cached = { td: td, ticks: -1 };
		}

		newCache[ loc ] = cached;
	}

	// Preserve in a global variable
	bldgTileCache = newCache;

	for ( i = 0, end = needTicksDisplay.length; i < end; i++ ) {
		cached = needTicksDisplay[ i ];
		addTicksDisplay( cached.td, cached.ticks );
	}

	if ( needed.length === 0 )
		return;

	op = {
		op: 'queryTicksLeft',
		ids: needed,
		ukey: ukey
	};

	chrome.runtime.sendMessage( op, onHaveTicks );
}

function onHaveTicks( r ) {
	var key, ticks, cached, elt;

	for ( key in r ) {
		ticks = r[ key ];
		cached = bldgTileCache[ key ];
		cached.ticks = ticks;
		addTicksDisplay( cached.td, ticks );
	}
}

function addTicksDisplay( td, ticks ) {
	var elt = document.createElement( 'div' );
	elt.className = 'bookkeeper-ticks';
	if ( ticks === 0 )
		elt.classList.add( 'red' );
	else if ( ticks === 1 )
		elt.classList.add( 'yellow' );
	elt.textContent = ticks;
	td.appendChild( elt );
}

})();
