// function that runs when document has loaded
$(document).ready(function() {

	// enable the 'run' button
	$('#run').prop('disabled', false);
	
	// set the 'add a study' button behaviour
	$('#add').click(function() {
		// add the html for a new study
		$('#studies').append("<div>" + 
							"M: <input type=\"number\" value=\"\"></input>" +
							"SD: <input type=\"number\" value=\"\"></input>" +
							"N: <input type=\"number\" value=\"\"></input>" +
							"<input type=\"button\" value=\"remove\" class=\"remove\"></input>" +
							"<br />" +
							"</div>");
		// update all 'remove' buttons' behaviour
		$('.remove').click(function() { $(this).parent().detach(); });
	});

	// set the initial 'remove' buttons' behaviour
	$('.remove').click(function() { $(this).parent().detach(); });
	
	// set the 'remove all studies' button behaviour
	$('#removeAll').click(function() {
		$('#studies *').detach();
	});
	
	// set the 'run' button behaviour
	$('#run').click(function() {
		/*
			step 1: check data entry, proceed if OK, else return errors
			- minimum 2 studies
			- each study must have: sd > 0 && n > 1
		*/
		
		/* step 2: gather data for analysis */
		var maData = getData(); // get form data and inferential stats for individual studies
		maData.fixedWeights = getFixedWeightSums(maData.dataSet); // get fixed weights
		maData.heterogeneity = getHeterogeneity(maData.fixedWeights, maData.df, maData.alpha); // get heterogeneity measures
		// for each study in the dataset, add in its random model variance and weight
		for (var i = 0; i < maData.dataSet.length; i++) {
			maData.dataSet[i].randomVariance = maData.dataSet[i].variance + maData.heterogeneity.tSq; // random model variance
			maData.dataSet[i].randomWeight = 1 / maData.dataSet[i].randomVariance; // random model weight
		}
		maData.randomWeights = getRandomWeightSums(maData.dataSet); // get random weights
		
		/* step 3: meta-analysis calculations */
		maData.fixed = metaAnalyse(maData.fixedWeights, maData.alpha, maData.nullMean); // run the fixed model meta-analysis
		maData.random = metaAnalyse(maData.randomWeights, maData.alpha, maData.nullMean); // run the random model meta-analysis
		
		/* step 4: display meta-analysis results */
		// BOOKMARK: Have all data in maData variable, just need to display it
	});
});

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
					studyData.mean = Number($(this).val());
					break;
				case 1:
					studyData.sd = Number($(this).val());
					break;
				case 2:
					studyData.n = Number($(this).val());
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
    // Tau^2
    if (c === 0) { tSq = 0; } else { tSq = Math.max(0, ( (q - df) / c ) ); }
    t = Math.sqrt(tSq); // Tau
    iSq = Math.max(0, ((q - df) / q)); // I^2
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
    // p value
    p = 1 - jStat.chisquare.cdf(q, df);
    // pass these values into an object to be sent back
    var heterogeneity = { q:q, c:c, tSq:tSq, t:t, iSq:iSq, b1:b1, b2:b2, b:b, l:l, u:u, lltSq:lltSq, ultSq:ultSq, llt:llt, ult:ult, p:p };
    return heterogeneity; // send the data back
}

// calculate summed weights for random effects model, return as object of 2 values
function getRandomWeightSums(dataset) {
    var i;
    // create an object to hold the values of the weights (initially zero)
    var randomWeights = { sumWeightsTimesMeans:0, sumWeights:0 };
    // for each row of data (each study) add the appropriate weight measure to the object values, producing a sum
    for (i=0;i<dataset.length;i++) {
        randomWeights.sumWeightsTimesMeans += dataset[i].randomWeight * dataset[i].mean;
        randomWeights.sumWeights += dataset[i].randomWeight;
    }
    // pass back the data
    return randomWeights;
}

// calculate meta-analysis, return as object of 8 values
function metaAnalyse(weights, alpha, nullMean) {
	var maData = {};
	maData.mean = weights.sumWeightsTimesMeans / weights.sumWeights; // meta-analysed mean
	maData.variance = 1 / weights.sumWeights; // variance of meta-analysed mean
	maData.sd = Math.sqrt(maData.variance); // standard deviation of meta-analysed mean
	maData.moe = jStat.normal.inv((1-(alpha/2)), 0, 1) * maData.sd; // margin of error of meta-analysed mean
	maData.ll = maData.mean - maData.moe; // lower limit of 95% CI
	maData.ul = maData.mean + maData.moe; // upper limit of 95% CI
	maData.z = (maData.mean - nullMean) / maData.sd;
	maData.p = 2 * (1 - (jStat.normal.cdf(Math.abs(maData.z), 0, 1)));
	return maData; // pass the data back
}









/* everything below here from old version */

/*
    // display MA
    var c = document.getElementById("container");
    var z, p;
    c.innerHTML = "Point and Interval Estimates<br />";
    for (i=0;i<k;i++) {
    	c.innerHTML += (i+1) + ". Mean = " + dataset[i].mean.toFixed(2) + ", CI [" + (dataset[i].mean - dataset[i].moe).toFixed(2) + ", " + (dataset[i].mean + dataset[i].moe).toFixed(2) +"], ";
    	c.innerHTML += "t = " + dataset[i].t.toFixed(2) + ", p = " + dataset[i].p.toFixed(2) + "<br />"; 
    }
    c.innerHTML += "<br />FIXED EFFECTS MODEL<br />";
    c.innerHTML += "Mean = " + MAFixed.MetaAnalysedMean.toFixed(2) + ", CI [" + MAFixed.lowerCI_MetaAnalysedMean.toFixed(2) + ", " + MAFixed.upperCI_MetaAnalysedMean.toFixed(2) + "]";
    z = (MAFixed.MetaAnalysedMean - null_mean) / MAFixed.sdMetaAnalysedMean;
    p = 2 * (1 - (jStat.normal.cdf(Math.abs(z), 0, 1)));
    c.innerHTML += ", z = " + z.toFixed(2);
    c.innerHTML += ", p = " + p.toFixed(2) + "<br />";
    c.innerHTML += "<br />RANDOM EFFECTS MODEL<br />";
    c.innerHTML += "Mean = " + MARandom.MetaAnalysedMean.toFixed(2) + ", CI [" + MARandom.lowerCI_MetaAnalysedMean.toFixed(2) + ", " + MARandom.upperCI_MetaAnalysedMean.toFixed(2) + "]";
    z = (MARandom.MetaAnalysedMean - null_mean) / MARandom.sdMetaAnalysedMean;
    p = 2 * (1 - (jStat.normal.cdf(Math.abs(z), 0, 1)));
    c.innerHTML += ", z = " + z.toFixed(2);
    c.innerHTML += ", p = " + p.toFixed(2) + "<br />";
    c.innerHTML += "<br />HETEROGENEITY<br />";
    c.innerHTML += "Tau<sup>2</sup> = " + heterogeneity.tSq.toFixed(2);
    c.innerHTML += "<br />Tau = " + heterogeneity.t.toFixed(2) + ", CI [" + heterogeneity.llt.toFixed(2) + ", " + heterogeneity.ult.toFixed(2) + "]";
    c.innerHTML += "<br />Q = " + heterogeneity.q.toFixed(2) + "<br />df = " + df + "<br />p = " + heterogeneity.p.toFixed(2);
    c.innerHTML += "<br />I<sup>2</sup> = " + (heterogeneity.iSq * 100).toFixed(2) + "%";
    
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