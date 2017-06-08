// run when document is fully loaded
$(function() {

 	// build an array of the types of meta-analysis available
 	var maTypesArray = [];
	maTypesArray[0] = { name:"means", description:"Single means", dataFields:["M","SD","N"] };
	maTypesArray[1] = { name:"meanDiffs", description: "Difference between two independent group means", dataFields:["M1","SD1","N1","M2","SD2","N2"] };
	maTypesArray[2] = { name:"meanPairedDiffs", description: "Difference between two dependent means", dataFields:["M1","SD1","M2","SD2","N"] };
	maTypesArray[3] = { name:"d", description:"Cohen's d for a single group", dataFields:["d","N"] };
	maTypesArray[4] = { name:"dDiffs", description:"Cohen's d between two independent groups", dataFields:["d","N1","N2"] };
	maTypesArray[5] = { name:"r", description:"Pearson's r correlations", dataFields:["r","N"] };
	
	var currentMAType = 0; // default to Single means meta-analysis
	
	// populate the meta-analysis <select> element, for choosing a type of meta-analysis
	for (var i=0; i<maTypesArray.length; i++) {
		if (i === currentMAType) { $('#maSelector').append("<option value=\"" + i + "\" selected>" + maTypesArray[i].description + "</option>"); }
		else { $('#maSelector').append("<option value=\"" + i + "\">" + maTypesArray[i].description + "</option>"); }
	}

	// set the meta-analysis type selector's change behaviour (remove studies and setup new form fields)
	$('#maSelector').change(function() {
		currentMAType = parseInt(this.value); // change current MA type to the selected option
		$('#removeAll').click(); // remove everything and setup new form fields
	});

	// set the 'add a study' button behaviour
	$('#add').click(function() {
		var fields = maTypesArray[currentMAType].dataFields; // get the form fields
		var html = ""; // variable to hold the html for the study row
		// add the html for a new study
		$('#studies').append("<div></div>"); // container
		for (var i=0; i<fields.length; i++) { html += fields[i] + "<input type=\"number\" value=\"\"></input>"; } // form fields
		html += "<button class=\"remove\">remove</button>"; // remove study button
		$('#studies div:last').html(html); // update the container html
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
		var data = []; // create an array to hold the data arrays
		for (var i = 0; i < rows.length; i++) { data[i] = rows[i].split(','); } // create an array of values from each row of data
		if (rows.length > 1) { // if there's a minimum of 2 studies, populate the form
			$('#studies *').detach(); // first remove all studies
			// loop through data array adding study rows
			for (var i = 0; i < data.length; i++) {
				$('#add').click(); // add a row
				$('#studies div:last input').each(function(index) { // populate each input field with data
					$(this).val(data[i][index]);
				});
			}
		} else { alert("Minimum of 2 studies (i.e., 2 csv rows) required."); return; } // if < 2 studies, send an error
	});
	
	// set the 'run' button behaviour
	$('#run').click(function() {
		// step 1: check data entry, proceed if OK, else return error
		if (!checkFormData()) { alert("Error with data entry; check valid numbers have been entered."); return; }
		
		/* step 2: gather data for analysis */
		var maData = getData(maTypesArray[currentMAType]); // get form data and inferential stats for individual studies
		//BOOKMARK: Cohen's d variants will need to run twice, once for d, once for unbiased d
		maData.fixedWeights = getFixedWeightSums(maData.dataSet); // get fixed weights
		maData.heterogeneity = getHeterogeneity(maData.fixedWeights, maData.df, maData.alpha); // get heterogeneity measures
		for (var i = 0; i < maData.dataSet.length; i++) { // for each study in the dataset, add in its random model variance and weight
			maData.dataSet[i].randomVariance = (1 / maData.dataSet[i].weight) + maData.heterogeneity.tSq; // random model variance
			maData.dataSet[i].randomWeight = 1 / maData.dataSet[i].randomVariance; // random model weight
		}
		maData.randomWeights = getRandomWeightSums(maData.dataSet); // get random weights
		
		/* step 3: meta-analysis calculations */
		maData.fixed = metaAnalyse(maData.fixedWeights, maData.alpha, maData.nullMean, maTypesArray[currentMAType]); // run the fixed model meta-analysis
		maData.random = metaAnalyse(maData.randomWeights, maData.alpha, maData.nullMean, maTypesArray[currentMAType]); // run the random model meta-analysis
		
		/* step 4: display meta-analysis results */
		$('#display *').detach(); // first clear the display
		for (var i=0; i<maData.dataSet.length; i++) { // loop through individual studies and display data
			$('#display').append("<div>Study " + (i+1) + "</div>");
			for (var j in maData.dataSet[i]) { $('#display div:last').append(" " + j + " = " + maData.dataSet[i][j].toFixed(3)); }
		}
		$('#display').append("<div>FIXED EFFECTS MODEL<br></div>"); for (var i in maData.fixed) { $('#display div:last').append(i + " = " + maData.fixed[i].toFixed(3) + " "); }
		$('#display').append("<div>RANDOM EFFECTS MODEL<br></div>"); for (var i in maData.random) { $('#display div:last').append(i + " = " + maData.random[i].toFixed(3) + " "); }
		$('#display').append("<div>HETEROGENEITY INFORMATION<br></div>"); for (var i in maData.heterogeneity) { $('#display div:last').append(i + " = " + maData.heterogeneity[i].toFixed(3) + "<br>"); }
		
		/* step 5: output data to csv in an <a> */
		var csv = "INDIVIDUAL STUDIES\n";
		for (var i in maData.dataSet[0]) { csv += i + ","; } csv += "\n";
		for (var i=0; i<maData.dataSet.length; i++) { for (var j in maData.dataSet[i]) { csv += maData.dataSet[i][j] + ","; } csv += "\n"; }
		csv += "FIXED EFFECTS MODEL\n";
		for (var i in maData.fixed) { csv += i + ","; } csv += "\n"; for (var i in maData.fixed) { csv += maData.fixed[i] + ","; }
		csv += "\nRANDOM EFFECTS MODEL\n";
		for (var i in maData.random) { csv += i + ","; } csv += "\n"; for (var i in maData.random) { csv += maData.random[i] + ","; }
		csv += "\nHETEROGENEITY INFORMATION\n"; for (var i in maData.heterogeneity) { csv += i + ","; } csv += "\n"; for (var i in maData.heterogeneity) { csv += maData.heterogeneity[i] + ","; }
		$('#display').append("<a id=\"download\">DOWNLOAD CSV</a>");
		$('#download').attr("href", "data:text/csv;charset=utf-8," + encodeURIComponent(csv));
		$('#download').attr("download", "myMetaAnalysis.csv");
	});

	// add the initial 2 study rows
	$('#add').click(); $('#add').click();

	// enable the 'run' button
	$('#run').prop('disabled', false);
});

// data entry check
function checkFormData() {
	var ok = true; // boolean to return
	if ($('#studies div').length < 2) { ok = false; return ok; } // if fewer than 2 studies, set flag to false and return
	$('#studies div').each(function(index) { // loop through the studies
		$(this).children('input').each(function(index) { // for each study's input data
			if (!$.isNumeric($(this).val())) { ok = false; } // if it's not a number, set flag to false
		});
	});
	return ok; // pass back value
}

// gather form data, calculate inferential stats for individual studies, and return these data in an object
function getData(maType) {
	var maData = {}; // object to hold meta-analysis data
	var studyData = {}; // an object for individual study data
	maData.k = $('#studies div').length; // number of studies
	maData.df = maData.k - 1; // degrees of freedom
	maData.ci = Number($('#ci').val()); // level of confidence
	maData.nullMean = Number($('#null').val()); // null hypothesis mean
	maData.alpha = (100 - maData.ci) / 100; // alpha
	maData.dataSet = []; // an array to hold the dataset; each item in the array is an object with one study's data
	$('#studies div').each(function(i) { // loop through each study
		$(this).children('input').each(function(j) { // loop through the entered data
			studyData[maType.dataFields[j].toLowerCase()] = Number($(this).val()); // store the input
		});
		// get the appropriate statistics depending on the type of meta-analysis
		switch (maType.name) {
			case "means":
				studyData.df = studyData.n-1; // degrees of freedom
				studyData.se = studyData.sd / Math.sqrt(studyData.n); // calculate standard error
				studyData.variance = studyData.se * studyData.se; // calculate variance
				studyData.t_crit = jStat.studentt.inv((1-(maData.alpha/2)), studyData.df); // calculate critical t value
				studyData.moe = studyData.t_crit * studyData.se; // calculate margin of error
				studyData.weight = 1 / studyData.variance; // calculate (fixed) study weight
				studyData.t = (studyData.m - maData.nullMean) / studyData.se; // calculate t value
				studyData.p = 2 * (1 - (jStat.studentt.cdf(Math.abs(studyData.t), studyData.df))); // calculate p value
				studyData.mid = studyData.m;
				break;
			case "meanDiffs":
				studyData.mDiff = studyData.m2 - studyData.m1; // calculate mean difference
				studyData.df = studyData.n1+studyData.n2-2; // degrees of freedom
				studyData.pooledSD = Math.sqrt(((studyData.n1-1)*Math.pow(studyData.sd1,2) + (studyData.n2-1)*Math.pow(studyData.sd2,2)) / studyData.df); // calculate pooled standard deviation
				studyData.varDiff = Math.pow(studyData.pooledSD,2) * ((1 / studyData.n1) + (1 / studyData.n2)); // calculate variance of the difference
				studyData.t_crit = jStat.studentt.inv((1-(maData.alpha/2)), studyData.df); // calculate critical t value
				studyData.moeDiff = studyData.t_crit * Math.sqrt(studyData.varDiff); // calculate margin of error of difference
				studyData.weight = 1 / studyData.varDiff; // calculate (fixed) study weight
				studyData.t = (studyData.mDiff - maData.nullMean) / Math.sqrt(studyData.varDiff); // calculate t value
				studyData.p = 2 * (1 - (jStat.studentt.cdf(Math.abs(studyData.t), studyData.df))); // calculate p value
				studyData.mid = studyData.mDiff;
				break;
			case "meanPairedDiffs":
				// NOT WORKING CURRENTLY
				studyData.mDiff = studyData.m2 - studyData.m1; // calculate mean difference
				studyData.df = studyData.n-1; // degrees of freedom
				studyData.sdDiff = Math.sqrt((studyData.mDiff*studyData.mDiff) / studyData.df); // calculate sd of the difference
				studyData.varDiff = Math.pow(studyData.sdDiff,2) * (1 / studyData.n); // calculate variance of the difference
				studyData.t_crit = jStat.studentt.inv((1-(maData.alpha/2)), studyData.df); // calculate critical t value
				studyData.moeDiff = studyData.t_crit * Math.sqrt(studyData.varDiff); // calculate margin of error of difference
				studyData.weight = 1 / studyData.varDiff; // calculate (fixed) study weight
				studyData.t = (studyData.mDiff - maData.nullMean) / Math.sqrt(studyData.varDiff); // calculate t value
				studyData.p = 2 * (1 - (jStat.studentt.cdf(Math.abs(studyData.t), studyData.df))); // calculate p value
				studyData.mid = studyData.mDiff;
				break;
			case "d":
				studyData.sqrtN = Math.sqrt(1/studyData.n); // square root of (1/N)
				studyData.ncp = studyData.d / studyData.sqrtN; // non-central parameter
				studyData.df = studyData.n-1; // degrees of freedom
				studyData.t_crit = jStat.studentt.inv((1-(maData.alpha/2)), studyData.df); // critical t
				studyData.ncpL = studyData.ncp - studyData.t_crit; // first guess for ncpL
				studyData.ncpU = studyData.ncp + studyData.t_crit; // first guess for ncpU
				studyData.ncpL = goalSeek({ Func: nonCentralT, aFuncParams: [studyData.ncp, studyData.ncpL, studyData.df], oFuncArgTarget: { Position: 1 }, Goal: (1-(maData.alpha/2)), Tol: 0.0000000001 }); // use goalSeek to find better ncpL
				studyData.ncpU = goalSeek({ Func: nonCentralT, aFuncParams: [studyData.ncp, studyData.ncpU, studyData.df], oFuncArgTarget: { Position: 1 }, Goal: (maData.alpha/2), Tol: 0.0000000001 }); // use goalSeek to find better ncpU
				studyData.dLL = studyData.ncpL * studyData.sqrtN; // lower limit of CI for the ES (either d or unbiased d; it doesn't change)
				studyData.dUL = studyData.ncpU * studyData.sqrtN; // upper limit of CI for the ES (either d or unbiased d; it doesn't change)
				studyData.dMod = Math.exp(jStat.gammaln(studyData.df/2)) / (Math.sqrt(studyData.df/2) * Math.exp(jStat.gammaln((studyData.df/2)-0.5))); // modifier for unbiased d
				studyData.dUnb = studyData.d * studyData.dMod; // unbiased d
				studyData.dMoeL = studyData.d - studyData.dLL; // lower margin of error for d
				studyData.dMoeU = studyData.dUL - studyData.d; // upper margin of error for d
				studyData.dUnbMoeL = studyData.dUnb - studyData.dLL; // lower margin of error for unbiased d
				studyData.dUnbMoeU = studyData.dUL - studyData.dUnb; // upper margin of error for unbiased d
				studyData.dVar = (1+(studyData.d*studyData.d)/2) / studyData.n; // calculate d variance
				studyData.dWeight = 1 / studyData.dVar; // calculate study weight when using d
				studyData.dUnbVar = studyData.dMod * studyData.dMod * (1+(studyData.d*studyData.d)/2) / studyData.n;// calculate unbiased d variance
				studyData.dUnbWeight = 1 / studyData.dUnbVar; // calculate study weight when using unbiased d
				studyData.t = (studyData.dUnb - maData.nullMean) / Math.sqrt(studyData.dUnbVar); // calculate t
				studyData.p = 2 * (1 - (jStat.studentt.cdf(Math.abs(studyData.t), studyData.df))); // calculate p value
				studyData.mid = studyData.d;
				break;
			case "dDiffs":
				studyData.sqrtN12 = Math.sqrt(1/studyData.n1 + 1/studyData.n2); // square root of (1/N1 + 1/N2)
				studyData.ncp = studyData.d / studyData.sqrtN12; // non-central parameter
				studyData.df = studyData.n1 + studyData.n2 - 2; // degrees of freedom
				studyData.t_crit = jStat.studentt.inv((1-(maData.alpha/2)), studyData.df); // critical t
				studyData.ncpL = studyData.ncp - studyData.t_crit; // first guess for ncpL
				studyData.ncpU = studyData.ncp + studyData.t_crit; // first guess for ncpU
				studyData.ncpL = goalSeek({ Func: nonCentralT, aFuncParams: [studyData.ncp, studyData.ncpL, studyData.df], oFuncArgTarget: { Position: 1 }, Goal: (1-(maData.alpha/2)), Tol: 0.0000000001 }); // use goalSeek to find better ncpL
				studyData.ncpU = goalSeek({ Func: nonCentralT, aFuncParams: [studyData.ncp, studyData.ncpU, studyData.df], oFuncArgTarget: { Position: 1 }, Goal: (maData.alpha/2), Tol: 0.0000000001 }); // use goalSeek to find better ncpU
				studyData.dLL = studyData.ncpL * studyData.sqrtN12; // lower limit of CI for the ES (either d or unbiased d; it doesn't change)
				studyData.dUL = studyData.ncpU * studyData.sqrtN12; // upper limit of CI for the ES (either d or unbiased d; it doesn't change)
				studyData.dMod = Math.exp(jStat.gammaln(studyData.df/2)) / (Math.sqrt(studyData.df/2) * Math.exp(jStat.gammaln((studyData.df/2)-0.5))); // modifier for unbiased d
				studyData.dUnb = studyData.d * studyData.dMod; // unbiased d
				studyData.dMoeL = studyData.d - studyData.dLL; // lower margin of error for d
				studyData.dMoeU = studyData.dUL - studyData.d; // upper margin of error for d
				studyData.dUnbMoeL = studyData.dUnb - studyData.dLL; // lower margin of error for unbiased d
				studyData.dUnbMoeU = studyData.dUL - studyData.dUnb; // upper margin of error for unbiased d
				studyData.dVar = (studyData.n1+studyData.n2) / (studyData.n1*studyData.n2) + (studyData.d*studyData.d) / (2 * (studyData.n1+studyData.n2)); // calculate d variance
				studyData.dWeight = 1 / studyData.dVar; // calculate study weight when using d
				studyData.dUnbVar = studyData.dMod * studyData.dMod * ((studyData.n1+studyData.n2) / (studyData.n1*studyData.n2) + (studyData.d*studyData.d) / (2 * (studyData.n1+studyData.n2))); // calculate unbiased d variance
				studyData.dUnbWeight = 1 / studyData.dUnbVar; // calculate study weight when using unbiased d
				studyData.t = (studyData.dUnb - maData.nullMean) / Math.sqrt((studyData.n1+studyData.n2) / (studyData.n1*studyData.n2) + (studyData.d*studyData.d) / (2*(studyData.n1+studyData.n2))); // calculate t
				studyData.p = 2 * (1 - (jStat.studentt.cdf(Math.abs(studyData.t), studyData.df))); // calculate p value
				studyData.mid = studyData.d;
				break;
			case "r":
				studyData.rZ = 0.5 * Math.log((1+studyData.r)/(1-studyData.r)); // z for r
				studyData.varZ = 1 / (studyData.n - 3); // var of z
				studyData.z = (studyData.rZ - maData.nullMean) / Math.sqrt(studyData.varZ); // z
				studyData.zLL = studyData.rZ - jStat.normal.inv((1-(maData.alpha/2)), 0, 1) * Math.sqrt(studyData.varZ); // z LL
				studyData.zUL = studyData.rZ + jStat.normal.inv((1-(maData.alpha/2)), 0, 1) * Math.sqrt(studyData.varZ); // z UL
				studyData.rLL = (Math.exp(2*studyData.zLL)-1) / (Math.exp(2*studyData.zLL)+1); // r LL
				studyData.rUL = (Math.exp(2*studyData.zUL)-1) / (Math.exp(2*studyData.zUL)+1); // r UL
				studyData.weight = 1 / studyData.varZ; // weight
				studyData.p = 2 * (1 - jStat.normal.cdf(Math.abs(studyData.z), 0, 1)); // p
				studyData.mid = studyData.rZ;
				break;
			default:
				break;
		}
		maData.dataSet[i] = Object.assign({}, studyData); // copy the study data into the meta-analysis dataSet array
	});
	return maData;
}

// calculate CIs using non-central t function
function nonCentralT(t, ncp, df) {
	var df2, tOverSqrtDF, pointSep, pointSepTmp, constant, i, nct;
	df2 = df - 1; // degrees of freedom - 1
	tOverSqrtDF = t / Math.sqrt(df); // t over square root of degrees of freedom
	pointSep = (Math.sqrt(df)+7)/100; // separation of points
	constant = Math.exp((2 - df) * 0.5 * Math.log(2) - jStat.gammaln(df/2)) * pointSep / 3; // constant
	// first term in cross product summation (df=0 has its own variant)
	if (df2 > 0) { nct = jStat.normal.cdf(0 * tOverSqrtDF - ncp, 0, 1) * Math.pow(0, df2) * Math.exp(-0.5 * 0 * 0); }
	else { nct = jStat.normal.cdf(0 * tOverSqrtDF - ncp, 0, 1) * Math.exp(-0.5 * 0 * 0); }
	// add second term with multiplier of 4
	nct += 4 * jStat.normal.cdf(pointSep * tOverSqrtDF - ncp, 0, 1) * Math.pow(pointSep, df2) * Math.exp(-0.5 * pointSep * pointSep);
	// loop to add 98 values
	for (i = 1; i < 50; i++) {
		pointSepTmp = 2 * i * pointSep;
		nct += 2 * jStat.normal.cdf(pointSepTmp * tOverSqrtDF - ncp, 0, 1) * Math.pow(pointSepTmp, df2) * Math.exp(-0.5 * pointSepTmp * pointSepTmp);
		pointSepTmp += pointSep;
		nct += 4 * jStat.normal.cdf(pointSepTmp * tOverSqrtDF - ncp, 0, 1) * Math.pow(pointSepTmp, df2) * Math.exp(-0.5 * pointSepTmp * pointSepTmp);
	}
	// add last term
	pointSepTmp += pointSep;
	nct += jStat.normal.cdf(pointSepTmp * tOverSqrtDF - ncp, 0, 1) * Math.pow(pointSepTmp, df2) * Math.exp(-0.5 * pointSepTmp * pointSepTmp);
	// multiply by the constant
	nct *= constant;
	return nct;
}

// calculate summed weights for fixed effects model, return as object of 4 values
function getFixedWeightSums(dataset) {
    var i, fixedWeights = { sumWeights:0, sumWeightsTimesMeans:0, sumWeightsTimesSquaredMeans:0, sumSquaredWeights:0 }; // create an object to hold the weight values
	// for each study, add the weight measures, resulting in summed weights
	for (i = 0; i < dataset.length; i++) {
		fixedWeights.sumWeights += dataset[i].weight;
		fixedWeights.sumWeightsTimesMeans += ( dataset[i].weight * dataset[i].mid );
		fixedWeights.sumWeightsTimesSquaredMeans += ( dataset[i].weight * ( dataset[i].mid * dataset[i].mid ) );
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
		randomWeights.sumWeightsTimesMeans += dataset[i].randomWeight * dataset[i].mid; // add study's weight * mean
		randomWeights.sumWeights += dataset[i].randomWeight; // add study's weight
	}
    return randomWeights; // pass back the data
}

// calculate meta-analysis, return as object of 8 values
function metaAnalyse(weights, alpha, nullMean, maType) {
	var maData = {}; // create an object to hold the meta-analysis data
	maData.mean = weights.sumWeightsTimesMeans / weights.sumWeights; // meta-analysed mean
	maData.variance = 1 / weights.sumWeights; // variance of meta-analysed mean
	maData.sd = Math.sqrt(maData.variance); // standard deviation of meta-analysed mean
	maData.moe = jStat.normal.inv((1-(alpha/2)), 0, 1) * maData.sd; // margin of error of meta-analysed mean
	maData.ll = maData.mean - maData.moe; // lower limit of 95% CI
	maData.ul = maData.mean + maData.moe; // upper limit of 95% CI
	maData.z = (maData.mean - nullMean) / maData.sd; // z value
	maData.p = 2 * (1 - (jStat.normal.cdf(Math.abs(maData.z), 0, 1))); // p value
	switch (maType.name) {
		case "r": // make some adjustments for Pearson correlation meta-analysis type
			maData.mean = (Math.exp(2*maData.mean)-1) / (Math.exp(2*maData.mean)+1); // M of r
			maData.rMOE = (Math.exp(2*maData.moe)-1) / (Math.exp(2*maData.moe)+1); // margin of error of r
			maData.ll = maData.mean - maData.rMOE; // lower limit of 95% CI of meta-analysed r
			maData.ul = maData.mean + maData.rMOE; // upper limit of 95% CI of meta-analysed r
			break;
		default:
			break;
	}
	return maData;
}