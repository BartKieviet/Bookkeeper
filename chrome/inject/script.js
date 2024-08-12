(function(){
	var caller = window.location.pathname;
	// dev notes, not sure why we used to split these messages with the pardus_bookkeeper tag, but leaving it in. We could just send null if the variable isn't here.
	
	if (caller == '/starbase_trade.php') {
		var fn = function(){
			window.postMessage({
				pardus_bookkeeper:1,
				loc:typeof(userloc)==='undefined'?null:userloc,
				time:typeof(milliTime)==='undefined'?null:milliTime,
				psbCredits:typeof(obj_credits)==='undefined'?null:obj_credits
			}, window.location.origin);
		};
	}
	
	if (caller == '/main.php' ){
		var fn = function(){
			window.postMessage({
				pardus_bookkeeper:2,
				loc:typeof(userloc)=='undefined'?null:userloc
			}, window.location.origin);
		};
	}
	
	if (caller == '/building_trade.php' ){
		var fn=function(){
			window.postMessage({
				pardus_bookkeeper:1,
				loc:typeof(userloc)==='undefined'?null:userloc,
				time:typeof(milliTime)==='undefined'?null:milliTime,
				player_buy_price:typeof(player_buy_price)==='undefined'?null:player_buy_price,
				player_sell_price:typeof(player_sell_price)==='undefined'?null:player_sell_price,
				amount:typeof(amount)==='undefined'?null:amount,
				amount_max:typeof(amount_max)==='undefined'?null:amount_max,
				amount_min:typeof(amount_min)==='undefined'?null:amount_min
			}, window.location.origin);
		};
	}
	
	if (caller == '/building_management.php' ){
		var fn=function(){
			window.postMessage({
				pardus_bookkeeper:3,
				loc:typeof(userloc)=='undefined'?null:userloc,
				time:typeof(milliTime)=='undefined'?null:milliTime,
				ship_space:typeof(ship_space)=='undefined'?null:ship_space,
				obj_space:typeof(obj_space)=='undefined'?null:obj_space,
			},window.location.origin);}
	}
	
	if(typeof(addUserFunction)==='function') {
		addUserFunction(fn);
	}
	fn();
})();
	


// trade
// (function(){
	// var fn=function(){
		// window.postMessage({
			// pardus_bookkeeper:1,
			// loc:typeof(userloc)==='undefined'?null:userloc,
			// time:typeof(milliTime)==='undefined'?null:milliTime,
			// player_buy_price:typeof(player_buy_price)==='undefined'?null:player_buy_price,
			// player_sell_price:typeof(player_sell_price)==='undefined'?null:player_sell_price,
			// amount:typeof(amount)==='undefined'?null:amount,
			// amount_max:typeof(amount_max)==='undefined'?null:amount_max,
			// amount_min:typeof(amount_min)==='undefined'?null:amount_min},
			// window.location.origin);
			// };
	// if(typeof(addUserFunction)==='function') {
		// addUserFunction(fn);
		// }
	// fn();
// })();		