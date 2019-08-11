// const config = require('/config/applicationConfig.js');
$(
    () => {
      Sortable.create(avaialableVidsList, {
        group: {
          name: 'sortable_group',
          pull: 'clone',
        },
        // draggable: '.img-tn-av',
        drop: false,
        animation: 100,
        dataIdAttr: 'data-id',
      });

      const acList = Sortable.create(activeVidsList, {
        group: 'sortable_group',
        dataIdAttr: 'data-id',
        animation: 100,
        // draggable: '.img-tn-av',
        store: {
          get: function(sortable) {
            const order = localStorage.getItem(sortable.options.group.name);
            return order ? order.split('|') : [];
          },

          set: function(sortable) {
            const order = sortable.toArray();
            // console.log('order:' + order);
            localStorage.setItem(sortable.options.group.name, order.join('|'));
          },
        },
      });

      $('#avdSave').click( () => {
        const orderList = acList.toArray(); // use instance
        $.ajax({
          url: 'save_playlist',
          data: {
            videos: JSON.stringify(orderList),
          },
          success: (resp) => {
            console.log(resp);
          },
        });
      });
    },
);
// Simple list

$('.close-div').click(function() {
  // eslint-disable-next-line no-invalid-this
  const pObj = $(this).parent();
  const recId = pObj.attr('id');
  console.log('parentID:' + recId);
  $.ajax({
    url: `delete_video?recordKey=${recId}`,
    // data: {},
    success: () => {
      console.log('deleted record: ' + recId);
    },
  });
  pObj.remove();
});
