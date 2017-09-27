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

var bldgTileCache, ticksToggle, ticksEnabled, bbox, userloc,
    overviewToggle, overview;

chrome.storage.local.get( 'navticks', configure );

// End of content script execution.

function configure( data ) {
	var cargoBox, ui, e, ctr, ctd, tr, td;

	ticksEnabled = ( data.navticks === true );
	bldgTileCache = {};

	// Insert a bit of script to execute in the page's context and
	// send us what we need. And add a listener to receive the call.
	window.addEventListener( 'message', onMessage, false );
	var script = document.createElement( 'script' );
	script.type = 'text/javascript';
	script.textContent = "(function() {var fn=function(){window.postMessage({bookkeeper:2,loc:typeof(userloc)=='undefined'?null:userloc},window.location.origin);};if(typeof(addUserFunction)=='function') addUserFunction(fn);fn();})();";
	document.body.appendChild(script);

	// Find the Cargo box and append our UI to it.
	cargoBox = document.getElementById( 'cargo_content' );
	if ( !cargoBox )
		return;

	ui = document.createElement( 'div' );
	ui.id = 'bookkeeper-ui';
	e = document.createElement( 'img' );
	e.title = 'Pardus Bookkeeper';
	e.src = chrome.extension.getURL( 'icons/16.png' );
	ui.appendChild( e );
	e = document.createElement( 'button' );
	e.id = 'bookkeeper-navticks-switch';
	e.textContent = 'TICKS';
	e.addEventListener( 'click', onToggleTicks, false );
	ticksToggle = e;
	ui.appendChild( e );

	e = document.createElement( 'button' );
	e.id = 'bookkeeper-overview-toggle';
	e.textContent = 'OPEN';
	e.addEventListener( 'click', onToggleOverview, false );
	overviewToggle = e;
	ui.appendChild( e );

	// Wish we could insert directly in the cargo box, but partial refresh
	// does nasty things to it.

	ctd = cargoBox.parentElement;
	ctr = ctd.parentElement;
	tr = document.createElement( 'tr' );
	td = document.createElement( 'td' );
	td.style.cssText = ctd.style.cssText;
	td.appendChild( ui );
	tr.appendChild( td );
	ctr.parentElement.insertBefore( tr, ctr.nextElementSibling );

	updateTicksToggle();
}

function updateTicksToggle() {
	if ( ticksEnabled )
		ticksToggle.classList.add( 'on' );
	else
		ticksToggle.classList.remove( 'on' );
}

function onToggleTicks() {
	ticksEnabled = !ticksEnabled;
	ticksToggle.disabled = true;
	chrome.storage.local.set( { 'navticks': ticksEnabled }, onSaved );

	function onSaved() {
		updateTicksToggle();
		if ( ticksEnabled )
			showTicks();
		else
			hideTicks();
		ticksToggle.disabled = false;
	}
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
	if ( ticksEnabled )
		showTicks();
}

function showTicks() {
	var navTable, ukey, newCache, needed, needTicksDisplay, xpr,
	    a, onclkstr, m, loc, td, cached, i, end, op;

	navTable = getNavArea();
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
			cached = { loc: loc, td: td, ticks: -1 };
		}

		newCache[ loc ] = cached;
	}

	// Preserve in a global variable
	bldgTileCache = newCache;

	for ( i = 0, end = needTicksDisplay.length; i < end; i++ ) {
		cached = needTicksDisplay[ i ];
		addTickThingies( cached );
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
	var key, ticks, cached, elt, stocked;

	for ( key in r ) {
		ticks = r[ key ].t;
		stocked = r [ key ].f;
		cached = bldgTileCache[ key ];
		cached.ticks = ticks;
		cached.stocked = stocked;
		addTickThingies( cached );
	}
}

function addTickThingies( cached ) {
	var elt = document.createElement( 'div' );
	elt.className = 'bookkeeper-ticks';
	elt.dataset.bookkeeperLoc = cached.loc;
	if ( cached.ticks === 0 )
		elt.classList.add( 'red' );
	else if ( cached.ticks === 1 )
		elt.classList.add( 'yellow' );
	if (cached.stocked) {
		elt.classList.add( 'grey' );
	}
	elt.textContent = cached.ticks;
	cached.td.appendChild( elt );
	elt.addEventListener( 'click', onSkittleClick, false );
}

function hideTicks() {
	var elts = getNavArea().getElementsByClassName( 'bookkeeper-ticks' );
	while ( elts.length > 0 )
		elts[0].remove();
	bldgTileCache = {};
}

function getNavArea() {
	// Yes, Pardus is a mess.
	var navTable = document.getElementById( 'navareatransition' );
	if ( !navTable )
		navTable = document.getElementById( 'navarea' );
	return navTable;
}

// XXX - The following two handlers are too similar, combine common
// functionality in one call.

function onToggleOverview( event ) {
	var op;

	event.preventDefault();

	console.log( 'onToggleOverview', overview );

	if ( overview === undefined ) {
		overviewToggle.disabled = true;
		// open the overview
		op = {
			op: 'setPopUpData',
			data: {
				ukey: document.location.hostname[0].
					toUpperCase(),
				mode: 'nav-embedded'
			}
		};
		chrome.runtime.sendMessage( op, onItsSet );
	}
	else {
		// hide it
		overview.remove();
		overview = undefined;
		overviewToggle.classList.remove( 'on' );
	}

	function onItsSet() {
		var url;
		url = chrome.extension.getURL( '/html/overview.html' );
		overview = document.createElement( 'iframe' );
		overview.id = 'bookkeeper-overview-box';
		overview.src = url;
		document.body.appendChild( overview );
		overviewToggle.classList.add( 'on' );
		overviewToggle.disabled = false;
	}
}

// Like the above, but we have loc
function onSkittleClick( event ) {
	var op;

	event.preventDefault();

	if ( bbox )
		bbox.remove();

	op = {
		op: 'setPopUpData',
		data: document.location.hostname[0].toUpperCase() +
			event.target.dataset.bookkeeperLoc
	};
	chrome.runtime.sendMessage( op, onItsSet );

	function onItsSet() {
		var url;
		url = chrome.extension.getURL( '/html/bbox.html' );
		bbox = document.createElement( 'iframe' );
		bbox.id = 'bookkeeper-building-box';
		bbox.src = url;
		document.body.appendChild( bbox );
	}
}

})();
