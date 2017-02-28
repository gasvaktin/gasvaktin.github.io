"use-strict";
/**
 * ========================================================================== *
 * Trends Page Script.
 * 
 * Prerequisites:
 * - window.fetch (is to be standard in all browsers but currently isn't, we're
 *   using the following polyfill: https://www.npmjs.com/package/whatwg-fetch)
 * - window.Promise (supported by all browsers as far as I know, but included a
 *   fallback polyfill just in case)
 * - Chart.js (in window.Chart)
 * - Moment.js (in window.moment)
 * - pickadate.js (jQuery plugin *cry* datepicker)
 **/

var gs = {  /* Global Scope Paramteters */
  urlParams: null,
  debug: false,
  priceTrendsData: null,
  dataDomain: "https://raw.githubusercontent.com",
  dataLocation: "/gasvaktin/gasvaktin/master/vaktin/trends.min.json",
  chart: {
    elementId: "priceTrendsChart",
    element: null,
    ctx: null,
    data: {
      datasets: []
    },
    options: {
      customTooltip: {
        show: false,
        timestamp: null,
        company: null
      },
      scales: {
        xAxes: [{
          type: "time",
          position: "bottom"
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
    },
    companies: {
      ao: {
        label: "Atlantsolía",
        class: "atlantsolia",
        borderColor: "#FFCF42",
        backgroundColor: "#FFCF42",
        hidden: false
      },
      dn:  {
        label: "Dælan",
        class: "daelan",
        borderColor: "#000000",
        backgroundColor: "#e00a1b",
        hidden: false
      },
      n1:  {
        label: "N1",
        class: "n1",
        borderColor: "#ea202d",
        backgroundColor: "#ea202d",
        hidden: false
      },
      ob:  {
        label: "ÓB",
        class: "ob",
        borderColor: "#7AD09F",
        backgroundColor: "#fde633",
        hidden: false
      },
      ol:  {
        label: "Olís",
        class: "olis",
        borderColor: "#13914a",
        backgroundColor: "#13914a",
        hidden: false
      },
      or:  {
        label: "Orkan",
        class: "orkan",
        borderColor: "#ea5ca0",
        backgroundColor: "#F284B8",
        hidden: false
      },
      ox:  {
        label: "Orkan X",
        class: "orkanx",
        borderColor: "#c400de",
        backgroundColor: "#c400de",
        hidden: false
      },
      sk:  {
        label: "Skeljungur",
        class: "skeljungur",
        borderColor: "#f58f31",
        backgroundColor: "#f8d33e",
        hidden: false
      }
    },
    optUi: {
      aoSelector: null,
      dnSelector: null,
      n1Selector: null,
      obSelector: null,
      olSelector: null,
      orSelector: null,
      oxSelector: null,
      skSelector: null,
    },
    optSettings: {
      petrolType: "bensin",
      bensinButton: null,
      dieselButton: null,
      discountButton: null,
      includeDiscount: false
    },
    datepicker: {
      startInput: null,
      startPicker: null,
      endInput: null,
      endPicker: null,
      minimum: null,
      start: null,
      end: null
    },
    selectedClass: "btn btn-primary company-selector",
    deselectedClass: "btn btn-default company-selector"
  },
  trendsList: [],
  listElement: null
}

/**
 * ========================================================================== *
 * Adding Custom Chart.js pluginService
 * Manipulates the chart into drawing tooltip for a certain point if wanted.
 * State rests in the gs.chart.options.customTooltip object ..
 **/
window.Chart.pluginService.register({
  // Chart.pluginService example used to put this together:
  // http://stackoverflow.com/questions/31241610/how-to-show-tooltips-always-on
  // -chart-js-2#comment68732013_31319834
  beforeRender: function (chart) {
    if (chart.config.options.customTooltip.show) {
      chart.pluginTooltips = [];
      chart.config.data.datasets.forEach(function (dataset, i) {
        if (chart.config.data.datasets[i].label ===
          chart.config.options.customTooltip.company) {
          chart.getDatasetMeta(i).data.forEach(function (sector, j) {
            if (chart.config.data.datasets[i].data[j].x ===
              chart.config.options.customTooltip.timestamp) {
              chart.pluginTooltips.push(new window.Chart.Tooltip({
                _chart: chart.chart,
                _chartInstance: chart,
                _data: chart.data,
                _options: chart.options.tooltips,
                _active: [sector]
              }, chart));
            }
          });
        }
      });
    }
  },
  afterDraw: function (chart, easing) {
    if (chart.config.options.customTooltip.show) {
      if (!chart.allTooltipsOnce) {
        if (easing !== 1)
          return;
        chart.allTooltipsOnce = true;
      }
      window.Chart.helpers.each(chart.pluginTooltips, function (tooltip) {
        tooltip.initialize();
        tooltip.update();
        tooltip.pivot();
        tooltip.transition(easing).draw();
      });
    }
  }
});

/**
 * ========================================================================== *
 * Promising functions for specific tasks
 **/

var fetchPriceTrendsData = function() {
  /**
   * Fetch the juicy datalicious priceTrends data
   **/
  return new Promise(function(fulfil, reject) {
    window.fetch(gs.dataDomain + gs.dataLocation).then(function(response) {
      return response.json()
    }).then(function(data) {
      if (gs.debug) {
        console.log("Got the following priceTrends data:");
        console.log(data);
      }
      gs.priceTrendsData = data;
      fulfil();
    }).catch(function(err) {
      console.error(err);
      reject(err);
    });
  });
}

var prepareChartData = function() {
  /**
   * Process and prepare priceTrends data for visual chart demonstration,
   * also flush gs.list and make new one
   **/
  return new Promise(function(fulfil, reject) {
    try {
      gs.trendsList = []; // flushing gs.trendsList
      var startTimestamp = window.moment(gs.chart.datepicker.start);
      var endTimestamp = window.moment(gs.chart.datepicker.end).endOf("day");
      var nowTimestamp = window.moment(new Date());
      var lastPointTimestamp = endTimestamp;
      var priceType = "median_bensin95";
      var priceTypeFallback = "median_bensin95";
      if (gs.chart.optSettings.petrolType === "bensin") {
        priceType = "median_bensin95";
        priceTypeFallback = "median_bensin95";
        if (gs.chart.optSettings.includeDiscount) {
          priceType = "median_bensin95_discount";
        }
      } else if (gs.chart.optSettings.petrolType === "diesel") {
        priceType = "median_diesel";
        priceTypeFallback = "median_diesel";
        if (gs.chart.optSettings.includeDiscount) {
          priceType = "median_diesel_discount";
        }
      }
      if (nowTimestamp < lastPointTimestamp) {
        lastPointTimestamp = nowTimestamp;
      }
      for (key in gs.priceTrendsData) {
        var pointBeforeStartTimestamp = null;
        var pointBeforeStartTimestampAdded = false;
        var dataset = {
          label: gs.chart.companies[key].label,
          pointStyle: "circle",
          borderColor: gs.chart.companies[key].borderColor,
          backgroundColor: gs.chart.companies[key].backgroundColor,
          lineTension: 0,
          borderWidth: 3,
          fill: false,
          data: [],
          radius: [],
          hitRadius: [],
          hoverRadius: []
        };
        var firstPoint = true;
        var lastValue = null;
        for (var i=0; i<gs.priceTrendsData[key].length; i++) {
          var usedPriceType = priceType;
          var pointTs = window.moment(gs.priceTrendsData[key][i].timestamp);
          if (gs.priceTrendsData[key][i][priceType] === null) {
            usedPriceType = priceTypeFallback;
          }
          var price = gs.priceTrendsData[key][i][usedPriceType];
          if (!(startTimestamp <= pointTs && pointTs <= endTimestamp)) {
            // skip drawing points which are outside selected dates
            if (pointTs < startTimestamp) {
              pointBeforeStartTimestamp = gs.priceTrendsData[key][i];
            }
            continue;
          }
          if (firstPoint) {
            firstPoint = false;
          }
          else {
            if (gs.priceTrendsData[key][i][usedPriceType] ===
              gs.priceTrendsData[key][i-1][usedPriceType]) {
              // skip drawing points with no change, this happens when we are
              // for example plotting bensin95 and get a change point where
              // only diesel price changed
              continue;
            }
            // hack to make Chart.js plot the graph in a specific visual way,
            // we create a fake point one minute before the next point with
            // same y value as previous point, this gives a 'constant' value
            // to the graph until a change happens
            dataset.data.push({
              x: window.moment(
                gs.priceTrendsData[key][i].timestamp
              ).subtract(
                1,
                "minute"
              ).format("YYYY-MM-DDTHH:mm"),
              y: gs.priceTrendsData[key][i-1][usedPriceType]
            });
            dataset.radius.push(0);
            dataset.hitRadius.push(0);
            dataset.hoverRadius.push(0);
          }
          if (pointBeforeStartTimestamp !== null &&
            !pointBeforeStartTimestampAdded) {
            // add two fake points to draw line from startTimestamp to draw
            // line from startTimestamp to first point (or endTimestamp if
            // there are no points within selected timeframe)
            dataset.data.push({
              x: startTimestamp,
              y: pointBeforeStartTimestamp[usedPriceType]
            });
            dataset.radius.push(0);
            dataset.hitRadius.push(0);
            dataset.hoverRadius.push(0);
            dataset.data.push({
              x: window.moment(
                gs.priceTrendsData[key][i].timestamp
              ).subtract(
                1,
                "minute"
              ).format("YYYY-MM-DDTHH:mm"),
              y: gs.priceTrendsData[key][i-1][usedPriceType]
            });
            dataset.radius.push(0);
            dataset.hitRadius.push(0);
            dataset.hoverRadius.push(0);
            pointBeforeStartTimestampAdded = true;
          }
          dataset.data.push({
            x: gs.priceTrendsData[key][i].timestamp,
            y: gs.priceTrendsData[key][i][usedPriceType]
          });
          dataset.radius.push(3);
          dataset.hitRadius.push(8);
          dataset.hoverRadius.push(6);
          var before = lastValue;
          if (before === null) {
            if (pointBeforeStartTimestamp !== null) {
              before = pointBeforeStartTimestamp[usedPriceType];
            }
          } 
          gs.trendsList.push({
            company: key,
            before: before,
            after: gs.priceTrendsData[key][i][usedPriceType],
            timestamp: gs.priceTrendsData[key][i].timestamp
          })
          lastValue = gs.priceTrendsData[key][i][usedPriceType];
        }
        // add fake point to draw a line from the last point to either selected
        // end date or current time
        dataset.data.push({
          x: lastPointTimestamp,
          y: lastValue
        });
        dataset.radius.push(0);
        dataset.hitRadius.push(0);
        dataset.hoverRadius.push(0);
        dataset.hidden = gs.chart.companies[key].hidden;
        gs.chart.data.datasets.push(dataset);
      }
      fulfil();
    }
    catch (err) {
      console.error(err);
      reject(err);
    }
  });
}

var arrangeTrendsListByTimestamp = function() {
  /**
   * Arranges trends list by timestamp, newest first
   */
  return new Promise(function (fulfil, reject) {
    try {
      gs.trendsList.sort(function (a, b) {
        return a.timestamp > b.timestamp ? -1 : 1;
      });
      fulfil();
    }
    catch (err) {
      console.error(err);
      reject(err);
    }
  });
}

var updateTrendsListToDom = function(stations) {
  /**
   * Creates Trend DOM objects and adds to listElement DOM.
   * Flushes everything from listElement beforehand.
   *
   * Each Trend DOM object looks like the following:
   * <div class="price-change atlantsolia increase" id="2017-02-25T09:15_ao">
   *   <h1>Atlantsolía</h1>
   *   <p class="timestamp">2017-02-25 09:15</p>
   *   <p class="change">
   *     195.2 ISK
   *     <i class="fa fa-arrow-right fa-lg" aria-hidden="true"></i>
   *     197.6 ISK
   *   </p>
   *   <p class="diff">
   *     + 2.4
   *     <i class="fa fa-chevron-circle-up fa-lg" aria-hidden="true"></i>
   *   </p>
   * </div>
   */
  return new Promise(function (fulfil, reject) {
    try {
      gs.listElement.innerHTML = ""; // flusing trends list from DOM
      for (var i=0; i<gs.trendsList.length; i++) {
        var diff = null;
        var diffClass = "";
        var diffSign = "";
        var diffShevron = "";
        if (gs.trendsList[i].before !== null) {
          diff = gs.trendsList[i].after - gs.trendsList[i].before;
          if (diff < 0) {
            diffClass = " decrease";
            diffSign = "- ";
            diffShevron = (
              " <i class=\"fa fa-chevron-circle-down fa-lg\"" +
              " aria-hidden=\"true\">" +
              "</i>"
            );
          } else {
            diffClass = " increase";
            diffSign = "+ ";
            diffShevron = (
              " <i class=\"fa fa-chevron-circle-up fa-lg\"" +
              " aria-hidden=\"true\">" +
              "</i>"
            );
          }
        }
        var className = (
          "price-change " +
          gs.chart.companies[gs.trendsList[i].company].class +
          diffClass
        );
        var priceChange = window.document.createElement("div");
        priceChange.setAttribute("class", className);
        var trend_key = (
          gs.trendsList[i].timestamp +
          "_" +
          gs.trendsList[i].company
        );
        priceChange.setAttribute("id", trend_key);
        var companyNameH1 = window.document.createElement("h1");
        companyNameH1.innerHTML = (
          gs.chart.companies[gs.trendsList[i].company].label
        );
        priceChange.appendChild(companyNameH1);
        var timestampP = window.document.createElement("p");
        timestampP.setAttribute("class", "timestamp");
        timestampP.innerHTML = gs.trendsList[i].timestamp.replace("T", " ");
        priceChange.appendChild(timestampP);
        var changeP = window.document.createElement("p");
        changeP.setAttribute("class", "change");
        if (diff !== null) {
          changeP.innerHTML = (
            gs.trendsList[i].before.toFixed(1) + " ISK " +
            "<i class=\"fa fa-arrow-right fa-lg\" aria-hidden=\"true\"></i> " +
            gs.trendsList[i].after.toFixed(1) + " ISK"
          );
          priceChange.appendChild(changeP);
          var diffP = window.document.createElement("p");
          diffP.setAttribute("class", "diff");
          diffP.innerHTML = (
            diffSign +
            window.Math.abs(diff).toFixed(1) +
            diffShevron
          );
          priceChange.appendChild(diffP);
        } else {
          changeP.innerHTML = gs.trendsList[1].after + " ISK";
          priceChange.appendChild(changeP);
        }
        priceChange.onclick = function() {
          showCustomTooltip(this.id);
        }
        gs.listElement.appendChild(priceChange);
      }
      fulfil();
    }
    catch (err) {
      console.error(err);
      reject(err);
    }
  });
}

var showCustomTooltip = function(priceChangeId) {
  /**
   * Makes the chart show tooltip for a specified price change point.
   * If provided priceChangeId is null, removes tooltip.
   **/
  return new Promise(function(fulfil, reject) {
    try {
      if (priceChangeId === null) {
        if (!gs.chart.options.customTooltip.show) {
          fulfil();
          return;
        }
        gs.chart.options.customTooltip.show = false;
      } else {
        gs.chart.options.customTooltip.show = true;
      }
      var idData = priceChangeId.split("_");
      if (
        gs.chart.options.customTooltip.timestamp === idData[0] &&
        gs.chart.options.customTooltip.company === (
          gs.chart.companies[idData[1]].label)
        ) {
        gs.chart.options.customTooltip.show = false;
        gs.chart.options.customTooltip.timestamp = null;
        gs.chart.options.customTooltip.company = null;
      } else {
        gs.chart.options.customTooltip.timestamp = idData[0];
        gs.chart.options.customTooltip.company = (
          gs.chart.companies[idData[1]].label
        );
      }
      gs.chart.ctx.update();
      fulfil();
    }
    catch (err) {
      console.error(err);
      reject(err);
    }
  });
}

var plotChart = function() {
  /**
   * Plot chart
   **/
  return new Promise(function(fulfil, reject) {
    try {
      gs.chart.ctx = new window.Chart(gs.chart.element, {
        type: "line",
        data: gs.chart.data,
        options: gs.chart.options
      });
      fulfil();
    }
    catch (err) {
      console.error(err);
      reject(err);
    }
  });
}

var clearChartAndData = function() {
  /**
   * Clear chart and data
   **/
  return new Promise(function(fulfil, reject) {
    try {
      gs.chart.ctx.destroy();
      gs.chart.data.datasets = [];
      fulfil();
    }
    catch (err) {
      console.error(err);
      reject(err);
    }
  });
}

var updateChartDataAndRedraw = function() {
  /**
   * DESTROY current chart, delete the data, then prepare new data according to
   * new setting parameters and completely REDRAW a new chart
   **/
  return new Promise(function(fulfil, reject) {
    try {
      clearChartAndData().then(function() {
        return prepareChartData();
      }).then(function() {
        return arrangeTrendsListByTimestamp();
      }).then(function() {
        return updateTrendsListToDom();
      }).then(function() {
        return plotChart();
      }).then(function() {
        fulfil();
      }).catch(function(err) {
        throw err;
      });
    }
    catch (err) {
      console.error(err);
      reject(err);
    }
  });
}

var updateChartOptionsUi = function() {
  /**
   * updates chart options
   **/
  return new Promise(function(fulfil, reject) {
    try {
      // update all company selection buttons
      var optUiElementIds = Object.keys(gs.chart.optUi);
      var tasks = [];
      for (i=0; i < optUiElementIds.length; i++) {
        tasks.push(updateCompanyButton(optUiElementIds[i]));
      }
      // update discount toggle button
      tasks.push(setDiscount(gs.chart.optSettings.includeDiscount));
      // update petrol type button
      tasks.push(updatePetrolSelectButton());
      // update start date input
      tasks.push(updateStartDate());
      // update end date input
      tasks.push(updateEndDate());
      Promise.all(tasks).then(function() {
        fulfil();
      }).catch(function(err) {
        throw err;
      });
    }
    catch (err) {
      console.error(err);
      reject(err);
    }
  });
}

var updateStartDate = function() {
  /**
   * update start date input element (uses pickadate.js jQuery plugin)
   **/
  return new Promise(function(fulfil, reject) {
    try {
      gs.chart.datepicker.startPicker.set(
        'max',
        new Date(gs.chart.datepicker.end)
      );
      fulfil();
    }
    catch (err) {
      console.error(err);
      reject(err);
    }
  });
}

var updateEndDate = function() {
  /**
   * update start date input element (uses pickadate.js jQuery plugin)
   **/
  return new Promise(function(fulfil, reject) {
    try {
      gs.chart.datepicker.endPicker.set(
        'min',
        new Date(gs.chart.datepicker.start)
      );
      fulfil();
    }
    catch (err) {
      console.error(err);
      reject(err);
    }
  });
}

var setupStartDatePicker = function() {
  /**
   * setup start date input element (uses pickadate.js jQuery plugin)
   **/
  return new Promise(function(fulfil, reject) {
    try {
      var input = $("#startDate").pickadate({
        min: new Date(gs.chart.datepicker.minimum),
        max: new Date(gs.chart.datepicker.end),
        container: "body",
        onSet: function(context) {
          if ("select" in context) {
            if (!isNaN(context.select)) {
              gs.chart.datepicker.start = context.select;
              if (gs.debug) {
                console.log("Setting new start date: ", context);
              }
            } else {
              if (gs.debug) {
                // Caused by inconsistency in pickadate.js, when initiated and
                // date set, the context.select is a list like [2016, 11, 1]
                // for December 1st 2016, however, when date is changed via
                // user interaction we get a nice unix timestamp instead, this
                // is the reason for the usage of isNaN above.
                console.log("context.select was not a number type: ", context);
              }
            }
          }
        },
        onClose: function() {
          updateEndDate().then(function() {
            return updateChartDataAndRedraw();
          });
        },
        onStart: function() {
          var date = new Date(gs.chart.datepicker.start);
          this.set(
            "select",
            [date.getFullYear(), date.getMonth(), date.getDate()]
          );
        }
      });
      gs.chart.datepicker.startInput = input;
      gs.chart.datepicker.startPicker = input.pickadate("picker");
      fulfil();
    }
    catch (err) {
      console.error(err);
      reject(err);
    }
  });
}

var setupEndDatePicker = function() {
  /**
   * setup end date input element (uses pickadate.js jQuery plugin)
   **/
  return new Promise(function(fulfil, reject) {
    try {
      var input = $("#endDate").pickadate({
        min: new Date(gs.chart.datepicker.start),
        max: true,
        container: "body",
        onSet: function(context) {
          if ("select" in context) {
            if (!isNaN(context.select)) {
              gs.chart.datepicker.end = context.select;
              if (gs.debug) {
                console.log("Setting new start date: ", context);
              }
            } else {
              if (gs.debug) {
                // Caused by inconsistency in pickadate.js, when initiated and
                // date set, the context.select is a list like [2016, 11, 1]
                // for December 1st 2016, however, when date is changed via
                // user interaction we get a nice unix timestamp instead, this
                // is the reason for the usage of isNaN above.
                console.log("context.select was not a number type: ", context);
              }
            }
          }
          
        },
        onClose: function() {
          updateStartDate().then(function() {
            return updateChartDataAndRedraw();
          });
        },
        onStart: function() {
          var date = new Date(gs.chart.datepicker.end);
          this.set(
            "select",
            [date.getFullYear(), date.getMonth(), date.getDate()]
          );
        }
      });
      gs.chart.datepicker.endInput = input;
      gs.chart.datepicker.endPicker = input.pickadate("picker");
      fulfil();
    }
    catch (err) {
      console.error(err);
      reject(err);
    }
  });
}

var pressCompanyButton = function(elementId) {
  /**
   * Handle company button press event
   **/
  return new Promise(function(fulfil, reject) {
    try {
      var companyIds = Object.keys(gs.chart.companies);
      var companyId = elementId.substring(0, 2);
      var datasetNumber = companyIds.indexOf(companyId);
      if (datasetNumber === -1) {
        throw new Error("Unknown companyId: "+companyId);
      }
      if (gs.chart.companies[companyId].hidden) {
        gs.chart.optUi[elementId].className = gs.chart.selectedClass;
        gs.chart.companies[companyId].hidden = false;
        gs.chart.ctx.data.datasets[datasetNumber].hidden = false;
      } else {
        gs.chart.optUi[elementId].className = gs.chart.deselectedClass;
        gs.chart.companies[companyId].hidden = true;
        gs.chart.ctx.data.datasets[datasetNumber].hidden = true;
      }
      gs.chart.ctx.update();
      updateCompanyButton(elementId).then(function() {
        fulfil();
      }).catch(function(err) {
        throw err;
      });
    }
    catch (err) {
      console.error(err);
      reject(err);
    }
  });
}

var updateCompanyButton = function(elementId) {
  /**
   * update company button
   **/
  return new Promise(function(fulfil, reject) {
    try {
      var companyIds = Object.keys(gs.chart.companies);
      var companyId = elementId.substring(0, 2);
      var datasetNumber = companyIds.indexOf(companyId);
      if (datasetNumber === -1) {
        throw new Error("Unknown companyId: "+companyId);
      }
      if (gs.chart.companies[companyId].hidden) {
        gs.chart.optUi[elementId].className = gs.chart.deselectedClass;
      } else {
        gs.chart.optUi[elementId].className = gs.chart.selectedClass;
      }
      fulfil();
    }
    catch (err) {
      console.error(err);
      reject(err);
    }
  });
}

var pressPetrolSelectButton = function(elementId) {
  /**
   * Handle petrol selection button toggle
   **/
  return new Promise(function(fulfil, reject) {
    try {
      if (elementId === "bensinSelector") {
        gs.chart.optSettings.petrolType = "bensin";
      } else if (elementId === "dieselSelector") {
        gs.chart.optSettings.petrolType = "diesel";
      }
      updatePetrolSelectButton().then(function() {
        return updateChartDataAndRedraw();
      }).then(function() {
        fulfil();
      }).catch(function(err) {
        throw err;
      });
    }
    catch (err) {
      console.error(err);
      reject(err);
    }
  });
}

var updatePetrolSelectButton = function() {
  /**
   * update petrol selection button
   **/
  return new Promise(function(fulfil, reject) {
    try {
      if (gs.chart.optSettings.petrolType === "bensin") {
        gs.chart.optSettings.bensinButton.className = gs.chart.selectedClass;
        gs.chart.optSettings.dieselButton.className = gs.chart.deselectedClass;
      } else if (gs.chart.optSettings.petrolType === "diesel") {
        gs.chart.optSettings.dieselButton.className = gs.chart.selectedClass;
        gs.chart.optSettings.bensinButton.className = gs.chart.deselectedClass;
      }
      fulfil();
    }
    catch (err) {
      console.error(err);
      reject(err);
    }
  });
}

var toggleDiscount = function() {
  /**
   * Toggle showing price with discount in chart on and off
   **/
  return new Promise(function(fulfil, reject) {
    try {
      setDiscount(!gs.chart.optSettings.includeDiscount).then(function() {
        return updateChartDataAndRedraw();
      }).then(function() {
        fulfil();
      }).catch(function(err) {
        throw err;
      });
    }
    catch (err) {
      console.error(err);
      reject(err);
    }
  });
}

var setDiscount = function(value) {
  /**
   * Toggle showing price with discount in chart on and off
   **/
  return new Promise(function(fulfil, reject) {
    try {
      if (value) {
        gs.chart.optSettings.discountButton.className = gs.chart.selectedClass;
        gs.chart.optSettings.includeDiscount = true;
      } else {
        gs.chart.optSettings.discountButton.className = (
          gs.chart.deselectedClass
        );
        gs.chart.optSettings.includeDiscount = false;
      }
      fulfil();
    }
    catch (err) {
      console.error(err);
      reject(err);
    }
  });
}

var readUrlParams = function(value) {
  /**
   * reads parameters from url and sets appropriate parameters in gs
   **/
  return new Promise(function(fulfil, reject) {
    try {
      gs.urlParams = new window.URLSearchParams(window.location.search);
      // debug parameter
      if (gs.urlParams.has("debug") && gs.urlParams.get("debug") === "true") {
        gs.debug = true;
      }
      // companies parameter
      if (gs.urlParams.has("companies")) {
        var companyIds = Object.keys(gs.chart.companies);
        var companiesInUrl = gs.urlParams.get("companies").split("-");
        for (i=0; i < companyIds.length; i++) {
          var companyId = companyIds[i];
          if (companiesInUrl.indexOf(companyIds[i]) > -1) {
            gs.chart.companies[companyId].hidden = false;
          } else {
            gs.chart.companies[companyIds[i]].hidden = true;
          }
        }
        if (gs.debug) {
          for (i=0; i < companiesInUrl.length; i++) {
            if (!(companyIds.indexOf(companiesInUrl[i]) > -1)) {
              console.warn((
                "readUrlParams: " +
                "Unknown company id in url parameter \"companies\": \"" +
                companiesInUrl[i] +
                "\""
              ));
            }
          }
        }
      }
      // end parameter
      if (gs.urlParams.has("end")) {
        var endDate = gs.urlParams.get("end");
        var dateFormat = "YYYY-MM-DD";
        var strictMode = true;
        if (window.moment(endDate, dateFormat, strictMode).isValid()) {
          var endDateMoment = window.moment(endDate, dateFormat);
          var unixTime = endDateMoment._d.getTime();
          var today = window.moment(new Date()).startOf("day");
          var tomorrow = (
            window.moment(new Date()).startOf("day").add(1, "days")
          );
          if ((unixTime >= gs.chart.datepicker.minimum) &&
            (unixTime < tomorrow._d.getTime())) {
            gs.chart.datepicker.end = unixTime;
          } else {
            gs.chart.datepicker.end = today._d.getTime();
            if (gs.debug) {
              console.warn((
                "readUrlParams: " +
                "Url parameter \"end\": \"" +
                startDate +
                "\" must be within the range of [2016-04-19|startDate, now]" +
                ", defaulting to today"
              ));
            }
          }
        } else {
          if (gs.debug) {
            console.warn((
              "readUrlParams: " +
              "Url parameter \"end\": \"" +
              endDate +
              "\" is not on the format " + dateFormat
            ));
          }
        }
      }
      // start parameter
      if (gs.urlParams.has("start")) {
        var startDate = gs.urlParams.get("start");
        var dateFormat = "YYYY-MM-DD";
        var strictMode = true;
        if (window.moment(startDate, dateFormat, strictMode).isValid()) {
          var startDateMoment = window.moment(startDate, dateFormat);
          var unixTime = startDateMoment._d.getTime();
          if ((unixTime >= gs.chart.datepicker.minimum) &&
            (unixTime < gs.chart.datepicker.end)) {
            gs.chart.datepicker.start = unixTime;
          } else {
            gs.chart.datepicker.start = gs.chart.datepicker.minimum;
            if (gs.debug) {
              console.warn((
                "readUrlParams: " +
                "Url parameter \"start\": \"" +
                startDate +
                "\" must be within the range of [2016-04-19, endDate|now]" +
                ", defaulting to date 2016-04-19"
              ));
            }
          }
        } else {
          if (gs.debug) {
            console.warn((
              "readUrlParams: " +
              "Url parameter \"start\": \"" +
              startDate +
              "\" is not on the format " + dateFormat +
              ", defaulting to date 2016-04-19"
            ));
          }
        }
      }
      // petrol parameter
      if (gs.urlParams.has("petrol")) {
        if (gs.urlParams.get("petrol") === "bensin") {
          gs.chart.optSettings.petrolType = "bensin";
        } else if (gs.urlParams.get("petrol") === "diesel") {
          gs.chart.optSettings.petrolType = "diesel";
        }
      }
      // discount parameter
      if (gs.urlParams.has("discount") &&
        gs.urlParams.get("discount") === "true") {
        setDiscount(true);
      } else {
        setDiscount(false);
      }
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
 * Knit together promising task functions
 **/

var runClient = function() {
  fetchPriceTrendsData().then(function () {
    return readUrlParams();
  }).then(function() {
    return prepareChartData();
  }).then(function() {
    return arrangeTrendsListByTimestamp();
  }).then(function() {
    return updateTrendsListToDom();
  }).then(function() {
    return plotChart();
  }).then(function() {
    return setupStartDatePicker();
  }).then(function() {
    return setupEndDatePicker();
  }).then(function() {
    return updateChartOptionsUi();
  });
}


/**
 * ========================================================================== *
 * Initialization
 **/

var initialize = function() {
  /**
   * Sets some parameters in the global scope gs, puts configuration parameters
   * in their places, reads optional url parameters, polyfills things if
   * necessary, then initializes the web client
   */
  // set DOM pointers into gs
  gs.listElement = window.document.getElementById("listElement");
  gs.chart.optSettings.bensinButton = (
    window.document.getElementById("bensinSelector")
  );
  gs.chart.optSettings.dieselButton = (
    window.document.getElementById("dieselSelector")
  );
  gs.chart.optSettings.discountButton = (
    window.document.getElementById("discountToggler")
  );
  gs.chart.element = window.document.getElementById(gs.chart.elementId);
  var optUiElementIds = Object.keys(gs.chart.optUi);
  for (i=0; i < optUiElementIds.length; i++) {
    var elementId = optUiElementIds[i];
    gs.chart.optUi[elementId] = window.document.getElementById(elementId);
  }
  // set datepicker date restriction params into gs
  var minimum = 1461024000000; //(new Date(2016, 3, 19)).getTime() //2016-04-19
  gs.chart.datepicker.minimum = minimum;
  gs.chart.datepicker.start = minimum;
  gs.chart.datepicker.end = (
    window.moment(new Date()).startOf("day")._d.getTime()
  );
  runClient();
}();
