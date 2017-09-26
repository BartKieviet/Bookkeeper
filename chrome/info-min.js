var dict_descriptions=new Array();
var image_path="//static.pardus.at/img/std/";

function getElement(a){
	return document.getElementById(a)
	}
	
function writeContents(a,b){
	a.innerHTML=b
}
function getOffset(b,c){
	var a=b["offset"+c];
	if(c=="Top"){
		a+=b.offsetHeight
		}
	b=b.offsetParent;
	while(b!=null){
		a+=b["offset"+c];
		b=b.offsetParent
		}
	return a
}
function setPosition(a,c,b){
	xOffset=15;
	yOffset=-13;
	if(b=="l"){
		xOffset+=-220
	} else {
		if (b=="er"){
			xOffset+=128
		} else {
			if(b=="lf"){
				xOffset+=-160;
				yOffset+=-310
			}
		}
	}
	a.style.top=getOffset(c,"Top")+yOffset+"px";
	a.style.left=getOffset(c,"Left")+xOffset+"px"
}

function setVisibility(b,a){
	if(a){
		b.style.visibility="visible"
	}else{
		b.style.visibility="hidden"
	}
}
function getDescriptionFor(a){
	if(typeof(dict_descriptions[a])=="undefined"){
		return"Sorry, no description ("+a+") available."
	}
	return dict_descriptions[a]
}
function getContent(c,a,d){
	var b;var e;
	if(d=="portal"){
		e="<b>Pardus Information Box</b>"
	}else{
		e="<b>GNN Library</b><img src='"+image_path+"info.gif' width='10' height='12' border='0'>"
	}
	b="<table class='messagestyle' style='background:url("+image_path+"bgd.gif)' cellspacing='0' cellpadding='3' width='100%'>	<tr>		<td style='text-align:left;background:#000000;'><b>"+a+"</b></td>   </tr>   <tr>   	<td style='text-align:left;'>"+getDescriptionFor(c)+"</td>   </tr>   <tr>   	<td height='5'><spacer type='block' width='1' height='1'></td>   </tr>   <tr>   	<td style='text-align:right;background:#31313A;'>"+e+"</td>   </tr></table>";
	return b
}
function displayContents(b,f,a,e,g){
	var c=getElement("tipBox");
	var d=getContent(f,a,g);
	writeContents(c,d);
	setPosition(c,b,e);
	setVisibility(c,true)
}
function tip(b,d,a,c,e){
	d=unescape(d);
	if(typeof(dict_descriptions)=="undefined"){
		return
	}
	displayContents(b,d,a,c,e)
}
function nukeTip(){
	setVisibility(getElement("tipBox"),false)
};