"use-strict";
/**
 * ========================================================================== *
 * Gasvaktin Map Client Script.
 * 
 * Prerequisites:
 * - window.fetch (is to be standard in all browsers but currently isn't, we're
 *   using the following polyfill: https://www.npmjs.com/package/whatwg-fetch)
 * - window.Promise (supported by all browsers as far as I know, but included a
 *   fallback polyfill just in case)
 * - GoogleMapsLoader (Google Maps JS package, using the following:
 *   https://www.npmjs.com/package/google-maps)
 * - jQuery (this one could kinda easily be removed, but it's already needed for
 *   the Twitter Bootstrap front-end framework so it's been tempting to use it
 *   for a few things)
 * - GeoUtils.js (simple JS module for calculating distances between geolocation
 *   coordinates)
 **/

var gs = {  /* Global Scope Paramteters */
  urlParams: null,
  debug: false,
  p: {},
  data: {},
  dataEndpoint: "https://raw.githubusercontent.com/gasvaktin/gasvaktin/master/vaktin/gas.min.json",
  stations: {},
  googleMaps: null, // google.maps object given by GoogleMapsLoader.load
  googleMapsSettings: {
    key: "AIzaSyAS6Yp_1JOJKo0O1FGC24h-nlk66wFZ_78",
    libraries: ["geometry", "places"],
    language: "en",
    region: "IS"
  },
  map: null, // google.maps.Map object
  mapOptions: {
    center: { lat: 64.996752, lng: -18.682185 }, // center of Iceland
    disableDefaultUI: true,
    zoom: 5 // initial zoom
  },
  userLocation: {
    lat: null,
    lng: null
  },
  userMarker: null, // google maps marker object
  stationMarkers: [],
  stationMarker: null, // google maps marker object
  geoLocation: {
    location: null, // location object from window.navigator.geolocation
    statuses: { initial: 0, success: 1, failure: 2 },
    status: 0, // initial status
    settings: { // settings for geolocation.getCurrentPosition
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0
    },
    centerOfIceland: { lat: 64.996752, lng: -18.682185 }
  },
  mapElement: null, // DOM element object
  localStorage: null, // window.localStorage or polyfill if needed
  localStorageWorks: null, // function to test window.localStorage
  fuelTypes: {
    petrol: "petrol",
    diesel: "diesel"
  }
};

/**
 * ========================================================================== *
 * Promising functions for doing specific tasks, knitted together further down.
 **/

var calculateStationDistances = function() {
  /**
   * Calculates distances from users location to each station.
   */
  return new Promise(function (fulfil, reject) {
    try {
      for (var key in gs.stations) {
        gs.stations[key].distance = GeoUtils.distanceBetweenPointsFaster(
          gs.geoLocation.location.coords.latitude,
          gs.geoLocation.location.coords.longitude,
          gs.stations[key].geo.lat,
          gs.stations[key].geo.lon
        );
      }
      fulfil();
    }
    catch (err) {
      console.error(err);
      reject(err);
    }
  });
}

var updateMapVision = function() {
  /**
   * Updates map vision, location and zoom level.
   */
  return new Promise(function (fulfil, reject) {
    try {
      if (gs.geoLocation.location === null) {
        gs.map.setCenter({
          lat: gs.stationMarker.position.lat(),
          lng: gs.stationMarker.position.lng()
        });
        gs.map.setZoom(9);
        return;
      }
      var center = GeoUtils.pointBetweenPoints(
        gs.userMarker.position.lat(),
        gs.userMarker.position.lng(),
        gs.stationMarker.position.lat(),
        gs.stationMarker.position.lng()
      );
      gs.map.setCenter({
        lat: center.latitude,
        lng: center.longitude
      });
      var pointA = new gs.googleMaps.LatLng(
        gs.userMarker.position.lat(),
        gs.userMarker.position.lng()
      );
      var pointB = new gs.googleMaps.LatLng(
        gs.stationMarker.position.lat(),
        gs.stationMarker.position.lng()
      );
      // Google Maps API has silly zoom functionality ..
      // http://stackoverflow.com/a/15719995/2401628
      if (gs.userMarker.position.lat() > gs.stationMarker.position.lat()) {
        if (gs.userMarker.position.lng() > gs.stationMarker.position.lng()) {
          gs.map.fitBounds(new gs.googleMaps.LatLngBounds(pointB, pointA));
        }
        else {
          gs.map.fitBounds(new gs.googleMaps.LatLngBounds(pointA, pointB));
        }
      }
      else if (gs.userMarker.position.lng() < gs.stationMarker.position.lng()) {
        gs.map.fitBounds(new gs.googleMaps.LatLngBounds(pointA, pointB));
      }
      else {
        gs.map.fitBounds(new gs.googleMaps.LatLngBounds(pointB, pointA));
      }
      fulfil();
    }
    catch (err) {
      console.error(err);
      reject(err);
    }
  });
}

var loadGoogleMapsAPI = function() {
  /**
   * Initialize the Google Maps API
   **/
  return new Promise(function(fulfil, reject) {
    try {
      GoogleMapsLoader.load(function(google) {
        gs.googleMaps = google.maps;
        gs.map = new google.maps.Map(gs.mapElement, gs.mapOptions);
        gs.userMarker = new google.maps.Marker({
          position: gs.geoLocation.centerOfIceland,
          map: gs.map,
          title: "Your location",
          icon: {
            url: "/images/markers/pulse.svg",
            anchor: new google.maps.Point(10, 10)
          },
          zIndex: 10
        });
        let infoWindow = new google.maps.InfoWindow({
          content: '<span><i class="fa fa-map-marker Nav__logo" aria-hidden="true"></i> Your location</span>'
        });
        google.maps.event.addListener(gs.userMarker, 'click', function() {
          infoWindow.open(gs.map, gs.userMarker);
        });
        gs.userMarker.setVisible(false);
        gs.stationMarker = new google.maps.Marker({
          position: gs.geoLocation.centerOfIceland,
          map: gs.map,
          title: "Selected station location",
          icon: "/images/markers/gasstation.png"
        });
        gs.stationMarker.setVisible(false);
        fulfil();
      });
    }
    catch (err) {
      console.error(err);
      reject(err);
    }
  });
}

var fetchGasPrice = function() {
  /**
   * Fetch them gas prices
   **/
  return new Promise(function(fulfil, reject) {
    window.fetch(gs.dataEndpoint).then(function(response) {
      return response.json()
    }).then(function(data) {
      gs.data.gas = data;
      if (gs.debug) {
        console.log("Got the following petrol data:");
        console.log(data);
      }
      for (var i=0; i<data.stations.length; i++) {
        gs.stations[data.stations[i].key] = data.stations[i];
      }
      fulfil();
    }).catch(function(err) {
      console.error(err);
      reject(err);
    });
  });
}

var markStationsOnMap = function() {
  /**
   * Mark them fuel stations on the map
   **/
  return new Promise(function(fulfil, reject) {
    try {
      let stations = gs.data.gas.stations;
      let price_cheapest = null;
      let price_cheap_1 = null;
      let price_cheap_2 = null;
      let price_cheap_3 = null;
      let price_average = null;
      let price_expen_1 = null;
      let price_expen_2 = null;
      let price_expen_3 = null;
      let price_expensive = null;
      for (var i=0; i<stations.length; i++) {
        let station = stations[i];
        if (price_cheapest === null || station.bensin95 < price_cheapest) {
          price_cheapest = station.bensin95
        }
        if (price_expensive === null || station.bensin95 > price_expensive) {
          price_expensive = station.bensin95
        }
      }
      price_average = Number(((price_cheapest + price_expensive) / 2).toFixed(1));
      price_cheap_2 = Number(((price_cheapest + price_average) / 2).toFixed(1));
      price_cheap_1 = Number(((price_cheapest + price_cheap_2) / 2).toFixed(1));
      price_cheap_3 = Number(((price_cheap_2 + price_average) / 2).toFixed(1));
      price_expen_2 = Number(((price_average + price_expensive) / 2).toFixed(1));
      price_expen_1 = Number(((price_average + price_expen_2) / 2).toFixed(1));
      price_expen_3 = Number(((price_expen_2 + price_expensive) / 2).toFixed(1));
      console.log([
        price_cheapest,
        price_cheap_1,
        price_cheap_2,
        price_cheap_3,
        price_average,
        price_expen_1,
        price_expen_2,
        price_expen_3,
        price_expensive
      ]);
      for (var i=0; i<stations.length; i++) {
        let station = stations[i];
        let markerUrl = null;
        let zIndex = 1;
        if (station.bensin95 === price_cheapest) {
          markerUrl = "/images/markers/dot_green_1.svg";
          zIndex = 9;
        } else if (station.bensin95 < price_cheap_1) {
          markerUrl = "/images/markers/dot_green_2.svg";
          zIndex = 9;
        } else if (station.bensin95 < price_cheap_2) {
          markerUrl = "/images/markers/dot_green_3.svg";
          zIndex = 8;
        } else if (station.bensin95 < price_cheap_3) {
          markerUrl = "/images/markers/dot_yellow_1.svg";
          zIndex = 7;
        } else if (station.bensin95 < price_average) {
          markerUrl = "/images/markers/dot_yellow_2.svg";
          zIndex = 6;
        } else if (station.bensin95 < price_expen_1) {
          markerUrl = "/images/markers/dot_yellow_3.svg";
          zIndex = 5;
        } else if (station.bensin95 < price_expen_2) {
          markerUrl = "/images/markers/dot_red_1.svg";
          zIndex = 4;
        } else if (station.bensin95 < price_expen_3) {
          markerUrl = "/images/markers/dot_red_2.svg";
          zIndex = 3;
        } else if (station.bensin95 < price_expensive) {
          markerUrl = "/images/markers/dot_red_3.svg";
          zIndex = 2;
        } else {
          markerUrl = "/images/markers/dot_red_3.svg";
          zIndex = 1;
        }
        let stationMarker = new gs.googleMaps.Marker({
          position: {lat: station.geo.lat, lng: station.geo.lon},
          map: gs.map,
          title: `${station.company} - ${station.name}`,
          icon: {
            url: markerUrl,
            anchor: new google.maps.Point(10, 10)
          },
          zIndex: zIndex
        });
        let companyIconPath = "/images/markers/gasstation.png";
        if (station.company === "Atlantsolía") {
          companyIconPath = "/images/companies/atlantsolia.png";
        } else if (station.company === "Costco Iceland") {
          companyIconPath = "/images/companies/costco.png";
        } else if (station.company === "N1") {
          companyIconPath = "/images/companies/n1.png";
        } else if (station.company === "Olís") {
          companyIconPath = "/images/companies/olis.png";
        } else if (station.company === "ÓB") {
          companyIconPath = "/images/companies/ob.png";
        } else if (station.company === "Orkan") {
          companyIconPath = "/images/companies/orkan.png";
        }
        let imgElement = (
          `<img src="${companyIconPath}"` +
          ` style="width:36px;position:absolute;pointer-events:none;user-select:none;" />`
        );
        let infoName = `<span style="padding-left:42px;">${station.company} ${station.name}</span>`;
        let discountBensin = "";
        let discountDiesel = "";
        if (station.bensin95_discount !== null) {
          discountBensin = (
            ` <span style="font-size:7px">(m afsl: ${station.bensin95_discount} ISK)</span>`
          );
        }
        if (station.diesel_discount !== null) {
          discountDiesel = (
            ` <span style="font-size:7px">(m afsl: ${station.diesel_discount} ISK)</span>`
          );
        }
        let infoPrice = (
          `<br/><span style="padding-left:42px;font-size:10px;"><b>Bensin:</b> ${station.bensin95} ISK` +
          discountBensin +
          `</span>` +
          `<br/><span style="padding-left:42px;font-size:10px;"><b>Diesel:</b> ${station.diesel} ISK` +
          discountDiesel +
          `</span>`
        );
        let infoWindow = new google.maps.InfoWindow({
          content: (
            imgElement + infoName + infoPrice
          )
        });
        gs.googleMaps.event.addListener(stationMarker, 'click', function() {
          infoWindow.open(gs.map, stationMarker);
        });
        gs.foo = infoWindow;
      }
      document.getElementById("cheapest").innerHTML = `${price_cheapest} ISK`;
      document.getElementById("average").innerHTML = `${price_average} ISK`;
      document.getElementById("expensive").innerHTML = `${price_expensive} ISK`;
      document.getElementById("scale").value = "0" 
    }
    catch (err) {
      console.error(err);
      reject(err);
    }
  });
}

/**
 * Ask for some sweet sweet geolocation data
 **/

var getCurrentUserPosition = function() {
  /**
   * Updates station marker to first station in list if key is undefined, else
   * to station with provided key.
   */
  return new Promise(function (fulfil, reject) {
    try {
      window.navigator.geolocation.getCurrentPosition(
        function(pos) { // successful getting geolocation
          gs.geoLocation.location = pos;
          var crd = pos.coords;
          if (gs.debug) {
            console.log((
              "Successfully received geolocation.\n"+
              "Your current location is:\n"+
              "Latitude: "+crd.latitude+"\n"+
              "Longitude: "+crd.longitude+"\n"+
              "with a delta of " + crd.accuracy + " meters."
            ));
          }
          gs.geoLocation.status = 1;
          gs.userLocation.lat = crd.latitude;
          gs.userLocation.lng = crd.longitude;
          gs.userMarker.setPosition({
            lat: crd.latitude,
            lng: crd.longitude
          });
          gs.userMarker.setVisible(true);
          fulfil();
        },
        function(err) {
          if (gs.debug) {
            console.warn("Failed to receive geolocation.");
            console.warn(err);
          }
          gs.geoLocation.status = 2;
          // calling fulfil here because failing (usually) means the user
          // declined giving geolocation information to the webpage
          fulfil();
        },
        gs.geoLocation.settings
      );
    }
    catch (err) {
      console.error(err);
      reject(err);
    }
  });
}

/**
 * ========================================================================== *
 * Knit together our very promising functions
 **/

var runClient = function() {
  Promise.all([
    loadGoogleMapsAPI().then(function() {
      return getCurrentUserPosition();
    }),
    fetchGasPrice()
  ]).then(function() {
    return markStationsOnMap();
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
    // set debug to true if GET parameter debug=true is provided in url
    gs.debug = true;
  }
  // Set settings for GoogleMapsLoader
  window.GoogleMapsLoader.KEY = gs.googleMapsSettings.key;
  window.GoogleMapsLoader.LIBRARIES = gs.googleMapsSettings.libraries;
  window.GoogleMapsLoader.LANGUAGE = gs.googleMapsSettings.language;
  window.GoogleMapsLoader.REGION = gs.googleMapsSettings.region;
  window.GoogleMapsLoader.onLoad(function(google) {
    if (gs.debug) {
      console.log("GoogleMapsLoader: finished loading successfully");
    }
  });
  // find and set DOM element objects in gs
  gs.mapElement = window.document.getElementById("map");
  gs.localStorageWorks = function() {
    /**
     * Simple test function to see if window.localStorage works.
     **/
    try {
      window.localStorage.setItem("Appname", "Gasvaktin");
      if (window.localStorage.getItem("Appname") !== "Gasvaktin") {
        throw new Error("localStorage seems to be broken");
      }
      if (gs.debug) {
        console.log("localStorageWorks: returned positive")
      }
      return true;
    }
    catch (err) {
      if (gs.debug) {
        console.warn("localStorageWorks: returned negative")
        console.warn(err);
      }
      return false;
    }
  }
  // Polyfilling localStorage with an in-memory (stale) storage if it's missing
  // from window or if it's breakingly disabled like in Safari incognito mode
  // (where calling localStorage.setItem results in throwing an error)
  // https://gist.github.com/juliocesar/926500
  if (!("localStorage" in window) || !gs.localStorageWorks()) {
    if (!("localStorage" in window)) {
      console.warn("localStorage not available, fallbacking to stale storage.")
    } else if (!gs.localStorageWorks()) {
      console.warn("localStorage not working, fallbacking to stale storage.")
    }
    gs.localStorage = {
      _data: {},
      setItem: function(id, val) {
        return this._data[id] = String(val);
      },
      getItem: function(id) {
        return this._data.hasOwnProperty(id) ? this._data[id] : undefined;
      },
      removeItem: function(id) {
        return delete this._data[id];
      },
      clear: function() {
        return this._data = {};
      }
    };
  } else {
    gs.localStorage = window.localStorage;
  }
  runClient();
}
initialize();
