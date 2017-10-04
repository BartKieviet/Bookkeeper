// This is a content script, it runs on starbase_trade.php and planet_trade.php.

// From other files:
var Overlay;

setup();

// End of script execution.

function setup() {
	var ukey, form, container, img, button;

	// Insert a BK button.  That's all our UI.

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
		  storageKey: 'SB' } );
	
	function makeButton( id ) {
		button = document.createElement( 'button' );
		button.type = 'button';
		button.id = id;
		button.style = "width: 175px; height: 35px; margin-left: 3px; margin-right: 3px;";
		return button
	}

	if (document.forms.planet_trade) {
		var middleNode = document.getElementById('quickButtonsTbl').parentNode;
		middleNode.appendChild( document.createElement( 'br' ));
		middleNode.appendChild( document.createElement( 'br' ));

		button = makeButton ( 'bookkeeper-transfer-food' ) 
		button.textContent = '<- Food | Energy ->';
		middleNode.appendChild ( button ) ;
		button.addEventListener('click', function() {
			if ( document.getElementById('shiprow2').getElementsByTagName('a')[1] ) {
				document.getElementById('shiprow2').getElementsByTagName('a')[1].click();
			}
			document.getElementById('baserow1').getElementsByTagName('a')[1].click(); 
			document.forms.planet_trade.submit();
		}); 
		
		middleNode.appendChild( document.createElement( 'br' ));
		middleNode.appendChild( document.createElement( 'br' ));
		button = makeButton ( 'bookkeeper-transfer-water' ) 
		button.textContent = '<- Water | Energy ->';
		middleNode.appendChild ( button ) ;		
		button.addEventListener('click', function() {
			if ( document.getElementById('shiprow2').getElementsByTagName('a')[1] ) {
				document.getElementById('shiprow2').getElementsByTagName('a')[1].click();
			}
			document.getElementById('baserow3').getElementsByTagName('a')[1].click(); 
			document.forms.planet_trade.submit();
		});
		middleNode.appendChild( document.createElement( 'br' ));
		middleNode.appendChild( document.createElement( 'br' ));

		button = makeButton ( 'bookkeeper-transfer-FWE' ) 
		button.textContent = '<-SB FW | Energy ->';
		middleNode.appendChild ( button ) ;
		button.addEventListener('click', function() {
			var ship_cargo = parseInt(document.getElementById('shiprow32').nextElementSibling.nextElementSibling.lastElementChild.textContent.split(/t/g)[0]);

			if (document.getElementById('shiprow2').getElementsByTagName('a')[1] ) {
				document.getElementById('shiprow2').getElementsByTagName('a')[1].click();
				ship_cargo += parseInt( document.getElementById('sell_2').value );
			}
			var buyFood = Math.floor( ship_cargo / 5 * 3);
			var buyWater = ship_cargo - buyFood;
			
			document.getElementById('buy_1').value = buyFood; 
			document.getElementById('buy_3').value = buyWater; 
			document.forms.planet_trade.submit();
		}); 
	}
}
