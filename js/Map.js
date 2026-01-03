"use-strict";
/**
 * ========================================================================== *
 * Gasvaktin Map Client Script (Leaflet).
 *
 * This file is a Leaflet port of the original Google Maps based Map.js.
 *
 * Prerequisites:
 * - Leaflet (include Leaflet CSS/JS in the HTML)
 * - window.fetch
 * - window.Promise
 * - GeoUtils.js (distance helpers)
 *
 * Notes:
 * - The map container is expected to be the element with id="map".
 * - Tile layer defaults to OpenStreetMap. Replace with another provider if you
 *   prefer.
 * ========================================================================== *
 */

var gs = {  /* Global Scope Parameters */
  urlParams: null,
  debug: false,
  p: {},
  data: {},
  dataEndpoint: "https://raw.githubusercontent.com/gasvaktin/gasvaktin/master/vaktin/gas.min.json",
  stations: {},
  // Google Maps related settings removed; Leaflet is expected globally as L
  map: null, // Leaflet map (L.Map)
  mapOptions: {
    center: { lat: 64.996752, lng: -18.682185 }, // center of Iceland
    zoom: 7 // initial zoom
  },
  userLocation: {
    lat: null,
    lng: null
  },
  userMarker: null, // Leaflet marker for user
  stationMarkers: [], // array of Leaflet markers for stations
  stationMarker: null, // Leaflet marker for a selected station (if used)
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
  mapElement: null, // DOM element for the map
  localStorage: null,
  localStorageWorks: null,
  fuelTypes: {
    petrol: "petrol",
    diesel: "diesel"
  }
};

/**
 * Calculates station distances using GeoUtils (unchanged).
 */
var calculateStationDistances = function() {
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

/**
 * Update map center/zoom to show user and a selected station or just a station.
 */
var updateMapVision = function() {
  return new Promise(function (fulfil, reject) {
    try {
      if (!gs.map) {
        throw new Error("Map not initialized");
      }

      // If we don't have user location, center on selected station (stationMarker)
      if (gs.geoLocation.location === null) {
        if (gs.stationMarker) {
          var stLatLng = gs.stationMarker.getLatLng();
          gs.map.setView([stLatLng.lat, stLatLng.lng], 9);
        }
        fulfil();
        return;
      }

      // Otherwise, center between user and selected station (if any)
      if (!gs.stationMarker) {
        // no selected station: center on user
        var u = gs.userMarker.getLatLng();
        gs.map.setView([u.lat, u.lng], Math.max(6, gs.map.getZoom()));
        fulfil();
        return;
      }

      var center = GeoUtils.pointBetweenPoints(
        gs.userMarker.getLatLng().lat,
        gs.userMarker.getLatLng().lng,
        gs.stationMarker.getLatLng().lat,
        gs.stationMarker.getLatLng().lng
      );
      gs.map.setView([center.latitude, center.longitude]);

      var pointA = L.latLng(
        gs.userMarker.getLatLng().lat,
        gs.userMarker.getLatLng().lng
      );
      var pointB = L.latLng(
        gs.stationMarker.getLatLng().lat,
        gs.stationMarker.getLatLng().lng
      );

      var bounds = L.latLngBounds([pointA, pointB]);
      gs.map.fitBounds(bounds, { padding: [40, 40] });

      fulfil();
    }
    catch (err) {
      console.error(err);
      reject(err);
    }
  });
}

/**
 * Initialize Leaflet map and create baseline markers (not added until positioned).
 */
var loadLeafletMap = function() {
  return new Promise(function(fulfil, reject) {
    try {
      if (typeof L === "undefined") {
        throw new Error("Leaflet (L) not found. Please include Leaflet before this script.");
      }

      var center = [gs.mapOptions.center.lat, gs.mapOptions.center.lng];

      // Create the map
      gs.map = L.map(gs.mapElement, {
        center: center,
        zoom: gs.mapOptions.zoom,
        zoomControl: false,
        attributionControl: true
      });

      // Add OSM tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(gs.map);

      // Setup default icons (fallback marker and gas icon)
      var defaultIcon = L.icon({
        iconUrl: '/packages/leaflet/dist/images/marker-icon.png',
        iconRetinaUrl: '/packages/leaflet/dist/images/marker-icon-2x.png',
        shadowUrl: '/packages/leaflet/dist/images/marker-shadow.png',
        iconSize: [25,41],
        iconAnchor: [12,41],
        popupAnchor: [1, -34],
        shadowSize: [41,41]
      });

      var pulseIcon = L.icon({
        iconUrl: '/images/markers/pulse.svg',
        iconSize: [20,20],
        iconAnchor: [10,10]
      });

      var gasIcon = L.icon({
        iconUrl: '/images/markers/gasstation.png',
        iconSize: [30,30],
        iconAnchor: [15,15]
      });

      // Create markers but don't add to map until positions are known
      gs.userMarker = L.marker([gs.geoLocation.centerOfIceland.lat, gs.geoLocation.centerOfIceland.lng], {
        title: "Your location",
        icon: pulseIcon
      });

      gs.stationMarker = L.marker([gs.geoLocation.centerOfIceland.lat, gs.geoLocation.centerOfIceland.lng], {
        title: "Selected station location",
        icon: gasIcon
      });

      // Keep arrays cleared
      gs.stationMarkers = [];

      fulfil();
    }
    catch (err) {
      console.error(err);
      reject(err);
    }
  });
}

/**
 * Fetch gas prices and store them in gs.data.gas and gs.stations
 */
var fetchGasPrice = function() {
  return new Promise(function(fulfil, reject) {
    window.fetch(gs.dataEndpoint).then(function(response) {
      return response.json();
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

/**
 * Mark stations on the map with colored dot markers depending on price.
 * Create popups containing company icon, station name and prices.
 */
var markStationsOnMap = function() {
  return new Promise(function(fulfil, reject) {
    try {
      var stations = gs.data.gas.stations;
      var price_cheapest = null;
      var price_cheap_1 = null;
      var price_cheap_2 = null;
      var price_cheap_3 = null;
      var price_average = null;
      var price_expen_1 = null;
      var price_expen_2 = null;
      var price_expen_3 = null;
      var price_expensive = null;

      // Determine min and max to calculate thresholds
      for (var i=0; i<stations.length; i++) {
        var station = stations[i];
        if (price_cheapest === null || station.bensin95 < price_cheapest) {
          price_cheapest = station.bensin95;
        }
        if (price_expensive === null || station.bensin95 > price_expensive) {
          price_expensive = station.bensin95;
        }
      }

      price_average = Number(((price_cheapest + price_expensive) / 2).toFixed(1));
      price_cheap_2 = Number(((price_cheapest + price_average) / 2).toFixed(1));
      price_cheap_1 = Number(((price_cheapest + price_cheap_2) / 2).toFixed(1));
      price_cheap_3 = Number(((price_cheap_2 + price_average) / 2).toFixed(1));
      price_expen_2 = Number(((price_average + price_expensive) / 2).toFixed(1));
      price_expen_1 = Number(((price_average + price_expen_2) / 2).toFixed(1));
      price_expen_3 = Number(((price_expen_2 + price_expensive) / 2).toFixed(1));

      if (gs.debug) {
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
      }

      // Clean up any existing markers
      gs.stationMarkers.forEach(function(m) {
        if (gs.map && gs.map.hasLayer(m)) { gs.map.removeLayer(m); }
      });
      gs.stationMarkers = [];

      for (var j=0; j<stations.length; j++) {
        var st = stations[j];
        var markerUrl = null;
        var zIndex = 1;

        if (st.bensin95 === price_cheapest) {
          markerUrl = "/images/markers/dot_green_1.svg";
          zIndex = 9;
        } else if (st.bensin95 < price_cheap_1) {
          markerUrl = "/images/markers/dot_green_2.svg";
          zIndex = 9;
        } else if (st.bensin95 < price_cheap_2) {
          markerUrl = "/images/markers/dot_green_3.svg";
          zIndex = 8;
        } else if (st.bensin95 < price_cheap_3) {
          markerUrl = "/images/markers/dot_yellow_1.svg";
          zIndex = 7;
        } else if (st.bensin95 < price_average) {
          markerUrl = "/images/markers/dot_yellow_2.svg";
          zIndex = 6;
        } else if (st.bensin95 < price_expen_1) {
          markerUrl = "/images/markers/dot_yellow_3.svg";
          zIndex = 5;
        } else if (st.bensin95 < price_expen_2) {
          markerUrl = "/images/markers/dot_red_1.svg";
          zIndex = 4;
        } else if (st.bensin95 < price_expen_3) {
          markerUrl = "/images/markers/dot_red_2.svg";
          zIndex = 3;
        } else if (st.bensin95 < price_expensive) {
          markerUrl = "/images/markers/dot_red_3.svg";
          zIndex = 2;
        } else {
          markerUrl = "/images/markers/dot_red_3.svg";
          zIndex = 1;
        }

        var dotIcon = L.icon({
          iconUrl: markerUrl,
          iconSize: [20,20],
          iconAnchor: [10,10],
          popupAnchor: [0,-10]
        });

        var companyIconPath = "/images/markers/gasstation.png";
        if (st.company === "Atlantsolía") {
          companyIconPath = "/images/companies/atlantsolia.png";
        } else if (st.company === "Costco Iceland") {
          companyIconPath = "/images/companies/costco.png";
        } else if (st.company === "N1") {
          companyIconPath = "/images/companies/n1.png";
        } else if (st.company === "Olís") {
          companyIconPath = "/images/companies/olis.png";
        } else if (st.company === "ÓB") {
          companyIconPath = "/images/companies/ob.png";
        } else if (st.company === "Orkan") {
          companyIconPath = "/images/companies/orkan.png";
        }

        // Popup content similar to original info window
        var imgElement = (
          `<img src="${companyIconPath}"` +
          ` style="width:36px;position:absolute;pointer-events:none;user-select:none;" />`
        );
        var infoName = (
          `<span style="padding-left:42px;">${st.company} ${st.name}</span>`
        );
        var discountBensin = "";
        var discountDiesel = "";
        if (st.bensin95_discount !== null) {
          discountBensin = (
            ` <span style="font-size:7px">(m afsl: ${st.bensin95_discount} ISK)</span>`
          );
        }
        if (st.diesel_discount !== null) {
          discountDiesel = (
            ` <span style="font-size:7px">(m afsl: ${st.diesel_discount} ISK)</span>`
          );
        }
        var infoPrice = (
          `<br/><span style="padding-left:42px;font-size:10px;"><b>Bensin:</b>` +
          ` ${st.bensin95} ISK` +
          discountBensin +
          `</span>` +
          `<br/><span style="padding-left:42px;font-size:10px;"><b>Diesel:</b>` +
          ` ${st.diesel} ISK` +
          discountDiesel +
          `</span>`
        );

        var popupContent = imgElement + infoName + infoPrice;

        var stationLatLng = [st.geo.lat, st.geo.lon];
        var stationMarker = L.marker(stationLatLng, {
          title: `${st.company} - ${st.name}`,
          icon: dotIcon,
          zIndexOffset: zIndex * 10
        });

        stationMarker.bindPopup(popupContent, { minWidth: 160 });

        // store station key on marker for potential future lookup
        stationMarker.stationKey = st.key;

        stationMarker.on('click', function(e) {
          // open popup is default behavior; we also could do other things here
        });

        stationMarker.addTo(gs.map);
        gs.stationMarkers.push(stationMarker);
      } // end for loop

      // Update price summary in DOM
      var cheapestEl = document.getElementById("cheapest");
      var averageEl = document.getElementById("average");
      var expensiveEl = document.getElementById("expensive");
      if (cheapestEl) { cheapestEl.innerHTML = `${price_cheapest} ISK`; }
      if (averageEl) { averageEl.innerHTML = `${price_average} ISK`; }
      if (expensiveEl) { expensiveEl.innerHTML = `${price_expensive} ISK`; }

      var scaleEl = document.getElementById("scale");
      if (scaleEl) { scaleEl.value = "0"; }

      fulfil();
    }
    catch (err) {
      console.error(err);
      reject(err);
    }
  });
}

/**
 * Get current user location and place user marker on map.
 */
var getCurrentUserPosition = function() {
  return new Promise(function (fulfil, reject) {
    try {
      window.navigator.geolocation.getCurrentPosition(
        function(pos) {
          gs.geoLocation.location = pos;
          var crd = pos.coords;
          if (gs.debug) {
            console.log(
              "Successfully received geolocation.\n" +
              "Your current location is:\n" +
              "Latitude: "+crd.latitude+"\n" +
              "Longitude: "+crd.longitude+"\n" +
              "with a delta of " + crd.accuracy + " meters."
            );
          }
          gs.geoLocation.status = 1;
          gs.userLocation.lat = crd.latitude;
          gs.userLocation.lng = crd.longitude;

          var latlng = [crd.latitude, crd.longitude];
          if (gs.userMarker === null) {
            // shouldn't happen: marker is created in loadLeafletMap, but check anyway
            gs.userMarker = L.marker(latlng, { title: "Your location" }).addTo(gs.map);
          } else {
            gs.userMarker.setLatLng(latlng);
            if (!gs.map.hasLayer(gs.userMarker)) {
              gs.userMarker.addTo(gs.map);
            }
          }

          // Optionally add a popup to user marker
          if (!gs.userMarker.getPopup()) {
            gs.userMarker.bindPopup('<span><i class="fa fa-map-marker Nav__logo" aria-hidden="true"></i> Your location</span>');
          }

          fulfil();
        },
        function(err) {
          if (gs.debug) {
            console.warn("Failed to receive geolocation.");
            console.warn(err);
          }
          gs.geoLocation.status = 2;
          // resolve anyway (user might have denied permission)
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
 * Main runner: initialize map, geolocation and fetch data then mark stations.
 */
var runClient = function() {
  Promise.all([
    loadLeafletMap().then(function() {
      return getCurrentUserPosition();
    }),
    fetchGasPrice()
  ]).then(function() {
    return markStationsOnMap();
  }).catch(function(err) {
    console.error("runClient error:", err);
  });
}

/**
 * Initialization: set up gs variables, localStorage polyfill etc.
 */
var initialize = function() {
  gs.urlParams = new window.URLSearchParams(window.location.search);
  if (gs.urlParams.has('debug') && gs.urlParams.get('debug') === 'true') {
    gs.debug = true;
  }

  // find and set DOM element objects in gs
  gs.mapElement = window.document.getElementById("map");

  gs.localStorageWorks = function() {
    try {
      window.localStorage.setItem("Appname", "Gasvaktin");
      if (window.localStorage.getItem("Appname") !== "Gasvaktin") {
        throw new Error("localStorage seems to be broken");
      }
      if (gs.debug) {
        console.log("localStorageWorks: returned positive");
      }
      return true;
    }
    catch (err) {
      if (gs.debug) {
        console.warn("localStorageWorks: returned negative");
        console.warn(err);
      }
      return false;
    }
  };

  if (!("localStorage" in window) || !gs.localStorageWorks()) {
    if (!("localStorage" in window)) {
      console.warn("localStorage not available, fallbacking to stale storage.");
    } else if (!gs.localStorageWorks()) {
      console.warn("localStorage not working, fallbacking to stale storage.");
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
};

initialize();
