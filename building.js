(function () {
'use strict';
//Global variables.
var configured = false;
var userloc, res_upkeep, res_production, amount_max, amount_min, buy_price, sell_price, time, amount;
var universe = getUniverse();
var buildingList = new Object();
var buildingListId = universe + "BuildingList";

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

function Building( sector, x, y, loc, owner, res_upkeep, res_production, amount,
		   amount_max, amount_min, buy_price, sell_price, time, type, level ) {
	this.sector = sector;
	this.x = x;
	this.y = y;
	this.loc = loc;
	this.owner = owner;
	this.res_upkeep = res_upkeep;
	this.res_production = res_production;
	this.amount = amount;
	this.amount_max = amount_max;
	this.amount_min = amount_min;
	this.buy_price = buy_price;
	this.sell_price = sell_price;
	this.time = time;
	this.type = type;
	this.level = level;
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
		if (checkBuildingSaved(data,userloc)[0]) {
			saveBuilding();
			addButton('Untrack',buildingTracker);
		} else {
			addButton('Track',buildingTracker);
		}
	}

}

/*function clear() {
	chrome.storage.local.clear();
}*/

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
				buildingList[buildingListId] = list;
				chrome.storage.local.set(buildingList)
			} //If we have a list, we add the building if it's not there yet.
			else {
				if (!checkBuildingSaved(data,userloc)[0]) {
					data[buildingListId].push(userloc);
					chrome.storage.local.set(data);
				}

			}
			// You pressed track so you get all the stuffz saved. Owner is not yet there, reserving some space anyway.
			saveBuilding();
		}
	}

	else {
		removeBuilding(userloc,universe);
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

function parseInfo() {
	var tds = document.getElementsByTagName("td");
	for (var i =0; i<tds.length;i++){
		// so Pardus has this specific color for two TDs, pilot and building owner.
		if (tds[i].style.color === "rgb(221, 221, 255)"){
			var nameline = tds[i].firstChild.innerHTML;
		}
	}
	nameline = nameline.split(/'s /);
	var owner = nameline[0];
	var type = nameline[1];
	return [owner, type];
}

function getLevel() {
	var perCommodity = new Object();
	var levelEst = new Object();
	var level = 0;
	
	for (var key in amount_max) {
		perCommodity[key] = parseInt(document.getElementById('baserow'+key).getElementsByTagName("font")[0].innerHTML);
		if (perCommodity[key] > 0) {
			levelEst[key] = ((((perCommodity[key] / res_production[key]) - 1) / 0.5) + 1);
		} else {
			levelEst[key] = ((((-perCommodity[key] / res_upkeep[key]) - 1) / 0.4) + 1);
			// So thanks to Div we only take the upkeep for level determination.
			level += levelEst[key];
		}
	}
	
	// The average of the estimated levels is most likely correct.
	level = Math.round(level / Object.keys(res_upkeep).length);

	// here we double check the level by calculating the upkeep.
	var levelCheck = 0;
	for (var key in res_upkeep) {
		levelCheck += Math.round(res_upkeep[key]*(1+0.4*(level - 1))) + perCommodity[key];
	}

	if (levelCheck === 0) {
		
		return level;
	} else {
		console.log(level);
		console.log(levelCheck);
		console.log(levelEst);
		console.log(Object.keys(res_upkeep).length);
		console.log(perCommodity);
	}
	
}

function saveBuilding() {
	// Get the current sector and coords
	chrome.storage.local.get( ['sector', 'x', 'y'], finishSaveBuilding);
}

function finishSaveBuilding( cfg_data ) {
	var buildingData = new Building(
		cfg_data.sector, cfg_data.x, cfg_data.y,
		userloc, parseInfo()[0], res_upkeep, res_production,
		amount, amount_max, amount_min,
		buy_price, sell_price, time, parseInfo()[1],getLevel() );
	var buildingId = universe + "Building" + userloc.toString();
	var items = new Object();
	items[buildingId] = JSON.stringify(buildingData);
	//console.log('saveBuilding', items);
	chrome.storage.local.set(items);
}

configure();
addTrackerButtons();
})();
