/*
$( ()=> {
  $("#active_pl, #sortable").children().uniqueId().end().sortable({
    connectWith: "ul",
    update: function (event, ui) {
      var data = $(this).sortable('serialize');
      console.log(data);
      $.ajax({
        data: data,
        type: 'POST',
        url: '/your/url/here'
      });
    }
  });

  $('#sortable, #active_pl').disableSelection();
});
*/
$(() => {

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

