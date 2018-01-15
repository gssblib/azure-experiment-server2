/**
 * Controller for the views for a single item.
 */
angular.module("library")
// Service for sharing data between multiple instances of the item
// controllers.
.factory('itemService', function () {
  var savedItem;
  return {
    item: function (item) {
      if (item === undefined) return savedItem;
      savedItem = item;
    },
    // should come from server
    refdata: {
      types: [
        "Buch", "CD", "CD-ROM", "DVD", "Comic", "Multimedia", "Zeitschrift",
        "Kassette", "Computer", "Projector", "DVD Player"
      ],
      subjects: [
        "CD", "CD-ROM", "DVD", "Bilderbuch B-gelb", "Comic C-orange",
        "Erzaehlung E-d gruen", "Fasching", "Halloween", "Leseleiter LL-klar",
        "Maerchen Mae-rot", "Multimedia MM-rosa", "Ostern", "Sachkunde S-blau",
        "Sachkunde Serie - h blau", "St. Martin", "Teen T - h gruen",
        "Uebergroesse - lila", "Weihnachten", "Zeitschrift"
      ],
      ages: [
        "na", "A", "All Ages", "K-1", "K-2", "T-12", "T-17",
        "Leseleiter-1A", "Leseleiter-1B", "Leseleiter-1C", "Leseleiter-2",
        "Leseleiter-3", "Leseleiter-4", "Leseleiter-5",  "Leseleiter-6",
        "Leseleiter-7", "Leseleiter-8", "Leseleiter-9", "Leseleiter-10",
        "Lehrer"
      ],
      states: [
        'CIRCULATING', 'STORED', 'DELETED', 'LOST'
      ]
    }
  };
})
.controller('itemCtrl',
            ['$scope', '$log', '$location', '$routeParams', 'library', 'itemService',
             function($scope, $log, $location, $routeParams, library, itemService) {
  var self = this;
  $scope.$emit('nav-item-changed', 'items');

  // Item shown and edited (on item_new and item_edit page).
  self.item = {};

  self.refdata = itemService.refdata;

  function getItem(barcode) {
    library.getItem(barcode).then(
      function (item) {
        self.item = item;
        $scope.$broadcast('item-changed', self.item);
      },
      function (err) {
        if (err.data.code == 'ENTITY_NOT_FOUND') {
          $scope.$emit('new-error-message', {
              header: 'barcode not found',
              text: 'Item with barcode ' + barcode + ' not found'
          });
        } else {
          $scope.$emit('new-error-message', {
              header: 'System Error',
              text: 'Unknown error while looking for barcode ' + barcode
          });
        }
        $log.log('getItem: err=', err);
        $location.path('/items');
      });
  }

  $scope.$on('$routeChangeSuccess', function (event) {
    if ($location.path() === "/item/new") {
      self.item = itemService.item();
      itemService.item(null);
    } else if ($location.path().indexOf("/item/") == 0) {
      var barcode = $routeParams["barcode"];
      getItem(barcode);
    }
  });

  self.addItem = function (item) {
    library.createItem(item).then(
      function (data) {
        $location.path('/item/' + item.barcode);
      },
      function (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          $scope.$emit('new-error-message', {
              header: 'Unable to add item',
              text: 'Duplicate barcode ' + barcode
          });
        } else {
          $scope.$emit('new-error-message', {
              header: 'Unable to add item',
              text: 'Server error'
          });
        }
      });
  };

  self.saveItem = function (item) {
    library.saveItem(item).then(
      function (data) {
        $location.path('/item/' + item.barcode);
      });
  };

  self.copyItem = function (item) {
    var newItem = angular.copy(item);
    newItem.barcode = "";
    newItem.id = undefined;
    itemService.item(newItem);
    $location.path('/item/new');
  }; 

  self.addAntolinSticker = function(item) {
    var newItem = {
      id: item.id,
      antolin_sticker: true
    };
    library.saveItem(newItem).then(
      function (data) {
        item.antolin_sticker = true;
      });
  };
}]);
