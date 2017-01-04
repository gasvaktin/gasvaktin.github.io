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
 **/

var gs = {  /* Global Scope Paramteters */
  debug: false,
  punctualityData: null,
  dataEndpoint: "https://raw.githubusercontent.com/gasvaktin/gasvaktin/master/vaktin/punctuality.min.json",
  chart: {
    element: null,
    ctx: null,
    data: {
      datasets: []
    },
    options: {
      scales: {
        xAxes: [{
          type: 'time',
          position: 'bottom',
          time: {
            unit: 'month'
          }
        }]
      },
      elements: {
        point: {
          radius: 0,
          hitRadius: 10,
          hoverRadius: 3
        }
      }
    },
    companies: {
      ao: {
        label: "Atlantsolía",
        borderColor: "#FFCF42",
        backgroundColor: "#FFCF42"
      },
      dn:  {
        label: "Dælan",
        borderColor: "#000000",
        backgroundColor: "#e00a1b"
      },
      n1:  {
        label: "N1",
        borderColor: "#ea202d",
        backgroundColor: "#ea202d"
      },
      ob:  {
        label: "ÓB",
        borderColor: "#7AD09F",
        backgroundColor: "#fde633"
      },
      ol:  {
        label: "Olís",
        borderColor: "#13914a",
        backgroundColor: "#13914a"
      },
      or:  {
        label: "Orkan",
        borderColor: "#ea5ca0",
        backgroundColor: "#F284B8"
      },
      ox:  {
        label: "Orkan X",
        borderColor: "#e8168c",
        backgroundColor: "#e8168c"
      },
      sk:  {
        label: "Skeljungur",
        borderColor: "#f58f31",
        backgroundColor: "#f8d33e"
      }
    }
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
    window.fetch(gs.dataEndpoint).then(function(response) {
      return response.json()
    }).then(function(data) {
      if (gs.debug) {
        console.log("Got the following petrol data:");
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
      for (key in gs.punctualityData) {
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
        for (var i=0; i<gs.punctualityData[key].length; i++) {
          if (firstPoint) {
            firstPoint = false;
          }
          else {
            if (gs.punctualityData[key][i].median_bensin95 ===
              gs.punctualityData[key][i-1].median_bensin95) {
              // skip drawing points with no change, this happens when we're
              // for example plotting bensin95 and get a change point where
              // only diesel price changed
              continue;
            }
            // hack to make Chart.js plot the graph in a specific way
            // we create a fake point one minute before the next point with
            // same y value as previous point
            dataset.data.push({
              x: window.moment(gs.punctualityData[key][i].timestamp).subtract(
                1, "minute").format("YYYY-MM-DDTHH:mm"),
              y: gs.punctualityData[key][i-1].median_bensin95
            });
            dataset.radius.push(0);
            dataset.hitRadius.push(0);
            dataset.hoverRadius.push(0);
          }
          // push 
          dataset.data.push({
            x: gs.punctualityData[key][i].timestamp,
            y: gs.punctualityData[key][i].median_bensin95
          });
          dataset.radius.push(3);
          dataset.hitRadius.push(8);
          dataset.hoverRadius.push(6);
        }
        var lastPoint = gs.punctualityData[key].length-1
        dataset.data.push({
          x: window.moment(window.moment.now()).format("YYYY-MM-DDTHH:mm"),
          y: gs.punctualityData[key][lastPoint].median_bensin95
        });
        dataset.radius.push(0);
        dataset.hitRadius.push(0);
        dataset.hoverRadius.push(0);
        gs.chart.data.datasets.push(dataset);
      }
      // TODO: finish implementing
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
   * Process and prepare punctuality data for visual demonstration
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

/**
 * ========================================================================== *
 * Knit together promising task functions
 **/

var runClient = function() {
  // TODO: implement
  fetchPunctualityData().then(function () {
    return prepareChartData();
  }).then(function() {
    return plotChart();
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
  if (window.location.search.indexOf("?debug=true") !== -1 ||
      window.location.search.indexOf("&debug=true") !== -1) {
    // set debug to true if GET parameter debug=true is provided in url
    gs.debug = true;
  }
  gs.chart.element = window.document.getElementById("punctualityChart");
  //gs.chart.data = {
  //  datasets: [{
  //    label: "N1",
  //    pointStyle: "circle",
  //    borderColor: "#ea202d",
  //    backgroundColor: "#f74b58",
  //    lineTension: 0,
  //    fill: false,
  //    data: [{
  //      x: "2016-12-30T23:08",
  //      y: 1.5
  //    }, {
  //      x: "2017-01-01T00:07",
  //      y: 1.5
  //    }, {
  //      x: "2017-01-01T00:08",
  //      y: 10
  //    }, {
  //      x: "2017-01-02T12:07",
  //      y: 10
  //    }, {
  //      x: "2017-01-02T12:08",
  //      y: 5
  //    }],
  //    radius: [3, 0, 3, 0, 3],
  //    hitRadius: [8, 0, 8, 0, 8],
  //    hoverRadius: [6, 0, 6, 0, 6]
  //  //}, {
  //  //  label: "Kappa Dataset",
  //  //  lineTension: 0,
  //  //  pointStyle: "dash",
  //  //  data: [{
  //  //    x: "2016-12-30T23:08",
  //  //    y: 0
  //  //  }, {
  //  //    x: "2017-01-01T00:08",
  //  //    y: 8
  //  //  }, {
  //  //    x: "2017-01-02T12:08",
  //  //    y: 6
  //  //  }]
  //  }]
  //}
  //gs.chart.ctx = new window.Chart(gs.chart.element, {
  //  type: "line",
  //  data: gs.chart.data,
  //  options: gs.chart.options
  //});
  // TODO: initialize more things if needed
  runClient();
}();

