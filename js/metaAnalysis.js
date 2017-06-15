/*
	JavaScript Meta-Analysis

	Required arguments:
		OBJECT: Configuration {
			STRING: maType; Type of analysis (default "means"),
				SHOULD BE ONE OF THE FOLLOWING:
				"means" - For single means. Requires M, SD, N,
				"meanDiffs" - For difference between two independent group means. Requires M1, SD1, N1, M2, SD2, N2,
				"meanPairedDiffs" - For difference between two dependent means. Requires M1, SD1, M2, SD3, N, paired t value,
				"d" - Cohen's d for a single group. Requires d, N,
				"dDiffs" - Cohen's d for the difference between two independent groups. Requires d, N1, N2,
				"r" - Pearson's r correlations. Requires r, N
			STRING: esName; Effect size name (default "Effect"),
			NUMBER: ci; Confidence interval (default 95),
			NUMBER: nullMean; Null hypothesis value (default 0)
		},
		ARRAY: Dataset of studies (min length 2) [
			OBJECT: Individual study data {
				Variables (all of type NUMBER) named according to maType above
			}
		]

	Returns:
		OBJECT: ma; Meta-analysis data {
			ARRAY: dataSet; Dataset of studies [
				OBJECT: Individual study data {
					NUMBER: m; Point estimate (mean),
					NUMBER: ll; Lower limit CI,
					NUMBER: ul; Upper limit CI,
					NUMBER: t (or z); t (or z) score,
					NUMBER: p; p value
					NUMBER: variance; Variance
					NUMBER: weight; Weight (1 / variance)
					NUMBER: weightTimesMean; weight * m
					NUMBER: weightTimesSquaredMean; weight * m^2
					NUMBER: weightSquared; weight^2
					NUMBER: varianceRandom; Random model variance (weight + Tau^2)
					NUMBER: weightRandom; Random model weight (1 / varianceRandom)
					NUMBER: weightRandomTimesMean; weightRandom * m
				}
			],
			OBJECT: weightSums; Sums of study weights {
				OBJECT: fixed; Sums of fixed weights {
					NUMBER: sumWeights,
					NUMBER: sumWeightsTimesMeans,
					NUMBER: sumWeightsTimesSquaredMeans,
					NUMBER: sumSquaredWeights
				}
				OBJECT: random; Sums of random weights {
					NUMBER: sumWeights,
					NUMBER: sumWeightsTimesMeans,
				}
			},
			OBJECT: heterogeneity; Heterogeneity information {
				NUMBER: q; Q
				NUMBER: c; C
				NUMBER: tSq; Tau^2
				NUMBER: t; Tau
				NUMBER: iSq; I^2
				NUMBER: b1; B1
				NUMBER: b2; B2
				NUMBER: b; B (B1 or B2)
				NUMBER: l; L
				NUMBER: u; U
				NUMBER: lltSq; Lower Limit CI Tau^2
				NUMBER: ultSq; Upper Limit CI Tau^2
				NUMBER: llt; Lower Limit CI Tau
				NUMBER: ult; Upper Limit CI Tau
				NUMBER: p; p value for Q
				NUMBER: ratio; Ratio of random / fixed model CI lengths
			}
			OBJECT: fixed, random {
				NUMBER: mean;
				NUMBER: variance;
				NUMBER: sd;
				NUMBER: moe;
				NUMBER: ll;
				NUMBER: ul;
				NUMBER: z;
				NUMBER: p;
			}
		}
*/
(function() {

	this.metaAnalysis = function(config, dataSet) {

		var i = 0,
			ma = { // object to return
				dataSet: [],
				weightSums: {
					fixed: {},
					random: {}
				},
				heterogeneity: {},
				fixed: {},
				random: {}
			};

		config = { // setup
			maType: config.maType || "means",
			esName: config.esName || "Effect",
			ci: config.ci || 95,
			nullMean: config.nullMean || 0
		};
		config.alpha = (100 - config.ci) / 100;

		ma.dataSet = getData(config.maType, config.alpha, config.nullMean, dataSet);
		ma.weightSums.fixed = sumWeights("fixed", ma.dataSet);
		ma.heterogeneity = getHeterogeneity(ma.weightSums.fixed, dataSet.length-1, config.alpha);
		for (i = 0; i < ma.dataSet.length; i++) { // for each study in the dataset, add in its random model variance and weight
			ma.dataSet[i].randomVariance = (1 / ma.dataSet[i].weight) + ma.heterogeneity.tSq; // random model variance
			ma.dataSet[i].randomWeight = 1 / ma.dataSet[i].randomVariance; // random model weight
		}
		ma.weightSums.random = sumWeights("random", ma.dataSet); // get random weights
		ma.fixed = metaAnalyse(ma.weightSums.fixed, config.alpha, config.nullMean, config.maType); // run the fixed model meta-analysis
		ma.random = metaAnalyse(ma.weightSums.random, config.alpha, config.nullMean, config.maType); // run the random model meta-analysis
		ma.heterogeneity.modelRatio = (ma.random.ul - ma.random.ll) / (ma.fixed.ul - ma.fixed.ll); // get the ratio of the random model CI to the fixed model CI as a measure of heterogeneity

		return ma;
	};
	
	function getData(maType, alpha, nullMean, dataIn) {

		var i = 0, // counter
			j = 0, // counter
			study = {}, // hold a single study
			dataOut = []; // dataset to return

		for (i = 0; i < dataIn.length; i++) { // loop through the studies
			switch (maType) { // get the appropriate statistics depending on the type of meta-analysis
				case "means":
					study.m = dataIn[i][0];
					study.sd = dataIn[i][1];
					study.n = dataIn[i][2];
					study.df = study.n - 1; // degrees of freedom
					study.variance = Math.pow(study.sd, 2) / study.n; // variance
					study.weight = 1 / study.variance; // study weight
					study.t = jStat.tscore(study.m, nullMean, study.sd, study.n); // t score
					study.p = jStat.ttest(study.t, study.n); // p value
					study.ci = jStat.tci(study.m, alpha, study.sd, study.n); // confidence interval
					study.ll = study.ci[0]; // lower limit CI
					study.ul = study.ci[1]; // upper limit CI
					study.mid = study.m; // for later weight calculations
					break;
				case "meanDiffs":
					study.m1 = dataIn[i][0];
					study.sd1 = dataIn[i][1];
					study.n1 = dataIn[i][2];
					study.m2 = dataIn[i][3];
					study.sd2 = dataIn[i][4];
					study.n2 = dataIn[i][5];
					study.mDiff = study.m2 - study.m1; // mean difference
					study.df = study.n1 + study.n2 - 2; // degrees of freedom
					study.sd = Math.sqrt(((study.n1 - 1) * Math.pow(study.sd1, 2) + (study.n2 - 1) * Math.pow(study.sd2, 2)) / study.df); // pooled standard deviation
					study.variance = Math.pow(study.sd, 2) * ((1 / study.n1) + (1 / study.n2)); // variance of the difference
					study.t_crit = jStat.studentt.inv((1 - (alpha / 2)), study.df); // critical t value
					study.moe = study.t_crit * Math.sqrt(study.variance); // margin of error of difference
					study.weight = 1 / study.variance; // study weight
					study.t = (study.mDiff - nullMean) / Math.sqrt(study.variance); // t score
					study.p = 2 * (1 - (jStat.studentt.cdf(Math.abs(study.t), study.df))); // p value
					study.ll = study.mDiff - study.moe; // lower limit CI
					study.ul = study.mDiff + study.moe; // upper limit CI
					study.mid = study.mDiff; // for later weight calculation
					break;
				case "meanPairedDiffs":
					study.m1 = dataIn[i][0];
					study.sd1 = dataIn[i][1];
					study.m2 = dataIn[i][2];
					study.sd2 = dataIn[i][3];
					study.n = dataIn[i][4];
					study.t = dataIn[i][5];
					study.mDiff = study.m2 - study.m1; // calculate mean difference
					study.df = study.n - 1; // degrees of freedom
					study.t_crit = jStat.studentt.inv((1 - (alpha / 2)), study.df); // calculate critical t value
					study.se = Math.abs(study.mDiff - nullMean) * (1 / study.t); // standard error calculated from known paired t value
					study.variance = Math.pow(study.se, 2); // variance
					study.moe = study.t_crit * study.se; // calculate margin of error
					study.weight = 1 / study.variance; // study weight
					study.p = 2 * (1 - (jStat.studentt.cdf(Math.abs(study.t), study.df))); // calculate p value
					study.mid = study.mDiff; // for later weight calculation
					study.ll = study.mid - study.moe; // lower limit 95% CI
					study.ul = study.mid + study.moe; // upper limit 95% CI
					break;
				case "d":
					study.d = dataIn[i][0];
					study.n = dataIn[i][1];
					study.sqrtN = Math.sqrt(1 / study.n); // square root of (1/N)
					study.ncp = study.d / study.sqrtN; // non-central parameter
					study.df = study.n - 1; // degrees of freedom
					study.t_crit = jStat.studentt.inv((1 - (alpha / 2)), study.df); // critical t
					study.ncpL = study.ncp - study.t_crit; // first guess for ncpL
					study.ncpU = study.ncp + study.t_crit; // first guess for ncpU
					study.ncpL = goalSeek({ Func: nonCentralT, aFuncParams: [study.ncp, study.ncpL, study.df], oFuncArgTarget: { Position: 1 }, Goal: (1 - (alpha / 2)), Tol: 0.000001 }); // use goalSeek to find better ncpL
					study.ncpU = goalSeek({ Func: nonCentralT, aFuncParams: [study.ncp, study.ncpU, study.df], oFuncArgTarget: { Position: 1 }, Goal: (alpha / 2), Tol: 0.000001 }); // use goalSeek to find better ncpU
					if (study.ncpL === undefined) { study.ncpL = study.ncp - study.t_crit; } // workaround for nonCentralT failing at high Ns
					if (study.ncpU === undefined) { study.ncpU = study.ncp + study.t_crit; } // workaround for nonCentralT failing at high Ns
					study.ll = study.ncpL * study.sqrtN; // lower limit of CI for the ES (either d or unbiased d; it doesn't change)
					study.ul = study.ncpU * study.sqrtN; // upper limit of CI for the ES (either d or unbiased d; it doesn't change)
					study.variance = (1 + (Math.pow(study.d, 2)) / 2) / study.n; // calculate d variance
					study.weight = 1 / study.variance; // calculate study weight when using d
					study.t = jStat.tscore(study.d, nullMean, Math.sqrt(study.variance * study.n), study.n) // t score
					study.p = jStat.ttest(study.t, study.n); // p value
					study.mid = study.d; // for later weight calculation
					break;
				case "dUnb":
					study.d = dataIn[i][0];
					study.n = dataIn[i][1];
					study.sqrtN = Math.sqrt(1 / study.n); // square root of (1/N)
					study.ncp = study.d / study.sqrtN; // non-central parameter
					study.df = study.n - 1; // degrees of freedom
					study.t_crit = jStat.studentt.inv((1 - (alpha / 2)), study.df); // critical t
					study.ncpL = study.ncp - study.t_crit; // first guess for ncpL
					study.ncpU = study.ncp + study.t_crit; // first guess for ncpU
					study.ncpL = goalSeek({ Func: nonCentralT, aFuncParams: [study.ncp, study.ncpL, study.df], oFuncArgTarget: { Position: 1 }, Goal: (1 - (alpha / 2)), Tol: 0.000001 }); // use goalSeek to find better ncpL
					study.ncpU = goalSeek({ Func: nonCentralT, aFuncParams: [study.ncp, study.ncpU, study.df], oFuncArgTarget: { Position: 1 }, Goal: (alpha / 2), Tol: 0.000001 }); // use goalSeek to find better ncpU
					if (study.ncpL === undefined) { study.ncpL = study.ncp - study.t_crit; } // workaround for nonCentralT failing at high Ns
					if (study.ncpU === undefined) { study.ncpU = study.ncp + study.t_crit; } // workaround for nonCentralT failing at high Ns
					study.ll = study.ncpL * study.sqrtN; // lower limit of CI for the ES (either d or unbiased d; it doesn't change)
					study.ul = study.ncpU * study.sqrtN; // upper limit of CI for the ES (either d or unbiased d; it doesn't change)
					study.dMod = Math.exp(jStat.gammaln(study.df / 2)) / (Math.sqrt(study.df / 2) * Math.exp(jStat.gammaln((study.df / 2) - 0.5))); // modifier for unbiased d
					study.variance = Math.pow(study.dMod, 2) * (1 + (Math.pow(study.d, 2)) / 2) / study.n; // changed variance to unbiased d variance
					study.d = study.d * study.dMod; // change d to unbiased d
					study.weight = 1 / study.variance; // change weight to unbiased d weight
					study.t = jStat.tscore(study.d, nullMean, Math.sqrt(study.variance * study.n), study.n) // t score
					study.p = jStat.ttest(study.t, study.n); // p value
					study.mid = study.d; // for later weight calculation
					break;
				case "dDiffs":
					study.d = dataIn[i][0];
					study.n1 = dataIn[i][1];
					study.n2 = dataIn[i][2];
					study.sqrtN12 = Math.sqrt(1 / study.n1 + 1 / study.n2); // square root of (1/N1 + 1/N2)
					study.ncp = study.d / study.sqrtN12; // non-central parameter
					study.df = study.n1 + study.n2 - 2; // degrees of freedom
					study.t_crit = jStat.studentt.inv((1 - (alpha / 2)), study.df); // critical t
					study.ncpL = study.ncp - study.t_crit; // first guess for ncpL
					study.ncpU = study.ncp + study.t_crit; // first guess for ncpU
					study.ncpL = goalSeek({ Func: nonCentralT, aFuncParams: [study.ncp, study.ncpL, study.df], oFuncArgTarget: { Position: 1 }, Goal: (1 - (alpha / 2)), Tol: 0.000001 }); // use goalSeek to find better ncpL
					study.ncpU = goalSeek({ Func: nonCentralT, aFuncParams: [study.ncp, study.ncpU, study.df], oFuncArgTarget: { Position: 1 }, Goal: (alpha / 2), Tol: 0.000001 }); // use goalSeek to find better ncpU
					if (study.ncpL === undefined) { study.ncpL = study.ncp - study.t_crit; } // workaround for nonCentralT failing at high Ns
					if (study.ncpU === undefined) { study.ncpU = study.ncp + study.t_crit; } // workaround for nonCentralT failing at high Ns
					study.ll = study.ncpL * study.sqrtN12; // lower limit of CI for the ES (either d or unbiased d; it doesn't change)
					study.ul = study.ncpU * study.sqrtN12; // upper limit of CI for the ES (either d or unbiased d; it doesn't change)
					study.variance = (study.n1 + study.n2) / (study.n1 * study.n2) + (Math.pow(study.d, 2)) / (2 * (study.n1 + study.n2)); // calculate d variance
					study.weight = 1 / study.variance; // calculate study weight when using d
					study.t = (study.d - nullMean) / Math.sqrt((study.n1 + study.n2) / (study.n1 * study.n2) + (Math.pow(study.d, 2)) / (2 * (study.n1 + study.n2))); // calculate t
					study.p = 2 * (1 - (jStat.studentt.cdf(Math.abs(study.t), study.df))); // calculate p value
					study.mid = study.d; // for later weight calculation
					break;
				case "dUnbDiffs":
					study.d = dataIn[i][0];
					study.n1 = dataIn[i][1];
					study.n2 = dataIn[i][2];
					study.sqrtN12 = Math.sqrt(1 / study.n1 + 1 / study.n2); // square root of (1/N1 + 1/N2)
					study.ncp = study.d / study.sqrtN12; // non-central parameter
					study.df = study.n1 + study.n2 - 2; // degrees of freedom
					study.t_crit = jStat.studentt.inv((1 - (alpha / 2)), study.df); // critical t
					study.ncpL = study.ncp - study.t_crit; // first guess for ncpL
					study.ncpU = study.ncp + study.t_crit; // first guess for ncpU
					study.ncpL = goalSeek({ Func: nonCentralT, aFuncParams: [study.ncp, study.ncpL, study.df], oFuncArgTarget: { Position: 1 }, Goal: (1 - (alpha / 2)), Tol: 0.000001 }); // use goalSeek to find better ncpL
					study.ncpU = goalSeek({ Func: nonCentralT, aFuncParams: [study.ncp, study.ncpU, study.df], oFuncArgTarget: { Position: 1 }, Goal: (alpha / 2), Tol: 0.000001 }); // use goalSeek to find better ncpU
					if (study.ncpL === undefined) { study.ncpL = study.ncp - study.t_crit; } // workaround for nonCentralT failing at high Ns
					if (study.ncpU === undefined) { study.ncpU = study.ncp + study.t_crit; } // workaround for nonCentralT failing at high Ns
					study.ll = study.ncpL * study.sqrtN12; // lower limit of CI for the ES (either d or unbiased d; it doesn't change)
					study.ul = study.ncpU * study.sqrtN12; // upper limit of CI for the ES (either d or unbiased d; it doesn't change)
					study.dMod = Math.exp(jStat.gammaln(study.df / 2)) / (Math.sqrt(study.df / 2) * Math.exp(jStat.gammaln((study.df / 2) - 0.5))); // modifier for unbiased d
					study.variance = Math.pow(study.dMod, 2) * ((study.n1 + study.n2) / (study.n1 * study.n2) + (Math.pow(study.d, 2)) / (2 * (study.n1 + study.n2))); // change variance to unbiased d variance
					study.d = study.d * study.dMod; // change d to unbiased d
					study.weight = 1 / study.variance; // change weight to unbiased d weight
					study.t = (study.d - nullMean) / Math.sqrt((study.n1 + study.n2) / (study.n1 * study.n2) + (Math.pow(study.d, 2)) / (2 * (study.n1 + study.n2))); // calculate t
					study.p = 2 * (1 - (jStat.studentt.cdf(Math.abs(study.t), study.df))); // calculate p value
					study.mid = study.d; // for later weight calculation
					break;
				case "r":
					study.r = dataIn[i][0];
					study.n = dataIn[i][1];
					study.rZ = 0.5 * Math.log((1 + study.r) / (1 - study.r)); // z for r
					study.varZ = 1 / (study.n - 3); // var of z
					study.zLL = study.rZ - jStat.normal.inv((1 - (alpha / 2)), 0, 1) * Math.sqrt(study.varZ); // z LL
					study.zUL = study.rZ + jStat.normal.inv((1 - (alpha / 2)), 0, 1) * Math.sqrt(study.varZ); // z UL
					study.rLL = (Math.exp(2 * study.zLL) - 1) / (Math.exp(2 * study.zLL) + 1); // r LL
					study.rUL = (Math.exp(2 * study.zUL) - 1) / (Math.exp(2 * study.zUL) + 1); // r UL
					study.weight = 1 / study.varZ; // weight
					study.z = jStat.zscore(study.rZ, nullMean, Math.sqrt(study.varZ)) // z score
					study.p = jStat.ztest(study.z); // p value
					study.mid = study.rZ; // for later weight calculation
					study.ll = study.rLL; // lower limit CI
					study.ul = study.rUL; // upper limit CI
					break;
				default:
					break;
			}
			study.weightTimesMean = study.weight * study.mid;
			study.weightTimesSquaredMean = study.weight * Math.pow(study.mid, 2);
			study.weightSquared = Math.pow(study.weight, 2);
			dataOut[i] = Object.assign({}, study); // copy the study data into the dataset
		}

		return dataOut;

	}

	function sumWeights(type, dataSet) {

		var i = 0, // counter
			sums = { // object to return
				sumWeights: 0,
				sumWeightsTimesMeans: 0,
			};

		switch (type) {
			case "fixed":
				sums.sumWeightsTimesSquaredMeans = 0;
				sums.sumSquaredWeights = 0;
				for (i = 0; i < dataSet.length; i++) {
					sums.sumWeights += dataSet[i].weight;
					sums.sumWeightsTimesMeans += dataSet[i].weightTimesMean;
					sums.sumWeightsTimesSquaredMeans += dataSet[i].weightTimesSquaredMean;
					sums.sumSquaredWeights += dataSet[i].weightSquared;
				}
				break;
			case "random":
				for (i = 0; i < dataSet.length; i++) {
					sums.sumWeights += dataSet[i].randomWeight;
					sums.sumWeightsTimesMeans += dataSet[i].randomWeight * dataSet[i].mid;
				}
				break;
			default:
				break;
		}

		return sums;

	}

	function getHeterogeneity(weights, df, alpha) {

		var het = {}; // heterogeneity object to return

		het.q = weights.sumWeightsTimesSquaredMeans - (Math.pow(weights.sumWeightsTimesMeans, 2) / weights.sumWeights); // Q
		het.c = weights.sumWeights - (weights.sumSquaredWeights / weights.sumWeights); // C
		het.tSq = (het.c === 0) ? 0 : (Math.max(0, ((het.q - df) / het.c))); // Tau squared (minimum of 0)
		het.t = Math.sqrt(het.tSq); // Tau
		het.iSq = Math.max(0, ((het.q - df) / het.q)); // I Squared (minimum of 0)
		het.b1 = 0.5 * ((Math.log(het.q) - Math.log(df)) / (Math.sqrt(het.q * 2) - Math.sqrt((2 * df) - 1))); // B1
		het.b2 = (df > 1) ? Math.sqrt((1 / ((2 * (df - 1)) * (1 - (1 / (3 * ((df - 1) * (df - 1)))))))) : 0; // B2
		het.b = (het.q > (df + 1)) ? het.b1 : het.b2; // B
		het.l = Math.exp((0.5 * Math.log(het.q / df)) - (jStat.normal.inv((1 - (alpha / 2)), 0, 1) * het.b)); // L
		het.u = Math.exp((0.5 * Math.log(het.q / df)) + (jStat.normal.inv((1 - (alpha / 2)), 0, 1) * het.b)); // U
		het.lltSq = Math.max(0, ((df * (Math.pow(het.l, 2) - 1))) / het.c); // Lower 95% CI for Tau squared (minimum of 0)
		het.ultSq = Math.max(0, ((df * (Math.pow(het.u, 2) - 1))) / het.c); // Upper 95% CI for Tau squared (minimum of 0)
		het.llt = Math.sqrt(het.lltSq); // Lower 95% CI for Tau
		het.ult = Math.sqrt(het.ultSq); // Upper 95% CI for Tau
		het.p = 1 - jStat.chisquare.cdf(het.q, df); // p value

		return het;

	}

	function metaAnalyse(weights, alpha, nullMean, maType) {

		var maData = {}; // create an object to hold the meta-analysis data

		maData.mean = weights.sumWeightsTimesMeans / weights.sumWeights; // meta-analysed mean
		maData.variance = 1 / weights.sumWeights; // variance of meta-analysed mean
		maData.sd = Math.sqrt(maData.variance); // standard deviation of meta-analysed mean
		maData.moe = jStat.normal.inv((1 - (alpha / 2)), 0, 1) * maData.sd; // margin of error of meta-analysed mean
		maData.ll = maData.mean - maData.moe; // lower limit of 95% CI
		maData.ul = maData.mean + maData.moe; // upper limit of 95% CI
		maData.z = jStat.zscore(maData.mean, nullMean, maData.sd); // z score
		maData.p = jStat.ztest(maData.z); // p value
		if (maType.name === "r") { // make some adjustments for Pearson correlation meta-analysis type
			maData.zLL = maData.mean - jStat.normal.inv((1 - (alpha / 2)), 0, 1) * maData.sd; // z LL
			maData.zUL = maData.mean + jStat.normal.inv((1 - (alpha / 2)), 0, 1) * maData.sd; // z UL
			maData.ll = (Math.exp(2 * maData.zLL) - 1) / (Math.exp(2 * maData.zLL) + 1); // r LL
			maData.ul = (Math.exp(2 * maData.zUL) - 1) / (Math.exp(2 * maData.zUL) + 1); // r UL
			maData.mean = (Math.exp(2 * maData.mean) - 1) / (Math.exp(2 * maData.mean) + 1); // M of r
		}

		return maData;

	}

})();