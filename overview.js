(function (){

//Stolen from Pardus
var res_names = {'1': 'Food', '2': 'Energy', '3': 'Water', '4': 'Animal embryos', '5': 'Ore', '6': 'Metal', '7': 'Electronics', '8': 'Robots', '9': 'Heavy plastics', '10': 'Hand weapons', '11': 'Medicines', '12': 'Nebula gas', '13': 'Chemical supplies', '14': 'Gem stones', '15': 'Liquor', '16': 'Hydrogen fuel', '17': 'Exotic matter', '18': 'Optical components', '19': 'Radioactive cells', '20': 'Droid modules', '21': 'Bio-waste', '22': 'Leech baby', '23': 'Nutrient clods', '24': 'Cybernetic X-993 Parts', '25': 'X-993 Repair-Drone', '26': 'Neural Stimulator', '27': 'Battleweapon Parts', '28': 'Neural Tissue', '29': 'Stim Chip', '30': 'Capri Stim', '31': 'Crimson Stim', '32': 'Amber Stim', '50': 'Slaves', '51': 'Drugs'}
// Below are not used often. Too bad jewel loving stim mills.
//, '100': 'Package', '101': 'Faction package', '102': 'Explosives', '103': 'VIP', '104': 'Christmas Glitter', '105': 'Military Explosives', '150': 'Exotic Crystal', '151': 'Feral Egg', '201': 'Human intestines', '202': 'Skaari limbs', '203': 'Keldon brains', '204': 'Rashkir bones', '211': 'Blue Sapphire jewels', '212': 'Ruby jewels', '213': 'Golden Beryl jewels'};
var res_img = {'1': '//static.pardus.at/img/stdhq/res/food.png', '2': '//static.pardus.at/img/stdhq/res/energy.png', '3': '//static.pardus.at/img/stdhq/res/water.png', '4': '//static.pardus.at/img/stdhq/res/animal_embryos.png', '5': '//static.pardus.at/img/stdhq/res/ore.png', '6': '//static.pardus.at/img/stdhq/res/metal.png', '7': '//static.pardus.at/img/stdhq/res/electronics.png', '8': '//static.pardus.at/img/stdhq/res/robots.png', '9': '//static.pardus.at/img/stdhq/res/heavy-plastics.png', '10': '//static.pardus.at/img/stdhq/res/hand-weapons.png', '11': '//static.pardus.at/img/stdhq/res/medicines.png', '12': '//static.pardus.at/img/stdhq/res/nebula-gas.png', '13': '//static.pardus.at/img/stdhq/res/chemical-supplies.png', '14': '//static.pardus.at/img/stdhq/res/gem-stones.png', '15': '//static.pardus.at/img/stdhq/res/liquor.png', '16': '//static.pardus.at/img/stdhq/res/hydrogen-fuel.png', '17': '//static.pardus.at/img/stdhq/res/exotic_matter.png', '18': '//static.pardus.at/img/stdhq/res/optical_components.png', '19': '//static.pardus.at/img/stdhq/res/radioactive_cells.png', '20': '//static.pardus.at/img/stdhq/res/droid_modules.png', '21': '//static.pardus.at/img/stdhq/res/biowaste.png', '22': '//static.pardus.at/img/stdhq/res/leech_baby.png', '23': '//static.pardus.at/img/stdhq/res/nutrient_clods.png', '24': '//static.pardus.at/img/stdhq/res/cybernetic_x993_parts.png', '25': '//static.pardus.at/img/stdhq/res/x993_repairdrone.png', '26': '//static.pardus.at/img/stdhq/res/neural_stimulator.png', '27': '//static.pardus.at/img/stdhq/res/battleweapon_parts.png', '28': '//static.pardus.at/img/stdhq/res/neural_tissue.png', '29': '//static.pardus.at/img/stdhq/res/stim_chip.png', '30': '//static.pardus.at/img/stdhq/res/stim_chip_fed.png', '31': '//static.pardus.at/img/stdhq/res/stim_chip_emp.png', '32': '//static.pardus.at/img/stdhq/res/stim_chip_uni.png', '50': '//static.pardus.at/img/stdhq/res/slaves.png', '51': '//static.pardus.at/img/stdhq/res/drugs.png', '100': '//static.pardus.at/img/stdhq/res/package.png', '101': '//static.pardus.at/img/stdhq/res/package_faction.png', '102': '//static.pardus.at/img/stdhq/res/explosives.png', '103': '//static.pardus.at/img/stdhq/res/vip.png', '104': '//static.pardus.at/img/stdhq/res/christmas_glitter.png', '105': '//static.pardus.at/img/stdhq/res/explosives_military.png', '150': '//static.pardus.at/img/stdhq/res/exotic_crystal.png', '151': '//static.pardus.at/img/stdhq/res/feral_egg.png', '201': '//static.pardus.at/img/stdhq/res/human_intestines.png', '202': '//static.pardus.at/img/stdhq/res/skaari_limbs.png', '203': '//static.pardus.at/img/stdhq/res/keldon_brains.png', '204': '//static.pardus.at/img/stdhq/res/rashkir_bones.png', '211': '//static.pardus.at/img/stdhq/res/jewels_fed.png', '212': '//static.pardus.at/img/stdhq/res/jewels_emp.png', '213': '//static.pardus.at/img/stdhq/res/jewels_uni.png'};
var credits_img = "<img src='//static.pardus.at/img/stdhq/credits_16x16.png' alt='Credits' width='16' height='16' style='vertical-align: middle;'>";
var universe = getUniverse();
var buildingListId = universe + "BuildingList";

function showOverview(data) {
	var table = document.createElement("table");
	table.appendChild(document.createElement("tr"));
	var headerList = ["Location","Owner","Type","Level"]
	//Make the header.

	headerList.forEach(makeHeader);
	function makeHeader (name) {
		table.firstChild.appendChild(document.createElement("td"));
		table.firstChild.lastChild.textContent = name;
	}
	//add the commodities
	for (var img in res_img) {
		if (parseInt(img) < 52) {
			var cell = document.createElement("th");
			cell.innerHTML = "<img src=" + res_img[img] + " />";
			table.firstChild.appendChild(cell);
		}
	}
	table.firstChild.appendChild(document.createElement("td"));
	table.firstChild.lastChild.textContent = "Time updated";

	//Fill the table.
	data[buildingListId].forEach(addBuilding);
	function addBuilding (loc) {
		var row = document.createElement("tr");
		table.appendChild(row);
		var cell = document.createElement("td");
		cell.textContent = loc.toString();
		row.appendChild(cell);

		var buildingId = universe + "Building" + loc.toString();
		chrome.storage.local.get(buildingId, addBuildingData);

		function addBuildingData(data) {
			var building = JSON.parse(data[buildingId]);

			var cell = document.createElement("td");
			cell.textContent = building.owner;
			row.appendChild(cell);

			var cell = document.createElement("td");
			cell.textContent = building.type;
			row.appendChild(cell);

			var cell = document.createElement("td");
			cell.textContent = building.level;
			row.appendChild(cell);

			//console.log(building);
			var counter = 0;
			for (var res in building.amount) {
				// add empty cells if next commodity is not next in the list.
				// We compare the number of cells created (counter) with the res number.
				// Sadly pardus does not always add one, but jumps arount, mightily screwing up this method.
				counter += 1;
				if (res === "50") {
					counter += 18;
				}
				else if (res === "51" && counter < 50) {
					counter += 19;
				}

				if (parseInt(res) > counter) {
					for (var i = counter; i < parseInt(res); i++) {
						var cell = document.createElement("td");
						row.appendChild(cell);
						counter += 1;
					}
				}
				var cell = document.createElement("td");
				// check if res is upkeep or production.
				// If upkeep we do amount - min, else we do max - amount and make it negative..
				if (!building.res_upkeep[res]) {
					cell.textContent = building.amount[res] - building.amount_min[res];
				}
				else {
					cell.textContent = -(building.amount_max[res] - building.amount[res]);
				}
				row.appendChild(cell);
			}

			if (counter > 50) {
				counter -= 18;
			}
			for (var i = counter; i < 34; i++) {
				var cell = document.createElement("td");
				row.appendChild(cell);
			}

			var cell = document.createElement("td");
			cell.textContent = timeConverter(building.time);
			row.appendChild(cell);
			var cell = document.createElement("td");
			var trash_img = document.createElement("img");
			trash_img.src = "http://static.pardus.at/img/stdhq/ui_trash.png";
			trash_img.onclick = function(){removeBuilding(loc,universe); row.style.display="none";};
			cell.appendChild(trash_img);
			row.appendChild(cell);
		}
	}

	table.style.background = "url(//static.pardus.at/img/stdhq/bgdark.gif)";
	table.setAttribute("class" , "messagestyle");
	table.align = "center"
	document.getElementsByTagName("h1")[0].parentNode.appendChild(table);
}

function timeConverter(UNIX_timestamp){
    // Borrowed this from https://stackoverflow.com/questions/847185/convert-a-unix-timestamp-to-time-in-javascript
	var a = new Date(UNIX_timestamp);
	var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
	var year = a.getFullYear();
	var month = months[a.getMonth()];
	var date = a.getDate();
	var hour = a.getHours();
	var min = a.getMinutes();
	var sec = a.getSeconds();
	var time = date + ' ' + month + ' ' + year + ' ' + hour + ':' + min + ':' + sec ;
	return time;
}
//chrome.storage.local.get(null,function (data){console.log(JSON.stringify(data))});

chrome.storage.local.get(buildingListId,showOverview);

// To do
// X Make universe specific. -> added on 4 sept '17
// * Add owner (since it is in the building_trade html).
// * Add type based on res_upkeep or res_production (or from building trade html)
// * Sum all rows of a single column.
// * Add building delete button.
// * Add option to allow own buildings to be added.
// * Find a way to convert location number to Sector [x,y].

})();
