"use-strict";
/**
 * ========================================================================== *
 * Punctuality Page Script.
 * 
 * Prerequisites:
 * - window.fetch (is to be standard in all browsers but currently isn't, we're
 *   using the following polyfill: https://www.npmjs.com/package/whatwg-fetch)
 * - window.Promise (supported by all browsers as far as I know, but included a
 *   fallback polyfill just in case)
 * - Chart.js (in window.Chart)
 * - Moment.js (in window.moment)
 * - pickadate.js (jQuery plugin *cry*, adds some crazy shit to jQuery)
 **/

var gs = {  /* Global Scope Paramteters */
  urlParams: null,
  debug: false,
  punctualityData: null,
  dataDomain: "https://raw.githubusercontent.com",
  dataLocation: "/gasvaktin/gasvaktin/master/vaktin/punctuality.min.json",
  chart: {
    elementId: "punctualityChart",
    element: null,
    ctx: null,
    data: {
      datasets: []
    },
    options: {
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
        borderColor: "#FFCF42",
        backgroundColor: "#FFCF42",
        hidden: false
      },
      dn:  {
        label: "Dælan",
        borderColor: "#000000",
        backgroundColor: "#e00a1b",
        hidden: false
      },
      n1:  {
        label: "N1",
        borderColor: "#ea202d",
        backgroundColor: "#ea202d",
        hidden: false
      },
      ob:  {
        label: "ÓB",
        borderColor: "#7AD09F",
        backgroundColor: "#fde633",
        hidden: false
      },
      ol:  {
        label: "Olís",
        borderColor: "#13914a",
        backgroundColor: "#13914a",
        hidden: false
      },
      or:  {
        label: "Orkan",
        borderColor: "#ea5ca0",
        backgroundColor: "#F284B8",
        hidden: false
      },
      ox:  {
        label: "Orkan X",
        borderColor: "#e8168c",
        backgroundColor: "#e8168c",
        hidden: false
      },
      sk:  {
        label: "Skeljungur",
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
  }
}


/**
 * ========================================================================== *
 * Promising functions for specific tasks
 **/

var fetchPunctualityData = function() {
  /**
   * Fetch the juicy datalicious punctuality data
   **/
  return new Promise(function(fulfil, reject) {
    window.fetch(gs.dataDomain + gs.dataLocation).then(function(response) {
      return response.json()
    }).then(function(data) {
      if (gs.debug) {
        console.log("Got the following punctuality data:");
        console.log(data);
      }
      gs.punctualityData = data;
      fulfil();
    }).catch(function(err) {
      console.error(err);
      reject(err);
    });
  });
}

var prepareChartData = function() {
  /**
   * Process and prepare punctuality data for visual demonstration
   **/
  return new Promise(function(fulfil, reject) {
    try {
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
      for (key in gs.punctualityData) {
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
        for (var i=0; i<gs.punctualityData[key].length; i++) {
          var pointTs = window.moment(gs.punctualityData[key][i].timestamp);
          var price = gs.punctualityData[key][i][priceType];
          if (gs.punctualityData[key][i][priceType] === null) {
            priceType = priceTypeFallback;
          }
          if (!(startTimestamp <= pointTs && pointTs <= endTimestamp)) {
            // skip drawing points which are outside selected dates
            if (pointTs < startTimestamp) {
              pointBeforeStartTimestamp = gs.punctualityData[key][i];
            }
            continue;
          }
          if (firstPoint) {
            firstPoint = false;
          }
          else {
            if (gs.punctualityData[key][i][priceType] ===
              gs.punctualityData[key][i-1][priceType]) {
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
                gs.punctualityData[key][i].timestamp
              ).subtract(
                1,
                "minute"
              ).format("YYYY-MM-DDTHH:mm"),
              y: gs.punctualityData[key][i-1][priceType]
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
              y: pointBeforeStartTimestamp[priceType]
            });
            dataset.radius.push(0);
            dataset.hitRadius.push(0);
            dataset.hoverRadius.push(0);
            dataset.data.push({
              x: window.moment(
                gs.punctualityData[key][i].timestamp
              ).subtract(
                1,
                "minute"
              ).format("YYYY-MM-DDTHH:mm"),
              y: gs.punctualityData[key][i-1][priceType]
            });
            dataset.radius.push(0);
            dataset.hitRadius.push(0);
            dataset.hoverRadius.push(0);
            pointBeforeStartTimestampAdded = true;
          }
          dataset.data.push({
            x: gs.punctualityData[key][i].timestamp,
            y: gs.punctualityData[key][i][priceType]
          });
          dataset.radius.push(3);
          dataset.hitRadius.push(8);
          dataset.hoverRadius.push(6);
          lastValue = gs.punctualityData[key][i][priceType];
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
        plotChart();
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
      updateChartDataAndRedraw().then(function() {
        fulfil();
      });
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
      updateChartDataAndRedraw().then(function() {
        fulfil();
      });
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
          updateEndDate();
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
          updateStartDate();
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
  fetchPunctualityData().then(function () {
    return readUrlParams();
  }).then(function() {
    return prepareChartData();
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
