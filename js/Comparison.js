"use-strict";
/**
 * ========================================================================== *
 * Gasvaktin Comparison Client Script.
 * 
 * Prerequisites:
 * - window.fetch (is to be standard in all browsers but currently isn't, we're
 *   using the following polyfill: https://www.npmjs.com/package/whatwg-fetch)
 * - window.Promise (supported by all browsers as far as I know, but included a
 *   fallback polyfill just in case)
 * - PapaParse.js (neat CSV parser, accessible in window.Papa)
 **/

var gs = {  /* Global Scope */
  urlParams: null,
  debug: false,
  data: {
    crudeOil: null,
    currencyRateUsdToIsk: null,
    crudeOilIskLiter: null,
    pricePetrolIceland: null,
    priceDieselIceland: null,
    crudeRatio: null
  },
  dataFiles: {
    crudeOil: "https://raw.githubusercontent.com/gasvaktin/gasvaktin-comparison/master/data/crude_oil_barrel_usd.csv.txt",
    currencyRateUsdToIsk: "https://raw.githubusercontent.com/gasvaktin/gasvaktin-comparison/master/data/currency_rate_isk_usd.csv.txt",
    crudeOilIskLiter: "https://raw.githubusercontent.com/gasvaktin/gasvaktin-comparison/master/data/crude_oil_litres_isk.csv.txt",
    pricePetrolIceland: "https://raw.githubusercontent.com/gasvaktin/gasvaktin-comparison/master/data/fuel_petrol_iceland_liter_isk.csv.txt",
    priceDieselIceland: "https://raw.githubusercontent.com/gasvaktin/gasvaktin-comparison/master/data/fuel_diesel_iceland_liter_isk.csv.txt"
  },
  papaParseConfig: {
    dynamicTyping: true,
    header: true,
    skipEmptyLines: true
  },
  charts: {
    crudeOil: {
      label: "Crude Oil (USD/Barrel)",
      borderColor: "#483D8B",
      backgroundColor: "#938cc5",
      xAxisDataLabel: "date",
      yAxisDataLabel: "price",
      elementId: "crudeDevelopment",
      element: null,
      ctx: null,
      data: {
        datasets: []
      },
      options: {
        customTooltip: {
          show: true,
          timestamp: null,
          company: null
        },
        scales: {
          xAxes: [{
            type: "time",
            position: "bottom"
          }],
          yAxes: [{
            scaleLabel: {
              display: true,
              labelString: "Price per Barrel (USD)"
            },
            ticks: {
              beginAtZero: true
            }
          }]
        },
        elements: {
          point: {
            radius: 0,
            hitRadius: 10,
            hoverRadius: 3
          }
        },
        legend: {
          labels: {
            boxWidth: 12
          }
        }
      }
    },
    currencyRateUsdToIsk: {
      label: "USD to ISK Exchange Rate",
      borderColor: "#483D8B",
      backgroundColor: "#938cc5",
      xAxisDataLabel: "date",
      yAxisDataLabel: "sell",
      elementId: "currencyRate",
      element: null,
      ctx: null,
      data: {
        datasets: []
      },
      options: {
        customTooltip: {
          show: true,
          timestamp: null,
          company: null
        },
        scales: {
          xAxes: [{
            type: "time",
            position: "bottom"
          }],
          yAxes: [{
            scaleLabel: {
              display: true,
              labelString: "Price of 1 USD (in ISK)"
            },
            ticks: {
              beginAtZero: true
            }
          }]
        },
        elements: {
          point: {
            radius: 0,
            hitRadius: 10,
            hoverRadius: 3
          }
        },
        legend: {
          labels: {
            boxWidth: 12
          }
        }
      }
    },
    crudeOilIskLiter: {
      label: "Crude Oil (ISK/Liter)",
      borderColor: "#483D8B",
      backgroundColor: "#938cc5",
      xAxisDataLabel: "date",
      yAxisDataLabel: "price",
      elementId: "crudeDevelopmentIsk",
      element: null,
      ctx: null,
      data: {
        datasets: []
      },
      options: {
        customTooltip: {
          show: true,
          timestamp: null,
          company: null
        },
        scales: {
          xAxes: [{
            type: "time",
            position: "bottom"
          }],
          yAxes: [{
            scaleLabel: {
              display: true,
              labelString: "Price of 1 liter (in ISK)"
            },
            ticks: {
              beginAtZero: true
            }
          }]
        },
        elements: {
          point: {
            radius: 0,
            hitRadius: 10,
            hoverRadius: 3
          }
        },
        legend: {
          labels: {
            boxWidth: 12
          }
        }
      }
    },
    pricePetrolIceland: {
      label: "Petrol price Iceland (ISK/Liter)",
      borderColor: "#483D8B",
      backgroundColor: "#938cc5",
      xAxisDataLabel: "date",
      yAxisDataLabel: "price",
      elementId: "pricePetrolIceland",
      element: null,
      ctx: null,
      data: {
        datasets: []
      },
      options: {
        customTooltip: {
          show: true,
          timestamp: null,
          company: null
        },
        scales: {
          xAxes: [{
            type: "time",
            position: "bottom"
          }],
          yAxes: [{
            scaleLabel: {
              display: true,
              labelString: "Price of 1 liter (in ISK)"
            },
            ticks: {
              beginAtZero: true
            }
          }]
        },
        elements: {
          point: {
            radius: 0,
            hitRadius: 10,
            hoverRadius: 3
          }
        },
        legend: {
          labels: {
            boxWidth: 12
          }
        },
        steppedLine: true
      }
    },
    priceDieselIceland: {
      label: "Diesel price Iceland (ISK/Liter)",
      borderColor: "#483D8B",
      backgroundColor: "#938cc5",
      xAxisDataLabel: "date",
      yAxisDataLabel: "price",
      elementId: "priceDieselIceland",
      element: null,
      ctx: null,
      data: {
        datasets: []
      },
      options: {
        customTooltip: {
          show: true,
          timestamp: null,
          company: null
        },
        scales: {
          xAxes: [{
            type: "time",
            position: "bottom"
          }],
          yAxes: [{
            scaleLabel: {
              display: true,
              labelString: "Price of 1 liter (in ISK)"
            },
            ticks: {
              beginAtZero: true
            }
          }]
        },
        elements: {
          point: {
            radius: 0,
            hitRadius: 10,
            hoverRadius: 3
          }
        },
        legend: {
          labels: {
            boxWidth: 12
          }
        },
        steppedLine: true
      }
    },
    crudeRatio: {
      label: "Crude Ratio",
      borderColor: "#483D8B",
      backgroundColor: "#938cc5",
      xAxisDataLabel: "date",
      yAxisDataLabel: "index",
      elementId: "crudeRatio",
      element: null,
      ctx: null,
      data: {
        datasets: []
      },
      options: {
        customTooltip: {
          show: true,
          timestamp: null,
          company: null
        },
        scales: {
          xAxes: [{
            type: "time",
            position: "bottom"
          }],
          yAxes: [{
            scaleLabel: {
              display: true,
              labelString: "[Crude Oil / Petrol] ratio"
            },
            ticks: {
              beginAtZero: true
            }
          }]
        },
        elements: {
          point: {
            radius: 0,
            hitRadius: 10,
            hoverRadius: 3
          }
        },
        legend: {
          labels: {
            boxWidth: 12
          }
        },
        steppedLine: true
      }
    }
  },
  startDate: "1996-05-31",
  startDateDayBefore: "1996-05-30",
  /* bblToLitres: https://twitter.com/gasvaktin/status/993875638435090433 */
  bblToLitres: 158.987294928
};

/**
 * ========================================================================== *
 * Promising functions for doing specific tasks, knitted together further down.
 **/

var fetchCsvDataFile = function(name) {
  /**
   * Fetch named CSV data and store in Global Scope
   **/
  return new Promise(function(fulfil, reject) {
    window.fetch(gs.dataFiles[name]).then(function(response) {
      return response.text();
    }).then(function(text) {
      return window.Papa.parse(text, gs.papaParseConfig);
    }).then(function(data) {
      if (gs.debug) {
        console.log("Got the following '" + name + "' data:");
        console.log(data);
      }
      gs.data[name] = data;
      fulfil();
    }).catch(function(err) {
      console.error(err);
      reject(err);
    });
  });
}

var prepareChartData = function(name) {
  /**
   * Process and prepare named data into appropriate chart
   **/
  return new Promise(function(fulfil, reject) {
    try {
      gs.charts[name].element = window.document.getElementById(gs.charts[name].elementId);
      var dataset = {
        label: gs.charts[name].label,
        pointStyle: "circle",
        borderColor: gs.charts[name].borderColor,
        backgroundColor: gs.charts[name].backgroundColor,
        lineTension: 0,
        borderWidth: 1,
        fill: false,
        data: [],
        radius: [],
        hitRadius: [],
        hoverRadius: []
      };
      dataset.data.push({
        x: gs.startDateDayBefore,
        y: null
      });
      for (var i=0; i<gs.data[name].data.length; i++) {
        if (gs.data[name].data[i][gs.charts[name].yAxisDataLabel] === ".") {
          continue;
        }
        if (gs.data[name].data[i][gs.charts[name].xAxisDataLabel] < gs.startDate) {
          continue;
        }
        var yAxisVal = gs.data[name].data[i][gs.charts[name].yAxisDataLabel];
        dataset.data.push({
          x: gs.data[name].data[i][gs.charts[name].xAxisDataLabel],
          y: yAxisVal
        });
        dataset.radius.push(0);
        dataset.hitRadius.push(0);
        dataset.hoverRadius.push(0);
      }
      gs.charts[name].data.datasets.push(dataset);
      fulfil();
    }
    catch (err) {
      console.error(err);
      reject(err);
    }
  });
}

var prepareCrudeIndexChartData = function() {
  /**
   * Process and prepare named data into crudeOilIsk chart
   **/
  return new Promise(function(fulfil, reject) {
    try {
      var name = "crudeRatio";
      /* generate crudeRatio data */
      gs.data[name] = {data: []}
      var rateEnd = gs.data["pricePetrolIceland"].data.length;
      var rateCounter = 0;
      var currentRate = gs.data["pricePetrolIceland"].data[rateCounter];
      for (var i=0; i<gs.data["crudeOilIskLiter"].data.length; i++) {
        if (gs.data["crudeOilIskLiter"].data[i]["date"] < currentRate["date"]) {
          continue
        }
        if (gs.data["crudeOilIskLiter"].data[i]["price"] === ".") {
          continue;
        }
        var currentRatePrice = currentRate["price"];
        var crudeRatioVal =  (gs.data["crudeOilIskLiter"].data[i]["price"] / currentRatePrice);
        gs.data[name].data.push({
          date: gs.data["crudeOilIskLiter"].data[i]["date"],
          index: crudeRatioVal
        });
        if (rateCounter + 1 < rateEnd &&
            gs.data["pricePetrolIceland"].data[rateCounter + 1]["date"] <=
            gs.data["crudeOilIskLiter"].data[i]["date"]) {
          rateCounter += 1;
          currentRate = gs.data["pricePetrolIceland"].data[rateCounter];
        }
      }
      /* finished generating crudeRatio data */
      gs.charts[name].element = window.document.getElementById(gs.charts[name].elementId);
      var dataset = {
        label: gs.charts[name].label,
        pointStyle: "circle",
        borderColor: gs.charts[name].borderColor,
        backgroundColor: gs.charts[name].backgroundColor,
        lineTension: 0,
        borderWidth: 1,
        fill: false,
        data: [],
        radius: [],
        hitRadius: [],
        hoverRadius: []
      };
      for (var i=0; i<gs.data[name].data.length; i++) {
        if (gs.data[name].data[i][gs.charts[name].yAxisDataLabel] === ".") {
          continue;
        }
        if (gs.data[name].data[i][gs.charts[name].xAxisDataLabel] < gs.startDate) {
          continue;
        }
        dataset.data.push({
          x: gs.data[name].data[i][gs.charts[name].xAxisDataLabel],
          y: gs.data[name].data[i][gs.charts[name].yAxisDataLabel]
        });
        dataset.radius.push(0);
        dataset.hitRadius.push(0);
        dataset.hoverRadius.push(0);
      }
      gs.charts[name].data.datasets.push(dataset);
      fulfil();
    }
    catch (err) {
      console.error(err);
      reject(err);
    }
  });
}

var plotChart = function(name) {
  /**
   * Plot chart
   **/
  return new Promise(function(fulfil, reject) {
    try {
      gs.charts[name].ctx = new window.Chart(gs.charts[name].element, {
        type: "line",
        data: gs.charts[name].data,
        options: gs.charts[name].options
      });
      fulfil();
    }
    catch (err) {
      console.error(err);
      reject(err);
    }
  });
}

/**
 * ========================================================================== *
 * In runClient we knit together above promising functions
 **/

var runClient = function() {
  Promise.all([
    fetchCsvDataFile("crudeOil"),
    fetchCsvDataFile("currencyRateUsdToIsk"),
    fetchCsvDataFile("crudeOilIskLiter"),
    fetchCsvDataFile("pricePetrolIceland"),
    fetchCsvDataFile("priceDieselIceland")
  ]).then(function() {
    if (gs.debug) { console.log("Data fetched."); }
  }).then(function() {
    return Promise.all([
      prepareChartData("crudeOil"),
      prepareChartData("currencyRateUsdToIsk"),
      prepareChartData("crudeOilIskLiter"),
      prepareChartData("pricePetrolIceland"),
      prepareChartData("priceDieselIceland")
    ]);
  }).then(function() {
    return Promise.all([
      plotChart("crudeOil"),
      plotChart("currencyRateUsdToIsk"),
      plotChart("crudeOilIskLiter"),
      plotChart("pricePetrolIceland"),
      plotChart("priceDieselIceland")
    ]);
  }).then(function() {
    if (gs.debug) { console.log("Charts plotted."); }
  }).then(function() {
    return prepareCrudeIndexChartData();
  }).then(function() {
    return plotChart("crudeRatio");
  }).then(function() {
    if (gs.debug) { console.log("Crude ratio chart plotted."); }
  });
}

/**
 * ========================================================================== *
 * Initialization
 **/

var initialize = function() {
  /**
   * Sets some parameters in the global scope gs, puts configuration parameters
   * in their places, polyfills things if necessary, then initializes client
   */
  gs.urlParams = new window.URLSearchParams(window.location.search);
  if (gs.urlParams.has('debug') && gs.urlParams.get('debug') === 'true') {
    /* set debug to true if GET parameter debug=true is provided in url */
    gs.debug = true;
  }
  runClient();
}
initialize();
