$(function() {

	/* ----------------- */
	/* declare variables */
	/* ----------------- */
	var maTypesArray = [], // array to hold the types of meta-analysis available
		currentMAType = 0, // current meta-analysis type; defaults to Single means meta-analysis
		i = 0; // counter

	/* ------------------------------------------------------------------- */
 	/* build an array of objects of the types of meta-analysis available
 	/* dataRules is an array of values relating to each of the dataFields,
 	/* and specifies requirements for that field
 	/* (ALL must be numbers)
 	/*		0 = no extra rules
 	/*		1 = must be > 0,
 	/*		2 = must be a whole number and must be >= 2,
 	/*		3 = must be -1 < x < 1
	/* ------------------------------------------------------------------- */
 	maTypesArray.push({
 		name: "means",
 		description: "Single means",
 		dataFields: ["M", "SD", "N"],
 		dataRules: [0, 1, 2],
 		instructions: "Meta-analysis of single means. Requires the following from each study entered: Mean (M), Standard deviation (SD), and sample size (N)."
 	});
	maTypesArray.push({
		name: "meanDiffs",
		description: "Diff btwn 2 ind group means",
		dataFields: ["M1", "SD1", "N1", "M2", "SD2", "N2"],
		dataRules: [0, 1, 2, 0, 1, 2],
 		instructions: "Meta-analysis of the difference between two independent group means. Requires the following from each study entered: Mean Group 1 (M1), Standard deviation Group 1 (SD1), Sample size Group 1 (N1), Mean Group 2 (M2), Standard deviation Group 2 (SD2), Sample size Group 2 (N2)."
	});
	maTypesArray.push({
		name: "meanPairedDiffsT",
		description: "Diff btwn 2 dependent means (t known)",
		dataFields: ["M1", "M2", "N", "t"],
		dataRules: [0, 0, 2, 0],
 		instructions: "Meta-analysis of the difference between two dependent means. Requires the following from each study entered: Mean 1 (M1), Mean 2 (M2), Sample size (N), Paired t-test value (t)."
	});
	maTypesArray.push({
		name: "meanPairedDiffsP",
		description: "Diff btwn 2 dependent means (p known)",
		dataFields: ["M1", "M2", "N", "p"],
		dataRules: [0, 0, 2, 3],
 		instructions: "Meta-analysis of the difference between two dependent means. Requires the following from each study entered: Mean 1 (M1), Mean 2 (M2), Sample size (N), p value (p)."
	});
	maTypesArray.push({
		name: "meanPairedDiffsSD",
		description: "Diff btwn 2 dependent means (SD of diffs known)",
		dataFields: ["Mdiff", "SDdiff", "N"],
		dataRules: [0, 0, 2],
 		instructions: "Meta-analysis of the difference between two dependent means. Requires the following from each study entered: Mean difference (Mdiff), Standard deviation of the mean difference (SDdiff), Sample size (N)."
	});
	maTypesArray.push({
		name: "meanPairedDiffsSE",
		description: "Diff btwn 2 dependent means (SE of diffs known)",
		dataFields: ["Mdiff", "SEdiff", "N"],
		dataRules: [0, 0, 2],
 		instructions: "Meta-analysis of the difference between two dependent means. Requires the following from each study entered: Mean difference (Mdiff), Standard error of the mean difference (SEdiff), Sample size (N)."
	});
	maTypesArray.push({
		name:"d",
		description: "Cohen's d for a single group",
		dataFields: ["d", "N"],
		dataRules:[0, 2],
 		instructions: "Meta-analysis of Cohen's d for a single group. Requires the following from each study entered: Cohen's d (d), Sample size (N)."
	});
	maTypesArray.push({
		name: "dDiffs",
		description: "Cohen's d for 2 ind groups",
		dataFields: ["d", "N1", "N2"],
		dataRules: [0, 2, 2],
 		instructions: "Meta-analysis of the difference between Cohen's ds for two independent groups. Requires the following from each study entered: Cohen's d of the group difference (d), Sample size Group 1 (N1), Sample size Group 2 (N2)."
	});
	maTypesArray.push({
		name:"r",
		description: "Pearson's r single group",
		dataFields: ["r", "N"],
		dataRules:[3, 2],
 		instructions: "Meta-analysis of Pearson's r correlations for a single group. Requires the following from each study entered: Pearson's r correlation (r), Sample size (N)."
	});
	maTypesArray.push({
		name:"rDiffs",
		description: "Pearson's r diffs btwn 2 ind groups",
		dataFields: ["r1", "N1", "r2", "N2"],
		dataRules:[3, 2, 3, 2],
 		instructions: "Meta-analysis of differences between Pearson's r correlations for two independent groups. Requires the following from each study entered: Pearson's r correlation for Group 1 (r1), Sample size Group 1 (N1), Pearson's r correlation for Group 2 (r2), Sample size Group 2 (N2).<br>NOTE: Results are expressed in Z-scores (Fisher's z transformation)."
	});
	maTypesArray.push({
		name:"prop",
		description: "Single proportions",
		dataFields: ["x", "N"],
		dataRules:[0, 2],
 		instructions: "Meta-analysis of single proportions. Requires the following from each study entered: Number (x), Sample size (N); The proportion will be calculated as x/N."
	});
	maTypesArray.push({
		name:"propDiffs",
		description: "Diff btwn 2 ind proportions",
		dataFields: ["x1", "N1", "x2", "N2"],
		dataRules:[0, 2, 0, 2],
 		instructions: "Meta-analysis of difference between two independent proportions. Requires the following from each study entered: Number (x1), Sample size (N1), Number (x2), Sample size (N2); Proportions are calculated as x/N."
	});

	// populate the <select> element for choosing a type of meta-analysis from maTypesArray
	for (i = 0; i < maTypesArray.length; i++) {
		$('#maSelector').append("<option value=\"" + i + "\"" + ((i === currentMAType) ? "selected" : "") + ">" + maTypesArray[i].description + "</option>");
	}

	// set the meta-analysis type selector's change behaviour (remove studies and setup new form fields)
	$('#maSelector').change(function() {

		currentMAType = parseInt($(this).val()); // change current MA type to the selected option
		if (maTypesArray[currentMAType].name === "d" || maTypesArray[currentMAType].name === "dDiffs") { // show/hide the dUnbiased checkbox as necessary
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

		html += "<div>Study name: <input type=\"text\" value=\"\"></input>"; // optional study name field
		for (i = 0; i < fields.length; i++) { // form fields
			html += " " + fields[i] + ": <input type=\"number\"></input>";
		}
		html += " <button class=\"remove\">Remove</button></div>"; // remove study button
		$('#studies').append(html);
		$('#studies div:last .remove').click(function() { // add the remove button behaviour
			if ($('#studies div').length > 2) { // if 3+ studies, remove the row
				$(this).parent().detach();
			} else { // otherwise display a message
				alert("At least 2 studies are required.");
			}
		});

	});

	// set the 'remove all studies' button behaviour
	$('#removeAll').click(function() {

		$('#display *').detach(); // clear the display
		$('#errors *').detach(); // clear the errors
		$('#studies *').detach(); // remove all studies
		$('#instructions *').detach(); // clear previous instructions
		$('#instructions').append("<div>" + maTypesArray[currentMAType].instructions + "</div>"); // show instructions
		$('#add').click(); // add the 2 minimum study rows
		$('#add').click();

	});

	// set the csv -> form button behaviour 
	$('#csvToForm').click(function() {

		var csv = $('#csv').val(), // get the textarea input
			rows = csv.split('\n'), // split it into rows based on newline character
			data = [], // an array to hold the data arrays
			i = 0; // counter

		for (i = 0; i < rows.length; i++) { // create an array of values from each row of data
			data[i] = rows[i].split(',');
		}

		if (rows.length > 1) { // if there's a minimum of 2 rows, populate the form
			$('#studies *').detach(); // first remove all studies
			for (i = 0; i < data.length; i++) { // loop through data array adding study rows
				$('#add').click(); // add a row
				$('#studies div:last input').each(function(index) { // populate each input field with data
					if (index === 0) { // if we're on the study name field
						if ($.isNumeric(data[i][0])) { // is the data for that field a number? if so...
							data[i].unshift(""); // push a blank text field to the front of the array
						}
					}
					$(this).val(data[i][index]); // populate
				});
			}
		} else {  // if < 2 studies, send an error
			alert("Minimum of 2 studies (i.e., 2 csv rows) required.");
		}

	});

	// set the form -> csv button behaviour
	$('#formToCsv').click(function() {

		var csv = ""; // for updating the <textarea>

		$('#studies div').each(function(index) {
			if (index !== 0) {
				csv += "\n";
			}
			$(this).children('input').each(function(index) {
				csv += $(this).val() + ","; // add the value and a comma
			}); // loop through the inputs
			csv = csv.slice(0, -1); // remove the extraneous final comma
		}); // loop through the studies

		$('#csv').val(csv);

	});

	// set the csv -> forest plot button behaviour
	$('#csvToForest').click(function() {

		var csv = $('#csvForest').val(), // get the textarea input
			rows = csv.split('\n'), // split it into rows based on newline character
			data = [], // an array to hold the data arrays
			plotData = [], // reconfigured to object to pass to the forest plot function
			plotConfig = {}, // for forest plot configuration variables
			maxWeight = 0, // maximum study weight
			sumWeights = 0, // total study weights
			scale = 0, // for scaling plot box sizes
			i = 0, // counter
			j = 0; // counter
		for (i = 0; i < rows.length; i++) { // create an array of values from each row of data
			data[i] = rows[i].split(',');
			data[i][4] = data[i][4] || 0; // if no weight info, use zero
			for (j = 1; j < data[i].length; j++) { // convert all the values except study names to numbers
				data[i][j] = Number(data[i][j]);
			}
		}
		plotConfig = {
			mountNode: '#display', // where to mount the plot
			effectLabel: $('#esName').val() || "Effect", // effect size name
			vBar: Number($('#null').val()) || 0 // vertical bar for the null hypothesis
		}; // forest plot configuration
		plotData.push({
			description: "Meta-analysis Forest Plot",
			overrideLabel: "Mean (LL, UL)"
		}); // headings row
		plotData.push({
			description: " ",
			overrideLabel: " "
		}); // blank row
		for (i = 0; i < data.length; i++) {
			sumWeights += data[i][4];
			if (data[i][4] > maxWeight) {
				maxWeight = data[i][4];
			}
		} // loop through studies to find the maximum weight
		scale = 1 / (maxWeight / sumWeights); // set the marker re-scale multiplier based on study with maximum weight
		for (i = 0; i < data.length; i++) {
			plotData.push({
				description: data[i][0], // the study name
				descriptionOffset: 1, // indent the study name
				effect: {
					effect: data[i][1], // the mean
					low: data[i][2], // the lower limit
					high: data[i][3] // the upper limit
				},
				markerSize: ((data[i][4] / sumWeights) * scale) || 0.5 // size of the study's square (scaled accordingly)
			});
		} // loop through studies, adding to the forest plot data
		forestPlot(plotConfig, plotData);
		$('#display').append("<div><a href=\"#\" id=\"save\">Save forest plot as PNG</a></div>"); // add a button to save the forest plot
		$('#save').click(function() {
			saveSvgAsPng(d3.select('svg').node(), "myForestPlot.png"); // save the forest plot
		}); // setup the save-as-PNG link

	});

	// set the 'run' button behaviour
	$('#run').click(function() {

		/* ----- */
		/* setup */
		/* ----- */
		var timeTaken = performance.now(), // record time taken to produce the analysis
			config = {
				maType: maTypesArray[currentMAType].name || "means",
				ci: Number($('#ci').val()) || 95,
				nullMean: Number($('#null').val()) || 0
			}, // meta-analysis configuration
			data = [], // dataset to meta-analyse
			ma = {}, // meta-analysis data
			errorMsg = "", // for holding data entry error messages
			forestPlotConfig = {}, // for holding forest plot config information
			forestPlotData = [], // for holding forest plot data
			forestPlotMarkerScale = 0, // for re-scaling forest plot marker sizes
			maxWeight = 0, // for holding the maximum study weight
			csv = "", // hold the csv output
			csvArray = [], // array of csv information to loop through
			i = 0, // counter
			j = 0; // counter
		switch (config.maType) {
			case "d":
				config.maType = $('#dUnbiased input').prop("checked") ? "dUnb" : config.maType;
				break;
			case "dDiffs":
				config.maType = $('#dUnbiased input').prop("checked") ? "dUnbDiffs" : config.maType;
				break;
			default:
				break;
		} // switch Cohen's d analyses to Unbiased d if selected

		/* --------------------------------------------------------------- */
		/* check data entry, proceed if OK, otherwise show errors and stop */
		/* --------------------------------------------------------------- */
		errorMsg = checkFormData(maTypesArray[currentMAType].dataRules); // checkFormData returns "" if input meets all rules, otherwise returns error message(s)
		$('#errors *').detach(); // clear the error display
		if (errorMsg !== "") {
			$('#errors').append("<div>" + errorMsg + "</div>"); // show the error(s)
			return; // stop
		} // if errors were found, show them and halt

		/* --------------------------------- */
		/* gather data and run meta-analysis */
		/* --------------------------------- */
		$('#studies div').each(function(i) {
			data[i] = [];
			$(this).children('input[type="number"]').each(function(j) {
				data[i][j] = Number($(this).val());
			});
		});  // loop through each study, and put the data into an array
		ma = metaAnalysis(config, data); // run the meta-analysis

		/* ----------------------- */
		/* display the forest plot */
		/* ----------------------- */
		forestPlotConfig = {
			mountNode: '#forestPlot', // where to mount the plot
			effectLabel: $('#esName').val() || "Effect", // effect size name
			vBar: config.nullMean || 0 // vertical bar for the null hypothesis
		}; // forest plot configuration
		forestPlotData.push({
			description: "Meta-analysis Forest Plot",
			overrideLabel: "Mean (LL, UL)"
		}); // headings row
		forestPlotData.push({
			description: " ",
			overrideLabel: " "
		}); // blank row
		for (i = 0; i < ma.dataSet.length; i++) {
			if (ma.dataSet[i].weight > maxWeight) {
				maxWeight = ma.dataSet[i].weight;
			}
		} // loop through studies to find the maximum weight
		forestPlotMarkerScale = 1 / (maxWeight / ma.weightSums.fixed.sumWeights); // set the marker re-scale multiplier based on study with maximum weight
		for (i = 0; i < ma.dataSet.length; i++) {
			forestPlotData.push({
				description: $('#studies div input[type="text"]').eq(i).val() || "Study " + (i + 1), // the study name
				descriptionOffset: 1, // indent the study name
				effect: {
					effect: (ma.dataSet[i].r || ma.dataSet[i].prop || ma.dataSet[i].mid), // the mean ('mid' for all types except 'r' and 'prop')
					low: ma.dataSet[i].ll, // the lower limit
					high: ma.dataSet[i].ul // the upper limit
				},
				markerSize: ((ma.dataSet[i].weight / ma.weightSums.fixed.sumWeights) * forestPlotMarkerScale) // size of the study's square (scaled accordingly)
			});
		} // loop through studies, adding to the forest plot data
		forestPlotData.push({
			description: " ",
			overrideLabel: " "
		}); // blank row
		forestPlotData.push({
			description:"Fixed effects model",
			effect: {
				effect: ma.fixed.mean,
				low: ma.fixed.ll,
				high: ma.fixed.ul
			},
			markerSize: 0.5
		}); // fixed effects model data
		forestPlotData.push({
			description:"Random effects model",
			effect: {
				effect: ma.random.mean,
				low: ma.random.ll,
				high: ma.random.ul
			},
			markerSize: 0.5
		}); // random effects model data
		forestPlotData.push({
			description:"Model ratio: " + ma.heterogeneity.modelRatio.toFixed(2),
			overrideLabel: " "
		}); // add the model ratio measure of heterogeneity
		$('#display *').detach(); // clear the display
		$('#display').append("<hr><div id=\"forestPlot\"></div>"); // add a container for the forest plot
		forestPlot(forestPlotConfig, forestPlotData); // display the forest plot
		$('#display').append("<div><a href=\"#\" id=\"save\">Save forest plot as PNG</a></div>"); // add a button to save the forest plot
		$('#save').click(function() {
			saveSvgAsPng(d3.select('svg').node(), "myForestPlot.png"); // save the forest plot
		}); // setup the save-as-PNG link

		/* ---------------------------- */
		/* output data to csv in an <a> */
		/* ---------------------------- */
		csv = "INDIVIDUAL STUDIES\n"; // start with the individual studies
		for (i in ma.dataSet[0]) {
			csv += i + ",";
		}
		csv += "\n";
		for (i = 0; i < ma.dataSet.length; i++) {
			for (j in ma.dataSet[i]) {
				csv += ma.dataSet[i][j] + ",";
			}
			csv += "\n";
		}
		csvArray = [
			["FIXED EFFECTS MODEL", ma.fixed],
			["RANDOM EFFECTS MODEL", ma.random],
			["HETEROGENEITY INFORMATION", ma.heterogeneity],
			["FIXED WEIGHTS INFORMATION", ma.weightSums.fixed],
			["RANDOM WEIGHTS INFORMATION", ma.weightSums.random]
		]; // build an array to more conveniently loop through the rest of the information
		for (i = 0; i < csvArray.length; i++) {
			csv += csvArray[i][0] + "\n";
			for (j in csvArray[i][1]) {
				csv += j + ",";
			}
			csv += "\n";
			for (j in csvArray[i][1]) {
				csv += csvArray[i][1][j] + ",";
			}
			csv += "\n";
		} // loop through the array and add the information
		$('#display').append("<div><a id=\"download\">Download meta-analysis data as CSV</a></div>"); // add the download link
		$('#download').attr("href", "data:text/csv;charset=utf-8," + encodeURIComponent(csv)); // setup the download link
		$('#download').attr("download", "myMetaAnalysis.csv"); // setup the download link

		/* ----------------------------------------------- */
		/* display the time taken to run the meta-analysis */
		/* ----------------------------------------------- */
		timeTaken = performance.now() - timeTaken; // calculate time taken to run meta-analysis
		$('#display').append("<div>(Time taken to run analysis: " + timeTaken.toFixed(0) + "ms)</div><br><hr>"); // and display

	});

	$('#dUnbiased').hide(); // hide the dUnbiased checkbox
	$('#removeAll').click(); // reset and add the initial 2 study rows
	$('#run').prop('disabled', false); // enable the 'run' button

	// data entry check function
	function checkFormData(rules) {

		var errorMsg = ""; // error message to return
	
		$('#studies div').each(function(i) { // loop through each study
			$(this).children("input[type='number']").each(function(j) { // loop through all numeric inputs
				if (!$.isNumeric($(this).val())) { // if input is not a number (trumps remaining data checks)
					errorMsg += "Mandatory field " + (j + 1) + " in Study row " + (i + 1) + " is not a number.<br>";
				} else {
					switch(rules[j]) { // check if value meets the rules for that field
						case 0:
							break;
						case 1:
							if ($(this).val() <= 0) {
								errorMsg += "Mandatory field " + (j + 1) + " in Study row " + (i + 1) + " must be greater than zero.<br>";
							}
							break;
						case 2:
							if (($(this).val() % 1 !== 0) || ($(this).val() < 2)) {
								errorMsg += "Mandatory field " + (j + 1) + " in Study row " + (i + 1) + " must be a whole number and must be greater than or equal to two.<br>";
							}
							break;
						case 3:
							if (($(this).val() <= -1) || ($(this).val() >= 1)) {
								errorMsg += "Mandatory field " + (j + 1) + " in Study row " + (i + 1) + " must be between -1 and 1.<br>";
							}
							break;
						default:
							break;
					}
				}
			});
		});

		return errorMsg;

	}

});