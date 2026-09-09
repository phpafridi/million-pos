


// Changes every time the server restarts, so every asset URL below gets a
// fresh query string and browsers can no longer serve a stale cached copy
// of a CSS/JS file just because the URL never changed. Without this,
// editing a CSS file has no way to signal to an already-open browser that
// there's anything new to fetch — the filename is identical, so the
// browser's default HTTP cache (a separate thing from the service worker)
// keeps serving whatever it cached the first time, indefinitely.
const ASSET_VERSION = Date.now()

export default function Assets () {
  const v = `?v=${ASSET_VERSION}`
  return (
        <head>
        <link href={`/asset/css/bootstrap.css${v}`} rel="stylesheet" type="text/css" />
        <link href={`/asset/css/admin.css${v}`} rel="stylesheet" type="text/css" />
        <link href={`/asset/css/custom.css${v}`} rel="stylesheet" type="text/css" />
        
        <link href={`/asset/css/datepicker.css${v}`} rel="stylesheet" type="text/css" />
        <link href={`/asset/css/timepicker.css${v}`} rel="stylesheet" type="text/css" />
        <link href={`/asset/css/skins.css${v}`} rel="stylesheet" type="text/css" />
        <link href={`/asset/css/invoice.css${v}`} rel="stylesheet" type="text/css" />

        <link href="/asset/css/font-icons/font-awesome/css/font-awesome.min.css" rel="stylesheet" type="text/css" />
        <link rel="stylesheet" href="/asset/css/font-icons/entypo/css/entypo.css" />
      
        <link href="/asset/plugin/datatables/jquery.dataTables.min.css" rel="stylesheet" type="text/css" />
        <link href="/asset/plugin/datatables/buttons.bootstrap.min.css" rel="stylesheet" type="text/css" />
        <link href="/asset/plugin/datatables/fixedHeader.bootstrap.min.css" rel="stylesheet" type="text/css" />
        <link href="/asset/plugin/datatables/responsive.bootstrap.min.css" rel="stylesheet" type="text/css" />
        <link href="/asset/plugin/datatables/scroller.bootstrap.min.css" rel="stylesheet" type="text/css" />

        <link href="/asset/css/morris.css" rel="stylesheet" type="text/css" />

       
    
        <script src="/asset/js/jquery-1.10.2.min.js"></script>

        <script src={`/asset/js/admin.js${v}`}></script>
        <link href={`/asset/css/animation.css${v}`} rel="stylesheet"></link>

            <link rel="stylesheet" type="text/css" href="/asset/css/kendo.default.min.css" />
            <link rel="stylesheet" type="text/css" href="/asset/css/kendo.common.min.css" />
            <script type="text/javascript" src="/asset/js/kendo.all.min.js"></script>
            <script type="text/javascript" src="/asset/js/ajax.js"></script>
        
      </head>
  )
}
