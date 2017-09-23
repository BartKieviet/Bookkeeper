'use strict';

var universe = Universe.fromDocument ( document );
var configured = false;
var userloc, time, shipSpace, buildingSpace;

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

	if ( !data || data.pardus_bookkeeper != 3 ) {
		return;
	}

	userloc = parseInt( data.loc );
	time = data.time;
	shipSpace = parseInt ( data.ship_space );
	buildingSpace = parseInt ( data.obj_space );

	//configured, let's get started.
	chrome.storage.sync.get( universe.key + userloc, addButton );
}

function addButton ( buildingData ) {
	var building = Building.createFromStorage ( universe.key + userloc , buildingData [ universe.key + userloc ]);
	console.log(building);

	if ( building.hasMinMax() ) {
		var new_button = document.getElementsByName("trade_ship")[0].cloneNode(false);
		new_button.type = 'button';
		new_button.textContent = 'Auto Sell Buy';
		//new_button.name = 'Auto'; do we need this?
		new_button.addEventListener( 'click', auto_sell_buy.bind(null, building) );
		var node = document.getElementsByName('trade_ship')[0].parentNode;
		node.appendChild(document.createElement('br'));
		node.appendChild(document.createElement('br'));
		node.appendChild(new_button);
	}
}

function auto_sell_buy( building ) {
	var amount = {};
	var key, resNode;
	var ship_amount = {};

	// See comment in the definition of makeDictionary, in building.js, for
	// the meaning of this.  If we didn't do this, then instead of the
	// "for(key in minDict)" loops below, we would use
	// "building.minimum.forEach()" instead.
	//
	// Which probably would be better anyway, but I'll leave it like this so
	// it's easier to understand what's going on here.
	var minDict = Building.makeDictionary( building.minimum );

	//checking for both ship and building how much we have. This can probably be quicker.

	// This will iterate over all the commodity ids for which we have
	// minimums (and maximums, if we have one we always have the other).
	// Since those are lifted from the tradesettings screen, we know these
	// are exactly the upkeep/production commodities; whatever other junk
	// the owner is storing in their building won't have an entry here.

	for ( key in minDict ) {

		// Now we check if commodity id `key` is part of the upkeep for
		// this kind of building.  If it isn't, then it is production,
		// guaranteed.

		// (at least until we start dealiing with TOs lololol)

		if ( building.isUpkeep(key) ) {
			resNode = document.getElementById( "stock_" + key );
			if (!resNode) {
				amount [ key ] = 0;
			} else {
				amount [ key ] = resNode.parentNode.previousSibling.textContent;
			}
		}
		else {
			resNode = document.getElementById( "comm_" + key );
			if (!resNode) {
				amount [ key ] = 0;
			} else {
				amount [ key ] = resNode.parentNode.previousSibling.textContent;
			}
		}

		resNode = document.getElementById( "ship_" + key );
		if (!resNode) {
			ship_amount [ key ] = 0;
		} else {
			ship_amount [ key ] = resNode.parentNode.previousSibling.textContent;
		}
	}

	console.log( 'amount', amount );

	// now fill in the forms.
	var value;
	for ( key in minDict ) {
		if ( building.isUpkeep(key) ) {
			if (ship_amount [ key ] > 0) {
				if (ship_amount [ key ] < building.maximum[ key ] - amount [ key ]) {
					value = ship_amount [ key ];
				} else {
					value = building.maximum[ key ] - amount [ key ];
				}
				resNode = document.getElementById( "ship_" + key );
				resNode.value = value;
			}
		}
		else {
			if (amount [ key ] > 0) {
				if (amount [ key ] < building.minimum[ key ]) {
					value = 0;
				} else {
					value = amount[ key ] - building.minimum[ key ];
				}
				resNode = document.getElementById( "comm_" + key );
				resNode.value = value;
			}
		}
	}

	// We really need the "preview" checkbox here... as a user, I never let
	// auto sell submit the form like this, without a chance to review :")

	document.getElementsByName("trade_ship")[0].click();
}

/*
Old stuff saved for reference. In case we need to parse res_production and res_upkeep from this page and not from storage.
function buy_all_prod() {
	 // 4 upkeep, 5 production
	var upk_table = document.getElementsByTagName("table")[4].getElementsByTagName('img');
	var prod_table = document.getElementsByTagName("table")[5].getElementsByTagName('img');
	var prod_res_links = document.getElementsByTagName("table")[11].getElementsByTagName("a");

	for (var i = 0; i < prod_res_links.length; i++) {
		for (var j = 0 ; j < prod_table.length; j++) {
			if (prod_res_links[i].parentNode.previousSibling.previousSibling.firstChild.src == prod_table[j].src) {
				prod_res_links[i].click();
			}
		}
	}
	document.getElementsByName("trade_ship")[0].click();
}*/
