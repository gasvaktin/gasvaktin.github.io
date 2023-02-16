"use-strict";
/**
 * ========================================================================== *
 * Gasvaktin Client Script.
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
      url: "https://www.mbl.is/frettir/innlent/2023/02/14/langar_radir_og_margir_reida_sig_a_straeto/"
    },
     n1_082: { // N1 Norðurhella
      msg: "POSSIBLY OUT OF DIESEL",
      url: "https://www.n1.is/opnar-daelur/"
    },
    n1_081: { // N1 Skógarlind
      msg: "POSSIBLY OUT OF GAS",
      url: "https://www.n1.is/opnar-daelur/"
    },
    n1_027: { // N1 Ásvellir
      msg: "POSSIBLY OUT OF DIESEL",
      url: "https://www.n1.is/opnar-daelur/"
    },
    n1_010: { // N1 Skógarsel
      msg: "POSSIBLY OUT OF DIESEL",
      url: "https://www.n1.is/opnar-daelur/"
    },
    n1_078: { // N1 Vallarheiði
      msg: "POSSIBLY OUT OF DIESEL",
      url: "https://www.n1.is/opnar-daelur/"
    },
    n1_070: { // N1 Sandgerði
      msg: "POSSIBLY OUT OF DIESEL",
      url: "https://www.n1.is/opnar-daelur/"
    },
    n1_062: { // N1 Vík
      msg: "POSSIBLY OUT OF PETROL",
      url: "https://www.n1.is/opnar-daelur/"
    },
    n1_067: { // N1 Brautarhóll
      msg: "POSSIBLY OUT OF DIESEL",
      url: "https://www.n1.is/opnar-daelur/"
    },
    n1_065: { // N1 Flúðir
      msg: "POSSIBLY OUT OF DIESEL",
      url: "https://www.n1.is/opnar-daelur/"
    },
    or_066: { // Orkan Fellsmúli
      msg: "PRIORITY GROUPS ONLY",
      url: "https://www.visir.is/g/20232378472d/svona-er-stadan-a-bensin-stodvunum"
    },
    or_006: { // Orkan Reykjavíkurvegur
      msg: "POSSIBLY OUT OF DIESEL",
      url: "https://www.orkan.is/verkfall/"
    },
    or_007: { // Orkan Skógarhlíð
      msg: "PRIORITY GROUPS ONLY",
      url: "https://www.mbl.is/frettir/innlent/2023/02/16/orkan_i_skogarhlid_adeins_opin_vidbragdsadilum/"
    },
    ob_021: { // ÓB Melabraut
      msg: "POSSIBLY OUT OF DIESEL",
      url: "https://www.olis.is/um-olis/frettir/275"
    },
    ob_040: { // ÓB Hamraborg
      msg: "POSSIBLY OUT OF GAS",
      url: "https://www.olis.is/um-olis/frettir/275"
    },
    ob_041: { // ÓB Ferstikla
      msg: "POSSIBLY OUT OF GAS",
      url: "https://www.olis.is/um-olis/frettir/275"
    },
    ob_009: { // ÓB Borgarnes
      msg: "POSSIBLY OUT OF DIESEL",
      url: "https://www.olis.is/um-olis/frettir/275"
    },
    ob_003: { // ÓB Arnarsmári
      msg: "POSSIBLY OUT OF GAS",
      url: "https://www.olis.is/um-olis/frettir/275"
    },
    ol_022: { // Olís Hrauneyjar
      msg: "POSSIBLY OUT OF GAS",
      url: "https://www.olis.is/um-olis/frettir/275"
    },
    ob_011: { // ÓB Eyrarbakki
      msg: "POSSIBLY OUT OF GAS",
      url: "https://www.olis.is/um-olis/frettir/275"
    },
    ob_033: { // ÓB Þorlákshöfn
      msg: "POSSIBLY OUT OF DIESEL",
      url: "https://www.olis.is/um-olis/frettir/275"
    },
    ob_014: { // ÓB Grindavík
      msg: "POSSIBLY OUT OF GAS",
      url: "https://www.olis.is/um-olis/frettir/275"
    },
    ao_006: { // Atlantsolía Hafnarfjarðarhöfn
      msg: "POSSIBLY OUT OF DIESEL",
      url: "https://www.atlantsolia.is/stadan-a-bensinstodvunum/"
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
      gs.stationMarker.setPosition({
        lat: station.geo.lat,
        lng: station.geo.lon
      });
      gs.stationMarker.setVisible(true);
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
          title: "Your location"
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
  gs.mapElement = window.document.getElementById("mapElement");
  gs.listElement = window.document.getElementById("listElement");
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
