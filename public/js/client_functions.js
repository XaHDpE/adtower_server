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
$( () => {
    Sortable.create(simpleList,
      {
        dataIdAttr: 'data-id',
      });
  },

)
// Simple list

