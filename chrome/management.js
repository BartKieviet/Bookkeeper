'use strict';

// From other scripts injected
var Universe, Building;

var previewSettingKey = 'previewAutoTransfer';
var universe = Universe.fromDocument ( document );

// Globals set during configuration
var configured, userloc, time, shipSpace, buildingSpace, buildingKey,
    pageData, building, previewEnabled, previewCheckbox;

configure();

// End of script execution.

function configure() {
	if (!configured) {
		document.defaultView.addEventListener( 'message', onGameMessage );
		var script = document.createElement( 'script' );
		script.type = 'text/javascript';
		var s = "\
(function() {var fn=function(){window.postMessage({pardus_bookkeeper:3,\
loc:typeof(userloc)=='undefined'?null:userloc,\
time:typeof(milliTime)=='undefined'?null:milliTime,\
ship_space:typeof(ship_space)=='undefined'?null:ship_space,\
obj_space:typeof(obj_space)=='undefined'?null:obj_space,\
},window.location.origin);};\
if(typeof(addUserFunction)=='function')addUserFunction(fn);fn();})();";
		script.textContent = s;
		document.body.appendChild( script );
		configured = true;
	}
}

// Arrival of a message means the page contents were updated.  The
// message contains the value of our variables, too.
function onGameMessage( event ) {
	var data = event.data;

	if ( !data || data.pardus_bookkeeper !== 3 ) {
		return;
	}

	userloc = parseInt( data.loc );
	time = data.time;
	shipSpace = parseInt ( data.ship_space );
	buildingSpace = parseInt ( data.obj_space );
	buildingKey = Building.storageKey( universe.key, userloc );

	// Configured, let's get started.  Parse the page, then get the building
	// record from storage.

	pageData = parsePage();
	chrome.storage.sync.get( buildingKey, onBuildingData );
}

// Lift all the data we can lift from this page.

function parsePage() {
	var s, m, r, as, a;

	r = {};

	// Get the building type

	s = document.evaluate(
		'//h1', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE,
		null).singleNodeValue.textContent.trim()
	r.typeId = Building.getTypeId( s );
	if ( r.typeId === undefined )
		return null;

	// Get ticks left

	s = document.evaluate(
		'//td[h1]/b[starts-with(text(),"Upkeep stock will last for:")]',
		document, null, XPathResult.FIRST_ORDERED_NODE_TYPE,
		null).singleNodeValue.textContent;
	m = /: (\d+) production round/.exec( s );
	if ( !m )
		return null;
	r.ticksLeft = parseInt( m[1] );

	as = document.evaluate('.//a[starts-with(@href,"javascript:useMax(")]',
			       document.forms.building_man, null,
			       XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null);
	r.comm = [];
	r.ship = [];
	r.stock = [];
	while ( (a = as.iterateNext()) != null ) {
		m = /^javascript:useMax\('(ship|comm|stock)', (\d+), (\d+)/.exec(
			a.getAttribute( 'href' ) );
		if ( !m )
			continue;
		r[ m[1] ][ parseInt(m[2]) ] = parseInt( m[3] );
	}

	return r;
}

function onBuildingData( data ) {
	data = data[ buildingKey ];
	if ( data !== undefined ) {
		building = Building.createFromStorage ( buildingKey, data );
		// Hasn't changed type? lol could happen I guess
		if ( building.typeId === pageData.typeId &&
		     building.hasMinMax() ) {
			// All well so far, get the preview setting.  Note
			// stored in local, not sync.
			chrome.storage.local.get(
				previewSettingKey, onPrefsData );
			return;
		} else if ( !building.hasMinMax() ) {
			requestUpdateGUI();
		}
	} else {
		requestUpdateGUI();
	}
}

function requestUpdateGUI() {
	// stolen from addUI()
	var div, label, img, getMins;
	div = document.createElement( 'div' );
	div.id = 'bookkeeper-quick-buttons';
	label = document.createElement( 'label' );
	img = document.createElement( 'img' );
	img.src = chrome.extension.getURL( 'icons/16.png' );
	img.title = 'Pardus Bookkeeper';
	label.appendChild( img );
	label.appendChild( document.createTextNode('Quick Buttons') );
	getMins = document.createElement( 'button' );
	getMins.textContent = 'Min/Maxes unknown\nplease update';
	div.appendChild( label );
	div.appendChild( document.createElement('br') );
	div.appendChild( getMins );
	div.appendChild( document.createElement('br') );
	document.forms.building_man.elements.trade_ship.parentElement.appendChild( div );
	getMins.addEventListener( 'click' , function() {
		window.open('/building_trade_settings.php?object=' + userloc, '_blank' )
	} );
}

function onPrefsData( data ) {
	previewEnabled = !!data[ previewSettingKey ];

	// Ok we're all set now, have the building and preferences, let's roll.

	updateBuilding();
	addUI();
}

function updateBuilding() {
	building.time = Building.now();
	building.ticksLeft = pageData.ticksLeft;
	building.forSale = building.minimum.reduce(
		function( forSale, min, id ) {
			var amt = pageData.comm[ id ];
			if ( amt !== undefined )
				forSale[ id ] = Math.max( 0, amt - min );
			else
				forSale[ id ] = 0;
			return forSale;
		},
		[]
	);

	building.toBuy = building.maximum.reduce(
		function( toBuy, max, id ) {
			var amt = pageData.stock[ id ];
			if ( amt !== undefined )
				toBuy[ id ] = Math.max( 0, max - amt );
			else
				toBuy[ id ] = 0;
			return toBuy;
		},
		[]
	);

	var data = {};
	data[ buildingKey ] = building.toStorage();
	chrome.storage.sync.set( data );
}

function addUI() {
	var pardusButton, div, label, img, preview, autoSell, autoBuy, autoBoth;

	// Imitate the "quick buttons" thing in the regular trade screen.
	// Except let's not as scummy as Pardus and save all the styling for the
	// stylesheet.

	// XXX - this is nasty.  Remind me to write a function to load HTML
	// snippets. ~V

	div = document.createElement( 'div' );
	div.id = 'bookkeeper-quick-buttons';

	label = document.createElement( 'label' );
	img = document.createElement( 'img' );
	img.src = chrome.extension.getURL( 'icons/16.png' );
	img.title = 'Pardus Bookkeeper';
	label.appendChild( img );
	label.appendChild( document.createTextNode('Quick Buttons') );
	autoSell = document.createElement( 'button' );
	autoSell.textContent = 'Transfer upkeep ->';
	autoBuy = document.createElement( 'button' );
	autoBuy.textContent = '<- Transfer production';
	autoBoth = document.createElement( 'button' );
	autoBoth.textContent = '<- Auto Transfer ->';
	preview = document.createElement( 'label' );
	// previewCheckBox is a global, remember
	previewCheckbox = document.createElement( 'input' );
	previewCheckbox.type = 'checkbox';
	previewCheckbox.checked = previewEnabled;
	previewCheckbox.id = 'bookkeeper-preview';
	preview.appendChild( previewCheckbox );
	preview.appendChild( document.createTextNode('Preview') );

	div.appendChild( label );
	div.appendChild( document.createElement('br') );
	div.appendChild( autoSell );
	div.appendChild( document.createElement('br') );
	div.appendChild( autoBuy );
	div.appendChild( document.createElement('br') );
	div.appendChild( autoBoth );
	div.appendChild( document.createElement('br') );
	div.appendChild( preview );

	document.forms.building_man.elements.trade_ship.parentElement.
		appendChild( div );

	autoSell.addEventListener( 'click', onAutoSell );
	autoBuy.addEventListener( 'click', onAutoBuy );
	autoBoth.addEventListener( 'click', onAutoBoth );
	previewCheckbox.addEventListener( 'click', onPreviewToggle );
}

// XXX - Some similar code in these three fns below.  Can we isolate the common
// stuff further, and write it only once?

function onAutoSell( event ) {
	var upkeep, ship, transfer;

	event.preventDefault();

	// In a transfer from ship to building, the desired commodities are the
	// building's upkeep ones.  The source is the ship, but we don't want to
	// consider more than the amount the building will buy of each
	// commodity.  Destination space is the space in the building.

	upkeep = building.getUpkeepCommodities();
	ship = capAmounts( pageData.ship, building.toBuy );
	transfer = computeTransfer( upkeep, ship, buildingSpace );
	sendForm( 'ship_', transfer );
}

function onAutoBuy( event ) {
	var upkeep, production, transfer;

	event.preventDefault();

	// In a transfer from building to ship, the desired commodities are the
	// building's production ones.  We don't store that directly, but it can
	// be inferred from the building's maximums: it'll be any commodities
	// that have a maximum, but are not part of the building's upkeep.

	// XXX - this should be a method of Building.prototype
	upkeep = building.getUpkeepCommodities();
	production = building.maximum.reduce(
		function( prod, val, id ) {
			if ( upkeep.indexOf(id) === -1 )
				prod.push( id );
			return prod;
		},
		[]
	);
	transfer = computeTransfer(
		production, pageData.comm, shipSpace );
	sendForm( 'comm_', transfer );
}

function onAutoBoth( event ) {
	var upkeep, production, ship, s2b, b2s;

	event.preventDefault();

	// As the two handlers above, only, after the transfer from ship to
	// building, we'll have more space in the ship, so we consider that.

	upkeep = building.getUpkeepCommodities();
	production = building.maximum.reduce(
		function( prod, val, id ) {
			if ( upkeep.indexOf(id) === -1 )
				prod.push( id );
			return prod;
		},
		[]
	);
	ship = capAmounts( pageData.ship, building.toBuy );
	s2b = computeTransfer( upkeep, ship, buildingSpace );
	b2s = computeTransfer(
		production, pageData.comm, shipSpace + s2b.total );
	sendForm( 'ship_', s2b, 'comm_', b2s );
}

function onPreviewToggle( event ) {
	var items;

	previewEnabled = event.target.checked;
	items = {};
	items[ previewSettingKey ] = previewEnabled;
	chrome.storage.local.set( items );
}

// This takes an even number of argumenst: the first is a prefix, the second a
// transfer, the third another prefix, the fourth another transfer, etc.
function sendForm() {
	var i, form, prefix, transfer;

	form = document.forms.building_man;

	form.reset();
	// Annoyingly, the above resets our checkbox too
	previewCheckbox.checked = previewEnabled;

	i = 0;
	while ( i < arguments.length ) {
		prefix = arguments[i++];
		transfer = arguments[i++]
		transfer.amount.forEach(
			function( n, id ) {
				if ( n > 0 )
					form.elements[ prefix + id ].value = n;
			} );
	}

	if ( !previewEnabled )
		document.forms.building_man.elements.trade_ship.click();
}

// Given an array of amounts, and an array of caps, compute a new array in which
// none of the amounts exceed the cap.
//
// `amount` and `cap` are both sparse arrays: indices are commodity ids, and
// values are the value for that commodity.  If an id appears in `amount` but
// not in `cap`, it is not included in the result.

function capAmounts( amount, cap ) {
	return cap.reduce(
		function( capped, cap, id ) {
			var amt = amount[ id ];
			if ( amt !== undefined )
				capped[ id ] = amt > cap ? cap : amt;
			return capped;
		},
		[]
	);
}

// Compute an auto transfer, one way.
//
// `desiredCommodities` is an array of commodity ids.
// `source` is a sparse array: indices are commodity ids, and values are the
// amount of that commodity that is available at the source.
// `destinationSpace` is self explanatory.
//
// Return an object with two properties:
//
// `amount` is a sparse array: indices are commodity ids, values are the amount
// of that commodity that will be transferred.
// `total` is the total sum of commodities that will be transferred.

function computeTransfer( desiredCommodities, source, destinationSpace ) {
	var sourceTotal, factor, transfer, transferTotal, id;

	// 1. Figure out the total amount of commodities what we would like to
	// transfer from source to destination.  This is the sum of the amounts
	// available at the source, of any commodities that are desired.

	sourceTotal = desiredCommodities.reduce(
		function( sum, id ) {
			if ( source[id] > 0 )
				sum += source[ id ];
			return sum;
		},
		0
	);

	if ( sourceTotal === 0 )
		// we're done
		return { amount: [], total: 0 }

	// 2. If the total amount is larger than the destination's space, then
	// we won't be able to transfer all of it.  Figure out what fraction of
	// the total we can actually transfer.

	if ( destinationSpace < sourceTotal )
		factor = destinationSpace / sourceTotal;
	else
		factor = 1;

	// 3. Compute the actual amount of each commodity to transfer.

	transfer = desiredCommodities.reduce(
		function( a, id ) {
			if ( source[id] > 0  )
				a[id] = Math.ceil( factor * source[id] );
			return a;
		},
		[] );

	// 4. Sum to know exactly how many tons we'll transfer in total.

	transferTotal = transfer.reduce(
		function( sum, n ) { return sum + n }, 0 );

	// If this amount is larger than the space at destination (because of
	// rounding with Math.ceil above), then shave off the excess by removing
	// one from a commodity until we fit.

	for ( id in transfer ) {
		if( transferTotal <= destinationSpace )
			break;
		else if ( transfer[id] > 0 ) {
			transfer[ id ] -= 1;
			transferTotal -= 1;
		}
	}

	// And we're done.  Return the result of this computation.

	return {
		amount: transfer,
		total: transferTotal
	}
}
