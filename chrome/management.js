(function() {
    'use strict';

var universe = Universe.fromDocument ( document );
var configured = false;
var userloc, time, shipSpace, buildingSpace;

function configure() {
	if (!configured) {
		document.defaultView.addEventListener( 'message', onGameMessage );
		var script = document.createElement( 'script' );
		script.type = 'text/javascript';
		var s = "\
	(function() {var fn=function(){window.postMessage({pardus_bookkeeper:1,\
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

	if ( !data || data.pardus_bookkeeper != 1 ) {
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
	
	//check if building has min/maxes comes here - later.
	if (true) {
		var new_button = document.getElementsByName("trade_ship")[0].cloneNode(false);
		new_button.setAttribute('type','button');
		new_button.setAttribute('value','Auto Sell Buy');
		new_button.setAttribute('name','Auto');
		new_button.addEventListener('click',auto_sell_buy.bind(null, building [ "res_upkeep" ], building [ "res_production" ], building [ "amount_min" ], building [ "amount_max" ]));
		document.getElementsByName('trade_ship')[0].parentNode.appendChild(document.createElement('br'));
		document.getElementsByName('trade_ship')[0].parentNode.appendChild(document.createElement('br'));
		document.getElementsByName('trade_ship')[0].parentNode.appendChild(new_button);
	}
}

function auto_sell_buy( res_upkeep, res_production, amount_min, amount_max ) {
	var amount = {};
	var key, resNode;
	var ship_amount = {};
	
	//checking for both ship and building how much we have. This can probably be quicker.
	for (key in res_upkeep) {
		resNode = document.getElementById( "stock_" + key );
		if (!resNode) {
			amount [ key ] = 0;
		} else {
			amount [ key ] = resNode.parentNode.previousSibling.textContent;
		}
	}
	
	for (key in res_production) {
		resNode = document.getElementById( "comm_" + key );
		if (!resNode) {
			amount [ key ] = 0;
		} else {
			amount [ key ] = resNode.parentNode.previousSibling.textContent;
		}
	}
	
	for (key in res_upkeep) {
		resNode = document.getElementById( "ship_" + key );
		if (!resNode) {
			ship_amount [ key ] = 0;
		} else {
			ship_amount [ key ] = resNode.parentNode.previousSibling.textContent;
		}
	}
	
	for (key in res_production) {
		resNode = document.getElementById( "ship_" + key );
		if (!resNode) {
			ship_amount [ key ] = 0;
		} else {
			ship_amount [ key ] = resNode.parentNode.previousSibling.textContent;
		}
	}
	
	// now fill in the forms.
	var value;
	for (key in res_upkeep) {
		if (ship_amount [ key ] > 0) {
			if (ship_amount [ key ] < amount_max[ key ] - amount [ key ]) {
				value = ship_amount [ key ];
			} else {
				value = amount_max[ key ] - amount [ key ];
			}
			resNode = document.getElementById( "ship_" + key );
			resNode.value = value;
		}
	}
	
	for (key in res_production) {
		if (amount [ key ] > 0) {
			if (amount [ key ] < amount_min[ key ]) {
				value = 0;
			} else {
				value = amount[ key ] - amount_min [ key ];
			}
			resNode = document.getElementById( "comm_" + key );
			resNode.value = value;
		}
	}

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

configure();
})();