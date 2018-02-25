// This is a content script, it runs on starbase_trade.php and planet_trade.php.

// From other files:
var Overlay, Universe = Universe.fromDocument( document ), configured, userloc, time, psbCredits;
configure();
setup();

// End of script execution.

function configure() {
	var script;
	if ( !configured ) {
		window.addEventListener( 'message', onGameMessage );
		script = document.createElement( 'script' );
		script.type = 'text/javascript';
		script.textContent = "(function(){var fn=function(){window.postMessage({pardus_bookkeeper:1,loc:typeof(userloc)==='undefined'?null:userloc,time:typeof(milliTime)==='undefined'?null:milliTime,psbCredits:typeof(obj_credits)==='undefined'?null:obj_credits},window.location.origin);};if(typeof(addUserFunction)==='function')addUserFunction(fn);fn();})();";
		document.body.appendChild( script );
		configured = true;
	}
}

// Arrival of a message means the page contents were updated.  The
// message contains the value of our variables, too.
function onGameMessage( event ) {
	var data = event.data;

	if ( !data || data.pardus_bookkeeper != 1 ) {
		return;
	}

	userloc = parseInt( data.loc );
	time = Math.floor( parseInt( data.time ) / 1000 ); //Yes Vicky I wrote that.
	psbCredits = parseInt( data.psbCredits );
	chrome.storage.sync.get( 'BookkeeperOptions', trackPSB ); //Planet - SB, not player-owned Starbase ;-)
}

function setup() {
	var ukey, form, container, img, button;

	// Insert a BK button.  

	form = document.forms.planet_trade || document.forms.starbase_trade;

	container = document.createElement( 'div' );
	container.id = 'bookkeeper-ui';
	container.className = 'bookkeeper-starbasetrade';

	img = document.createElement( 'img' );
	img.title = 'Pardus Bookkeeper';
	img.src = chrome.extension.getURL( 'icons/16.png' );
	container.appendChild( img );

	button = document.createElement( 'button' );
	button.id = 'bookkeeper-overview-toggle';
	button.textContent = 'OPEN';
	container.appendChild( button );

	// Button injection take 3.  There's just no good spot to paste in, but
	// I really don't want it near the centre of the page where it can be
	// covered.  Add as previous sibling of the form.
	form.parentElement.style.position = 'relative';
	form.parentElement.insertBefore( container, form );

	ukey = document.location.hostname[0].toUpperCase();
	new Overlay(
		ukey, document, button,
		{ overlayClassName: 'bookkeeper-starbasetrade',
		  mode: 'compact',
		  storageKey: 'Nav' } );

	var XPATH_FREESPACE = document.createExpression('//table//td[starts-with(text(),"free")]/following-sibling::td', null );

	var middleNode = document.getElementById('quickButtonsTbl');

	var previewStatus = document.getElementById('preview_checkbox').checked;
	document.getElementById('preview_checkbox').addEventListener('click', function() { previewStatus = !previewStatus } );

	//Add fuel option.
	chrome.storage.sync.get( [ Universe.key + 'Fuel', Universe.key + 'FuelCB' ], addFuelInput.bind( middleNode ) );
	chrome.storage.sync.get( [ Universe.key + 'NCustomBtns', 'BookkeeperOptions' ], fetchCustomBtns.bind( middleNode ) );
	chrome.storage.sync.get( [ 'BookkeeperOptions' ], addKeyPress );
	
	if (document.forms.planet_trade) {

		addBR( middleNode );
		button = makeButton ( 'bookkeeper-transfer-food' )
		button.textContent = '<- Food | Energy ->';
		middleNode.appendChild( button ) ;
		button.addEventListener( 'click', btnClick );

		addBR( middleNode );
		button = makeButton ( 'bookkeeper-transfer-water' )
		button.textContent = '<- Water | Energy ->';
		middleNode.appendChild( button ) ;
		button.addEventListener( 'click', btnClick );
		
		addBR( middleNode );
		button = makeButton ( 'bookkeeper-transfer-FWE' )
		button.textContent = '<- PSB FW | Energy ->';
		middleNode.appendChild( button ) ;
		button.addEventListener( 'click', btnClick );
		
		function btnClick() {
			var shipCargo = parseInt( XPATH_FREESPACE.evaluate( document.body, XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null ).iterateNext().textContent.split(/t/g)[0]);

			if (document.getElementById('shiprow2').getElementsByTagName('a')[1] ) {
				var energy = parseInt( document.getElementById( 'shiprow2' ).children[2].firstChild.textContent );
				document.getElementById('sell_2').value = energy;		
				shipCargo += energy;
			}
			shipCargo -= checkFuelSettings();
			
			if ( this.id === 'bookkeeper-transfer-FWE' ) {
				var buyFood = Math.floor( shipCargo / 5 * 3);
				var buyWater = shipCargo - buyFood;
				document.getElementById('buy_1').value = buyFood;
				document.getElementById('buy_3').value = buyWater;
			} else if ( this.id === 'bookkeeper-transfer-food' ) {
				var buyFood = shipCargo;
				document.getElementById('buy_1').value = buyFood;
			} else {
				var buyWater = shipCargo;
				document.getElementById('buy_3').value = buyWater;
			}
			if (!previewStatus) {
				document.forms.planet_trade.submit();
			}
		}
	}

	if (document.forms.starbase_trade) {
		
		addBR( middleNode );
		button = makeButton ( 'bookkeeper-transfer-SF' )
		button.textContent = '<- SF E/AE | FW ->';
		middleNode.appendChild( button ) ;
		button.addEventListener('click', btnClick ); 

		addBR( middleNode );
		var button = makeButton ( 'bookkeeper-transfer-FWE' )
		button.textContent = '<- Energy | FW ->';
		middleNode.appendChild( button ) ;
		button.addEventListener('click', btnClick ); 
		
		function btnClick() {
			var shipCargo = parseInt( XPATH_FREESPACE.evaluate( document.body, XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null ).iterateNext().textContent.split(/t/g)[0]);

			if (document.getElementById('shiprow1').getElementsByTagName('a')[1] ) {
				var food = parseInt( document.getElementById( 'shiprow1' ).children[2].firstChild.textContent );
				document.getElementById('sell_1').value = food;
				shipCargo += food;
			}
			if (document.getElementById('shiprow3').getElementsByTagName('a')[1] ) {
				var water = parseInt( document.getElementById( 'shiprow3' ).children[2].firstChild.textContent );
				document.getElementById('sell_3').value = water;
				shipCargo += water;
			}

			shipCargo -= checkFuelSettings();

			if ( this.id === 'bookkeeper-transfer-FWE' ) {
				var buyEnergy = shipCargo;
			} else {
				var buyEnergy = Math.floor( shipCargo / 9 * 4);
				var buyAE = shipCargo - buyEnergy;
				document.getElementById('buy_4').value = buyAE;
			}
			document.getElementById('buy_2').value = buyEnergy;
			if (!previewStatus) {
				document.forms.starbase_trade.submit();
			}
		}
	}

}

// Makes button.
function makeButton( id ) {
	button = document.createElement( 'button' );
	button.type = 'button';
	button.id = id;
	button.style = "width: 175px; height: 35px; margin-left: 3px; margin-right: 3px;";
	return button
}

// Shorthand to adding two BRs.
function addBR( node ) {
	node.appendChild( document.createElement( 'br' ));
	node.appendChild( document.createElement( 'br' ));
}

function addKeyPress( data ) {
	let Options = data [ 'BookkeeperOptions' ];
	if ( !Options[ 'enableAutoKey'] )
		return;
	window.addEventListener( 'keypress', clickAuto.bind( this, 'bookkeeper-transfer-FWE', Options ) );
}		

//clicks button with id = id if g is pressed.
function clickAuto( id, Options, evt ) {
	if ( evt.keyCode === Options[ 'autoKey' ] ) { // g <- not to interfere with standard SGPvP
		document.getElementById( id ).click()
	}
}

// add fuel input 
function addFuelInput( amount ) {
	
	var fuelInput = document.createElement( 'input' );
	fuelInput.id = 'bookkeeper-fuel';
	fuelInput.type = 'textarea';
	fuelInput.size = '1';
	var fuelInputLabel = document.createElement( 'label' );
	fuelInputLabel.for = 'bookkeeper-fuel';
	fuelInputLabel.textContent = 'FUEL SPACE ';
	var fuelInputCB = document.createElement( 'input' );
	fuelInputCB.id = 'bookkeeper-fuel-cb';
	fuelInputCB.type = 'checkbox';
	fuelInputCB.title = 'Sell surplus fuel';

	if ( amount [ Universe.key + 'Fuel' ] !== undefined ) {
		fuelInput.value = amount [ Universe.key + 'Fuel' ];
	}
	if ( amount [ Universe.key + 'FuelCB' ] !== undefined ) {
		fuelInputCB.checked = amount [ Universe.key + 'FuelCB' ]; 
	}
	this.insertBefore( fuelInputCB, this.children[1] );	
	this.insertBefore( fuelInput, fuelInputCB );
	this.insertBefore( fuelInputLabel, fuelInput );
	this.insertBefore( document.createElement( 'br' ) , fuelInputLabel );
	fuelInput.addEventListener( 'change', function () {
		var storedata = {};
		storedata[ Universe.key + 'Fuel' ] = document.getElementById( 'bookkeeper-fuel' ).value;
		chrome.storage.sync.set( storedata );
		});
	fuelInputCB.addEventListener( 'click', function () {
		var storedata = {};
		storedata[ Universe.key + 'FuelCB' ] = document.getElementById( 'bookkeeper-fuel-cb' ).checked;
		chrome.storage.sync.set( storedata );
		});
}

// If there are fuel settings, parse them. Returns the amount the shipcargo is dimished. Or increased in case of fuel sale.
function checkFuelSettings() {
	var fuelSettings = parseInt( document.getElementById( 'bookkeeper-fuel' ).value );
	var shipFuel = parseInt( document.getElementById( 'shiprow16' ).children[2].firstChild.textContent );

	if ( ( fuelSettings - shipFuel ) < 0 && document.getElementById( 'bookkeeper-fuel-cb' ).checked ) {
		var commRow = document.getElementById( 'baserow16' );
		if (!commRow) {
			return 0;
		} else {
			var amount, max, fuelTDs;
			commRow = commRow.getElementsByTagName( 'td' );
			amount = parseInt( commRow[ 2 ].textContent.replace(/,/g,"") );
			max = parseInt( commRow[ commRow.length - 3 ].textContent.replace(/,/g,"") );
			if ( amount + ( shipFuel - fuelSettings ) < max ) {
				document.getElementById( 'sell_16' ).value = shipFuel - fuelSettings;
			} else if ( amount < max ) {
				document.getElementById( 'sell_16' ).value = max - amount;
				return amount - max;
			} else {
				return 0;
			}		
		}
	} else if ( ( fuelSettings - shipFuel ) < 0 || isNaN( fuelSettings ) ) {
		return 0;
	}
	
	return ( fuelSettings - shipFuel )
}

//Custom buttons
function fetchCustomBtns( data ) {
	let Options = data[ 'BookkeeperOptions' ];
	if ( !Options[ 'enableCustom' ] ) 
		return;
	var nButtons = data [ Universe.key + 'NCustomBtns' ] || 1;
	for ( var i = 1; i <= nButtons ; i++ ) {
		chrome.storage.sync.get( [ Universe.key + 'CustomBtn' + i ], makeCustomBtn.bind( this, i ) );
	}
}

function saveCustomBtn( id , n ) {
	var toSave = {};
	for ( var i = 0; i < Infinity ; i++) {
		var dropdown = document.getElementById('bookkeeper-cbtn-conf-' + n + '-name-' + i );
		if ( dropdown === null ) { break }
		var name = document.getElementById('bookkeeper-cbtn-conf-' + n + '-name-' + i ).value;
		var amount = parseInt( document.getElementById('bookkeeper-cbtn-conf-' + n + '-amount-' + i).value ) ;
		( toSave[ name ] || isNaN(amount) || amount == 0 ) ? null : toSave[ name ] = amount;
	}
	document.getElementById( id ).remove();
	
	var key = Universe.key + 'CustomBtn' + n;
	var toSaveData = {};
	toSaveData[ key ] = toSave;
	chrome.storage.sync.set( toSaveData );
	
	var old_element = document.getElementById( 'bookkeeper-cbtn-' + n );
	var new_element = old_element.cloneNode(true);
	old_element.parentNode.replaceChild(new_element, old_element);
	new_element.addEventListener( 'click', clickCustomButton.bind( null, toSave ) );

	var old_element = document.getElementById( 'bookkeeper-cbtn-' + n + '-conf' );
	var new_element = old_element.cloneNode(true);
	old_element.parentNode.replaceChild(new_element, old_element);
	new_element.addEventListener( 'click', showConfDiv.bind( new_element , n , toSaveData ) );
	
}

function makeCustomBtn( n, data ) {
	var button = makeButton( 'bookkeeper-cbtn-' + n );
	addBR( this );
	button.textContent = 'Custom ';// + n;
	button.style.width = '147px';
	this.appendChild( button );	
	button.addEventListener( 'click', clickCustomButton.bind ( null, data[ Universe.key + 'CustomBtn' + n ] ) );
	var button = makeButton( 'bookkeeper-cbtn-' + n + '-conf');
	button.textContent = 'C';
	button.style = '';
	button.style.width = '25px';
	button.style.height = '35px';
	this.appendChild( button );	
	button.addEventListener( 'click', showConfDiv.bind( this, n , data ) );
}

function clickCustomButton( btnData ) {
	for ( key in btnData ) {
		var base = '';
		btnData[key] < 0 ? base = 'sell_' : base = 'buy_';
		document.getElementById( base + key ) ? document.getElementById( base + key ).value = Math.abs( btnData[ key ] ) : null;
	}
	var frm = document.forms.planet_trade || document.forms.starbase_trade;
	var prviewStatus = document.getElementById('preview_checkbox').checked;
	if (!prviewStatus) { frm.submit() };
}


function showConfDiv( n , data ) {
	data = data[ Universe.key + 'CustomBtn' + n ];
	if ( !data )
		data = {};
	var container = document.createElement( 'div' );
	container.id = 'bookkeeper-cbtn-conf-' + n;
	container.className = 'bookkeeper-cbtn-conf';
	this.parentNode.appendChild(container);
	
	var button = makeButton( 'bookkeeper-cbtn-conf-submit' + n );
	button.textContent = 'Submit';
	container.appendChild( button );
	
	for ( key in data ) {
		addRow( button, key, data[key] );	
	}
	Object.keys( data ).length === 0 ? addRow( button, 0, 0 ) : null;
	
	function addRow( button, comm, dataAmount ) {
		var div = document.createElement( 'div' );
		div.textContent = 'Commodity: ';
		//div.id = 'bookkeeper-cbtn-conf-' + n 
		var dropdown = document.createElement( 'select' );
		dropdown.type = 'select';
		dropdown.id = 'bookkeeper-cbtn-conf-' + n + '-name-' + document.getElementsByTagName( 'select' ).length;
		
		for (var i = 1; i < 33 ; i++) {
			if ( document.getElementById( 'baserow' + i ) ) {
				var option = document.createElement( 'option' );
				option.innerHTML = Commodities.getCommodity( i ).n;
				option.value = i;
				dropdown.appendChild( option );
			}
			if ( comm == i ) { // == on purpose since comm is string and i is int.
				option.selected = 'selected';
			}
		}	
		var amount = document.createElement( 'input' );
		amount.type = 'textarea';
		amount.size = '1';
		amount.id = 'bookkeeper-cbtn-conf-' + n + '-amount-' + document.getElementsByTagName( 'select' ).length;
		amount.title = 'Positive for buy, negative for sell';
		amount.value = dataAmount

		div.appendChild( dropdown );		
		div.appendChild( amount );
		addBR( div );
		amount.addEventListener( 'change', addRow.bind( null, button, 0, 0) );
		container.insertBefore( div , button );
		
	}
	button.addEventListener('click', saveCustomBtn.bind( null, container.id, n ) ); 
}


// Below comes all the tracking Planets and Starbases stuff
function trackPSB( data ) {
	let Options = data[ 'BookkeeperOptions' ];
	if ( !Options[ 'enablePSB' ] )
		return;
	chrome.storage.sync.get( [ Universe.key, Universe.key + userloc ], setTrackBtn.bind ( null, userloc) )
}

function setTrackBtn( userloc, data ) {
	var trackBtn = document.getElementById( 'bookkeeper-trackBtn' );
	if  ( !trackBtn ) {	
		var middleNode = document.getElementById('quickButtonsTbl');
		middleNode.appendChild( document.createElement( 'br' ));
		middleNode.appendChild( document.createElement( 'br' ));
		trackBtn = makeButton ( 'bookkeeper-trackBtn' );
		middleNode.appendChild( trackBtn );
	}
	
	var value; 
	
	if (Object.keys( data ).length === 0 || data[ Universe.key ].indexOf( userloc ) === -1) {
		value = 'Track';
	} else {
		value = 'Untrack';
		data[ Universe.key + userloc ] = parsePSBPage().toStorage();
		chrome.storage.sync.set( data );
	}

	trackBtn.textContent = value;
	trackBtn.addEventListener( 'click', function() { 
		chrome.storage.sync.get( [ Universe.key , Universe.key + userloc ], trackToggle.bind( trackBtn, userloc ) ); 
	});
}

function trackToggle( userloc, data ) {
	if (this.textContent === 'Track') {
		this.textContent = 'Untrack';
		
		if (Object.keys( data ).length === 0) {
			data[ Universe.key ] = [ userloc ];
		} else {
			data[ Universe.key ].push( userloc );
		}
		data[ Universe.key + userloc ] = parsePSBPage().toStorage();
		chrome.storage.sync.set( data );
	} else {
		this.textContent = 'Track';
		PSBremoveStorage( userloc );
	}
}

 function PSBremoveStorage ( loc ) {
	var ukey = Universe.key;
	
	loc = parseInt( loc );
	if ( isNaN(loc) )
		return;

	chrome.storage.sync.get( ukey , removeBuildingListEntry );

	function removeBuildingListEntry( data ) {
		var list, index;

		list = data[ ukey ];
		index = list.indexOf( loc );
		if ( index === -1 ) {
			removeBuildingData();
		} else {
			list.splice( index, 1 );
			chrome.storage.sync.set( data, removeBuildingData );
		}
	}

	function removeBuildingData() {
		chrome.storage.sync.remove( ukey + loc );
	}
}

function parsePSBPage() {
	var i, commRow, shiprow, amount = [], bal = {}, min = [], max = [], price = [], buying = [], selling = [], sellAtPrice = [];
	
	var PSBclass = document.getElementsByTagName( 'h1' )[0].firstElementChild.src.split(/_/i)[1][0].toUpperCase();
	var sectorId = Sector.getIdFromLocation( userloc );
	
	if ( PSBclass === 'F' ) {
		typeId = Building.getTypeId( 'Faction Starbase' );
	} else if ( PSBclass === 'P' ) {
		typeId = Building.getTypeId( 'Player Starbase' );
	} else {
		typeId = Building.getTypeId( 'Class ' + PSBclass + ' Planet' );
	}

	var building = new Building( userloc, sectorId, typeId );
	building.setTicksLeft( 5000 ); //will be updated below.

	for ( i = 1;  i < 33 ; i++ ) {
		commRow = document.getElementById( 'baserow' + i );
		if (!commRow) {
			continue;
		} else {
			commRow = commRow.getElementsByTagName( 'td' );
		}
		amount [ i ] = parseInt( commRow[ 2 ].textContent.replace(/,/g,"") );
		bal [ i ] = parseInt( commRow[ 3 ].textContent.replace(/,/g,"") );
		commRow.length === 8 ? min [ i ] = parseInt( commRow[ 4 ].textContent.replace(/,/g,"") ) : min[ i ] = Math.abs( bal[ i ] ); 
		max [ i ] = parseInt( commRow[ commRow.length - 3 ].textContent.replace(/,/g,"") );
		price[ i ] = parseInt( commRow[ commRow.length - 2 ].textContent.replace(/,/g,"") );
		
		buying[ i ] = max[ i ] - amount[ i ] < 0 ? 0 : max[ i ] - amount[ i ];
		selling[ i ] = amount[ i ] - min [ i ] < 0 ? 0 : amount[ i ] - min [ i ];
		
		if (Building.isUpkeep( typeId, i )) {
			if (Math.floor( amount[ i ] / -bal [ i ] ) <  building.getTicksLeft() ) {
				building.setTicksLeft( Math.floor( amount[ i ] / -bal [ i ] ) )
			}
		}
		
		shipRow = document.getElementById( 'shiprow' + i );
		if (!shipRow) {
			//i's not availabe? let's scram
			continue; 
		} else {
			sellAtPrice[ i ] = parseInt( shipRow.getElementsByTagName( 'td' )[ 3 ].textContent.replace(/,/g,"") );
		}
		
	} //I just realised we can get the above from the script section of the page too. Ah well.
	
	//Just in case the ticks are not processed correctly.
	building.getTicksLeft() === 5000 ? building.setTicksLeft( undefined ) : null;
	
	building.setMinimum( min );
	building.setMaximum( max );
	building.setBuying( buying );
	building.setSelling( selling );
	building.setLevel( popEst( bal, Building.getTypeShortName( typeId ) )[0] );
	
	// XXX need proper functions for the stuff below
	building.buyAtPrices = price;
	building.sellAtPrices = sellAtPrice;
	building.credits = parseInt( psbCredits );
	building.psb = true;
	building.amount = amount;

	return building
}

function popEst( bal, classImg ) {
	var balComm = [], base;
	// Determine class & thus upkeep commodity type and upkeep. I take upkeep 
	// because production can be zero.
	classImg.indexOf( 'P' ) !== -1 ? balComm = [1,-3] : null;
	classImg.indexOf( 'F' ) !== -1 ? balComm = [1,-2.5] : null;
	classImg.indexOf( 'M' ) !== -1 ? balComm = [2,-7.5] : null;
	classImg.indexOf( 'A' ) !== -1 ? balComm = [2,-12.5] : null;
	classImg.indexOf( 'D' ) !== -1 ? balComm = [3,-2.5] : null;
	classImg.indexOf( 'I' ) !== -1 ? balComm = [2,-7.5] : null;
	classImg.indexOf( 'G' ) !== -1 ? balComm = [2,-2.5] : null;
	classImg.indexOf( 'R' ) !== -1 ? balComm = [2,-4] : null;
	return [Math.round( 1000 * bal [ balComm[0] ] / balComm[1] ), Math.ceil( -500 / balComm[1] ) ]
}