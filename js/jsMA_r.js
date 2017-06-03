// run when document is fully loaded
$(function() {

	// set the 'add a study' button behaviour
	$('#add').click(function() {
		// add the html for a new study
		$('#studies').append("<div>" + "r: <input type=\"number\" value=\"\"></input>" + "N: <input type=\"number\" value=\"\"></input>" + "<button class=\"remove\">remove</button><br /></div>");
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
	
	// set the csv import button behaviour 
	$('#updateCSV').click(function() {
		var csv = $('#csv').val(); // get the textarea input
		var rows = csv.split('\n'); // split it into rows based on newline character
		var data = new Array(); // create an array to hold the data arrays
		for (var i = 0; i < rows.length; i++) { data[i] = rows[i].split(','); } // create an array of values from each row of data
		if (rows.length > 1) { // if there's a minimum of 2 studies, populate the form
			$('#studies *').detach(); // first remove all studies
			// loop through data array adding study rows
			for (var i = 0; i < data.length; i++) {
				$('#add').click(); // add a row
				$('#studies div:last input').each(function(index) { // populate it with data
					switch (index) {
						case 0: // insert r
							$(this).val(data[i][0]);
							break;
						case 1: // insert N
							$(this).val(data[i][1]);
							break;
						default:
							break;
					}
				});
			}
		} else { alert("Minimum of 2 studies (i.e., 2 csv rows) required."); return; } // if < 2 studies, send an error
	});
	
	// set the 'run' button behaviour
	$('#run').click(function() {
		/* step 1: check data entry, proceed if OK, else return error
			- must have: 2+ studies, with each having r (-1 <= r <= 1), n >= 4
		*/
		var dataOK = checkData();
		if (!dataOK) { alert("Error with data entry. Each study must have valid Pearson r and N >= 4."); return; }
		
		/* step 2: gather data for analysis */
		var maData = getData(); // get form data and inferential stats for individual studies
		maData.fixedWeights = getFixedWeightSums(maData.dataSet); // get fixed weights
		maData.heterogeneity = getHeterogeneity(maData.fixedWeights, maData.df, maData.alpha); // get heterogeneity measures
		for (var i = 0; i < maData.dataSet.length; i++) { // for each study in the dataset, add in its random model variance and weight
			maData.dataSet[i].randomVariance = (1 / maData.dataSet[i].weight) + maData.heterogeneity.tSq; // random model variance
			maData.dataSet[i].randomWeight = 1 / maData.dataSet[i].randomVariance; // random model weight
		}
		maData.randomWeights = getRandomWeightSums(maData.dataSet); // get random weights
		
		/* step 3: meta-analysis calculations */
		maData.fixed = metaAnalyse(maData.fixedWeights, maData.alpha, maData.nullMean); // run the fixed model meta-analysis
		maData.random = metaAnalyse(maData.randomWeights, maData.alpha, maData.nullMean); // run the random model meta-analysis
		
		/* step 4: display meta-analysis results */
		$('#display *').detach(); // first clear the display
		for (var i = 0; i < maData.dataSet.length; i++) { // then loop through each study and display its data
			$('#display').append("<div>" + "Study #" + (i+1) + " r = " + maData.dataSet[i].r.toFixed(2) + " N = " + maData.dataSet[i].n.toFixed(0) + " rZ = " + maData.dataSet[i].rZ.toFixed(2) + " varZ = " + maData.dataSet[i].varZ.toFixed(2) + " zLL = " + maData.dataSet[i].zLL.toFixed(2) + " zUL = " + maData.dataSet[i].zUL.toFixed(2) + " rLL = " + maData.dataSet[i].rLL.toFixed(2) + " rUL = " + maData.dataSet[i].rUL.toFixed(2) + " Weight = " + maData.dataSet[i].weight.toFixed(2) + " p = " + maData.dataSet[i].p.toFixed(3) + "</div>");
		}
		displayModel(maData.fixed, "FIXED"); // then display the fixed model
		displayModel(maData.random, "RANDOM"); // then display the random model
		// then display the heterogeneity information
		$('#display').append("<div>" + "HETEROGENEITY INFORMATION<br />" + " Q = " + maData.heterogeneity.q.toFixed(2) + " C = " + maData.heterogeneity.c.toFixed(2) + " Tau<sup>2</sup> = " + maData.heterogeneity.tSq.toFixed(2) + " Tau = " + maData.heterogeneity.t.toFixed(2) + " I<sup>2</sup> = " + (maData.heterogeneity.iSq * 100).toFixed(2) + "%" + " B1 = " + maData.heterogeneity.b1.toFixed(2) + " B2 = " + maData.heterogeneity.b2.toFixed(2) + " L = " + maData.heterogeneity.l.toFixed(2) + " U = " + maData.heterogeneity.u.toFixed(2) + " LL Tau<sup>2</sup> = " + maData.heterogeneity.lltSq.toFixed(2) + " UL Tau<sup>2</sup> = " + maData.heterogeneity.ultSq.toFixed(2) + " LL Tau = " + maData.heterogeneity.llt.toFixed(2) + " UL Tau = " + maData.heterogeneity.ult.toFixed(2) + " p = " + maData.heterogeneity.p.toFixed(3) + "</div>");
		
		/* step 5: output data to csv in a <textarea> */
		var csv = "INDIVIDUAL STUDIES\nStudy ID,r,N,rZ,varZ,zLL,zUL,rLL,rUL,Weight,p\n";
		for (var i = 0; i < maData.dataSet.length; i++) {
			csv += String(i+1) + "," + maData.dataSet[i].r + "," + maData.dataSet[i].n + "," + maData.dataSet[i].rZ + "," + maData.dataSet[i].varZ + "," + maData.dataSet[i].zLL + "," + maData.dataSet[i].zUL + "," + maData.dataSet[i].rLL + "," + maData.dataSet[i].rUL + "," + maData.dataSet[i].weight + "," + maData.dataSet[i].p + "\n";
		}
		csv += "\nFIXED EFFECTS MODEL\nMean r,Lower Limit CI,Upper Limit CI,z value,p value\n" + maData.fixed.Mr + "," + maData.fixed.ll + "," + maData.fixed.ul + "," + maData.fixed.z + "," + maData.fixed.p + "\n";
		csv += "\nRANDOM EFFECTS MODEL\nMean r,Lower Limit CI,Upper Limit CI,z value,p value\n" + maData.random.Mr + "," + maData.random.ll + "," + maData.random.ul + "," + maData.random.z + "," + maData.random.p + "\n";
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

// data entry check: minimum 2 studies, each with valid r and N >= 4
function checkData() {
	var ok = true; // boolean to return
	if ($('#studies div').length < 2) { ok = false; return ok; } // if fewer than 2 studies, stop (should never happen)
	// loop through the studies
	$('#studies div').each(function(index) {
		$(this).children('input').each(function(index) { // for each study's input data
			switch(index) {
				case 0: // check the r
					if (!$.isNumeric($(this).val()) || $(this).val() < -1 || $(this).val() > 1) { ok = false; } // if r is not a number, or is < -1, or is > 1, set flag to false
					break;
				case 1: // check the N
					if ($.isNumeric($(this).val())) { // is N a number?
						if ($(this).val() < 4) { ok = false; } // if N is less than 4, set flag to false
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
	var studyData = { r:null, n:null, rZ:null, varZ:null, z:null, zLL:null, zUL:null, rLL:null, rUL:null, weight:null, p:null }; // an object for study data
	// loop through the studies
	$('#studies div').each(function(index) {
		// get a study's r and N
		$(this).children('input').each(function(index) {
			switch(index) {
				case 0:
					studyData.r = Number($(this).val()); // r
					break;
				case 1:
					studyData.n = Number($(this).val()); // N
					break;
				default:
					break;
			}
		});
		studyData.rZ = 0.5 * Math.log((1+studyData.r)/(1-studyData.r)); // z for r
		studyData.varZ = 1 / (studyData.n - 3); // var of z
		studyData.z = (studyData.rZ - maData.nullMean) / Math.sqrt(studyData.varZ); // z
		studyData.zLL = studyData.rZ - jStat.normal.inv((0.5+maData.ci/200), 0, 1) * Math.sqrt(studyData.varZ); // z LL
		studyData.zUL = studyData.rZ + jStat.normal.inv((0.5+maData.ci/200), 0, 1) * Math.sqrt(studyData.varZ); // z UL
		studyData.rLL = (Math.exp(2*studyData.zLL)-1) / (Math.exp(2*studyData.zLL)+1); // r LL
		studyData.rUL = (Math.exp(2*studyData.zUL)-1) / (Math.exp(2*studyData.zUL)+1); // r UL
		studyData.weight = 1 / studyData.varZ; // weight
		studyData.p = 2 * (1 - jStat.normal.cdf(Math.abs(studyData.z), 0, 1)); // p
		// add the study's data to the data array
		maData.dataSet[index] = { r:studyData.r, n:studyData.n, rZ:studyData.rZ, varZ:studyData.varZ, z:studyData.z, zLL:studyData.zLL, zUL:studyData.zUL, rLL:studyData.rLL, rUL:studyData.rUL, weight:studyData.weight, p:studyData.p, randomVariance:null, randomWeight:null };
	});
	return maData;
}

// calculate summed weights for fixed effects model, return as object of 4 values
function getFixedWeightSums(dataset) {
    var i, fixedWeights = { sumWeights:0, sumWeightsTimesMeans:0, sumWeightsTimesSquaredMeans:0, sumSquaredWeights:0 }; // create an object to hold the weight values
    // for each study, add the weight measures, resulting in summed weights
    for (i = 0; i < dataset.length; i++) {
        fixedWeights.sumWeights += dataset[i].weight;
        fixedWeights.sumWeightsTimesMeans += ( dataset[i].weight * dataset[i].rZ );
        fixedWeights.sumWeightsTimesSquaredMeans += ( dataset[i].weight * ( dataset[i].rZ * dataset[i].rZ ) );
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
        randomWeights.sumWeightsTimesMeans += dataset[i].randomWeight * dataset[i].rZ; // add study's weight * mean
        randomWeights.sumWeights += dataset[i].randomWeight; // add study's weight
    }
    return randomWeights; // pass back the data
}

// calculate meta-analysis, return as object of 8 values
function metaAnalyse(weights, alpha, nullMean) {
	var maData = {}; // create an object to hold the meta-analysis data
	maData.zMr = weights.sumWeightsTimesMeans / weights.sumWeights; // z for M of r
	maData.Mr = (Math.exp(2*maData.zMr)-1) / (Math.exp(2*maData.zMr)+1); // M of r
	maData.sem = Math.sqrt(1/weights.sumWeights); // standard error of mean
	maData.zMOE = jStat.normal.inv((1-(alpha/2)), 0, 1) * maData.sem; // margin of error of z
	maData.rMOE = (Math.exp(2*maData.zMOE)-1) / (Math.exp(2*maData.zMOE)+1); // margin of error of r
	maData.ll = maData.Mr - maData.rMOE; // lower limit of 95% CI of meta-analysed r
	maData.ul = maData.Mr + maData.rMOE; // upper limit of 95% CI of meta-analysed r
	maData.z = (maData.zMr - nullMean) / maData.sem; // z value
	maData.p = 2 * (1 - (jStat.normal.cdf(Math.abs(maData.z), 0, 1))); // p value
	return maData; // pass the data back
}

// display a meta-analysis model
function displayModel(data, model) {
	$('#display').append("<div>"
		+ model + " EFFECTS MODEL<br />"
		+ "zMr = " + data.zMr.toFixed(2)
		+ " Mean r = " + data.Mr.toFixed(2)
		+ " SEM = " + data.sem.toFixed(2)
		+ " zMOE = " + data.zMOE.toFixed(2)
		+ " rMOE = " + data.rMOE.toFixed(2)
		+ " LL = " + data.ll.toFixed(2)
		+ " UL = " + data.ul.toFixed(2)
		+ " z = " + data.z.toFixed(2)
		+ " p = " + data.p.toFixed(3)
		+ "</div>"
	);
}