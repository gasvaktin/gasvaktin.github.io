"use-strict";
/**
 * Gasvaktin.js
 **/

// ------------ //
// EVIL GLOBALS //
// ------------ //
var DEBUG = false;
var STATIONS = {};
var GOOGLE = null;
var MAP = null;
var USER_LOCATION = null;
var SELECTED_STATION_LOCATION = null;
var GEOPOSITION = null;
// GEOSTATUS:
//   0 - initial
//   1 - success
//   2 - failure
var GEOSTATUS = 0;
var GEOPTIONS = {
  enableHighAccuracy: true,
  timeout: 5000,
  maximumAge: 0
};
var ICELAND_MID = {lat: 64.996752, lng: -18.682185};
var DEFAULT_ZOOM = 5;
var mapOptions = {
    center: ICELAND_MID,
    disableDefaultUI: true,
    zoom: DEFAULT_ZOOM
};
GoogleMapsLoader.KEY = "AIzaSyAS6Yp_1JOJKo0O1FGC24h-nlk66wFZ_78";
GoogleMapsLoader.LIBRARIES = ["geometry", "places"];
GoogleMapsLoader.LANGUAGE = "en";
GoogleMapsLoader.REGION = "IS";
GoogleMapsLoader.onLoad(function(google) {
    if (DEBUG) console.log("I've just loaded google maps api.");
});
// Global DOM elements
var mapElement = document.getElementById("mapElement");
var listElement = document.getElementById("listElement");

// ---------------------------- //
// LESSER EVILS OF LOCALSTORAGE //
// ---------------------------- //
if (localStorage.getItem("petrol_type") === null) {
    // petrol_type:
    //   bensin
    //   diesel
    localStorage.setItem("petrol_type", "bensin");
}

// --------------------------- //
// SOME jQuery SHIMS AND STUFF //
// --------------------------- //

// jQuery to collapse the navbar on scroll
$(window).scroll(function() {
    if ($(".navbar").offset().top > 50) {
        $(".navbar-fixed-top").addClass("top-nav-collapse");
    } else {
        $(".navbar-fixed-top").removeClass("top-nav-collapse");
    }
});

// jQuery for page scrolling feature - requires jQuery Easing plugin
$(function() {
    $("a.page-scroll").bind("click", function(event) {
        var $anchor = $(this);
        $("html, body").stop().animate({
            scrollTop: $($anchor.attr("href")).offset().top
        }, 1500, "easeInOutExpo");
        event.preventDefault();
    });
});


// ----------------------------- //
// ALLSKONAR FUNCTIONS AND STUFF //
// ----------------------------- //

var addStationsToList = function(stations) {
    for (var i=0; i<stations.length; i++) {
        addStationToList(stations[i]);
    }
    arrangeStationsByPrice();
    if (GEOSTATUS == 2) updateStationDistancesFailure();
    if (SELECTED_STATION_LOCATION !== null) setStationMarkerToNearest();
}

var addStationToList = function(stationInfo) {
    /**
     * Each station object looks like this:
     * <div class="station atlantsolia" id="ao_000">
     *    <h1>Bíldshöfði <span>Atlantsolía</span></h1>
     *    <p class="distance">3.4 km</p>
     *    <p class="price">191.4 ISK</p>
     *    <p class="discount-price">(188.4 with discount)</p>
     *  </div>
     */
    var className = "station";
    if (stationInfo.company == "Atlantsolía") {
        className = className + " atlantsolia"
    }
    else if (stationInfo.company == "N1") {
        className = className + " n1"
    }
    else if (stationInfo.company == "Dælan") {
        className = className + " daelan"
    }
    else if (stationInfo.company == "Olís") {
        className = className + " olis"
    }
    else if (stationInfo.company == "ÓB") {
        className = className + " ob"
    }
    else if (stationInfo.company == "Skeljungur") {
        className = className + " skeljungur"
    }
    else if (stationInfo.company == "Orkan") {
        className = className + " orkan"
    }
    else if (stationInfo.company == "Orkan X") {
        className = className + " orkanx"
    }
    var station = document.createElement("div");
    station.setAttribute("class", className);
    station.setAttribute("id", stationInfo.key);
    var stationName = document.createElement("h1");
    stationName.innerHTML = stationInfo.name+" <span>"+stationInfo.company+"</span>";
    station.appendChild(stationName);
    var stationDistance = document.createElement("p");
    stationDistance.setAttribute("class", "distance");
    stationDistance.innerHTML = "Getting your location ..";
    station.appendChild(stationDistance);
    if (localStorage.getItem("petrol_type") === "bensin") {
        var price = stationInfo.bensin95;
        var priceDiscount = stationInfo.bensin95_discount;
    }
    else {
        var price = stationInfo.diesel;
        var priceDiscount = stationInfo.diesel_discount;
    }
    var stationPrice = document.createElement("p");
    stationPrice.setAttribute("class", "price");
    stationPrice.innerHTML = price.toString()+" ISK";
    station.appendChild(stationPrice);
    if (stationInfo.bensin95_discount !== null) {
        var stationDiscountPrice = document.createElement("p");
        stationDiscountPrice.setAttribute("class", "discount-price");
        stationDiscountPrice.innerHTML = "("+priceDiscount.toString()+" with discount)";
        station.appendChild(stationDiscountPrice);
    }
    station.onclick = function() {
        setStationMarkerToNearest(this.id);
        updateMapVision();
        $('div').removeClass('stationFocused');
        $('#'+this.id).addClass('stationFocused');
    }
    listElement.appendChild(station);
}

var updatePricesInList = function() {
    for (var key in STATIONS) {
        if (localStorage.getItem("petrol_type") == "bensin") {
            var price = STATIONS[key]["bensin95"];
            var priceDiscount = STATIONS[key]["bensin95_discount"];
        }
        else if (localStorage.getItem("petrol_type") == "diesel") {
            var price = STATIONS[key]["diesel"];
            var priceDiscount = STATIONS[key]["diesel_discount"];
        }
        var stationElement = document.getElementById(key);
        stationElement.children[2].innerHTML = price.toString() + " ISK";
        if (priceDiscount !== null) {
            stationElement.children[3].innerHTML = "("+priceDiscount.toString()+" with discount)";
        }
    }
}

var handleStalemate = function(stationA, stationB) {
    if (stationA.distance !== undefined && stationB.distance !== undefined) {
        return stationA.distance == stationB.distance
            ? 0
            : (stationA.distance > stationB.distance ? 1 : -1);
    }
    return stationA.name == stationB.name
        ? 0
        : (stationA.name > stationB.name ? 1 : -1);
}

var arrangeStationsByPrice = function() {
    var items = listElement.childNodes;
    var itemsArr = [];
    for (var i in items) {
        if (items[i].nodeType == 1) { // get rid of the whitespace text nodes
            itemsArr.push(items[i]);
        }
    }
    itemsArr.sort(function (a, b) {
        return STATIONS[a.id].bensin95 == STATIONS[b.id].bensin95
              ? handleStalemate(STATIONS[a.id], STATIONS[b.id])
              : (STATIONS[a.id].bensin95 > STATIONS[b.id].bensin95 ? 1 : -1);
    });
    for (i = 0; i < itemsArr.length; ++i) {
      listElement.appendChild(itemsArr[i]);
    }
}

var arrangeStationsByDistance = function() {
    if (GEOSTATUS !== 1) {
        return;
    }
    var items = listElement.childNodes;
    var itemsArr = [];
    for (var i in items) {
        if (items[i].nodeType == 1) { // get rid of the whitespace text nodes
            itemsArr.push(items[i]);
        }
    }
    itemsArr.sort(function (a, b) {
        return STATIONS[a.id].distance == STATIONS[b.id].distance
            ? handleStalemate(STATIONS[a.id], STATIONS[b.id])
            : (STATIONS[a.id].distance > STATIONS[b.id].distance ? 1 : -1);
    });
    for (i = 0; i < itemsArr.length; ++i) {
      listElement.appendChild(itemsArr[i]);
    }
}

var calculateStationDistances = function() {
    for (var key in STATIONS) {
        STATIONS[key].distance = GeoUtils.distanceBetweenPointsFaster(
            GEOPOSITION.coords.latitude,
            GEOPOSITION.coords.longitude,
            STATIONS[key].geo.lat,
            STATIONS[key].geo.lon
        );
    }
}

var updateStationDistances = function() {
    for (var key in STATIONS) {
        var stationElement = document.getElementById(key);
        var rounded = Math.round(STATIONS[key].distance * 10) / 10;
        stationElement.children[1].innerHTML = rounded.toString() + " km";
    }
}

var updateStationDistancesFailure = function() {
    for (var key in STATIONS) {
        var stationElement = document.getElementById(key);
        stationElement.children[1].innerHTML = "Failed to get your location.";
    }
}

var GEOLOCATION_success = function(pos) {
    GEOPOSITION = pos;
    var crd = pos.coords;
    if (DEBUG) {
        console.log('Your current position is:');
        console.log('Latitude : ' + crd.latitude);
        console.log('Longitude: ' + crd.longitude);
        console.log('More or less ' + crd.accuracy + ' meters.');
    }
    GEOSTATUS = 1;
    USER_LOCATION.setPosition({
        lat: crd.latitude,
        lng: crd.longitude
    });
    USER_LOCATION.setVisible(true);
    calculateStationDistances();
    updateStationDistances();
    arrangeStationsByPrice();
    setStationMarkerToNearest();
    updateMapVision();
};
var GEOLOCATION_error = function(err) {
  console.warn('ERROR(' + err.code + '): ' + err.message);
  GEOSTATUS = 2;
  updateStationDistancesFailure();
};

var updateMapVision = function() {
    if (GEOPOSITION === null) {
        MAP.setCenter({
            lat: SELECTED_STATION_LOCATION.position.lat(),
            lng: SELECTED_STATION_LOCATION.position.lng()
        });
        MAP.setZoom(9);
        return;
    }
    var center = GeoUtils.pointBetweenPoints(
        USER_LOCATION.position.lat(),
        USER_LOCATION.position.lng(),
        SELECTED_STATION_LOCATION.position.lat(),
        SELECTED_STATION_LOCATION.position.lng()
    );
    MAP.setCenter({
        lat: center.latitude,
        lng: center.longitude
    });
    var pointA = new GOOGLE.maps.LatLng(
        USER_LOCATION.position.lat(),
        USER_LOCATION.position.lng()
    );
    var pointB = new GOOGLE.maps.LatLng(
        SELECTED_STATION_LOCATION.position.lat(),
        SELECTED_STATION_LOCATION.position.lng()
    );
    // Stupid Google Maps API has stupid zoom function ..
    // http://stackoverflow.com/a/15719995/2401628
    // there be broken edge cases when latitudes or longitudes are the same :(
    // TODO: fix edge cases
    if (USER_LOCATION.position.lat() > SELECTED_STATION_LOCATION.position.lat()) {
        if (USER_LOCATION.position.lng() > SELECTED_STATION_LOCATION.position.lng()) {
            MAP.fitBounds(new GOOGLE.maps.LatLngBounds(pointB, pointA));
        }
        else {
            MAP.fitBounds(new GOOGLE.maps.LatLngBounds(pointA, pointB));
        }
    }
    else if (USER_LOCATION.position.lng() < SELECTED_STATION_LOCATION.position.lng()) {
        MAP.fitBounds(new GOOGLE.maps.LatLngBounds(pointA, pointB));
    }
    else {
        MAP.fitBounds(new GOOGLE.maps.LatLngBounds(pointB, pointA));
    }
}

var setStationMarkerToNearest = function(key) {
    if (key === undefined) {
        key = null;
    }
    var station;
    $('div').removeClass('stationFocused');
    if (key === null) {
        station = STATIONS[listElement.children[0].id];
        $('#'+listElement.children[0].id).addClass('stationFocused');
    }
    else {
        station = STATIONS[key];
        $('#'+key).addClass('stationFocused');
    }
    SELECTED_STATION_LOCATION.setPosition({
        lat: station.geo.lat,
        lng: station.geo.lon
    });
    SELECTED_STATION_LOCATION.setVisible(true);
}

var initPetrolTypeChecker = function() {
    // http://www.bootstrap-switch.org/options.html
    var checkerOptions = {
        onText: "Bensin",
        offText: "Diesel",
        onColor: "primary",
        offColor: "primary",
        size: "small",
        state: localStorage.getItem("petrol_type") === "bensin"
    }
    $("[name='petrol-type-checker']").bootstrapSwitch(checkerOptions);
}


// ------------------------------------- //
// ONLY KICK THINGS OFF AFTER THIS POINT //
// ------------------------------------- //

/**
 * Initialize Petrol Type checker
 *
 **/
initPetrolTypeChecker()
$("input[name='petrol-type-checker']").on('switchChange.bootstrapSwitch', function(event, state) {
    if (state) {
        localStorage.setItem("petrol_type", "bensin");
    }
    else {
        localStorage.setItem("petrol_type", "diesel");
    }
    updatePricesInList()
});

/**
 * Initialize Google Maps API
 *
 **/
GoogleMapsLoader.load(function(google) {
    GOOGLE = google;
    MAP = new google.maps.Map(mapElement, mapOptions);
    USER_LOCATION = new google.maps.Marker({
        position: ICELAND_MID, // just for it to be something ..
        map: MAP,
        title: "Your location"
    });
    USER_LOCATION.setVisible(false);
    SELECTED_STATION_LOCATION = new google.maps.Marker({
        position: ICELAND_MID, // just for it to be something ..
        map: MAP,
        title: "Selected station location",
        icon: "/images/markers/gasstation.png"
    });
    SELECTED_STATION_LOCATION.setVisible(false);
    if (listElement.children.length !== 0) {
        setStationMarkerToNearest();
    }
});

/**
 * Fetch them gas prices
 **/
fetch("https://raw.githubusercontent.com/gasvaktin/gasvaktin/master/vaktin/gas.min.json").then(
    function(response) {
        return response.json()
    }
).then(
    function(data) {
        if (DEBUG) console.log(data)
        for (var i=0; i<data.stations.length; i++) {
            STATIONS[data.stations[i].key] = data.stations[i];
        }
        addStationsToList(data.stations);
    }
);

/**
 * Ask for some sweet sweet geolocation data
 **/
navigator.geolocation.getCurrentPosition(
    GEOLOCATION_success,
    GEOLOCATION_error,
    GEOPTIONS
);
