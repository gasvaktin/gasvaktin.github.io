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
 * - Moment.js (handy timestamp managing package, accessible in window.moment)
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
    crudeRatio: null,
    comparisonData: null
  },
  dataFiles: {
    crudeOil: (
      "https://raw.githubusercontent.com/gasvaktin/gasvaktin-comparison/master" +
      "/data/crude_oil_barrel_usd.csv.txt"
    ),
    currencyRateUsdToIsk: (
      "https://raw.githubusercontent.com/gasvaktin/gasvaktin-comparison/master" +
      "/data/currency_rate_isk_usd.csv.txt"
    ),
    crudeOilIskLiter: (
      "https://raw.githubusercontent.com/gasvaktin/gasvaktin-comparison/master" +
      "/data/crude_oil_litres_isk.csv.txt"
    ),
    pricePetrolIceland: (
      "https://raw.githubusercontent.com/gasvaktin/gasvaktin-comparison/master" +
      "/data/fuel_petrol_iceland_liter_isk.csv.txt"
    ),
    priceDieselIceland: (
      "https://raw.githubusercontent.com/gasvaktin/gasvaktin-comparison/master" +
      "/data/fuel_diesel_iceland_liter_isk.csv.txt"
    ),
    crudeRatio: (
      "https://raw.githubusercontent.com/gasvaktin/gasvaktin-comparison/master" +
      "/data/crude_ratio.csv.txt"
    )
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
      yAxisDataLabel: "mean",
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
      yAxisDataLabel: "ratio",
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

var generateComparisonData = function() {
  /**
   * Generate comparison data
   * todo: there are "edge cases" currently not taken care of, when we get to all historically low
   *       or high crude oil prices, fix later
   **/
  return new Promise(function(fulfil, reject) {
    try {
      if (gs.debug) console.log("Running comparison function ..");
      // read current crude oil price (isk/liter)
      if (gs.debug) console.log("read current crude oil price (isk/liter)");
      var dataCurrent = gs.data.crudeOilIskLiter.data[gs.data.crudeOilIskLiter.data.length - 1];
      if (gs.debug) console.log(dataCurrent);
      // find out when price was the same more than 3 months ago
      if (gs.debug) console.log("find out when price was the same more than 3 months ago");
      var beforeDate = window.moment(dataCurrent.date, "YYYY-MM-DD").subtract(3, 'months');
      var beforeDateStr = beforeDate.format("YYYY-MM-DD");
      var dataThen = null;
      var dataLast = null;
      var finished = false;
      for (var i=gs.data.crudeOilIskLiter.data.length - 1; i>=0; i--) {
        var data = gs.data.crudeOilIskLiter.data[i];
        if (data.date < beforeDateStr && dataLast !== null) {
          if (data.price <= dataCurrent.price && dataLast.price >= dataCurrent.price) {
            if (gs.debug) console.log("breached price (up) in");
            finished = true;
          } else if (data.price >= dataCurrent.price && dataLast.price <= dataCurrent.price) {
            if (gs.debug) console.log("breached price (down) in");
            finished = true;
          }
        }
        if (finished) {
          dataThen = data;
          break;
        } else {
          dataLast = data;
        }
      }
      if (gs.debug) console.log(dataLast);
      if (gs.debug) console.log(dataThen);
      var dataThenDayAfter = window.moment(dataThen.date, "YYYY-MM-DD").add(1, 'days');
      var dataThenDayAfterStr = dataThenDayAfter.format("YYYY-MM-DD");
      // read crude oil price (usd/bbl) for those two time periods
      if (gs.debug) console.log("read crude oil price (usd/bbl) for those two time periods");
      if (gs.debug) {
        console.log(gs.data.crudeOil.data[gs.data.crudeOil.data.length - 1]);
      }
      var dataThenCrudeUsdBbl = null;
      var dataLastCrudeUsdBbl = null;
      for (var i=gs.data.crudeOil.data.length - 1; i>=0; i--) {
        var data = gs.data.crudeOil.data[i];
        if (dataThenDayAfterStr >= data.date) {
          dataThenCrudeUsdBbl = data;
          if (gs.debug) console.log(data);
          break;
        }
        dataLastCrudeUsdBbl = data;
      }
      // read isk-usd rate for those two time periods
      if (gs.debug) console.log("read isk-usd rate for those two time periods");
      if (gs.debug) {
        console.log(
          gs.data.currencyRateUsdToIsk.data[gs.data.currencyRateUsdToIsk.data.length - 1]
        );
      }
      var dataThenRateIskUsd = null;
      var dataLastRateIskUsd = null;
      for (var i=gs.data.currencyRateUsdToIsk.data.length - 1; i>=0; i--) {
        var data = gs.data.currencyRateUsdToIsk.data[i];
        if (dataThenDayAfterStr >= data.date) {
          dataThenRateIskUsd = data;
          if (gs.debug) console.log(data);
          break;
        }
        dataLastRateIskUsd = data;
      }
      // read icelandic petrol price for those two time periods
      if (gs.debug) console.log("read icelandic petrol price for those two time periods");
      if (gs.debug) {
        console.log(gs.data.pricePetrolIceland.data[gs.data.pricePetrolIceland.data.length - 1]);
      }
      var dataThenPetrol = null;
      var dataLastPetrol = null;
      for (var i=gs.data.pricePetrolIceland.data.length - 1; i>=0; i--) {
        var data = gs.data.pricePetrolIceland.data[i];
        if (dataThenDayAfterStr >= data.date) {
          dataThenPetrol = data;
          if (gs.debug) console.log(data);
          break;
        }
        dataLastPetrol = data;
      }
      // read icelandic diesel price for those two time periods
      if (gs.debug) console.log("read icelandic diesel price for those two time periods");
      if (gs.debug) {
        console.log(gs.data.priceDieselIceland.data[gs.data.priceDieselIceland.data.length - 1]);
      }
      var dataThenDiesel = null;
      var dataLastDiesel = null;
      for (var i=gs.data.priceDieselIceland.data.length - 1; i>=0; i--) {
        var data = gs.data.priceDieselIceland.data[i];
        if (dataThenDayAfterStr >= data.date) {
          dataThenDiesel = data;
          if (gs.debug) console.log(data);
          break;
        }
        dataLastDiesel = data;
      }
      // pull the data together
      var comparisonData = {
        crudeOilIskLiter: {
          current: dataCurrent,
          similarPoint: dataThen,
          similarPoint2: dataLast
        },
        crudeOilBblBarrel: {
          current: gs.data.crudeOil.data[gs.data.crudeOil.data.length - 1],
          similarPoint: dataThenCrudeUsdBbl,
          similarPoint2: dataLastCrudeUsdBbl
        },
        rateIskUsd: {
          current: gs.data.currencyRateUsdToIsk.data[gs.data.currencyRateUsdToIsk.data.length - 1],
          similarPoint: dataThenRateIskUsd,
          similarPoint2: dataLastRateIskUsd
        },
        pricePetrolIceland: {
          current: gs.data.pricePetrolIceland.data[gs.data.pricePetrolIceland.data.length - 1],
          similarPoint: dataThenPetrol,
          similarPoint2: dataLastPetrol
        },
        priceDieselIceland: {
          current: gs.data.priceDieselIceland.data[gs.data.priceDieselIceland.data.length - 1],
          similarPoint: dataThenDiesel,
          similarPoint2: dataLastDiesel
        }
      }
      if (gs.debug) console.log("comparison data:");
      if (gs.debug) console.log(comparisonData);
      gs.data.comparisonData = comparisonData;
      fulfil();
    }
    catch (err) {
      console.error(err);
      reject(err);
    }
  });
}

var writeComparisonDataToDom = function() {
  /**
   * Write comparison data to html
   **/
  return new Promise(function(fulfil, reject) {
    try {
      // elements
      var elementText1 = window.document.getElementById("ComparisonText");
      var elementText2 = window.document.getElementById("ComparisonTextAfter");
      var table = {
        CrudeIskThen: {
          element: window.document.getElementById("TableCrudeIskThen"),
          value: null
        },
        CrudeIskNow: {
          element: window.document.getElementById("TableCrudeIskNow"),
          value: null
        },
        CrudeIskDiff: {
          element: window.document.getElementById("TableCrudeIskDiff"),
          value: null
        },
        CrudeIskPercent: {
          element: window.document.getElementById("TableCrudeIskPercent"),
          value: null
        },
        CrudeUsdThen: {
          element: window.document.getElementById("TableCrudeUsdThen"),
          value: null
        },
        CrudeUsdNow: {
          element: window.document.getElementById("TableCrudeUsdNow"),
          value: null
        },
        CrudeUsdDiff: {
          element: window.document.getElementById("TableCrudeUsdDiff"),
          value: null
        },
        CrudeUsdPercent: {
          element: window.document.getElementById("TableCrudeUsdPercent"),
          value: null
        },
        CentralBankRateThen: {
          element: window.document.getElementById("TableCentralBankRateThen"),
          value: null
        },
        CentralBankRateNow: {
          element: window.document.getElementById("TableCentralBankRateNow"),
          value: null
        },
        CentralBankRateDiff: {
          element: window.document.getElementById("TableCentralBankRateDiff"),
          value: null
        },
        CentralBankRatePercent: {
          element: window.document.getElementById("TableCentralBankRatePercent"),
          value: null
        },
        PetrolThen: {
          element: window.document.getElementById("TablePetrolThen"),
          value: null
        },
        PetrolNow: {
          element: window.document.getElementById("TablePetrolNow"),
          value: null
        },
        PetrolDiff: {
          element: window.document.getElementById("TablePetrolDiff"),
          value: null
        },
        PetrolPercent: {
          element: window.document.getElementById("TablePetrolPercent"),
          value: null
        },
        DieselThen: {
          element: window.document.getElementById("TableDieselThen"),
          value: null
        },
        DieselNow: {
          element: window.document.getElementById("TableDieselNow"),
          value: null
        },
        DieselDiff: {
          element: window.document.getElementById("TableDieselDiff"),
          value: null
        },
        DieselPercent: {
          element: window.document.getElementById("TableDieselPercent"),
          value: null
        }
      }
      var tableThen = window.document.getElementById("TableThen");
      var tableNow = window.document.getElementById("TableNow");
      // take care of elementText1
      var today = window.moment().format("YYYY-MM-DD");
      tableNow.innerHTML = today;
      var dat = gs.data.comparisonData;
      tableThen.innerHTML = dat.crudeOilIskLiter.similarPoint2.date;
      var conclusion = "";
      var diff = dat.pricePetrolIceland.current.price - dat.pricePetrolIceland.similarPoint.price;
      diffAbs = window.Math.abs(window.Math.round(diff * 100) / 100);
      if (dat.pricePetrolIceland.current.price < dat.pricePetrolIceland.similarPoint.price) {
        conclusion = (
          `so on average <b>${diffAbs} ISK</b> lower than it was in <b>` +
          `${dat.crudeOilIskLiter.similarPoint.date}</b>.`
        );
      }
      else if (dat.pricePetrolIceland.current.price > dat.pricePetrolIceland.similarPoint.price) {
        conclusion = (
          `so on average <b>${diffAbs} ISK</b> higher than it was in <b>` +
          `${dat.crudeOilIskLiter.similarPoint.date}</b>.`
        );
      } else {
        conclusion = `same as it was in <b>${dat.crudeOilIskLiter.similarPoint.date}</b>.`;
      }
      var text = (
        `The most recent <b>Crude Oil Liter</b> price available in above data is <b>` +
        `${dat.crudeOilIskLiter.current.price} ISK in ${dat.crudeOilIskLiter.current.date}` +
        `</b>. In over three months ago the last time prices have been in this range is <b>in ` +
        `${dat.crudeOilIskLiter.similarPoint.date} to ${dat.crudeOilIskLiter.similarPoint2.date}` +
        `</b> when it was <b>${dat.crudeOilIskLiter.similarPoint.price} ISK</b> and <b>` +
        `${dat.crudeOilIskLiter.similarPoint2.price} ISK</b> respectively. From <b>` +
        `${dat.pricePetrolIceland.similarPoint.date} to ` +
        `${dat.pricePetrolIceland.similarPoint2.date} </b> the <b>average Petrol Liter</b> ` +
        `price was <b> ${dat.pricePetrolIceland.similarPoint.price} ISK</b>. Today the average ` +
        `price is <b> ${dat.pricePetrolIceland.current.price} ISK</b> as of <b>` +
        `${dat.pricePetrolIceland.current.date} </b>, ${conclusion}`
      );
      elementText1.innerHTML = text;
      // take care of table data
      // - crude oil isk
      table.CrudeIskThen.value = (
        `${dat.crudeOilIskLiter.similarPoint.price.toFixed(2)} to ` +
        `${dat.crudeOilIskLiter.similarPoint2.price.toFixed(2)} ISK`
      );
      table.CrudeIskNow.value = `${dat.crudeOilIskLiter.current.price.toFixed(2)} ISK`;
      table.CrudeIskDiff.value = `≈ 0 ISK`  // yes
      table.CrudeIskPercent.value = `≈ 0 %`  // yup
      // - crude oil usd
      table.CrudeUsdThen.value = dat.crudeOilBblBarrel.similarPoint2.price;
      table.CrudeUsdNow.value = dat.crudeOilBblBarrel.current.price;
      table.CrudeUsdDiff.value = window.Math.round(
        (table.CrudeUsdNow.value - table.CrudeUsdThen.value) * 100
      ) / 100;
      table.CrudeUsdPercent.value = (
        window.Math.round(
          (table.CrudeUsdDiff.value / table.CrudeUsdThen.value * 100) * 10
        ) / 10
      );
      // - convert values to strings
      table.CrudeUsdThen.value = `${table.CrudeUsdThen.value.toFixed(2)} USD`;
      table.CrudeUsdNow.value = `${table.CrudeUsdNow.value.toFixed(2)} USD`;
      table.CrudeUsdDiff.value = (
        `${(table.CrudeUsdDiff.value<=0?"":"+")}${table.CrudeUsdDiff.value.toFixed(2)} USD`
      ).replace("-", "−");
      table.CrudeUsdPercent.value = (
        `${(table.CrudeUsdPercent.value<=0?"":"+")}${table.CrudeUsdPercent.value.toFixed(1)} %`
      ).replace("-", "−");
      // - central bank rate
      table.CentralBankRateThen.value = dat.rateIskUsd.similarPoint2.mean;
      table.CentralBankRateNow.value = dat.rateIskUsd.current.mean;
      table.CentralBankRateDiff.value = window.Math.round(
        (table.CentralBankRateNow.value - table.CentralBankRateThen.value) * 100
      ) / 100;
      table.CentralBankRatePercent.value = (
        window.Math.round(
          (table.CentralBankRateDiff.value / table.CentralBankRateThen.value * 100) * 10
        ) / 10
      );
      // - convert values to strings
      table.CentralBankRateThen.value = `${table.CentralBankRateThen.value.toFixed(2)} ISK`;
      table.CentralBankRateNow.value = `${table.CentralBankRateNow.value.toFixed(2)} ISK`;
      table.CentralBankRateDiff.value = (
        `${(table.CentralBankRateDiff.value<=0?"":"+")}` +
        `${table.CentralBankRateDiff.value.toFixed(2)} ISK`
      ).replace("-", "−");
      table.CentralBankRatePercent.value = (
        `${(table.CentralBankRatePercent.value<=0?"":"+")}` +
        `${table.CentralBankRatePercent.value.toFixed(1)} %`
      ).replace("-", "−");
      // - petrol price
      table.PetrolThen.value = dat.pricePetrolIceland.similarPoint2.price;
      table.PetrolNow.value = dat.pricePetrolIceland.current.price;
      table.PetrolDiff.value = window.Math.round(
        (table.PetrolNow.value - table.PetrolThen.value) * 100
      ) / 100;
      var diffOneDecimalFloored = -window.Math.floor(
        table.PetrolDiff.value * 10
      ) / 10;
      table.PetrolPercent.value = (
        window.Math.round(
          (table.PetrolDiff.value / table.PetrolThen.value * 100) * 10
        ) / 10
      );
      // - convert values to strings
      table.PetrolThen.value = `${table.PetrolThen.value.toFixed(2)} ISK`;
      table.PetrolNow.value = `${table.PetrolNow.value.toFixed(2)} ISK`;
      table.PetrolDiff.value = (
        `${(table.PetrolDiff.value<=0?"":"+")}${table.PetrolDiff.value.toFixed(2)} ISK`
      ).replace("-", "−");
      table.PetrolPercent.value = (
        `${(table.PetrolPercent.value<=0?"":"+")}${table.PetrolPercent.value.toFixed(1)} %`
      ).replace("-", "−");
      // - diesel price
      table.DieselThen.value = dat.priceDieselIceland.similarPoint2.price;
      table.DieselNow.value = dat.priceDieselIceland.current.price;
      table.DieselDiff.value = window.Math.round(
        (table.DieselNow.value - table.DieselThen.value) * 100
      ) / 100;
      var diffOneDecimalFlooredDiesel = -window.Math.floor(
        table.DieselDiff.value * 10
      ) / 10;
      table.DieselPercent.value = (
        window.Math.round(
          (table.DieselDiff.value / table.DieselThen.value * 100) * 10
        ) / 10
      );
      // - convert values to strings
      table.DieselThen.value = `${table.DieselThen.value.toFixed(2)} ISK`;
      table.DieselNow.value = `${table.DieselNow.value.toFixed(2)} ISK`;
      table.DieselDiff.value = (
        `${(table.DieselDiff.value<=0?"":"+")}${table.DieselDiff.value.toFixed(2)} ISK`
      );
      table.DieselPercent.value = (
        `${(table.DieselPercent.value<=0?"":"+")}${table.DieselPercent.value.toFixed(1)} %`
      );
      // throw all the table thingies into the dom
      for (var key in table) {
        var thing = table[key];
        if (thing.value !== null) {
          thing.element.innerHTML = `${thing.value}`
        }
      }
      // take care of elementText2
      var text2 = (
        `Given above assumptions and if future ISK/Liter Crude Oil price hold stable in current ` +
        `price range we can predict <b>Petrol</b> price change of <b>` +
        `${diffOneDecimalFloored.toFixed(1)} ISK</b> and <b>Diesel</b> price change of <b>` +
        `${diffOneDecimalFlooredDiesel.toFixed(1)} ISK</b> in the near future.`
      )
      elementText2.innerHTML = text2;
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
    fetchCsvDataFile("priceDieselIceland"),
    fetchCsvDataFile("crudeRatio")
  ]).then(function() {
    if (gs.debug) { console.log("Data fetched."); }
    return Promise.all([
      prepareChartData("crudeOil"),
      prepareChartData("currencyRateUsdToIsk"),
      prepareChartData("crudeOilIskLiter"),
      prepareChartData("pricePetrolIceland"),
      prepareChartData("priceDieselIceland"),
      prepareChartData("crudeRatio")
    ]);
  }).then(function() {
    return Promise.all([
      plotChart("crudeOil"),
      plotChart("currencyRateUsdToIsk"),
      plotChart("crudeOilIskLiter"),
      plotChart("pricePetrolIceland"),
      plotChart("priceDieselIceland"),
      plotChart("crudeRatio")
    ]);
  }).then(function() {
    if (gs.debug) { console.log("Charts plotted."); }
    return generateComparisonData();
  }).then(function() {
    return writeComparisonDataToDom();
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
