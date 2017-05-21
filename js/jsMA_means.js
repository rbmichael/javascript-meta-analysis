// run when document is fully loaded
$(document).ready(function() {
	
	// set the 'add a study' button behaviour
	$('#add').click(function() {
		// add the html for a new study
		$('#studies').append("<div>" + "M: <input type=\"number\" value=\"\"></input>" + "SD: <input type=\"number\" value=\"\"></input>" + "N: <input type=\"number\" value=\"\"></input>" + "<input type=\"button\" value=\"remove\" class=\"remove\"></input>" + "<br />" + "</div>");
		// add the remove button behaviour
		$('#studies div:last .remove').click(function() {
			if ($('#studies div').length > 2) { $(this).parent().detach(); } // if 3+ studies, remove the row
			else { alert("At least 2 studies are required."); } // otherwise display a message
		});
	});

	// set the 'remove all studies' button behaviour
	$('#removeAll').click(function() {
		$('#display *').detach(); // clear the display
		$('#studies *').detach(); // remove all studies
		$('#add').click(); $('#add').click(); // add the 2 minimum study rows
	});
	
	// set the 'run' button behaviour
	$('#run').click(function() {
		/* step 1: check data entry, proceed if OK, else return error
			- must have: 2+ studies, with each having m, sd > 0, n >= 2
		*/
		var dataOK = checkData();
		if (!dataOK) { alert("Error with data entry. Each study must have M, SD > 0, and N >= 2."); return; }
		
		/* step 2: gather data for analysis */
		var maData = getData(); // get form data and inferential stats for individual studies
		maData.fixedWeights = getFixedWeightSums(maData.dataSet); // get fixed weights
		maData.heterogeneity = getHeterogeneity(maData.fixedWeights, maData.df, maData.alpha); // get heterogeneity measures
		for (var i = 0; i < maData.dataSet.length; i++) { // for each study in the dataset, add in its random model variance and weight
			maData.dataSet[i].randomVariance = maData.dataSet[i].variance + maData.heterogeneity.tSq; // random model variance
			maData.dataSet[i].randomWeight = 1 / maData.dataSet[i].randomVariance; // random model weight
		}
		maData.randomWeights = getRandomWeightSums(maData.dataSet); // get random weights
		
		/* step 3: meta-analysis calculations */
		maData.fixed = metaAnalyse(maData.fixedWeights, maData.alpha, maData.nullMean); // run the fixed model meta-analysis
		maData.random = metaAnalyse(maData.randomWeights, maData.alpha, maData.nullMean); // run the random model meta-analysis
		
		/* step 4: display meta-analysis results */
		$('#display *').detach(); // first clear the display
		for (var i = 0; i < maData.dataSet.length; i++) { // then loop through each study and display its data
			$('#display').append("<div>" + "Study #" + (i+1) + " Mean = " + maData.dataSet[i].mean.toFixed(2) + " SD = " + maData.dataSet[i].sd.toFixed(2) + " N = " + maData.dataSet[i].n.toFixed(0) + " SE = " + maData.dataSet[i].se.toFixed(2) + " Var = " + maData.dataSet[i].variance.toFixed(2) + " MoE = " + maData.dataSet[i].moe.toFixed(2) + " Weight = " + maData.dataSet[i].weight.toFixed(2) + " t = " + maData.dataSet[i].t.toFixed(2) + " p = " + maData.dataSet[i].p.toFixed(3) + "</div><br />");
		}
		displayModel(maData.fixed, "FIXED"); // then display the fixed model
		displayModel(maData.random, "RANDOM"); // then display the random model
		// then display the heterogeneity information
		$('#display').append("<div>" + "HETEROGENEITY INFORMATION<br />" + " Q = " + maData.heterogeneity.q.toFixed(2) + " C = " + maData.heterogeneity.c.toFixed(2) + " Tau<sup>2</sup> = " + maData.heterogeneity.tSq.toFixed(2) + " Tau = " + maData.heterogeneity.t.toFixed(2) + " I<sup>2</sup> = " + (maData.heterogeneity.iSq * 100).toFixed(2) + "%" + " B1 = " + maData.heterogeneity.b1.toFixed(2) + " B2 = " + maData.heterogeneity.b2.toFixed(2) + " L = " + maData.heterogeneity.l.toFixed(2) + " U = " + maData.heterogeneity.u.toFixed(2) + " LL Tau<sup>2</sup> = " + maData.heterogeneity.lltSq.toFixed(2) + " UL Tau<sup>2</sup> = " + maData.heterogeneity.ultSq.toFixed(2) + " LL Tau = " + maData.heterogeneity.llt.toFixed(2) + " UL Tau = " + maData.heterogeneity.ult.toFixed(2) + " p = " + maData.heterogeneity.p.toFixed(3) + "</div><br />");
		
		/* step 5: output data to csv in a <textarea> */
		var csv = "INDIVIDUAL STUDIES\nStudy ID,Mean,Standard Deviation,N,Standard Error,Variance,Margin of Error,Lower Limit CI,Upper Limit CI,Study weight,t value,p value\n";
		for (var i = 0; i < maData.dataSet.length; i++) {
			csv += String(i+1) + "," + maData.dataSet[i].mean + "," + maData.dataSet[i].sd + "," + maData.dataSet[i].n + "," + maData.dataSet[i].se + "," + maData.dataSet[i].variance + "," + maData.dataSet[i].moe + "," + (maData.dataSet[i].mean - maData.dataSet[i].moe) + "," + (maData.dataSet[i].mean + maData.dataSet[i].moe) + "," + maData.dataSet[i].weight + "," + maData.dataSet[i].t + "," + maData.dataSet[i].p + "\n";
		}
		csv += "\nFIXED EFFECTS MODEL\nMean,Standard Deviation,Variance,Margin of Error,Lower Limit CI,Upper Limit CI,z value,p value\n" + maData.fixed.mean + "," + maData.fixed.sd + "," + maData.fixed.variance + "," + maData.fixed.moe + "," + maData.fixed.ll + "," + maData.fixed.ul + "," + maData.fixed.z + "," + maData.fixed.p + "\n";
		csv += "\nRANDOM EFFECTS MODEL\nMean,Standard Deviation,Variance,Margin of Error,Lower Limit CI,Upper Limit CI,z value,p value\n" + maData.random.mean + "," + maData.random.sd + "," + maData.random.variance + "," + maData.random.moe + "," + maData.random.ll + "," + maData.random.ul + "," + maData.random.z + "," + maData.random.p + "\n";
		csv += "\nHETEROGENEITY INFORMATION\nQ,C,Tau squared,Tau,I squared,B1,B2,L,U,Lower Limit CI Tau squared,Upper Limit CI Tau squared,Lower Limit CI Tau,Upper Limit CI Tau,p value\n" + maData.heterogeneity.q + "," + maData.heterogeneity.c + "," + maData.heterogeneity.tSq + "," + maData.heterogeneity.t + "," + maData.heterogeneity.iSq + "," + maData.heterogeneity.b1 + "," + maData.heterogeneity.b2 + "," + maData.heterogeneity.l + "," + maData.heterogeneity.u + "," + maData.heterogeneity.lltSq + "," + maData.heterogeneity.ultSq + "," + maData.heterogeneity.llt + "," + maData.heterogeneity.ult + "," + maData.heterogeneity.p + "\n";
		$('#display').append("<p>Copy the text below to save as .csv</p><textarea>" + csv + "</textarea>");
		$('#display textarea').width($(document).width()-50);
		$('#display textarea').height(200);
	});

	// add the initial 2 study rows
	$('#add').click();
	$('#add').click();

	// enable the 'run' button
	$('#run').prop('disabled', false);

});

// data entry check: minimum 2 studies, each with M = a number, SD > 0 and N >= 2
function checkData() {
	var ok = true; // boolean to return
	if ($('#studies div').length < 2) { ok = false; return ok; } // if fewer than 2 studies, stop (should never happen)
	// loop through the studies
	$('#studies div').each(function(index) {
		$(this).children('input').each(function(index) { // for each study's input data
			switch(index) {
				case 0: // check the Mean
					if (!$.isNumeric($(this).val())) { ok = false; } // if mean is not a number, set flag to false
					break;
				case 1: // check the SD
					if (!$.isNumeric($(this).val()) || $(this).val() <= 0) { ok = false; } // if SD is not a number or is <= 0, set flag to false
					break;
				case 2: // check the N
					if ($.isNumeric($(this).val())) { // is N a number?
						if ($(this).val() < 2) { ok = false; } // if N is less than 2, set flag to false
						if (!(Math.round($(this).val()) === Number($(this).val()))) { ok = false; } // if N doesn't round to the same number as itself, set flag to false (N must be an integer)
					} else { ok = false; } // if N is not a number, set flag to false
					break;
				default:
					break;
			}
		});
	});
	return ok; // pass back value
}

// gather form data, calculate inferential stats for individual studies, and return these data in an object
function getData() {
	var maData = {}; // object to hold data
	maData.k = $('#studies div').length; // number of studies
	maData.df = maData.k - 1; // degrees of freedom
	maData.ci = Number($('#ci').val()); // level of confidence
	maData.nullMean = Number($('#null').val()); // null hypothesis mean
	maData.alpha = (100 - maData.ci) / 100; // alpha
	maData.dataSet = new Array(); // an array to hold the dataset; each item in the array is an object with one study's data
	var t_crit; // holds critical t value for each study (calculated via jStat)
	var studyData = { mean:null, sd:null, n:null, se:null, variance:null, moe:null, weight:null, t:null, p:null }; // an object for study data
	// loop through the studies
	$('#studies div').each(function(index) {
		// get a study's M, SD, and N
		$(this).children('input').each(function(index) {
			switch(index) {
				case 0:
					studyData.mean = Number($(this).val()); // Mean
					break;
				case 1:
					studyData.sd = Number($(this).val()); // SD
					break;
				case 2:
					studyData.n = Number($(this).val()); // N
					break;
				default:
					break;
			}
		});
		studyData.se = studyData.sd / Math.sqrt(studyData.n); // calculate standard error
		studyData.variance = studyData.se * studyData.se; // calculate variance
		t_crit = jStat.studentt.inv((1-(maData.alpha/2)), studyData.n-1); // calculate critical t value
		studyData.moe = t_crit * studyData.se; // calculate margin of error
		studyData.weight = 1 / studyData.variance; // calculate (fixed) study weight
		studyData.t = (studyData.mean - maData.nullMean) / studyData.se; // calculate t value
		studyData.p = 2 * (1 - (jStat.studentt.cdf(Math.abs(studyData.t), studyData.n-1))); // calculate p value
		// add the study's data to the data array
		maData.dataSet[index] = { mean:studyData.mean, sd:studyData.sd, n:studyData.n, se:studyData.se, variance:studyData.variance, moe:studyData.moe, weight:studyData.weight, t:studyData.t, p:studyData.p, randomVariance:null, randomWeight:null };
	});
	return maData;
}

// calculate summed weights for fixed effects model, return as object of 4 values
function getFixedWeightSums(dataset) {
    var i, fixedWeights = { sumWeights:0, sumWeightsTimesMeans:0, sumWeightsTimesSquaredMeans:0, sumSquaredWeights:0 }; // create an object to hold the weight values
    // for each study, add the weight measures, resulting in summed weights
    for (i = 0; i < dataset.length; i++) {
        fixedWeights.sumWeights += dataset[i].weight;
        fixedWeights.sumWeightsTimesMeans += ( dataset[i].weight * dataset[i].mean );
        fixedWeights.sumWeightsTimesSquaredMeans += ( dataset[i].weight * ( dataset[i].mean * dataset[i].mean ) );
        fixedWeights.sumSquaredWeights += ( dataset[i].weight * dataset[i].weight );
    }
    return fixedWeights;
}

// calculate heterogeneity measures, return as object of 15 values
function getHeterogeneity(weights, df, alpha) {
    var q, c, tSq, t, iSq, b, b1, b2, l, u, lltSq, ultSq, llt, ult, p;
    q = weights.sumWeightsTimesSquaredMeans - ( ( weights.sumWeightsTimesMeans * weights.sumWeightsTimesMeans ) / weights.sumWeights ); // Q
    c = weights.sumWeights - ( weights.sumSquaredWeights / weights.sumWeights ); // C
    if (c === 0) { tSq = 0; } else { tSq = Math.max(0, ( (q - df) / c ) ); } // Tau squared
    t = Math.sqrt(tSq); // Tau
    iSq = Math.max(0, ((q - df) / q)); // I squared
    // calculating CI on Tau
    b1 = 0.5 * ( ( Math.log(q) - Math.log(df) ) / ( Math.sqrt(q*2) - Math.sqrt((2*df)-1) ) ); // B1
    b2 = Math.sqrt((1 / ((2 * (df-1)) * (1 - (1 / (3 * ((df-1)*(df-1)))))))); // B2
    if (q > (df+1)) { b = b1; } else { b = b2; } // B
    l = Math.exp( (0.5 * Math.log(q / df)) - (jStat.normal.inv((1-(alpha/2)), 0, 1) * b) ); // L
    u = Math.exp( (0.5 * Math.log(q / df)) + (jStat.normal.inv((1-(alpha/2)), 0, 1) * b) ); // U
    lltSq = Math.max(0, ( (df * ((l*l) - 1))) / c); // Lower 95% CI Tau^2 (cannot be less than zero)
    ultSq = Math.max(0, ( (df * ((u*u) - 1))) / c); // Upper 95% CI Tau^2 (cannot be less than zero)
    llt = Math.sqrt(lltSq); // Lower 95% CI Tau
    ult = Math.sqrt(ultSq); // Upper 95% CI Tau
    p = 1 - jStat.chisquare.cdf(q, df); // p value
    // pass these values into an object to be sent back
    var heterogeneity = { q:q, c:c, tSq:tSq, t:t, iSq:iSq, b1:b1, b2:b2, b:b, l:l, u:u, lltSq:lltSq, ultSq:ultSq, llt:llt, ult:ult, p:p };
    return heterogeneity; // send the data back
}

// calculate summed weights for random effects model, return as object of 2 values
function getRandomWeightSums(dataset) {
    var randomWeights = { sumWeightsTimesMeans:0, sumWeights:0 }; // object to hold weight values (initially zero)
    for (var i=0;i<dataset.length;i++) { // loop through each study
        randomWeights.sumWeightsTimesMeans += dataset[i].randomWeight * dataset[i].mean; // add study's weight * mean
        randomWeights.sumWeights += dataset[i].randomWeight; // add study's weight
    }
    return randomWeights; // pass back the data
}

// calculate meta-analysis, return as object of 8 values
function metaAnalyse(weights, alpha, nullMean) {
	var maData = {}; // create an object to hold the meta-analysis data
	maData.mean = weights.sumWeightsTimesMeans / weights.sumWeights; // meta-analysed mean
	maData.variance = 1 / weights.sumWeights; // variance of meta-analysed mean
	maData.sd = Math.sqrt(maData.variance); // standard deviation of meta-analysed mean
	maData.moe = jStat.normal.inv((1-(alpha/2)), 0, 1) * maData.sd; // margin of error of meta-analysed mean
	maData.ll = maData.mean - maData.moe; // lower limit of 95% CI
	maData.ul = maData.mean + maData.moe; // upper limit of 95% CI
	maData.z = (maData.mean - nullMean) / maData.sd; // z value
	maData.p = 2 * (1 - (jStat.normal.cdf(Math.abs(maData.z), 0, 1))); // p value
	return maData; // pass the data back
}

// display a meta-analysis model
function displayModel(data, model) {
	$('#display').append("<div>"
		+ model + " EFFECTS MODEL<br />"
		+ "Mean = " + data.mean.toFixed(2)
		+ " SD = " + data.sd.toFixed(2)
		+ " Var = " + data.variance.toFixed(2)
		+ " MoE = " + data.moe.toFixed(2)
		+ " LL = " + data.ll.toFixed(2)
		+ " UL = " + data.ul.toFixed(2)
		+ " z = " + data.z.toFixed(2)
		+ " p = " + data.p.toFixed(3)
		+ "</div><br />"
	);
}







/* everything below here from old version */

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