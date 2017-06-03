/*
    // display ascii plot
    
    var low = dataset[0].mean - dataset[0].moe;
    var high = dataset[0].mean + dataset[0].moe;
    var range;
    var ll;
    var ul;
    var i,j;
    var rescale = { mean:null, ll:null, ul:null };
    var rescaleData = new Array();
    for (i=1; i<k; i++) {
        ll = dataset[i].mean - dataset[i].moe;
        ul = dataset[i].mean + dataset[i].moe;
        if (ll < low) { low = ll; }
        if (ul > high) { high = ul; }
    }
    range = high - low;
    for (i=0; i<k; i++) {
    	rescale.mean = Math.round((100 * (dataset[i].mean - low)) / range);
    	rescale.ll = Math.round((100 * ((dataset[i].mean-dataset[i].moe) - low)) / range);
    	rescale.ul = Math.round((100 * ((dataset[i].mean+dataset[i].moe) - low)) / range);
    	rescaleData[i] = { mean:rescale.mean, ll:rescale.ll, ul:rescale.ul };
    }
    document.getElementById("temp").innerHTML = "ASCII FOREST PLOT:<br /><br />";
    for (i=0; i<k; i++) {
    	for (j=0; j<120; j++) {
    		if ((j === (rescaleData[i].ll+10)) || (j === (rescaleData[i].ul+10)) || (j === (rescaleData[i].mean+10))) {
    			document.getElementById("temp").innerHTML += "<div id=\"" + i + j + "\">.</div>";
    		} else {
    			document.getElementById("temp").innerHTML += ".";
    		}
    		//document.getElementById("temp").innerHTML += "<div id=\"" + i + j + "\" style=\"font-family:courier; font-size:8pt;\">.</div>";
    	}
    	document.getElementById("temp").innerHTML += "<br />";
    }
    for (i=0; i<k; i++) {
    	document.getElementById(i+""+(rescaleData[i].ll+10)).innerHTML = "[";
    	document.getElementById(i+""+(rescaleData[i].ul+10)).innerHTML = "]";
    	document.getElementById(i+""+(rescaleData[i].mean+10)).innerHTML = "|";
    }
    // plot fixed effects model
    rescale.mean = Math.round((100 * (MAFixed.MetaAnalysedMean - low)) / range);
    rescale.ll = Math.round((100 * ((MAFixed.MetaAnalysedMean-MAFixed.MOE_MetaAnalysedMean) - low)) / range);
    rescale.ul = Math.round((100 * ((MAFixed.MetaAnalysedMean+MAFixed.MOE_MetaAnalysedMean) - low)) / range);
    rescaleData[0] = { mean:rescale.mean, ll:rescale.ll, ul:rescale.ul };
    for (j=0; j<120; j++) {
    	if ((j === (rescaleData[0].ll+10)) || (j === (rescaleData[0].ul+10)) || (j === (rescaleData[0].mean+10))) {
    		document.getElementById("temp").innerHTML += "<div id=\"fixed" + j + "\">.</div>"; 
    	} else {
			document.getElementById("temp").innerHTML += ".";
    	}
    }
    document.getElementById("fixed"+(rescaleData[0].ll+10)).innerHTML = "[";
    document.getElementById("fixed"+(rescaleData[0].ul+10)).innerHTML = "]";
    document.getElementById("fixed"+(rescaleData[0].mean+10)).innerHTML = "|";
    document.getElementById("temp").innerHTML += "<-- FIXED EFFECTS MODEL<br />";
    // plot random effects model
    rescale.mean = Math.round((100 * (MARandom.MetaAnalysedMean - low)) / range);
    rescale.ll = Math.round((100 * ((MARandom.MetaAnalysedMean-MARandom.MOE_MetaAnalysedMean) - low)) / range);
    rescale.ul = Math.round((100 * ((MARandom.MetaAnalysedMean+MARandom.MOE_MetaAnalysedMean) - low)) / range);
    rescaleData[0] = { mean:rescale.mean, ll:rescale.ll, ul:rescale.ul };
    for (j=0; j<120; j++) {
    	if ((j === (rescaleData[0].ll+10)) || (j === (rescaleData[0].ul+10)) || (j === (rescaleData[0].mean+10))) {
    		document.getElementById("temp").innerHTML += "<div id=\"random" + j + "\">.</div>"; 
    	} else {
			document.getElementById("temp").innerHTML += ".";
    	}
    }
    document.getElementById("random"+(rescaleData[0].ll+10)).innerHTML = "[";
    document.getElementById("random"+(rescaleData[0].ul+10)).innerHTML = "]";
    document.getElementById("random"+(rescaleData[0].mean+10)).innerHTML = "|";
    document.getElementById("temp").innerHTML += "<-- RANDOM EFFECTS MODEL<br />";
}
*/