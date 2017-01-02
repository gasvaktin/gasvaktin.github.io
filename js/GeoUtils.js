"use-strict";
/**
 * GeoUtils.js
 * Geo-Utility functions.
 **/

var GeoUtils = {
  // Geo calculation stuff
  distanceBetweenPoints: function(lat1, lon1, lat2, lon2) {
    /**
     * Haversine formula
     * returns distance between two points in kilometers
     * http://stackoverflow.com/a/27943/2401628
     */
    var degreesToRadians = function(deg) {
      return deg * (Math.PI / 180);
    }
    var R = 6371; // Radius of the earth in kilometers
    var dLat = degreesToRadians(lat2-lat1);
    var dLon = degreesToRadians(lon2-lon1); 
    var a = (
      Math.sin(dLat/2) * Math.sin(dLat/2) + 
      Math.cos(degreesToRadians(lat1)) *
      Math.cos(degreesToRadians(lat2)) *
      Math.sin(dLon/2) * Math.sin(dLon/2)
    );
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    var d = R * c; // Distance in km
    return d;
  },
  distanceBetweenPointsFaster: function(lat1, lon1, lat2, lon2) {
    /**
     * Haversine formula (faster implementation)
     * said to run around 2 times faster than the above distanceBetweenPoints
     * http://stackoverflow.com/a/21623206/2401628
     */
    var p = 0.017453292519943295; // Math.PI / 180
    var c = Math.cos;
    var a = (
      0.5 - c((lat2 - lat1) * p)/2 +
      c(lat1 * p) * c(lat2 * p) *
      (1 - c((lon2 - lon1) * p))/2
    );
    return 12742 * Math.asin(Math.sqrt(a)); // 2 * R; R = 6371 km
  },
  pointBetweenPoints: function(lat1, lon1, lat2, lon2) {
    /**
     * Calculates point in the middle between two points
     */
    return {
      latitude: (lat1 + lat2)/2,
      longitude: (lon1 + lon2)/2
    };
  },
  calcPointsZoomDelta: function(lat1, lon1, lat2, lon2, marginer) {
    /**
     * Calculates lat and lon Delta for starting coordinates of map
     */
    if (marginer === undefined) {
      marginer = 1.1;
    }
    return {
      latitude: Math.abs(lat1 - lat2) * marginer,
      longitude: Math.abs(lon1 - lon2) * marginer
    };
  }
}
