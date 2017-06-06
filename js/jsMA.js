// run when document is fully loaded
$(function() {

	var maTypesArray = new Array(); // build an array of the types of meta-analysis available
	maTypesArray[0] = { name:"means", description:"Single means", dataFields:["M","SD","N"] };
	maTypesArray[1] = { name:"meanDiffs", description: "Difference between two independent group means", dataFields:["M1","SD1","N1","M2","SD2","N2"] };
	maTypesArray[2] = { name:"meanPairedDiffs", description: "Difference between two dependent means", dataFields:["M1","SD1","M2","SD2","N"] };
	maTypesArray[3] = { name:"d", description:"Cohen's d for a single group", dataFields:["d","N"] };
	maTypesArray[4] = { name:"dDiffs", description:"Cohen's d between two independent groups", dataFields:["d","N1","N2"] };
	maTypesArray[5] = { name:"r", description:"Pearson's r correlations", dataFields:["r","N"] };
	
	// add a <select> element for choosing a type of meta-analysis -- builds data entry fields when changed
	$('body').append("Select a type of meta-analysis: ");
	$('body').append("<select id=\"maSelector\">");
	for (var i=0; i<maTypesArray.length; i++) {
		$('#maSelector').append("<option value=\"" + i + "\">" + maTypesArray[i].description + "</option>");
	}
	$('body').append("<br>");
	$('body').append("<div id=\"maContainer\"></div>");
	
	// set the meta-analysis selector behaviour; display appropriate data entry fields
	//BOOKMARK
	$('#maSelector').change(function() {
		var i = parseInt(this.value); // selected option; maps back to maTypesArray
		$('#maContainer').detach(); // remove the ma display
		$('body').append("<div id=\"maContainer\"></div>"); // add it back
		$('#maContainer').append("<br>" + maTypesArray[i].description + "<br>"); // write the description
	});

	// set the 'add a study' button behaviour
	$('#add').click(function() {
		// add the html for a new study
		$('#studies').append("<div>" + "Cohen\'s d: <input type=\"number\" value=\"\"></input>" + "N<sub>1</sub>: <input type=\"number\" value=\"\"></input>" + "N<sub>2</sub>: <input type=\"number\" value=\"\"></input><button class=\"remove\">remove</button><br /></div>");
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
						case 0: // insert Cohen's d
							$(this).val(data[i][0]);
							break;
						case 1: // insert n group 1
							$(this).val(data[i][1]);
							break;
						case 2: // insert n group 2
							$(this).val(data[i][2]);
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
			- must have 2+ studies, with each having d, n1, n2 (Ns >= 2)
		*/
		var dataOK = checkData();
		if (!dataOK) { alert("Error with data entry. Each study must have two groups with: d, N1, N2 (min N = 2)."); return; }
		
		/* step 2: gather data for analysis */
		var maData = getData(); // get form data and inferential stats for individual studies
		maData.fixedWeightsD = getFixedWeightSums(maData.dataSet, "d"); // get fixed weights for d
		maData.fixedWeightsDUnb = getFixedWeightSums(maData.dataSet, "dUnb"); // get fixed weights for unbiased d
		maData.heterogeneityD = getHeterogeneity(maData.fixedWeightsD, maData.df, maData.alpha); // get heterogeneity measures for d
		maData.heterogeneityDUnb = getHeterogeneity(maData.fixedWeightsDUnb, maData.df, maData.alpha); // get heterogeneity measures for unbiased d
		for (var i = 0; i < maData.dataSet.length; i++) { // for each study in the dataset, add in its random model variance and weight
			maData.dataSet[i].randomVarianceD = (1 / maData.dataSet[i].dWeight) + maData.heterogeneityD.tSq; // random model variance for d
			maData.dataSet[i].randomWeightD = 1 / maData.dataSet[i].randomVarianceD; // random model weight for d
			maData.dataSet[i].randomVarianceDUnb = (1 / maData.dataSet[i].dUnbWeight) + maData.heterogeneityDUnb.tSq; // random model variance for unbiased d
			maData.dataSet[i].randomWeightDUnb = 1 / maData.dataSet[i].randomVarianceDUnb; // random model weight for unbiased d
		}
		maData.randomWeightsD = getRandomWeightSums(maData.dataSet, "d"); // get random weights for d
		maData.randomWeightsDUnb = getRandomWeightSums(maData.dataSet, "dUnb"); // get random weights for unbiased d
		
		/* step 3: meta-analysis calculations */
		maData.fixedD = metaAnalyse(maData.fixedWeightsD, maData.alpha, maData.nullMean); // run the fixed model meta-analysis for d
		maData.randomD = metaAnalyse(maData.randomWeightsD, maData.alpha, maData.nullMean); // run the random model meta-analysis for d
		maData.fixedDUnb = metaAnalyse(maData.fixedWeightsDUnb, maData.alpha, maData.nullMean); // run the fixed model meta-analysis for unbiased d
		maData.randomDUnb = metaAnalyse(maData.randomWeightsDUnb, maData.alpha, maData.nullMean); // run the random model meta-analysis for unbiased d
		
		/* step 4: display meta-analysis results */
		$('#display *').detach(); // first clear the display
		for (var i = 0; i < maData.dataSet.length; i++) { // then loop through each study and display its data
			$('#display').append("<div>Study #" + (i+1) + " d = " + maData.dataSet[i].d.toFixed(3) + " d<sub>Unbiased</sub> = " + maData.dataSet[i].dUnb.toFixed(3) + " dLL = " + maData.dataSet[i].dLL.toFixed(2) + " dUL = " + maData.dataSet[i].dUL.toFixed(2) + " dWeight = " + maData.dataSet[i].dWeight.toFixed(2) + " t = " + maData.dataSet[i].t.toFixed(2) + " p = " + maData.dataSet[i].p.toFixed(3) + "</div>");
		}
		displayModel(maData.fixedD, "FIXED (using d)"); // then display the fixed model for d
		displayModel(maData.fixedDUnb, "FIXED (using unbiased d)"); // then display the fixed model for unbiased d
		displayModel(maData.randomD, "RANDOM (using d)"); // then display the random model for d
		displayModel(maData.randomDUnb, "RANDOM (using unbiased d)"); // then display the random model for unbiased d
		// then display the heterogeneity information for d
		$('#display').append("<div>" + "HETEROGENEITY INFORMATION (for d)<br />" + " Q = " + maData.heterogeneityD.q.toFixed(2) + " C = " + maData.heterogeneityD.c.toFixed(2) + " Tau<sup>2</sup> = " + maData.heterogeneityD.tSq.toFixed(2) + " Tau = " + maData.heterogeneityD.t.toFixed(2) + " I<sup>2</sup> = " + (maData.heterogeneityD.iSq * 100).toFixed(2) + "%" + " B1 = " + maData.heterogeneityD.b1.toFixed(2) + " B2 = " + maData.heterogeneityD.b2.toFixed(2) + " L = " + maData.heterogeneityD.l.toFixed(2) + " U = " + maData.heterogeneityD.u.toFixed(2) + " LL Tau<sup>2</sup> = " + maData.heterogeneityD.lltSq.toFixed(2) + " UL Tau<sup>2</sup> = " + maData.heterogeneityD.ultSq.toFixed(2) + " LL Tau = " + maData.heterogeneityD.llt.toFixed(2) + " UL Tau = " + maData.heterogeneityD.ult.toFixed(2) + " p = " + maData.heterogeneityD.p.toFixed(3) + "</div>");
		// then display the heterogeneity information for unbiased d
		$('#display').append("<div>" + "HETEROGENEITY INFORMATION (for unbiased d)<br />" + " Q = " + maData.heterogeneityDUnb.q.toFixed(2) + " C = " + maData.heterogeneityDUnb.c.toFixed(2) + " Tau<sup>2</sup> = " + maData.heterogeneityDUnb.tSq.toFixed(2) + " Tau = " + maData.heterogeneityDUnb.t.toFixed(2) + " I<sup>2</sup> = " + (maData.heterogeneityDUnb.iSq * 100).toFixed(2) + "%" + " B1 = " + maData.heterogeneityDUnb.b1.toFixed(2) + " B2 = " + maData.heterogeneityDUnb.b2.toFixed(2) + " L = " + maData.heterogeneityDUnb.l.toFixed(2) + " U = " + maData.heterogeneityDUnb.u.toFixed(2) + " LL Tau<sup>2</sup> = " + maData.heterogeneityDUnb.lltSq.toFixed(2) + " UL Tau<sup>2</sup> = " + maData.heterogeneityDUnb.ultSq.toFixed(2) + " LL Tau = " + maData.heterogeneityDUnb.llt.toFixed(2) + " UL Tau = " + maData.heterogeneityDUnb.ult.toFixed(2) + " p = " + maData.heterogeneityDUnb.p.toFixed(3) + "</div>");
		
		/* step 5: output data to csv in an <a> */
		var csv = "INDIVIDUAL STUDIES\nStudy ID,d,Unbiased d,N 1,N 2,dLL,dUL,d Study Weight (fixed),Unbiased d Study Weight (fixed),t value,p value\n";
		for (var i = 0; i < maData.dataSet.length; i++) {
			csv += String(i+1) + "," + maData.dataSet[i].d + "," + maData.dataSet[i].dUnb + "," + maData.dataSet[i].n1 + "," + maData.dataSet[i].n2 + "," + maData.dataSet[i].dLL + "," + maData.dataSet[i].dUL + "," + maData.dataSet[i].dWeight + "," + maData.dataSet[i].dUnbWeight + "," + maData.dataSet[i].t + "," + maData.dataSet[i].p + "\n";
		}
		csv += "\nFIXED EFFECTS MODEL (d)\nMean,Standard Deviation,Variance,Margin of Error,Lower Limit CI,Upper Limit CI,z value,p value\n" + maData.fixedD.mean + "," + maData.fixedD.sd + "," + maData.fixedD.variance + "," + maData.fixedD.moe + "," + maData.fixedD.ll + "," + maData.fixedD.ul + "," + maData.fixedD.z + "," + maData.fixedD.p + "\n";
		csv += "\nFIXED EFFECTS MODEL (unbiased d)\nMean,Standard Deviation,Variance,Margin of Error,Lower Limit CI,Upper Limit CI,z value,p value\n" + maData.fixedDUnb.mean + "," + maData.fixedDUnb.sd + "," + maData.fixedDUnb.variance + "," + maData.fixedDUnb.moe + "," + maData.fixedDUnb.ll + "," + maData.fixedDUnb.ul + "," + maData.fixedDUnb.z + "," + maData.fixedDUnb.p + "\n";
		csv += "\nRANDOM EFFECTS MODEL (d)\nMean,Standard Deviation,Variance,Margin of Error,Lower Limit CI,Upper Limit CI,z value,p value\n" + maData.randomD.mean + "," + maData.randomD.sd + "," + maData.randomD.variance + "," + maData.randomD.moe + "," + maData.randomD.ll + "," + maData.randomD.ul + "," + maData.randomD.z + "," + maData.randomD.p + "\n";
		csv += "\nRANDOM EFFECTS MODEL (unbiased d)\nMean,Standard Deviation,Variance,Margin of Error,Lower Limit CI,Upper Limit CI,z value,p value\n" + maData.randomDUnb.mean + "," + maData.randomDUnb.sd + "," + maData.randomDUnb.variance + "," + maData.randomDUnb.moe + "," + maData.randomDUnb.ll + "," + maData.randomDUnb.ul + "," + maData.randomDUnb.z + "," + maData.randomDUnb.p + "\n";
		csv += "\nHETEROGENEITY INFORMATION (d)\nQ,C,Tau squared,Tau,I squared,B1,B2,L,U,Lower Limit CI Tau squared,Upper Limit CI Tau squared,Lower Limit CI Tau,Upper Limit CI Tau,p value\n" + maData.heterogeneityD.q + "," + maData.heterogeneityD.c + "," + maData.heterogeneityD.tSq + "," + maData.heterogeneityD.t + "," + maData.heterogeneityD.iSq + "," + maData.heterogeneityD.b1 + "," + maData.heterogeneityD.b2 + "," + maData.heterogeneityD.l + "," + maData.heterogeneityD.u + "," + maData.heterogeneityD.lltSq + "," + maData.heterogeneityD.ultSq + "," + maData.heterogeneityD.llt + "," + maData.heterogeneityD.ult + "," + maData.heterogeneityD.p + "\n";
		csv += "\nHETEROGENEITY INFORMATION (unbiased d)\nQ,C,Tau squared,Tau,I squared,B1,B2,L,U,Lower Limit CI Tau squared,Upper Limit CI Tau squared,Lower Limit CI Tau,Upper Limit CI Tau,p value\n" + maData.heterogeneityDUnb.q + "," + maData.heterogeneityDUnb.c + "," + maData.heterogeneityDUnb.tSq + "," + maData.heterogeneityDUnb.t + "," + maData.heterogeneityDUnb.iSq + "," + maData.heterogeneityDUnb.b1 + "," + maData.heterogeneityDUnb.b2 + "," + maData.heterogeneityDUnb.l + "," + maData.heterogeneityDUnb.u + "," + maData.heterogeneityDUnb.lltSq + "," + maData.heterogeneityDUnb.ultSq + "," + maData.heterogeneityDUnb.llt + "," + maData.heterogeneityDUnb.ult + "," + maData.heterogeneityDUnb.p + "\n";
		$('#display').append("<a id=\"download\">DOWNLOAD CSV</a>");
		$('#download').attr("href", "data:text/csv;charset=utf-8," + encodeURIComponent(csv));
		$('#download').attr("download", "myMetaAnalysis.csv");
	});

	// add the initial 2 study rows
	$('#add').click();
	$('#add').click();

	// enable the 'run' button
	$('#run').prop('disabled', false);

});

// data entry check: minimum 2 studies, each with d, n1, n2
function checkData() {
	var ok = true; // boolean to return
	if ($('#studies div').length < 2) { ok = false; return ok; } // if fewer than 2 studies, stop (should never happen)
	// loop through the studies
	$('#studies div').each(function(index) {
		$(this).children('input').each(function(index) { // for each study's input data
			switch(index) {
				case 0: // check Cohen's d
					if (!$.isNumeric($(this).val())) { ok = false; } // if d is not a number, set flag to false
					break;
				case 1: // check the group 1 N
					if ($.isNumeric($(this).val())) { // is N a number?
						if ($(this).val() < 2) { ok = false; } // if N is less than 2, set flag to false
						if (!(Math.round($(this).val()) === Number($(this).val()))) { ok = false; } // if N doesn't round to the same number as itself, set flag to false (N must be an integer)
					} else { ok = false; } // if N is not a number, set flag to false
					break;
				case 2: // check the group 2 N
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
	var targetP = maData.alpha / 2; // target p to converge on for calculating CIs on d
	var studyData = { d:null, n1:null, n2:null, dMod:null, dUnb:null, dVar:null, dUnbVar:null, df:null, ncp:null, sqrtN12:null, ncpL:null, ncpU:null, dLL:null, dUL:null, dMoeL:null, dMoeU:null, dUnbMoeL:null, dUnbMoeU:null, dWeight:null, dUnbWeight:null, t:null, p:null }; // an object for study data
	// loop through the studies
	$('#studies div').each(function(index) {
		// get each group's Cohen's d, N1, and N2
		$(this).children('input').each(function(index) {
			switch(index) {
				case 0:
					studyData.d = Number($(this).val()); // Cohen's d
					break;
				case 1:
					studyData.n1 = Number($(this).val()); // Group 1 N
					break;
				case 2:
					studyData.n2 = Number($(this).val()); // Group 2 N
					break;
				default:
					break;
			}
		});
		studyData.sqrtN12 = Math.sqrt(1/studyData.n1 + 1/studyData.n2); // square root of (1/N1 + 1/N2)
		studyData.ncp = studyData.d / studyData.sqrtN12; // non-central parameter
		studyData.df = studyData.n1 + studyData.n2 - 2; // study's degrees of freedom
		t_crit = jStat.studentt.inv((1-(maData.alpha/2)), studyData.df); // critical t
		studyData.ncpL = studyData.ncp - t_crit; // first guess for ncpL
		studyData.ncpU = studyData.ncp + t_crit; // first guess for ncpU
		studyData.ncpL = goalSeek({ Func: nonCentralT, aFuncParams: [studyData.ncp, studyData.ncpL, studyData.df], oFuncArgTarget: { Position: 1 }, Goal: (1-targetP), Tol: 0.0000000001 }); // use goalSeek to find better ncpL
		studyData.ncpU = goalSeek({ Func: nonCentralT, aFuncParams: [studyData.ncp, studyData.ncpU, studyData.df], oFuncArgTarget: { Position: 1 }, Goal: targetP, Tol: 0.0000000001 }); // use goalSeek to find better ncpU
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
		studyData.p = 2 * (1 - (jStat.studentt.cdf(Math.abs(studyData.t), (studyData.n1+studyData.n2-2)))); // calculate p value
		// add the study's data to the data array
		maData.dataSet[index] = { d:studyData.d, n1:studyData.n1, n2:studyData.n2, dMod:studyData.dMod, dUnb:studyData.dUnb, dVar:studyData.dVar, dUnbVar:studyData.dUnbVar, df:studyData.df, ncp:studyData.ncp, sqrtN12:studyData.sqrtN12, ncpL:studyData.ncpL, ncpU:studyData.ncpU, dLL:studyData.dLL, dUL:studyData.dUL, dMoeL:studyData.dMoeL, dMoeU:studyData.dMoeU, dUnbMoeL:studyData.dUnbMoeL, dUnbMoeU:studyData.dUnbMoeU, dWeight:studyData.dWeight, dUnbWeight:studyData.dUnbWeight, t:studyData.t, p:studyData.p, randomVarianceD:null, randomWeightD:null, randomVarianceDUnb:null, randomWeightDUnb:null };
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
function getFixedWeightSums(dataset, dType) {
    var i, fixedWeights = { sumWeights:0, sumWeightsTimesMeans:0, sumWeightsTimesSquaredMeans:0, sumSquaredWeights:0 }; // create an object to hold the weight values
    // determine which effect size's weights we're calculating (d or unbiased d)
    if (dType === "d") {
		// for each study, add the weight measures, resulting in summed weights
		for (i = 0; i < dataset.length; i++) {
			fixedWeights.sumWeights += dataset[i].dWeight;
			fixedWeights.sumWeightsTimesMeans += ( dataset[i].dWeight * dataset[i].d );
			fixedWeights.sumWeightsTimesSquaredMeans += ( dataset[i].dWeight * ( dataset[i].d * dataset[i].d ) );
			fixedWeights.sumSquaredWeights += ( dataset[i].dWeight * dataset[i].dWeight );
		}
    } else if (dType === "dUnb") {
		// for each study, add the weight measures, resulting in summed weights
		for (i = 0; i < dataset.length; i++) {
			fixedWeights.sumWeights += dataset[i].dUnbWeight;
			fixedWeights.sumWeightsTimesMeans += ( dataset[i].dUnbWeight * dataset[i].dUnb );
			fixedWeights.sumWeightsTimesSquaredMeans += ( dataset[i].dUnbWeight * ( dataset[i].dUnb * dataset[i].dUnb ) );
			fixedWeights.sumSquaredWeights += ( dataset[i].dUnbWeight * dataset[i].dUnbWeight );
		}
    } else { alert("Error."); }
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
function getRandomWeightSums(dataset, dType) {
    var randomWeights = { sumWeightsTimesMeans:0, sumWeights:0 }; // object to hold weight values (initially zero)
    // check whether calculating for d or unbiased d
    if (dType === "d") {
		for (var i=0;i<dataset.length;i++) { // loop through each study
			randomWeights.sumWeightsTimesMeans += dataset[i].randomWeightD * dataset[i].d; // add study's weight * mean difference
			randomWeights.sumWeights += dataset[i].randomWeightD; // add study's weight
		}
    } else if (dType === "dUnb") {
		for (var i=0;i<dataset.length;i++) { // loop through each study
			randomWeights.sumWeightsTimesMeans += dataset[i].randomWeightDUnb * dataset[i].dUnb; // add study's weight * mean difference
			randomWeights.sumWeights += dataset[i].randomWeightDUnb; // add study's weight
		}
    } else { alert("Error."); }
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
		+ "</div>"
	);
}