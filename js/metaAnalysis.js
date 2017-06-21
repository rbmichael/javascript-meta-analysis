/*
	JavaScript Meta-Analysis

	Arguments:
		OBJECT: Configuration {
			STRING: maType; Type of analysis (default "means"),
				SHOULD BE ONE OF THE FOLLOWING:
				"means" - For single means. Requires M, SD, N,
				"meanDiffs" - For difference between two independent group means. Requires M1, SD1, N1, M2, SD2, N2,
				"meanPairedDiffsT" - For difference between two dependent means with known paired t value. Requires M1, SD1, M2, SD2, N, paired t value,
				"meanPairedDiffsP" - For difference between two dependent means with known p value. Requires M1, SD1, M2, SD2, N, p value,
				"d" - Cohen's d for a single group. Requires d, N,
				"dUnb" - As above but calculates an Unbiased d,
				"dDiffs" - Cohen's d for the difference between two independent groups. Requires d, N1, N2,
				"dUnbDiffs" - As above but calculates an Unbiased d,
				"r" - Pearson's r correlations. Requires r, N,
				"rDiffs" - For difference between two independent group correlations. Requires r1, N1, r2, N2.
				"prop" - For proportions. Requires x (e.g., # of successes), N (e.g., total trials).
			NUMBER: ci; Confidence interval (default 95),
			NUMBER: nullMean; Null hypothesis value (default 0)
		},
		ARRAY: Dataset of studies (min length 2) [
			ARRAY: Individual study data {
				NUMBERs (according to maType above, e.g. "means" requires M, SD, N: [ [10, 2, 30] , [8, 1, 40] ] )
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
					NUMBER: randomVariance; Random model variance (weight + Tau^2)
					NUMBER: randomWeight; Random model weight (1 / varianceRandom)
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
				NUMBER: modelRatio; Ratio of random / fixed model CI lengths
			}
			OBJECT: fixed, random {
				NUMBER: mean;
				NUMBER: variance;
				NUMBER: se;
				NUMBER: ll;
				NUMBER: ul;
				NUMBER: z;
				NUMBER: p;
			}
		}
*/
(function() {

	this.metaAnalysis = function(config, dataSet) {

		var i = 0, // counter
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
			ci: config.ci || 95,
			nullMean: config.nullMean || 0
		};
		config.alpha = (100 - config.ci) / 100;
		dataSet = dataSet || [];

		ma.dataSet = getData(config.maType, config.alpha, config.nullMean, dataSet); // gather individual study info
		ma.weightSums.fixed = sumWeights("fixed", ma.dataSet); // get fixed weights
		ma.heterogeneity = getHeterogeneity(ma.weightSums.fixed, dataSet.length-1, config.alpha); // get heterogeneity
		for (i = 0; i < ma.dataSet.length; i++) { // for each study in the dataset, add in its random model variance and weight
			ma.dataSet[i].randomVariance = (1 / ma.dataSet[i].weight) + ma.heterogeneity.tSq; // random model variance
			ma.dataSet[i].randomWeight = 1 / ma.dataSet[i].randomVariance; // random model weight
		}
		ma.weightSums.random = sumWeights("random", ma.dataSet); // get random weights
		ma.fixed = metaAnalyse(ma.weightSums.fixed, config.alpha, config.nullMean, config.maType); // run the fixed model meta-analysis
		ma.random = metaAnalyse(ma.weightSums.random, config.alpha, config.nullMean, config.maType); // run the random model meta-analysis
		ma.heterogeneity.modelRatio = (ma.random.ul - ma.random.ll) / (ma.fixed.ul - ma.fixed.ll); // get the ratio of the random model CI to the fixed model CI as a measure of heterogeneity

		return ma; // done

	};
	
	function getData(maType, alpha, nullMean, dataIn) {

		var i = 0, // counter
			j = 0, // counter
			study = {}, // hold a single study
			dataOut = []; // dataset to return

		for (i = 0; i < dataIn.length; i++) { // loop through the studies
			switch (maType) { // get the appropriate statistics depending on the type of meta-analysis
				case "means":
					study.m = dataIn[i][0]; // mean
					study.sd = dataIn[i][1]; // standard deviation
					study.n = dataIn[i][2]; // sample size
					study.weight = 1 / (Math.pow(study.sd, 2) / study.n); // study weight
					[study.ll, study.ul] = jStat.tci(study.m, alpha, study.sd, study.n); // confidence interval
					study.t = jStat.tscore(study.m, nullMean, study.sd, study.n); // t score
					study.p = jStat.ttest(study.t, study.n); // p value
					study.mid = study.m; // for later weight calculations
					break;
				case "meanDiffs":
					study.m1 = dataIn[i][0]; // mean 1
					study.sd1 = dataIn[i][1]; // standard deviation 1
					study.n1 = dataIn[i][2]; // sample size 1
					study.m2 = dataIn[i][3]; // mean 2
					study.sd2 = dataIn[i][4]; // standard deviation 2
					study.n2 = dataIn[i][5]; // sample size 2
					study.mDiff = study.m2 - study.m1; // mean difference
					study.sd = Math.sqrt(((study.n1 - 1) * Math.pow(study.sd1, 2) + (study.n2 - 1) * Math.pow(study.sd2, 2)) / (study.n1 + study.n2 - 2)); // pooled standard deviation
					study.variance = Math.pow(study.sd, 2) * ((1 / study.n1) + (1 / study.n2)); // variance of the difference
					study.weight = 1 / study.variance; // study weight
					[study.ll, study.ul] = jStat.tci(study.mDiff, alpha, Math.sqrt(study.variance * (study.n1 + study.n2 - 1)), (study.n1 + study.n2 - 1)); // confidence interval
					study.t = jStat.tscore(study.mDiff, nullMean, Math.sqrt(study.variance * (study.n1 + study.n2 - 1)), (study.n1 + study.n2 - 1));
					study.p = jStat.ttest(study.t, (study.n1 + study.n2 - 1)); // p value
					study.mid = study.mDiff; // for later weight calculation
					delete study.mDiff; // cleanup
					delete study.sd;
					delete study.variance;
					break;
				case "meanPairedDiffsT":
					study.m1 = dataIn[i][0]; // mean 1
					study.sd1 = dataIn[i][1]; // standard deviation 1
					study.m2 = dataIn[i][2]; // mean 2
					study.sd2 = dataIn[i][3]; // standard deviation 2
					study.n = dataIn[i][4]; // sample size
					study.t = dataIn[i][5]; // paired t value
					study.mDiff = study.m2 - study.m1; // mean difference
					study.se = Math.abs(study.mDiff - nullMean) * (1 / study.t); // standard error calculated from known paired t value
					study.variance = Math.pow(study.se, 2); // variance
					study.weight = 1 / study.variance; // study weight
					[study.ll, study.ul] = jStat.tci(study.mDiff, alpha, Math.sqrt(study.variance * study.n), study.n);
					study.p = jStat.ttest(study.t, study.n); // p value
					study.mid = study.mDiff; // for later weight calculation
					delete study.mDiff; // cleanup
					delete study.se;
					delete study.variance;
					break;
				case "meanPairedDiffsP":
					study.m1 = dataIn[i][0]; // mean 1
					study.sd1 = dataIn[i][1]; // standard deviation 1
					study.m2 = dataIn[i][2]; // mean 2
					study.sd2 = dataIn[i][3]; // standard deviation 2
					study.n = dataIn[i][4]; // sample size
					study.p = dataIn[i][5]; // known p value
					study.mDiff = study.m2 - study.m1; // mean difference
					study.t = jStat.studentt.inv(1 - (study.p / 2), study.n - 1); // turn p back into t
					study.se = Math.abs(study.mDiff - nullMean) * (1 / study.t); // standard error calculated from paired t value
					study.variance = Math.pow(study.se, 2); // variance
					study.weight = 1 / study.variance; // study weight
					[study.ll, study.ul] = jStat.tci(study.mDiff, alpha, Math.sqrt(study.variance * study.n), study.n);
					study.mid = study.mDiff; // for later weight calculation
					delete study.mDiff; // cleanup
					delete study.se;
					delete study.variance;
					break;
				case "d":
					study.d = dataIn[i][0]; // Cohen's d
					study.n = dataIn[i][1]; // sample size
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
					study.variance = (1 + (Math.pow(study.d, 2)) / 2) / study.n; // variance
					study.weight = 1 / study.variance; // weight
					study.t = jStat.tscore(study.d, nullMean, Math.sqrt(study.variance * study.n), study.n) // t score
					study.p = jStat.ttest(study.t, study.n); // p value
					study.mid = study.d; // for later weight calculation
					delete study.sqrtN; // cleanup
					delete study.ncp;
					delete study.df;
					delete study.t_crit;
					delete study.ncpL;
					delete study.ncpU;
					delete study.variance;
					break;
				case "dUnb":
					study.d = dataIn[i][0]; // Cohen's d
					study.n = dataIn[i][1]; // sample size
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
					delete study.sqrtN; // cleanup
					delete study.ncp;
					delete study.df;
					delete study.t_crit;
					delete study.ncpL;
					delete study.ncpU;
					delete study.dMod;
					delete study.variance;
					break;
				case "dDiffs":
					study.d = dataIn[i][0]; // Cohen's d of the difference between two groups
					study.n1 = dataIn[i][1]; // sample size 1
					study.n2 = dataIn[i][2]; // sample size 2
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
					study.variance = (study.n1 + study.n2) / (study.n1 * study.n2) + (Math.pow(study.d, 2)) / (2 * (study.n1 + study.n2)); // variance
					study.weight = 1 / study.variance; // weight
					study.t = jStat.tscore(study.d, nullMean, Math.sqrt(study.variance * (study.n1 + study.n2 - 1)), study.n1 + study.n2 - 1); // t
					study.p = jStat.ttest(study.t, (study.n1 + study.n2 - 1)); // p
					study.mid = study.d; // for later weight calculation
					delete study.sqrtN12; // cleanup
					delete study.ncp;
					delete study.df;
					delete study.t_crit;
					delete study.ncpL;
					delete study.ncpU;
					delete study.variance;
					break;
				case "dUnbDiffs":
					study.d = dataIn[i][0]; // Cohen's d of the difference between two groups
					study.n1 = dataIn[i][1]; // sample size 1
					study.n2 = dataIn[i][2]; // sample size 2
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
					study.variance = ((study.n1 + study.n2) / (study.n1 * study.n2) + (Math.pow(study.d, 2)) / (2 * (study.n1 + study.n2))); // variance
					study.d = study.d * study.dMod; // change d to unbiased d
					study.t = jStat.tscore(study.d, nullMean, Math.sqrt(study.variance * (study.n1 + study.n2 - 1)), study.n1 + study.n2 - 1); // t
					study.p = jStat.ttest(study.t, (study.n1 + study.n2 - 1)); // p
					study.variance *= Math.pow(study.dMod, 2); // change variance to unbiased d variance
					study.weight = 1 / study.variance; // change weight to unbiased d weight
					study.mid = study.d; // for later weight calculation
					delete study.sqrtN12; // cleanup
					delete study.ncp;
					delete study.df;
					delete study.t_crit;
					delete study.ncpL;
					delete study.ncpU;
					delete study.dMod;
					delete study.variance;
					break;
				case "r":
					study.r = dataIn[i][0]; // Pearson's r correlations
					study.n = dataIn[i][1]; // sample size
					study.rZ = 0.5 * Math.log((1 + study.r) / (1 - study.r)); // Fisher's z for r
					study.varZ = 1 / (study.n - 3); // variance of Fisher's z
					study.weight = 1 / study.varZ; // weight
					[study.zLL, study.zUL] = jStat.normalci(study.rZ, alpha, Math.sqrt(study.varZ), 1); // Z limits
					study.ll = (Math.exp(2 * study.zLL) - 1) / (Math.exp(2 * study.zLL) + 1); // lower limit CI (Z to r)
					study.ul = (Math.exp(2 * study.zUL) - 1) / (Math.exp(2 * study.zUL) + 1); // upper limit CI (Z to r)
					study.z = jStat.zscore(study.rZ, nullMean, Math.sqrt(study.varZ)) // z score
					study.p = jStat.ztest(study.z); // p value
					study.mid = study.rZ; // for later weight calculation
					delete study.rZ; // cleanup
					delete study.varZ;
					delete study.zLL;
					delete study.zUL;
					break;
				case "rDiffs":
					study.r1 = dataIn[i][0]; // Pearson's r correlations 1
					study.n1 = dataIn[i][1]; // sample size 1
					study.r2 = dataIn[i][2]; // Pearson's r correlations 2
					study.n2 = dataIn[i][3]; // sample size 2
					study.r1z = 0.5 * Math.log((1 + study.r1) / (1 - study.r1)); // Fisher's z for r 1
					study.r2z = 0.5 * Math.log((1 + study.r2) / (1 - study.r2)); // Fisher's z for r 2
					study.varZ = (1 / (study.n1 - 3)) + (1 / (study.n2 - 3)) ; // variance
					study.weight = 1 / study.varZ; // weight
					study.zDiff = (study.r1z - study.r2z) / Math.sqrt(study.varZ); // z difference btwn Fisher's Zs
					[study.ll, study.ul] = jStat.normalci(study.zDiff, alpha, Math.sqrt(study.varZ), 1); // Z limits
					study.z = jStat.zscore(study.zDiff, nullMean, Math.sqrt(study.varZ)) // z score
					study.p = jStat.ztest(study.z); // p value
					study.mid = study.zDiff; // for later weight calculation
					delete study.r1z; // cleanup
					delete study.r2z;
					delete study.varZ;
					delete study.zDiff;
					break;
				case "prop":
					// let's try Agresti-Coull method...
					study.x = dataIn[i][0]; // subset of sample
					study.n = dataIn[i][1]; // sample size
					study.prop = study.x / study.n; // proportion
					study.zCrit = jStat.normal.inv((1 - (alpha / 2)), 0, 1); // critical z value
					study.zCritSq = Math.pow(study.zCrit, 2); // crit z squared
					study.nMod = study.n + study.zCritSq; // modify sample size
					study.pMod = (1 / study.nMod) * (study.x + (0.5 * study.zCritSq)); // modify proportion
					//study.variance = (1 / study.n) * study.prop * (1 - study.prop);
					//study.weight = 1 / study.variance;
					study.varMod = (1 / study.nMod) * study.pMod * (1 - study.pMod); // modify variance
					study.weight = 1 / study.varMod; // weight
					[study.ll, study.ul] = jStat.normalci(study.pMod, alpha, Math.sqrt(study.varMod), 1); // confidence interval
					study.ll = Math.max(0, study.ll); // correcting for extreme values
					study.ul = Math.min(1, study.ul); // correcting for extreme values
					study.z = jStat.zscore(study.pMod, nullMean, Math.sqrt(study.varMod)); // z
					study.p = jStat.ztest(study.z); // p
					study.mid = study.prop; // for later weight calculation
					delete study.zCrit; // cleanup
					delete study.zCritSq;
					delete study.nMod;
					delete study.pMod;
					delete study.varMod;
				default:
					break;
			}
			study.weightTimesMean = study.weight * study.mid; // study weight * study mean
			study.weightTimesSquaredMean = study.weight * Math.pow(study.mid, 2); // study weight * (study mean)^2
			study.weightSquared = Math.pow(study.weight, 2); // (study weight)^2
			dataOut[i] = Object.assign({}, study); // copy the study data into the dataset
		}

		return dataOut; // pass the data back

	}

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
		nct += 4 * jStat.normal.cdf(pointSep * tOverSqrtDF - ncp, 0, 1) * Math.pow(pointSep, df2) * Math.exp(-0.5 * Math.pow(pointSep, 2)); // add second term with multiplier of 4
		for (i = 1; i < 50; i++) { // loop to add 98 values
			pointSepTmp = 2 * i * pointSep;
			nct += 2 * jStat.normal.cdf(pointSepTmp * tOverSqrtDF - ncp, 0, 1) * Math.pow(pointSepTmp, df2) * Math.exp(-0.5 * Math.pow(pointSepTmp, 2));
			pointSepTmp += pointSep;
			nct += 4 * jStat.normal.cdf(pointSepTmp * tOverSqrtDF - ncp, 0, 1) * Math.pow(pointSepTmp, df2) * Math.exp(-0.5 * Math.pow(pointSepTmp, 2));
		}
		pointSepTmp += pointSep; // add last term
		nct += jStat.normal.cdf(pointSepTmp * tOverSqrtDF - ncp, 0, 1) * Math.pow(pointSepTmp, df2) * Math.exp(-0.5 * Math.pow(pointSepTmp, 2));
		nct *= constant; // multiply by the constant

		return nct;

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
		maData.se = Math.sqrt(maData.variance); // standard error of meta-analysed mean
		[maData.ll, maData.ul] = jStat.normalci(maData.mean, alpha, maData.se, 1);
		maData.z = jStat.zscore(maData.mean, nullMean, maData.se); // z score
		maData.p = jStat.ztest(maData.z); // p value
		if (maType === "r") { // convert back from Fisher's Zs to Pearson correlations
			maData.mean = (Math.exp(2 * maData.mean) - 1) / (Math.exp(2 * maData.mean) + 1); // M of r
			maData.ll = (Math.exp(2 * maData.ll) - 1) / (Math.exp(2 * maData.ll) + 1); // LL
			maData.ul = (Math.exp(2 * maData.ul) - 1) / (Math.exp(2 * maData.ul) + 1); // UL
		} else if (maType === "prop") { // min/max for proportions
			maData.ll = Math.max(0, maData.ll);
			maData.ul = Math.max(0, maData.ul);
		}

		return maData;

	}

})();