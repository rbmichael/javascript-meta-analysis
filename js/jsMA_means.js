// function that runs when document has loaded
$(document).ready(function() {

	// 'add a study' button behaviour
	$('#add').click(function() {
		// add the html
		$('#studies').append("<div>" + 
							"M: <input type=\"number\" value=\"\"></input>" +
							"SD: <input type=\"number\" value=\"\"></input>" +
							"N: <input type=\"number\" value=\"\"></input>" +
							"<input type=\"button\" value=\"remove\" class=\"remove\"></input>" +
							"<br />" +
							"</div>");
		// add the 'remove' button behaviour
		$('.remove').click(function() { $(this).parent().detach(); });
	});

	// 'remove all studies' button behaviour
	$('#removeAll').click(function() {
		$('#studies *').detach();
	});
	
	// run meta-analysis
	$('#run').click(function() {
		/*
			step 1: check data entry, proceed if OK, else return errors
		*/
		
		/*
			step 2: gather data for analysis
		*/
		var k = $('#studies div').length; // number of studies
		var df = k - 1; // degrees of freedom
		var ci = Number($('#ci').val()); // level of confidence
		var nullMean = Number($('#null').val()); // null hypothesis mean
		var alpha = (100 - ci) / 100; // alpha
		var formData = new Array(); // an array of the entered data; each item in the array becomes one study
		var studyData = { mean:null, sd:null, n:null }; // an object for each study
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
			// add the study's data to the data array
			formData[index] = studyData;
		});
		// BOOKMARK: Have form data in 'formData'; next step get all individual studies' inferential stats etc
		
		/*
			step 3: meta-analysis calculations
		*/
		
		/*
			step 4: display meta-analysis results
		*/
	});
});

/* everything below here from old version */

// declare global variables
var alpha;

// function to calculate summed weights for fixed effects model
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

// function to get heterogeneity information
function getHeterogeneity(weights, df) {
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

// function to add random model information to the dataset
function addRandomModelInfo(dataset, heterogeneity) {
    // for every study
    var i;
    for (i=0;i<dataset.length;i++) {
        dataset[i].r_variance = dataset[i].variance + heterogeneity.tSq; // get the random model variance
        dataset[i].r_weight = 1 / dataset[i].r_variance; // get the random model weight
    }
    return dataset; // pass the updated data back
}

// function to calculate summed weights for random effects model
function getRandomWeightSums(dataset) {
    var i;
    // create an object to hold the values of the weights (initially zero)
    var randomWeights = { sumWeightsTimesMeans:0, sumWeights:0 };
    // for each row of data (each study) add the appropriate weight measure to the object values, producing a sum
    for (i=0;i<dataset.length;i++) {
        randomWeights.sumWeightsTimesMeans += dataset[i].r_weight * dataset[i].mean;
        randomWeights.sumWeights += dataset[i].r_weight;
    }
    // pass back the data
    return randomWeights;
}            

// function to gather the main meta-analysis information
function doMetaAnalysis(weights) {
    var MAMean = weights.sumWeightsTimesMeans / weights.sumWeights; // meta-analysed mean
    var varMAMean = 1 / weights.sumWeights; // variance of meta-analysed mean
    var sdMAMean = Math.sqrt(varMAMean); // standard deviation of meta-analysed mean
    var MOE_MAMean = (jStat.normal.inv((1-(alpha/2)), 0, 1) * sdMAMean); // margin of error of meta-analysed mean
    var lowerCI = MAMean - MOE_MAMean; // lower 95% CI of meta-analysed mean
    var upperCI = MAMean + MOE_MAMean; // upper 95% CI of meta-analysed mean
    // put the values into an object for the function to return
    var data = { MetaAnalysedMean:MAMean, VarianceOfMetaAnalysedMean:varMAMean, sdMetaAnalysedMean:sdMAMean, MOE_MetaAnalysedMean:MOE_MAMean,
                 lowerCI_MetaAnalysedMean:lowerCI, upperCI_MetaAnalysedMean:upperCI };
    return data; // pass the data back
}

// function that runs when user hits the "RUN" button -- needs some kind of data checking implemented ...
function runMA() {
    var k = Number(document.getElementById("k").value);
    var df = k-1;
    var ci_level = Number(document.getElementById("ci_level").value);
    var null_mean = Number(document.getElementById("null_mean").value);
    alpha = (100 - ci_level) / 100;
    var dataset = new Array();
    var data = { mean:null, sd:null, n:null, se:null, variance:null, moe:null, weight:null, t:null, p:null };
    var i, t, t_crit;
    for (i=0;i<k;i++) {
        data.mean = Number(document.getElementById("i_m"+(i+1)).value);
        data.sd = Number(document.getElementById("i_sd"+(i+1)).value);
        data.n = Number(document.getElementById("i_n"+(i+1)).value);
        data.se = data.sd / Math.sqrt(data.n);
        data.variance = data.se * data.se;
        t_crit = jStat.studentt.inv((1-(alpha/2)), data.n-1);
        data.moe = t_crit * data.se;
        data.weight = 1 / data.variance;
        data.t = (data.mean - null_mean) / data.se;
        data.p = 2 * (1 - (jStat.studentt.cdf(Math.abs(data.t), data.n-1)));
        dataset[i] = { mean:data.mean, sd:data.sd, n:data.n, se:data.se, variance:data.variance, moe:data.moe, weight:data.weight, r_variance:null, r_weight:null, t:data.t, p:data.p };
    }
    var fixedWeightSums = getFixedWeightSums(dataset);
    var heterogeneity = getHeterogeneity(fixedWeightSums, df);
    dataset = addRandomModelInfo(dataset, heterogeneity);
    var randomWeightSums = getRandomWeightSums(dataset);
    var MAFixed = doMetaAnalysis(fixedWeightSums); // call a function to run the fixed effects meta-analysis
    var MARandom = doMetaAnalysis(randomWeightSums); // call a function to run the random effects meta-analysis
    
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