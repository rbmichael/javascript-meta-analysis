// run when document is fully loaded
$(function() {

	var maTypesArray = [], // array to hold the types of meta-analysis available
		currentMAType = 0, // current meta-analysis type; defaults to Single means meta-analysis
		i = 0, // counter
		j = 0; // another counter

 	// build an array of objects of the types of meta-analysis available
 	maTypesArray.push({ name:"means", description:"Single means", dataFields:["M","SD","N"] });
	maTypesArray.push({ name:"meanDiffs", description: "Difference between two independent group means", dataFields:["M1","SD1","N1","M2","SD2","N2"] });
	maTypesArray.push({ name:"meanPairedDiffs", description: "Difference between two dependent means", dataFields:["M1","SD1","M2","SD2","N"] });
	maTypesArray.push({ name:"d", description:"Cohen's d for a single group", dataFields:["d","N"] });
	maTypesArray.push({ name:"dDiffs", description:"Cohen's d between two independent groups", dataFields:["d","N1","N2"] });
	maTypesArray.push({ name:"r", description:"Pearson's r correlations", dataFields:["r","N"] });

	// populate the meta-analysis <select> element (for choosing a type of meta-analysis) from maTypesArray
	for (i = 0; i < maTypesArray.length; i++) {
		$('#maSelector').append("<option value=\"" + i + "\"" + ((i === currentMAType) ? "selected" : "") + ">" + maTypesArray[i].description + "</option>");
	}

	// set the meta-analysis type selector's change behaviour (remove studies and setup new form fields)
	$('#maSelector').change(function() {

		currentMAType = parseInt(this.value); // change current MA type to the selected option
		if (maTypesArray[currentMAType].name === "d" || maTypesArray[currentMAType].name === "dDiffs") { // show/hide he dUnbiased checkbox as necessary
			$('#dUnbiased').show();
		} else {
			$('#dUnbiased').hide();
		}
		$('#removeAll').click(); // remove everything and setup new form fields

	});

	// set the 'add a study' button behaviour
	$('#add').click(function() {

		var fields = maTypesArray[currentMAType].dataFields, // get the form fields
			html = "", // to hold the html for the study row
			i = 0; // counter

		$('#studies').append("<div></div>"); // add the html for a new study
		for (i = 0; i < fields.length; i++) { html += fields[i] + "<input type=\"number\"></input>"; } // form fields
		html += "<button class=\"remove\">remove</button>"; // remove study button
		$('#studies div:last').append(html); // update the container html
		$('#studies div:last .remove').click(function() { // add the remove button behaviour
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

		var csv = $('#csv').val(), // get the textarea input
			rows = csv.split('\n'), // split it into rows based on newline character
			data = [], // an array to hold the data arrays
			i = 0; // counter

		for (i = 0; i < rows.length; i++) { data[i] = rows[i].split(','); } // create an array of values from each row of data
		if (rows.length > 1) { // if there's a minimum of 2 studies, populate the form
			$('#studies *').detach(); // first remove all studies
			for (i = 0; i < data.length; i++) { // loop through data array adding study rows
				$('#add').click(); // add a row
				$('#studies div:last input').each(function(index) { // populate each input field with data
					$(this).val(data[i][index]);
				});
			}
		} else {  // if < 2 studies, send an error
			alert("Minimum of 2 studies (i.e., 2 csv rows) required.");
		}

	});

	// set the 'run' button behaviour
	$('#run').click(function() {

		var timeTaken = performance.now(), // records time taken to run the analysis
			maData = {}, // main meta-analysis data object
			i = 0, // counter
			j = 0, // counter
			csv = "", // for holding meta-analysis as csv
			csvLoop = [], // array of objects to loop through to output into the csv
			forestPlotConfig = {}, // for holding forest plot config information
			forestPlotData = []; // for holding forest plot data

		/* ---------- */
		/* step 1: check data entry, proceed if OK, else show an error and stop */
		/* ---------- */
		if (!checkFormData()) {
			alert("Error with data entry; check valid numbers have been entered.");
			return;
		}

		/* ---------- */
		/* step 2: gather data for analysis */
		/* ---------- */
		maData = getData(maTypesArray[currentMAType]); // get form data and inferential stats for individual studies
		maData.fixedWeights = getFixedWeightSums(maData.dataSet); // get fixed weights
		maData.heterogeneity = getHeterogeneity(maData.fixedWeights, maData.df, maData.alpha); // get heterogeneity measures
		for (i = 0; i < maData.dataSet.length; i++) { // for each study in the dataset, add in its random model variance and weight
			maData.dataSet[i].randomVariance = (1 / maData.dataSet[i].weight) + maData.heterogeneity.tSq; // random model variance
			maData.dataSet[i].randomWeight = 1 / maData.dataSet[i].randomVariance; // random model weight
		}
		maData.randomWeights = getRandomWeightSums(maData.dataSet); // get random weights

		/* ---------- */
		/* step 3: meta-analysis calculations */
		/* ---------- */
		maData.fixed = metaAnalyse(maData.fixedWeights, maData.alpha, maData.nullMean, maTypesArray[currentMAType]); // run the fixed model meta-analysis
		maData.random = metaAnalyse(maData.randomWeights, maData.alpha, maData.nullMean, maTypesArray[currentMAType]); // run the random model meta-analysis

		/* ---------- */
		/* step 4: display meta-analysis results */
		/* ---------- */
		$('#display *').detach(); // first clear the display
		/*
		for (i = 0; i < maData.dataSet.length; i++) { // loop through individual studies and display data
			$('#display').append("<div>Study " + (i + 1) + "</div>");
			for (j in maData.dataSet[i]) {
				$('#display div:last').append(" " + j + " = " + maData.dataSet[i][j].toFixed(3));
			}
		}
		$('#display').append("<div>FIXED EFFECTS MODEL<br></div>");
		for (i in maData.fixed) {
			$('#display div:last').append(i + " = " + maData.fixed[i].toFixed(3) + " ");
		}
		$('#display').append("<div>RANDOM EFFECTS MODEL<br></div>");
		for (i in maData.random) {
			$('#display div:last').append(i + " = " + maData.random[i].toFixed(3) + " ");
		}
		$('#display').append("<div>HETEROGENEITY INFORMATION<br></div>");
		for (i in maData.heterogeneity) {
			$('#display div:last').append(i + " = " + maData.heterogeneity[i].toFixed(3) + " ");
		}
		*/

		/* ---------- */
		/* step 5: output data to csv in an <a> */
		/* ---------- */
		csv = "INDIVIDUAL STUDIES\n"; // start with the individual studies
		for (i in maData.dataSet[0]) {
			csv += i + ",";
		}
		csv += "\n";
		for (i = 0; i < maData.dataSet.length; i++) {
			for (j in maData.dataSet[i]) {
				csv += maData.dataSet[i][j] + ",";
			}
			csv += "\n";
		}
		csvArray = [ // build an array to more conveniently loop through the rest of the information
			["FIXED EFFECTS MODEL", maData.fixed],
			["RANDOM EFFECTS MODEL", maData.random],
			["HETEROGENEITY INFORMATION", maData.heterogeneity],
			["FIXED WEIGHTS INFORMATION", maData.fixedWeights],
			["RANDOM WEIGHTS INFORMATION", maData.randomWeights]
		];
		for (i = 0; i < csvArray.length; i++) { // loop through the array and add the information
			csv += csvArray[i][0] + "\n";
			for (j in csvArray[i][1]) {
				csv += j + ",";
			}
			csv += "\n";
			for (j in csvArray[i][1]) {
				csv += csvArray[i][1][j] + ",";
			}
			csv += "\n";
		}
		$('#display').append("<a id=\"download\">Download data as CSV</a>");
		$('#download').attr("href", "data:text/csv;charset=utf-8," + encodeURIComponent(csv));
		$('#download').attr("download", "myMetaAnalysis.csv");

		/* ---------- */
		/* step 6: display the forest plot */
		/* ---------- */
		forestPlotConfig = { // forest plot configuration
			mountNode: '#forestPlot', // where to mount the plot
			vBar: maData.nullMean // vertical bar for the null hypothesis
		};
		forestPlotData.push({ // headings row
			description: "Meta-analysis Forest Plot",
			overrideLabel: "Mean (LL, UL)"
		});
		for (i = 0; i < maData.dataSet.length; i++) { // loop through studies, geting mean, ll, ul
			forestPlotData.push({ // add to the forest plot data variable
				description: "Study "+(i+1), // the study "name"
				descriptionOffset: 1, // indent the study name
				effect: {
					effect: maData.dataSet[i].mid, // the mean
					low: maData.dataSet[i].ll, // the lower limit
					high: maData.dataSet[i].ul // the upper limit
				},
				markerSize: (maData.dataSet[i].weight / maData.fixedWeights.sumWeights) // size of the study's square
			});
		}
		forestPlotData.push({ // add the fixed effects model data
			description:"Fixed effects model",
			effect: {
				effect: maData.fixed.mean,
				low: maData.fixed.ll,
				high: maData.fixed.ul
			},
			markerSize: 0.5
		});
		forestPlotData.push({ // add the random effects model data
			description:"Random effects model",
			effect: {
				effect: maData.random.mean,
				low: maData.random.ll,
				high: maData.random.ul
			},
			markerSize: 0.5
		});
		$('#display').append("<div id=\"forestPlot\"></div>"); // add a container for the forest plot
		forestPlot(forestPlotConfig, forestPlotData); // display the forest plot
		$('#display').append("<button id=\"save\">Save forest plot as PNG</button>"); // add a button to save the forest plot
		$('#save').click(function() { // set the button's behaviour
			saveSvgAsPng(d3.select('svg').node(), "myForestPlot.png"); // save the forest plot
		});

		/* ---------- */
		/* step 7: display the time taken to run the meta-analysis */
		/* ---------- */
		timeTaken = performance.now() - timeTaken; // calculate time taken to run meta-analysis
		$('#display').append("<div>Time taken to run analysis: " + timeTaken.toFixed(0) + "ms</div>"); // and display

	});

	// hide the dUnbiased checkbox
	$('#dUnbiased').hide();

	// add the initial 2 study rows
	$('#add').click();
	$('#add').click();

	// enable the 'run' button
	$('#run').prop('disabled', false);

});

// data entry check -- needs extending, barebones right now
function checkFormData() {

	var ok = true; // boolean
	
	if ($('#studies div').length < 2) { // if fewer than 2 studies, return false
		ok = false;
	}
	$('#studies div input').each(function() { // loop through all the inputs
		if (!$.isNumeric($(this).val())) { // if any are not a number, return false
			ok = false;
		}
	});
	
	return ok; // passed the checks, return true

}

// gather form data, calculate inferential stats for individual studies, and return these data in an object
function getData(maType) {

	var maData = {}, // an object to hold ALL the meta-analysis data
		studyData = {}; // an object for individual study data

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
		switch (maType.name) { // get the appropriate statistics depending on the type of meta-analysis
			case "means":
				studyData.df = studyData.n - 1; // degrees of freedom
				studyData.se = studyData.sd / Math.sqrt(studyData.n); // calculate standard error
				studyData.variance = studyData.se * studyData.se; // calculate variance
				studyData.t_crit = jStat.studentt.inv((1 - (maData.alpha / 2)), studyData.df); // calculate critical t value
				studyData.moe = studyData.t_crit * studyData.se; // calculate margin of error
				studyData.weight = 1 / studyData.variance; // calculate (fixed) study weight
				studyData.t = (studyData.m - maData.nullMean) / studyData.se; // calculate t value
				studyData.p = 2 * (1 - (jStat.studentt.cdf(Math.abs(studyData.t), studyData.df))); // calculate p value
				studyData.mid = studyData.m;
				studyData.ll = studyData.mid - studyData.moe;
				studyData.ul = studyData.mid + studyData.moe;
				break;
			case "meanDiffs":
				studyData.mDiff = studyData.m2 - studyData.m1; // calculate mean difference
				studyData.df = studyData.n1 + studyData.n2 - 2; // degrees of freedom
				studyData.pooledSD = Math.sqrt(((studyData.n1 - 1) * Math.pow(studyData.sd1, 2) + (studyData.n2 - 1) * Math.pow(studyData.sd2, 2)) / studyData.df); // calculate pooled standard deviation
				studyData.varDiff = Math.pow(studyData.pooledSD, 2) * ((1 / studyData.n1) + (1 / studyData.n2)); // calculate variance of the difference
				studyData.t_crit = jStat.studentt.inv((1 - (maData.alpha / 2)), studyData.df); // calculate critical t value
				studyData.moeDiff = studyData.t_crit * Math.sqrt(studyData.varDiff); // calculate margin of error of difference
				studyData.weight = 1 / studyData.varDiff; // calculate (fixed) study weight
				studyData.t = (studyData.mDiff - maData.nullMean) / Math.sqrt(studyData.varDiff); // calculate t value
				studyData.p = 2 * (1 - (jStat.studentt.cdf(Math.abs(studyData.t), studyData.df))); // calculate p value
				studyData.mid = studyData.mDiff;
				studyData.ll = studyData.mid - studyData.moeDiff;
				studyData.ul = studyData.mid + studyData.moeDiff;
				break;
			case "meanPairedDiffs":
				// NOT WORKING CURRENTLY
				studyData.mDiff = studyData.m2 - studyData.m1; // calculate mean difference
				studyData.df = studyData.n - 1; // degrees of freedom
				studyData.sdDiff = Math.sqrt((studyData.mDiff * studyData.mDiff) / studyData.df); // calculate sd of the difference
				studyData.varDiff = Math.pow(studyData.sdDiff, 2) * (1 / studyData.n); // calculate variance of the difference
				studyData.t_crit = jStat.studentt.inv((1 - (maData.alpha / 2)), studyData.df); // calculate critical t value
				studyData.moeDiff = studyData.t_crit * Math.sqrt(studyData.varDiff); // calculate margin of error of difference
				studyData.weight = 1 / studyData.varDiff; // calculate (fixed) study weight
				studyData.t = (studyData.mDiff - maData.nullMean) / Math.sqrt(studyData.varDiff); // calculate t value
				studyData.p = 2 * (1 - (jStat.studentt.cdf(Math.abs(studyData.t), studyData.df))); // calculate p value
				studyData.mid = studyData.mDiff;
				studyData.ll = studyData.mid - studyData.moeDiff;
				studyData.ul = studyData.mid + studyData.moeDiff;
				break;
			case "d":
				studyData.sqrtN = Math.sqrt(1 / studyData.n); // square root of (1/N)
				studyData.ncp = studyData.d / studyData.sqrtN; // non-central parameter
				studyData.df = studyData.n - 1; // degrees of freedom
				studyData.t_crit = jStat.studentt.inv((1 - (maData.alpha / 2)), studyData.df); // critical t
				studyData.ncpL = studyData.ncp - studyData.t_crit; // first guess for ncpL
				studyData.ncpU = studyData.ncp + studyData.t_crit; // first guess for ncpU
				studyData.ncpL = goalSeek({ Func: nonCentralT, aFuncParams: [studyData.ncp, studyData.ncpL, studyData.df], oFuncArgTarget: { Position: 1 }, Goal: (1 - (maData.alpha / 2)), Tol: 0.000001 }); // use goalSeek to find better ncpL
				studyData.ncpU = goalSeek({ Func: nonCentralT, aFuncParams: [studyData.ncp, studyData.ncpU, studyData.df], oFuncArgTarget: { Position: 1 }, Goal: (maData.alpha / 2), Tol: 0.000001 }); // use goalSeek to find better ncpU
				if (studyData.ncpL === undefined) { studyData.ncpL = studyData.ncp - studyData.t_crit; } // workaround for nonCentralT failing at high Ns
				if (studyData.ncpU === undefined) { studyData.ncpU = studyData.ncp + studyData.t_crit; } // workaround for nonCentralT failing at high Ns
				studyData.ll = studyData.ncpL * studyData.sqrtN; // lower limit of CI for the ES (either d or unbiased d; it doesn't change)
				studyData.ul = studyData.ncpU * studyData.sqrtN; // upper limit of CI for the ES (either d or unbiased d; it doesn't change)
				studyData.var = (1 + (studyData.d * studyData.d) / 2) / studyData.n; // calculate d variance
				studyData.weight = 1 / studyData.var; // calculate study weight when using d
				if ($('#dUnbiased input').prop("checked")) { // use dUnbiased values
					studyData.dMod = Math.exp(jStat.gammaln(studyData.df / 2)) / (Math.sqrt(studyData.df / 2) * Math.exp(jStat.gammaln((studyData.df / 2) - 0.5))); // modifier for unbiased d
					studyData.var = studyData.dMod * studyData.dMod * (1 + (studyData.d * studyData.d) / 2) / studyData.n;// changed variance to unbiased d variance
					studyData.d = studyData.d * studyData.dMod; // change d to unbiased d
					studyData.weight = 1 / studyData.var; // change weight to unbiased d weight
				}
				studyData.t = (studyData.d - maData.nullMean) / Math.sqrt(studyData.var); // calculate t
				studyData.p = 2 * (1 - (jStat.studentt.cdf(Math.abs(studyData.t), studyData.df))); // calculate p value
				studyData.mid = studyData.d;
				break;
			case "dDiffs":
				studyData.sqrtN12 = Math.sqrt(1 / studyData.n1 + 1 / studyData.n2); // square root of (1/N1 + 1/N2)
				studyData.ncp = studyData.d / studyData.sqrtN12; // non-central parameter
				studyData.df = studyData.n1 + studyData.n2 - 2; // degrees of freedom
				studyData.t_crit = jStat.studentt.inv((1 - (maData.alpha / 2)), studyData.df); // critical t
				studyData.ncpL = studyData.ncp - studyData.t_crit; // first guess for ncpL
				studyData.ncpU = studyData.ncp + studyData.t_crit; // first guess for ncpU
				studyData.ncpL = goalSeek({ Func: nonCentralT, aFuncParams: [studyData.ncp, studyData.ncpL, studyData.df], oFuncArgTarget: { Position: 1 }, Goal: (1 - (maData.alpha / 2)), Tol: 0.000001 }); // use goalSeek to find better ncpL
				studyData.ncpU = goalSeek({ Func: nonCentralT, aFuncParams: [studyData.ncp, studyData.ncpU, studyData.df], oFuncArgTarget: { Position: 1 }, Goal: (maData.alpha / 2), Tol: 0.000001 }); // use goalSeek to find better ncpU
				if (studyData.ncpL === undefined) { studyData.ncpL = studyData.ncp - studyData.t_crit; } // workaround for nonCentralT failing at high Ns
				if (studyData.ncpU === undefined) { studyData.ncpU = studyData.ncp + studyData.t_crit; } // workaround for nonCentralT failing at high Ns
				studyData.ll = studyData.ncpL * studyData.sqrtN12; // lower limit of CI for the ES (either d or unbiased d; it doesn't change)
				studyData.ul = studyData.ncpU * studyData.sqrtN12; // upper limit of CI for the ES (either d or unbiased d; it doesn't change)
				studyData.var = (studyData.n1 + studyData.n2) / (studyData.n1 * studyData.n2) + (studyData.d * studyData.d) / (2 * (studyData.n1 + studyData.n2)); // calculate d variance
				studyData.weight = 1 / studyData.var; // calculate study weight when using d
				if ($('#dUnbiased input').prop("checked")) { // use dUnbiased values
					studyData.dMod = Math.exp(jStat.gammaln(studyData.df / 2)) / (Math.sqrt(studyData.df / 2) * Math.exp(jStat.gammaln((studyData.df / 2) - 0.5))); // modifier for unbiased d
					studyData.var = studyData.dMod * studyData.dMod * ((studyData.n1 + studyData.n2) / (studyData.n1 * studyData.n2) + (studyData.d * studyData.d) / (2 * (studyData.n1 + studyData.n2))); // change variance to unbiased d variance
					studyData.d = studyData.d * studyData.dMod; // change d to unbiased d
					studyData.weight = 1 / studyData.var; // change weight to unbiased d weight
				}
				studyData.t = (studyData.d - maData.nullMean) / Math.sqrt((studyData.n1 + studyData.n2) / (studyData.n1 * studyData.n2) + (studyData.d * studyData.d) / (2 * (studyData.n1 + studyData.n2))); // calculate t
				studyData.p = 2 * (1 - (jStat.studentt.cdf(Math.abs(studyData.t), studyData.df))); // calculate p value
				studyData.mid = studyData.d;
				break;
			case "r":
				studyData.rZ = 0.5 * Math.log((1 + studyData.r) / (1 - studyData.r)); // z for r
				studyData.varZ = 1 / (studyData.n - 3); // var of z
				studyData.z = (studyData.rZ - maData.nullMean) / Math.sqrt(studyData.varZ); // z
				studyData.zLL = studyData.rZ - jStat.normal.inv((1 - (maData.alpha / 2)), 0, 1) * Math.sqrt(studyData.varZ); // z LL
				studyData.zUL = studyData.rZ + jStat.normal.inv((1 - (maData.alpha / 2)), 0, 1) * Math.sqrt(studyData.varZ); // z UL
				studyData.rLL = (Math.exp(2 * studyData.zLL) - 1) / (Math.exp(2 * studyData.zLL) + 1); // r LL
				studyData.rUL = (Math.exp(2 * studyData.zUL) - 1) / (Math.exp(2 * studyData.zUL) + 1); // r UL
				studyData.weight = 1 / studyData.varZ; // weight
				studyData.p = 2 * (1 - jStat.normal.cdf(Math.abs(studyData.z), 0, 1)); // p
				studyData.mid = studyData.rZ;
				studyData.ll = studyData.rLL;
				studyData.ul = studyData.rUL;
				break;
			default:
				break;
		}
		maData.dataSet[i] = Object.assign({}, studyData); // copy the study data into the meta-analysis dataSet array
	});

	return maData;

}

// calculate CIs using non-central t function -- needs work, failing at large values of N (d and dDiffs)
function nonCentralT(t, ncp, df) {

	var df2 = df - 1, // degrees of freedom - 1
		tOverSqrtDF = t / Math.sqrt(df), // t over square root of degrees of freedom
		pointSep = (Math.sqrt(df) + 7) / 100, // separation of points
		pointSepTmp = 0, // temporary value holder
		constant = Math.exp((2 - df) * 0.5 * Math.log(2) - jStat.gammaln(df / 2)) * pointSep / 3, // constant
		i = 0, // counter
		nct = 0; // non-central t

	if (df2 > 0) { // first term in cross product summation (df = 0 has its own variant)
		nct = jStat.normal.cdf(0 * tOverSqrtDF - ncp, 0, 1) * Math.pow(0, df2) * Math.exp(-0.5 * 0 * 0);
	} else {
		nct = jStat.normal.cdf(0 * tOverSqrtDF - ncp, 0, 1) * Math.exp(-0.5 * 0 * 0);
	}
	nct += 4 * jStat.normal.cdf(pointSep * tOverSqrtDF - ncp, 0, 1) * Math.pow(pointSep, df2) * Math.exp(-0.5 * pointSep * pointSep); // add second term with multiplier of 4
	for (i = 1; i < 50; i++) { // loop to add 98 values
		pointSepTmp = 2 * i * pointSep;
		nct += 2 * jStat.normal.cdf(pointSepTmp * tOverSqrtDF - ncp, 0, 1) * Math.pow(pointSepTmp, df2) * Math.exp(-0.5 * pointSepTmp * pointSepTmp);
		pointSepTmp += pointSep;
		nct += 4 * jStat.normal.cdf(pointSepTmp * tOverSqrtDF - ncp, 0, 1) * Math.pow(pointSepTmp, df2) * Math.exp(-0.5 * pointSepTmp * pointSepTmp);
	}
	pointSepTmp += pointSep; // add last term
	nct += jStat.normal.cdf(pointSepTmp * tOverSqrtDF - ncp, 0, 1) * Math.pow(pointSepTmp, df2) * Math.exp(-0.5 * pointSepTmp * pointSepTmp);
	nct *= constant; // multiply by the constant

	return nct;

}

// calculate summed weights for fixed effects model, return as object of 4 values
function getFixedWeightSums(dataset) {

	var	fixedWeights = { // object to hold the weights
			sumWeights:0,
			sumWeightsTimesMeans:0,
			sumWeightsTimesSquaredMeans:0, 
			sumSquaredWeights:0
		},
		i = 0; // counter
	
	for (i = 0; i < dataset.length; i++) { // for each study, add the weight measures, resulting in summed weights
		fixedWeights.sumWeights += dataset[i].weight;
		fixedWeights.sumWeightsTimesMeans += (dataset[i].weight * dataset[i].mid);
		fixedWeights.sumWeightsTimesSquaredMeans += (dataset[i].weight * (dataset[i].mid * dataset[i].mid));
		fixedWeights.sumSquaredWeights += (dataset[i].weight * dataset[i].weight);
	}

    return fixedWeights;

}

// calculate heterogeneity measures, return as object of 15 values
function getHeterogeneity(weights, df, alpha) {

	var het = {}; // heterogeneity object to return

    het.q = weights.sumWeightsTimesSquaredMeans - ((weights.sumWeightsTimesMeans * weights.sumWeightsTimesMeans) / weights.sumWeights); // Q
    het.c = weights.sumWeights - (weights.sumSquaredWeights / weights.sumWeights); // C
    het.tSq = (het.c === 0) ? 0 : (Math.max(0, ((het.q - df) / het.c ))); // Tau squared (minimum of 0)
    het.t = Math.sqrt(het.tSq); // Tau
    het.iSq = Math.max(0, ((het.q - df) / het.q)); // I Squared (minimum of 0)
    het.b1 = 0.5 * ((Math.log(het.q) - Math.log(df)) / (Math.sqrt(het.q * 2) - Math.sqrt((2 * df) - 1))); // B1
    het.b2 = (df > 1) ? Math.sqrt((1 / ((2 * (df - 1)) * (1 - (1 / (3 * ((df - 1) * (df - 1)))))))) : 0; // B2
    het.b = (het.q > (df + 1)) ? het.b1 : het.b2; // B
    het.l = Math.exp((0.5 * Math.log(het.q / df)) - (jStat.normal.inv((1 - (alpha / 2)), 0, 1) * het.b)); // L
    het.u = Math.exp((0.5 * Math.log(het.q / df)) + (jStat.normal.inv((1 - (alpha / 2)), 0, 1) * het.b)); // U
    het.lltSq = Math.max(0, ((df * ((het.l * het.l) - 1))) / het.c); // Lower 95% CI for Tau squared (minimum of 0)
    het.ultSq = Math.max(0, ((df * ((het.u * het.u) - 1))) / het.c); // Upper 95% CI for Tau squared (minimum of 0)
    het.llt = Math.sqrt(het.lltSq); // Lower 95% CI for Tau
    het.ult = Math.sqrt(het.ultSq); // Upper 95% CI for Tau
    het.p = 1 - jStat.chisquare.cdf(het.q, df); // p value

    return het;

}

// calculate summed weights for random effects model, return as object of 2 values
function getRandomWeightSums(dataset) {

	var randomWeights = { // object to hold weight sums
			sumWeights:0,
			sumWeightsTimesMeans:0
		},
		i = 0; // counter
	
	for (i = 0; i < dataset.length; i++) { // loop through each study
		randomWeights.sumWeights += dataset[i].randomWeight; // add study's weight
		randomWeights.sumWeightsTimesMeans += dataset[i].randomWeight * dataset[i].mid; // add study's weight * mean
	}

    return randomWeights; // pass back the data

}

// calculate meta-analysis, return as object
function metaAnalyse(weights, alpha, nullMean, maType) {

	var maData = {}; // create an object to hold the meta-analysis data

	maData.mean = weights.sumWeightsTimesMeans / weights.sumWeights; // meta-analysed mean
	maData.variance = 1 / weights.sumWeights; // variance of meta-analysed mean
	maData.sd = Math.sqrt(maData.variance); // standard deviation of meta-analysed mean
	maData.moe = jStat.normal.inv((1 - (alpha / 2)), 0, 1) * maData.sd; // margin of error of meta-analysed mean
	maData.ll = maData.mean - maData.moe; // lower limit of 95% CI
	maData.ul = maData.mean + maData.moe; // upper limit of 95% CI
	maData.z = (maData.mean - nullMean) / maData.sd; // z value
	maData.p = 2 * (1 - (jStat.normal.cdf(Math.abs(maData.z), 0, 1))); // p value
	switch (maType.name) {
		case "r": // make some adjustments for Pearson correlation meta-analysis type
			maData.mean = (Math.exp(2 * maData.mean) - 1) / (Math.exp(2 * maData.mean) + 1); // M of r
			maData.rMOE = (Math.exp(2 * maData.moe) - 1) / (Math.exp(2 * maData.moe) + 1); // margin of error of r
			maData.ll = maData.mean - maData.rMOE; // lower limit of 95% CI of meta-analysed r
			maData.ul = maData.mean + maData.rMOE; // upper limit of 95% CI of meta-analysed r
			break;
		default:
			break;
	}

	return maData;

}