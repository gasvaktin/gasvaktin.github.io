"use-strict";
/**
 * ========================================================================== *
 * Gasvaktin Client Script (Leaflet port).
 *
 * This is a rewrite of the original Google Maps based client to use Leaflet
 * instead. It assumes Leaflet (L) is available on the page and that a CSS
 * + JS include for Leaflet has been added in the HTML.
 *
 * Prerequisites:
 * - window.fetch (is to be standard in all browsers but currently isn't, we're
 *   using the following polyfill: https://www.npmjs.com/package/whatwg-fetch)
 * - window.Promise (supported by all browsers as far as I know, but included a
 *   fallback polyfill just in case)
 * - Leaflet (L) (Leaflet package, using the following:
 *   https://www.npmjs.com/package/leaflet)
 * - jQuery (this one could kinda easily be removed, but it's already needed for
 *   the Twitter Bootstrap front-end framework so it's been tempting to use it
 *   for a few things)
 * - GeoUtils.js (simple JS module for calculating distances between geolocation
 *   coordinates)
 *
 * Notes:
 * - The code attempts to keep the original structure and APIs intact while
 *   swapping Google Maps usage to Leaflet equivalents.
 **/
var gs = {  /* Global Scope Paramteters */
  urlParams: null,
  debug: false,
  dataEndpoint: "https://raw.githubusercontent.com/gasvaktin/gasvaktin/master/vaktin/gas.min.json",
  stations: {},
  // googleMaps settings removed; Leaflet is expected to be available globally
  map: null, // Leaflet map (L.Map)
  mapOptions: {
    center: { lat: 64.996752, lng: -18.682185 }, // center of Iceland
    zoom: 5 // initial zoom
  },
  userLocation: {
    lat: null,
    lng: null
  },
  userMarker: null, // Leaflet marker
  stationMarker: null, // Leaflet marker
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
  listElement: null, // DOM element object
  stationCompanyClassMap: { // map company name to appropriate CSS class
    "Atlantsolía": "atlantsolia",
    "Costco Iceland": "costco",
    "N1": "n1",
    "Dælan": "daelan",
    "Olís": "olis",
    "ÓB": "ob",
    "Skeljungur": "skeljungur",
    "Orkan": "orkan",
    "Orkan X": "orkanx"
  },
  localStorage: null, // window.localStorage or polyfill if needed
  localStorageWorks: null, // function to test window.localStorage
  fuelTypes: {
    petrol: "petrol",
    diesel: "diesel"
  },
  handleStalemate: null, // helper function for sorting stations
  outOfGas: {
    ex_000: {
      msg: "POSSIBLY OUT OF GAS",
      url: "https://www.mbl.is/frettir/innlent/2023/02/16/hvar_er_bensinid_buid/"
    }
  }
};

/**
 * ========================================================================== *
 * Promising functions for doing specific tasks, knitted together further down.
 **/

var addStationsToList = function(stations) {
  /**
   * Creates station DOM objects and adds to listElement DOM.
   *
   * Each station DOM object looks like the following:
   * <div class="station atlantsolia" id="ao_000">
   *   <h1>Bíldshöfði <span>Atlantsolía</span></h1>
   *   <p class="distance">3.4 km</p>
   *   <p class="price">191.4 ISK</p>
   *   <p class="discount-price">(188.4 with discount)</p>
   * </div>
   */
  return new Promise(function (fulfil, reject) {
    try {
      for (var i=0; i<stations.length; i++) {
        var className = (
          "Station "+gs.stationCompanyClassMap[stations[i].company]
        );
        var station = window.document.createElement("div");
        station.setAttribute("class", className);
        station.setAttribute("id", stations[i].key);
        var stationName = window.document.createElement("h1");
        stationName.setAttribute("class", "Station__name");
        stationName.innerHTML = (
          stations[i].name+" <span class='Station__company'>"+stations[i].company+"</span>"
        );
        station.appendChild(stationName);
        var stationDistance = window.document.createElement("p");
        stationDistance.setAttribute("class", "Station__distance");
        stationDistance.innerHTML = "Finding your location ..";
        station.appendChild(stationDistance);
        if (gs.localStorage.getItem("fuel_type") === gs.fuelTypes.petrol) {
          var price = stations[i].bensin95;
          var priceDiscount = stations[i].bensin95_discount;
        }
        else {
          var price = stations[i].diesel;
          var priceDiscount = stations[i].diesel_discount;
        }
        var stationPrice = window.document.createElement("p");
        stationPrice.setAttribute("class", "Station__price");
        stationPrice.innerHTML = price.toString()+" ISK";
        station.appendChild(stationPrice);
        if (stations[i].bensin95_discount !== null) {
          var stationDiscountPrice = window.document.createElement("p");
          stationDiscountPrice.setAttribute("class", "Station__discountPrice");
          stationDiscountPrice.innerHTML = (
            "("+priceDiscount.toString()+" with discount)"
          );
          station.appendChild(stationDiscountPrice);
        }
        if (stations[i].key in gs.outOfGas) {
          var outOfGas = window.document.createElement("a");
          outOfGas.setAttribute("class", "Station__outofgas");
          outOfGas.setAttribute("href", gs.outOfGas[stations[i].key]["url"]);
          outOfGas.setAttribute("target", "_blank");
          outOfGas.innerHTML = gs.outOfGas[stations[i].key]["msg"];
          station.appendChild(outOfGas);
        }
        if (stations[i].key.startsWith('co')) {
          var stationDiscountPrice = window.document.createElement("p");
          stationDiscountPrice.setAttribute("class", "Station__discountPrice");
          stationDiscountPrice.innerHTML = (
            "[ Membership card required ]"
          );
          station.appendChild(stationDiscountPrice);
        }
        station.onclick = function() {
          updateStationMarker(this.id);
          updateMapVision();
          $("div").removeClass("Station--focused");
          $("#"+this.id).addClass("Station--focused");
        }
        listElement.appendChild(station);
      }
      fulfil();
    }
    catch (err) {
      console.error(err);
      reject(err);
    }
  });
}

var updatePricesInList = function() {
  /**
   * Updates prices in station DOM objects based on petrol type selected.
   */
  return new Promise(function (fulfil, reject) {
    try {
      var petrolType = gs.localStorage.getItem("fuel_type")
      for (var key in gs.stations) {
        if (petrolType == gs.fuelTypes.petrol) {
          var price = gs.stations[key]["bensin95"];
          var priceDiscount = gs.stations[key]["bensin95_discount"];
        }
        else if (petrolType == gs.fuelTypes.diesel) {
          var price = gs.stations[key]["diesel"];
          var priceDiscount = gs.stations[key]["diesel_discount"];
        }
        var stationElement = document.getElementById(key);
        stationElement.children[2].innerHTML = price.toString() + " ISK";
        if (priceDiscount !== null) {
          stationElement.children[3].innerHTML = (
            "("+priceDiscount.toString()+" with discount)"
          );
        }
      }
      fulfil();
    }
    catch (err) {
      console.error(err);
      reject(err);
    }
  });
}

var arrangeStationsByPrice = function() {
  /**
   * Arranges stations in list by price.
   */
  return new Promise(function (fulfil, reject) {
    try {
      var items = gs.listElement.childNodes;
      var itemsArr = [];
      for (var i in items) {
        if (items[i].nodeType == 1) { // get rid of the whitespace text nodes
          itemsArr.push(items[i]);
        }
      }
      itemsArr.sort(function (a, b) {
        if (gs.localStorage.getItem("fuel_type") === gs.fuelTypes.petrol) {
          return (
            gs.stations[a.id].bensin95 == gs.stations[b.id].bensin95
              ? gs.handleStalemate(gs.stations[a.id], gs.stations[b.id])
              : (gs.stations[a.id].bensin95 > gs.stations[b.id].bensin95 ? 1 : -1)
          );
        } else {
          return (
            gs.stations[a.id].diesel == gs.stations[b.id].diesel
              ? gs.handleStalemate(gs.stations[a.id], gs.stations[b.id])
              : (gs.stations[a.id].diesel > gs.stations[b.id].diesel ? 1 : -1)
          );
        }
      });
      for (i = 0; i < itemsArr.length; ++i) {
        gs.listElement.appendChild(itemsArr[i]);
      }
      document.getElementById("OrderBy__cheapest").checked = true;
      fulfil();
    }
    catch (err) {
      console.error(err);
      reject();
    }
  });
}

var arrangeStationsByDistance = function() {
  /**
   * Arranges stations in list by distance.
   */
  return new Promise(function (fulfil, reject) {
    try {
      var items = listElement.childNodes;
      var itemsArr = [];
      for (var i in items) {
        if (items[i].nodeType == 1) { // get rid of the whitespace text nodes
          itemsArr.push(items[i]);
        }
      }
      itemsArr.sort(function (a, b) {
        return gs.stations[a.id].distance == gs.stations[b.id].distance
          ? gs.handleStalemate(gs.stations[a.id], gs.stations[b.id])
          : (gs.stations[a.id].distance > gs.stations[b.id].distance ? 1 : -1);
      });
      for (i = 0; i < itemsArr.length; ++i) {
        listElement.appendChild(itemsArr[i]);
      }
      document.getElementById("OrderBy__nearest").checked = true;
      fulfil();
    }
    catch (err) {
      console.error(err);
      reject(err);
    }
  });
}

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

var updateStationDistances = function() {
  /**
   * Updates distances to stations in station DOM elements.
   */
  return new Promise(function (fulfil, reject) {
    try {
      for (var key in gs.stations) {
        var stationElement = document.getElementById(key);
        var rounded = Math.round(gs.stations[key].distance * 10) / 10;
        stationElement.children[1].innerHTML = rounded.toString() + " km";
      }
      fulfil();
    }
    catch (err) {
      console.error(err);
      reject(err);
    }
  });
}

var updateStationDistancesFailure = function() {
  /**
   * Sets indications that distances to stations failed to be calculated.
   */
  return new Promise(function (fulfil, reject) {
    try {
      for (var key in gs.stations) {
        var stationElement = document.getElementById(key);
        stationElement.children[1].innerHTML = "Distance unknown";
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
   *
   * Uses Leaflet map methods. If user location is unknown, center on selected
   * station and set a reasonable zoom. Otherwise center between user and
   * station and fit bounds.
   */
  return new Promise(function (fulfil, reject) {
    try {
      if (!gs.map) {
        throw new Error("Map not initialized");
      }

      // If no user location available, center on station and zoom out a bit
      if (gs.geoLocation.location === null) {
        var stLatLng = gs.stationMarker.getLatLng();
        gs.map.setView([stLatLng.lat, stLatLng.lng], 9);
        fulfil();
        return;
      }

      // Compute midpoint using GeoUtils (keeps original behaviour)
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
      // Fit bounds; Leaflet handles ordering
      gs.map.fitBounds(bounds, { padding: [40, 40] });
      fulfil();
    }
    catch (err) {
      console.error(err);
      reject(err);
    }
  });
}

var updateStationMarker = function(key) {
  /**
   * Updates station marker to first station in list if key is undefined, else
   * to station with provided key.
   */
  return new Promise(function (fulfil, reject) {
    try {
      if (key === undefined) {
        key = null;
      }
      var station;
      $("div").removeClass("Station--focused");
      if (key === null) {
        station = gs.stations[listElement.children[0].id];
        if (station.company === "Costco Iceland") {
          // we don't auto select Costco as we can't assume our visitor has a
          // costco membership card
          station = gs.stations[listElement.children[1].id];
        }
        $("#"+station.key).addClass("Station--focused");
      }
      else {
        station = gs.stations[key];
        $("#"+key).addClass("Station--focused");
      }
      // Update Leaflet marker position and ensure it's visible on map
      gs.stationMarker.setLatLng([station.geo.lat, station.geo.lon]);
      if (!gs.map.hasLayer(gs.stationMarker)) {
        gs.stationMarker.addTo(gs.map);
      }
      fulfil();
    }
    catch (err) {
      console.error(err);
      reject(err);
    }
  });
}

var loadLeafletMap = function() {
  /**
   * Initialize the Leaflet map and markers.
   *
   * Creates a map, basic OSM tile layer, and two markers (user & station).
   * Markers are not visible until position is set (we add them to the map when
   * position becomes available).
   */
  return new Promise(function(fulfil, reject) {
    try {
      if (typeof L === "undefined") {
        throw new Error("Leaflet (L) not found. Please include Leaflet before this script.");
      }

      // Create the map
      gs.map = L.map(gs.mapElement, {
        center: [gs.mapOptions.center.lat, gs.mapOptions.center.lng],
        zoom: gs.mapOptions.zoom,
        zoomControl: false, // preserve similar UI as disableDefaultUI
        attributionControl: true
      });

      // Add a basic OSM tile layer. Projects can replace this with any tile provider.
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(gs.map);

      // Setup default icons
      var defaultIcon = L.icon({
        iconUrl: '/packages/leaflet/dist/images/marker-icon.png',
        iconRetinaUrl: '/packages/leaflet/dist/images/marker-icon-2x.png',
        shadowUrl: '/packages/leaflet/dist/images/marker-shadow.png',
        iconSize: [25,41],
        iconAnchor: [12,41],
        popupAnchor: [1, -34],
        shadowSize: [41,41]
      });
      var gasIcon = L.icon({
        iconUrl: "/images/markers/gasstation.png",
        iconSize: [30,30],
        iconAnchor: [15,15]
      });

      // Create markers but do not add them to the map until positions are known
      gs.userMarker = L.marker([gs.geoLocation.centerOfIceland.lat, gs.geoLocation.centerOfIceland.lng], {
        title: "Your location",
        icon: defaultIcon
      });

      gs.stationMarker = L.marker([gs.geoLocation.centerOfIceland.lat, gs.geoLocation.centerOfIceland.lng], {
        title: "Selected station location",
        icon: gasIcon
      });

      // For consistency with original API, we keep markers but only add them
      // to the map when their position is set (see getCurrentUserPosition).
      fulfil();
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
      if (gs.debug) {
        console.log("Got the following petrol data:");
        console.log(data);
      }
      for (var i=0; i<data.stations.length; i++) {
        gs.stations[data.stations[i].key] = data.stations[i];
      }
      addStationsToList(data.stations).then(function() {
        return arrangeStationsByPrice();
      }).then(function() {
        fulfil();
      });
    }).catch(function(err) {
      console.error(err);
      reject(err);
    });
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
          // Update Leaflet user marker and ensure it's visible
          gs.userMarker.setLatLng([crd.latitude, crd.longitude]);
          if (!gs.map.hasLayer(gs.userMarker)) {
            gs.userMarker.addTo(gs.map);
          }
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
    loadLeafletMap().then(function() {
      return getCurrentUserPosition();
    }),
    fetchGasPrice()
  ]).then(function() {
    if (gs.geoLocation.status === 1) {
      calculateStationDistances().then(function() {
        return updateStationDistances();
      }).then(function() {
        return arrangeStationsByPrice();
      }).then(function() {
        return updateStationMarker();
      }).then(function() {
        return updateMapVision();
      });
    }
    else {
      if (gs.geoLocation.status !== 2) {
        console.warn("Unexpected gs.geoLocation.status: "+gs.geoLocation.status)
      }
      updateStationDistancesFailure();
    }
  }).catch(function(err){
    console.error("runClient error:", err);
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

  // find and set DOM element objects in gs
  gs.mapElement = window.document.getElementById("mapElement");
  gs.listElement = window.document.getElementById("listElement");
  // For backwards compatibility with older code that referenced globals
  mapElement = gs.mapElement;
  listElement = gs.listElement;

  gs.handleStalemate = function(stationA, stationB) {
    /**
     * Stalemate handling when sorting stations with regard to price or distance
     * by taking into account distance or station name.
     */
    if (stationA.distance !== undefined && stationB.distance !== undefined) {
      return (
        stationA.distance == stationB.distance
          ? 0
          : (stationA.distance > stationB.distance ? 1 : -1)
      );
    }
    return (
      stationA.name == stationB.name
        ? 0
        : (stationA.name > stationB.name ? 1 : -1)
    );
  }
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
    }
    else if (!gs.localStorageWorks()) {
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
  }
  else {
    gs.localStorage = window.localStorage;
  }
  // load petrol type selected from localstorage
  if (gs.localStorage.getItem("fuel_type") === null) {
    gs.localStorage.setItem("fuel_type", gs.fuelTypes.petrol);
  } else if (gs.localStorage.getItem("fuel_type") === "diesel")  {
    $("#FuelType__dieselCheckmark").attr('checked', 'checked');
  }

  $(".FuelType__choiceInput").on('click', function(item) {
    gs.localStorage.setItem("fuel_type", item.target.value);
    updatePricesInList();
  });
  runClient();
}
initialize();
