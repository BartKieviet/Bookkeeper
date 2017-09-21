(function() {
    'use strict';

    function buy_all_prod() {
         // 4 upkeep, 5 production
        //var upk_table = document.getElementsByTagName("table")[4].getElementsByTagName('img');
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
    }

    var new_button = document.getElementsByName("trade_ship")[0].cloneNode(false);
    new_button.setAttribute('type','button');
    new_button.setAttribute('value','Production');
    new_button.setAttribute('name','Prod');
    new_button.addEventListener('click',buy_all_prod);
    document.getElementsByName('trade_ship')[0].parentNode.appendChild(document.createElement('br'));
    document.getElementsByName('trade_ship')[0].parentNode.appendChild(document.createElement('br'));
    document.getElementsByName('trade_ship')[0].parentNode.appendChild(new_button);

})();