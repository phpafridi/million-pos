import React from 'react'

export default function CampaignResult() {
  return (
     <>
     
     <section className="content">
    <div className="row">
        <div className="col-md-12">

            <div className="box box-primary ">
                <div className="box-header box-header-background with-border">
                        <h3 className="box-title ">Send Campaign List</h3>
                </div>


                <div className="box-body">

                        
                        <table className="table table-bordered table-striped datatable-buttons" id="dataTables">
                            <thead >
                            <tr>
                                <th className="active">Sl</th>
                                <th className="active">Campaign Name</th>
                                <th className="active">Email Subject</th>
                                <th className="active">Send Date</th>
                                <th className="active ">Send by</th>

                            </tr>
                            </thead>
                            <tbody>
                                <tr className="custom-tr">
                                    <td className="vertical-td">
                                        
                                    </td>
                                    <td className="vertical-td"></td>
                                    <td className="vertical-td"></td>
                                    <td className="vertical-td"></td>
                                    <td className="vertical-td"></td>


                                </tr>
                            
                                <td colSpan={6}>
                                    <strong>There is no record for display</strong>
                                </td>
                            
                            </tbody>
                        </table> 

                </div>
            </div>
           
        </div>
        
    </div>
   
</section>

     </>
  )
}
