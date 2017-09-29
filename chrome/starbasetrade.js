// This is a content script, it runs on starbase_trade.php and planet_trade.php.

var overviewToggle, overview, resizeRunning;

setup();

// End of script execution.

function setup() {
	var form, td, container, img;

	// Insert a BK button.  That's all our UI.

	form = document.forms.planet_trade || document.forms.starbase_trade;

	td = document.evaluate(
		'./table/tbody/tr/td[position()=2]', form, null,
		XPathResult.FIRST_ORDERED_NODE_TYPE,
		null).singleNodeValue;

	// Pardus actually leaves this TD empty, with a single &nbsp;.  So we'll
	// remove it and add our button there.
	//
	// If some other script ever uses this TD for their own UI... man
	// they'll be cross with us, haha.
	while ( td.firstChild )
		td.removeChild( td.firstChild );

	container = document.createElement( 'div' );
	container.id = 'bookkeeper-ui';

	img = document.createElement( 'img' );
	img.title = 'Pardus Bookkeeper';
	img.src = chrome.extension.getURL( 'icons/16.png' );
	container.appendChild( img );

	overviewToggle = document.createElement( 'button' );
	overviewToggle.id = 'bookkeeper-overview-toggle';
	overviewToggle.textContent = 'OPEN';
	overviewToggle.addEventListener( 'click', onToggleOverview, false );
	container.appendChild( overviewToggle );

	td.appendChild( container );
}

// XXX - The code below is going to change.  Right now, it's just cut & paste
// from nav.js, just as a proof of concept that now we can open overviews
// everywhere.  But planet/base trade screens don't need the overview flotaing
// fixed like nav does, we should position absolute and just make it as tall as
// the page.  And in any case, any code below that ends up shared with nav.js
// should really be segregated into its own file, avoid repetition.

function onToggleOverview( event ) {
	var op;

	event.preventDefault();

	if ( overview === undefined ) {
		// Show it
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
		document.defaultView.removeEventListener(
			'resize', onWindowResize );
	}

	function onItsSet() {
		var url;
		url = chrome.extension.getURL( '/html/overview.html' );
		overview = document.createElement( 'iframe' );
		overview.id = 'bookkeeper-overview-box';
		setOverviewSize();
		overview.src = url;
		document.body.appendChild( overview );
		overviewToggle.classList.add( 'on' );
		overviewToggle.disabled = false;
		document.defaultView.addEventListener(
			'resize', onWindowResize );
	}
}

function onWindowResize( event ) {
	if ( resizeRunning )
		return;
	resizeRunning = true;
	document.defaultView.requestAnimationFrame( setOverviewSize );
}

function setOverviewSize() {
	var window, fw, fh, nav, navw, navh, y, h;

	resizeRunning = false;

	if ( !overview )
		return;

	// The whole tab when running out of the frameset; otherwise the main
	// Pardus frame.
	window = document.defaultView;

	// This is the real estate we have available to play with.
	fw = window.innerWidth;
	fh = window.innerHeight;

	y = 139;

	// And we'd like our iframe's bottom to sit 5px above the bottom of the
	// window.

	h = fh - 5 - y;

	overview.style.top = y + 'px';
	overview.style.left = '50px';
	overview.width = fw - 100;
	overview.height = h;
}
