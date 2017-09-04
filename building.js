(function () {
	'use strict';
//Global variables.
var configured = false;
var userloc, res_upkeep, res_production, amount_max, amount_min, buy_price, sell_price, time, amount;
var universe = getUniverse();
var buildingListId = universe + buildingListId;

function configure() {
	if (!configured) {
		document.defaultView.addEventListener( 'message', onGameMessage );
		var script = document.createElement( 'script' );
		script.type = 'text/javascript';
		script.textContent = "(function() {var fn=function(){window.postMessage({pardus_copilot:1,\
		loc:typeof(userloc)=='undefined'?null:userloc,\
		res_upkeep:typeof(res_upkeep)=='undefined'?null:res_upkeep,\
		res_production:typeof(res_production)=='undefined'?null:res_production,\
		amount_max:typeof(amount_max)=='undefined'?null:amount_max,\
		amount_min:typeof(amount_min)=='undefined'?null:amount_min,\
		player_buy_price:typeof(player_buy_price)=='undefined'?null:player_buy_price,\
		player_sell_price:typeof(player_sell_price)=='undefined'?null:player_sell_price,\
		time:typeof(milliTime)=='undefined'?null:milliTime,\
		amount:typeof(amount)=='undefined'?null:amount,\
		},window.location.origin);};if(typeof(addUserFunction)=='function')addUserFunction(fn);fn();})();";
		document.body.appendChild( script );
		configured = true;
		}
	}


// Arrival of a message means the page contents were updated.  The
// message contains the value of our variables, too.
function onGameMessage( event ) {
	var data = event.data;

	if ( !data || data.pardus_copilot != 1 ) {
		return;
	}

	userloc = parseInt( data.loc );
	res_upkeep = data.res_upkeep;
	res_production = data.res_production;
	amount_max = data.amount_max;
	amount_min = data.amount_min;
	buy_price = data.player_buy_price;
	sell_price = data.player_sell_price;
	time = data.time;
	amount = data.amount;
}

function Building(loc,owner,res_upkeep,res_production,amount,amount_max,amount_min,buy_price, sell_price,time) {
	this.loc = loc;
	this.owner = "tbd";
	this.res_upkeep = res_upkeep;
	this.res_production = res_production;
	this.amount = amount;
	this.amount_max = amount_max;
	this.amount_min = amount_min;
	this.buy_price = buy_price;
	this.sell_price = sell_price;
	this.time = time;
  /*this.greeting = function() {
    alert('Hi! I\'m ' + this.name + '.');
  };*/

}

function addTrackerButtons() {
	// We add track/untrack buttons on the trade screen.
	var transferButton = findTransferButton();

	function addButton(name,listener) {
		//Adds button below the quickbuttons.
		//Initially there were two, I decided a single track/untrack button was more elegant.
		var new_button = document.createElement("input");
		new_button.setAttribute('style','width: 175px; height: 35px; margin-left: 3px; margin-right: 3px;');
		new_button.setAttribute('type','button');
		new_button.setAttribute('value',name);
		new_button.setAttribute('id',name+'Button');
		new_button.addEventListener('click',listener);
		transferButton.parentNode.appendChild(document.createElement('br'));
		transferButton.parentNode.appendChild(document.createElement('br'));
		transferButton.parentNode.appendChild(new_button);
	}

	//addButton('Clear',clear);
	chrome.storage.local.get(buildingListId,addTracker)
	function addTracker(data) {
		if (checkBuildingSaved(data)[0]) {
			saveBuilding();
			addButton('Untrack',buildingTracker);
		} else {
			addButton('Track',buildingTracker);
		}
	}

}
/*
function clear() {
	chrome.storage.local.clear();
}*/

function checkBuildingSaved(data) {
	var index;
	var saved = false;
	if (!!data[buildingListId]) {
		for (var i = 0; i < data[buildingListId]length; i++) {
			if (data[buildingListId][i] === userloc) {
				saved = true;
				index = i;
			}
		}

	}
	// Returns true if we have data of the building.
	//console.log(saved);
	return [saved, index];
}

function toggleButton(btn) {
	if (btn.getAttribute('value') === 'Track') {
		btn.setAttribute('value','Untrack');
	}
	else {
		btn.setAttribute('value','Track');
	}
}

function buildingTracker() {
	if (this.value === "Track") {
		chrome.storage.local.get(buildingListId,addBuilding)

		function addBuilding(data) {
			//We're adding a building to the tracker here.
			//So first check if we have a list at all. Not sure if this is really required.
			if (!data[buildingListId]) {
				var list = [];
				list[0] = userloc;
				chrome.storage.local.set({buildingListId:list})
			} //If we have a list, we add the building if it's not there yet.
			else {
				if (!checkBuildingSaved(data)[0]) {
					data[buildingListId].push(userloc);
					chrome.storage.local.set({buildingListId:data[buildingListId]});
				}

			}
			// You pressed track so you get all the stuffz saved. Owner is not yet there, reserving some space anyway.
			saveBuilding();
		}
	}

	else {
		chrome.storage.local.get(buildingListId,removeBuilding);
		function removeBuilding(data) {
			data[buildingListId].splice(checkBuildingSaved(data)[1],1);
			chrome.storage.local.remove(universe+"Building"+userloc.toString())
			chrome.storage.local.set({buildingListId:data.buildingList});
		}
	}
	toggleButton(this);
}

function findTransferButton() {
	// Function finds the transfer button since Pardus sadly gave it
	// neither ID nor name, so we have to check all input elements for
	// the value '<- Transfer ->'
	var inputs = document.getElementsByTagName("input");
	var transferButton;
	for (var i = 0; i < inputs.length ; i++) {
		if (inputs[i].value === "<- Transfer ->"){
			transferButton = inputs[i];
		}
	}
	return transferButton;
}

function saveBuilding() {
	var buildingData = new Building(userloc,"",res_upkeep,res_production,amount,amount_max,amount_min,buy_price, sell_price,time);
	var buildingId = universe + "Building" + userloc.toString();
	var items = new Object();
	items[buildingId] = JSON.stringify(buildingData);
	//console.log('saveBuilding', items);
	chrome.storage.local.set(items);
}

configure();
addTrackerButtons();

})();
