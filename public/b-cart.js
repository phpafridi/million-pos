	$(document).ready(function() {
 		$('#dataTables-example').dataTable();
 	});
 

 
 	var handleDataTableButtons = function() {
 			"use strict";
 			0 !== $(".datatable-buttons").length && $(".datatable-buttons").DataTable({
 				"iDisplayLength": 25,

 				dom: "Bfrtip",
 				buttons: [{
 					extend: "copy",
 					className: "btn-sm"
 				}, {
 					extend: "csv",
 					className: "btn-sm"
 				}, {
 					extend: "excel",
 					className: "btn-sm"
 				}, {
 					extend: "pdf",
 					className: "btn-sm"
 				}, {
 					extend: "print",
 					className: "btn-sm"
 				}],
 				responsive: !0
 			})
 		},
 		TableManageButtons = function() {
 			"use strict";
 			return {
 				init: function() {
 					handleDataTableButtons()
 				}
 			}
 		}();



 	var handleCartButtons = function() {
 			"use strict";
 			0 !== $(".cart-buttons").length && $(".cart-buttons").DataTable({
 				"iDisplayLength": 25,

 				dom: "Bfrtip",
 				buttons: [{

 					text: 'Add to Cart',
 					action: function(e, dt, node, config) {
 						document.getElementById("addToCart").submit(); // Form submission
 					}
 				}]

 			})
 		},
 		cartButtons = function() {
 			"use strict";
 			return {
 				init: function() {
 					handleCartButtons()
 				}
 			}
 		}();
 
 	$(document).ready(function() {

 		$('#datatable').dataTable();
 		$('#datatable-keytable').DataTable({
 			keys: true,

 		});
 		$('#datatable-responsive').DataTable();
 		$('#datatable-scroller').DataTable({
 			ajax: "js/datatables/json/scroller-demo.json",
 			deferRender: true,
 			scrollY: 380,
 			scrollCollapse: true,
 			scroller: true

 		});
 		var table = $('#datatable-fixed-header').DataTable({
 			fixedHeader: true
 		});



 	});

 	TableManageButtons.init();
 	cartButtons.init();








	 $('body').on('hidden.bs.modal', '.modal', function() {
        $(this).removeData('bs.modal');
    });