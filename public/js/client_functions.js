$(
  () => {


    Sortable.create(avaialableVidsList,
      {
        group: {
          name: 'sortable_group',
          pull: 'clone',
        },
        drop: false,
        animation: 100,
      });

    Sortable.create(activeVidsList,
      {
        group: 'sortable_group',
        dataIdAttr: 'data-id',
        animation: 100,
      });

    Sortable.create(testList, {
        group: 'sortable_group',
        dataIdAttr: 'data-id',
        animation: 100,
        store: {
          get: function(sortable) {
            var order = localStorage.getItem(sortable.options.group.name);
            return order ? order.split('|') : [];
          },

          set: function(sortable) {
            var order = sortable.toArray();
            console.log('order:' + order);
            localStorage.setItem(sortable.options.group.name, order.join('|'));
          },
        }
      });

  },
);
// Simple list

/*
    Carousel
*/
$('#carousel-example').on('slide.bs.carousel', function (e) {
  /*
      CC 2.0 License Iatek LLC 2018 - Attribution required
  */
  var $e = $(e.relatedTarget);
  var idx = $e.index();
  var itemsPerSlide = 5;
  var totalItems = $('.carousel-item').length;

  if (idx >= totalItems-(itemsPerSlide-1)) {
    var it = itemsPerSlide - (totalItems - idx);
    for (var i=0; i<it; i++) {
      // append slides to end
      if (e.direction=="left") {
        $('.carousel-item').eq(i).appendTo('.carousel-inner');
      }
      else {
        $('.carousel-item').eq(0).appendTo('.carousel-inner');
      }
    }
  }
});